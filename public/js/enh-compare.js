/* Image-enhancer comparison widget.
 *
 * Markup in the review:
 *   <div class="enh-compare" data-scene="hb" data-label="High brightness scene"></div>
 *
 * Images live at: {dir}/enh-{scene}-{mode}.{ext}
 *   dir defaults to /images/tnm/ and can be overridden per widget with data-dir.
 *   The enhancer button set defaults to the TNM one and can be overridden per
 *   widget with data-modes, a comma-separated list of "key:Label" pairs:
 *     data-modes="ai1:AI Contrast · Low,hdr:HDR Enhancer"
 *
 * Base side is always OFF. The comparison side switches between enhancers via the
 * buttons. A toggle at the top switches between Slider and Hover comparison modes.
 */
(function () {
  'use strict';

  var IMG_DIR = '/images/tnm/';
  var IMG_EXT = 'jpg';

  var DEFAULT_MODES = [
    { key: 'sr',  label: 'Super Resolution' },
    { key: 'ai',  label: 'AI Contrast' },
    { key: 'dc',  label: 'Dynamic Contrast' },
    { key: 'lcw', label: 'Local · Weak' },
    { key: 'lcm', label: 'Local · Medium' },
    { key: 'lcs', label: 'Local · Strong' },
  ];

  // "ai1:AI Contrast · Low,hdr:HDR Enhancer" -> [{key,label}, ...]
  function parseModes(spec) {
    if (!spec) return DEFAULT_MODES;
    var out = spec.split(',').map(function (pair) {
      var i = pair.indexOf(':');
      var key = (i === -1 ? pair : pair.slice(0, i)).trim();
      var label = (i === -1 ? pair : pair.slice(i + 1)).trim();
      return key ? { key: key, label: label || key } : null;
    }).filter(Boolean);
    return out.length ? out : DEFAULT_MODES;
  }

  // "AI Contrast=ai1:Low,ai2:Mid|=hdr:HDR Enhancer" -> [{title, modes:[{key,label,full}]}]
  function parseGroups(spec) {
    if (!spec) return null;
    var groups = spec.split('|').map(function (chunk) {
      chunk = chunk.trim();
      if (!chunk) return null;
      var eq = chunk.indexOf('=');
      var title = eq === -1 ? '' : chunk.slice(0, eq).trim();
      var body = eq === -1 ? chunk : chunk.slice(eq + 1);
      var modes = parseModes(body).map(function (m) {
        return { key: m.key, label: m.label, full: title ? title + ' · ' + m.label : m.label };
      });
      return modes.length ? { title: title, modes: modes } : null;
    }).filter(Boolean);
    return groups.length ? groups : null;
  }

  function build(el) {
    var scene = el.getAttribute('data-scene');
    var label = el.getAttribute('data-label') || '';
    if (!scene) return;

    var dir = el.getAttribute('data-dir') || IMG_DIR;
    if (dir.charAt(dir.length - 1) !== '/') dir += '/';
    var GROUPS = parseGroups(el.getAttribute('data-groups'));
    var MODES;
    if (GROUPS) {
      MODES = [];
      GROUPS.forEach(function (g) { g.modes.forEach(function (m) { MODES.push(m); }); });
    } else {
      MODES = parseModes(el.getAttribute('data-modes'));
    }

    function src(mode) { return dir + 'enh-' + scene + '-' + mode + '.' + IMG_EXT; }

    function modeLabel(key) {
      for (var i = 0; i < MODES.length; i++) if (MODES[i].key === key) return MODES[i].full || MODES[i].label;
      return key;
    }

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
    imgOff.loading = 'lazy';
    imgOff.setAttribute('slot', 'first');
    imgOff.src = src('off');
    imgOff.alt = label + ' — enhancers OFF';
    var imgOn = document.createElement('img');
    imgOn.loading = 'lazy';
    imgOn.setAttribute('slot', 'second');
    imgOn.src = src(current);
    imgOn.alt = label + ' — ' + modeLabel(current);
    slider.appendChild(imgOff);
    slider.appendChild(imgOn);

    // hover view (base OFF image + enhancer overlay shown on hover)
    var hover = document.createElement('div');
    hover.className = 'enh-hover';
    hover.style.display = 'none';
    var hOff = document.createElement('img');
    hOff.loading = 'lazy';
    hOff.className = 'enh-hover-base';
    hOff.src = src('off');
    hOff.alt = label + ' — enhancers OFF';
    var hOn = document.createElement('img');
    hOn.loading = 'lazy';
    hOn.className = 'enh-hover-on';
    hOn.src = src(current);
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
    btns.className = 'enh-btns' + (GROUPS ? ' enh-btns--grouped' : '');
    function addButton(parent, m) {
      var b = document.createElement('button');
      b.className = 'enh-btn' + (m.key === current ? ' enh-btn--active' : '');
      b.textContent = m.label;
      b.setAttribute('data-mode', m.key);
      parent.appendChild(b);
    }
    if (GROUPS) {
      GROUPS.forEach(function (g) {
        var row = document.createElement('div');
        row.className = 'enh-row';
        if (g.title) {
          var t = document.createElement('span');
          t.className = 'enh-row-title';
          t.textContent = g.title;
          row.appendChild(t);
        }
        var set = document.createElement('div');
        set.className = 'enh-row-btns';
        g.modes.forEach(function (m) { addButton(set, m); });
        row.appendChild(set);
        btns.appendChild(row);
      });
    } else {
      MODES.forEach(function (m) { addButton(btns, m); });
    }
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
    imgOn.onerror = function () { missing = true; imgOn.src = src('off'); updateCaption(); };
    hOn.onerror  = function () { hOn.src = src('off'); };

    function setMode(key) {
      current = key;
      missing = false;
      imgOn.src = src(key);
      imgOn.alt = label + ' — ' + modeLabel(key);
      hOn.src = src(key);
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
