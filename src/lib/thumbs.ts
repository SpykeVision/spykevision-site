import { existsSync, readFileSync } from 'node:fs';
import { imageSize } from 'image-size';

// srcset over generated /public/thumbs variants (see scripts/gen-thumbs.mjs).
// Returns null when no variant exists, so callers can just skip the attribute.
export function thumbSrcset(src: string | undefined): string | null {
  if (!src || !src.startsWith('/')) return null;
  const parts: string[] = [];
  for (const w of [640, 1280]) {
    if (existsSync(`public/thumbs/${w}${src}`)) parts.push(`/thumbs/${w}${src} ${w}w`);
  }
  if (!parts.length) return null;
  try {
    const d = imageSize(readFileSync(`public${src}`));
    if (d.width) parts.push(`${src} ${d.width}w`);
  } catch {
    /* original unreadable — variants alone still work */
  }
  return parts.join(', ');
}

// grid: 1 col mobile, 2 cols ≥640px, 3 cols ≥900px (see style.css)
export const CARD_SIZES = '(max-width: 639px) 100vw, (max-width: 899px) 50vw, 360px';
export const FEATURED_SIZES = '(max-width: 1160px) 100vw, 1080px';
