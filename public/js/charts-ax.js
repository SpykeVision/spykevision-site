(function () {
  'use strict';
  if (!document.querySelector('.chart-section')) return;
  var IS_WIDE = !!document.querySelector('.article-page--wide');

  /* ── Theme (mirrors charts-tnm.js) ────────────────────── */
  function _isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function _mkTC(dark) {
    return dark ? { text:'#ccc', text3:'#888', ttBg:'#1e1e1e', ttBord:'#3a3a3a', ttTitle:'#fff' }
                : { text:'#3a3a3c', text3:'#6e6e73', ttBg:'#ffffff', ttBord:'#e2e2e7', ttTitle:'#1c1c1e' };
  }
  function _useDark() { return _isDark() || !IS_WIDE; }
  var TC = _mkTC(_useDark());
  Chart.defaults.color = _useDark() ? '#999' : '#6e6e73';
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  Chart.defaults.font.size = 12;
  var GRID = { color: _useDark() ? '#2a2a2a' : '#e5e5ea' };

  var ALL_CHARTS = [];
  function mkChart(canvas, cfg) { var c = new Chart(canvas, cfg); ALL_CHARTS.push(c); return c; }
  function mkTitle(parent, title, sub) {
    var d = document.createElement('div');
    d.className = 'cs-title';
    d.innerHTML = '<strong>' + title + '</strong>' + (sub ? '<span>' + sub + '</span>' : '');
    parent.appendChild(d);
  }
  function mkCanvas(parent) { var c = document.createElement('canvas'); parent.appendChild(c); return c; }

  /* ── Shared helpers (mirror charts-tnm.js) ────────────── */
  var DL_PLUGIN = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];
  try { if (!Chart.registry.plugins.get('edgeAlign')) throw 0; } catch (e) {
    Chart.register({
      id: 'edgeAlign',
      beforeRender: function (chart) {
        var s = chart.scales['x'];
        if (!s || s.options.offset !== false) return;
        s._startPixel = s.left; s._endPixel = s.right; s._pixelRange = s.right - s.left;
      },
    });
  }

  function ttOpts(fmtFn) {
    return {
      mode: 'index', intersect: false,
      backgroundColor: TC.ttBg, titleColor: TC.ttTitle,
      bodyColor: TC.text, borderColor: TC.ttBord, borderWidth: 1, padding: 12,
      callbacks: fmtFn ? { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmtFn(ctx.parsed.y); } } : {},
    };
  }
  function legOpts() {
    return { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16,
      filter: function (i) { return i.text !== '_m'; } } };
  }
  function crTicks(nice) {
    return { maxTicksLimit: 12, color: TC.text3,
      callback: function (v) { return nice.indexOf(v) >= 0 ? v.toLocaleString() + ':1' : ''; } };
  }
  function dlBar(fmt, size) {
    return { anchor: 'end', align: 'end', offset: 0,
      color: _useDark() ? '#ccc' : '#3a3a3c', font: { size: size || 9, weight: '700' }, formatter: fmt };
  }

  var sortState = {};
  function sortTable(tbl, col) {
    var key = tbl.id + '_' + col;
    var asc = sortState[key] !== true;
    sortState[key] = asc;
    Array.prototype.forEach.call(tbl.querySelectorAll('th'), function (th) { th.classList.remove('sort-asc', 'sort-desc'); });
    tbl.querySelectorAll('th')[col].classList.add(asc ? 'sort-asc' : 'sort-desc');
    var tbody = tbl.querySelector('tbody');
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    rows.sort(function (a, b) {
      var at = a.cells[col].textContent.replace(/[^0-9.\-]/g, '');
      var bt = b.cells[col].textContent.replace(/[^0-9.\-]/g, '');
      var af = parseFloat(at), bf = parseFloat(bt);
      if (isNaN(af) || isNaN(bf)) return asc ? at.localeCompare(bt) : bt.localeCompare(at);
      return asc ? af - bf : bf - af;
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
  }

  function mkTable(parent, head, rows, tableId) {
    var wrap = document.createElement('div');
    wrap.className = 'chart-table-wrap';
    var tbl = document.createElement('table');
    tbl.className = 'data-table';
    if (tableId) tbl.id = tableId;
    var thead = document.createElement('thead'), hr = document.createElement('tr');
    head.forEach(function (h, i) {
      var th = document.createElement('th');
      th.innerHTML = h;
      th.addEventListener('click', function () { sortTable(tbl, i); });
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      row.forEach(function (cell, ci) {
        var td = document.createElement('td');
        if (ci === 0) td.className = 'label-col';
        td.innerHTML = (cell !== null && cell !== undefined) ? String(cell) : '—';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    parent.appendChild(wrap);
    return tbl;
  }

  // Separate data card after `afterEl`, with an optional footnote line.
  /* ═══ Bars view for data cards (matches the Titan review) ═ */
  function mkBarsSection(parent, o) {
    var section = document.createElement('div');
    section.className = 'cs-bars-section';

    var chips = document.createElement('div');
    chips.className = 'cs-aperture-chips';
    o.keys.forEach(function (k, i) {
      var b = document.createElement('button');
      b.className = 'cs-chip' + (i === 0 ? ' cs-chip--active' : '');
      b.dataset.key = k;
      b.innerHTML = '<span class="color-dot" style="background:' + o.colors[k] + '"></span>' + k;
      chips.appendChild(b);
    });
    section.appendChild(chips);

    var stats = document.createElement('div');
    stats.className = 'cs-stat-cards';
    section.appendChild(stats);

    var bars = document.createElement('div');
    bars.className = 'cs-bar-rows';
    section.appendChild(bars);

    function render(key) {
      var data = o.data[key], hex = o.colors[key], fmt = o.format;
      var vals = data.filter(function (v) { return v !== null && v !== undefined; });
      var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);

      stats.innerHTML = '';
      [{ l: 'Peak', v: max }, { l: o.refLabel, v: data[o.refIdx] }, { l: 'Lowest', v: min }]
        .forEach(function (st) {
          var c = document.createElement('div');
          c.className = 'cs-stat-card';
          c.innerHTML = '<div class="cs-stat-val">' + (st.v == null ? '—' : fmt(st.v)) + '</div>'
            + '<div class="cs-stat-lbl">' + st.l + '</div>'
            + '<div class="cs-stat-zoom">' + (st.v == null ? '' : o.cols[data.indexOf(st.v)]) + '</div>';
          stats.appendChild(c);
        });

      bars.innerHTML = '';
      data.forEach(function (v, i) {
        var pct = (v != null && max) ? Math.round(v / max * 100) : 0;
        var r = document.createElement('div');
        r.className = 'cs-bar-row';
        r.innerHTML = '<span class="cs-bar-zoom">' + o.cols[i] + '</span>'
          + '<span class="cs-bar-val">' + (v != null ? fmt(v) : '—') + '</span>'
          + '<div class="cs-bar-track"><div class="cs-bar-fill" style="width:' + pct + '%;background:' + hex + 'cc"></div></div>';
        bars.appendChild(r);
      });
    }

    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.cs-chip');
      if (!b) return;
      Array.prototype.forEach.call(chips.querySelectorAll('.cs-chip'), function (x) {
        x.classList.toggle('cs-chip--active', x === b);
      });
      render(b.dataset.key);
    });

    render(o.keys[0]);
    parent.appendChild(section);
    return section;
  }

  function mkTableCard(afterEl, title, sub, head, rows, tableId, note, barOpts) {
    var card = document.createElement('div');
    card.className = IS_WIDE ? 'chart-section cs-data-card' : 'chart-section';
    var ct = document.createElement('div');
    ct.className = 'cs-title';
    ct.innerHTML = '<strong>' + title + '</strong>' + (sub ? '<span>' + sub + '</span>' : '');
    card.appendChild(ct);
    var toggle = null;
    if (barOpts && IS_WIDE) {
      toggle = document.createElement('div');
      toggle.className = 'cs-view-toggle';
      toggle.innerHTML = '<button class="cs-tab cs-tab--active" data-view="values">Values</button>'
                       + '<button class="cs-tab" data-view="bars">Bars</button>';
      ct.appendChild(toggle);
    }
    var host = card;
    if (IS_WIDE) {
      host = document.createElement('div');
      host.className = 'cs-table-section';
      card.appendChild(host);
    }
    mkTable(host, head, rows, tableId);
    if (note) {
      var n = document.createElement('div');
      n.className = 'cs-table-label';
      n.style.cssText = 'text-transform:none;font-weight:400;';
      n.innerHTML = note;
      host.appendChild(n);
    }
    var barsSection = null;
    if (toggle) {
      barsSection = mkBarsSection(card, barOpts);
      barsSection.style.display = 'none';
      toggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.cs-tab');
        if (!btn) return;
        Array.prototype.forEach.call(toggle.querySelectorAll('.cs-tab'), function (x) {
          x.classList.toggle('cs-tab--active', x === btn);
        });
        var bars = btn.dataset.view === 'bars';
        host.style.display = bars ? 'none' : '';
        barsSection.style.display = bars ? 'block' : 'none';   // CSS default is display:none
      });
    }
    if (afterEl.nextSibling) afterEl.parentNode.insertBefore(card, afterEl.nextSibling);
    else afterEl.parentNode.appendChild(card);
    return card;
  }

  function dot(hex) { return '<span class="color-dot" style="background:' + hex + '"></span>'; }

  /* ═══ Shared EBL data ════════════════════════════════════ */
  // Native M7 \u2192 Cinema 2 ADL curve — scatter model to 20 %, then down to ANSI 390:1 at 50 %
  function nativeAt(a) {
    if (a <= 0) return 5895;
    if (a <= 20) return Math.round(1 / (1 / 5895 + 3.636e-5 * a));
    var y20 = 1 / (1 / 5895 + 3.636e-5 * 20), y50 = 390;
    var t = (Math.log(Math.max(a, 20.001)) - Math.log(20)) / (Math.log(50) - Math.log(20));
    return Math.round(Math.exp(Math.log(y20) + t * (Math.log(y50) - Math.log(y20))));
  }
  var NATIVE = [];
  for (var _a = 0; _a <= 70; _a += 0.5) NATIVE.push({ x: _a, y: nativeAt(_a) });

  function imgFor(x) { return 'r' + String(Math.round(x * 1000)).padStart(4, '0') + '.jpg'; }
  function prep(arr) {
    return arr.map(function (p) {
      return { x: p.x, y: Math.round(nativeAt(p.x) * p.m), m: p.m,
               l: p.l, pk: p.pk, img: imgFor(p.x) };
    });
  }

  var KEEP = prep([
    {x:0.05, m:1.995, l:100.0, pk:0.76},
    {x:0.065, m:5.262, l:100.0, pk:0.27},
    {x:0.237, m:5.169, l:100.0, pk:0.42},
    {x:0.481, m:5.169, l:100.0, pk:0.35},
    {x:0.64, m:2.271, l:100.0, pk:0.87},
    {x:1.686, m:1.981, l:100.0, pk:0.85},
    {x:3.325, m:1.148, l:100.0, pk:0.97},
    {x:3.538, m:2.762, l:100.0, pk:0.69},
    {x:3.764, m:2.267, l:100.0, pk:0.73},
    {x:3.781, m:3.601, l:100.0, pk:0.56},
    {x:4.239, m:2.782, l:100.0, pk:0.64},
    {x:4.254, m:1.432, l:100.0, pk:0.89},
    {x:5.598, m:3.623, l:104.5, pk:0.53},
    {x:5.992, m:2.937, l:104.7, pk:0.64},
    {x:6.082, m:3.864, l:107.9, pk:0.54},
    {x:6.583, m:3.801, l:105.3, pk:0.51},
    {x:7.144, m:2.245, l:102.0, pk:0.72},
    {x:7.403, m:1.227, l:100.0, pk:1.0},
    {x:8.4, m:3.503, l:104.7, pk:0.58},
    {x:9.071, m:3.864, l:103.7, pk:0.53},
    {x:9.377, m:1.408, l:100.0, pk:0.99},
    {x:10.381, m:1.145, l:100.0, pk:0.99},
    {x:10.693, m:1.156, l:100.0, pk:1.0},
    {x:12.082, m:2.298, l:102.2, pk:0.73},
    {x:13.566, m:1.13, l:100.0, pk:0.99},
    {x:14.073, m:1.773, l:100.0, pk:0.95},
    {x:14.217, m:1.07, l:100.0, pk:1.0},
    {x:15.346, m:3.135, l:102.3, pk:0.61},
    {x:16.207, m:2.019, l:100.0, pk:0.79},
    {x:17.092, m:2.13, l:100.0, pk:0.75},
    {x:19.221, m:2.698, l:100.0, pk:0.67},
    {x:21.048, m:1.108, l:100.0, pk:1.0},
    {x:22.0, m:2.241, l:100.0, pk:0.72},
    {x:26.086, m:1.076, l:100.0, pk:1.0},
    {x:57.735, m:1.09, l:100.0, pk:1.0}
  ]);
  var CUT = prep([
    {x:0.455, m:1.576, l:98.7, pk:0.82},
    {x:1.249, m:1.236, l:98.7, pk:0.97},
    {x:1.744, m:1.335, l:96.5, pk:0.97},
    {x:3.631, m:1.47, l:98.8, pk:0.9},
    {x:3.787, m:1.145, l:97.8, pk:1.0},
    {x:4.225, m:2.496, l:95.9, pk:0.77},
    {x:9.939, m:1.252, l:98.0, pk:1.0},
    {x:10.737, m:1.198, l:98.9, pk:0.99},
    {x:15.846, m:1.093, l:99.0, pk:1.0},
    {x:16.348, m:1.126, l:99.2, pk:0.99},
    {x:17.038, m:1.131, l:98.8, pk:0.99},
    {x:21.437, m:1.06, l:99.2, pk:1.0},
    {x:25.045, m:1.089, l:98.4, pk:1.0},
    {x:30.517, m:1.127, l:99.0, pk:0.98},
    {x:30.806, m:1.094, l:99.4, pk:1.0},
    {x:33.606, m:1.109, l:99.5, pk:0.99},
    {x:34.833, m:1.108, l:99.5, pk:0.99},
    {x:39.098, m:1.071, l:99.5, pk:1.0},
    {x:40.808, m:1.076, l:98.0, pk:1.0},
    {x:42.685, m:1.186, l:99.5, pk:1.0},
    {x:66.114, m:1.056, l:99.3, pk:1.0}
  ]);

  /* ═══ EBL Dynamic Contrast ═══════════════════════════════ */
  function buildEBL(el) {
    mkTitle(el, 'EBL DYNAMIC CONTRAST',
      'Filmmaker · Warm1 + gains · M7 \u2192 Cinema 2 · native contrast \u00d7 EBL dimming multiplier');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '300' : '480') + 'px';
    row.appendChild(mainWrap);

    var eblChart = mkChart(mkCanvas(mainWrap), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Native M7 \u2192 Cinema 2', data: NATIVE, showLine: true,
          borderColor: _useDark() ? '#555555' : '#aaaaaa', backgroundColor: 'transparent',
          pointRadius: 0, pointHoverRadius: 0, borderWidth: 1.5, borderDash: [5, 4],
          tension: 0.4, fill: false, order: 3 },
        { label: 'Light preserved', data: KEEP, showLine: false,
          backgroundColor: '#66BB6Acc', pointBackgroundColor: '#66BB6A', pointBorderColor: '#66BB6A',
          pointRadius: 6, pointHoverRadius: 9, borderWidth: 0, order: 1 },
        { label: 'Light clipped', data: CUT, showLine: false,
          backgroundColor: 'transparent', pointBackgroundColor: 'transparent',
          pointBorderColor: '#FF7043', pointBorderWidth: 2,
          pointRadius: 6, pointHoverRadius: 9, borderWidth: 0, order: 2 },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        layout: { padding: 0 },
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: {
            enabled: false, mode: 'nearest', intersect: true,
            external: function (context) {
              var ttEl = document.getElementById('ebl-curve-tt');
              if (!ttEl) {
                ttEl = document.createElement('div');
                ttEl.id = 'ebl-curve-tt';
                ttEl.style.cssText = ['position:fixed','pointer-events:none','z-index:9999',
                  'border-radius:8px','overflow:hidden','font-size:13px','line-height:1.4',
                  'max-width:360px','transition:opacity 0.1s','background:' + TC.ttBg,
                  'border:1px solid ' + TC.ttBord,'color:' + TC.text].join(';');
                document.body.appendChild(ttEl);
                window.addEventListener('scroll', function () { ttEl.style.opacity = '0'; }, { passive: true });
              }
              var tooltip = context.tooltip;
              if (tooltip.opacity === 0) { ttEl.style.opacity = '0'; return; }
              var items = tooltip.dataPoints;
              if (!items || !items.length) return;
              var raw = items[0].raw || {};
              if (raw.m == null) { ttEl.style.opacity = '0'; return; }
              var html = raw.img ? '<img src="/img/ebl/' + raw.img + '" style="display:block;width:100%;height:auto">' : '';
              html += '<div style="padding:9px 11px">';
              html += '<div style="font-weight:600;color:' + TC.ttTitle + '">ADL ' + raw.x + '%</div>';
              html += '<div>' + raw.y.toLocaleString() + ':1 \u00b7 multiplier ' + raw.m.toFixed(2) + '\u00d7</div>';
              html += '<div style="color:' + TC.text3 + '">Native ' + nativeAt(raw.x).toLocaleString() + ':1 \u00b7 light ' + raw.l + '%</div>';
              html += '</div>';
              ttEl.innerHTML = html;
              ttEl.style.opacity = '1';
              var rect = context.chart.canvas.getBoundingClientRect();
              var tx = rect.left + tooltip.caretX, ty = rect.top + tooltip.caretY;
              var ttW = Math.min(360, window.innerWidth - 16);
              ttEl.style.maxWidth = ttW + 'px';
              if (tx + ttW + 10 > window.innerWidth) tx -= ttW + 20; else tx += 12;
              tx = Math.max(8, tx);
              if (ty + 240 + 10 > window.innerHeight) ty -= 240 + 20; else ty += 12;
              ttEl.style.left = tx + 'px';
              ttEl.style.top = Math.max(8, ty) + 'px';
            },
          },
        },
        scales: {
          x: { type: 'linear', min: 0, max: 68, grid: GRID,
               title: { display: true, text: 'ADL (%)', color: TC.text3, font: { size: 12 } },
               ticks: { color: TC.text3, stepSize: 5, callback: function (v) { return v + '%'; } } },
          y: { type: 'logarithmic', min: 250, grid: GRID,
               ticks: { maxTicksLimit: 10, callback: function (v) {
                 var nice = [300,500,700,1000,2000,3000,5000,7000,10000,15000,20000,30000];
                 return nice.indexOf(v) >= 0 ? v.toLocaleString() : null; } } },
        },
      },
    });

    // Expand button — zoom into the dark-scene range
    var t = el.querySelector('.cs-title');
    if (t) {
      var btn = document.createElement('button');
      btn.className = 'cs-exp-btn';
      btn.textContent = '\u2922 Expand 0\u20135%';
      t.appendChild(btn);
      var expanded = false;
      btn.addEventListener('click', function () {
        expanded = !expanded;
        btn.classList.toggle('on', expanded);
        btn.textContent = expanded ? '\u2922 Full range' : '\u2922 Expand 0\u20135%';
        eblChart.options.scales.x.max = expanded ? 5 : 68;
        eblChart.options.scales.x.ticks.stepSize = expanded ? 0.5 : 5;
        eblChart.options.scales.y.min = expanded ? 2000 : 250;
        eblChart.update();
      });
    }

    var hint = document.createElement('p');
    hint.style.cssText = 'margin:8px 0 4px;font-size:12px;color:' + TC.text3 + ';text-align:center;';
    hint.textContent = '\ud83d\udca1 Hover over any point on the chart to see the actual scene from that measurement';
    el.appendChild(hint);

    // Measurements table below the chart (mirrors the TNM DBLE table)
    var pts = KEEP.map(function (p) { return Object.assign({ active: true }, p); })
      .concat(CUT.map(function (p) { return Object.assign({ active: false }, p); }));
    pts.sort(function (a, b) { return a.x - b.x; });
    buildEBLTable(el, pts, nativeAt);
  }

  // Shared scene-preview tooltip for EBL table rows (mirrors the chart tooltip).
  function eblRowTip() {
    var t = document.getElementById('ax-ebl-row-tt');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ax-ebl-row-tt';
      t.style.cssText = ['position:fixed','pointer-events:none','z-index:9999',
        'border-radius:8px','overflow:hidden','font-size:13px','line-height:1.4',
        'max-width:360px','transition:opacity .1s','background:' + TC.ttBg,
        'border:1px solid ' + TC.ttBord,'color:' + TC.text,'opacity:0'].join(';');
      document.body.appendChild(t);
      window.addEventListener('scroll', function () { t.style.opacity = '0'; }, { passive: true });
    }
    return t;
  }

  function buildEBLTable(afterEl, pts, nativeAt) {
    var DEFAULT_SHOW = 12;
    var SUB = 'Dynamic contrast · ✓ light preserved · ✗ highlights clipped · hover a row for the scene';

    var card = document.createElement('div'), host;
    if (IS_WIDE) {
      card.className = 'chart-section cs-data-card';
      var ct = document.createElement('div');
      ct.className = 'cs-title';
      ct.innerHTML = '<strong>EBL MEASUREMENTS</strong><span>' + SUB + '</span>';
      card.appendChild(ct);
      host = document.createElement('div');
      host.className = 'cs-table-section';
      card.appendChild(host);
    } else {
      card.className = 'chart-section';
      mkTitle(card, 'EBL MEASUREMENTS', SUB);
      host = card;
    }

    var wrap = document.createElement('div');
    wrap.className = 'chart-table-wrap';
    var tbl = document.createElement('table');
    tbl.className = 'data-table compact';
    tbl.id = 'tbl-ax-ebl';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>ADL</th><th>Native</th><th>EBL contrast</th><th>Mult.</th></tr>';
    tbl.appendChild(thead);

    var tbody = document.createElement('tbody');
    pts.forEach(function (p, i) {
      var nat = nativeAt(p.x);
      var badge = p.active
        ? '<span style="color:#66BB6A;font-weight:700;">✓</span>'
        : '<span style="color:#FF7043;font-weight:700;">✗</span>';
      var tr = document.createElement('tr');
      if (i >= DEFAULT_SHOW) { tr.className = 'ebl-extra'; tr.style.display = 'none'; }
      tr.innerHTML =
        '<td class="label-col">' + p.x.toFixed(3) + '%</td>' +
        '<td>' + nat.toLocaleString() + ':1</td>' +
        '<td>' + badge + ' ' + p.y.toLocaleString() + ':1</td>' +
        '<td>' + p.m.toFixed(2) + '×</td>';

      tr.style.cursor = 'help';
      tr.addEventListener('mouseenter', function () {
        var t = eblRowTip();
        var html = '<img src="/img/ebl/' + p.img + '" style="width:100%;display:block;" onerror="this.style.display=\'none\'">';
        html += '<div style="padding:10px 12px;">';
        html += '<div style="font-weight:600;color:' + TC.ttTitle + ';margin-bottom:6px;">ADL ' + p.x.toFixed(3) + '%</div>';
        html += p.active
          ? '<div style="color:#66BB6A;">Light preserved — ' + p.y.toLocaleString() + ':1</div>'
          : '<div style="color:#FF7043;">Highlights clipped (' + p.l.toFixed(1) + '% light) — ' + p.y.toLocaleString() + ':1</div>';
        html += '<div style="color:#888;margin-top:3px;">Native — ' + nat.toLocaleString() + ':1 · multiplier ×' + p.m.toFixed(2) + '</div>';
        html += '</div>';
        t.innerHTML = html;
        t.style.opacity = '1';
      });
      tr.addEventListener('mousemove', function (e) {
        var t = eblRowTip(), tx = e.clientX, ty = e.clientY;
        var ttW = Math.min(380, window.innerWidth - 16);
        if (tx + ttW > window.innerWidth) tx -= ttW; else tx += 16;
        tx = Math.max(8, tx);
        if (ty + 300 > window.innerHeight) ty -= 300; else ty += 12;
        t.style.left = tx + 'px';
        t.style.top = ty + 'px';
      });
      tr.addEventListener('mouseleave', function () { eblRowTip().style.opacity = '0'; });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    host.appendChild(wrap);

    if (pts.length > DEFAULT_SHOW) {
      var btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'text-align:center;padding:14px 0 4px;';
      var btn = document.createElement('button');
      btn.className = 'cs-exp-btn';
      btn.textContent = 'Show all ' + pts.length + ' scenes';
      var shown = false;
      btn.addEventListener('click', function () {
        shown = !shown;
        Array.prototype.forEach.call(tbl.querySelectorAll('.ebl-extra'), function (r) {
          r.style.display = shown ? '' : 'none';
        });
        btn.textContent = shown ? 'Show fewer' : 'Show all ' + pts.length + ' scenes';
        btn.classList.toggle('on', shown);
      });
      btnWrap.appendChild(btn);
      host.appendChild(btnWrap);
    }

    if (afterEl.nextSibling) afterEl.parentNode.insertBefore(card, afterEl.nextSibling);
    else afterEl.parentNode.appendChild(card);
  }


  /* ═══ How EBL decides ════════════════════════════════════ */
  function buildHow(el) {
    mkTitle(el, 'HOW EBL DECIDES',
      'Dimming multiplier vs. brightest element in the frame \u00b7 56 measured scenes');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '300' : '420') + 'px';
    row.appendChild(mainWrap);

    // Fitted response: multiplier as a function of peak (max R/G/B over a 0.003 % window)
    var LAW = [{x:0.0, y:5.057}, {x:0.025, y:5.056}, {x:0.05, y:5.056}, {x:0.075, y:5.055}, {x:0.1, y:5.053}, {x:0.125, y:5.048}, {x:0.15, y:5.04}, {x:0.175, y:5.028}, {x:0.2, y:5.01}, {x:0.225, y:4.984}, {x:0.25, y:4.951}, {x:0.275, y:4.908}, {x:0.3, y:4.854}, {x:0.325, y:4.788}, {x:0.35, y:4.71}, {x:0.375, y:4.618}, {x:0.4, y:4.514}, {x:0.425, y:4.396}, {x:0.45, y:4.265}, {x:0.475, y:4.123}, {x:0.5, y:3.971}, {x:0.525, y:3.81}, {x:0.55, y:3.642}, {x:0.575, y:3.47}, {x:0.6, y:3.295}, {x:0.625, y:3.118}, {x:0.65, y:2.943}, {x:0.675, y:2.771}, {x:0.7, y:2.602}, {x:0.725, y:2.439}, {x:0.75, y:2.282}, {x:0.775, y:2.132}, {x:0.8, y:1.989}, {x:0.825, y:1.855}, {x:0.85, y:1.728}, {x:0.875, y:1.608}, {x:0.9, y:1.497}, {x:0.925, y:1.393}, {x:0.95, y:1.296}, {x:0.975, y:1.206}, {x:1.0, y:1.123}];

    var ALL = KEEP.concat(CUT);
    var SCAT = ALL.map(function (p) { return { x: p.pk, y: p.m, adl: p.x, img: p.img, l: p.l }; });

    mkChart(mkCanvas(mainWrap), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Fitted response', data: LAW, showLine: true,
          borderColor: _useDark() ? '#555555' : '#aaaaaa', backgroundColor: 'transparent',
          pointRadius: 0, pointHoverRadius: 0, borderWidth: 1.5, borderDash: [5, 4],
          tension: 0.3, fill: false, order: 2 },
        { label: 'Measured scenes', data: SCAT, showLine: false,
          backgroundColor: '#66BB6Acc', pointBackgroundColor: '#66BB6A', pointBorderColor: '#66BB6A',
          pointRadius: 5, pointHoverRadius: 8, borderWidth: 0, order: 1 },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: {
            enabled: false, mode: 'nearest', intersect: true,
            external: function (context) {
              var ttEl = document.getElementById('ax-how-tt');
              if (!ttEl) {
                ttEl = document.createElement('div');
                ttEl.id = 'ax-how-tt';
                ttEl.style.cssText = ['position:fixed','pointer-events:none','z-index:9999',
                  'border-radius:8px','overflow:hidden','font-size:13px','line-height:1.4',
                  'max-width:320px','transition:opacity 0.1s','background:' + TC.ttBg,
                  'border:1px solid ' + TC.ttBord,'color:' + TC.text].join(';');
                document.body.appendChild(ttEl);
                window.addEventListener('scroll', function () { ttEl.style.opacity = '0'; }, { passive: true });
              }
              var tooltip = context.tooltip;
              if (tooltip.opacity === 0) { ttEl.style.opacity = '0'; return; }
              var items = tooltip.dataPoints;
              if (!items || !items.length) return;
              var raw = items[0].raw || {};
              if (raw.adl == null) { ttEl.style.opacity = '0'; return; }
              var html = raw.img ? '<img src="/img/ebl/' + raw.img + '" style="display:block;width:100%;height:auto">' : '';
              html += '<div style="padding:9px 11px">';
              html += '<div style="font-weight:600;color:' + TC.ttTitle + '">Peak ' + raw.x.toFixed(2) + ' \u00b7 multiplier ' + raw.y.toFixed(2) + '\u00d7</div>';
              html += '<div style="color:' + TC.text3 + '">ADL ' + raw.adl + '% \u00b7 light ' + raw.l + '%</div>';
              html += '</div>';
              ttEl.innerHTML = html;
              ttEl.style.opacity = '1';
              var rect = context.chart.canvas.getBoundingClientRect();
              var tx = rect.left + tooltip.caretX, ty = rect.top + tooltip.caretY;
              var ttW = Math.min(320, window.innerWidth - 16);
              ttEl.style.maxWidth = ttW + 'px';
              if (tx + ttW + 10 > window.innerWidth) tx -= ttW + 20; else tx += 12;
              tx = Math.max(8, tx);
              if (ty + 230 + 10 > window.innerHeight) ty -= 230 + 20; else ty += 12;
              ttEl.style.left = tx + 'px';
              ttEl.style.top = Math.max(8, ty) + 'px';
            },
          },
        },
        scales: {
          x: { type: 'linear', min: 0, max: 1, grid: GRID,
               title: { display: true, text: 'Peak element (0\u20131)', color: TC.text3, font: { size: 12 } },
               ticks: { color: TC.text3, stepSize: 0.1 } },
          y: { type: 'linear', min: 1, max: 5.5, grid: GRID,
               title: { display: true, text: 'Dimming multiplier', color: TC.text3, font: { size: 12 } },
               ticks: { color: TC.text3, stepSize: 0.5, callback: function (v) { return v + '\u00d7'; } } },
        },
      },
    });

    // Side: how the multiplier is distributed across the measured frames
    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'MULTIPLIER SPREAD', 'How often each level of dimming actually happens');

    var EDGES = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6];
    var LABELS = [], COUNTS = [];
    for (var b = 0; b < EDGES.length - 1; b++) {
      LABELS.push(String(EDGES[b]) + '\u00d7');
      COUNTS.push(0);
    }
    ALL.forEach(function (p) {
      for (var b = EDGES.length - 2; b >= 0; b--) {
        if (p.m >= EDGES[b]) { COUNTS[b]++; break; }
      }
    });

    mkChart(mkCanvas(sideWrap), {
      type: 'bar',
      data: { labels: LABELS, datasets: [{ label: 'Scenes', data: COUNTS,
        backgroundColor: COUNTS.map(function (_, i) { return i < 2 ? '#FF7043cc' : '#66BB6Acc'; }),
        borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return c.parsed.y + ' scenes'; } } },
        },
        scales: {
          x: { grid: { display: false },
               title: { display: true, text: 'Dimming multiplier (bin start)', color: TC.text3, font: { size: 11 } },
               ticks: { color: TC.text3, maxRotation: 0, autoSkip: false, font: { size: 10 } } },
          y: { grid: GRID, beginAtZero: true, ticks: { color: TC.text3, precision: 0 } },
        },
      },
    });

    var hint = document.createElement('p');
    hint.style.cssText = 'margin:8px 0 4px;font-size:12px;color:' + TC.text3 + ';text-align:center;';
    hint.textContent = '\ud83d\udca1 Peak is the brightest element in the frame, not the average \u2014 EBL reads highlights, not overall brightness';
    el.appendChild(hint);
  }


  /* ═══ Native contrast by iris & white balance ════════════ */
  function buildNative(el) {
    mkTitle(el, 'NATIVE CONTRAST BY IRIS & WHITE BALANCE',
      'Game (no dynamic dimming) · Laser 10 · On/Off ratio · measured at lens');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    // Source order: Off, M0..M7, Cinema 1, Cinema 2, M7 → Cinema 2
    var W1 = [3020,3000,3173,3487,3963,4235,4447,4861,5761,4180,4900,5430];
    var W2 = [2775,2756,3047,3375,3708,4075,4158,4625,5764,4049,4900,5430];
    var WG = [3239,3127,3355,3660,4095,4445,4735,5126,5850,4180,4970,5895];

    // Iris ladder, reversed so the curve falls like every other chart in the review
    var LABELS = ['M7','M6','M5','M4','M3','M2','M1','M0','Off'];
    var ORDER  = [8, 7, 6, 5, 4, 3, 2, 1, 0];
    function ladderOf(d) { return ORDER.map(function (i) { return d[i]; }); }
    function line(label, d, hex) {
      return { label: label, data: ladderOf(d),
        borderColor: hex, backgroundColor: hex + '22', pointBackgroundColor: hex,
        pointRadius: 4, pointHoverRadius: 7, borderWidth: 2.5, tension: 0.3, fill: false };
    }

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: { labels: LABELS, datasets: [
        line('Warm1 default', W1, '#4FC3F7'),
        line('Warm2 default', W2, '#FFA726'),
        line('Warm1 + gains', WG, '#66BB6A'),
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: legOpts(), tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }) },
        scales: {
          x: { grid: GRID, offset: false, ticks: { color: TC.text3, align: 'inner' },
               title: { display: true, color: TC.text3, text: 'Manual iris ladder · Cinema presets in the side chart and the table' } },
          y: { type: 'logarithmic', min: 2500, max: 6200, grid: GRID,
               ticks: crTicks([2500,3000,3500,4000,4500,5000,5500,6000]) },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'PEAK CONTRAST', 'Per iris mode · Warm1');
    mkChart(mkCanvas(sideWrap), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: ['M7','M7→C2','Cinema 2','DI High','Cinema 1','Off'],
        datasets: [{ data: [5761,5430,4900,4850,4180,3020],
          backgroundColor: ['#5C6BC0cc','#AB47BCcc','#EF5350cc','#66BB6Acc','#FFA726cc','#4FC3F7cc'], borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }),
          datalabels: dlBar(function (v) { return v.toLocaleString() + ':1'; }) },
        scales: { x: { grid: { display: false }, ticks: { color: TC.text3 } }, y: { display: false, min: 0, max: 6800 } },
      },
    });

    mkTableCard(el, 'NATIVE CONTRAST — FULL RANGE', 'On/Off ratio · x:1 · click a column to sort',
      ['WB','Off','M0','M1','M2','M3','M4','M5','M6','M7','C1','C2','M7→C2','DI High'],
      [
        [dot('#4FC3F7') + 'Warm1 default'].concat(W1.map(fmtCR)).concat(['4,850']),
        [dot('#FFA726') + 'Warm2 default'].concat([2775,2756,3047,3375,3708,4075,4158,4625,5764,4049,'4,900*','5,430*'].map(fmtCR)).concat(['4,780']),
        [dot('#66BB6A') + 'Warm1 + gains'].concat(WG.map(fmtCR)).concat(['5,050']),
      ], 'tbl-ax-native',
      '* Cinema 2 forces white balance back to Warm1 · Warm1 + gains: 2-pt B+14 / G−2 (highest contrast reachable) · '
      + 'Tolerance ±2 % below 5 000:1, ±5 % above (black floor resolves to 0.1 lx); Warm2 repeats to ±6 % between sessions · '
      + 'Contrast does not depend on laser level',
      { keys: ['Warm1', 'Warm2', 'Warm1 + gains'],
        colors: { 'Warm1': '#4FC3F7', 'Warm2': '#FFA726', 'Warm1 + gains': '#66BB6A' },
        cols: ['Off','M0','M1','M2','M3','M4','M5','M6','M7','C1','C2','M7→C2','DI High'],
        data: { 'Warm1': W1.concat([4850]), 'Warm2': W2.concat([4780]), 'Warm1 + gains': WG.concat([5050]) },
        refIdx: 9, refLabel: 'Cinema 1',
        format: function (v) { return v.toLocaleString() + ':1'; } });
  }
  function fmtCR(v) { return (v === null || v === undefined) ? null : (typeof v === 'number' ? v.toLocaleString() : v); }

  /* ═══ ADL contrast curve ═════════════════════════════════ */
  function buildADL(el) {
    mkTitle(el, 'ADL CONTRAST CURVE',
      'Game · Warm1 + gains · 0 % = On/Off · dots = measured');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    // one dataset per mode: the line runs through the measured points, so a separate
    // "raw" series would only duplicate every value in the tooltip
    var MEAS = [4, 4, 4, 4, 4, 4, 0];          // no dot on 50 % — that end is modelled
    var HOVER = [7, 7, 7, 7, 7, 7, 0];
    function fit(label, d, hex, modelled) {
      return { label: label, data: d, borderColor: hex, backgroundColor: hex,
        pointRadius: modelled ? 0 : MEAS, pointHoverRadius: modelled ? 0 : HOVER,
        borderWidth: 2.5, borderDash: modelled ? [6, 4] : undefined, tension: 0.3, fill: false };
    }

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: { labels: ['0 %','1 %','2 %','5 %','10 %','20 %','50 %'], datasets: [
        fit('Open (M0)', [3127,2851,2601,2077,1550,980,390], '#4FC3F7'),
        fit('Cinema 1', [4180,3532,3127,2365,1721,1062,395], '#FFA726'),
        fit('Cinema 2', [4970,4064,3793,2742,1865,1121,412], '#EF5350'),
        fit('M7 → Cinema 2', [5895,4409,3847,2740,2031,1082,408], '#AB47BC'),
        fit('Dynamic Iris High', [5050,3721,3100,2077,1550,980,405], '#66BB6A'),
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: legOpts(), tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }) },
        scales: {
          x: { grid: GRID, offset: false, ticks: { color: TC.text3, align: 'inner' },
               title: { display: true, color: TC.text3, text: 'ADL (average picture level) · 50 % = ANSI, model' } },
          y: { type: 'logarithmic', min: 300, max: 7000, grid: GRID,
               ticks: crTicks([300,400,500,600,800,1000,1500,2000,3000,4000,5000,6000]) },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'CONTRAST @ 5 % ADL', 'Typical dark movie scene');
    mkChart(mkCanvas(sideWrap), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: ['Cinema 2','M7→C2','Cinema 1','DI High','Open'],
        datasets: [{ data: [2742,2740,2365,2077,2077],
          backgroundColor: ['#EF5350cc','#AB47BCcc','#FFA726cc','#66BB6Acc','#4FC3F7cc'], borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }),
          datalabels: dlBar(function (v) { return v.toLocaleString() + ':1'; }) },
        scales: { x: { grid: { display: false }, ticks: { color: TC.text3 } }, y: { display: false, min: 0, max: 3300 } },
      },
    });

    mkTableCard(el, 'ADL CONTRAST — BY IRIS MODE', 'Contrast vs content brightness · x:1 · click a column to sort',
      ['Iris','0 %','1 %','2 %','5 %','10 %','20 %','50 %','Light'],
      [
        [dot('#4FC3F7') + 'Open (M0)', '3,127','2,851','2,601','2,077','1,550','980','390','100 %'],
        [dot('#FFA726') + 'Cinema 1', '4,180','3,532','3,127','2,365','1,721','1,062','395','86 %'],
        [dot('#EF5350') + 'Cinema 2', '4,970','4,064','3,793','2,742','1,865','1,121','412','69 %'],
        [dot('#AB47BC') + 'M7 → Cinema 2', '5,895','4,409','3,847','2,740','2,031','1,082','408','58 %'],
        [dot('#66BB6A') + 'Dynamic Iris High', '5,050','3,721','3,100','2,077','1,550','980','405','95 %'],
      ], 'tbl-ax-adl', '');
  }

  /* ═══ EBL: laser dimming vs gamma compensation ═══════════ */
  function buildEblGamma(el) {
    mkTitle(el, 'HOW MUCH OF THE DIMMING COMES BACK',
      'Laser cut against the gamma lift that answers it · 53 real film frames · the diagonal is full compensation');

    var wrap = document.createElement('div');
    wrap.style.height = (window.innerWidth <= 600 ? '340' : '460') + 'px';
    el.appendChild(wrap);

    var GAM_KEEP = [
      {x:5.48, y:3.07, l:100},
      {x:2.39, y:1.92, l:100},
      {x:1.16, y:1.13, l:100},
      {x:1.33, y:1.26, l:100},
      {x:1.15, y:1.12, l:100},
      {x:1.50, y:1.38, l:100},
      {x:2.61, y:2.04, l:100},
      {x:4.49, y:2.79, l:100},
      {x:4.49, y:2.79, l:100},
      {x:1.56, y:1.42, l:100},
      {x:3.43, y:2.41, l:100},
      {x:2.52, y:1.99, l:100},
      {x:1.15, y:1.12, l:100},
      {x:1.18, y:1.14, l:100},
      {x:1.13, y:1.10, l:100},
      {x:1.13, y:1.10, l:100},
      {x:3.33, y:2.47, l:104},
      {x:2.24, y:1.84, l:100},
      {x:3.53, y:2.57, l:105},
      {x:1.12, y:1.10, l:100},
      {x:1.09, y:1.07, l:100},
      {x:3.39, y:2.39, l:100},
      {x:2.19, y:1.81, l:100},
    ];
var GAM_CUT = [
      {x:1.83, y:1.11, l:70},
      {x:5.45, y:1.72, l:56},
      {x:2.47, y:1.28, l:65},
      {x:3.14, y:1.37, l:60},
      {x:3.14, y:1.14, l:50},
      {x:2.87, y:0.93, l:43},
      {x:2.81, y:1.22, l:57},
      {x:2.40, y:1.13, l:59},
      {x:1.27, y:1.18, l:97},
      {x:1.92, y:1.59, l:96},
      {x:1.96, y:1.58, l:94},
      {x:1.48, y:1.32, l:97},
      {x:1.39, y:1.12, l:86},
      {x:1.27, y:1.07, l:88},
      {x:1.40, y:1.08, l:82},
      {x:3.19, y:1.59, l:69},
      {x:1.47, y:1.28, l:94},
      {x:1.43, y:1.24, l:93},
      {x:1.36, y:1.19, l:93},
      {x:1.31, y:1.18, l:95},
      {x:1.16, y:1.08, l:96},
      {x:1.19, y:1.10, l:95},
      {x:1.23, y:1.16, l:98},
      {x:1.37, y:1.25, l:97},
      {x:1.11, y:1.00, l:92},
      {x:1.16, y:1.11, l:99},
      {x:1.16, y:1.11, l:98},
      {x:2.08, y:1.69, l:96},
      {x:1.16, y:1.08, l:95},
      {x:1.15, y:1.11, l:99},
    ];

    var diag = [{ x: 1, y: 1 }, { x: 5.6, y: 5.6 }];
    function tip(p) {
      return ' laser x' + p.x.toFixed(2) + ' · gamma x' + p.y.toFixed(2)
        + ' · net x' + (p.x / p.y).toFixed(2) + ' darker · highlights ' + p.l + ' %';
    }

    mkChart(mkCanvas(wrap), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Full compensation', data: diag, showLine: true, pointRadius: 0, pointHoverRadius: 0,
          borderColor: _useDark() ? '#888888' : '#999999', borderWidth: 1.5, borderDash: [6, 4],
          fill: false, order: 3 },
        { label: 'Highlights preserved', data: GAM_KEEP, showLine: false,
          backgroundColor: '#66BB6Acc', pointBackgroundColor: '#66BB6A', pointBorderColor: '#66BB6A',
          pointRadius: 6, pointHoverRadius: 9, order: 1 },
        { label: 'Highlights clipped', data: GAM_CUT, showLine: false,
          backgroundColor: 'transparent', pointBackgroundColor: 'transparent',
          pointBorderColor: '#FF7043', pointBorderWidth: 2,
          pointRadius: 6, pointHoverRadius: 9, order: 2 },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          datalabels: { display: false },
          tooltip: { mode: 'nearest', intersect: true,
            backgroundColor: TC.ttBg, titleColor: TC.ttTitle, bodyColor: TC.text,
            borderColor: TC.ttBord, borderWidth: 1, padding: 12,
            callbacks: { label: function (ctx) { return ctx.raw.l === undefined ? '' : tip(ctx.raw); } } },
        },
        scales: {
          x: { min: 1, max: 5.7, grid: GRID, ticks: { color: TC.text3, callback: function (v) { return 'x' + v; } },
               title: { display: true, text: 'Laser dimmed by', color: TC.text3 } },
          y: { min: 0.8, max: 3.4, grid: GRID, ticks: { color: TC.text3, callback: function (v) { return 'x' + v; } },
               title: { display: true, text: 'Gamma lifted by', color: TC.text3 } },
        },
      },
    });

    mkTableCard(el, 'WHAT IS LEFT ON SCREEN', 'Net darkening after the gamma lift · 53 frames',
      ['', 'Laser cut', 'Gamma lift', 'Net darkening', 'Highlights'],
      [['Deepest frame', 'x5.48', 'x3.07', 'x1.78', 'preserved'],
       ['Same cut, no lift', 'x5.45', 'x1.72', 'x3.16', 'cut to 56 %'],
       ['Median of all 53', 'x1.49', 'x1.24', 'x1.18', '—'],
       ['Frames above the diagonal', '—', '—', 'none', '—']], 'tbl-ax-ebl-gamma', '');
  }

  /* ═══ Anti-RBE: colour-sequence flashes per frame ═════════ */
  function buildRbeSeq(el) {
    mkTitle(el, 'COLOUR SEQUENCE — FLASHES PER FRAME',
      'How many times each colour is shown per cycle · more flashes = less rainbow');

    var MODES = ['Warm1 · 24/60 Hz', 'Warm1 · 3D', 'Warm2 · 60 Hz', 'Warm2 · 3D'];
    var COL = { R: '#EF5350', G: '#66BB6A', B: '#42A5F5', C: '#26C6DA', Y: '#FFCA28' };
    var NAME = { R: 'Red', G: 'Green', B: 'Blue', C: 'Cyan', Y: 'Yellow' };
    // flashes of each colour per cycle, counted from the colour sequences
    var CNT = { R: [8, 8, 4, 2], G: [8, 8, 4, 2], B: [8, 4, 4, 2], C: [0, 0, 4, 2], Y: [0, 0, 4, 2] };
    var SPEED = [8, 6, 5, 3];

    // Both charts share one geometry so the four rows sit exactly opposite each other:
    // same canvas height, a legend on top of each, an axis with a title underneath each,
    // same bar thickness. No title block above the side chart — that is what threw it off.
    var H = (window.innerWidth <= 600 ? 280 : 320) + 'px';
    var BAR = { barPercentage: 0.8, categoryPercentage: 0.8, borderRadius: 3 };
    function hTip(unit) {
      return { mode: 'index', axis: 'y', intersect: false,
        backgroundColor: TC.ttBg, titleColor: TC.ttTitle, bodyColor: TC.text,
        borderColor: TC.ttBord, borderWidth: 1, padding: 12,
        filter: function (c) { return c.parsed.x > 0; },
        callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + c.parsed.x + unit; } } };
    }
    function axisTitle(t) { return { display: true, text: t, color: TC.text3 }; }

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = H;
    row.appendChild(mainWrap);
    mkChart(mkCanvas(mainWrap), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: MODES, datasets: ['R', 'G', 'B', 'C', 'Y'].map(function (k) {
        return Object.assign({ label: NAME[k], data: CNT[k], backgroundColor: COL[k] + 'cc', stack: 's' }, BAR);
      }) },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: legOpts(), tooltip: hTip(' flashes'),
          datalabels: { color: '#fff', font: { size: 9, weight: '700' },
            display: function (c) { return c.dataset.data[c.dataIndex] >= 2; } } },
        scales: {
          x: { stacked: true, grid: GRID, ticks: { color: TC.text3 }, title: axisTitle('Colour flashes per frame') },
          y: { stacked: true, grid: { display: false }, ticks: { color: TC.text3 } },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    var sideBox = document.createElement('div');
    sideBox.style.cssText = 'position:relative;height:' + H;
    sideWrap.appendChild(sideBox);
    mkChart(mkCanvas(sideBox), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: ['Warm1', 'Warm1 3D', 'Warm2', 'Warm2 3D'],
        datasets: [Object.assign({ label: 'Estimated speed', data: SPEED,
          backgroundColor: ['#4FC3F7cc', '#4FC3F7cc', '#FFA726cc', '#FFA726cc'] }, BAR)] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: legOpts(), tooltip: hTip('×'),
          datalabels: Object.assign({}, dlBar(function (v) { return v + '×'; }, 10), { anchor: 'end', align: 'end' }) },
        scales: {
          x: { min: 0, max: 10, grid: GRID,
               ticks: { color: TC.text3, stepSize: 5, callback: function (v) { return v + '×'; } },
               title: axisTitle('Colour-wheel equivalent') },
          y: { grid: { display: false }, ticks: { color: TC.text3 } },
        },
      },
    });

  }

  /* ═══ XPR-Shift — the static schematic, animated ════════ */
  function buildXpr(el) {
    // always the palette of the original static schematic, whatever the page theme
    var XC = { text: '#e8e9ec', text3: '#9a9ba0' };
    el.style.background = '#18191d';
    mkTitle(el, 'XPR-SHIFT: HOW 4K IS BUILT FROM A 1080p DMD', 'SpykeVision · schematic, not to scale · time slowed down');
    el.querySelector('.cs-title strong').style.color = XC.text;
    el.querySelector('.cs-title span').style.color = XC.text3;

    var PH = ['#4FC3F7', '#FFA726', '#EF5350', '#AB47BC'];
    var OFF = [[0, 0], [1, 0], [1, 1], [0, 1]];
    var TL = 3.6;                                // one 16.7 ms frame is played over 3.6 s
    var FADE = 1.5;                              // how long a lit quarter lingers on the 4K grid, s

    var RATE = 8;                                // sub-frames per 4K/60 frame driving the top: 8 = Aetherion, 4 = others
    var bar = document.createElement('div');
    bar.style.cssText = 'text-align:center;margin:4px 0 6px';
    var tg = document.createElement('div');
    tg.className = 'cs-view-toggle';
    tg.innerHTML = '<button class="cs-tab cs-tab--active" data-r="8">Aetherion · ≈480 Hz</button>'
                 + '<button class="cs-tab" data-r="4">Others · 240 Hz</button>';
    bar.appendChild(tg); el.appendChild(bar);
    function tgStyle() {                         // the tab CSS is light-only; follow the chart theme
      var d = true;
      tg.style.background = d ? '#26262a' : '';
      [].forEach.call(tg.children, function (b) {
        var on = +b.getAttribute('data-r') === RATE;
        b.classList.toggle('cs-tab--active', on);
        b.style.background = d && on ? '#3a3a40' : '';
        b.style.color = d ? (on ? '#fff' : '#98989f') : '';
      });
    }
    tg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      RATE = +b.getAttribute('data-r'); tgStyle();
      if (!raf) draw(tAcc + 0.2);
    });
    tgStyle();

    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:0 20px';
    el.appendChild(wrap);
    var cv = document.createElement('canvas');
    cv.style.cssText = 'display:block;width:100%';
    wrap.appendChild(cv);
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, k = 1, narrow = false;

    function size() {
      W = wrap.clientWidth - 40; narrow = W < 640; k = W / 1000;
      H = Math.round(narrow ? 250 * k + 250 : 510 * k);
      var dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function rgba(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function text(s, x, y, o) {                  // x, y in px; font size in px (not scaled)
      ctx.font = (o.w || 500) + ' ' + (o.s || 12) + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillStyle = o.c || XC.text; ctx.textAlign = o.a || 'left'; ctx.textBaseline = o.b || 'alphabetic';
      ctx.fillText(s, x, y);
    }
    function rrect(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function arrow(x1, x2, y, col) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - 8, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 10, y - 6); ctx.lineTo(x2 - 10, y + 6); ctx.closePath(); ctx.fill();
    }

    function drawTop(t, dark) {
      var p = (t % TL) / TL, cur = Math.floor(p * RATE) % 4;       // phase follows the selected row
      var into = (p * RATE) % 1;
      var line = '#4a4c55', cell = '#1e1f24';
      var lab = { s: narrow ? 10 : 13, a: 'center', c: XC.text3 };
      var ly = narrow ? 14 : 34 * k + 8, gy = ly + (narrow ? 10 : 14);

      // DMD: 5×4 mirrors, fixed. The shift happens after it, in the XPR actuator
      var m = 36 * k, g = 4 * k, dx = 40 * k, dy = gy + 8 * k, mid = dy + 80 * k;
      text(narrow ? 'DMD 1080p' : 'DMD  1920 x 1080 mirrors', dx + 98 * k, ly, lab);
      for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) {
        var x = dx + c * (m + g), y = dy + 4 * k + r * (m + g);
        ctx.fillStyle = cell; ctx.fillRect(x, y, m, m);
        ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, 2 * k); ctx.strokeRect(x, y, m, m);
      }
      arrow(246 * k, 282 * k, mid, XC.text3);

      // XPR actuator: a glass plate that tilts on two axes; the beam lands in one of 4 spots
      var ax = 292 * k, as = 64 * k, ay = mid - as / 2;
      if (narrow) text('actuator', ax + as / 2, mid + as / 2 + 20 * k + 10, lab);
      else text('XPR actuator', ax + as / 2, ly, lab);
      var e = Math.min(1, into * 5), ease = 1 - Math.pow(1 - e, 3);
      var prev = OFF[(cur + 3) % 4], nxt = OFF[cur];
      var tx = prev[0] + (nxt[0] - prev[0]) * ease, ty = prev[1] + (nxt[1] - prev[1]) * ease;
      ctx.save();
      ctx.translate(ax + as / 2, mid);
      ctx.transform(1, (ty - 0.5) * 0.25, (tx - 0.5) * 0.25, 1, 0, 0);          // fake 2-axis tilt
      ctx.fillStyle = dark ? 'rgba(120,170,255,.10)' : 'rgba(10,132,255,.08)';
      rrect(-as / 2, -as / 2, as, as, 6 * k); ctx.fill();
      ctx.strokeStyle = XC.text3; ctx.lineWidth = Math.max(1, 1.5 * k); ctx.stroke();
      ctx.restore();
      var spx = ax + as / 2 + (tx - 0.5) * as * 0.45, spy = mid + (ty - 0.5) * as * 0.45;
      ctx.fillStyle = PH[cur]; ctx.shadowColor = PH[cur]; ctx.shadowBlur = 12 * k;
      ctx.beginPath(); ctx.arc(spx, spy, Math.max(3, 8 * k), 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
      arrow(366 * k, 420 * k, mid, XC.text3);

      // 4 phase positions, half a mirror apart
      var u = 46 * k, bx = 431 * k, by = dy + 4 * k;
      text(narrow ? '4 positions' : '4 phase positions, half a mirror apart', 500 * k, ly, lab);
      ctx.fillStyle = cell; ctx.fillRect(bx, by, 3 * u, 3 * u);
      for (var i = 0; i < 4; i++) {
        var j = (cur + 1 + i) % 4;                                   // draw the active one last, on top
        var sx = bx + OFF[j][0] * u, sy = by + OFF[j][1] * u, on = j === cur;
        if (on) { ctx.fillStyle = rgba(PH[j], dark ? 0.22 : 0.18); ctx.fillRect(sx, sy, 2 * u, 2 * u); }
        ctx.strokeStyle = rgba(PH[j], on ? 1 : 0.35); ctx.lineWidth = on ? Math.max(2, 4 * k) : Math.max(1, 2 * k);
        ctx.strokeRect(sx, sy, 2 * u, 2 * u);
        text(String(j + 1), sx + 2 * u - 6 * k, sy + 2 * u - 7 * k,
          { s: narrow ? 10 : Math.round(18 * k + 2), w: on ? 800 : 500, a: 'right', c: rgba(PH[j], on ? 1 : 0.55) });
      }
      if (!narrow) text('phase ' + (cur + 1) + ' / 4 · identical on both projectors', 500 * k, by + 3 * u + 26 * k,
        { s: 12, a: 'center', c: XC.text3 });
      arrow(590 * k, 640 * k, mid, XC.text3);

      // 3840×2160 grid: each phase lights its interleaved quarter; the eye holds it for a moment
      var f = 19.5 * k, rx = 722 * k, ry = dy;
      text(narrow ? '4K grid' : '3840 x 2160 addressed positions', rx + 97 * k, ly, lab);
      for (var yy = 0; yy < 8; yy++) for (var xx = 0; xx < 10; xx++) {
        var q = (yy % 2) ? ((xx % 2) ? 2 : 3) : ((xx % 2) ? 1 : 0);
        // time since this quarter was last shown on the selected row
        var steps = (cur - q + 4) % 4, since = (steps + into) * TL / RATE - (steps === 0 ? into * TL / RATE : 0);
        var a = steps === 0 ? 1 : Math.max(0, 1 - since / FADE);
        ctx.fillStyle = cell; ctx.fillRect(rx + xx * f, ry + yy * f, f - 2 * k, f - 2 * k);
        if (a > 0.01) { ctx.fillStyle = rgba(PH[q], 0.85 * a); ctx.fillRect(rx + xx * f, ry + yy * f, f - 2 * k, f - 2 * k); }
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(rx + xx * f + 0.5, ry + yy * f + 0.5, f - 2 * k - 1, f - 2 * k - 1);
      }
      return dy + (narrow ? 175 : 205) * k;
    }

    function drawTimeline(y0, p, dark) {
      var lab = narrow ? 0 : 205 * k, x0 = lab, bw = W - lab, bh = narrow ? 28 : 34 * k + 6;
      ctx.strokeStyle = '#3c3d41'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
      var y = y0 + (narrow ? 26 : 36);
      text(narrow ? 'TIME INSIDE ONE 4K/60 FRAME' : 'SAME POSITIONS, DIFFERENT RATE · TIME INSIDE ONE 4K/60 FRAME', W / 2, y,
        { s: narrow ? 11 : 14, w: 600, a: 'center', c: XC.text });
      y += narrow ? 14 : 22;
      [['Typical XPR  240 Hz', '4 phases per frame, 4.2 ms each', 4],
       ['Aetherion  about 480 Hz', 'same 4 phases twice, 2.1 ms each', 8]].forEach(function (r) {
        ctx.globalAlpha = r[2] === RATE ? 1 : 0.35;
        if (narrow) { text(r[0], 0, y + 12, { s: 12, w: 600 }); y += 18; }
        else { text(r[0], 0, y + bh / 2, { s: 15, w: 500 }); text(r[1], 0, y + bh / 2 + 17, { s: 11, c: XC.text3 }); }
        var n = r[2], sw = bw / n, cur = Math.floor(p * n), sel = n === RATE;
        ctx.globalAlpha = sel ? 1 : 0.35;
        for (var i = 0; i < n; i++) {
          var on = i === cur && sel;
          ctx.fillStyle = PH[i % 4]; ctx.fillRect(x0 + i * sw + 2, y, sw - 4, bh);
          ctx.strokeStyle = on ? '#fff' : '#3c3d41'; ctx.lineWidth = on ? 3 : 2; ctx.strokeRect(x0 + i * sw + 2, y, sw - 4, bh);
          text(String(i % 4 + 1), x0 + i * sw + sw / 2, y + bh / 2 + 1,
            { s: narrow ? 12 : 15, w: on ? 800 : 500, a: 'center', b: 'middle', c: '#18191d' });
        }
        ctx.globalAlpha = 1;
        y += bh + (narrow ? 10 : 18);
      });
      var ay = y + 4;
      ctx.strokeStyle = XC.text3; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x0 + bw, ay); ctx.stroke();
      ['0', '4.2', '8.3', '12.5', '16.7'].forEach(function (s, i) {
        var x = x0 + bw * i / 4;
        ctx.beginPath(); ctx.moveTo(x, ay - 5); ctx.lineTo(x, ay + 5); ctx.stroke();
        text(s, x, ay + 20, { s: 11, a: i === 0 ? 'left' : i === 4 ? 'right' : 'center', c: XC.text3 });
      });
      text('milliseconds', x0 + bw / 2, ay + 38, { s: 11, a: 'center', c: XC.text3 });
      var px = x0 + bw * p, top = y0 + (narrow ? 34 : 48);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px - 1.5, top, 3, ay - top + 6);
    }

    function draw(t) {
      var dark = true;
      ctx.clearRect(0, 0, W, H);
      var yb = drawTop(t, dark);
      drawTimeline(yb + (narrow ? 12 : 18 * k), (t % TL) / TL, dark);
    }

    size();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var visible = false, raf = 0, t0 = null, tAcc = 0;
    function frame(now) {
      if (t0 === null) t0 = now;
      draw(tAcc + (now - t0) / 1000);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !reduce) { t0 = null; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; if (t0 !== null) tAcc += (performance.now() - t0) / 1000; } }
    draw(0.2);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.15 }).observe(el);
    } else { visible = true; start(); }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : visible && start(); });
    window.addEventListener('resize', function () { size(); if (!raf) draw(tAcc + 0.2); });
    new MutationObserver(function () { tgStyle(); if (!raf) draw(tAcc + 0.2); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ═══ PixelLock — how it works, animated ════════════════ */
  function buildPixelLockHow(el) {
    mkTitle(el, 'PIXELLOCK: HOW DIGITAL CONVERGENCE WORKS',
      'Schematic, not to scale · one row of pixels, zoomed in');

    var STEPS = [['1 · Lens', 'Lens error'], ['2 · PixelLock', 'PixelLock'], ['3 · Resampling', 'Resampling'], ['4 · Whole frame', 'Whole frame'], ['5 · Measured', 'Measured']];
    var DUR = 7, step = 0, auto = true, stepT0 = 0;
    var bar = document.createElement('div');
    bar.style.cssText = 'text-align:center;margin:4px 0 8px;padding:0 12px';
    var tg = document.createElement('div');
    tg.className = 'cs-view-toggle';
    tg.style.flexWrap = 'wrap'; tg.style.justifyContent = 'center';
    tg.innerHTML = STEPS.map(function (s, i) { return '<button class="cs-tab" data-i="' + i + '">' + s[0] + '</button>'; }).join('');
    bar.appendChild(tg); el.appendChild(bar);
    function tgStyle() {
      var d = _useDark();
      tg.style.background = d ? '#26262a' : '';
      [].forEach.call(tg.children, function (b) {
        var on = +b.getAttribute('data-i') === step;
        b.classList.toggle('cs-tab--active', on);
        b.style.background = d && on ? '#3a3a40' : '';
        b.style.color = d ? (on ? '#fff' : '#98989f') : '';
      });
    }
    tg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      step = +b.getAttribute('data-i'); auto = false; stepT0 = clock; tgStyle();
      if (!raf) draw();
    });
    tgStyle();

    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:0 20px';
    el.appendChild(wrap);
    var cv = document.createElement('canvas');
    cv.style.cssText = 'display:block;width:100%';
    wrap.appendChild(cv);
    // step 5: the measured band profiles (Chart.js), shown instead of the canvas
    var meas = document.createElement('div');
    meas.style.display = 'none';
    el.appendChild(meas);
    plPanel(meas, '', 'Down the screen, top to bottom — about seventeen horizontal bands, every second one deeper',
      PL_YX, PL_YY, '#0a84ff', '210px');
    plPanel(meas, '', 'Across the screen, left to right — six vertical bands in three pairs',
      PL_XX, PL_XY, '#ff375f', '210px');
    var measCharts = ALL_CHARTS.slice(-2);
    var capEl = document.createElement('div');
    capEl.style.cssText = 'text-align:center;font-size:13px;line-height:1.45;max-width:760px;margin:10px auto 0;padding:0 20px;min-height:3em';
    el.appendChild(capEl);
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, narrow = false;
    function size() {
      W = cv.getBoundingClientRect().width || (wrap.clientWidth - 40); narrow = W < 640;
      H = narrow ? 250 : 270;
      var dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function text(s, x, y, o) {
      ctx.font = (o.w || 500) + ' ' + (o.s || 12) + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillStyle = o.c || TC.text; ctx.textAlign = o.a || 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(s, x, y);
    }
    var sm = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    var CH = { R: 'rgb(255,45,45)', G: 'rgb(45,255,45)', B: 'rgb(60,60,255)' };

    // a dark "screen" row of n pixels; returns geometry
    function row(x0, y0, n, cs, label) {
      ctx.fillStyle = '#0b0b0e'; ctx.fillRect(x0, y0, n * cs, cs);
      ctx.strokeStyle = '#2a2a31'; ctx.lineWidth = 1;
      for (var i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * cs + 0.5, y0); ctx.lineTo(x0 + i * cs + 0.5, y0 + cs); ctx.stroke(); }
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, n * cs - 1, cs - 1);
      if (label) text(label, x0, y0 - 8, { s: 12, w: 600, c: TC.text3 });
      return { x0: x0, y0: y0, cs: cs, n: n };
    }
    function light(g, pos, col, a, w) {           // light at a fractional pixel position (after optics)
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = col; ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.fillRect(g.x0 + pos * g.cs + 2, g.y0 + 2, (w || 1) * g.cs - 4, g.cs - 4);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function lightW(g, pos, a) { ['R', 'G', 'B'].forEach(function (c) { light(g, pos, CH[c], a); }); }
    function down(x, y1, y2, label) {
      ctx.strokeStyle = TC.text3; ctx.fillStyle = TC.text3; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2 - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 5, y2 - 8); ctx.lineTo(x + 5, y2 - 8); ctx.closePath(); ctx.fill();
      if (label) text(label, x + 12, (y1 + y2) / 2 + 4, { s: 12, c: TC.text3 });
    }

    function stepLens(t, cap) {
      var n = narrow ? 9 : 13, cs = Math.min(44, (W - 20) / n), x0 = (W - n * cs) / 2, c = (n - 1) / 2;
      var e = 0.55 * sm((t - 0.6) / 1.8);
      var a = row(x0, 30, n, cs, narrow ? 'DMD: a 1 px white line' : 'DMD: a 1 px white line, all three colours on one mirror');
      lightW(a, c, 1);
      down(W / 2, 30 + cs + 10, 30 + cs + 70, 'lens + mirror');
      var b = row(x0, 30 + cs + 100, n, cs, 'Screen');
      light(b, c + e, CH.R, 1); light(b, c, CH.G, 1); light(b, c - e, CH.B, 1);
      cap('The lens magnifies red, green and blue slightly differently, so red and blue land off green: a colour fringe along every sharp edge. On a UST it is present across the whole frame and grows toward the corners.');
    }
    function stepLock(t, cap) {
      var n = narrow ? 9 : 13, cs = Math.min(44, (W - 20) / n), x0 = (W - n * cs) / 2, c = (n - 1) / 2;
      var E = 0.55, pre = E * sm((t - 0.6) / 2);
      var a = row(x0, 30, n, cs, narrow ? 'DMD: R and B pre-shifted' : 'DMD: red and blue pre-shifted the opposite way');
      light(a, c - pre, CH.R, 1); light(a, c, CH.G, 1); light(a, c + pre, CH.B, 1);
      down(W / 2, 30 + cs + 10, 30 + cs + 70, 'lens + mirror');
      var b = row(x0, 30 + cs + 100, n, cs, 'Screen');
      light(b, c + E - pre, CH.R, 1); light(b, c, CH.G, 1); light(b, c - E + pre, CH.B, 1);
      cap('The projector knows its own lens. It shifts red and blue against the error in advance, each by its own field, and all three land on one pixel. Our unit: about ⅓ px residual at the centre, excellent for a UST.');
    }
    function stepResample(t, cap) {
      var n = narrow ? 10 : 16, cs = Math.min(40, (W - 20) / n), x0 = (W - n * cs) / 2, c = Math.floor(n / 2) - 1;
      var ph = 0.5 * sm(((t % DUR) < DUR / 2 ? (t % DUR) - 0.8 : DUR - 0.8 - (t % DUR)) / 1.8);
      var y = 30;
      var a = row(x0, y, n, cs, (narrow ? 'Wanted: shift ' : 'Wanted: a 1 px line shifted by ') + ph.toFixed(2) + ' px');
      lightW(a, c + ph, 1);
      y += cs + 34;
      var b = row(x0, y, n, cs, narrow ? 'DMD: whole mirrors only' : 'DMD can only light whole mirrors → spread over two');
      lightW(b, c, 1 - ph); lightW(b, c + 1, ph);
      y += cs + 34;
      var g = row(x0, y, n, cs, narrow ? '1 px grating, same shift' : '1 px grating on the DMD, same shift');
      for (var j = 0; j < n; j++) {
        var inj = j % 2 === 0 ? 1 : 0, inp = (j - 1) % 2 === 0 ? 1 : 0;
        var v = (1 - ph) * inj + ph * inp; if (v > 0.01) lightW(g, j, v);
      }
      var st = ph < 0.08 ? 'phase ≈ 0: native 1:1, sharp' : ph > 0.42 ? (narrow ? '½ px: line doubles, grating goes grey' : 'phase ≈ ½ px: the line doubles, the grating turns into flat grey') : 'phase grows: detail smears';
      text(st, W / 2, y + cs + 26, { s: 13, w: 600, a: 'center', c: ph > 0.42 ? '#FFA726' : TC.text });
      cap('A shift by a fraction of a pixel needs resampling: the image is recomputed onto the mirror grid. Where the phase is near zero, a 1 px line stays on one mirror; near ½ px it is split across two at half brightness each.');
    }
    function stepFrame(t, cap) {
      var n = narrow ? 48 : 96, cs = (W - 20) / n, x0 = 10, y0 = 84;
      function phase(j) { var u = (j + 0.5) / n * 2 - 1; var d = 2.4 * u * u + 0.15 * u; return d - Math.floor(d); }
      // compensation phase curve
      ctx.strokeStyle = '#FFA726'; ctx.lineWidth = 2; ctx.beginPath();
      for (var j = 0; j < n; j++) {
        var q = phase(j), blur = 1 - Math.abs(q - 0.5) * 2, py = y0 - 14 - blur * 40;
        j ? ctx.lineTo(x0 + (j + 0.5) * cs, py) : ctx.moveTo(x0 + (j + 0.5) * cs, py);
      }
      ctx.stroke();
      text(narrow ? 'closeness of phase to ½ px' : 'how close the compensation phase is to ½ px', x0, 16, { s: 12, w: 600, c: '#FFA726' });
      // grating content scrolls one pixel per second; the bands do not move with it
      var sh = Math.floor(t) % 2;
      ctx.fillStyle = '#0b0b0e'; ctx.fillRect(x0, y0, n * cs, 60);
      for (var k = 0; k < n; k++) {
        var p = phase(k), ph = Math.min(p, 1 - p);                    // distance to the nearest whole pixel, 0..0.5
        var inj = (k + sh) % 2 === 0 ? 1 : 0, inp = (k - 1 + sh) % 2 === 0 ? 1 : 0;
        var v = (1 - ph) * inj + ph * inp;
        ctx.fillStyle = 'rgba(255,255,255,' + v.toFixed(3) + ')';
        ctx.fillRect(x0 + k * cs, y0, Math.max(1, cs - (cs > 6 ? 1 : 0)), 60);
      }
      text('1 px grating across the width of the screen', x0, y0 + 80, { s: 12, w: 600, c: TC.text3 });
      // magnifier sweeping across
      var mx = x0 + (0.5 + 0.45 * Math.sin(t * 0.7)) * n * cs, mn = 8, mcs = narrow ? 22 : 28;
      var m0 = Math.max(0, Math.min(n - mn, Math.round((mx - x0) / cs - mn / 2)));
      ctx.strokeStyle = TC.text; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + m0 * cs, y0 - 2, mn * cs, 64);
      var gx = W / 2 - mn * mcs / 2, gy = y0 + 110;
      var g = row(gx, gy, mn, mcs, '');
      var worst = 0;
      for (var i = 0; i < mn; i++) {
        var kk = m0 + i, pp = phase(kk), ph2 = Math.min(pp, 1 - pp); worst = Math.max(worst, ph2);
        var a1 = (kk + sh) % 2 === 0 ? 1 : 0, a0 = (kk - 1 + sh) % 2 === 0 ? 1 : 0;
        var vv = (1 - ph2) * a1 + ph2 * a0; if (vv > 0.01) lightW(g, i, vv);
      }
      text(worst > 0.35 ? 'inside a band: lines merge into a fill' : worst < 0.15 ? 'between bands: lines stay separate' : 'band edge: lines soften',
        W / 2, gy + mcs + 22, { s: 13, w: 600, a: 'center', c: worst > 0.35 ? '#FFA726' : TC.text });
      cap('The shift changes smoothly across the frame, so its phase keeps passing through ½ px. Those spots become bands where 1 px detail merges. The image moves, the bands stay put: they are tied to the screen.');
    }

    var clock = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var lt = clock - stepT0;
      if (auto && step < 4 && lt > DUR) { step++; stepT0 = clock; lt = 0; tgStyle(); if (step === 4) auto = false; }
      var isMeas = step === 4;
      if ((meas.style.display === 'none') === isMeas) {
        meas.style.display = isMeas ? '' : 'none'; wrap.style.display = isMeas ? 'none' : '';
        if (isMeas) measCharts.forEach(function (c) { c.resize(); });
      }
      var capText = isMeas ? 'Measured 1 px line-pair contrast across the screen, 100 % = normal. The dips are the bands; their pitch is the same at 1080p and 4K.' : '';
      if (!isMeas) [stepLens, stepLock, stepResample, stepFrame][step](lt, function (s) { capText = s; });
      capEl.style.color = TC.text3;
      if (capEl.textContent !== capText) capEl.textContent = capText;
    }

    size();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var visible = false, raf = 0, last = null;
    if (reduce) { auto = false; clock = 5; }
    function frame(now) {
      if (last !== null) clock += Math.min(0.1, (now - last) / 1000);
      last = now; draw(); raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !reduce) { last = null; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    draw();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.15 }).observe(el);
    } else { visible = true; start(); }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : visible && start(); });
    window.addEventListener('resize', function () { size(); if (!raf) draw(); });
    new MutationObserver(function () { tgStyle(); if (!raf) draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function _mkTabs(el, labels, onPick) {
    var bar = document.createElement('div');
    bar.style.cssText = 'text-align:center;margin:4px 0 8px;padding:0 12px';
    var tg = document.createElement('div');
    tg.className = 'cs-view-toggle'; tg.style.flexWrap = 'wrap'; tg.style.justifyContent = 'center';
    tg.innerHTML = labels.map(function (s, i) { return '<button class="cs-tab" data-i="' + i + '">' + s + '</button>'; }).join('');
    bar.appendChild(tg); el.appendChild(bar);
    var cur = 0;
    function style() {
      var d = _useDark();
      tg.style.background = d ? '#26262a' : '';
      [].forEach.call(tg.children, function (b) {
        var on = +b.getAttribute('data-i') === cur;
        b.classList.toggle('cs-tab--active', on);
        b.style.background = d && on ? '#3a3a40' : '';
        b.style.color = d ? (on ? '#fff' : '#98989f') : '';
      });
    }
    tg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cur = +b.getAttribute('data-i'); style(); onPick(cur);
    });
    style();
    new MutationObserver(style).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  function _canvasHost(el) {
    var wrap = document.createElement('div'); wrap.style.cssText = 'padding:0 20px';
    el.appendChild(wrap);
    var cv = document.createElement('canvas'); cv.style.cssText = 'display:block;width:100%;touch-action:none';
    wrap.appendChild(cv);
    return { wrap: wrap, cv: cv, ctx: cv.getContext('2d') };
  }
  function _fit(h, H) {
    var W = h.cv.getBoundingClientRect().width || (h.wrap.clientWidth - 40), dpr = window.devicePixelRatio || 1;
    h.cv.width = Math.round(W * dpr); h.cv.height = Math.round(H * dpr); h.cv.style.height = H + 'px';
    h.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return W;
  }
  function _txt(ctx, s, x, y, o) {
    ctx.font = (o.w || 500) + ' ' + (o.s || 12) + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillStyle = o.c || TC.text; ctx.textAlign = o.a || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
  }

  /* ═══ Input lag — rolling scan-out, animated ═══════════ */
  function buildLagScan(el) {
    mkTitle(el, 'INPUT LAG: THE FRAME IS DRAWN TOP TO BOTTOM',
      'Schematic · time slowed down · the same slow-down for every refresh rate');
    // hz, frame period (ms), absolute top-of-screen lag if we have it (ms)
    var MODES = [[240, 4.2, 1], [120, 8.3, null], [60, 16.7, null]];
    var mode = 0, SLOW = 290;                     // 1 ms of real time → 290 ms on screen
    var t = 0, fStart = 0, fNo = 1;
    _mkTabs(el, ['1080p · 240 Hz', '120 Hz', '60 Hz'], function (i) { mode = i; fStart = t; if (!raf) draw(); });
    var h = _canvasHost(el), ctx = h.ctx, W, H;
    function size() {
      var w = h.wrap.clientWidth - 40, rw = w < 560 ? 92 : 150, sw = Math.min(w - rw - 10, 370 * 16 / 9);
      H = Math.round(sw * 9 / 16) + 40; W = _fit(h, H);
    }
    var COL = [['#0a84ff', 'rgba(10,132,255,.22)'], ['#FFA726', 'rgba(255,167,38,.22)']];

    function draw() {
      var dark = _useDark(), m = MODES[mode], per = m[1] * SLOW / 1000;
      if (t - fStart >= per) { fStart += per * Math.floor((t - fStart) / per); fNo++; }
      var p = (t - fStart) / per;
      ctx.clearRect(0, 0, W, H);
      var rw = W < 560 ? 92 : 150, sw = Math.min(W - rw - 10, (H - 40) * 16 / 9), shh = sw * 9 / 16;
      var sx = (W - rw - sw) / 2, sy = 8, yl = sy + p * shh;
      var cur = COL[fNo % 2], prev = COL[(fNo + 1) % 2];
      // old frame below the scan line, new frame above it
      [[prev, yl, sy + shh, fNo - 1], [cur, sy, yl, fNo]].forEach(function (f) {
        var y0 = f[1], y1 = f[2]; if (y1 <= y0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(sx, y0, sw, y1 - y0); ctx.clip();
        ctx.fillStyle = '#0b0b0e'; ctx.fillRect(sx, sy, sw, shh);
        ctx.fillStyle = f[0][1]; ctx.fillRect(sx, sy, sw, shh);
        _txt(ctx, 'frame ' + ((f[3] + 9) % 10 + 1), sx + sw / 2, sy + shh / 2 + 14, { s: Math.round(Math.max(20, sw / 12)), w: 800, a: 'center', c: f[0][0] });
        ctx.restore();
      });
      ctx.strokeStyle = dark ? '#3a3a40' : '#c7c7cc'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, shh - 1);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
      ctx.fillRect(sx, yl - 1.5, sw, 3); ctx.shadowBlur = 0;

      // ruler: lag by screen position
      var rx = sx + sw + 18;
      ctx.strokeStyle = TC.text3; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx, sy); ctx.lineTo(rx, sy + shh); ctx.stroke();
      var abs = m[2] !== null;
      [[0, 'top'], [0.5, 'middle'], [1, 'bottom']].forEach(function (r) {
        var y = sy + r[0] * shh, v = abs ? m[2] + r[0] * m[1] : r[0] * m[1];
        ctx.beginPath(); ctx.moveTo(rx - 5, y); ctx.lineTo(rx + 5, y); ctx.stroke();
        var lbl = abs ? '≈' + Math.round(v) + ' ms' : '+' + v.toFixed(1) + ' ms';
        _txt(ctx, lbl, rx + 10, y + (r[0] === 0 ? 10 : r[0] === 1 ? -2 : 4), { s: 12, w: 700, c: TC.text });
        if (rw > 100) _txt(ctx, r[1], rx + 10, y + (r[0] === 0 ? 24 : r[0] === 1 ? -16 : 18), { s: 11, c: TC.text3 });
      });
      // live marker for the line being drawn right now
      var now = abs ? m[2] + p * m[1] : p * m[1];
      ctx.fillStyle = '#FFA726';
      ctx.beginPath(); ctx.moveTo(rx - 2, yl); ctx.lineTo(rx - 12, yl - 6); ctx.lineTo(rx - 12, yl + 6); ctx.closePath(); ctx.fill();
      _txt(ctx, (abs ? 'this line: ' + now.toFixed(1) + ' ms' : 'this line: top + ' + now.toFixed(1) + ' ms'),
        sx + sw / 2, sy + shh + 22, { s: 13, w: 700, a: 'center', c: '#FFA726' });
    }
    var cap = document.createElement('div');
    cap.style.cssText = 'text-align:center;font-size:13px;line-height:1.45;max-width:720px;margin:10px auto 0;padding:0 20px';
    el.appendChild(cap);
    function setCap() {
      cap.style.color = TC.text3;
      cap.textContent = 'The DLPC8445 writes the frame line by line, so the bottom line lags the top by one frame period: 4.2 ms at 240 Hz, 8.3 ms at 120 Hz, 16.7 ms at 60 Hz. The 1 ms on the box is the top edge; at 240 Hz the whole screen spans roughly 1 to 5 ms. At 120 and 60 Hz we show the lag relative to the top line.';
    }
    setCap();
    size();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = 0, last = null;
    if (reduce) t = 0.55;
    function frame(now) {
      if (last !== null) t += Math.min(0.1, (now - last) / 1000);
      last = now; draw(); raf = requestAnimationFrame(frame);
    }
    draw();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !reduce) { if (!raf) { last = null; raf = requestAnimationFrame(frame); } }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.15 }).observe(el);
    window.addEventListener('resize', function () { size(); draw(); });
    new MutationObserver(function () { setCap(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ═══ Throw distance — side view, animated over 80–200″ (AWOL's official table) ═══ */
  function buildThrow(el) {
    var XC = { bg: '#18191d', text: '#e8e9ec', text3: '#9a9ba0', rule: '#3c3d41', accent: '#4fc3f7' };
    el.style.background = XC.bg;
    el.style.scrollMarginTop = '72px';            // shared as …/aetherion-max/#ax-throw — clear the sticky header
    mkTitle(el, 'THROW DISTANCE, 80″ TO 200″', 'AWOL’s official placement calculator · cm and inches');
    el.querySelector('.cs-title strong').style.color = XC.text;
    el.querySelector('.cs-title span').style.color = XC.text3;
    // AWOL's placement calculator (awolvision.com/pages/projector-calculator-aetherion), cm: size, A (front of chassis → wall),
    // B (rear → wall), C (image bottom above top of chassis), D (above its base) — linear in size, inches are cm / 2.54
    var T = [[80, 39.83, 7.57, 17.90, 31.87], [100, 48.02, 15.76, 23.75, 37.72], [120, 56.21, 23.95, 29.60, 43.57],
             [150, 68.49, 36.24, 38.38, 52.35], [200, 88.97, 56.71, 53.02, 66.99]];
    var PH = 13.97;                               // chassis height, cm (5.5″)
    function at(d) {
      for (var i = 1; i < T.length; i++) if (d <= T[i][0]) {
        var f = (d - T[i - 1][0]) / (T[i][0] - T[i - 1][0]);
        return T[i].map(function (v, k) { return T[i - 1][k] + (v - T[i - 1][k]) * f; });
      }
      return T[T.length - 1];
    }
    var h = _canvasHost(el), ctx = h.ctx, W, H, narrow;
    var ctl = document.createElement('div');
    ctl.style.cssText = 'max-width:560px;margin:8px auto 0;padding:0 20px;display:flex;align-items:center;gap:12px;font-size:13px;color:' + XC.text3;
    var sm = el.clientWidth < 600, lw = 'width:' + (sm ? 40 : 92) + 'px;white-space:nowrap';
    ctl.innerHTML = '<span style="' + lw + '">' + (sm ? 'Size' : 'Image size') + '</span><span>80″</span><input type="range" min="80" max="200" step="1" value="120" style="flex:1"><span>200″</span>';
    el.appendChild(ctl);
    var ctl2 = ctl.cloneNode(false);
    ctl2.innerHTML = '<span style="' + lw + '">' + (sm ? 'Shelf' : 'Shelf height') + '</span><input type="range" min="0" max="100" step="1" value="45" style="flex:1"><span style="min-width:92px;text-align:right;color:' + XC.text + '"></span>';
    el.appendChild(ctl2);
    var inp = ctl.querySelector('input'), manualUntil = -1, t = 0, size = 120;
    inp.addEventListener('input', function () { size = +inp.value; manualUntil = t + 6; if (!raf) draw(); });
    var inp2 = ctl2.querySelector('input'), shelfOut = ctl2.querySelector('span:last-child'), shelf = 45;
    function shelfLabel() { shelfOut.textContent = shelf ? shelf + ' cm · ' + (shelf / 2.54).toFixed(1) + '″' : 'on the floor'; }
    shelfLabel();
    inp2.addEventListener('input', function () { shelf = +inp2.value; shelfLabel(); if (!raf) draw(); });

    function fit() { var w = h.wrap.clientWidth - 40; narrow = w < 700; H = narrow ? 560 : 380; W = _fit(h, H); }
    function dim(x1, y1, x2, y2, label, side) {   // dimension line with end dots and a round tag
      ctx.strokeStyle = XC.text3; ctx.fillStyle = XC.text3; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      [[x1, y1], [x2, y2]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, 6.283); ctx.fill(); });
      var mx = (x1 + x2) / 2 + side[0], my = (y1 + y2) / 2 + side[1];
      ctx.fillStyle = XC.bg; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 6.283); ctx.fill();
      ctx.strokeStyle = XC.text; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 6.283); ctx.stroke();
      _txt(ctx, label, mx, my + 4, { s: 11, w: 700, a: 'center', c: XC.text });
    }
    function panel(x, y, w, hh) { ctx.fillStyle = '#1e1f24'; ctx.fillRect(x, y, w, hh); }
    function tag(x, y, label) { _txt(ctx, label, x, y, { s: 11, w: 600, a: 'right', c: XC.text3 }); }
    var STAND = 45;                               // side view only: the zoom doesn't depend on the shelf
    function side(x0, y0, w, hh, v, ih) {         // zoomed side view of the projector zone
      var A = v[1], B = v[2], D = v[4];
      panel(x0, y0, w, hh);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, hh); ctx.clip();
      var k = Math.min((hh - 30) / 140, (w - 52) / 89), wx = x0 + 18, fy = y0 + hh - 8;
      var X = function (cm) { return wx + cm * k; }, Y = function (cm) { return fy - cm * k; };
      ctx.fillStyle = '#2a2b31'; ctx.fillRect(x0, y0, wx - x0, hh);
      ctx.fillStyle = '#26272c'; ctx.fillRect(wx, Y(STAND), 100 * k, STAND * k);
      var ib = STAND + D, it = ib + ih, lx = X(A - 6), ly = Y(STAND + PH);
      var g = ctx.createLinearGradient(lx, ly, wx, Y(ib + 60));
      g.addColorStop(0, 'rgba(79,195,247,.55)'); g.addColorStop(1, 'rgba(79,195,247,.06)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(wx, Y(it)); ctx.lineTo(wx, Y(ib)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = XC.accent; ctx.shadowColor = XC.accent; ctx.shadowBlur = 12;
      ctx.fillRect(wx - 3, Y(it), 3, (it - ib) * k); ctx.shadowBlur = 0;
      ctx.fillStyle = '#5b6068'; ctx.fillRect(X(B), Y(STAND + PH), (A - B) * k, PH * k);
      ctx.fillStyle = XC.accent; ctx.fillRect(X(B) + 3, Y(STAND + PH / 2) - 1, (A - B) * k - 6, 2);
      var by = Y(STAND) + 14;
      dim(wx, by + 18, X(A), by + 18, 'A', [0, 0]);
      dim(wx, by, X(B), by, 'B', [0, 0]);
      dim(X(B) - 12, Y(STAND + PH), X(B) - 12, Y(ib), 'C', [-12, 0]);
      dim(X(A) + 12, Y(STAND), X(A) + 12, Y(ib), 'D', [13, 0]);
      ctx.restore(); tag(x0 + w - 10, y0 + 18, 'SIDE VIEW');
    }
    function front(x0, y0, w, hh, v, iw, ih) {    // front view: the picture grows on the wall, a person for scale
      var D = v[4];
      panel(x0, y0, w, hh);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, hh); ctx.clip();
      var k = Math.min((hh - 34) / (100 + 67 + 250 + 8), (w - 20) / 480), cx = x0 + w / 2, fy = y0 + hh - 8;
      var X = function (cm) { return cx + cm * k; }, Y = function (cm) { return fy - cm * k; };
      ctx.fillStyle = '#26272c'; ctx.fillRect(X(-80), Y(shelf), 160 * k, shelf * k);
      ctx.fillStyle = '#5b6068'; ctx.fillRect(X(-28), Y(shelf + PH), 56 * k, PH * k);
      var ib = shelf + D;
      ctx.fillStyle = 'rgba(79,195,247,.16)'; ctx.fillRect(X(-iw / 2), Y(ib + ih), iw * k, ih * k);
      ctx.strokeStyle = XC.accent; ctx.lineWidth = 2; ctx.shadowColor = XC.accent; ctx.shadowBlur = 10;
      ctx.strokeRect(X(-iw / 2), Y(ib + ih), iw * k, ih * k); ctx.shadowBlur = 0;
      // 175 cm person
      var px = Math.max(x0 + 26, X(-iw / 2 - 45)), s = k;
      ctx.fillStyle = '#4a4c55';
      ctx.beginPath(); ctx.arc(px, Y(163), 11 * s, 0, 6.283); ctx.fill();
      rrect(px - 17 * s, Y(150), 34 * s, 62 * s, 8 * s); ctx.fill();
      ctx.fillRect(px - 13 * s, Y(88), 11 * s, 88 * s); ctx.fillRect(px + 2 * s, Y(88), 11 * s, 88 * s);
      _txt(ctx, '175 cm', px, Y(180), { s: 10, a: 'center', c: XC.text3 });
      ctx.strokeStyle = XC.rule; ctx.beginPath(); ctx.moveTo(x0, fy + 0.5); ctx.lineTo(x0 + w, fy + 0.5); ctx.stroke();
      var ex = Math.min(X(iw / 2) + 16, x0 + w - 16);  // E: floor → top of the image, right of the picture
      dim(ex, fy, ex, Y(ib + ih), 'E', [0, 0]);
      ctx.restore(); tag(x0 + w - 10, y0 + 18, 'FRONT VIEW');
    }
    function rrect(x, y, w, hh, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
      ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function numbers(px, py, v, iw, ih, compact) {
      var inch = function (cm) { return (cm / 2.54).toFixed(1) + '″'; };
      _txt(ctx, Math.round(size) + '″', px, py + 38, { s: 44, w: 800, c: XC.text });
      var cmS = Math.round(iw) + ' × ' + Math.round(ih) + ' cm', inS = Math.round(iw / 2.54) + ' × ' + Math.round(ih / 2.54) + '″';
      if (compact) {
        _txt(ctx, cmS, px, py + 60, { s: 12, c: XC.text3 });
        _txt(ctx, inS, px, py + 76, { s: 12, c: XC.text3 });
      } else _txt(ctx, cmS + ' · ' + inS + ' image', px, py + 62, { s: 13, c: XC.text3 });
      [['A', v[1], 'front of chassis → wall'], ['B', v[2], 'rear of chassis → wall'],
       ['C', v[3], 'image bottom above chassis'], ['D', v[4], 'image bottom above its base'],
       ['E', shelf + v[4] + ih, 'floor → top of the image']].forEach(function (r, i) {
        var yy = py + (compact ? 100 : 90) + i * (compact ? 33 : 40);
        _txt(ctx, r[0], px, yy, { s: 13, w: 700, c: XC.accent });
        _txt(ctx, r[1].toFixed(1) + ' cm', px + 20, yy, { s: compact ? 15 : 16, w: 700, c: XC.text });
        if (compact) _txt(ctx, inch(r[1]), px + 20, yy + 15, { s: 12, c: XC.text3 });
        else {
          _txt(ctx, inch(r[1]), px + 104, yy, { s: 14, w: 600, c: XC.text3 });
          _txt(ctx, r[2], px + 20, yy + 17, { s: 11, c: XC.text3 });
        }
      });
    }
    function draw() {
      if (t >= manualUntil) { size = 140 - 60 * Math.cos(t * 2 * Math.PI / 12); inp.value = Math.round(size); }
      var v = at(size), ih = size * 2.54 * 9 / Math.sqrt(337), iw = size * 2.54 * 16 / Math.sqrt(337);
      ctx.clearRect(0, 0, W, H);
      if (narrow) {
        front(0, 0, W, 260, v, iw, ih);
        var sw = Math.min(W * 0.52, 240);
        side(0, 272, sw, H - 272, v, ih);
        numbers(sw + 16, 262, v, iw, ih, true);
      } else {
        var nw = 210, sw2 = Math.min(300, (W - nw) * 0.4), fw = W - nw - sw2 - 24;
        side(0, 0, sw2, H, v, ih);
        front(sw2 + 12, 0, fw, H, v, iw, ih);
        numbers(sw2 + fw + 36, 6, v, iw, ih, false);
      }
    }
    fit();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = 0, last = null;
    if (reduce) manualUntil = Infinity;
    function frame(now) {
      if (last !== null) t += Math.min(0.1, (now - last) / 1000);
      last = now; draw(); raf = requestAnimationFrame(frame);
    }
    draw();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !reduce) { if (!raf) { last = null; raf = requestAnimationFrame(frame); } }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.15 }).observe(el);
    window.addEventListener('resize', function () { fit(); draw(); });
  }

  /* ═══ Dynamic contrast — EBL & forced dimming ════════════ */
  function buildDyn(el) {
    // Charts removed by request — the table carries every number on its own.
    el.classList.remove('chart-section');   // host only; the card is inserted after it

    mkTableCard(el, 'EBL & FORCED DIMMING — ALL MODES', 'Full-field On/Off · x:1 · click a column to sort',
      ['Iris','Native','Forced dimming (EBL Off)','EBL On','EBL / native','FD Warm2','EBL Warm2'],
      [
        [dot('#4FC3F7') + 'Iris Off', '3,127','15,807','24,800','7.9×','10,000','22,500'],
        [dot('#FFA726') + 'Cinema 1', '4,180','19,500','26,700','6.4×','11,857','25,625'],
        [dot('#EF5350') + 'Cinema 2', '4,970','22,321','34,722','7.0×', null, null],
        [dot('#AB47BC') + 'M7 → Cinema 2', '5,895','23,695','42,083','7.1×', null, null],
      ], 'tbl-ax-dyn', '');
  }


  /* ═══ Shared brightness / contrast operating points ══════ */
  // Source order: Off, M0..M7, Cinema 1, Cinema 2, M7 → Cinema 2
  var MODES  = ['Off','M0','M1','M2','M3','M4','M5','M6','M7','Cinema 1','Cinema 2','M7 → Cinema 2'];
  var BR_W1  = [2720,2770,2680,2550,2460,2330,2120,1970,1530,2370,1910,1600];
  var BR_W2  = [3210,3190,3040,2940,2830,2640,2460,2290,1400,2750,1910,1600];
  var CR_W1  = [3020,3000,3173,3487,3963,4235,4447,4861,5761,4180,4900,5430];
  var CR_W2  = [2775,2756,3047,3375,3708,4075,4158,4625,5764,4049,4900,5430];

  /* ═══ Brightness by iris & white balance ═════════════════ */
  function buildBrightness(el) {
    mkTitle(el, 'BRIGHTNESS BY IRIS & WHITE BALANCE',
      'Filmmaker · Laser 10 · 135″ 16:9 · lumens (lm) · ±5 %');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    // Iris ladder in physical order — Off, then Manual 0 … 7
    var LABELS = ['Off','M0','M1','M2','M3','M4','M5','M6','M7'];
    function ladderOf(d) { return d.slice(0, 9); }
    function line(label, d, hex) {
      return { label: label, data: ladderOf(d),
        borderColor: hex, backgroundColor: hex + '22', pointBackgroundColor: hex,
        pointRadius: 4, pointHoverRadius: 7, borderWidth: 2.5, tension: 0.3, fill: false };
    }

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: { labels: LABELS, datasets: [
        line('Warm1', BR_W1, '#4FC3F7'),
        line('Warm2', BR_W2, '#FFA726'),
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: legOpts(), tooltip: ttOpts(function (v) { return v.toLocaleString() + ' lm'; }) },
        scales: {
          x: { grid: GRID, offset: false, ticks: { color: TC.text3, align: 'inner' },
               title: { display: true, color: TC.text3, text: 'Manual iris ladder · Cinema presets in the side chart and the table' } },
          y: { min: 1200, max: 3400, grid: GRID,
               ticks: { color: TC.text3, callback: function (v) { return v.toLocaleString(); } } },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'PEAK & PRESETS', 'Iris Off by mode · presets and Dynamic Iris High on Warm1');
    mkChart(mkCanvas(sideWrap), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: ['BE High','Warm2','Warm1','DI High','C1','C2','M7→C2'],
        datasets: [{ label: 'Lumens', data: [3920, 3210, 2720, 2630, 2370, 1910, 1600],
        backgroundColor: ['#EF5350cc','#FFA726cc','#4FC3F7cc','#66BB6Acc','#FFA726cc','#EF5350cc','#AB47BCcc'], borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: ttOpts(function (v) { return v.toLocaleString() + ' lm'; }),
          datalabels: Object.assign({}, dlBar(function (v) { return v.toLocaleString(); }, 9),
            { anchor: 'end', align: 'start', offset: 4, color: '#fff' }) },
        scales: { x: { grid: { display: false }, ticks: { color: TC.text3 } }, y: { display: false, min: 0, max: 4400 } },
      },
    });

    mkTableCard(el, 'BRIGHTNESS — FULL RANGE', 'Lumens (lm) · click a column to sort',
      ['WB','Off','M0','M1','M2','M3','M4','M5','M6','M7','C1','C2','M7→C2','DI High'],
      [
        [dot('#4FC3F7') + 'Warm1'].concat(BR_W1.map(function (v) { return v.toLocaleString(); })).concat(['2,630']),
        [dot('#FFA726') + 'Warm2'].concat(BR_W2.map(function (v, i) {
          return v.toLocaleString() + (i >= 10 ? '*' : ''); })).concat(['2,950']),
        [dot('#EF5350') + 'BE High', '3,920', null, null, null, null, null, null, null, null, null, null, null, null],
      ], 'tbl-ax-bright',
      '* Cinema 2 forces the white balance to Warm1 · “M7 → Cinema 2” is the same preset selected right after Manual 7: '
      + 'the iris does not reopen, −15…20 % · BE works only with the iris Off and locks the colour-temperature selector '
      + '(it uses its own white balance)',
      { keys: ['Warm1', 'Warm2'], colors: { Warm1: '#4FC3F7', Warm2: '#FFA726' },
        cols: ['Off','M0','M1','M2','M3','M4','M5','M6','M7','C1','C2','M7→C2','DI High'],
        data: { Warm1: BR_W1.concat([2630]), Warm2: BR_W2.concat([2950]) },
        refIdx: 9, refLabel: 'Cinema 1',
        format: function (v) { return v.toLocaleString() + ' lm'; } });
  }

  /* ═══ Brightness vs contrast — all operating points ══════ */
  function buildCombined(el) {
    mkTitle(el, 'BRIGHTNESS vs CONTRAST — ALL 26 OPERATING POINTS',
      'Filmmaker · Laser 10 · each dot = one iris position × white balance · Dynamic Iris High included');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    function setOf(br, cr) {
      return br.map(function (v, i) { return { x: v, y: cr[i], mode: MODES[i] }; });
    }
    var S1 = setOf(BR_W1, CR_W1), S2 = setOf(BR_W2, CR_W2);

    // Pareto frontier: nothing is both brighter and higher-contrast — iris ladder only
    var all = S1.concat(S2).slice().sort(function (a, b) { return b.x - a.x; });
    var front = [], maxY = -Infinity;
    all.forEach(function (p) { if (p.y > maxY) { front.push({ x: p.x, y: p.y }); maxY = p.y; } });
    front.sort(function (a, b) { return a.x - b.x; });

    // Dynamic Iris sits on the chart but stays out of the frontier — it is not one fixed aperture
    S1.push({ x: 2630, y: 4850, mode: 'Dynamic Iris High' });
    S2.push({ x: 2950, y: 4780, mode: 'Dynamic Iris High' });

    mkChart(mkCanvas(mainWrap), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Pareto frontier', data: front, backgroundColor: 'transparent',
          borderColor: _useDark() ? '#aaaaaa' : '#555555', borderWidth: 2, borderDash: [6, 4],
          pointRadius: 0, pointHoverRadius: 0, showLine: true, tension: 0, fill: false, order: -1 },
        { label: 'Warm1', data: S1, backgroundColor: '#4FC3F7cc', borderColor: '#4FC3F7',
          pointRadius: 6, pointHoverRadius: 9, showLine: false, fill: false },
        { label: 'Warm2', data: S2, backgroundColor: '#FFA726cc', borderColor: '#FFA726',
          pointRadius: 6, pointHoverRadius: 9, showLine: false, fill: false },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: {
            mode: 'nearest', intersect: true,
            backgroundColor: TC.ttBg, titleColor: TC.ttTitle, bodyColor: TC.text,
            borderColor: TC.ttBord, borderWidth: 1, padding: 12,
            callbacks: { label: function (ctx) {
              var r = ctx.raw || {};
              return ' ' + ctx.dataset.label + (r.mode ? ' · ' + r.mode : '') + ': '
                + ctx.parsed.x.toLocaleString() + ' lm · ' + ctx.parsed.y.toLocaleString() + ':1';
            } },
          },
        },
        scales: {
          x: { grid: GRID, title: { display: true, text: 'Brightness (lm)', color: TC.text3 },
               ticks: { color: TC.text3, callback: function (v) { return v.toLocaleString(); } } },
          y: { grid: GRID, title: { display: true, text: 'Native contrast', color: TC.text3 },
               ticks: { color: TC.text3, callback: function (v) { return v.toLocaleString(); } } },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'IRIS GAIN', 'Contrast ÷ contrast with the iris open · Warm1');

    var gainOrder = [8, 11, 10, 7, 9, 6, 5, 4, 3, 2, 1];  // M7 … M0, by contrast
    mkChart(mkCanvas(sideWrap), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: gainOrder.map(function (i) { return MODES[i].replace('Cinema ', 'C').replace('M7 → C2', 'M7→C2'); }),
        datasets: [{ label: 'Gain', data: gainOrder.map(function (i) { return Math.round(CR_W1[i] / CR_W1[0] * 100) / 100; }),
          backgroundColor: '#AB47BCcc', borderRadius: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: ttOpts(function (v) { return v + '×'; }),
          datalabels: dlBar(function (v) { return v.toFixed(2) + '×'; }, 8) },
        scales: { x: { grid: { display: false }, ticks: { color: TC.text3, font: { size: 9 } } },
                  y: { display: false, min: 0, max: 2.3 } },
      },
    });

    function cell(lm, cr) {
      return lm.toLocaleString() + '<br><span style="color:#888;font-size:11px">'
        + (cr ? cr.toLocaleString() : '&nbsp;') + '</span>';
    }
    mkTableCard(el, 'BRIGHTNESS & CONTRAST — EVERY OPERATING POINT', 'Lumens (lm) over native contrast (x:1) · click a column to sort',
      ['WB','Off','M0','M1','M2','M3','M4','M5','M6','M7','C1','C2','M7→C2','DI High'],
      [
        [dot('#4FC3F7') + 'Warm1'].concat(BR_W1.map(function (v, i) { return cell(v, CR_W1[i]); }))
          .concat([cell(2630, 4850)]),
        [dot('#FFA726') + 'Warm2'].concat(BR_W2.map(function (v, i) { return cell(v, CR_W2[i]); }))
          .concat([cell(2950, 4780)]),
      ], 'tbl-ax-combined',
      '',
      { keys: ['Warm1', 'Warm2'], colors: { Warm1: '#4FC3F7', Warm2: '#FFA726' },
        cols: ['Off','M0','M1','M2','M3','M4','M5','M6','M7','C1','C2','M7→C2','DI High'],
        data: { Warm1: CR_W1.concat([4850]), Warm2: CR_W2.concat([4780]) },
        refIdx: 9, refLabel: 'Cinema 1',
        format: function (v) { return v.toLocaleString() + ':1'; } });
  }

  /* ═══ Combined quality metric ════════════════════════════ */
  function buildQuality(el) {
    mkTitle(el, 'COMBINED QUALITY METRIC',
      'Brightness × contrast, normalised · 100 % = best operating point (Cinema 1 · Warm2) · Filmmaker · Laser 10');

    var Q1 = BR_W1.map(function (v, i) { return v * CR_W1[i]; });
    var Q2 = BR_W2.map(function (v, i) { return v * CR_W2[i]; });
    var top = Math.max(Math.max.apply(null, Q1), Math.max.apply(null, Q2));
    function pct(a) { return a.map(function (v) { return Math.round(v / top * 100); }); }
    var P1 = pct(Q1), P2 = pct(Q2);

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    function line(label, d, hex) {
      return { label: label, data: d.slice(0, 9),
        borderColor: hex, backgroundColor: hex + '22', pointBackgroundColor: hex,
        pointRadius: 4, pointHoverRadius: 7, borderWidth: 2.5, tension: 0.3, fill: false };
    }

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: { labels: ['Off','M0','M1','M2','M3','M4','M5','M6','M7'],
        datasets: [line('Warm1', P1, '#4FC3F7'), line('Warm2', P2, '#FFA726')] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: legOpts(), tooltip: ttOpts(function (v) { return v + ' %'; }) },
        scales: {
          x: { grid: GRID, offset: false, ticks: { color: TC.text3, align: 'inner' },
               title: { display: true, color: TC.text3, text: 'Manual iris ladder · Cinema presets in the side chart and the table' } },
          y: { grid: GRID, min: 0, max: 105, ticks: { color: TC.text3, callback: function (v) { return v + '%'; } } },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'CINEMA PRESETS', 'Quality score · Warm1 unless noted');
    mkChart(mkCanvas(sideWrap), {
      type: 'bar', plugins: DL_PLUGIN,
      data: { labels: ['C1 · Warm2','C1 · Warm1','C2','M7→C2'],
        datasets: [{ label: 'Score', data: [P2[9], P1[9], P1[10], P1[11]],
          backgroundColor: ['#FFA726cc','#4FC3F7cc','#EF5350cc','#AB47BCcc'], borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: ttOpts(function (v) { return v + ' %'; }),
          datalabels: Object.assign({}, dlBar(function (v) { return v + '%'; }, 11), { anchor: 'end', align: 'start', offset: 4, color: '#fff' }) },
        scales: { x: { grid: { display: false }, ticks: { color: TC.text3, font: { size: 10 } } },
                  y: { display: false, min: 0, max: 115 } },
      },
    });

    // Best operating point per white balance
    function best(Q, P) {
      var bi = 0;
      Q.forEach(function (v, i) { if (v > Q[bi]) bi = i; });
      var thr = Q[bi] * 0.9;
      var range = MODES.filter(function (m, i) { return Q[i] >= thr; })
        .map(function (m) { return m.replace('Cinema ', 'C').replace('M7 → C2', 'M7→C2'); });
      return { i: bi, range: range.join(', ') };
    }
    var b1 = best(Q1, P1), b2 = best(Q2, P2);
    mkTableCard(el, 'BEST OPERATING POINT', 'Where each white balance peaks · click a column to sort',
      ['WB','Best point','Brightness','Contrast','Score','Within 10 % of own peak'],
      [
        [dot('#4FC3F7') + 'Warm1', MODES[b1.i], BR_W1[b1.i].toLocaleString() + ' lm',
         CR_W1[b1.i].toLocaleString() + ':1', P1[b1.i] + ' %', b1.range],
        [dot('#FFA726') + 'Warm2', MODES[b2.i], BR_W2[b2.i].toLocaleString() + ' lm',
         CR_W2[b2.i].toLocaleString() + ':1', P2[b2.i] + ' %', b2.range],
      ], 'tbl-ax-quality',
      'The metric treats one lumen and one point of contrast as equally valuable, so it only shows where the projector stops '
      + 'trading one for the other efficiently — not which look you want. Manual 7 buys contrast at a worse rate than it costs '
      + 'light, which is why it sits at the bottom of the ladder despite having the highest contrast of all.');
  }

  /* ── Registry ─────────────────────────────────────────── */

  /* ── Acoustic spectrum (UMIK-1 on chassis, 1/24 oct) ──── */
  var NF = [100.0, 103.0, 106.1, 109.3, 112.6, 116.0, 119.4, 123.0, 126.7, 130.5, 134.4, 138.5, 142.6, 146.9, 151.3, 155.9, 160.6, 165.4, 170.4, 175.5, 180.8, 186.2, 191.8, 197.5, 203.5, 209.6, 215.9, 222.4, 229.1, 235.9, 243.0, 250.3, 257.8, 265.6, 273.6, 281.8, 290.3, 299.0, 308.0, 317.2, 326.7, 336.6, 346.7, 357.1, 367.8, 378.9, 390.2, 402.0, 414.0, 426.5, 439.3, 452.5, 466.1, 480.1, 494.5, 509.4, 524.7, 540.4, 556.7, 573.4, 590.6, 608.3, 626.6, 645.4, 664.8, 684.8, 705.4, 726.6, 748.4, 770.9, 794.0, 817.9, 842.5, 867.8, 893.8, 920.7, 948.4, 976.9, 1006.2, 1036.4, 1067.6, 1099.6, 1132.7, 1166.7, 1201.7, 1237.8, 1275.0, 1313.3, 1352.8, 1393.4, 1435.3, 1478.4, 1522.8, 1568.6, 1615.7, 1664.2, 1714.2, 1765.7, 1818.8, 1873.4, 1929.7, 1987.7, 2047.4, 2108.9, 2172.3, 2237.5, 2304.7, 2374.0, 2445.3, 2518.8, 2594.4, 2672.4, 2752.6, 2835.3, 2920.5, 3008.3, 3098.6, 3191.7, 3287.6, 3386.4, 3488.1, 3592.9, 3700.8, 3812.0, 3926.5, 4044.5, 4166.0, 4291.2, 4420.1, 4552.9, 4689.6, 4830.5, 4975.6, 5125.1, 5279.1, 5437.7, 5601.0, 5769.3, 5942.6, 6121.2, 6305.0, 6494.5, 6689.6, 6890.5, 7097.5, 7310.8, 7530.4, 7756.6, 7989.6, 8229.7, 8476.9, 8731.6, 8993.9, 9264.1, 9542.4, 9829.1, 10124.3, 10428.5, 10741.8, 11064.5, 11396.9, 11739.3, 12092.0, 12455.2, 12829.4, 13214.8, 13611.8, 14020.7, 14442.0, 14875.8, 15322.7, 15783.0, 16257.2, 16745.6, 17248.7, 17766.8, 18300.6, 18850.4, 19416.7, 20000.0];
  var N_FLOOR = [16.97, 15.96, 18.55, 15.11, 14.58, 12.85, 12.42, 12.98, 12.6, 11.38, 14.47, 14.21, 11.31, 15.27, 13.24, 9.15, 8.74, 7.61, 7.44, 7.09, 9.12, 7.68, 6.2, 6.77, 6.44, 6.12, 5.39, 5.2, 5.57, 5.0, 4.39, 5.1, 5.3, 4.3, 3.7, 4.98, 7.4, 4.82, 3.74, 4.53, 3.86, 3.83, 4.64, 3.0, 2.67, 2.52, 2.41, 1.92, 4.24, 2.31, 1.6, 2.22, 1.53, 1.54, 2.19, 1.21, 0.68, 0.78, 0.62, 0.07, 0.14, -0.51, -0.06, 0.07, -0.08, -0.64, -0.9, -0.78, -1.03, -1.64, -1.51, -1.63, -1.84, -1.83, -1.99, -1.94, -2.21, -2.15, -2.3, -2.25, -2.36, -2.67, -2.55, -2.83, -2.92, -3.2, -3.35, -2.95, -3.11, -3.17, -3.36, -3.62, -3.39, -3.77, -3.68, -3.78, -3.96, -3.74, -3.94, -3.77, -4.09, -3.97, -4.41, -4.35, -4.4, -4.49, -4.46, -4.54, -4.69, -4.66, -4.67, -4.82, -4.97, -4.94, -4.93, -4.88, -4.88, -4.77, -4.63, -4.73, -4.85, -4.82, -4.68, -4.65, -4.45, -4.37, -4.3, -4.16, -4.35, -4.2, -3.89, -3.57, -3.47, -2.85, 9.27, -2.81, -2.88, -2.93, -2.88, -2.86, -2.74, -2.68, -2.56, -2.75, -2.62, -2.84, -3.12, -3.19, -3.58, -3.73, -4.36, -4.51, -4.9, -5.51, -6.32, -6.78, -7.08, -7.3, -7.95, -8.38, -8.9, -9.1, -9.32, -9.44, -9.62, -9.52, -9.51, -9.35, -9.36, -9.17, -9.1, -6.31, -8.88, -8.88, -8.83, -8.73, -8.74, -8.74, -8.63, -8.7];
  var N_WARM2 = [21.41, 16.81, 20.69, 21.48, 20.71, 20.01, 20.83, 13.93, 12.56, 13.59, 15.12, 15.77, 15.19, 16.71, 19.52, 16.81, 14.65, 15.24, 15.46, 16.35, 18.72, 18.34, 13.14, 14.11, 17.51, 25.85, 23.45, 16.76, 23.92, 29.04, 28.96, 26.55, 27.17, 25.58, 26.73, 25.23, 20.32, 20.61, 15.2, 17.51, 15.86, 17.44, 21.36, 20.02, 17.32, 13.76, 13.48, 9.06, 24.82, 23.0, 13.11, 12.38, 14.36, 20.77, 17.58, 19.32, 19.06, 17.8, 16.3, 15.94, 17.55, 17.48, 17.79, 17.78, 16.62, 14.74, 13.59, 11.74, 11.73, 11.29, 11.26, 8.37, 11.23, 9.39, 7.25, 6.71, 8.42, 6.17, 5.59, 6.27, 5.91, 6.31, 4.69, 4.98, 9.27, 5.27, 5.14, 6.65, 4.39, 0.44, 2.67, 1.42, 2.09, 5.32, 5.08, 5.99, 2.74, 1.73, 2.63, -0.16, 1.09, -0.59, 0.46, -2.02, 0.54, -1.42, -1.04, -2.36, -2.3, -2.54, -2.49, 0.76, -2.02, -1.45, -0.85, -1.0, -2.91, -3.68, -3.77, -3.41, -3.6, -2.98, -3.7, -3.75, -3.73, -3.59, -3.81, -3.64, -3.47, -3.4, -3.44, -3.27, -3.19, -2.89, 9.22, -3.17, -3.46, -3.41, -3.51, -3.54, -3.44, -3.55, -3.46, -3.69, -3.7, -3.77, -3.82, -3.9, -4.21, -4.38, -4.59, -4.74, -5.07, -5.34, -5.7, -6.02, -6.3, -6.5, -6.95, -7.28, -7.9, -8.06, -8.23, -8.46, -8.72, -8.89, -9.0, -9.03, -9.03, -9.09, -8.92, -6.15, -8.74, -8.82, -8.75, -8.75, -8.71, -8.76, -8.67, -8.71];
  var N_WARM1 = [24.06, 17.53, 20.72, 21.8, 21.13, 20.11, 20.79, 13.98, 12.44, 13.4, 15.31, 16.62, 15.66, 17.99, 18.86, 17.15, 13.7, 15.34, 16.29, 16.55, 18.79, 17.58, 13.0, 13.87, 16.98, 26.65, 22.94, 18.49, 24.36, 28.25, 28.64, 26.61, 26.64, 25.58, 25.9, 25.05, 21.15, 20.63, 15.43, 17.25, 16.23, 17.48, 21.49, 19.35, 17.7, 13.55, 13.62, 9.85, 24.76, 22.39, 12.71, 13.28, 13.99, 20.88, 16.88, 19.19, 18.8, 17.43, 16.67, 16.01, 17.7, 17.42, 17.88, 17.91, 16.77, 14.83, 13.43, 11.58, 12.02, 11.13, 11.43, 8.39, 10.96, 9.68, 7.31, 6.85, 8.34, 6.27, 5.42, 6.22, 5.69, 6.56, 4.72, 6.03, 6.73, 5.22, 5.09, 6.84, 4.1, 0.38, 3.31, 1.05, 2.66, 4.92, 5.29, 5.56, 2.61, 1.59, 2.6, -0.25, 3.66, -0.61, 0.3, -1.86, -0.1, -1.44, -1.03, -1.77, -2.08, -2.35, -2.18, -0.98, -2.0, -1.14, 3.95, -0.87, -2.92, -3.56, -3.56, -1.54, -3.36, -3.06, -3.59, -3.8, -3.56, -3.64, -3.7, -3.46, -3.44, -3.24, -3.48, -3.33, -3.3, -2.93, 9.22, -3.22, -3.43, -3.6, -3.53, -3.56, -3.63, -3.63, -3.79, -3.78, -3.86, -4.01, -3.99, -4.15, -4.38, -4.52, -4.71, -5.05, -5.18, -5.36, -5.68, -5.92, -6.22, -6.34, -6.75, -7.06, -7.48, -7.89, -8.03, -8.24, -8.53, -8.72, -8.7, -8.81, -8.99, -8.88, -8.87, -6.12, -8.73, -8.72, -8.77, -8.72, -8.73, -8.78, -8.73, -8.7];
  var N_XPRON = [17.11, 16.37, 17.56, 14.81, 14.48, 15.11, 18.05, 11.97, 11.16, 11.12, 14.19, 15.53, 13.06, 16.25, 15.12, 13.5, 15.82, 12.43, 10.62, 12.06, 15.21, 14.53, 8.76, 9.66, 11.7, 11.11, 10.14, 12.57, 17.75, 21.57, 20.71, 19.81, 20.2, 18.82, 19.96, 18.97, 13.15, 14.92, 11.21, 15.67, 9.69, 11.1, 14.9, 14.31, 12.26, 7.99, 6.09, 4.68, 18.6, 11.66, 8.06, 9.36, 12.0, 14.46, 9.2, 11.12, 9.7, 9.26, 7.22, 6.2, 7.62, 9.29, 10.19, 10.22, 8.71, 6.83, 6.39, 4.89, 3.11, 2.87, 3.18, 1.53, 4.27, 2.64, 1.53, 0.73, 1.57, 5.01, -0.19, -0.51, -0.44, 0.05, -0.26, 2.23, 4.05, 0.06, -0.76, 1.44, -1.29, -2.03, -1.48, -1.78, -1.36, -0.92, -0.27, 0.94, -1.48, -2.2, -2.2, -2.95, -2.04, -3.19, -2.09, -3.41, -1.17, -3.08, -0.38, -3.71, -3.13, -3.65, -3.46, 0.46, -3.55, -2.6, -3.51, -3.84, -3.49, -4.19, -4.08, -3.72, -4.01, -2.64, -4.24, -4.19, -4.17, -3.88, -3.98, -4.18, -3.78, -3.7, -3.91, -3.59, -3.61, -3.22, 9.17, -3.13, -3.65, -3.6, -3.6, -3.51, -3.6, -3.56, -3.59, -3.62, -3.53, -3.64, -3.7, -3.87, -4.04, -4.18, -4.33, -4.65, -5.08, -5.33, -5.55, -6.06, -6.54, -6.73, -7.03, -7.76, -7.93, -8.32, -8.53, -8.86, -8.99, -8.99, -9.04, -9.04, -9.03, -8.93, -8.92, -6.04, -8.56, -8.63, -8.56, -8.54, -8.65, -8.66, -8.61, -8.71];
  var N_XPROFF = [20.27, 18.49, 19.12, 18.12, 17.01, 18.24, 19.21, 14.15, 13.18, 13.7, 14.82, 15.03, 13.76, 16.02, 15.58, 13.4, 11.22, 12.79, 14.58, 18.44, 20.11, 14.02, 13.98, 15.89, 15.6, 12.19, 9.99, 13.86, 21.89, 25.83, 25.24, 25.51, 25.34, 21.72, 22.06, 19.18, 16.33, 20.73, 15.1, 14.97, 12.56, 14.43, 20.63, 18.57, 11.58, 10.36, 9.24, 8.0, 14.99, 12.06, 7.63, 9.81, 14.52, 16.44, 14.25, 17.16, 14.72, 11.63, 10.02, 9.16, 12.14, 13.29, 14.16, 14.11, 12.51, 11.52, 11.14, 6.91, 5.85, 6.5, 6.44, 4.85, 6.96, 5.44, 4.18, 3.81, 3.1, 6.08, 2.37, 2.19, 1.42, 2.36, 1.17, 2.82, 6.5, 1.6, 1.27, 3.25, 0.23, -1.36, 0.05, -0.85, -0.15, 0.88, 2.35, 2.43, 0.18, -0.66, -0.61, -2.33, -0.75, -2.58, -1.46, -3.03, -0.6, -2.82, -0.81, -3.16, -3.12, -3.21, -3.45, 0.45, -2.06, -3.25, -3.49, -3.27, -3.07, -3.91, -3.81, -3.54, -3.55, -2.88, -3.73, -3.94, -3.88, -3.91, -3.75, -3.72, -3.54, -3.4, -3.7, -3.43, -3.45, -2.96, 9.19, -2.97, -3.4, -3.52, -3.63, -3.49, -3.57, -3.72, -3.53, -3.78, -3.75, -3.84, -3.89, -4.01, -4.3, -4.48, -4.55, -5.01, -5.14, -5.4, -5.67, -5.94, -6.37, -6.53, -6.93, -7.15, -7.65, -8.09, -8.35, -8.37, -8.82, -8.88, -8.98, -9.06, -9.05, -9.08, -8.98, -6.22, -8.72, -8.79, -8.73, -8.78, -8.75, -8.69, -8.64, -8.67];
  var ZF = [380.0, 380.5, 381.0, 381.5, 382.0, 382.5, 383.0, 383.5, 384.0, 384.5, 385.0, 385.5, 386.0, 386.5, 387.0, 387.5, 388.1, 388.6, 389.1, 389.6, 390.1, 390.6, 391.1, 391.6, 392.1, 392.6, 393.1, 393.6, 394.1, 394.6, 395.1, 395.6, 396.1, 396.6, 397.1, 397.6, 398.1, 398.6, 399.1, 399.6, 400.1, 400.6, 401.1, 401.6, 402.1, 402.6, 403.1, 403.6, 404.2, 404.7, 405.2, 405.7, 406.2, 406.7, 407.2, 407.7, 408.2, 408.7, 409.2, 409.7, 410.2, 410.7, 411.2, 411.7, 412.2, 412.7, 413.2, 413.7, 414.2, 414.7, 415.2, 415.7, 416.2, 416.7, 417.2, 417.7, 418.2, 418.7, 419.2, 419.7, 420.3, 420.8, 421.3, 421.8, 422.3, 422.8, 423.3, 423.8, 424.3, 424.8, 425.3, 425.8, 426.3, 426.8, 427.3, 427.8, 428.3, 428.8, 429.3, 429.8, 430.3, 430.8, 431.3, 431.8, 432.3, 432.8, 433.3, 433.8, 434.3, 434.8, 435.3, 435.8, 436.4, 436.9, 437.4, 437.9, 438.4, 438.9, 439.4, 439.9, 440.4, 440.9, 441.4, 441.9, 442.4, 442.9, 443.4, 443.9, 444.4, 444.9, 445.4, 445.9, 446.4, 446.9, 447.4, 447.9, 448.4, 448.9, 449.4, 449.9, 450.4, 450.9, 451.4, 451.9, 452.5, 453.0, 453.5, 454.0, 454.5, 455.0, 455.5, 456.0, 456.5, 457.0, 457.5, 458.0, 458.5, 459.0, 459.5, 460.0];
  var Z_ON = [8.35, 8.29, 8.41, 8.58, 8.36, 7.92, 7.53, 7.23, 6.52, 6.09, 5.92, 5.56, 5.32, 5.73, 6.62, 7.1, 7.1, 7.01, 7.06, 7.06, 6.91, 6.37, 6.64, 6.32, 5.82, 5.12, 5.16, 5.29, 5.31, 5.31, 5.3, 5.05, 5.05, 4.92, 4.74, 4.74, 4.51, 4.3, 4.3, 3.71, 3.21, 2.92, 3.27, 3.59, 4.09, 4.09, 4.77, 4.98, 4.98, 5.28, 5.58, 5.58, 5.67, 6.0, 6.0, 6.2, 6.2, 7.18, 7.46, 8.29, 8.61, 8.61, 8.91, 8.89, 8.89, 9.49, 10.46, 10.46, 11.44, 12.11, 12.11, 12.26, 12.91, 13.01, 13.16, 19.16, 23.2, 24.1, 24.53, 24.48, 24.48, 23.35, 16.06, 16.06, 9.99, 10.18, 10.18, 10.07, 9.5, 9.37, 9.11, 8.55, 8.35, 8.11, 7.96, 7.81, 7.52, 7.49, 7.61, 7.61, 7.47, 7.41, 7.25, 7.07, 6.34, 6.03, 5.8, 5.36, 5.16, 4.75, 4.57, 4.57, 4.59, 4.32, 4.38, 4.41, 4.69, 4.6, 4.69, 4.78, 5.08, 5.15, 5.14, 5.7, 6.27, 6.53, 9.83, 11.64, 12.4, 12.86, 12.32, 12.36, 11.9, 11.33, 9.05, 8.45, 7.97, 7.79, 7.57, 7.64, 7.59, 7.38, 7.45, 7.53, 7.64, 7.73, 7.76, 7.93, 8.07, 9.18, 10.84, 11.29, 11.28, 11.39, 11.91, 11.2, 10.69, 9.2, 8.17, 8.43];
  var Z_OFF = [10.94, 11.06, 10.83, 10.4, 10.11, 9.83, 9.61, 9.51, 9.24, 9.3, 9.32, 9.63, 9.77, 10.5, 10.71, 10.64, 10.64, 10.3, 9.27, 9.27, 8.75, 8.52, 8.25, 8.16, 8.52, 8.68, 8.8, 8.65, 8.54, 8.54, 7.91, 8.37, 8.37, 9.83, 10.35, 10.35, 10.32, 9.47, 9.47, 7.37, 5.66, 4.87, 5.24, 5.26, 5.52, 5.52, 6.13, 6.18, 6.18, 6.87, 7.7, 7.7, 8.23, 9.03, 9.03, 9.75, 11.31, 12.46, 13.0, 14.01, 14.55, 14.55, 14.32, 13.77, 13.77, 13.68, 14.18, 14.18, 14.88, 15.45, 15.45, 15.95, 16.28, 16.17, 16.3, 16.14, 16.01, 15.83, 15.4, 15.17, 15.17, 14.92, 14.55, 14.55, 14.13, 13.8, 13.8, 13.35, 12.77, 12.58, 12.21, 11.48, 11.21, 11.01, 10.6, 10.4, 10.0, 9.67, 9.27, 9.27, 8.86, 8.59, 8.53, 8.22, 8.15, 7.98, 8.01, 7.67, 7.68, 7.51, 7.68, 7.7, 7.81, 7.76, 7.7, 7.71, 7.32, 7.19, 7.31, 7.4, 7.37, 7.24, 7.29, 7.19, 7.44, 7.35, 7.65, 7.85, 8.1, 8.45, 8.37, 8.39, 8.38, 8.34, 8.68, 8.74, 9.57, 9.65, 9.92, 10.14, 10.11, 10.13, 9.75, 9.83, 9.8, 9.95, 9.96, 10.11, 10.22, 10.23, 10.24, 10.29, 10.29, 10.37, 10.3, 10.53, 10.88, 11.05, 11.61, 11.99];
  var Z_FLOOR = [2.74, 2.76, 2.52, 2.38, 2.21, 2.09, 2.1, 2.2, 2.12, 2.27, 2.22, 2.12, 1.98, 2.02, 2.03, 2.16, 2.16, 2.62, 2.88, 2.88, 2.79, 2.76, 2.47, 2.57, 2.17, 2.33, 2.25, 2.22, 2.32, 2.32, 2.56, 2.56, 2.56, 2.28, 1.71, 1.71, 1.66, 1.69, 1.69, 1.89, 2.36, 2.32, 2.53, 2.65, 2.55, 2.55, 2.26, 1.81, 1.81, 1.47, 1.42, 1.42, 1.27, 1.6, 1.6, 2.33, 3.05, 3.42, 3.85, 4.27, 4.4, 4.4, 4.64, 4.75, 4.75, 4.85, 4.9, 4.9, 4.88, 4.77, 4.77, 4.4, 4.2, 4.04, 3.79, 3.44, 3.28, 3.3, 2.77, 2.52, 2.52, 2.54, 2.52, 2.52, 2.68, 2.61, 2.61, 2.24, 2.32, 2.58, 2.64, 2.75, 2.52, 2.64, 2.41, 2.36, 2.03, 2.11, 2.34, 2.34, 2.21, 1.98, 2.13, 1.93, 2.05, 1.93, 2.09, 2.05, 2.0, 1.82, 1.82, 2.0, 2.14, 2.09, 2.03, 2.08, 2.07, 1.81, 1.5, 1.67, 1.37, 1.37, 0.9, 0.82, 0.83, 1.02, 1.25, 1.16, 1.11, 1.39, 1.6, 1.9, 2.02, 2.15, 2.52, 2.57, 2.77, 2.71, 2.77, 2.72, 2.53, 2.45, 2.11, 2.14, 2.06, 2.12, 2.09, 2.18, 2.26, 2.2, 2.06, 1.89, 1.84, 1.72, 1.63, 1.76, 1.88, 1.98, 1.89, 1.89];

  function _pts(fs, ys) {
    var o = [];
    for (var i = 0; i < fs.length; i++) if (ys[i] !== null) o.push({ x: fs[i], y: ys[i] });
    return o;
  }
  function _ds(label, fs, ys, hex, dashed) {
    return { label: label, data: _pts(fs, ys), borderColor: hex, backgroundColor: hex,
      borderWidth: dashed ? 1.2 : 1.7, borderDash: dashed ? [4, 3] : undefined,
      pointRadius: 0, pointHitRadius: 6, tension: 0, fill: false };
  }
  var NOISE_TICKS = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  var RBE_F = [1440, 1920, 2400, 2880, 3360, 4320];
  var RBE_D = [5.2, 14.5, 6.5, 8.2, 10.2, 8.4];
  /* Anti-RBE: broadband spectrum (Warm1 vs Warm2) + the tonal lines it adds.
     Lives in the anti-RBE section; the XPR tone and the meter levels stay in Noise. */
  function buildRbeAcoustic(el) {
    mkTitle(el, 'ANTI-RBE · ACOUSTIC SPECTRUM',
      'UMIK-1 on the chassis · 1/24 octave · relative scale · Warm1 = anti-RBE on, Warm2 = off');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: { datasets: [
        _ds('Warm2 — anti-RBE off', NF, N_WARM2, '#0a84ff'),
        _ds('Warm1 — anti-RBE on',  NF, N_WARM1, '#ff9f0a'),
        _ds('Room floor — projector off', NF, N_FLOOR, '#8e8e93', true),
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: legOpts(), datalabels: { display: false },
          tooltip: ttOpts(function (v) { return v.toFixed(1) + ' dB'; }) },
        scales: {
          x: { type: 'logarithmic', min: 100, max: 20000, grid: GRID,
               ticks: { color: TC.text3, autoSkip: false, maxRotation: 0,
                 callback: function (v) {
                   if (NOISE_TICKS.indexOf(v) < 0) return '';
                   return v >= 1000 ? (v / 1000) + 'k' : String(v);
                 } },
               title: { display: true, text: 'Frequency (Hz)', color: TC.text3 } },
          y: { grid: GRID, ticks: { color: TC.text3 },
               title: { display: true, text: 'Level (dB, relative)', color: TC.text3 } },
        },
      },
      plugins: DL_PLUGIN,
    });

  }

  /* Noise levels table — its own module so it can sit in the text above the XPR spectrum */
  function buildNoiseLevels(el) {
    el.classList.remove('chart-section');   // host only; the card is inserted after it
    mkTableCard(el, 'MEASURED LEVELS', 'UNI-T UT353BT at 30 cm · A-weighted · room floor subtracted',
      ['State', 'Meter', 'Source only'],
      [['Room floor — projector off', '34.5–35.0', '—'],
       ['Warm1 (anti-RBE on) — thermal equilibrium', '38–40', '35.0–38.5'],
       ['Warm2 (anti-RBE off) — thermal equilibrium', '44.8', '44.3–44.4'],
       ['Slow fan cycle — either mode', '±0.7 dB', 'breathing, ~minutes'],
       ['Quiet mode on', 'no measurable change', '—']],
      'ax-noise-levels', '');
  }

  /* Noise section: the XPR mechanical tone, full width, plus what a meter reads. */
  function buildNoise(el) {
    mkTitle(el, 'XPR SHIFT · 419.7 Hz',
      'UMIK-1 on the chassis · 1/24 octave · the mechanical tone of the shifter, on vs off · room floor for reference');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);
    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '320' : '480') + 'px';
    row.appendChild(mainWrap);

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: { datasets: [
        _ds('XPR on',  ZF, Z_ON,  '#ff375f'),
        _ds('XPR off', ZF, Z_OFF, '#0a84ff'),
        _ds('Room floor — projector off', ZF, Z_FLOOR, '#8e8e93', true),
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: legOpts(), datalabels: { display: false },
          tooltip: ttOpts(function (v) { return v.toFixed(1) + ' dB'; }) },
        scales: {
          x: { type: 'linear', min: 380, max: 460, grid: GRID,
               ticks: { color: TC.text3, stepSize: 10, callback: function (v) { return v + ' Hz'; } },
               title: { display: true, text: 'Frequency (Hz)', color: TC.text3 } },
          y: { grid: GRID, ticks: { color: TC.text3 },
               title: { display: true, text: 'Level (dB, relative)', color: TC.text3 } },
        },
      },
      plugins: DL_PLUGIN,
    });

  }

  /* Power draw at the wall. Main: the laser ladder in both colour sequences.
     Side: what each picture mode actually costs. */
  function buildPower(el) {
    mkTitle(el, 'POWER CONSUMPTION',
      'Measured at the wall · Iris Off, laser uncapped');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = (window.innerWidth <= 600 ? '340' : '440') + 'px';
    row.appendChild(mainWrap);

    var PWR_LABELS = ['Laser 0','Laser 1','Laser 2','Laser 3','Laser 4','Laser 5','Laser 6','Laser 7','Laser 8','Laser 9','Laser 10'];
    var PWR_W1 = [56, 61, 68, 74, 82, 89, 97, 107, 118, 136, 141];
    var PWR_W2 = [70, 77, 85, 93, 102.5, 110, 120, 131, 145, 159, 175];

    function pwrLine(label, data, hex) {
      return {
        label: label, data: data, borderColor: hex, backgroundColor: hex + '22',
        borderWidth: 2.5, pointRadius: 3.5, pointHoverRadius: 6,
        pointBackgroundColor: hex, pointBorderColor: hex, tension: 0.3, fill: false,
        datalabels: Object.assign({}, dlBar(function (v) { return v + ' W'; }, 9), {
          align: 'top', offset: 6,
          display: function (c) { return c.dataIndex % 2 === 0 || c.dataIndex >= 7; },
        }),
      };
    }

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      plugins: DL_PLUGIN,
      data: {
        labels: PWR_LABELS,
        datasets: [pwrLine('Warm2 — anti-RBE off', PWR_W2, '#0a84ff'),
                   pwrLine('Warm1 — anti-RBE on', PWR_W1, '#ff9f0a')],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { color: TC.text3, boxWidth: 12, usePointStyle: true } },
          tooltip: ttOpts(function (v) { return v + ' W'; }),
          datalabels: dlBar(function (v) { return v + ' W'; }, 9),
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: TC.text3 } },
          y: { grid: GRID, min: 40, max: 190,
               ticks: { color: TC.text3, callback: function (v) { return v + ' W'; } },
               title: { display: true, text: 'Power at the wall', color: TC.text3 } },
        },
      },
    });

    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'BY PICTURE MODE',
      'Laser 10 · what each preset costs · Cinema 2 runs the Warm1 sequence whichever white balance is set');

    mkChart(mkCanvas(sideWrap), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: ['W2 Iris Off–M6', 'W2 Cinema 1', 'W2 M7',
                 'W1 Iris Off–M7', 'W1 Cinema 1', 'Cinema 2 — W1 = W2',
                 'BE Low', 'BE High'],
        datasets: [{
          label: 'Power',
          data: [175, 172, 133, 142, 138, 142, 172, 164],
          backgroundColor: ['#0a84ffcc', '#0a84ffcc', '#0a84ffcc',
                            '#ff9f0acc', '#ff9f0acc', '#ff9f0acc',
                            '#ff375fcc', '#ff375fcc'],
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: ttOpts(function (v) { return v + ' W'; }),
          datalabels: dlBar(function (v) { return v + ' W'; }, 9),
        },
        scales: {
          x: { grid: GRID, min: 0, max: 210, ticks: { color: TC.text3, callback: function (v) { return v + ' W'; } } },
          y: { grid: { display: false }, ticks: { color: TC.text3, font: { size: 10 } } },
        },
      },
    });

  }

  // ── PixelLock ────────────────────────────────────────────────────────────
  // 1-px line-pair contrast relative to the local average, after removing the
  // lens MTF falloff (degree-4 polynomial). Dips = PixelLock ghost bands.
  var PL_XX = [0.63,1.27,1.91,2.55,3.20,3.84,4.48,5.12,5.77,6.41,7.05,7.69,8.34,8.98,9.62,10.26,10.91,11.55,12.19,12.83,13.48,14.12,14.76,15.40,16.05,16.69,17.33,17.97,18.62,19.26,19.90,20.54,21.19,21.83,22.47,23.11,23.75,24.40,25.04,25.68,26.32,26.97,27.61,28.25,28.89,29.54,30.18,30.82,31.46,32.11,32.75,33.39,34.03,34.68,35.32,35.96,36.60,37.25,37.89,38.53,39.17,39.82,40.46,41.10,41.74,42.39,43.03,43.67,44.31,44.96,45.60,46.24,46.88,47.53,48.17,48.81,49.45,50.10,50.74,51.38,52.02,52.67,53.31,53.95,54.59,55.24,55.88,56.52,57.16,57.81,58.45,59.09,59.73,60.38,61.02,61.66,62.30,62.95,63.59,64.23,64.87,65.51,66.16,66.80,67.44,68.08,68.73,69.37,70.01,70.65,71.30,71.94,72.58,73.22,73.87,74.51,75.15,75.79,76.44,77.08,77.72,78.36,79.01,79.65,80.29,80.93,81.58,82.22,82.86,83.50,84.15,84.79,85.43,86.07,86.72,87.36,88.00,88.64,89.29,89.93,90.57,91.21,91.86,92.50,93.14,93.78,94.43,95.07,95.71,96.35];
  var PL_XY = [0.946,0.989,1.035,1.076,1.099,1.114,1.124,1.138,1.148,1.111,1.064,1.023,0.966,0.920,0.841,0.666,0.587,0.666,0.867,1.073,1.131,1.087,1.085,1.094,1.103,1.069,1.019,0.965,0.911,0.830,0.722,0.653,0.709,0.835,0.956,1.034,1.034,1.034,1.050,1.048,1.039,1.034,1.043,1.056,1.061,1.051,1.031,1.038,1.054,1.061,1.075,1.069,1.098,1.146,1.146,1.152,1.148,1.136,1.172,1.176,1.160,1.175,1.167,1.158,1.137,1.123,1.117,1.122,1.113,1.112,1.108,1.096,1.010,0.865,0.711,0.604,0.590,0.658,0.742,0.854,0.963,1.020,1.046,1.051,1.047,1.048,1.017,0.897,0.729,0.592,0.584,0.680,0.787,0.871,0.943,0.984,0.991,1.019,1.025,1.032,1.037,1.035,1.036,1.036,1.038,1.037,1.035,1.034,1.031,1.035,1.010,1.022,1.030,1.048,1.063,1.078,1.097,1.116,1.127,1.136,1.140,1.149,1.165,1.174,1.154,1.130,1.137,1.159,1.157,1.151,1.142,1.124,1.063,0.904,0.686,0.561,0.664,0.869,1.030,1.068,1.062,1.064,1.067,1.059,1.051,1.029,0.998,0.947,0.831,0.697];
  var PL_YX = [1.12,1.73,2.35,2.97,3.58,4.20,4.82,5.43,6.05,6.67,7.28,7.90,8.52,9.13,9.75,10.37,10.98,11.60,12.22,12.83,13.45,14.07,14.68,15.30,15.92,16.53,17.15,17.77,18.38,19.00,19.62,20.23,20.85,21.47,22.08,22.70,23.32,23.93,24.55,25.17,25.78,26.40,27.02,27.63,28.25,28.87,29.48,30.10,30.72,31.33,31.95,32.57,33.18,33.80,34.42,35.03,35.65,36.27,36.88,37.50,38.12,38.73,39.35,39.97,40.58,41.20,41.82,42.43,43.05,43.67,44.28,44.90,45.52,46.13,46.75,47.37,47.98,48.60,49.22,49.83,50.45,51.07,51.68,52.30,52.92,53.53,54.15,54.77,55.38,56.00,56.62,57.23,57.85,58.47,59.08,59.70,60.32,60.93,61.55,62.17,62.78,63.40,64.02,64.63,65.25,65.87,66.48,67.10,67.72,68.33,68.95,69.57,70.18,70.80,71.42,72.03,72.65,73.27,73.88,74.50,75.12,75.73,76.35,76.97,77.58,78.20,78.82,79.43,80.05,80.67,81.28,81.90,82.52,83.13,83.75,84.37,84.98,85.60,86.22,86.83,87.45,88.07,88.68,89.30,89.92,90.53,91.15,91.77,92.38,93.00];
  var PL_YY = [0.669,0.861,1.060,1.211,1.246,1.158,0.997,0.836,0.730,0.733,0.858,1.073,1.261,1.338,1.256,1.042,0.794,0.625,0.603,0.716,0.912,1.126,1.294,1.362,1.325,1.185,1.005,0.870,0.804,0.838,0.990,1.152,1.265,1.299,1.198,1.007,0.805,0.684,0.691,0.801,0.971,1.129,1.224,1.210,1.091,0.948,0.821,0.756,0.794,0.910,1.081,1.212,1.253,1.190,1.044,0.870,0.757,0.745,0.823,0.970,1.131,1.233,1.215,1.096,0.949,0.818,0.765,0.812,0.931,1.083,1.193,1.242,1.183,1.039,0.896,0.797,0.791,0.885,1.038,1.185,1.244,1.185,1.039,0.869,0.761,0.752,0.825,0.949,1.080,1.175,1.179,1.093,0.958,0.845,0.791,0.833,0.958,1.116,1.249,1.267,1.170,0.993,0.832,0.767,0.800,0.897,1.042,1.191,1.266,1.229,1.102,0.961,0.863,0.844,0.914,1.048,1.198,1.280,1.245,1.103,0.923,0.802,0.793,0.858,0.975,1.101,1.206,1.223,1.137,0.992,0.857,0.788,0.809,0.898,1.026,1.124,1.124,1.024,0.862,0.740,0.693,0.733,0.832,0.956,1.061,1.141,1.193,1.141,1.100,1.118];
  var PL_BANDS = [10.8, 20.5, 49.2, 58.1, 87.4, 96.0];

  function plPanel(parent, title, sub, xs, ys, hex, h) {
    mkTitle(parent, title, sub);
    var w = document.createElement('div');
    w.style.height = h;
    parent.appendChild(w);
    mkChart(mkCanvas(w), {
      type: 'line',
      data: { datasets: [_ds('1-px line-pair contrast', xs, ys, hex)] },
      options: {
        responsive: true, maintainAspectRatio: false, clip: false,
        plugins: { legend: { display: false }, datalabels: { display: false },
          tooltip: ttOpts(function (v) { return (v * 100).toFixed(0) + ' % of normal'; }) },
        scales: {
          x: { type: 'linear', min: 0, max: 100, grid: GRID,
               ticks: { color: TC.text3, stepSize: 10, callback: function (v) { return v + ' %'; } } },
          y: { min: 0.5, max: 1.45, grid: GRID,
               ticks: { color: TC.text3, stepSize: 0.2, callback: function (v) { return Math.round(v * 100) + ' %'; } } },
        },
      },
      plugins: DL_PLUGIN,
    });
  }

  function buildPixelLock(el) {
    mkTitle(el, 'PIXELLOCK BANDS', '');
    plPanel(el, '', 'Down the screen, top to bottom — about seventeen horizontal bands, every second one deeper',
      PL_YX, PL_YY, '#0a84ff', '210px');
    plPanel(el, '', 'Across the screen, left to right — six vertical bands in three pairs',
      PL_XX, PL_XY, '#ff375f', '210px');

  }

  var MAP = {
    'ax-brightness': buildBrightness,
    'ax-combined': buildCombined,
    'ax-quality': buildQuality,
    'ax-contrast-native': buildNative,
    'ax-contrast-adl': buildADL,
    'ax-contrast-dyn': buildDyn,
    'ax-ebl': buildEBL,
    'ax-ebl-how': buildHow,
    'ax-ebl-gamma': buildEblGamma,
    'ax-rbe-seq': buildRbeSeq,
    'ax-xpr': buildXpr,
    'ax-pixellock-how': buildPixelLockHow,
    'ax-lag-scan': buildLagScan,
    'ax-throw': buildThrow,
    'ax-antirbe-acoustic': buildRbeAcoustic,
    'ax-noise': buildNoise,
    'ax-noise-levels': buildNoiseLevels,
    'ax-power': buildPower,
    'ax-pixellock': buildPixelLock,
  };

  function init() {
    Object.keys(MAP).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) MAP[id](el);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  new MutationObserver(function () {
    var dark = _useDark();
    TC = _mkTC(dark);
    var gridColor = dark ? '#2a2a2a' : '#e5e5ea';
    Chart.defaults.color = dark ? '#999' : '#6e6e73';
    ALL_CHARTS.forEach(function (chart) {
      Object.keys(chart.options.scales || {}).forEach(function (ax) {
        var s = chart.options.scales[ax];
        if (s.grid) s.grid.color = gridColor;
        if (s.ticks) s.ticks.color = TC.text;
      });
      var leg = chart.options.plugins && chart.options.plugins.legend;
      if (leg && leg.labels) leg.labels.color = TC.text;
      chart.update('none');
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
