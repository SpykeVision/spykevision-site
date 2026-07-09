// TEMPORARY diagnostics: names of available env keys (no values). Remove after use.
export async function onRequestGet(context) {
  const keys = Object.keys(context.env || {}).sort();
  const k = context.env.STATS_KEY || '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k));
  const hash = [...new Uint8Array(digest)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
  return new Response(JSON.stringify({
    envKeys: keys, hasDB: !!context.env.DB, hasKey: !!k,
    keyLen: k.length, keyHash: hash,
  }), { headers: { 'Content-Type': 'application/json' } });
}
