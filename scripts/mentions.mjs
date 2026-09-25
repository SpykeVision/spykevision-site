// Helper for the nightly mention-search job; keeps the stats key out of the prompt.
// node scripts/mentions.mjs list          → known mention URLs, one per line
// node scripts/mentions.mjs add < items.json   ([{url,title,source,snippet}]) → newly added URLs

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = process.env.SV_SITE || 'https://spykevision.com';
const env = readFileSync(join(ROOT, '.env'), 'utf8');
const key = process.env.SV_STATS_KEY || (env.match(/^SV_STATS_KEY=(.+)$/m) || [])[1]?.trim();
if (!key) { console.error('SV_STATS_KEY missing in .env'); process.exit(1); }
const auth = { Authorization: `Bearer ${key}` };

const cmd = process.argv[2];
if (cmd === 'list') {
  const r = await fetch(`${SITE}/api/mentions`, { headers: auth });
  if (!r.ok) { console.error(`HTTP ${r.status}`); process.exit(1); }
  for (const m of (await r.json()).mentions) console.log(m.url);
} else if (cmd === 'add') {
  const items = JSON.parse(readFileSync(0, 'utf8'));
  const r = await fetch(`${SITE}/api/mentions`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
  if (!r.ok) { console.error(`HTTP ${r.status}`); process.exit(1); }
  for (const u of (await r.json()).added) console.log(u);
} else {
  console.error('usage: mentions.mjs list | add < items.json'); process.exit(1);
}
