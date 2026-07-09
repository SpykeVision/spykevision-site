// Custom analytics collector — writes events to D1 (binding: DB).
// Fire-and-forget from the client; always answers 204 so a missing DB
// or bad payload never surfaces as an error in the browser.

const ALLOWED_EVENTS = new Set([
  'pageview',            // page load — basis for unique-visitor counts
  'calc_adl_use',        // ADL calculator interacted with
  'calc_contrast_use',   // Contrast Depth calculator interacted with
  'calc_upload_frame',   // user uploaded own frame into a calculator
  'lang_switch',         // EN <-> RU switch
  'buy_click',           // outbound click on "Official store" button
  'donate_open',         // donate modal opened
  'donate_boosty',       // Boosty button clicked
  'donate_usdt_copy',    // USDT address copied
  'read_depth',          // review scroll milestone (meta: 25/50/75/100)
  'chart_interact',      // any Chart.js chart hovered/clicked (meta: chart id)
  'rss_click',
  'contact_submit',      // contact form sent (meta: ok/fail)
  'subscribe_submit',    // newsletter (MailerLite) form submitted
]);

export async function onRequestPost(context) {
  const { request, env } = context;
  const resp = new Response(null, { status: 204 });
  if (!env.DB) return resp;

  try {
    const data = await request.json();
    const event = String(data.e || '');
    if (!ALLOWED_EVENTS.has(event)) return resp;

    const path = String(data.p || '').slice(0, 200);
    const meta = String(data.m || '').slice(0, 100);
    const lang = path.startsWith('/ru') || path.includes('-ru') ? 'ru' : 'en';
    const country = (request.cf && request.cf.country) || '';
    const city = (request.cf && request.cf.city) || '';
    const ua = request.headers.get('user-agent') || '';
    const mobile = /Mobi/i.test(ua) ? 1 : 0;

    // Privacy-friendly visitor id (Plausible-style): daily hash of IP+UA+salt.
    // Raw IP is never stored; the hash can't be linked across days.
    const ip = request.headers.get('cf-connecting-ip') || '';
    const day = new Date().toISOString().slice(0, 10);
    const input = new TextEncoder().encode(day + ip + ua + (env.STATS_KEY || 'salt'));
    const digest = await crypto.subtle.digest('SHA-256', input);
    const visitor = [...new Uint8Array(digest)].slice(0, 8)
      .map((b) => b.toString(16).padStart(2, '0')).join('');

    await env.DB.prepare(
      'INSERT INTO events (ts, event, path, meta, lang, country, city, mobile, visitor) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(Date.now(), event, path, meta, lang, country, city, mobile, visitor).run();
  } catch (_) { /* never fail the client */ }

  return resp;
}
