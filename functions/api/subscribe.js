// Newsletter signup proxied to the MailerLite form, so our own inline form works
// instantly and isn't hidden by ad blockers that block assets.mailerlite.com.
// POST /api/subscribe {email, hp} → {ok} | {error}

const ML_URL = 'https://assets.mailerlite.com/jsonp/2448508/forms/190417173507736791/subscribe';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }

  const email = String(d.email || '').trim().slice(0, 254);
  if (d.hp) return json({ ok: true }); // honeypot filled → bot, pretend success
  if (!EMAIL_RE.test(email)) return json({ error: 'invalid' }, 400);

  const body = new URLSearchParams({ 'fields[email]': email, 'ml-submit': '1', anticsrf: 'true' });
  let r;
  try {
    r = await fetch(ML_URL, { method: 'POST', body, headers: { Accept: 'application/json' } });
  } catch {
    return json({ error: 'upstream' }, 502);
  }
  const res = await r.json().catch(() => ({}));
  if (res.success) return json({ ok: true });
  return json({ error: res.errors && res.errors.fields && res.errors.fields.email ? 'invalid' : 'upstream' }, res.errors ? 400 : 502);
}
