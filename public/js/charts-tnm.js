(function () {
  'use strict';
  if (!document.querySelector('.chart-section')) return;
  var IS_WIDE = !!document.querySelector('.article-page--wide');

  /* ── Palette ─────────────────────────────────────────── */
  var C = {
    F2:  { hex: '#4FC3F7', label: 'F2'      },
    F3:  { hex: '#66BB6A', label: 'F3'      },
    F4:  { hex: '#FFA726', label: 'F4'      },
    F55: { hex: '#FF7043', label: 'F5.5'    },
    F7:  { hex: '#AB47BC', label: 'F7'      },
    Dyn: { hex: '#EF5350', label: 'Dynamic' },
  };
  var KEYS = ['F2','F3','F4','F55','F7','Dyn'];

  /* ── Raw data ─────────────────────────────────────────── */
  var ZOOMS = ['2.1×','2.0×','1.9×','1.8×','1.7×','1.6×','1.5×','1.4×','1.3×','1.2×','1.1×','1.0×'];

  var LM = {
    F2:  [4190,4232,4149,4219,4134,4181,4162,4057,4007,4019,3915,3902],
    F3:  [3788,3517,3393,3384,3279,3221,3148,3073,3154,3621,3493,3470],
    F4:  [2893,2993,2932,2853,2760,2721,2663,2692,2666,3154,3061,3068],
    F55: [1530,2105,2053,2046,1969,1956,1913,1948,1938,1862,2008,1992],
    F7:  [627, 958, 929,1022, 985, 983, 961, 964, 949,1041,1019,1007],
    Dyn: [3322,3373,3321,3424,3350,3402,3382,3249,3279,3224,3148,3159],
  };

  var CR = {
    F2:  [1670,1743,1844,1955,2030,2112,2195,2189,2179,2210,2200,2217],
    F3:  [3090,3394,3523,3645,3725,3867,3918,3895,3888,2920,2890,2915],
    F4:  [4157,3956,4126,4370,4421,4568,4579,4465,4468,3223,3208,3269],
    F55: [6176,4426,4647,4909,4944,5127,5183,4857,5033,4348,4425,4540],
    F7:  [8650,6041,6274,5625,5658,5930,5957,5532,5560,4947,5048,5198],
    Dyn: [4567,4781,5000,4153,4330,4543,4804,4934,5020,4596,4651,4648],
  };

  /* ── Chart theme ──────────────────────────────────────── */
  function _isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function _mkTC(dark) {
    return dark ? {
      text: '#ccc', text3: '#888',
      ttBg: '#1e1e1e', ttBord: '#3a3a3a', ttTitle: '#fff',
    } : {
      text: '#3a3a3c', text3: '#6e6e73',
      ttBg: '#ffffff', ttBord: '#e2e2e7', ttTitle: '#1c1c1e',
    };
  }
  function _useDark() { return _isDark() || !IS_WIDE; }
  var TC = _mkTC(_useDark());

  /* ── Chart.js defaults ───────────────────────────────── */
  var DL_PLUGIN = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];
  Chart.defaults.color = _useDark() ? '#999' : '#6e6e73';
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  Chart.defaults.font.size = 12;
  var GRID = { color: _useDark() ? '#2a2a2a' : '#e5e5ea' };

  /* ── Chart registry for live theme updates ───────────── */
  var ALL_CHARTS = [];
  function mkChart(canvas, cfg) { var c = new Chart(canvas, cfg); ALL_CHARTS.push(c); return c; }

  // Forces first/last data points flush with chart edges on line charts (offset:false)
  Chart.register({
    id: 'edgeAlign',
    beforeRender: function(chart) {
      var s = chart.scales['x'];
      if (!s || s.options.offset !== false) return;
      s._startPixel = s.left;
      s._endPixel = s.right;
      s._pixelRange = s.right - s.left;
    }
  });

  // Datalabels config for bar charts
  var DL_OPTS = {
    anchor: 'end', align: 'start', offset: 4,
    color: '#fff', font: { size: 11, weight: '700' },
    formatter: function (v) { return v ? v.toLocaleString() : ''; },
  };

  /* ── Helpers ──────────────────────────────────────────── */
  function ttOpts(fmtFn) {
    return {
      mode: 'index', intersect: false,
      backgroundColor: TC.ttBg, titleColor: TC.ttTitle,
      bodyColor: TC.text, borderColor: TC.ttBord, borderWidth: 1, padding: 12,
      callbacks: fmtFn ? { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmtFn(ctx.parsed.y); } } : {},
    };
  }

  function lineDS(key, data, dashed) {
    var ds = {
      label: C[key].label, data: data,
      borderColor: C[key].hex, backgroundColor: C[key].hex + '22',
      pointBackgroundColor: C[key].hex,
      pointRadius: 4, pointHoverRadius: 7,
      borderWidth: 2.5, tension: 0.3, fill: false,
    };
    if (dashed) ds.borderDash = [5, 4];
    return ds;
  }

  function mkTitle(parent, title, sub) {
    var d = document.createElement('div');
    d.className = 'cs-title';
    d.innerHTML = '<strong>' + title + '</strong>' + (sub ? '<span>' + sub + '</span>' : '');
    parent.appendChild(d);
  }

  function mkCanvas(parent) {
    var c = document.createElement('canvas');
    parent.appendChild(c);
    return c;
  }

  var sortState = {};
  function mkTable(parent, head, rows, tableId) {
    var wrap = document.createElement('div');
    wrap.className = 'chart-table-wrap';
    var tbl = document.createElement('table');
    tbl.className = 'data-table';
    if (tableId) tbl.id = tableId;

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
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

  function sortTable(tbl, col) {
    var key = tbl.id + '_' + col;
    var asc = sortState[key] !== true;
    sortState[key] = asc;
    Array.prototype.forEach.call(tbl.querySelectorAll('th'), function (th) { th.classList.remove('sort-asc','sort-desc'); });
    tbl.querySelectorAll('th')[col].classList.add(asc ? 'sort-asc' : 'sort-desc');
    var tbody = tbl.querySelector('tbody');
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    rows.sort(function (a, b) {
      var at = a.cells[col].textContent.replace(/[^0-9.\-]/g,'');
      var bt = b.cells[col].textContent.replace(/[^0-9.\-]/g,'');
      var af = parseFloat(at), bf = parseFloat(bt);
      if (isNaN(af) || isNaN(bf)) return asc ? at.localeCompare(bt) : bt.localeCompare(at);
      return asc ? af - bf : bf - af;
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
  }

  // Build a table. In wide mode: creates a separate sibling data card after `afterEl`
  // with Values (table) and optionally Bars tabs. Values tab is active by default.
  // In normal mode: inserts a separate chart-section card after `afterEl`.
  function mkTableCard(afterEl, title, sub, head, rows, tableId, barOpts) {
    if (IS_WIDE) {
      var dataCard = document.createElement('div');
      dataCard.className = 'chart-section cs-data-card';

      var cardTitle = document.createElement('div');
      cardTitle.className = 'cs-title';
      cardTitle.innerHTML = '<strong>' + (title || '') + '</strong>' + (sub ? '<span>' + sub + '</span>' : '');
      dataCard.appendChild(cardTitle);

      if (barOpts) {
        var toggle = document.createElement('div');
        toggle.className = 'cs-view-toggle';
        toggle.innerHTML = '<button class="cs-tab cs-tab--active" data-view="values">Values</button>'
                         + '<button class="cs-tab" data-view="bars">Bars</button>';
        cardTitle.appendChild(toggle);
      }

      var tableSection = document.createElement('div');
      tableSection.className = 'cs-table-section';
      var tbl = mkTable(tableSection, head, rows, tableId);
      dataCard.appendChild(tableSection);

      var barsSection = null;
      if (barOpts) {
        barsSection = mkBarsSection(dataCard, barOpts);
        barsSection.style.display = 'none';
      }

      if (afterEl.nextSibling) {
        afterEl.parentNode.insertBefore(dataCard, afterEl.nextSibling);
      } else {
        afterEl.parentNode.appendChild(dataCard);
      }

      if (barOpts && toggle) {
        toggle.addEventListener('click', function (e) {
          var btn = e.target.closest('.cs-tab');
          if (!btn) return;
          var view = btn.dataset.view;
          Array.prototype.forEach.call(toggle.querySelectorAll('.cs-tab'), function (b) {
            b.classList.toggle('cs-tab--active', b === btn);
          });
          tableSection.style.display = (view === 'values') ? '' : 'none';
          if (barsSection) barsSection.style.display = (view === 'bars') ? 'block' : 'none';
        });
      }

      return tbl;
    }
    var card = document.createElement('div');
    card.className = 'chart-section';
    if (title) mkTitle(card, title, sub);
    var tbl = mkTable(card, head, rows, tableId);
    if (afterEl.nextSibling) {
      afterEl.parentNode.insertBefore(card, afterEl.nextSibling);
    } else {
      afterEl.parentNode.appendChild(card);
    }
    return tbl;
  }

  function addViewToggle(card) {
    if (IS_WIDE) return;
    var titleEl = card.querySelector('.cs-title');
    if (!titleEl) return;
    var toggle = document.createElement('div');
    toggle.className = 'cs-view-toggle';
    toggle.innerHTML = '<button class="cs-tab cs-tab--active" data-view="chart">Chart</button>'
                     + '<button class="cs-tab" data-view="table">Table</button>';
    titleEl.appendChild(toggle);
    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.cs-tab');
      if (!btn) return;
      var view = btn.dataset.view;
      Array.prototype.forEach.call(toggle.querySelectorAll('.cs-tab'), function (b) {
        b.classList.toggle('cs-tab--active', b === btn);
      });
      Array.prototype.forEach.call(card.querySelectorAll('.chart-main'), function (el) {
        el.style.display = (view === 'chart') ? '' : 'none';
      });
      Array.prototype.forEach.call(card.querySelectorAll('.cs-table-section'), function (t) {
        t.style.display = (view === 'table') ? '' : 'none';
      });
    });
  }

  // Horizontal bar view: aperture chips + stat cards + proportional bar rows
  function mkBarsSection(parent, barOpts) {
    var section = document.createElement('div');
    section.className = 'cs-bars-section';

    var chipsWrap = document.createElement('div');
    chipsWrap.className = 'cs-aperture-chips';
    barOpts.keys.forEach(function (k) {
      var btn = document.createElement('button');
      btn.className = 'cs-chip' + (k === barOpts.keys[0] ? ' cs-chip--active' : '');
      btn.dataset.key = k;
      btn.innerHTML = '<span class="color-dot" style="background:' + C[k].hex + '"></span>' + C[k].label;
      chipsWrap.appendChild(btn);
    });
    section.appendChild(chipsWrap);

    var statsRow = document.createElement('div');
    statsRow.className = 'cs-stat-cards';
    section.appendChild(statsRow);

    var barsWrap = document.createElement('div');
    barsWrap.className = 'cs-bar-rows';
    section.appendChild(barsWrap);

    function render(key) {
      var data = barOpts.data[key];
      var zooms = barOpts.zooms;
      var fmt = barOpts.format;
      var color = C[key].hex;
      var sweetIdx = barOpts.sweetIdx !== undefined ? barOpts.sweetIdx : 6;

      var maxVal = 0;
      data.forEach(function (v) { if (v !== null && v > maxVal) maxVal = v; });
      var peakIdx = data.indexOf(maxVal);

      statsRow.innerHTML = '';
      [
        { label: 'Peak',        value: data[peakIdx],          zoom: zooms[peakIdx] },
        { label: 'Sweet spot',  value: data[sweetIdx],         zoom: zooms[sweetIdx] },
        { label: 'Short throw', value: data[zooms.length - 1], zoom: zooms[zooms.length - 1] },
      ].forEach(function (s) {
        var card = document.createElement('div');
        card.className = 'cs-stat-card';
        card.innerHTML = '<div class="cs-stat-val">' + fmt(s.value) + '</div>'
          + '<div class="cs-stat-lbl">' + s.label + '</div>'
          + '<div class="cs-stat-zoom">' + s.zoom + '</div>';
        statsRow.appendChild(card);
      });

      barsWrap.innerHTML = '';
      data.forEach(function (val, i) {
        var pct = (val !== null && maxVal) ? Math.round(val / maxVal * 100) : 0;
        var row = document.createElement('div');
        row.className = 'cs-bar-row';
        row.innerHTML = '<span class="cs-bar-zoom">' + zooms[i] + '</span>'
          + '<span class="cs-bar-val">' + (val !== null ? fmt(val) : '—') + '</span>'
          + '<div class="cs-bar-track"><div class="cs-bar-fill" style="width:' + pct + '%;background:' + color + 'cc"></div></div>';
        barsWrap.appendChild(row);
      });
    }

    render(barOpts.keys[0]);

    chipsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.cs-chip');
      if (!btn || !btn.dataset.key) return;
      Array.prototype.forEach.call(chipsWrap.querySelectorAll('.cs-chip'), function (b) {
        b.classList.toggle('cs-chip--active', b === btn);
      });
      render(btn.dataset.key);
    });

    parent.appendChild(section);
    return section;
  }

  function colorFirstCol(tbl, keys) {
    var tds = tbl.querySelectorAll('tbody tr td:first-child');
    keys.forEach(function (k, i) {
      if (!tds[i]) return;
      tds[i].innerHTML = '<span class="color-dot" style="background:' + C[k].hex + '"></span>' + C[k].label;
    });
  }

  /* ══════════════════════════════════════════════════════
     CHART 1 — Brightness (p2-20)
  ══════════════════════════════════════════════════════ */
  function buildBrightness(el) {
    mkTitle(el, 'BRIGHTNESS BY ZOOM & IRIS', 'ISF Night / D65 · Laser 10 · lumens (lm)');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = '480px';
    row.appendChild(mainWrap);

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: {
        labels: ZOOMS,
        datasets: KEYS.map(function (k) { return lineDS(k, LM[k]); }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: 0 },
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: ttOpts(function (v) { return v.toLocaleString() + ' lm'; }),
        },
        scales: {
          x: { grid: GRID, offset: false, ticks: { align: 'inner' }, afterFit: function (s) { s.paddingLeft = 0; s.paddingRight = 0; } },
          y: { type: 'logarithmic', grid: GRID, ticks: {
            maxTicksLimit: 10,
            callback: function (v) {
              var nice = [500,600,700,800,1000,1200,1500,2000,2500,3000,4000,5000,6000,7000,8000,9000,10000];
              return nice.indexOf(v) >= 0 ? v.toLocaleString() : null;
            }
          } },
        },
      },
    });

    // Side: bar chart — brightness modes at F2, zoom 2.1×
    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'F2 · ZOOM 2.1×', 'Brightness by mode');

    mkChart(mkCanvas(sideWrap), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: ['ISF Night', 'Laser 10+', 'Performance'],
        datasets: [{
          label: 'Lumens',
          data: [4190, 5248, 7657],
          backgroundColor: ['#4FC3F7cc', '#FFA726cc', '#EF5350cc'],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: ttOpts(function (v) { return v.toLocaleString() + ' lm'; }),
          datalabels: Object.assign({}, DL_OPTS, { formatter: function (v) { return v.toLocaleString() + ' lm'; } }),
        },
        scales: {
          x: { grid: { display: false } },
          y: { display: false },
        },
      },
    });

    // Table: rows=iris, cols=zoom (compact — 6 rows instead of 12)
    var head = ['Iris'].concat(ZOOMS);
    var rows = KEYS.map(function (k) { return [C[k].label].concat(LM[k]); });
    var tbl = mkTableCard(el, 'BRIGHTNESS — FULL RANGE', 'Lumens (lm) · click a column to sort', head, rows, 'tbl-brightness',
      IS_WIDE ? { keys: KEYS, data: LM, zooms: ZOOMS, format: function (v) { return v.toLocaleString() + ' lm'; }, sweetIdx: 6 } : null);
    colorFirstCol(tbl, KEYS);
    addViewToggle(el);
  }

  /* ══════════════════════════════════════════════════════
     CHART 2 — Native Contrast (p2-21)
  ══════════════════════════════════════════════════════ */
  function buildContrast(el) {
    mkTitle(el, 'NATIVE CONTRAST BY ZOOM & IRIS', 'ISF Night / D65 · On/Off ratio');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = '480px';
    row.appendChild(mainWrap);

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: {
        labels: ZOOMS,
        datasets: KEYS.map(function (k) { return lineDS(k, CR[k]); }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: 0 },
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }),
        },
        scales: {
          x: { grid: GRID, offset: false, ticks: { align: 'inner' }, afterFit: function (s) { s.paddingLeft = 0; s.paddingRight = 0; } },
          y: { type: 'logarithmic', grid: GRID, ticks: {
            maxTicksLimit: 10,
            callback: function (v) {
              var nice = [500,600,700,800,1000,1200,1500,2000,2500,3000,4000,5000,6000,7000,8000,9000,10000];
              return nice.indexOf(v) >= 0 ? v.toLocaleString() : null;
            }
          } },
        },
      },
    });

    // Side: horizontal bar — peak contrast per aperture
    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'PEAK CONTRAST', 'Per aperture');

    mkChart(mkCanvas(sideWrap), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: KEYS.map(function (k) { return C[k].label; }),
        datasets: [{
          label: 'Peak CR',
          data: [2217, 3918, 4579, 6176, 8650, 5020],
          backgroundColor: KEYS.map(function (k) { return C[k].hex + 'cc'; }),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }),
          datalabels: Object.assign({}, DL_OPTS, { font: { size: 9, weight: '700' }, formatter: function (v) { return v.toLocaleString() + ':1'; } }),
        },
        scales: {
          x: { grid: { display: false } },
          y: { display: false },
        },
      },
    });

    var head = ['Iris'].concat(ZOOMS);
    var rows = KEYS.map(function (k) { return [C[k].label].concat(CR[k]); });
    var tbl = mkTableCard(el, 'NATIVE CONTRAST — FULL RANGE', 'On/Off ratio · click a column to sort', head, rows, 'tbl-contrast',
      IS_WIDE ? { keys: KEYS, data: CR, zooms: ZOOMS, format: function (v) { return v.toLocaleString() + ':1'; }, sweetIdx: 6 } : null);
    colorFirstCol(tbl, KEYS);
    addViewToggle(el);
  }

  /* ══════════════════════════════════════════════════════
     CHART 3 — Combined scatter + iris effectiveness (p2-24)
  ══════════════════════════════════════════════════════ */
  function buildCombined(el) {
    mkTitle(el, 'BRIGHTNESS vs CONTRAST — ALL 72 OPERATING POINTS', 'ISF Night / D65 · each dot = one zoom + aperture combination');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = '480px';
    row.appendChild(mainWrap);

    // Compute Pareto frontier (non-dominated: maximize both brightness and contrast)
    var allPts = [];
    KEYS.forEach(function (k) {
      LM[k].forEach(function (v, i) { allPts.push({ x: v, y: CR[k][i] }); });
    });
    allPts.sort(function (a, b) { return b.x - a.x; });
    var paretoFront = [], maxY = -Infinity;
    allPts.forEach(function (pt) {
      if (pt.y > maxY) { paretoFront.push(pt); maxY = pt.y; }
    });
    paretoFront.sort(function (a, b) { return a.x - b.x; });

    mkChart(mkCanvas(mainWrap), {
      type: 'scatter',
      data: {
        datasets: KEYS.map(function (k) {
          return {
            label: C[k].label,
            data: LM[k].map(function (v, i) { return { x: v, y: CR[k][i] }; }),
            backgroundColor: C[k].hex + 'cc',
            borderColor: C[k].hex,
            pointRadius: 6, pointHoverRadius: 9,
            showLine: false, fill: false,
          };
        }).concat([{
          label: 'Pareto frontier',
          data: paretoFront,
          backgroundColor: 'transparent',
          borderColor: _useDark() ? '#aaaaaa' : '#555555',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0, pointHoverRadius: 0,
          showLine: true, tension: 0, fill: false,
          order: -1,
        }]),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: {
            mode: 'nearest', intersect: true,
            backgroundColor: TC.ttBg, titleColor: TC.ttTitle,
            bodyColor: TC.text, borderColor: TC.ttBord, borderWidth: 1, padding: 12,
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.dataset.label + ' @ ' + ZOOMS[ctx.dataIndex] + ': ' +
                  ctx.parsed.x.toLocaleString() + ' lm · ' + ctx.parsed.y.toLocaleString() + ':1';
              },
            },
          },
        },
        scales: {
          x: { grid: GRID, title: { display: true, text: 'Brightness (lm)', color: '#777' },
               ticks: { callback: function (v) { return v.toLocaleString(); } } },
          y: { grid: GRID, title: { display: true, text: 'Native contrast', color: '#777' },
               ticks: { callback: function (v) { return v.toLocaleString(); } } },
        },
      },
    });

    // Side: iris effectiveness (CR F7 / CR F2)
    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'IRIS EFFECTIVENESS', 'CR(F7) ÷ CR(F2) per zoom');

    mkChart(mkCanvas(sideWrap), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: ZOOMS,
        datasets: [{
          label: 'Multiplier',
          data: CR.F7.map(function (v, i) { return Math.round(v / CR.F2[i] * 10) / 10; }),
          backgroundColor: '#AB47BCcc',
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: TC.ttBg, titleColor: TC.ttTitle,
            bodyColor: TC.text, borderColor: TC.ttBord, borderWidth: 1,
            callbacks: { label: function (ctx) { return ' ' + ctx.parsed.y + '×'; } },
          },
          datalabels: Object.assign({}, DL_OPTS, { font: { size: 8, weight: '700' }, formatter: function (v) { return v + '×'; } }),
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { display: false, min: 0 },
        },
      },
    });

    // Table: rows=zoom, cols=iris — dual values (lm + CR) need wide columns, zoom-as-rows is cleaner
    var head = ['Zoom'].concat(KEYS.map(function (k) { return C[k].label; }));
    var rows = ZOOMS.map(function (z, i) {
      return [z].concat(KEYS.map(function (k) {
        return LM[k][i].toLocaleString() + ' lm<br><span style="color:#888;font-size:11px">' + CR[k][i].toLocaleString() + ':1</span>';
      }));
    });
    var tbl = mkTableCard(el, 'BRIGHTNESS & CONTRAST — FULL RANGE', 'Lumens / contrast ratio · click a column to sort', head, rows, 'tbl-combined');
    var ths = tbl.querySelectorAll('thead th');
    KEYS.forEach(function (k, i) {
      if (ths[i + 1]) ths[i + 1].innerHTML = '<span class="color-dot" style="background:' + C[k].hex + '"></span>' + C[k].label;
    });
    addViewToggle(el);
  }

  /* ══════════════════════════════════════════════════════
     CHART 4 — Quality Metric (p2-25)
  ══════════════════════════════════════════════════════ */
  function buildQuality(el) {
    mkTitle(el, 'COMBINED QUALITY METRIC', 'Brightness × Contrast normalized · 100% = global best · ISF Night / D65');

    // Compute scores
    var globalMax = 0;
    KEYS.forEach(function (k) {
      LM[k].forEach(function (v, i) { globalMax = Math.max(globalMax, v * CR[k][i]); });
    });
    var QUAL = {};
    KEYS.forEach(function (k) {
      QUAL[k] = LM[k].map(function (v, i) { return Math.round(v * CR[k][i] / globalMax * 100); });
    });

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = '480px';
    row.appendChild(mainWrap);

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: {
        labels: ZOOMS,
        datasets: KEYS.map(function (k) { return lineDS(k, QUAL[k]); }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: 0 },
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: ttOpts(function (v) { return v + '%'; }),
        },
        scales: {
          x: { grid: GRID, offset: false, ticks: { align: 'inner' }, afterFit: function (s) { s.paddingLeft = 0; s.paddingRight = 0; } },
          y: { grid: GRID, min: 0, max: 105, ticks: { callback: function (v) { return v + '%'; } } },
        },
      },
    });

    // Side: peak quality score per aperture
    var sideWrap = document.createElement('div');
    sideWrap.className = 'chart-side';
    row.appendChild(sideWrap);
    mkTitle(sideWrap, 'PEAK QUALITY', 'Max score per aperture');

    mkChart(mkCanvas(sideWrap), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: KEYS.map(function (k) { return C[k].label; }),
        datasets: [{
          label: 'Peak %',
          data: KEYS.map(function (k) { return Math.max.apply(null, QUAL[k]); }),
          backgroundColor: KEYS.map(function (k) { return C[k].hex + 'cc'; }),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: ttOpts(function (v) { return v + '%'; }),
          datalabels: Object.assign({}, DL_OPTS, { formatter: function (v) { return v + '%'; } }),
        },
        scales: {
          x: { grid: { display: false } },
          y: { display: false },
        },
      },
    });

    // Best zoom per aperture — separate card
    var best = [
      { k:'F2',  zoom:'1.5×', lm:4162,  cr:2195,  range:'1.8–1.0×' },
      { k:'F3',  zoom:'1.6×', lm:3221,  cr:3867,  range:'2.1–1.3×' },
      { k:'F4',  zoom:'1.8×', lm:2853,  cr:4370,  range:'2.1–1.3×' },
      { k:'F55', zoom:'1.8×', lm:2046,  cr:4909,  range:'2.1–1.3×, 1.0×' },
      { k:'F7',  zoom:'1.6×', lm:983,   cr:5930,  range:'2.1–1.3×' },
      { k:'Dyn', zoom:'1.9×', lm:3321,  cr:5000,  range:'2.1–1.9×, 1.6–1.3×' },
    ];
    var bestRows = best.map(function (d) {
      return [C[d.k].label, d.zoom, d.lm.toLocaleString() + ' lm', d.cr.toLocaleString() + ':1', d.range];
    });
    var tbl2 = mkTableCard(el, 'BEST ZOOM PER APERTURE', 'Peak quality score and good range (≥90%) · click a column to sort', ['Ap.','Peak','Brightness','Contrast','Range ≥90%'], bestRows, 'tbl-quality-best');
    var tds2 = tbl2.querySelectorAll('tbody tr td:first-child');
    best.forEach(function (d, i) {
      if (tds2[i]) tds2[i].innerHTML = '<span class="color-dot" style="background:' + C[d.k].hex + '"></span>' + C[d.k].label;
    });
    addViewToggle(el);
  }

  /* ══════════════════════════════════════════════════════
     CHART 5 — ANSI Contrast (p2-26)
  ══════════════════════════════════════════════════════ */
  function buildANSI(el) {
    var ZOOMS_A = ['2.0×','1.9×','1.8×','1.7×','1.6×','1.5×','1.4×','1.3×','1.2×','1.1×','1.0×'];
    mkTitle(el, 'ANSI CONTRAST BY ZOOM', 'ISF Night / D65 · ANSI checkerboard · solid = shifted lens, dashed = centered');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = '480px';
    row.appendChild(mainWrap);

    var AN = {
      F2S:  [488,547,592,624,634,682,702,706,719,730,740],
      F2C:  [451,502,null,null,548,null,null,null,null,null,676],
      F55S: [559,621,672,687,700,743,767,778,792,802,802],
      F55C: [495,552,null,null,560,null,null,null,null,null,670],
      F7S:  [557,616,691,710,715,764,792,793,841,845,846],
      F7C:  [490,552,null,null,602,null,null,null,null,null,678],
    };

    function ansiDS(data, color, dashed, lbl) {
      var ds = {
        label: lbl, data: data,
        borderColor: color, backgroundColor: color + '22',
        pointBackgroundColor: color,
        pointRadius: 4, pointHoverRadius: 7,
        borderWidth: 2.5, tension: 0.3, fill: false,
        spanGaps: dashed, // connect dots on centered (dashed) lines
      };
      if (dashed) ds.borderDash = [5, 4];
      return ds;
    }

    mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: {
        labels: ZOOMS_A,
        datasets: [
          ansiDS(AN.F2S,  C.F2.hex,  false, 'F2 shifted'),
          ansiDS(AN.F2C,  C.F2.hex,  true,  'F2 centered'),
          ansiDS(AN.F55S, C.F55.hex, false, 'F5.5 shifted'),
          ansiDS(AN.F55C, C.F55.hex, true,  'F5.5 centered'),
          ansiDS(AN.F7S,  C.F7.hex,  false, 'F7 shifted'),
          ansiDS(AN.F7C,  C.F7.hex,  true,  'F7 centered'),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: 0 },
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: { mode: 'index', intersect: false, backgroundColor: TC.ttBg, titleColor: TC.ttTitle, bodyColor: TC.text, borderColor: TC.ttBord, borderWidth: 1, padding: 12 },
        },
        scales: {
          x: { grid: GRID, offset: false, ticks: { align: 'inner' }, afterFit: function (s) { s.paddingLeft = 0; s.paddingRight = 0; } },
          y: { type: 'logarithmic', grid: GRID, ticks: {
            maxTicksLimit: 10,
            callback: function (v) {
              var nice = [400,450,500,550,600,650,700,750,800,850,900,1000];
              return nice.indexOf(v) >= 0 ? v.toLocaleString() : null;
            }
          } },
        },
      },
    });

    // Side: peak ANSI per aperture (shifted lens, short throw)
    var sideWrapA = document.createElement('div');
    sideWrapA.className = 'chart-side';
    row.appendChild(sideWrapA);
    mkTitle(sideWrapA, 'PEAK ANSI', 'Shifted lens · 1.0×');

    mkChart(mkCanvas(sideWrapA), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: ['F2', 'F5.5', 'F7'],
        datasets: [{
          label: 'ANSI',
          data: [740, 802, 846],
          backgroundColor: [C.F2.hex + 'cc', C.F55.hex + 'cc', C.F7.hex + 'cc'],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: TC.ttBg, titleColor: TC.ttTitle, bodyColor: TC.text, borderColor: TC.ttBord, borderWidth: 1,
            callbacks: { label: function (ctx) { return ' ' + ctx.parsed.y.toLocaleString(); } } },
          datalabels: Object.assign({}, DL_OPTS, { formatter: function (v) { return v.toLocaleString(); } }),
        },
        scales: {
          x: { grid: { display: false } },
          y: { display: false },
        },
      },
    });

    var rows = [
      ['F2.0', 'Shifted',  488,547,592,624,634,682,702,706,719,730,740],
      ['F2.0', 'Centered', 451,502,'—','—',548,'—','—','—','—','—',676],
      ['F5.5', 'Shifted',  559,621,672,687,700,743,767,778,792,802,802],
      ['F5.5', 'Centered', 495,552,'—','—',560,'—','—','—','—','—',670],
      ['F7.0', 'Shifted',  557,616,691,710,715,764,792,793,841,845,846],
      ['F7.0', 'Centered', 490,552,'—','—',602,'—','—','—','—','—',678],
    ];
    var tbl = mkTableCard(el, 'ANSI CONTRAST — ALL VALUES', 'Shifted vs centered lens · click a column to sort', ['Ap.', 'Lens'].concat(ZOOMS_A), rows, 'tbl-ansi');
    var colors6 = [C.F2.hex,C.F2.hex,C.F55.hex,C.F55.hex,C.F7.hex,C.F7.hex];
    var labels6 = ['F2.0','F2.0','F5.5','F5.5','F7.0','F7.0'];
    var tds = tbl.querySelectorAll('tbody tr td:first-child');
    colors6.forEach(function (col, i) {
      if (tds[i]) tds[i].innerHTML = '<span class="color-dot" style="background:' + col + '"></span>' + labels6[i];
    });
    addViewToggle(el);
  }

  /* ══════════════════════════════════════════════════════
     CHART 6 — ADL Contrast (p2-27)
  ══════════════════════════════════════════════════════ */
  function buildADL(el) {
    mkTitle(el, 'ADL CONTRAST CURVE', 'F7.0 · Shifted lens · ISF Night / D65 · 50% APL = ANSI contrast');

    var row = document.createElement('div');
    row.className = 'chart-row';
    el.appendChild(row);

    var mainWrap = document.createElement('div');
    mainWrap.className = 'chart-main';
    mainWrap.style.height = '480px';
    row.appendChild(mainWrap);

    var ADL_L = ['0%','1%','2%','5%','10%','20%','50%'];
    var ADL = {
      z10: [6100,5861,5721,4830,3870,2320,846],
      z15: [6400,5928,5533,4368,3320,2184,764],
      z20: [4882,4368,4150,3192,2441,1627,557],
    };

    var adlChart = mkChart(mkCanvas(mainWrap), {
      type: 'line',
      data: {
        labels: ADL_L,
        datasets: [
          { label:'Zoom 1.0×', data:ADL.z10, borderColor:'#4FC3F7', backgroundColor:'#4FC3F722', pointBackgroundColor:'#4FC3F7', pointRadius:4, borderWidth:2, tension:0.5, fill:false },
          { label:'Zoom 1.5×', data:ADL.z15, borderColor:'#FFA726', backgroundColor:'#FFA72622', pointBackgroundColor:'#FFA726', pointRadius:4, borderWidth:2, tension:0.5, fill:false },
          { label:'Zoom 2.0×', data:ADL.z20, borderColor:'#EF5350', backgroundColor:'#EF535022', pointBackgroundColor:'#EF5350', pointRadius:4, borderWidth:2, tension:0.5, fill:false },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        clip: false,
        layout: { padding: 0 },
        plugins: {
          legend: { position: 'top', labels: { color: TC.text, boxWidth: 14, padding: 16 } },
          tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }),
        },
        scales: {
          x: { grid: GRID, offset: false, ticks: { align: 'inner' }, afterFit: function (s) { s.paddingLeft = 0; s.paddingRight = 0; } },
          y: { type: 'logarithmic', min: 300, grid: GRID, ticks: {
            maxTicksLimit: 10,
            callback: function (v) {
              var nice = [300,400,500,600,700,800,1000,1200,1500,2000,2500,3000,4000,5000,6000,7000,8000,9000,10000];
              return nice.indexOf(v) >= 0 ? v.toLocaleString() : null;
            }
          } },
        },
      },
    });

    // Expand button — zoom the dark zone (0–5% APL), like the ADL calculator
    var adlTitle = el.querySelector('.cs-title');
    if (adlTitle) {
      var expBtn = document.createElement('button');
      expBtn.className = 'cs-exp-btn';
      expBtn.textContent = '⤢ Expand 1–5%';
      adlTitle.appendChild(expBtn);
      var expanded = false;
      expBtn.addEventListener('click', function () {
        expanded = !expanded;
        expBtn.classList.toggle('on', expanded);
        expBtn.textContent = expanded ? '⤢ Full curve' : '⤢ Expand 1–5%';
        adlChart.options.scales.x.min = expanded ? '0%' : undefined;
        adlChart.options.scales.x.max = expanded ? '5%' : undefined;
        adlChart.options.scales.y.min = expanded ? 2500 : 300;
        adlChart.update();
      });
    }

    // Side: on/off contrast (0% APL) per zoom
    var sideWrapD = document.createElement('div');
    sideWrapD.className = 'chart-side';
    row.appendChild(sideWrapD);
    mkTitle(sideWrapD, 'ON/OFF CONTRAST', 'F7.0 shifted · 0% APL');

    mkChart(mkCanvas(sideWrapD), {
      type: 'bar',
      plugins: DL_PLUGIN,
      data: {
        labels: ['Zoom 1.0×', 'Zoom 1.5×', 'Zoom 2.0×'],
        datasets: [{
          label: 'On/Off',
          data: [ADL.z10[0], ADL.z15[0], ADL.z20[0]],
          backgroundColor: ['#4FC3F7cc', '#FFA726cc', '#EF5350cc'],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: ttOpts(function (v) { return v.toLocaleString() + ':1'; }),
          datalabels: Object.assign({}, DL_OPTS, { formatter: function (v) { return v.toLocaleString() + ':1'; } }),
        },
        scales: {
          x: { grid: { display: false } },
          y: { display: false },
        },
      },
    });

    var rows = [
      ['1.0×'].concat(ADL.z10),
      ['1.5×'].concat(ADL.z15),
      ['2.0×'].concat(ADL.z20),
    ];
    var tbl = mkTableCard(el, 'ADL CONTRAST — F7.0 SHIFTED', 'Contrast vs content brightness (APL) · 0% = on/off · click a column to sort', ['Zoom'].concat(ADL_L), rows, 'tbl-adl');
    var zCols = ['#4FC3F7','#FFA726','#EF5350'];
    var tds = tbl.querySelectorAll('tbody tr td:first-child');
    ['1.0×','1.5×','2.0×'].forEach(function (z, i) {
      if (tds[i]) tds[i].innerHTML = '<span class="color-dot" style="background:' + zCols[i] + '"></span>' + z;
    });
    addViewToggle(el);
  }

  /* ── Init ─────────────────────────────────────────────── */
  var MAP = {
    'chart-brightness': buildBrightness,
    'chart-contrast':   buildContrast,
    'chart-combined':   buildCombined,
    'chart-quality':    buildQuality,
    'chart-ansi':       buildANSI,
    'chart-adl':        buildADL,
  };

  function init() {
    Object.keys(MAP).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) MAP[id](el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Live theme update — re-color all charts when dark/light toggles */
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
      var tt = chart.options.plugins && chart.options.plugins.tooltip;
      if (tt) {
        tt.backgroundColor = TC.ttBg;
        tt.titleColor      = TC.ttTitle;
        tt.bodyColor       = TC.text;
        tt.borderColor     = TC.ttBord;
      }
      var leg = chart.options.plugins && chart.options.plugins.legend;
      if (leg && leg.labels) leg.labels.color = TC.text;
      chart.update('none');
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
