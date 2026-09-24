// Backend for the admin gallery manager (/admin/gallery.html).
//
// Mounted as dev-server middleware by astro.config.mjs, so the editor lives on the
// same origin as the site and the rest of the admin. It reads a review's `## Sections`,
// finds the <div class="gallery"> line inside each, and saves back only those lines
// plus the cover frontmatter keys.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIRS = ['src/content/reviews', 'src/content/reviews-ru'];
const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i;
const GALLERY_RE = /^<div class="gallery([^"]*)"([^>]*)>(.*)<\/div>\s*$/;

const j = (res, code, data) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

async function listDocs() {
  const out = [];
  for (const dir of CONTENT_DIRS) {
    let names = [];
    try { names = await readdir(path.join(ROOT, dir)); } catch { continue; }
    for (const n of names.filter((n) => n.endsWith('.md'))) {
      const src = await readFile(path.join(ROOT, dir, n), 'utf8');
      const title = src.match(/^title:\s*(.+)$/m)?.[1].replace(/^["']|["']$/g, '') ?? n;
      out.push({ file: `${dir}/${n}`, title, lang: dir.endsWith('-ru') ? 'RU' : 'EN' });
    }
  }
  return out;
}

function parseDoc(src) {
  const lines = src.split('\n');
  const fmEnd = lines.indexOf('---', 1);
  const fm = {};
  for (const key of ['cover', 'coverCard']) {
    const i = lines.findIndex((l, n) => n > 0 && n < fmEnd && l.startsWith(`${key}:`));
    if (i !== -1) fm[key] = lines[i].slice(key.length + 1).trim().replace(/^["']|["']$/g, '');
  }
  const sections = [];
  let cur = null;
  lines.forEach((line, i) => {
    if (i <= fmEnd) return;
    if (line.startsWith('## ')) {
      cur = { title: line.slice(3).trim(), start: i, images: [], cols: 2, mode: 'auto', lead: 0, galleryLine: -1 };
      sections.push(cur);
      return;
    }
    if (!cur) return;
    const m = line.match(GALLERY_RE);
    if (m) {
      cur.galleryLine = i;
      cur.cols = m[1].includes('cols-3') ? 3 : 2;
      cur.mode = m[1].includes('as-carousel') ? 'carousel'
        : m[1].includes('as-grid') ? 'grid' : 'auto';
      cur.lead = Number(m[2].match(/data-lead="(\d+)"/)?.[1] || 0);
      cur.images = [...m[3].matchAll(/<img src="([^"]+)"(?:[^>]*?alt="([^"]*)")?/g)]
        .map((g) => ({ src: g[1], alt: g[2] || '' }));
    }
  });
  return { fm, sections, lines };
}

// Every image directory this doc already draws from, so the pool shows siblings too.
async function poolFor(sections, extraDirs = []) {
  const dirs = new Set();
  for (const s of sections) for (const im of s.images) dirs.add(path.posix.dirname(im.src));
  for (const d of extraDirs) dirs.add(d);
  const used = new Set(sections.flatMap((s) => s.images.map((i) => i.src)));
  const all = [];
  for (const d of dirs) {
    let names = [];
    try { names = await readdir(path.join(ROOT, 'public', d)); } catch { continue; }
    for (const n of names.filter((n) => IMG_EXT.test(n)).sort()) {
      const src = path.posix.join(d, n);
      if (!used.has(src)) all.push({ src, alt: '' });
    }
  }
  return { dirs: [...dirs], images: all };
}

function galleryHtml(sec) {
  const figs = sec.images
    .map((im) => `<figure><img src="${im.src}" alt="${im.alt || ''}"></figure>`)
    .join('');
  const cls = ['gallery'];
  if (sec.cols === 3) cls.push('cols-3');
  if (sec.mode === 'carousel') cls.push('as-carousel');
  if (sec.mode === 'grid') cls.push('as-grid');
  // The lead photo the carousel opens on — omitted when it is simply the first.
  const lead = Math.max(0, Math.min(sec.lead || 0, sec.images.length - 1));
  return `<div class="${cls.join(' ')}"${lead ? ` data-lead="${lead}"` : ''}>${figs}</div>`;
}

function rewrite(src, payload) {
  const { sections, lines } = parseDoc(src);
  const byTitle = new Map(sections.map((s) => [s.title, s]));
  // Apply back-to-front so earlier line numbers stay valid.
  const edits = [];
  for (const incoming of payload.sections) {
    const sec = byTitle.get(incoming.title);
    if (!sec) continue;
    sec.images = incoming.images;
    sec.cols = incoming.cols;
    sec.mode = incoming.mode || 'auto';
    sec.lead = incoming.lead || 0;
    if (sec.galleryLine !== -1) {
      edits.push(sec.images.length
        ? { at: sec.galleryLine, remove: 1, insert: [galleryHtml(sec)] }
        // Drop the now-empty gallery together with the blank line under it.
        : { at: sec.galleryLine, remove: lines[sec.galleryLine + 1] === '' ? 2 : 1, insert: [] });
    } else if (sec.images.length) {
      // No gallery yet: put it after the section's first paragraph, else right under the heading.
      let at = sec.start + 1;
      while (lines[at] === '') at++;
      while (at < lines.length && lines[at] !== '' && !lines[at].startsWith('## ')) at++;
      edits.push({ at, remove: 0, insert: ['', galleryHtml(sec)] });
    }
  }
  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) lines.splice(e.at, e.remove, ...e.insert);

  const fmEnd = lines.indexOf('---', 1);
  for (const key of ['cover', 'coverCard']) {
    const val = payload[key];
    const i = lines.findIndex((l, n) => n > 0 && n < fmEnd && l.startsWith(`${key}:`));
    if (val && i !== -1) lines[i] = `${key}: ${val}`;
    else if (val) lines.splice(fmEnd, 0, `${key}: ${val}`);
    else if (i !== -1) lines.splice(i, 1);
  }
  return lines.join('\n');
}

const genThumbs = () => new Promise((r) =>
  execFile('node', ['scripts/gen-thumbs.mjs'], { cwd: ROOT }, () => r()));

function safeDoc(file) {
  const abs = path.join(ROOT, file);
  const ok = CONTENT_DIRS.some((d) => abs.startsWith(path.join(ROOT, d))) && abs.endsWith('.md');
  return ok && existsSync(abs) ? abs : null;
}

const body = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

// Connect-style middleware: handles /api/gallery/*, passes everything else through.
export function galleryMiddleware() {
  return async function gallery(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/gallery/')) return next();
    const route = url.pathname.slice('/api/gallery/'.length);
    try {
      if (route === 'docs') return j(res, 200, await listDocs());

      if (route === 'doc') {
        const abs = safeDoc(url.searchParams.get('file') || '');
        if (!abs) return j(res, 400, { error: 'bad file' });
        const { fm, sections } = parseDoc(await readFile(abs, 'utf8'));
        const extraDirs = [url.searchParams.get('dir'), fm.cover, fm.coverCard]
          .filter(Boolean).map((p) => (p.includes('/') ? path.posix.dirname(p) : p));
        const pool = await poolFor(sections, extraDirs);
        return j(res, 200, {
          cover: fm.cover || '', coverCard: fm.coverCard || '',
          sections: sections.map(({ title, images, cols, mode, lead, galleryLine }) =>
            ({ title, images, cols, mode, lead, hasGallery: galleryLine !== -1 })),
          pool: pool.images, dirs: pool.dirs,
        });
      }

      if (route === 'save' && req.method === 'POST') {
        const payload = JSON.parse((await body(req)).toString());
        const abs = safeDoc(payload.file || '');
        if (!abs) return j(res, 400, { error: 'bad file' });
        await writeFile(abs, rewrite(await readFile(abs, 'utf8'), payload));
        await genThumbs();
        return j(res, 200, { ok: true });
      }

      if (route === 'upload' && req.method === 'POST') {
        const dir = url.searchParams.get('dir') || '';
        const name = path.basename(url.searchParams.get('name') || '');
        if (!dir.startsWith('/images/') || !name) return j(res, 400, { error: 'bad target' });
        const out = path.join(ROOT, 'public', dir, name.replace(/\.[^.]+$/, '') + '.jpg');
        await mkdir(path.dirname(out), { recursive: true });
        const { default: sharp } = await import('sharp');
        // Match the review convention: width 1440, quality 88.
        await sharp(await body(req)).rotate()
          .resize({ width: 1440, withoutEnlargement: true, kernel: 'lanczos3' })
          .jpeg({ quality: 88, mozjpeg: true, progressive: true }).toFile(out);
        await genThumbs();
        return j(res, 200, { src: path.posix.join(dir, path.basename(out)) });
      }

      return j(res, 404, { error: 'unknown route' });
    } catch (err) {
      return j(res, 500, { error: String((err && err.message) || err) });
    }
  };
}
