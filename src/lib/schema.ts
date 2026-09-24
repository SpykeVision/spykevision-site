// JSON-LD graph builders.
//
// Everything lives in one `@graph` per page so nodes can reference each other by
// @id instead of repeating the publisher block in every entity. Google resolves
// those references fine and the payload stays small.
//
// Deliberately absent: `reviewRating` / `aggregateRating`. The reviews carry a
// `score` in frontmatter, but it is never rendered on the article page, and
// Google's structured-data policy forbids marking up content the visitor cannot
// see. Emitting stars we don't show risks a manual action, so the score stays
// out until it appears on the page itself.

const ORG_FRAGMENT = '#organization';
const SITE_FRAGMENT = '#website';

const abs = (site: URL, path: string) => new URL(path, site).href;

/** Product name from a review title: "XGIMI Titan Noir Max — In-Depth Review" → "XGIMI Titan Noir Max". */
export function productNameFromTitle(title: string): string {
  return title.split(/\s+[—–-]\s+/)[0].trim();
}

/** Organization + WebSite. Emitted on every page; other nodes point at these by @id. */
export function publisherGraph(site: URL) {
  const orgId = abs(site, '/') + ORG_FRAGMENT;
  return [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: 'SpykeVision',
      url: abs(site, '/'),
      logo: { '@type': 'ImageObject', url: abs(site, '/favicon.svg') },
      sameAs: ['https://www.avsforum.com/members/spykesik.8223142/'],
    },
    {
      '@type': 'WebSite',
      '@id': abs(site, '/') + SITE_FRAGMENT,
      name: 'SpykeVision',
      url: abs(site, '/'),
      publisher: { '@id': orgId },
    },
  ];
}

type ReviewData = {
  title: string;
  summary: string;
  cover?: string;
  date: Date;
  category?: string;
  buyLink?: string;
  productName?: string;
  brand?: string;
};

/** TechArticle + the product it is about + breadcrumbs, for a single review page. */
export function reviewGraph(opts: {
  review: ReviewData;
  site: URL;
  canonical: URL;
  isRu: boolean;
}) {
  const { review, site, canonical, isRu } = opts;
  const orgId = abs(site, '/') + ORG_FRAGMENT;
  const productId = canonical.href + '#product';
  const name = review.productName || productNameFromTitle(review.title);

  const product: Record<string, unknown> = {
    '@type': 'Product',
    '@id': productId,
    name,
    brand: { '@type': 'Brand', name: review.brand || name.split(/\s+/)[0] },
  };
  if (review.cover) product.image = abs(site, review.cover);
  if (review.buyLink) product.url = review.buyLink;

  const article: Record<string, unknown> = {
    '@type': 'TechArticle',
    '@id': canonical.href + '#article',
    headline: review.title,
    description: review.summary,
    datePublished: review.date.toISOString(),
    inLanguage: isRu ? 'ru' : 'en',
    mainEntityOfPage: canonical.href,
    author: { '@type': 'Person', name: 'SpykeSIK', url: abs(site, '/about/') },
    publisher: { '@id': orgId },
    about: { '@id': productId },
  };
  if (review.cover) article.image = abs(site, review.cover);
  if (review.category) article.articleSection = review.category;

  const reviewsPath = isRu ? '/ru/reviews/' : '/reviews/';
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': canonical.href + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SpykeVision', item: abs(site, isRu ? '/ru/' : '/') },
      { '@type': 'ListItem', position: 2, name: isRu ? 'Обзоры' : 'Reviews', item: abs(site, reviewsPath) },
      { '@type': 'ListItem', position: 3, name: review.title },
    ],
  };

  return [article, product, breadcrumb];
}
