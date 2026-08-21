import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

// Hand-rolled sitemap so draft reviews stay out (they build as noindex pages).
export async function GET(context: APIContext) {
  const site = context.site!;
  const en = (await getCollection('reviews')).filter((r) => !r.data.draft);
  const ru = (await getCollection('reviews-ru')).filter((r) => !r.data.draft);

  const staticPages = [
    '/', '/reviews/', '/about/', '/methodology/', '/contact/', '/privacy/',
    '/ru/', '/ru/reviews/', '/ru/about/', '/ru/methodology/', '/ru/contact/',
    '/adl-calculator/', '/ru/adl-calculator/',
  ];

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const entries = [
    ...staticPages.map((p) => ({ loc: p, lastmod: null as string | null })),
    ...en.map((r) => ({ loc: `/reviews/${r.slug}/`, lastmod: fmt(r.data.date) })),
    ...ru.map((r) => ({ loc: `/ru/reviews/${r.slug}/`, lastmod: fmt(r.data.date) })),
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map(
        (e) =>
          `  <url><loc>${new URL(e.loc, site)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`
      )
      .join('\n') +
    '\n</urlset>\n';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
