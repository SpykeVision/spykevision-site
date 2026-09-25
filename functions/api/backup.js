// Raw D1 export for backups: /api/backup?table=comments|events&after=<rowid>
// Auth: Authorization: Bearer <STATS_KEY>. Pages of up to 5000 rows ordered by rowid;
// keep calling with after=<next> until next is null.

import { ensureTable } from './comments.js';

const TABLES = new Set(['comments', 'events']);
const PAGE = 5000;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  const h = request.headers.get('authorization') || '';
  if (!env.DB || !env.STATS_KEY || h !== `Bearer ${env.STATS_KEY}`) return json({ error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const table = url.searchParams.get('table') || '';
  if (!TABLES.has(table)) return json({ error: 'bad_table' }, 400);
  if (table === 'comments') await ensureTable(env.DB);

  const after = Number(url.searchParams.get('after') || 0);
  let results;
  try {
    ({ results } = await env.DB.prepare(`SELECT rowid AS _rowid, * FROM ${table} WHERE rowid>? ORDER BY rowid LIMIT ?`)
      .bind(after, PAGE).all());
  } catch (e) {
    // events table is created by the collector on first write; nothing to export yet
    if (/no such table/i.test(String(e && e.message))) return json({ table, rows: [], next: null });
    throw e;
  }
  const next = results.length === PAGE ? results[results.length - 1]._rowid : null;
  return json({ table, rows: results, next });
}
