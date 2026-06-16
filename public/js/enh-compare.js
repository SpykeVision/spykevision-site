/* Image-enhancer comparison widget.
 *
 * Markup in the review:
 *   <div class="enh-compare" data-scene="hb" data-label="High brightness scene"></div>
 *
 * Images live at: /images/tnm/enh-{scene}-{mode}.{ext}
 *   scenes: hb (high brightness), mh (mid-high), md (mid-dark), dk (dark)
 *   modes:  off, sr, ai, dc, lcw, lcm, lcs
 *
 * Base side is always OFF. The comparison side switches between enhancers via the
 * buttons. A toggle at the top switches between Slider and Hover comparison modes.
 */
(function () {
  'use strict';

  var IMG_DIR = '/images/tnm/';
  var IMG_EXT = 'jpg';

  var MODES = [
    { key: 'sr',  label: 'Super Resolution' },
    { key: 'ai',  label: 'AI Contrast' },
    { key: 'dc',  label: 'Dynamic Contrast' },
    { key: 'lcw', label: 'Local · Weak' },
    { key: 'lcm', label: 'Local · Medium' },
    { key: 'lcs', label: 'Local · Strong' },
  ];

  function src(scene, mode) { return IMG_DIR + 'enh-' + scene + '-' + mode + '.' + IMG_EXT; }

  function modeLabel(key) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].key === key) return MODES[i].label;
    return key;
  }

  function build(el) {
    var scene = el.getAttribute('data-scene');
    var label = el.getAttribute('data-label') || '';
    if (!scene) return;

    var current = MODES[0].key;     // active enhancer on the comparison side
    var view = 'slider';            // 'slider' | 'hover'

    // ── header: label + view toggle ──────────────────────────────────────────
    var head = document.createElement('div');
    head.className = 'enh-head';
    head.innerHTML =
      '<div class="enh-label">' + label + '</div>' +
      '<div class="enh-view-toggle">' +
        '<button class="enh-vtab enh-vtab--active" data-view="slider">Slider</button>' +
        '<button class="enh-vtab" data-view="hover">Hover</button>' +
      '</div>';
    el.appendChild(head);

    // ── stage: holds either the slider or the hover comparison ────────────────
    var stage = document.createElement('div');
    stage.className = 'enh-stage';
    el.appendChild(stage);

    // slider view (img-comparison-slider web component)
    var slider = document.createElement('img-comparison-slider');
    slider.className = 'enh-slider';
    var imgOff = document.createElement('img');
    imgOff.setAttribute('slot', 'first');
    imgOff.src = src(scene, 'off');
    imgOff.alt = label + ' — enhancers OFF';
    var imgOn = document.createElement('img');
    imgOn.setAttribute('slot', 'second');
    imgOn.src = src(scene, current);
    imgOn.alt = label + ' — ' + modeLabel(current);
    slider.appendChild(imgOff);
    slider.appendChild(imgOn);

    // hover view (base OFF image + enhancer overlay shown on hover)
    var hover = document.createElement('div');
    hover.className = 'enh-hover';
    hover.style.display = 'none';
    var hOff = document.createElement('img');
    hOff.className = 'enh-hover-base';
    hOff.src = src(scene, 'off');
    hOff.alt = label + ' — enhancers OFF';
    var hOn = document.createElement('img');
    hOn.className = 'enh-hover-on';
    hOn.src = src(scene, current);
    hOn.alt = label + ' — ' + modeLabel(current);
    var hBadge = document.createElement('div');
    hBadge.className = 'enh-hover-badge';
    hBadge.textContent = 'OFF';
    hover.appendChild(hOff);
    hover.appendChild(hOn);
    hover.appendChild(hBadge);
    hover.addEventListener('mouseenter', function () { hover.classList.add('on'); hBadge.textContent = modeLabel(current); });
    hover.addEventListener('mouseleave', function () { hover.classList.remove('on'); hBadge.textContent = 'OFF'; });

    stage.appendChild(slider);
    stage.appendChild(hover);

    // ── enhancer buttons ──────────────────────────────────────────────────────
    var btns = document.createElement('div');
    btns.className = 'enh-btns';
    MODES.forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'enh-btn' + (m.key === current ? ' enh-btn--active' : '');
      b.textContent = m.label;
      b.setAttribute('data-mode', m.key);
      btns.appendChild(b);
    });
    el.appendChild(btns);

    // ── caption ───────────────────────────────────────────────────────────────
    var cap = document.createElement('div');
    cap.className = 'enh-caption';
    el.appendChild(cap);

    function updateCaption() {
      if (missing) {
        cap.innerHTML = '<span>' + modeLabel(current) + '</span> screenshot not available for this scene yet';
        return;
      }
      cap.innerHTML = view === 'slider'
        ? '<span>OFF</span> ⟷ <span>' + modeLabel(current) + '</span> · drag the handle to compare'
        : 'Hover the image: <span>' + modeLabel(current) + '</span> on, mouse away for <span>OFF</span>';
    }

    var missing = false;   // true when the active enhancer screenshot is unavailable
    imgOn.onerror = function () { missing = true; imgOn.src = src(scene, 'off'); updateCaption(); };
    hOn.onerror  = function () { hOn.src = src(scene, 'off'); };

    function setMode(key) {
      current = key;
      missing = false;
      imgOn.src = src(scene, key);
      imgOn.alt = label + ' — ' + modeLabel(key);
      hOn.src = src(scene, key);
      hOn.alt = label + ' — ' + modeLabel(key);
      Array.prototype.forEach.call(btns.querySelectorAll('.enh-btn'), function (b) {
        b.classList.toggle('enh-btn--active', b.getAttribute('data-mode') === key);
      });
      if (hover.classList.contains('on')) hBadge.textContent = modeLabel(key);
      updateCaption();
    }

    function setView(v) {
      view = v;
      slider.style.display = (v === 'slider') ? '' : 'none';
      hover.style.display = (v === 'hover') ? '' : 'none';
      Array.prototype.forEach.call(head.querySelectorAll('.enh-vtab'), function (t) {
        t.classList.toggle('enh-vtab--active', t.getAttribute('data-view') === v);
      });
      updateCaption();
    }

    btns.addEventListener('click', function (e) {
      var b = e.target.closest('.enh-btn');
      if (b) setMode(b.getAttribute('data-mode'));
    });
    head.addEventListener('click', function (e) {
      var t = e.target.closest('.enh-vtab');
      if (t) setView(t.getAttribute('data-view'));
    });

    updateCaption();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.enh-compare'), build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
