// Re-export review photos from their camera originals at the site's 1440px width,
// with a light natural grade. Usage:
//   node scripts/photo-grade.mjs <map.json> <srcDir> <outDir>
// map.json: { "box-01.jpg": "IMG_3779.HEIC", ... }
//
// HEIC is decoded by sips (this libvips build has no HEIC reader), everything else
// by sharp directly. The grade is an endpoint-preserving S-curve plus a small
// saturation lift, so whites stay white and blacks stay black — no clipping.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);
const [, , mapFile, srcDir, outDir] = process.argv;
if (!mapFile || !srcDir || !outDir) {
  console.error('usage: node scripts/photo-grade.mjs <map.json> <srcDir> <outDir>');
  process.exit(1);
}

const WIDTH = 1440;      // matches /images/tnm — width is fixed, height rides along
const CONTRAST = 0.26;   // S-curve strength; 0 = off, ~0.5 starts to look processed
const SATURATION = 1.09; // very slight; above ~1.15 skin and wood go orange
const QUALITY = 92;

// y = x + k·x(1-x)(2x-1) — monotonic, fixes 0 and 1, steepest at the midtones.
const CURVE = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const x = i / 255;
  CURVE[i] = Math.round(Math.min(1, Math.max(0, x + CONTRAST * x * (1 - x) * (2 * x - 1))) * 255);
}

function grade(data) {
  for (let i = 0; i < data.length; i += 3) {
    const r = CURVE[data[i]], g = CURVE[data[i + 1]], b = CURVE[data[i + 2]];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = Math.min(255, Math.max(0, luma + SATURATION * (r - luma) + 0.5));
    data[i + 1] = Math.min(255, Math.max(0, luma + SATURATION * (g - luma) + 0.5));
    data[i + 2] = Math.min(255, Math.max(0, luma + SATURATION * (b - luma) + 0.5));
  }
  return data;
}

const map = JSON.parse(await readFile(mapFile, 'utf8'));
await mkdir(outDir, { recursive: true });

for (const [outName, srcName] of Object.entries(map)) {
  const src = path.join(srcDir, srcName);
  let input = src, tmp = null;
  if (/\.heic$/i.test(srcName)) {
    tmp = path.join(os.tmpdir(), `grade-${process.pid}-${outName}.jpg`);
    // formatOptions 100 — this intermediate is only a decode step, not a delivery file
    await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '100', src, '--out', tmp]);
    input = tmp;
  }

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true, kernel: 'lanczos3' })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  await sharp(grade(data), { raw: { width: info.width, height: info.height, channels: 3 } })
    // Downscaling always costs a little acutance; this puts back just that much.
    .sharpen({ sigma: 0.7, m1: 0.6, m2: 0.9 })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
    .toFile(path.join(outDir, outName));

  if (tmp) await unlink(tmp).catch(() => {});
  console.log(`${outName}  ${info.width}x${info.height}  <- ${srcName}`);
}
