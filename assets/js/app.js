/* Vārtu pasaule concept - progressive enhancement only.
   Nothing here is required to read the page: reveals are handled inline
   with a hard failsafe, and every section renders without JavaScript. */
(function () {
  'use strict';

  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile drawer ---------- */
  var burger = d.getElementById('burger');
  var mnav = d.getElementById('mnav');

  function closeNav() {
    if (!burger || !mnav) return;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Atvērt izvēlni');
    mnav.hidden = true;
    d.body.style.overflow = '';
  }
  function openNav() {
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Aizvērt izvēlni');
    mnav.hidden = false;
    d.body.style.overflow = 'hidden';
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      if (burger.getAttribute('aria-expanded') === 'true') closeNav(); else openNav();
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        closeNav();
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1060) closeNav();
    });
  }

  /* ---------- active section in the nav ---------- */
  var navLinks = Array.prototype.slice.call(d.querySelectorAll('.nav a[href^="#"]'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {}, targets = [];
    navLinks.forEach(function (a) {
      var el = d.getElementById(a.getAttribute('href').slice(1));
      // only whole sections drive the active state; in-page tile anchors do not
      if (el && el.tagName === 'SECTION') { map[el.id] = a; targets.push(el); }
    });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('is-on'); });
        var a = map[en.target.id];
        if (a) a.classList.add('is-on');
      });
    }, { rootMargin: '-25% 0px -68% 0px' });
    targets.forEach(function (t) { sio.observe(t); });
  }

  /* ---------- counters (all three numbers come from the zl.lv card) ------ */
  var nums = Array.prototype.slice.call(d.querySelectorAll('.num'));
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    var run = function (el) {
      var to = parseFloat(el.getAttribute('data-to'));
      if (isNaN(to)) return;
      var dur = 1000, t0 = null;
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = to;
      };
      requestAnimationFrame(step);
    };
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); nio.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { nio.observe(n); });
  }

  /* ---------- "Pieteikums šim veidam" preselects the gate type ---------- */
  var veids = d.getElementById('f-veids');
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-veids]');
    if (!a || !veids) return;
    var want = a.getAttribute('data-veids');
    for (var i = 0; i < veids.options.length; i++) {
      if (veids.options[i].value === want || veids.options[i].text === want) {
        veids.selectedIndex = i;
        break;
      }
    }
    updateSummary();
    var w = d.getElementById('f-w');
    if (w) setTimeout(function () { w.focus({ preventScroll: true }); }, 520);
  });

  /* ---------- live summary: the thing a catalogue listing cannot do ----- */
  var summary = d.getElementById('summary');
  var fW = d.getElementById('f-w');
  var fH = d.getElementById('f-h');

  function updateSummary() {
    if (!summary) return;
    var v = veids && veids.value ? veids.value : '';
    var w = fW && fW.value ? parseInt(fW.value, 10) : null;
    var h = fH && fH.value ? parseInt(fH.value, 10) : null;
    var parts = [];
    parts.push(v ? v : 'veids nav izvēlēts');
    if (w && h) parts.push(w + ' × ' + h + ' mm');
    else if (w) parts.push('platums ' + w + ' mm');
    else if (h) parts.push('augstums ' + h + ' mm');
    summary.textContent = 'Pieteikums: ' + parts.join(', ');
  }
  [veids, fW, fH].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updateSummary);
    el.addEventListener('change', updateSummary);
  });
  updateSummary();

  /* ---------- form: inline validation, honest concept notice ------------ */
  var frm = d.getElementById('frm');
  var done = d.getElementById('done');
  var again = d.getElementById('again');
  var status = d.getElementById('frm-status');

  function setErr(input, errEl, bad) {
    if (!input || !errEl) return;
    if (bad) { input.setAttribute('aria-invalid', 'true'); errEl.hidden = false; }
    else { input.removeAttribute('aria-invalid'); errEl.hidden = true; }
  }

  if (frm) {
    var name = d.getElementById('f-name');
    var tel = d.getElementById('f-tel');
    var mail = d.getElementById('f-mail');
    var eName = d.getElementById('e-name');
    var eTel = d.getElementById('e-tel');
    var eMail = d.getElementById('e-mail');
    var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    // at least 8 digits, so "+371 2914 6306" and "29146306" both pass
    var telOk = function (v) { return (v.replace(/\D/g, '').length >= 8); };

    var checks = [
      [name, eName, function () { return !name.value.trim(); }],
      [tel, eTel, function () { return !telOk(tel.value); }],
      [mail, eMail, function () { return mail.value.trim() !== '' && !mailRe.test(mail.value.trim()); }]
    ];

    checks.forEach(function (c) {
      if (!c[0]) return;
      c[0].addEventListener('blur', function () { setErr(c[0], c[1], c[2]()); });
      c[0].addEventListener('input', function () {
        if (c[0].getAttribute('aria-invalid') === 'true') setErr(c[0], c[1], c[2]());
      });
    });

    frm.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      checks.forEach(function (c) {
        if (!c[0]) return;
        var bad = c[2]();
        setErr(c[0], c[1], bad);
        if (bad && !first) first = c[0];
      });
      if (first) {
        if (status) status.textContent = 'Formā ir kļūdas. Pārbaudiet atzīmētos laukus.';
        first.focus();
        return;
      }
      frm.hidden = true;
      if (status) status.textContent = 'Pieteikums aizpildīts pareizi. Skatiet atbildi zemāk.';
      if (done) {
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        done.focus({ preventScroll: true });
      }
    });
  }

  if (again && frm && done) {
    again.addEventListener('click', function () {
      done.hidden = true;
      frm.hidden = false;
      frm.reset();
      if (status) status.textContent = '';
      updateSummary();
      var n = d.getElementById('f-name');
      if (n) n.focus();
    });
  }
})();
