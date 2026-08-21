import { defineConfig } from 'astro/config';
import { imageSize } from 'image-size';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Probe intrinsic dimensions of a /public image so we can emit width/height
// (reserves layout space -> no CLS while 30+ photos stream in).
const dimCache = new Map();
function dimsFor(src) {
  if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) return null;
  const clean = src.split(/[?#]/)[0];
  if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(clean)) return null;
  if (dimCache.has(clean)) return dimCache.get(clean);
  let d = null;
  try {
    d = imageSize(readFileSync(path.join('./public', decodeURIComponent(clean))));
  } catch {
    /* missing file — skip silently */
  }
  dimCache.set(clean, d);
  return d;
}

// Downscaled grid variants live at /thumbs/<w>/<original path> (see scripts/gen-thumbs.mjs).
// Originals stay in src= — the lightbox always opens the untouched file.
const THUMB_WIDTHS = [640, 1280];
function srcsetFor(src, width) {
  if (!/^\/(images|uploads)\//.test(src)) return null;
  const parts = THUMB_WIDTHS.filter((w) => width > w).map((w) => `/thumbs/${w}${src} ${w}w`);
  if (!parts.length) return null;
  parts.push(`${src} ${width}w`);
  return parts.join(', ');
}
const SIZES = {
  gallery2: '(max-width: 600px) 50vw, (max-width: 1160px) 46vw, 520px',
  gallery3: '(max-width: 600px) 50vw, (max-width: 1160px) 31vw, 350px',
  full: '(max-width: 760px) 100vw, (max-width: 1160px) 95vw, 1080px',
};

function patchRawImg(tag, sizes) {
  let out = tag;
  if (!/\bloading=/.test(out)) out = out.replace('<img', '<img loading="lazy"');
  if (!/\bdecoding=/.test(out)) out = out.replace('<img', '<img decoding="async"');
  const m = out.match(/\bsrc="([^"]+)"/);
  const d = m && dimsFor(m[1]);
  if (d && !/\bwidth=/.test(out)) {
    out = out.replace('<img', `<img width="${d.width}" height="${d.height}"`);
  }
  if (d && !/\bsrcset=/.test(out)) {
    const ss = srcsetFor(m[1], d.width);
    if (ss) out = out.replace('<img', `<img srcset="${ss}" sizes="${sizes}"`);
  }
  return out;
}

function lazyImages() {
  return function () {
    return function (tree) {
      function walk(node) {
        if (node.type === 'element' && node.tagName === 'img') {
          if (!node.properties) node.properties = {};
          node.properties.loading = 'lazy';
          if (!node.properties.decoding) node.properties.decoding = 'async';
          const d = dimsFor(node.properties.src);
          if (d && !node.properties.width) {
            node.properties.width = d.width;
            node.properties.height = d.height;
          }
          if (d && !node.properties.srcset) {
            const ss = srcsetFor(node.properties.src, d.width);
            if (ss) {
              node.properties.srcset = ss;
              node.properties.sizes = SIZES.full;
            }
          }
        }
        // Also patch raw HTML strings (gallery divs, figure tags, etc.)
        if ((node.type === 'raw' || node.type === 'html') && node.value) {
          const sizes = node.value.includes('class="gallery')
            ? (node.value.includes('cols-3') ? SIZES.gallery3 : SIZES.gallery2)
            : SIZES.full;
          node.value = node.value.replace(/<img\b[^>]*>/g, (t) => patchRawImg(t, sizes));
        }
        if (node.children) node.children.forEach(walk);
      }
      walk(tree);
    };
  };
}

export default defineConfig({
  site: 'https://spykevision.com',
  build: { format: 'directory' },
  markdown: {
    rehypePlugins: [lazyImages()],
  },
});
