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

  // Lightbox for article figures
  var imgs = document.querySelectorAll('.prose figure img');
  if (imgs.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.style.cssText = 'position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.85);padding:20px;cursor:zoom-out;';
    var bimg = document.createElement('img');
    bimg.style.cssText = 'max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5);';
    box.appendChild(bimg);
    document.body.appendChild(box);
    imgs.forEach(function (im) {
      im.style.cursor = 'zoom-in';
      im.addEventListener('click', function () {
        bimg.src = im.src;
        box.style.display = 'flex';
      });
    });
    box.addEventListener('click', function () { box.style.display = 'none'; });
  }

  // Active TOC highlight on scroll
  var tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) map[id] = a;
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tocLinks.forEach(function (a) { a.style.color = ''; a.style.fontWeight = ''; });
          var a = map[e.target.id];
          if (a) { a.style.color = 'var(--accent)'; a.style.fontWeight = '700'; }
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }
})();
