/* Calculator-style interactive contrast cards for reviews.
   Self-guarded: only runs if a .contrast-card element exists on the page.
   Renders Native Contrast and ADL Contrast as cards matching the calculator
   design language (light theme, site palette). No external deps. */
(function () {
  'use strict';
  var cards = document.querySelectorAll('.contrast-card');
  if (!cards.length) return;

  /* ---- data (same measurements as charts-tnm.js) ---- */
  var ZOOMS = ['2.1×','2.0×','1.9×','1.8×','1.7×','1.6×','1.5×','1.4×','1.3×','1.2×','1.1×','1.0×'];
  var AP = ['F2','F3','F4','F5.5','F7'];
  var CR = {
    'F2':  [1670,1743,1844,1955,2030,2112,2195,2189,2179,2210,2200,2217],
    'F3':  [3090,3394,3523,3645,3725,3867,3918,3895,3888,2920,2890,2915],
    'F4':  [4157,3956,4126,4370,4421,4568,4579,4465,4468,3223,3208,3269],
    'F5.5':[6176,4426,4647,4909,4944,5127,5183,4857,5033,4348,4425,4540],
    'F7':  [8650,6041,6274,5625,5658,5930,5957,5532,5560,4947,5048,5198]
  };
  var ADL_L = ['0%','1%','2%','5%','10%','20%','50%'];
  var ADL = {
    '1.0×':[6100,5861,5721,4830,3870,2320,846],
    '1.5×':[6400,5928,5533,4368,3320,2184,764],
    '2.0×':[4882,4368,4150,3192,2441,1627,557]
  };

  /* ---- one-time CSS ---- */
  var css = '\
  .cc{background:var(--surface,#fff);border:1px solid var(--border,#e2e2e7);border-radius:var(--radius,18px);box-shadow:var(--shadow,0 1px 3px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.06));overflow:hidden;margin:24px 0;font-family:var(--font,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif)}\
  .cc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 0}\
  .cc-head .t{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3,#8e8e93)}\
  .cc-head .h{font-size:21px;font-weight:700;letter-spacing:-.02em;margin-top:3px;color:var(--text,#1c1c1e)}\
  .cc-head .sub{font-size:13px;color:var(--text-3,#8e8e93);margin-top:4px;max-width:46ch}\
  .cc-exp{flex:none;border:1px solid var(--border,#e2e2e7);background:var(--surface-2,#f5f5f7);color:var(--text-2,#3a3a3c);font-size:13px;font-weight:600;padding:8px 14px;border-radius:980px;cursor:pointer;transition:.15s;white-space:nowrap}\
  .cc-exp:hover{border-color:var(--accent,#007aff);color:var(--accent,#007aff)}\
  .cc-exp.on{background:var(--accent,#007aff);color:#fff;border-color:var(--accent,#007aff)}\
  .cc-chips{display:flex;flex-wrap:wrap;gap:7px;padding:16px 22px 4px}\
  .cc-chip{font-size:13px;font-weight:500;padding:7px 14px;border:1px solid var(--border,#e2e2e7);border-radius:980px;color:var(--text-2,#3a3a3c);cursor:pointer;transition:.15s;background:var(--surface,#fff)}\
  .cc-chip:hover{border-color:var(--accent,#007aff)}\
  .cc-chip.on{background:var(--accent,#007aff);color:#fff;border-color:var(--accent,#007aff);font-weight:600}\
  .cc-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:14px 22px 6px}\
  .cc-tile{background:var(--surface-2,#f5f5f7);border-radius:12px;padding:16px 14px;text-align:center}\
  .cc-tile .n{font-size:26px;font-weight:700;letter-spacing:-.02em;color:var(--text,#1c1c1e)}\
  .cc-tile .n .u{font-size:14px;color:var(--text-3,#8e8e93);font-weight:400}\
  .cc-tile .l{font-size:12px;color:var(--text-3,#8e8e93);margin-top:5px}\
  .cc-rows{padding:8px 22px 20px}\
  .cc-row{display:grid;grid-template-columns:74px 92px 1fr;align-items:center;gap:14px;padding:9px 0;border-bottom:1px solid var(--border,#e2e2e7)}\
  .cc-row:last-child{border-bottom:0}\
  .cc-row.dim{opacity:.32}\
  .cc-row .k{font-size:14px;font-weight:600;color:var(--text,#1c1c1e)}\
  .cc-row .v{font-size:14px;font-variant-numeric:tabular-nums;color:var(--text-2,#3a3a3c);text-align:right}\
  .cc-bar{height:9px;background:var(--surface-2,#ececed);border-radius:980px;overflow:hidden}\
  .cc-bar i{display:block;height:100%;width:0;border-radius:980px;background:linear-gradient(90deg,var(--accent,#007aff),#4aa3ff);transition:width .5s cubic-bezier(.2,.7,.2,1)}\
  .cc-foot{font-size:12px;color:var(--text-3,#8e8e93);padding:0 22px 18px;display:flex;align-items:center;gap:7px}\
  .cc-foot .dot{width:6px;height:6px;border-radius:50%;background:var(--accent,#007aff)}\
  @media(max-width:560px){.cc-tiles{grid-template-columns:1fr}.cc-row{grid-template-columns:60px 80px 1fr;gap:10px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function fmt(v){ return v.toLocaleString() + ':1'; }

  /* animate bar widths after insertion */
  function paint(rows){ requestAnimationFrame(function(){ rows.forEach(function(r){ r.bar.style.width = r.pct + '%'; }); }); }

  /* ---------- ADL CONTRAST CARD ---------- */
  function buildADL(host){
    var zoomKeys = Object.keys(ADL);
    var state = { zoom: '1.5×', expanded: false };
    host.className = 'cc';
    var head = el('div','cc-head');
    head.appendChild(el('div', null,
      '<div class="t">ADL Contrast Curve</div>'+
      '<div class="h">Contrast vs. content brightness</div>'+
      '<div class="sub">F7.0 · shifted lens · ISF Night / D65. 0% APL = on/off black, 50% APL ≈ ANSI.</div>'));
    var expBtn = el('button','cc-exp','⤢ Expand 1–5%');
    head.appendChild(expBtn);
    host.appendChild(head);

    var chips = el('div','cc-chips');
    zoomKeys.forEach(function(z){
      var c = el('button','cc-chip'+(z===state.zoom?' on':''), 'Zoom '+z);
      c.onclick = function(){ state.zoom=z; render(); };
      chips.appendChild(c);
    });
    host.appendChild(chips);

    var tiles = el('div','cc-tiles'); host.appendChild(tiles);
    var rowsWrap = el('div','cc-rows'); host.appendChild(rowsWrap);
    var foot = el('div','cc-foot'); host.appendChild(foot);

    expBtn.onclick = function(){ state.expanded = !state.expanded; render(); };

    function render(){
      // chips active
      Array.prototype.forEach.call(chips.children, function(c){
        c.classList.toggle('on', c.textContent === 'Zoom '+state.zoom);
      });
      expBtn.classList.toggle('on', state.expanded);
      expBtn.textContent = state.expanded ? '⤢ Full curve' : '⤢ Expand 1–5%';

      var data = ADL[state.zoom];
      // indices shown
      var idx = state.expanded ? [0,1,2,3] : data.map(function(_,i){return i;}); // 0%,1%,2%,5% when expanded
      var shown = idx.map(function(i){ return data[i]; });
      var max = Math.max.apply(null, shown), min = Math.min.apply(null, shown);
      // expanded view amplifies differences (baseline = min); full view = 0..max
      function pct(v){
        if(state.expanded){ return 12 + (v-min)/(max-min||1)*88; }
        return v/max*100;
      }

      // tiles: on/off (0%), dark-scene (1%), ANSI (50%)
      tiles.innerHTML='';
      [['On/Off (0%)',data[0]],['Dark scene (1%)',data[1]],['ANSI (50%)',data[6]]].forEach(function(t){
        tiles.appendChild(el('div','cc-tile',
          '<div class="n">'+t[1].toLocaleString()+'<span class="u">:1</span></div><div class="l">'+t[0]+'</div>'));
      });

      // rows
      rowsWrap.innerHTML='';
      var barRefs=[];
      ADL_L.forEach(function(lab,i){
        var inSet = idx.indexOf(i) !== -1;
        var row = el('div','cc-row'+(inSet?'':' dim'));
        row.appendChild(el('div','k', lab+' APL'));
        row.appendChild(el('div','v', fmt(data[i])));
        var barBox = el('div','cc-bar'); var fill=el('i'); barBox.appendChild(fill); row.appendChild(barBox);
        rowsWrap.appendChild(row);
        if(inSet) barRefs.push({bar:fill, pct:pct(data[i])});
        else { fill.style.width='0%'; }
      });
      paint(barRefs);

      foot.innerHTML = '<span class="dot"></span>' + (state.expanded
        ? 'Dark-zone view (0–5% APL): bars rescaled to reveal differences where black level matters most in real scenes.'
        : 'Full curve. Higher contrast at low APL = deeper blacks in dark scenes. Tap “Expand 1–5%” to zoom the dark zone.');
    }
    render();
  }

  /* ---------- NATIVE CONTRAST CARD ---------- */
  function buildNative(host){
    var state = { ap: 'F7' };
    host.className='cc';
    var head = el('div','cc-head');
    head.appendChild(el('div',null,
      '<div class="t">Native Contrast (On/Off)</div>'+
      '<div class="h">Black-to-white ratio by zoom</div>'+
      '<div class="sub">Measured at every zoom step per iris position. Pick an aperture to see how contrast tracks with zoom.</div>'));
    host.appendChild(head);

    var chips = el('div','cc-chips');
    AP.forEach(function(a){
      var c = el('button','cc-chip'+(a===state.ap?' on':''), a);
      c.onclick=function(){ state.ap=a; render(); };
      chips.appendChild(c);
    });
    host.appendChild(chips);

    var tiles = el('div','cc-tiles'); host.appendChild(tiles);
    var rowsWrap = el('div','cc-rows'); host.appendChild(rowsWrap);
    var foot = el('div','cc-foot'); host.appendChild(foot);

    function render(){
      Array.prototype.forEach.call(chips.children,function(c){ c.classList.toggle('on', c.textContent===state.ap); });
      var data = CR[state.ap];
      var max = Math.max.apply(null,data);
      var peakI = data.indexOf(max);
      var sweetI = ZOOMS.indexOf('1.5×');

      tiles.innerHTML='';
      [['Peak', max, ZOOMS[peakI]],['Sweet spot 1.5×', data[sweetI], '1.5×'],['Short throw 1.0×', data[ZOOMS.indexOf('1.0×')], '1.0×']]
      .forEach(function(t){
        tiles.appendChild(el('div','cc-tile',
          '<div class="n">'+t[1].toLocaleString()+'<span class="u">:1</span></div><div class="l">'+t[0]+' · '+t[2]+'</div>'));
      });

      rowsWrap.innerHTML='';
      var barRefs=[];
      ZOOMS.forEach(function(z,i){
        var row = el('div','cc-row');
        row.appendChild(el('div','k', z));
        row.appendChild(el('div','v', fmt(data[i])));
        var barBox=el('div','cc-bar'); var fill=el('i'); barBox.appendChild(fill); row.appendChild(barBox);
        rowsWrap.appendChild(row);
        barRefs.push({bar:fill, pct:data[i]/max*100});
      });
      paint(barRefs);
      foot.innerHTML='<span class="dot"></span>Contrast generally rises with zoom up to the 1.2–1.5× sweet spot. '+state.ap+' peaks at '+max.toLocaleString()+':1 ('+ZOOMS[peakI]+').';
    }
    render();
  }

  var BUILD = { adl: buildADL, native: buildNative };
  Array.prototype.forEach.call(cards, function(host){
    var type = host.getAttribute('data-card');
    if (BUILD[type]) BUILD[type](host);
  });
})();
