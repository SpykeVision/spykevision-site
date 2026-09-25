// Self-hosted review comments (replaces Cusdis).
// GET  /api/comments?path=/reviews/x/  → approved comments for a page (no emails)
// POST /api/comments {path,nick,email,body,hp,t} → stored as 'pending' until moderated
// Moderation lives in /api/comments-admin (STATS_KEY-protected).

const PATH_RE = /^\/(ru\/)?reviews\/[a-z0-9-]+\/$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function ensureTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      path TEXT NOT NULL,
      nick TEXT NOT NULL,
      email TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sender TEXT NOT NULL DEFAULT ''
    )`
  ).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS comments_path ON comments (path, status)').run();
}

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...extra } });

export async function onRequestGet({ request, env }) {
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!env.DB || !PATH_RE.test(path)) return json({ comments: [] });
  await ensureTable(env.DB);
  const { results } = await env.DB.prepare(
    "SELECT id, ts, nick, body FROM comments WHERE path=? AND status='approved' ORDER BY ts ASC LIMIT 500"
  ).bind(path).all();
  return json({ comments: results }, 200, { 'Cache-Control': 'public, max-age=30' });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }

  const path = String(d.path || '');
  const nick = String(d.nick || '').trim().slice(0, 40);
  const email = String(d.email || '').trim().slice(0, 254);
  const body = String(d.body || '').trim().slice(0, 4000);

  // Bots: filled honeypot or submitted faster than a human can type → pretend success
  if (d.hp || Number(d.t) < 3000) return json({ ok: true });
  if (!PATH_RE.test(path) || !nick || !EMAIL_RE.test(email) || body.length < 2) {
    return json({ error: 'invalid' }, 400);
  }

  await ensureTable(env.DB);

  // Rate limit: 3 comments per 10 min per sender (hashed IP, never stored raw)
  const ip = request.headers.get('cf-connecting-ip') || '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (env.STATS_KEY || 'salt')));
  const sender = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const recent = await env.DB.prepare('SELECT COUNT(*) n FROM comments WHERE sender=? AND ts>?')
    .bind(sender, Date.now() - 600000).first();
  if (recent && recent.n >= 3) return json({ error: 'rate_limited' }, 429);

  const r = await env.DB.prepare('INSERT INTO comments (ts, path, nick, email, body, sender) VALUES (?,?,?,?,?,?)')
    .bind(Date.now(), path, nick, email, body, sender).run();
  return json({ ok: true, id: r.meta && r.meta.last_row_id });
}
