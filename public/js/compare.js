/* Generic two-image comparison widget (.ba-compare)
 *
 * Markup:
 *   <div class="ba-compare"
 *        data-before="/path/to/before.jpg"
 *        data-after="/path/to/after.jpg"
 *        data-label-before="Label A"
 *        data-label-after="Label B"
 *        data-caption="Optional caption text"></div>
 *
 * Renders a Slider / Hover toggle card, same style as .enh-compare.
 * Requires img-comparison-slider web component and enh-* CSS classes.
 */
(function () {
  'use strict';

  function build(el) {
    var before    = el.getAttribute('data-before')       || '';
    var after     = el.getAttribute('data-after')        || '';
    var lblBefore = el.getAttribute('data-label-before') || 'Before';
    var lblAfter  = el.getAttribute('data-label-after')  || 'After';
    var caption   = el.getAttribute('data-caption')      || (lblBefore + ' vs ' + lblAfter);
    var view = 'slider';

    // Header: label + Slider/Hover toggle
    var head = document.createElement('div');
    head.className = 'enh-head';
    head.innerHTML =
      '<div class="enh-label">' + caption + '</div>' +
      '<div class="enh-view-toggle">' +
        '<button class="enh-vtab enh-vtab--active" data-view="slider">Slider</button>' +
        '<button class="enh-vtab" data-view="hover">Hover</button>' +
      '</div>';
    el.appendChild(head);

    // Stage
    var stage = document.createElement('div');
    stage.className = 'enh-stage';
    el.appendChild(stage);

    // Slider view
    var slider = document.createElement('img-comparison-slider');
    slider.className = 'enh-slider';
    var sB = document.createElement('img'); sB.setAttribute('slot', 'first');  sB.src = before; sB.alt = lblBefore;
    var sA = document.createElement('img'); sA.setAttribute('slot', 'second'); sA.src = after;  sA.alt = lblAfter;
    slider.appendChild(sB);
    slider.appendChild(sA);

    // Hover view
    var hover = document.createElement('div');
    hover.className = 'enh-hover';
    hover.style.display = 'none';
    var hB = document.createElement('img'); hB.className = 'enh-hover-base'; hB.src = before; hB.alt = lblBefore;
    var hA = document.createElement('img'); hA.className = 'enh-hover-on';   hA.src = after;  hA.alt = lblAfter;
    var badge = document.createElement('div');
    badge.className = 'enh-hover-badge';
    badge.textContent = lblBefore;
    hover.appendChild(hB);
    hover.appendChild(hA);
    hover.appendChild(badge);
    hover.addEventListener('mouseenter', function () { hover.classList.add('on'); badge.textContent = lblAfter; });
    hover.addEventListener('mouseleave', function () { hover.classList.remove('on'); badge.textContent = lblBefore; });

    stage.appendChild(slider);
    stage.appendChild(hover);

    // Caption
    var cap = document.createElement('div');
    cap.className = 'enh-caption';
    el.appendChild(cap);

    function updateCaption() {
      cap.innerHTML = view === 'slider'
        ? '<span>' + lblBefore + '</span> ⟷ <span>' + lblAfter + '</span> · drag the handle to compare'
        : 'Hover: <span>' + lblAfter + '</span> · mouse away for <span>' + lblBefore + '</span>';
    }

    function setView(v) {
      view = v;
      slider.style.display = (v === 'slider') ? '' : 'none';
      hover.style.display  = (v === 'hover')  ? '' : 'none';
      Array.prototype.forEach.call(head.querySelectorAll('.enh-vtab'), function (t) {
        t.classList.toggle('enh-vtab--active', t.getAttribute('data-view') === v);
      });
      updateCaption();
    }

    head.addEventListener('click', function (e) {
      var t = e.target.closest('.enh-vtab');
      if (t) setView(t.getAttribute('data-view'));
    });

    updateCaption();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.ba-compare'), build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
