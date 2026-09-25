// Comment moderation for /admin/comments/. Auth: Authorization: Bearer <STATS_KEY>.
// GET  → pending comments + the latest approved ones (with emails)
// POST {id, action: 'approve'|'hide'|'delete'}

import { ensureTable } from './comments.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function authorized(request, env) {
  const h = request.headers.get('authorization') || '';
  return !!env.STATS_KEY && h === `Bearer ${env.STATS_KEY}`;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB || !authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  await ensureTable(env.DB);
  const cols = 'id, ts, path, nick, email, body, status';
  const [pending, approved] = await Promise.all([
    env.DB.prepare(`SELECT ${cols} FROM comments WHERE status='pending' ORDER BY ts DESC LIMIT 200`).all(),
    env.DB.prepare(`SELECT ${cols} FROM comments WHERE status='approved' ORDER BY ts DESC LIMIT 50`).all(),
  ]);
  return json({ pending: pending.results, approved: approved.results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const id = Number(d.id);
  if (!Number.isInteger(id)) return json({ error: 'bad_request' }, 400);
  await ensureTable(env.DB);
  if (d.action === 'approve' || d.action === 'hide') {
    await env.DB.prepare('UPDATE comments SET status=? WHERE id=?')
      .bind(d.action === 'approve' ? 'approved' : 'pending', id).run();
  } else if (d.action === 'delete') {
    await env.DB.prepare('DELETE FROM comments WHERE id=?').bind(id).run();
  } else {
    return json({ error: 'bad_request' }, 400);
  }
  return json({ ok: true });
}
