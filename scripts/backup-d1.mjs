// Daily D1 backup (comments + analytics events) to .backups/d1/<date>/ — not in git:
// comments contain emails. Key: SV_STATS_KEY in .env (same as the stats admin key).
// Usage: node scripts/backup-d1.mjs   (keeps the last 30 snapshots)

import { readFileSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = process.env.SV_SITE || 'https://spykevision.com';
const KEEP = 30;

const env = readFileSync(join(ROOT, '.env'), 'utf8');
const key = process.env.SV_STATS_KEY || (env.match(/^SV_STATS_KEY=(.+)$/m) || [])[1]?.trim();
if (!key) { console.error('SV_STATS_KEY missing in .env'); process.exit(1); }

async function dump(table) {
  const rows = [];
  let after = 0;
  for (;;) {
    const r = await fetch(`${SITE}/api/backup?table=${table}&after=${after}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status}`);
    const d = await r.json();
    rows.push(...d.rows);
    if (!d.next) return rows;
    after = d.next;
  }
}

const day = new Date().toISOString().slice(0, 10);
const base = join(ROOT, '.backups', 'd1');
const dir = join(base, day);
mkdirSync(dir, { recursive: true });
for (const table of ['comments', 'events']) {
  const rows = await dump(table);
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows));
  console.log(`${table}: ${rows.length} rows`);
}

// Rotate old snapshots
const snaps = readdirSync(base).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
for (const old of snaps.slice(0, Math.max(0, snaps.length - KEEP))) rmSync(join(base, old), { recursive: true });
console.log(`saved → .backups/d1/${day}`);
