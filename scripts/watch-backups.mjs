// Snapshots review markdown on every change, so a CMS save can never lose work.
// The CMS editor holds a whole copy of the document in the browser: if the file
// changed on disk after it was loaded, saving writes the stale copy back. We
// cannot hook that write (the editor talks to its own proxy), so instead every
// version is kept and a clobber becomes a one-command restore.
import { watch } from 'node:fs';
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const DIRS = ['src/content/reviews-ru', 'src/content/reviews'];
const OUT = path.join(ROOT, '.backups');
const KEEP = 40;                      // per file
const last = new Map();               // file → hash of the version already stored

const hash = (s) => createHash('sha1').update(s).digest('hex');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

async function snapshot(abs) {
  let src;
  try { src = await readFile(abs, 'utf8'); } catch { return; }
  const h = hash(src);
  if (last.get(abs) === h) return;    // same bytes — nothing happened
  last.set(abs, h);
  const name = path.basename(abs, '.md');
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, `${name}.${stamp()}.md`), src);
  await prune(name);
  console.log(`[backup] ${name} ${(src.length / 1024).toFixed(0)} KB`);
}

async function prune(name) {
  const files = (await readdir(OUT)).filter((f) => f.startsWith(name + '.')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) {
    await unlink(path.join(OUT, f)).catch(() => {});
  }
}

export async function startBackupWatcher() {
  for (const dir of DIRS) {
    const abs = path.join(ROOT, dir);
    try { await stat(abs); } catch { continue; }
    for (const f of await readdir(abs)) {
      if (f.endsWith('.md')) await snapshot(path.join(abs, f));
    }
    let timer = null;
    watch(abs, (_e, file) => {
      if (!file || !file.endsWith('.md')) return;
      clearTimeout(timer);            // editors write in bursts — settle first
      timer = setTimeout(() => snapshot(path.join(abs, file)), 400);
    });
  }
  console.log('[backup] watching review markdown → .backups/');
}
