// Preview mode — owner visits /?preview=TOKEN to unlock draft articles
(function () {
  var TOKEN = 'svk-prev-7x4m9';
  var KEY   = 'svk-preview';

  // Activate / deactivate from URL param
  var params = new URLSearchParams(location.search);
  if (params.get('preview') === TOKEN) {
    try { localStorage.setItem(KEY, TOKEN); } catch(e){}
    params.delete('preview');
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  } else if (params.get('preview') === 'off') {
    try { localStorage.removeItem(KEY); } catch(e){}
    params.delete('preview');
    history.replaceState(null, '', location.pathname);
  }

  var active;
  try { active = localStorage.getItem(KEY) === TOKEN; } catch(e){}
  if (!active) {
    // Not in preview mode: show draft overlay if present, hide draft cards
    var overlay = document.getElementById('draftOverlay');
    if (overlay) overlay.style.display = 'flex';
    return;
  }

  // Preview mode is ON
  document.documentElement.classList.add('preview-mode');

  // Show draft cards
  document.querySelectorAll('[data-draft="true"]').forEach(function (el) {
    el.style.display = '';
  });

  // On draft review pages: hide overlay, show banner
  var overlay = document.getElementById('draftOverlay');
  var banner  = document.getElementById('draftBanner');
  if (overlay) overlay.style.display = 'none';
  if (banner)  banner.style.display  = 'flex';

  // Inject the preview bar
  var bar = document.createElement('div');
  bar.id = 'previewBar';
  bar.innerHTML =
    '<span>Preview mode</span>' +
    '<a href="/?preview=off" class="preview-bar-exit">Exit preview</a>';
  document.body.insertBefore(bar, document.body.firstChild);
})();

// Contact form via Web3Forms
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;
  var status = document.getElementById('formStatus');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    status.textContent = '';
    var data = new FormData(form);
    fetch('https://api.web3forms.com/submit', { method:'POST', body: data })
      .then(function(r){ return r.json(); })
      .then(function(json){
        if (json.success) {
          status.textContent = '✓ Message sent! I\'ll get back to you shortly.';
          status.style.color = 'var(--green)';
          form.reset();
        } else {
          status.textContent = 'Something went wrong. Try again or reach out on AVS Forum.';
          status.style.color = 'var(--red)';
        }
      })
      .catch(function(){
        status.textContent = 'Network error. Please try again.';
        status.style.color = 'var(--red)';
      })
      .finally(function(){ btn.disabled = false; btn.textContent = 'Send message'; });
  });
})();

// Theme toggle
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  var icon  = btn.querySelector('.theme-icon');
  var label = btn.querySelector('.theme-label');
  var root  = document.documentElement;
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    icon.textContent  = theme === 'dark' ? '🌙' : '☀️';
    label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    try { localStorage.setItem('sv-theme', theme); } catch(e){}
  }
  var saved; try { saved = localStorage.getItem('sv-theme'); } catch(e){}
  apply(saved || 'light');
  btn.addEventListener('click', function () {
    apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
})();

// Mobile nav toggle
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // close menu when a link is tapped
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
      });
    });
  }

  // Collect all figure image data before DOM restructuring
  var allFigData = [];
  document.querySelectorAll('.prose figure').forEach(function (fig) {
    var img = fig.querySelector('img');
    if (!img) return;
    var cap = fig.querySelector('figcaption');
    img.dataset.lbIdx = String(allFigData.length);
    allFigData.push({ src: img.src, caption: cap ? cap.textContent : '' });
  });

  // Lightbox — set up before carousels so openLb is callable
  var openLb = function () {};
  if (allFigData.length) {
    var lb = document.createElement('div');
    lb.className = 'lb-overlay';
    lb.innerHTML =
      '<button class="lb-close" aria-label="Close">✕</button>' +
      '<button class="lb-btn prev" aria-label="Previous">‹</button>' +
      '<img alt="">' +
      '<div class="lb-caption"></div>' +
      '<button class="lb-btn next" aria-label="Next">›</button>' +
      '<span class="lb-counter"></span>';
    document.body.appendChild(lb);

    var lbImg     = lb.querySelector('img');
    var lbCap     = lb.querySelector('.lb-caption');
    var lbCounter = lb.querySelector('.lb-counter');
    var lbPrev    = lb.querySelector('.prev');
    var lbNext    = lb.querySelector('.next');
    var lbClose   = lb.querySelector('.lb-close');
    var lbCur     = 0;

    openLb = function (idx) {
      lbCur = Math.max(0, Math.min(idx, allFigData.length - 1));
      lbImg.src = allFigData[lbCur].src;
      lbCap.textContent = allFigData[lbCur].caption;
      lbCounter.textContent = (lbCur + 1) + ' / ' + allFigData.length;
      lbPrev.style.opacity = lbCur === 0 ? '.25' : '1';
      lbNext.style.opacity = lbCur === allFigData.length - 1 ? '.25' : '1';
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    function closeLb() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    function goLb(dir) { openLb(lbCur + dir); }

    lbClose.addEventListener('click', closeLb);
    lbPrev.addEventListener('click', function (e) { e.stopPropagation(); if (lbCur > 0) goLb(-1); });
    lbNext.addEventListener('click', function (e) { e.stopPropagation(); if (lbCur < allFigData.length - 1) goLb(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft'  && lbCur > 0) goLb(-1);
      if (e.key === 'ArrowRight' && lbCur < allFigData.length - 1) goLb(1);
    });
    var tx = 0;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goLb(dx < 0 ? 1 : -1);
    });
  }

  // Build hero+thumbs carousel for odd-count galleries
  // Swap a /thumbs/<w>/ tier into an image URL (or strip it for the original).
  function thumbSrc(img, w) {
    var src = img.getAttribute('src') || '';
    var bare = src.replace(/^\/thumbs\/\d+/, '');
    return (img.srcset || '').indexOf('/thumbs/' + w) !== -1 ? '/thumbs/' + w + bare : src;
  }

  // Point `sizes` at the element's real rendered width so srcset resolves honestly.
  function sizeToBox(img, box) {
    function apply() {
      var w = Math.round(box.getBoundingClientRect().width);
      if (w > 0) img.sizes = w + 'px';
    }
    apply();
    if (window.ResizeObserver) new ResizeObserver(apply).observe(box);
    else window.addEventListener('resize', apply);
  }

  // `data-lead` names the photo the carousel opens on; order stays as authored.
  function buildCarousel(g, figs) {
    var carCur = Math.max(0, Math.min(parseInt(g.dataset.lead || '0', 10) || 0, figs.length - 1));

    var container = document.createElement('div');
    container.className = 'car-container';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'car-btn car-prev';
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.textContent = '‹';

    var nextBtn = document.createElement('button');
    nextBtn.className = 'car-btn car-next';
    nextBtn.setAttribute('aria-label', 'Next');
    nextBtn.textContent = '›';

    var mainArea = document.createElement('div');
    mainArea.className = 'car-main';

    container.appendChild(prevBtn);
    container.appendChild(mainArea);
    container.appendChild(nextBtn);

    var thumbsRow = document.createElement('div');
    thumbsRow.className = 'car-thumbs';

    figs.forEach(function (fig, i) {
      var origImg = fig.querySelector('img');
      var btn = document.createElement('button');
      btn.className = 'car-thumb';
      btn.setAttribute('aria-label', 'Image ' + (i + 1));
      if (origImg) {
        var tImg = document.createElement('img');
        tImg.loading = 'lazy';
        tImg.decoding = 'async';
        // 72x54 button — pull the smallest tier, never the full-size file
        tImg.src = thumbSrc(origImg, 320);
        tImg.alt = origImg.alt || '';
        btn.appendChild(tImg);
      }
      btn.addEventListener('click', function () { carGoTo(i, true); });
      thumbsRow.appendChild(btn);
    });

    g.innerHTML = '';
    g.classList.add('carousel');
    g.appendChild(container);
    g.appendChild(thumbsRow);

    function carGoTo(idx, scrollThumb) {
      carCur = Math.max(0, Math.min(idx, figs.length - 1));

      mainArea.innerHTML = '';

      // The detached figure still carries the grid's `sizes`, which would make the
      // browser pick a thumbnail tier for a slide that renders several times wider.
      // Cloning alone kicks off that fetch, so fix the template before cloning.
      var srcImg = figs[carCur].querySelector('img');
      if (srcImg) {
        var boxW = Math.round(mainArea.getBoundingClientRect().width);
        if (boxW > 0) srcImg.sizes = boxW + 'px';
      }
      mainArea.appendChild(figs[carCur].cloneNode(true));

      var mainImg = mainArea.querySelector('img');
      if (mainImg) {
        sizeToBox(mainImg, mainArea);
        mainImg.addEventListener('click', function (e) {
          e.stopPropagation();
          var oi = figs[carCur].querySelector('img');
          openLb(parseInt((oi && oi.dataset.lbIdx) || '0', 10));
        });
      }

      Array.prototype.forEach.call(thumbsRow.children, function (t, i) {
        t.classList.toggle('active', i === carCur);
      });
      if (scrollThumb && thumbsRow.children[carCur]) {
        thumbsRow.children[carCur].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

    }

    // The carousel loops: past the last photo it starts again from the first, and back
    function carStep(dir) { carGoTo((carCur + dir + figs.length) % figs.length, true); }
    prevBtn.addEventListener('click', function () { carStep(-1); });
    nextBtn.addEventListener('click', function () { carStep(1); });

    // Swipe support on the main image area
    var swipeX = 0;
    mainArea.addEventListener('touchstart', function (e) { swipeX = e.touches[0].clientX; }, { passive: true });
    mainArea.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) > 40) {
        carStep(dx < 0 ? 1 : -1);
      }
    });

    carGoTo(carCur);
  }

  document.querySelectorAll('.prose .gallery').forEach(function (g) {
    var cols = g.classList.contains('cols-3') ? 3 : 2;
    var figs = Array.prototype.slice.call(g.querySelectorAll('figure'));
    // `as-carousel` / `as-grid` force the layout; without them a gallery falls back
    // to the old rule: carousel whenever the photos do not fill whole rows.
    var wantCar = g.classList.contains('as-carousel');
    var wantGrid = g.classList.contains('as-grid');
    if (wantCar || (!wantGrid && figs.length % cols !== 0)) {
      buildCarousel(g, figs);
    } else {
      figs.forEach(function (fig) {
        var img = fig.querySelector('img');
        if (!img) return;
        img.addEventListener('click', function (e) {
          e.stopPropagation();
          openLb(parseInt(img.dataset.lbIdx || '0', 10));
        });
      });
    }
  });

  // Stand-alone photos beside the text open full screen, same lightbox as the galleries
  document.querySelectorAll('.prose figure.photo-side img').forEach(function (img) {
    img.addEventListener('click', function (e) {
      e.stopPropagation();
      openLb(parseInt(img.dataset.lbIdx || '0', 10));
    });
  });

  // Build floating section nav (desktop) from the inline TOC, show on scroll
  var inlineToc = document.querySelector('.toc');
  var floatToc = null;
  if (inlineToc) {
    floatToc = document.createElement('nav');
    floatToc.className = 'toc-float';
    var innerHtml = Array.prototype.filter.call(inlineToc.children, function (el) {
      return el.tagName !== 'H4';
    }).map(function (el) { return el.outerHTML; }).join('');
    var tocHeading = document.documentElement.lang === 'ru' ? 'В этом обзоре' : 'In this review';
    floatToc.innerHTML = '<h4>' + tocHeading + '</h4>' + innerHtml;
    document.body.appendChild(floatToc);

    // Show floating nav once the inline TOC scrolls out of view; hide it again when
    // the article ends so it doesn't overlap "More reviews" and comments
    var article = inlineToc.closest('main') || document.body;
    window.addEventListener('scroll', function () {
      var heroBottom = inlineToc.getBoundingClientRect().bottom;
      var articleEnd = article.getBoundingClientRect().bottom;
      floatToc.classList.toggle('visible', heroBottom < 0 && articleEnd > floatToc.getBoundingClientRect().bottom);
    }, { passive: true });
  }

  // Active section highlight (both inline + floating TOC)
  var tocLinks = document.querySelectorAll('.toc a, .toc-float a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (!map[id]) map[id] = [];
      map[id].push(a);
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tocLinks.forEach(function (a) {
            a.classList.remove('active');
            if (a.closest('.toc')) { a.style.color = ''; a.style.fontWeight = ''; }
          });
          (map[e.target.id] || []).forEach(function (a) {
            a.classList.add('active');
            if (a.closest('.toc')) { a.style.color = 'var(--accent)'; a.style.fontWeight = '700'; }
          });
          if (floatToc) {
            var activeFloatLink = floatToc.querySelector('a.active');
            if (activeFloatLink) {
              var tocTop = floatToc.scrollTop;
              var tocH = floatToc.clientHeight;
              var linkTop = activeFloatLink.offsetTop - floatToc.offsetTop;
              var linkBot = linkTop + activeFloatLink.offsetHeight;
              if (linkTop < tocTop) floatToc.scrollTop = linkTop;
              else if (linkBot > tocTop + tocH) floatToc.scrollTop = linkBot - tocH;
            }
          }
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }
})();

// Scroll buttons
(function () {
  var btnTop = document.getElementById('scrollTop');
  var btnBottom = document.getElementById('scrollBottom');
  function update() {
    var scrollY = window.scrollY;
    var maxScroll = document.body.scrollHeight - window.innerHeight;
    if (btnTop) btnTop.classList.toggle('visible', scrollY > 400);
    if (btnBottom) btnBottom.classList.toggle('visible', maxScroll - scrollY > 400);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
  if (btnTop) btnTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (btnBottom) btnBottom.addEventListener('click', function () {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
})();

// Reading progress bar — accent line on the header's bottom edge, article pages only.
// Progress tracks the article body (ends at 100% when the article is read, not the footer).
(function () {
  var article = document.querySelector('.article-page');
  var header = document.querySelector('.site-header');
  if (!article || !header) return;
  var bar = document.createElement('div');
  bar.className = 'read-progress';
  header.appendChild(bar);
  var ticking = false;
  function update() {
    ticking = false;
    var end = article.offsetTop + article.offsetHeight - window.innerHeight;
    var y = window.scrollY || document.documentElement.scrollTop;
    var p = end > 0 ? Math.min(1, Math.max(0, y / end)) : 1;
    bar.style.transform = 'scaleX(' + p + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

/* Lazy autoplay for local video figures.
   Sources live in data-src until the figure is close to the viewport, so a
   reader who never scrolls to a section never downloads its clip. Offscreen
   clips are paused again to keep decoding off the CPU on long pages. */
(function () {
  var vids = document.querySelectorAll('figure.video-local video[autoplay], figure.video-portrait video[autoplay]');
  if (!vids.length) return;

  function attach(v) {
    if (v.dataset.attached) return;
    v.dataset.attached = '1';
    if (v.dataset.poster) { v.poster = v.dataset.poster; }
    v.querySelectorAll('source[data-src]').forEach(function (s) {
      s.src = s.dataset.src;
      s.removeAttribute('data-src');
    });
    v.load();
  }

  if (!('IntersectionObserver' in window)) {
    vids.forEach(attach);
    return;
  }

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        attach(v);
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else if (v.dataset.attached) {
        v.pause();
      }
    });
  }, { rootMargin: '300px 0px' });

  vids.forEach(function (v) { obs.observe(v); });
})();
