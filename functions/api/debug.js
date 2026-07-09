// TEMPORARY diagnostics: names of available env keys (no values). Remove after use.
export async function onRequestGet(context) {
  const keys = Object.keys(context.env || {}).sort();
  return new Response(JSON.stringify({ envKeys: keys, hasDB: !!context.env.DB, hasKey: !!context.env.STATS_KEY }),
    { headers: { 'Content-Type': 'application/json' } });
}
