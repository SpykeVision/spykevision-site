// Generates downscaled grid/srcset variants for /public/images and /public/uploads
// into /public/thumbs/<width>/... (gitignored, rebuilt on demand).
// Originals are NEVER touched — the lightbox always opens the original file.
// Runs automatically via npm prebuild/predev; skips files whose thumb is up to date.
import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOTS = ['public/images', 'public/uploads'];
const WIDTHS = [640, 1280];
const EXT = /\.(jpe?g|png|webp)$/i;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.test(e.name)) yield p;
  }
}

let made = 0, skipped = 0;
for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = path.relative('public', file); // images/tnm/x.jpeg
    const srcStat = await stat(file);
    for (const w of WIDTHS) {
      const out = path.join('public/thumbs', String(w), rel);
      try {
        const o = await stat(out);
        if (o.mtimeMs >= srcStat.mtimeMs) { skipped++; continue; }
      } catch { /* not built yet */ }
      const meta = await sharp(file).metadata();
      if ((meta.width ?? 0) <= w) { skipped++; continue; } // never upscale
      await mkdir(path.dirname(out), { recursive: true });
      let pipe = sharp(file).rotate().resize({ width: w }); // .rotate() bakes in EXIF orientation
      if (/\.jpe?g$/i.test(out)) pipe = pipe.jpeg({ quality: 85, mozjpeg: true });
      else if (/\.webp$/i.test(out)) pipe = pipe.webp({ quality: 85 });
      else pipe = pipe.png({ compressionLevel: 9 });
      await pipe.toFile(out);
      made++;
    }
  }
}
console.log(`[thumbs] generated ${made}, up-to-date ${skipped}`);
