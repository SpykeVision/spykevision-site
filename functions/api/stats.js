// Quick stats readout: /api/stats?key=<STATS_KEY>&days=7
// STATS_KEY is an env var; without a match returns 404 (indistinguishable from no route).

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!env.DB || !env.STATS_KEY || url.searchParams.get('key') !== env.STATS_KEY) {
    return new Response('Not found', { status: 404 });
  }

  // Either ?days=N or an explicit range ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive)
  const fromP = url.searchParams.get('from');
  const toP = url.searchParams.get('to');
  let since, until = Date.now();
  if (fromP && /^\d{4}-\d{2}-\d{2}$/.test(fromP)) {
    since = Date.parse(fromP + 'T00:00:00Z');
    if (toP && /^\d{4}-\d{2}-\d{2}$/.test(toP)) until = Date.parse(toP + 'T23:59:59Z');
  } else {
    const days = Math.min(365, Number(url.searchParams.get('days') || 7));
    since = Date.now() - days * 86400000;
  }

  const [byEvent, byDay, langs, countries, cities, readDepth, charts, pages] = await Promise.all([
    env.DB.prepare('SELECT event, COUNT(*) n FROM events WHERE ts>? AND ts<=? GROUP BY event ORDER BY n DESC').bind(since, until).all(),
    env.DB.prepare("SELECT date(ts/1000,'unixepoch') d, COUNT(DISTINCT visitor) uniques, SUM(event='pageview') views FROM events WHERE ts>? AND ts<=? GROUP BY d ORDER BY d").bind(since, until).all(),
    env.DB.prepare("SELECT lang, COUNT(DISTINCT visitor) uniques FROM events WHERE ts>? AND ts<=? GROUP BY lang").bind(since, until).all(),
    env.DB.prepare("SELECT country, COUNT(DISTINCT visitor) uniques FROM events WHERE ts>? AND ts<=? GROUP BY country ORDER BY uniques DESC LIMIT 15").bind(since, until).all(),
    env.DB.prepare("SELECT country, city, COUNT(DISTINCT visitor) uniques FROM events WHERE ts>? AND ts<=? AND city!='' GROUP BY country, city ORDER BY uniques DESC LIMIT 15").bind(since, until).all(),
    env.DB.prepare("SELECT meta, COUNT(*) n FROM events WHERE ts>? AND ts<=? AND event='read_depth' GROUP BY meta ORDER BY CAST(meta AS INT)").bind(since, until).all(),
    env.DB.prepare("SELECT meta, COUNT(*) n FROM events WHERE ts>? AND ts<=? AND event='chart_interact' GROUP BY meta ORDER BY n DESC LIMIT 15").bind(since, until).all(),
    env.DB.prepare("SELECT path, COUNT(*) views, COUNT(DISTINCT visitor) uniques FROM events WHERE ts>? AND ts<=? AND event='pageview' GROUP BY path ORDER BY views DESC LIMIT 20").bind(since, until).all(),
  ]);

  return new Response(JSON.stringify({
    range: { since: new Date(since).toISOString().slice(0,10), until: new Date(until).toISOString().slice(0,10) },
    events: byEvent.results,
    perDay: byDay.results,
    languages: langs.results,
    countries: countries.results,
    cities: cities.results,
    topPages: pages.results,
    readDepth: readDepth.results,
    charts: charts.results,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
