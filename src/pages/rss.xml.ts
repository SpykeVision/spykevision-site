import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const reviews = (await getCollection('reviews'))
    .filter(r => !r.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'SpykeVision — Projector Reviews',
    description: 'Independent, measurement-driven projector reviews. Brightness, contrast, ANSI, ADL and lens testing done right.',
    site: context.site!,
    items: reviews.map(r => ({
      title: r.data.title,
      pubDate: r.data.date,
      description: r.data.summary,
      link: `/reviews/${r.slug}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
