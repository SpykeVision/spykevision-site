import { statSync } from 'node:fs';

// Cache-busting stamp for files served straight from /public.
// Cloudflare caches those for 4h, so without a changing URL a deploy can pair
// new HTML with a stale stylesheet — which silently breaks layout. Keyed on the
// file's mtime so the URL only changes when the file actually changes.
const cache = new Map<string, string>();

export function v(publicPath: string): string {
  let stamp = cache.get(publicPath);
  if (stamp === undefined) {
    try {
      stamp = Math.floor(statSync('./public' + publicPath).mtimeMs).toString(36);
    } catch {
      stamp = '0';
    }
    cache.set(publicPath, stamp);
  }
  return publicPath + '?v=' + stamp;
}
