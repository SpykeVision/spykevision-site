/* SpykeVision custom metrics — tiny, no cookies, no identifiers.
   Sends named events to /api/event via sendBeacon (fire-and-forget). */
(function () {
  var sent = {};
  function track(e, m, once) {
    if (once && sent[e + (m || '')]) return;
    sent[e + (m || '')] = 1;
    var body = JSON.stringify({ e: e, m: m || '', p: location.pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/event', { method: 'POST', body: body, keepalive: true }).catch(function () {});
    }
  }

  // Pageview — basis for unique-visitor counts
  track('pageview');

  // Language switch
  document.querySelectorAll('.lang-dropdown-menu a').forEach(function (a) {
    a.addEventListener('click', function () { track('lang_switch', a.getAttribute('href')); });
  });

  // Donate funnel
  document.querySelectorAll('[data-donate-open]').forEach(function (b) {
    b.addEventListener('click', function () { track('donate_open'); });
  });
  var boosty = document.querySelector('.btn-boosty');
  if (boosty) boosty.addEventListener('click', function () { track('donate_boosty'); });
  var usdt = document.getElementById('copyUsdt');
  if (usdt) usdt.addEventListener('click', function () { track('donate_usdt_copy'); });

  // Outbound store link + RSS
  document.querySelectorAll('a.btn-official').forEach(function (a) {
    a.addEventListener('click', function () { track('buy_click'); });
  });
  document.querySelectorAll('a[href$="rss.xml"]').forEach(function (a) {
    a.addEventListener('click', function () { track('rss_click'); });
  });

  // Contact form: track result by watching the status line (main.js sets it after fetch)
  var cForm = document.getElementById('contactForm');
  var cStatus = document.getElementById('formStatus');
  if (cForm && cStatus) {
    new MutationObserver(function () {
      var txt = (cStatus.textContent || '').toLowerCase();
      if (!txt) return;
      var fail = /error|ошибк|failed|wrong/.test(txt);
      track('contact_submit', fail ? 'fail' : 'ok', true);
    }).observe(cStatus, { childList: true, characterData: true, subtree: true });
  }

  // Newsletter (MailerLite injects its form dynamically — delegated submit)
  document.querySelectorAll('.ml-embedded').forEach(function (box) {
    box.addEventListener('submit', function () { track('subscribe_submit', '', true); }, true);
  });

  // Calculators: first meaningful interaction + frame upload
  var isCalc = /adl-calculator/.test(location.pathname) ? 'calc_adl_use'
             : /contrast-depth/.test(location.pathname) ? 'calc_contrast_use'
             : /screen-brightness/.test(location.pathname) ? 'calc_contrast_use' : null;
  if (isCalc) {
    ['input', 'change', 'pointerdown'].forEach(function (evt) {
      document.addEventListener(evt, function (ev) {
        var t = ev.target;
        if (t.closest && (t.closest('input,select,button.preset,.preset,canvas,.divider-handle'))) {
          track(isCalc, '', true);
        }
      }, { passive: true, capture: true });
    });
    var file = document.getElementById('fileInput');
    if (file) file.addEventListener('change', function () { track('calc_upload_frame'); });
  }

  // Review read depth: 25/50/75/100% milestones
  if (/\/reviews\/[^/]+/.test(location.pathname)) {
    var marks = [25, 50, 75, 100];
    window.addEventListener('scroll', function () {
      var doc = document.documentElement;
      var pct = Math.round(100 * (doc.scrollTop + innerHeight) / doc.scrollHeight);
      while (marks.length && pct >= marks[0]) {
        track('read_depth', String(marks.shift()), true);
      }
    }, { passive: true });

    // Chart interactions (one event per chart per visit)
    document.querySelectorAll('[id^="chart-"]').forEach(function (el) {
      el.addEventListener('pointerdown', function () { track('chart_interact', el.id, true); });
      el.addEventListener('mousemove', function () { track('chart_interact', el.id, true); }, { once: true });
    });
  }
})();
