// Web mentions of the site found by the nightly search job (scripts/mentions.mjs).
// GET  /api/mentions?key=…            → newest first (stats dashboard)
// POST /api/mentions  Bearer <key>    {items:[{url,title,source,snippet}]} → {added:[urls]}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function ensureTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      snippet TEXT NOT NULL DEFAULT ''
    )`
  ).run();
}

export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get('key');
  const h = request.headers.get('authorization') || '';
  if (!env.DB || !env.STATS_KEY || (key !== env.STATS_KEY && h !== `Bearer ${env.STATS_KEY}`)) return json({ error: 'unauthorized' }, 401);
  await ensureTable(env.DB);
  const { results } = await env.DB.prepare('SELECT ts, url, title, source, snippet FROM mentions ORDER BY ts DESC LIMIT 500').all();
  return json({ mentions: results });
}

export async function onRequestPost({ request, env }) {
  const h = request.headers.get('authorization') || '';
  if (!env.DB || !env.STATS_KEY || h !== `Bearer ${env.STATS_KEY}`) return json({ error: 'unauthorized' }, 401);
  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  await ensureTable(env.DB);
  const added = [];
  for (const it of (Array.isArray(d.items) ? d.items : []).slice(0, 100)) {
    const url = String(it.url || '').trim().slice(0, 500);
    if (!/^https?:\/\//.test(url)) continue;
    const r = await env.DB.prepare('INSERT OR IGNORE INTO mentions (ts, url, title, source, snippet) VALUES (?,?,?,?,?)')
      .bind(Date.now(), url, String(it.title || '').slice(0, 300), String(it.source || '').slice(0, 100), String(it.snippet || '').slice(0, 500)).run();
    if (r.meta && r.meta.changes) added.push(url);
  }
  return json({ added });
}
