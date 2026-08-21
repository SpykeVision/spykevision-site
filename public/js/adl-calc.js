// ── ADL Contrast Calculator — shared engine for EN + RU pages ──────────────
// Each page defines window.ADL_I18N (UI strings) and window.ADL_LS_SUFFIX
// ('' for EN, '-ru' for RU — keeps per-language saved state separate)
// before loading this file. Functions stay global: the HTML wires them
// via onclick attributes (syncScaleButtons parses those, don't rename).
var L = window.ADL_I18N || {};
var LS = window.ADL_LS_SUFFIX || '';

// ── Palette (matches review charts) ──────────────────────────────────────
var COLORS = [
  '#0a84ff','#ff9500','#34c759','#ff3b30','#af52de',
  '#5ac8fa','#ffcc00','#ff2d55','#30d158','#636366'
];

// ── Tab switching ─────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.calc-tab').forEach(function(t){
    var on = t.dataset.tab===name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.calc-panel').forEach(function(p){ p.classList.toggle('active', p.id==='tab-'+name); });
  localStorage.setItem('sv-calc-tab' + LS, name);
}

// ── Estimate tab ──────────────────────────────────────────────────────────
var estCount = 0;
function addEstimateBlock() {
  var colorIdx = document.querySelectorAll('#estimateBlocks .projector-block').length;
  var color = COLORS[colorIdx % COLORS.length];
  var idx = estCount++;
  var nameNum = colorIdx + 1;
  var div = document.createElement('div');
  div.className = 'projector-block'; div.id = 'eb'+idx;
  div.style.borderLeftColor = color;
  div.innerHTML = '<button class="remove-btn" aria-label="'+L.removeAria+'" onclick="removeBlock(\'eb'+idx+'\')">×</button>'
    + '<div class="proj-name-row"><span class="color-swatch" style="background:'+color+'"></span>'
    + '<input type="text" placeholder="'+L.projPlaceholder+'" value="'+L.projDefault+' '+nameNum+'"></div>'
    + '<div class="calc-grid">'
    + field(L.onoffLabel, 'est-onoff-'+idx, L.eg+' 30000', L.onoffHint)
    + field(L.ansiLabel, 'est-ansi-'+idx, L.eg+' 1000', L.ansiHint)
    + field(L.apl1Label, 'est-apl1-'+idx, L.eg+' 20000', L.optional)
    + field(L.apl5Label, 'est-apl5-'+idx, L.eg+' 10000', L.optional)
    + '</div>';
  document.getElementById('estimateBlocks').appendChild(div);
}

// ── Manual tab ────────────────────────────────────────────────────────────
var manCount = 0;
var APL_POINTS = [0, 0.25, 0.5, 1, 5, 10, 20, 30, 50];
var APL_LABELS = ['On/Off (0%)','0.25%','0.5%','1%','5%','10%','20%','30%','50%'];

function addManualBlock() {
  var colorIdx = document.querySelectorAll('#manualBlocks .projector-block').length;
  var color = COLORS[colorIdx % COLORS.length];
  var idx = manCount++;
  var nameNum = colorIdx + 1;
  var div = document.createElement('div');
  div.className = 'projector-block'; div.id = 'mb'+idx;
  div.style.borderLeftColor = color;
  var fields = APL_POINTS.map(function(apl,i){
    return field(APL_LABELS[i]+' '+L.contrastWord,'man-'+idx+'-'+i, L.eg+' '+ Math.round(1/(1/30000 + 1.29e-5*apl*(1+0.01*apl))/100)*100, L.optional);
  }).join('');
  div.innerHTML = '<button class="remove-btn" aria-label="'+L.removeAria+'" onclick="removeBlock(\'mb'+idx+'\')">×</button>'
    + '<div class="proj-name-row"><span class="color-swatch" style="background:'+color+'"></span>'
    + '<input type="text" placeholder="'+L.projPlaceholder+'" value="'+L.projDefault+' '+nameNum+'"></div>'
    + '<div class="calc-grid">' + fields + '</div>';
  document.getElementById('manualBlocks').appendChild(div);
}

function field(label, id, ph, hint) {
  return '<div class="calc-field"><label for="'+id+'">'+label+'</label>'
    + '<input type="number" id="'+id+'" min="0" placeholder="'+ph+'">'
    + (hint ? '<span class="hint">'+hint+'</span>' : '')
    + '</div>';
}
function removeBlock(id) {
  var el=document.getElementById(id);
  if(el) {
    var which = id.charAt(0) === 'e' ? 'estimate' : 'manual';
    el.remove();
    saveCalcState();
    scheduleRecalc(which);
  }
}

// ── Chart helpers ─────────────────────────────────────────────────────────
var charts = {};
var scalePref  = {
  estimateChart: localStorage.getItem('sv-scale-estimate' + LS) || 'logarithmic',
  manualChart:   localStorage.getItem('sv-scale-manual' + LS)   || 'logarithmic'
};
var xExpandPref = {
  estimateChart: localStorage.getItem('sv-xexpand-estimate' + LS) === 'true',
  manualChart:   localStorage.getItem('sv-xexpand-manual' + LS)   === 'true'
};

// Smooth power x-axis: stretches the low end so 5% ADL lands at the middle
// (display 25) with no slope break — power p makes (5/50)^p = 0.5.
var XEXP_P = Math.log(0.5) / Math.log(5 / 50);   // ≈ 0.301
function adlToDisplay(apl, expanded) {
  if (!expanded) return apl;
  return 50 * Math.pow(apl / 50, XEXP_P);
}
function displayToAdl(d, expanded) {
  if (!expanded) return d;
  return 50 * Math.pow(d / 50, 1 / XEXP_P);
}
var EXPAND_ADL_TICKS = [0, 0.25, 0.5, 1, 2, 3, 4, 5, 10, 20, 30, 50];
var chartRange = { estimateChart:null,     manualChart:null };   // {min,max} of plotted data

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

function getOrCreateChart(canvasId) {
  if (charts[canvasId]) { charts[canvasId].destroy(); }
  var ctx = document.getElementById(canvasId).getContext('2d');
  var mob = window.innerWidth < 640;
  var dark = isDark();
  var labelColor = dark ? '#ffffff' : '#8e8e93';
  var gridColor  = dark ? 'rgba(255,255,255,.15)' : 'rgba(142,142,147,.15)';
  var tooltipBg  = dark ? 'rgba(0,0,0,.92)' : 'rgba(28,28,30,.92)';
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { position:'bottom', labels:{ color:labelColor,
          font:{size: mob ? 11 : 13, weight:'600'},
          padding: mob ? 8 : 16,
          usePointStyle:true,
          boxWidth: mob ? 10 : 14, boxHeight: mob ? 10 : 14,
          filter: function(item){ return item.text.indexOf(L.measuredSuffix) === -1; }
        }},
        tooltip: { backgroundColor:tooltipBg, titleColor:'#f2f2f7', bodyColor:'#ebebf5cc',
          padding:12, cornerRadius:10,
          filter: function(item){ return item.dataset.label !== L.crossover; },
          callbacks: {
            title: function(items){ if (!items.length) return ''; var r=displayToAdl(items[0].parsed.x,xExpandPref[canvasId]); return 'ADL: '+(r<1?r.toFixed(2):r.toFixed(1))+'%'; },
            label: function(ctx){ return ' '+ctx.dataset.label+': '+Math.round(ctx.parsed.y).toLocaleString()+':1'; }
          }
        }
      },
      scales: {
        x: { type:'linear', min:0, max:50,
          title:{display:!mob,text:L.xTitle,color:labelColor,font:{size:12}},
          ticks:{color:labelColor,font:{size: mob ? 10 : 12},
            callback: function(v){ var r=displayToAdl(v,xExpandPref[canvasId]); return (r<1?r.toFixed(2):Number.isInteger(r)?r:r.toFixed(1))+'%'; }
          },
          afterBuildTicks: xExpandPref[canvasId] ? function(axis){
            axis.ticks = EXPAND_ADL_TICKS.map(function(v){ return {value:adlToDisplay(v,true)}; });
          } : undefined,
          grid:{color:gridColor} },
        y: { type: scalePref[canvasId],
          title:{display:!mob,text:L.yTitle,color:labelColor,font:{size:12}},
          ticks:{color:labelColor,font:{size: mob ? 10 : 12}, callback:function(v){return v>=1000?Math.round(v/1000)+'k:1':v+':1';}},
          grid:{color:gridColor} }
      }
    },
    plugins: [{
      id: 'svOverlay',
      afterDraw: function(chart) {
        var a = chart.chartArea; if (!a) return;
        var g = chart.ctx;
        var cx = (a.left+a.right)/2, cy = (a.top+a.bottom)/2;
        // Watermark: logo + text, centred in chart area
        g.save();
        g.globalAlpha = 0.11;
        var chartW = a.right - a.left, chartH = a.bottom - a.top;
        var logoSz = Math.max(20, Math.round(Math.min(chartW, chartH) * 0.08));
        var fontSize = Math.max(12, Math.round(logoSz * 0.65));
        var gap = Math.round(logoSz * 0.27);
        g.font = 'bold ' + fontSize + 'px -apple-system,BlinkMacSystemFont,sans-serif';
        var tw = g.measureText('SpykeVision.com').width;
        var lx = cx - (logoSz + gap + tw) / 2;
        // Draw pinwheel blades (replicates the SVG logo)
        var bladeAngles = [0,60,120,180,240,300];
        var bladeColors = ['#0a84ff','#0a84ff','#ff9500','#0a84ff','#0a84ff','#0a84ff'];
        var sc = logoSz / 32;
        bladeAngles.forEach(function(deg, k) {
          g.save();
          g.translate(lx + logoSz/2, cy);
          g.rotate(deg * Math.PI / 180);
          g.scale(sc, sc);
          g.translate(-16, -16);
          g.beginPath(); g.moveTo(29,16); g.lineTo(22.5,27.26); g.lineTo(18,19.46); g.closePath();
          g.fillStyle = bladeColors[k]; g.fill();
          g.restore();
        });
        // Text
        g.fillStyle = isDark() ? 'rgba(255,255,255,0.5)' : '#8e8e93';
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText('SpykeVision.com', lx + logoSz + gap, cy);
        g.restore();
        // Crossover annotations
        var xSc = chart.scales.x, ySc = chart.scales.y;
        if (!xSc || !ySc) return;
        chart.data.datasets.forEach(function(ds) {
          if (ds.label !== L.crossover || !ds.data) return;
          g.save();
          g.font = '600 11px -apple-system,BlinkMacSystemFont,sans-serif';
          ds.data.forEach(function(pt) {
            var px = xSc.getPixelForValue(pt.x);
            var py = ySc.getPixelForValue(pt.y);
            if (px < a.left || px > a.right || py < a.top || py > a.bottom) return;
            var rx = displayToAdl(pt.x, xExpandPref[chart.canvas.id]);
            var txt = (rx<1?rx.toFixed(2):rx.toFixed(1)) + '% · ' + Math.round(pt.y).toLocaleString() + ':1';
            var tw = g.measureText(txt).width + 10, th = 16;
            var lx = px + 10, ly = py - th - 6;
            if (lx + tw > a.right) lx = px - tw - 10;
            if (ly < a.top) ly = py + 6;
            g.fillStyle = isDark() ? 'rgba(0,0,0,0.85)' : 'rgba(28,28,30,0.82)';
            g.beginPath(); g.rect(lx, ly, tw, th); g.fill();
            g.fillStyle = '#f2f2f7';
            g.textAlign = 'left'; g.textBaseline = 'top';
            g.fillText(txt, lx + 5, ly + 2);
          });
          g.restore();
        });
      }
    }]
  });
  // Hide tooltip when finger lifts (prevents stuck tooltip on mobile)
  ctx.canvas.addEventListener('touchend', function() {
    if (charts[canvasId]) {
      charts[canvasId].tooltip.setActiveElements([], {x:0, y:0});
      charts[canvasId].update('none');
    }
  }, { passive: true });
  return charts[canvasId];
}

function clearChart(id) {
  chartRange[id] = null;
  autoPlot[id] = false;
  getOrCreateChart(id);     // fresh empty chart
  applyYScale(id);
  charts[id].update();
}

// Round up to next "nice" linear ceiling with ~25% headroom above max
function niceLinearMax(max) {
  var target = max * 1.25;
  var mag = Math.pow(10, Math.floor(Math.log10(target)));
  var norm = target / mag;
  var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];
  for (var k = 0; k < steps.length; k++) { if (steps[k] >= norm) return steps[k] * mag; }
  return 10 * mag;
}

// ── Apply y-axis scale (used on build AND on toggle, so they never diverge) ─
function applyYScale(canvasId) {
  var chart = charts[canvasId]; if (!chart) return;
  var y = chart.options.scales.y;
  var r = chartRange[canvasId];
  if (scalePref[canvasId] === 'logarithmic') {
    y.type = 'logarithmic';
    var lo = r ? r.min : 100, hi = r ? r.max : 30000;
    var ticks = niceLogTicks(lo, hi);
    y.min = ticks[0];
    y.max = ticks[ticks.length - 1];
    y.afterBuildTicks = function(axis){ axis.ticks = ticks.map(function(v){ return {value:v}; }); };
  } else {
    y.type = 'linear';
    y.afterBuildTicks = undefined;
    y.min = 0;
    y.max = r ? niceLinearMax(r.max) : 30000;   // headroom above data; 30k for empty chart
  }
}

// ── Toolbar: log/linear toggle ────────────────────────────────────────────
function toggleScale(canvasId, btn) {
  var next = scalePref[canvasId]==='logarithmic' ? 'linear' : 'logarithmic';
  scalePref[canvasId] = next;
  localStorage.setItem('sv-scale-' + (canvasId === 'estimateChart' ? 'estimate' : 'manual') + LS, next);
  btn.textContent = next==='logarithmic' ? L.logScale : L.linearScale;
  btn.classList.toggle('active', next==='logarithmic');
  applyYScale(canvasId);
  if (charts[canvasId]) charts[canvasId].update();
}

// Sync button state to the saved scale preference
function syncScaleButtons() {
  document.querySelectorAll('.chart-tool[data-scale="log"]').forEach(function(btn) {
    var canvasId = btn.getAttribute('onclick').match(/'(\w+)'/)[1];
    var isLog = scalePref[canvasId] === 'logarithmic';
    btn.textContent = isLog ? L.logScale : L.linearScale;
    btn.classList.toggle('active', isLog);
  });
}

// ── Toolbar: x-axis expand (0–5% zoom) ────────────────────────────────────
function toggleXExpand(canvasId, btn) {
  var next = !xExpandPref[canvasId];
  xExpandPref[canvasId] = next;
  localStorage.setItem('sv-xexpand-' + (canvasId === 'estimateChart' ? 'estimate' : 'manual') + LS, next ? 'true' : 'false');
  btn.textContent = next ? L.fullRange : L.expandLow;
  btn.classList.toggle('active', next);
  if (canvasId === 'estimateChart') buildEstimateChart();
  else buildManualChart();
}
function syncXExpandButtons() {
  document.querySelectorAll('.chart-tool[data-xexpand]').forEach(function(btn) {
    var cid = btn.getAttribute('data-xexpand');
    var on = xExpandPref[cid];
    btn.textContent = on ? L.fullRange : L.expandLow;
    btn.classList.toggle('active', on);
  });
}

// ── Toolbar: expand / fullscreen ──────────────────────────────────────────
function toggleExpand(wrapId, canvasId, btn) {
  var wrap = document.getElementById(wrapId);
  var expanded = wrap.classList.toggle('expanded');
  document.body.classList.toggle('no-scroll', expanded);
  btn.textContent = expanded ? L.closeBtn : L.expandBtn;
  setTimeout(function(){ if (charts[canvasId]) charts[canvasId].resize(); }, 60);
}
document.addEventListener('keydown', function(e){
  if (e.key==='Escape') {
    document.querySelectorAll('.chart-wrap.expanded').forEach(function(w){
      w.classList.remove('expanded'); document.body.classList.remove('no-scroll');
      var c = w.querySelector('canvas'); if (c && charts[c.id]) setTimeout(function(){charts[c.id].resize();},60);
      var b = w.querySelector('.chart-tool[onclick*="toggleExpand"]'); if (b) b.textContent=L.expandBtn;
    });
  }
});

// ── Toolbar: save PNG ─────────────────────────────────────────────────────
function savePNG(canvasId, filename) {
  var chart = charts[canvasId];
  if (!chart) { alert(L.plotFirst); return; }
  var src = chart.canvas;
  var out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;   // native (DPR-scaled) resolution
  var g = out.getContext('2d');
  // solid background so PNG isn't transparent
  var bg = getComputedStyle(document.querySelector('.chart-wrap')).backgroundColor || '#ffffff';
  g.fillStyle = bg; g.fillRect(0,0,out.width,out.height);
  g.drawImage(src, 0, 0);
  var a = document.createElement('a');
  a.download = filename + '.png';
  a.href = out.toDataURL('image/png');
  a.click();
}

// ── Estimate: interpolate through measured points ─────────────────────────
// Physical model, calibrated against 20 measured projectors (LCOS + DLP).
// The dark-state leak (1/CR) rises roughly linearly with ADL, so we work in
// 1/CR space: through the low points (On/Off at 0% plus 1% and/or 5% ADL) the
// black level interpolates linearly, and the tail extrapolates that slope with
// a mild steepening term (1+0.01·d) that matches the real roll-off past 5%.
// ANSI (50% ADL) isn't used as a hard node — chording to it misses the bend —
// instead it pulls the tail: a smooth log-space correction that ramps from the
// last low point up to 50%, landing exactly on the entered ANSI value. The
// curve still passes through every entered measurement exactly. This cut the
// mean error at 50% from ~45% (old power-law) to ~11%.
function interpAt(nodes, apl) {
  // Low nodes = On/Off (0%) + 1%/5% ADL; ANSI (50%) is handled separately.
  var low = nodes.filter(function(n){ return n.apl <= 5; });
  low.sort(function(a, b){ return a.apl - b.apl; });
  var ansiNode = null;
  for (var i = 0; i < nodes.length; i++) if (nodes[i].apl === 50) ansiNode = nodes[i];

  // Base curve: linear in 1/CR through the low nodes, steepening extrapolation.
  function basePred(x) {
    if (x <= 0 || low.length === 1) return low[0].cr;
    for (var i = 1; i < low.length; i++) {
      if (x <= low[i].apl) {
        var a = low[i-1], b = low[i], ya = 1/a.cr, yb = 1/b.cr;
        var f = (x - a.apl) / (b.apl - a.apl);
        return 1 / (ya + f*(yb - ya));
      }
    }
    var p = low[low.length-2], q = low[low.length-1];
    var slope = (1/q.cr - 1/p.cr) / (q.apl - p.apl), d = x - q.apl;
    return 1 / (1/q.cr + slope*d*(1 + 0.01*d));
  }

  var base = basePred(apl);
  if (!ansiNode) return base;

  // ANSI pull: ramp a log-space correction from the last low node up to 50%.
  var lowmax = low[low.length-1].apl;
  var f50 = ansiNode.cr / basePred(50);
  var t = (apl - lowmax) / (50 - lowmax);
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return base * Math.pow(f50, t);
}

// Clean 1-2-5 logarithmic ticks (matches industry charts like projectiondream).
// Adds `padDown` extra steps below the minimum so the lowest point (typically
// ANSI, rarely >1000) sits comfortably above the axis floor instead of on it.
function niceLogTicks(min, max, padDown, padUp) {
  padDown = padDown == null ? 2 : padDown;
  padUp   = padUp   == null ? 2 : padUp;
  var mults = [1, 2, 5], ladder = [];
  var d = Math.pow(10, Math.floor(Math.log10(min)) - 2);
  while (d <= max * 100) {
    for (var k = 0; k < mults.length; k++) ladder.push(d * mults[k]);
    d *= 10;
  }
  // lo: step down padDown rungs below min; hi: step up padUp rungs above max
  var lo = 0, hi = 0;
  for (var i = 0; i < ladder.length; i++) {
    if (ladder[i] <= min) lo = i;
    if (ladder[i] <= max) hi = i;
  }
  lo = Math.max(0, lo - padDown);
  hi = Math.min(ladder.length - 1, hi + padUp);
  return ladder.slice(lo, hi + 1);
}

// ── Intersection detection (both charts) ─────────────────────────────────
// Proper segment-segment intersection — works even when curves have different
// x-grids (manual chart) or different lengths (one curve ends early).
function addIntersections(chart) {
  var lines = chart.data.datasets.filter(function(d) {
    return (!d.type || d.type === 'line') && d.data && d.data.length > 1;
  });
  if (lines.length < 2) return;
  var crossPts = [];
  for (var i = 0; i < lines.length - 1; i++) {
    for (var j = i + 1; j < lines.length; j++) {
      var d1 = lines[i].data, d2 = lines[j].data;
      for (var a = 0; a < d1.length - 1; a++) {
        var x1=d1[a].x, y1=d1[a].y, x2=d1[a+1].x, y2=d1[a+1].y;
        for (var b = 0; b < d2.length - 1; b++) {
          var x3=d2[b].x, y3=d2[b].y, x4=d2[b+1].x, y4=d2[b+1].y;
          var xlo=Math.max(x1,x3), xhi=Math.min(x2,x4);
          if (xlo >= xhi) continue;
          var yAlo = y1 + (xlo-x1)/(x2-x1)*(y2-y1);
          var yAhi = y1 + (xhi-x1)/(x2-x1)*(y2-y1);
          var yBlo = y3 + (xlo-x3)/(x4-x3)*(y4-y3);
          var yBhi = y3 + (xhi-x3)/(x4-x3)*(y4-y3);
          var dlo = yAlo-yBlo, dhi = yAhi-yBhi;
          if (dlo * dhi < 0) {
            var f = dlo / (dlo - dhi);
            crossPts.push({
              x: Math.round((xlo + f*(xhi-xlo)) * 10) / 10,
              y: Math.round(yAlo + f*(yAhi-yAlo))
            });
          }
        }
      }
    }
  }
  if (!crossPts.length) return;
  var mob = window.innerWidth < 640;
  chart.data.datasets.push({
    label: L.crossover,
    data: crossPts, type: 'scatter',
    borderColor: '#ff9500', backgroundColor: '#fff',
    borderWidth: mob ? 2 : 3, pointRadius: mob ? 6 : 9, pointHoverRadius: mob ? 8 : 12,
    pointStyle: 'crossRot', showLine: false
  });
}

// Expand chartRange min/max to include crossover y-values so log scale
// doesn't clip the intersection marker below the visible axis.
function expandRangeForCrossovers(chart, cid) {
  var r = chartRange[cid]; if (!r) return;
  chart.data.datasets.forEach(function(d) {
    if (d.label === L.crossover && d.data) {
      d.data.forEach(function(pt) {
        if (pt.y < r.min) r.min = pt.y;
        if (pt.y > r.max) r.max = pt.y;
      });
    }
  });
}

// Dismiss all chart tooltips on touch end anywhere on the page
document.addEventListener('touchend', function() {
  ['estimateChart', 'manualChart'].forEach(function(id) {
    if (charts[id]) {
      charts[id].tooltip.setActiveElements([], {x:0, y:0});
      charts[id].update('none');
    }
  });
}, { passive: true });

// ── Validation ────────────────────────────────────────────────────────────
// ANSI (50% ADL) can't physically exceed On/Off (0% ADL) — flag and skip.
function validateEstimateBlock(block, onoff, ansi) {
  var id = block.id.replace('eb','');
  var ansiEl = document.getElementById('est-ansi-'+id);
  var bad = onoff > 0 && ansi > 0 && ansi >= onoff;
  ansiEl.classList.toggle('input-invalid', bad);
  var warn = block.querySelector('.calc-warn');
  if (bad) {
    if (!warn) { warn = document.createElement('div'); warn.className = 'calc-warn'; block.appendChild(warn); }
    warn.textContent = L.ansiWarn;
  } else if (warn) {
    warn.remove();
  }
  return !bad;
}

function buildEstimateChart() {
  var chart = getOrCreateChart('estimateChart');
  autoPlot.estimateChart = true;
  var mob = window.innerWidth < 640;
  var pt = mob ? 4 : 6, ptH = mob ? 5 : 8;
  var blocks = document.getElementById('estimateBlocks').querySelectorAll('.projector-block');
  var colorIdx = 0;
  var dataMin = Infinity, dataMax = -Infinity;
  blocks.forEach(function(block){
    var name = block.querySelector('.proj-name-row input').value || L.projDefault;
    var id = block.id.replace('eb','');
    var onoff = parseFloat(document.getElementById('est-onoff-'+id).value);
    var ansi  = parseFloat(document.getElementById('est-ansi-'+id).value);
    var apl1  = parseFloat(document.getElementById('est-apl1-'+id).value);
    var apl5  = parseFloat(document.getElementById('est-apl5-'+id).value);
    if (!validateEstimateBlock(block, onoff, ansi)) return;
    if (!onoff || onoff <= 0) return;
    // Build sorted node list (On/Off at 0% + every measured point)
    var nodes = [{apl:0, cr:onoff}];
    if (apl1  > 0) nodes.push({apl:1,  cr:apl1});
    if (apl5  > 0) nodes.push({apl:5,  cr:apl5});
    if (ansi  > 0) nodes.push({apl:50, cr:ansi});
    nodes.sort(function(a,b){ return a.apl - b.apl; });
    // Interpolate the full curve through the nodes
    var pts = [];
    var expanded = xExpandPref['estimateChart'];
    // Sample uniformly in display space so the rendered line stays smooth
    // even where the x-axis transform stretches the low end.
    for (var d=0; d<=50; d+=0.5) {
      var apl = displayToAdl(d, expanded);
      var y = interpAt(nodes, apl);
      pts.push({ x:d, y: y });
      if (y < dataMin) dataMin = y;
      if (y > dataMax) dataMax = y;
    }
    var color = COLORS[colorIdx++ % COLORS.length];
    chart.data.datasets.push({
      label: name + L.estimatedSuffix,
      data: pts, borderColor: color, backgroundColor: 'transparent',
      borderWidth: 2.5, pointRadius: 0, tension: 0, fill: false
    });
    // Measured points sit exactly on the curve
    chart.data.datasets.push({
      label: name + L.measuredSuffix,
      data: nodes.map(function(n){return{x:adlToDisplay(n.apl,expanded),y:n.cr};}), type:'scatter',
      borderColor: color, backgroundColor: color,
      pointRadius: pt, pointHoverRadius: ptH, showLine: false
    });
  });
  chartRange.estimateChart = isFinite(dataMin) && isFinite(dataMax) ? {min:dataMin, max:dataMax} : null;
  addIntersections(chart);
  expandRangeForCrossovers(chart, 'estimateChart');
  applyYScale('estimateChart');
  chart.update();
}

// ── Manual: plot known points ─────────────────────────────────────────────
function buildManualChart() {
  var chart = getOrCreateChart('manualChart');
  autoPlot.manualChart = true;
  var mob = window.innerWidth < 640;
  var pt = mob ? 4 : 5, ptH = mob ? 5 : 7;
  var blocks = document.getElementById('manualBlocks').querySelectorAll('.projector-block');
  var colorIdx = 0;
  var dataMin = Infinity, dataMax = -Infinity;
  blocks.forEach(function(block){
    var name = block.querySelector('.proj-name-row input').value || L.projDefault;
    var id = block.id.replace('mb','');
    var pts = [];
    var expanded = xExpandPref['manualChart'];
    APL_POINTS.forEach(function(apl,i){
      var v = parseFloat(document.getElementById('man-'+id+'-'+i).value);
      if (v > 0) { pts.push({x: adlToDisplay(apl,expanded), y: v}); if (v<dataMin) dataMin=v; if (v>dataMax) dataMax=v; }
    });
    if (!pts.length) return;
    var color = COLORS[colorIdx++ % COLORS.length];
    chart.data.datasets.push({
      label: name,
      data: pts, borderColor: color, backgroundColor: 'transparent',
      borderWidth: 2.5, pointRadius: pt, pointHoverRadius: ptH,
      cubicInterpolationMode: 'monotone', fill: false
    });
  });
  chartRange.manualChart = isFinite(dataMin) && isFinite(dataMax) ? {min:dataMin, max:dataMax} : null;
  addIntersections(chart);
  expandRangeForCrossovers(chart, 'manualChart');
  applyYScale('manualChart');
  chart.update();
}

// ── Auto-recalc ───────────────────────────────────────────────────────────
// After the user has plotted once, edits re-plot automatically (debounced).
// autoPlot resets on "Clear chart" so a cleared chart stays cleared.
var autoPlot = { estimateChart:false, manualChart:false };
var recalcTimers = {};
function scheduleRecalc(which) {
  clearTimeout(recalcTimers[which]);
  recalcTimers[which] = setTimeout(function() {
    if (which === 'estimate' && autoPlot.estimateChart) buildEstimateChart();
    if (which === 'manual'   && autoPlot.manualChart)   buildManualChart();
  }, 500);
}

// ── Persist inputs across reloads ────────────────────────────────────────
function saveCalcState() {
  var estData = [];
  document.querySelectorAll('#estimateBlocks .projector-block').forEach(function(block) {
    var id = block.id.replace('eb','');
    estData.push({
      name:  block.querySelector('.proj-name-row input').value,
      onoff: document.getElementById('est-onoff-'+id).value,
      ansi:  document.getElementById('est-ansi-'+id).value,
      apl1:  document.getElementById('est-apl1-'+id).value,
      apl5:  document.getElementById('est-apl5-'+id).value
    });
  });
  localStorage.setItem('sv-calc-estimate' + LS, JSON.stringify(estData));

  var manData = [];
  document.querySelectorAll('#manualBlocks .projector-block').forEach(function(block) {
    var id = block.id.replace('mb','');
    manData.push({
      name: block.querySelector('.proj-name-row input').value,
      vals: APL_POINTS.map(function(apl, i) {
        var el = document.getElementById('man-'+id+'-'+i);
        return el ? el.value : '';
      })
    });
  });
  localStorage.setItem('sv-calc-manual' + LS, JSON.stringify(manData));
}

function loadCalcState() {
  // Estimate blocks
  var estLoaded = false;
  try {
    var estData = JSON.parse(localStorage.getItem('sv-calc-estimate' + LS) || '[]');
    if (estData.length) {
      estCount = 0;
      estData.forEach(function(d) {
        addEstimateBlock();
        var idx = estCount - 1;
        document.querySelector('#eb'+idx+' .proj-name-row input').value = d.name || '';
        if (d.onoff) document.getElementById('est-onoff-'+idx).value = d.onoff;
        if (d.ansi)  document.getElementById('est-ansi-'+idx).value  = d.ansi;
        if (d.apl1)  document.getElementById('est-apl1-'+idx).value  = d.apl1;
        if (d.apl5)  document.getElementById('est-apl5-'+idx).value  = d.apl5;
      });
      estLoaded = true;
    }
  } catch(e) {}
  if (!estLoaded) addEstimateBlock();

  // Manual blocks
  var manLoaded = false;
  try {
    var manData = JSON.parse(localStorage.getItem('sv-calc-manual' + LS) || '[]');
    if (manData.length) {
      manCount = 0;
      manData.forEach(function(d) {
        addManualBlock();
        var idx = manCount - 1;
        document.querySelector('#mb'+idx+' .proj-name-row input').value = d.name || '';
        if (d.vals) d.vals.forEach(function(v, i) {
          var el = document.getElementById('man-'+idx+'-'+i);
          if (el && v) el.value = v;
        });
      });
      manLoaded = true;
    }
  } catch(e) {}
  if (!manLoaded) addManualBlock();

  // Active tab
  var savedTab = localStorage.getItem('sv-calc-tab' + LS);
  if (savedTab && savedTab !== 'estimate') switchTab(savedTab);

  // Wire up auto-save + debounced auto-recalc on any input change
  document.getElementById('estimateBlocks').addEventListener('input', function() {
    saveCalcState(); scheduleRecalc('estimate');
  });
  document.getElementById('manualBlocks').addEventListener('input', function() {
    saveCalcState(); scheduleRecalc('manual');
  });
}

// Show an empty axis grid on load (instead of a blank white box)
function initEmptyChart(canvasId) {
  getOrCreateChart(canvasId);
  applyYScale(canvasId);
  charts[canvasId].update();
}

loadCalcState();
syncScaleButtons();
syncXExpandButtons();
initEmptyChart('estimateChart');
initEmptyChart('manualChart');

// Re-render charts on theme change so colors update
document.getElementById('themeToggle').addEventListener('click', function() {
  setTimeout(function() {
    ['estimateChart','manualChart'].forEach(function(id) {
      if (charts[id]) { var ds = charts[id].data.datasets; getOrCreateChart(id); charts[id].data.datasets = ds; applyYScale(id); charts[id].update(); }
    });
  }, 0);
});
