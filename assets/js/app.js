/* Vārtu pasaule - progressive enhancement only.
   Every page reads and works without this file: links open photos, the
   phone is a plain link, the e-mail shows as name[at]domain, and the form
   falls back to its note. */
(function () {
  'use strict';

  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE_WA = '37129146306';

  function $(sel, root) { return (root || d).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }

  /* ---------- e-mail: kept out of the HTML text so scrapers do not collect it ---------- */
  // data-m holds the address reversed and base64-encoded; here it becomes a mailto link
  function unmail(code) { try { return atob(code).split('').reverse().join(''); } catch (x) { return ''; } }
  var MAIL = '';
  $$('[data-m]').forEach(function (a) {
    var m = unmail(a.getAttribute('data-m'));
    if (!m) return;
    MAIL = MAIL || m;
    a.href = 'mailto:' + m;
    a.textContent = m;
  });

  /* ---------- mobile drawer ---------- */
  var burger = $('#burger');
  var mnav = $('#mnav');
  // while the drawer is open, the page under it must not take focus
  function setInert(on) {
    ['main', '.ftr'].forEach(function (sel) { var el = $(sel); if (el) el.inert = on; });
  }
  function closeNav() {
    if (!burger || !mnav) return;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Atvērt izvēlni');
    mnav.hidden = true;
    d.body.style.overflow = '';
    setInert(false);
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      if (burger.getAttribute('aria-expanded') === 'true') { closeNav(); return; }
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Aizvērt izvēlni');
      mnav.hidden = false;
      d.body.style.overflow = 'hidden';
      setInert(true);
    });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    // header links (Pieteikums, phone, logo) also leave the drawer
    var hdr = $('.hdr');
    if (hdr) hdr.addEventListener('click', function (e) {
      if (e.target.closest('a') && burger.getAttribute('aria-expanded') === 'true') closeNav();
    });
    window.addEventListener('hashchange', closeNav);
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { closeNav(); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1180) closeNav(); });
  }

  /* ---------- the gate in the hero: remove the drawing once it has opened ---------- */
  // The drawing waits for the photo: it opens only over a decoded image.
  // If the photo is not ready within 1.5 s the drawing is simply removed.
  $$('.gate').forEach(function (g) {
    var done = false;
    var finish = function () { if (!done) { done = true; g.classList.add('is-done'); } };
    if (reduce) { finish(); return; }
    var parts = $$('.gate__leaf, i', g);
    var last = parts[parts.length - 1];
    if (last) last.addEventListener('animationend', finish, { once: true });
    var photo = g.parentNode ? $('img', g.parentNode) : null;
    var go = function () {
      if (done) return;
      g.classList.add('is-go');
      setTimeout(finish, 3200);
    };
    var late = setTimeout(finish, 1500);
    var ready = function () { clearTimeout(late); go(); };
    if (!photo) { ready(); return; }
    if (photo.complete && photo.naturalWidth) {
      (photo.decode ? photo.decode() : Promise.resolve()).then(ready, ready);
    } else {
      photo.addEventListener('load', function () { (photo.decode ? photo.decode() : Promise.resolve()).then(ready, ready); }, { once: true });
      photo.addEventListener('error', finish, { once: true });
    }
  });

  /* ---------- counters (numbers come from the zl.lv company card) ---------- */
  var nums = $$('.num[data-to]');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        nio.unobserve(en.target);
        var el = en.target, to = parseFloat(el.getAttribute('data-to')), t0 = null;
        var step = function (ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / 1000, 1);
          el.textContent = p < 1 ? Math.round(to * (1 - Math.pow(1 - p, 3))) : to;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { nio.observe(n); });
  }

  /* ---------- photo viewer: the whole photo, full screen, arrows and swipe ---------- */
  var lb = $('#lb');
  if (lb && typeof lb.showModal === 'function') {
    var lbImg = $('.lb__img', lb), lbN = $('.lb__n', lb), lbCap = $('.lb__cap', lb);
    var fsBtn = $('[data-lb="fs"]', lb);
    var list = [], idx = 0, opener = null;

    var show = function (i) {
      idx = (i + list.length) % list.length;
      var a = list[idx];
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.getAttribute('data-cap') || '';
      lbCap.textContent = a.getAttribute('data-cap') || '';
      lbN.textContent = (idx + 1) + ' / ' + list.length;
      // warm the neighbours so arrows feel instant
      [idx + 1, idx - 1].forEach(function (j) {
        var n = list[(j + list.length) % list.length];
        if (n) { var im = new Image(); im.src = n.getAttribute('href'); }
      });
    };
    var closeLb = function () {
      if (d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(function () {});
      lb.close();
    };

    d.addEventListener('click', function (e) {
      var a = e.target.closest('.gal__a');
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var group = a.closest('[data-gal]');
      list = $$('.gal__a', group || d);
      e.preventDefault();
      opener = a;
      show(list.indexOf(a));
      lb.showModal();
    });
    lb.addEventListener('close', function () {
      lbImg.removeAttribute('src');
      if (opener) opener.focus();
    });
    lb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) {
        var act = b.getAttribute('data-lb');
        if (act === 'prev') show(idx - 1);
        else if (act === 'next') show(idx + 1);
        else if (act === 'close') closeLb();
        else if (act === 'fs') {
          // a <dialog> itself cannot go full screen; the page can, and the modal stays on top
          if (d.fullscreenElement) d.exitFullscreen().catch(function () {});
          else d.documentElement.requestFullscreen().catch(function () {});
        }
        return;
      }
      if (e.target === lb || e.target.classList.contains('lb__stage')) closeLb();
    });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
    });
    if (fsBtn && !(d.fullscreenEnabled && d.documentElement.requestFullscreen)) fsBtn.hidden = true;
    d.addEventListener('fullscreenchange', function () {
      if (!fsBtn) return;
      var on = !!d.fullscreenElement;
      fsBtn.setAttribute('aria-label', on ? 'Iziet no pilnekrāna režīma' : 'Pilnekrāna režīms');
    });
    var x0 = null, y0 = null;
    lb.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* ---------- request form: builds a WhatsApp message or an e-mail ---------- */
  var frm = $('#frm');
  var veids = $('#f-veids');
  var fW = $('#f-w'), fH = $('#f-h');
  var summary = $('#summary');
  var izvele = $('#f-izvele');

  var SIZE = {
    def: { legend: 'Ailes izmērs, mm', w: 'Platums', h: 'Augstums', pw: '3000', ph: '2400', unit: 'mm' },
    zogi: { legend: 'Žoga izmērs, m', w: 'Garums', h: 'Augstums', pw: '30', ph: '1,5', unit: 'm' }
  };
  function currentSlug() {
    if (!veids) return '';
    var o = veids.options[veids.selectedIndex];
    return o ? (o.getAttribute('data-slug') || '') : '';
  }
  function applySizeLabels() {
    var s = SIZE[currentSlug()] || SIZE.def;
    var lg = $('#l-size'), lw = $('#l-w'), lh = $('#l-h');
    if (lg) lg.textContent = s.legend;
    if (lw) lw.textContent = s.w;
    if (lh) lh.textContent = s.h;
    if (fW) fW.placeholder = s.pw;
    if (fH) fH.placeholder = s.ph;
  }
  function sizeText() {
    var s = SIZE[currentSlug()] || SIZE.def;
    var w = fW && fW.value.trim(), h = fH && fH.value.trim();
    if (w && h) return w + ' × ' + h + ' ' + s.unit;
    if (w) return s.w.toLowerCase() + ' ' + w + ' ' + s.unit;
    if (h) return s.h.toLowerCase() + ' ' + h + ' ' + s.unit;
    return '';
  }
  function updateSummary() {
    if (!summary) return;
    var parts = [veids && veids.value ? veids.value : 'veids nav izvēlēts'];
    var st = sizeText();
    if (st) parts.push(st);
    if (izvele && izvele.value) parts.push(izvele.value);
    summary.textContent = 'Pieteikums: ' + parts.join(', ');
  }
  function selectSlug(slug) {
    if (!veids || !slug) return false;
    for (var i = 0; i < veids.options.length; i++) {
      if (veids.options[i].getAttribute('data-slug') === slug) { veids.selectedIndex = i; return true; }
    }
    return false;
  }

  if (veids) {
    var q = /[?&]veids=([a-z-]+)/.exec(location.search);
    if (q) selectSlug(q[1]);
    var unit = (SIZE[currentSlug()] || SIZE.def).unit;
    var onType = function () {
      // the colour choice belongs to lifting gates only
      if (izvele && izvele.value && currentSlug() !== 'pacelamie-varti') izvele.value = '';
      // sizes typed in mm make no sense in m and back: clear them when the unit changes
      var u = (SIZE[currentSlug()] || SIZE.def).unit;
      if (u !== unit) { if (fW) fW.value = ''; if (fH) fH.value = ''; unit = u; }
      applySizeLabels();
      updateSummary();
    };
    veids.addEventListener('change', onType);
    [fW, fH].forEach(function (el) { if (el) el.addEventListener('input', updateSummary); });
    applySizeLabels();
    updateSummary();
  }

  // after a sent request, any way back to the form shows the form again
  function reopenForm() {
    var done = $('#done');
    if (frm && frm.hidden && done) { done.hidden = true; frm.hidden = false; }
  }

  // any "request for this type" link fills the type in on the way to the form
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-veids]');
    if (!a || !veids) return;
    if (a.getAttribute('href').charAt(0) !== '#') return;
    reopenForm();
    selectSlug(a.getAttribute('data-veids'));
    onType();
    if (fW) setTimeout(function () { fW.focus({ preventScroll: true }); }, reduce ? 0 : 600);
  });

  if (frm) {
    var name = $('#f-name'), tel = $('#f-tel'), mail = $('#f-mail'), msg = $('#f-msg');
    var status = $('#frm-status'), done = $('#done'), doneT = $('#done-t'), doneP = $('#done-p');
    var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var checks = [
      [name, $('#e-name'), function () { return !name.value.trim(); }],
      [tel, $('#e-tel'), function () { return tel.value.replace(/\D/g, '').length < 8; }],
      [mail, $('#e-mail'), function () { return mail.value.trim() !== '' && !mailRe.test(mail.value.trim()); }]
    ];
    var setErr = function (input, errEl, bad) {
      if (!input || !errEl) return;
      if (bad) { input.setAttribute('aria-invalid', 'true'); errEl.hidden = false; }
      else { input.removeAttribute('aria-invalid'); errEl.hidden = true; }
    };
    checks.forEach(function (c) {
      if (!c[0]) return;
      c[0].addEventListener('blur', function () { if (c[0].value) setErr(c[0], c[1], c[2]()); });
      c[0].addEventListener('input', function () { if (c[0].getAttribute('aria-invalid') === 'true') setErr(c[0], c[1], c[2]()); });
    });

    var via = 'wa';
    $$('button[name="via"]', frm).forEach(function (b) {
      b.addEventListener('click', function () { via = b.value; });
    });

    var showDone = function () {
      frm.hidden = true;
      if (done) {
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        // the form above just collapsed: bring the confirmation into view
        var section = $('#pieteikums');
        (section || done).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        done.focus({ preventScroll: true });
      }
      if (status) status.textContent = doneT ? doneT.textContent : '';
    };

    // vartupasaule.lv: "Nosūtīt pa e-pastu" sends through the site's send.php
    var endpoint = frm.getAttribute('data-endpoint');
    var opened = Date.now();
    var sending = false;
    var sendErr = $('#e-send');
    var sendToServer = function () {
      if (sending) return;
      sending = true;
      var btn = $('button[name="via"][value="mail"]', frm);
      var label = btn ? btn.lastChild : null;
      var was = label ? label.nodeValue : '';
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      if (label) label.nodeValue = 'Sūta…';
      if (sendErr) sendErr.hidden = true;
      var fd = new FormData(frm);
      fd.set('veids', veids && veids.value ? veids.value : '');
      fd.set('izmers', sizeText() || '');
      fd.set('t', String(Date.now() - opened));
      var ctrl = window.AbortController ? new AbortController() : null;
      var tmo = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch(endpoint, { method: 'POST', body: fd, credentials: 'same-origin', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json().then(function (j) { return r.ok && j && j.ok === true; }, function () { return false; }); })
        .catch(function () { return false; })
        .then(function (ok) {
          clearTimeout(tmo);
          sending = false;
          if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
          if (label) label.nodeValue = was;
          if (ok) {
            if (doneT) doneT.textContent = 'Pieteikums nosūtīts';
            if (doneP) doneP.textContent = 'Mēs ar jums sazināsimies. Steidzamā gadījumā zvaniet +371\u00a029146306.';
            showDone();
          } else {
            var msgErr = 'Neizdevās nosūtīt pieteikumu. Mēģiniet vēlreiz vai zvaniet +371\u00a029146306.';
            if (sendErr) { sendErr.textContent = msgErr; sendErr.hidden = false; }
            if (status) status.textContent = msgErr;
          }
        });
    };

    frm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (e.submitter && e.submitter.value) via = e.submitter.value;
      var first = null;
      checks.forEach(function (c) {
        var bad = c[2]();
        setErr(c[0], c[1], bad);
        if (bad && !first) first = c[0];
      });
      if (first) {
        if (status) status.textContent = 'Formā ir kļūdas. Pārbaudiet atzīmētos laukus.';
        first.focus();
        return;
      }
      var lines = ['Labdien! Pieteikums no mājaslapas.'];
      lines.push('Veids: ' + (veids && veids.value ? veids.value : 'nav norādīts'));
      var st = sizeText();
      if (st) lines.push('Izmērs: ' + st);
      if (izvele && izvele.value) lines.push('Izvēle: ' + izvele.value);
      lines.push('Vārds: ' + name.value.trim());
      lines.push('Tālrunis: ' + tel.value.trim());
      if (mail.value.trim()) lines.push('E-pasts: ' + mail.value.trim());
      if (msg && msg.value.trim()) lines.push('Piezīmes: ' + msg.value.trim());
      var text = lines.join('\n');

      if (via === 'mail' && endpoint && window.fetch && window.FormData) {
        sendToServer();
        return;
      }
      if (via === 'mail') {
        var subj = 'Pieteikums no mājaslapas' + (veids && veids.value ? ': ' + veids.value.charAt(0).toLowerCase() + veids.value.slice(1) : '');
        location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(text);
        if (doneT) doneT.textContent = 'E-pasta programmā ir sagatavota vēstule';
        if (doneP) doneP.textContent = 'Pārbaudiet vēstuli un nospiediet „Sūtīt“. Ja e-pasta programma neatvērās, zvaniet vai rakstiet WhatsApp.';
      } else {
        // no 'noopener' feature here: with it window.open always returns null
        var w = window.open('https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent(text), '_blank');
        if (w) { try { w.opener = null; } catch (x) {} }
        if (doneT) doneT.textContent = w ? 'WhatsApp ir sagatavota ziņa' : 'WhatsApp neatvērās';
        if (doneP) doneP.textContent = w
          ? 'Pārbaudiet ziņu un nosūtiet to. Ja WhatsApp neatvērās, zvaniet vai rakstiet pa e-pastu.'
          : 'Pārlūkprogramma bloķēja jauno logu. Zvaniet vai nosūtiet pieteikumu pa e-pastu.';
      }
      showDone();
    });

    var again = $('#again');
    if (again && done) {
      again.addEventListener('click', function () {
        done.hidden = true;
        frm.hidden = false;
        if (status) status.textContent = '';
        if (name) name.focus();
      });
    }
  }

  /* ---------- paceļamie: colour, panel and options on a drawn door ---------- */
  var pick = $('#pick');
  if (pick) {
    var svg = $('.pick__svg', pick);
    var cap = $('#pick-cap');
    var val = function (n) { var el = $('input[name="' + n + '"]:checked', pick); return el ? el : null; };
    var render = function () {
      var kind = val('p-veids'), col = val('p-krasa'), surf = val('p-virsma'), win = $('#p-logi', pick);
      var pano = kind && kind.value === 'panorama';
      // wood finishes are named for panel doors only; panoramic frames stay in RAL colours
      $$('input[data-wood]', pick).forEach(function (i) { i.disabled = pano; });
      if (pano && col && col.hasAttribute('data-wood')) {
        var def = $('#pk-7016', pick);
        if (def) { def.checked = true; col = def; }
      }
      svg.style.setProperty('--door', col ? col.getAttribute('data-fill') : '#383E42');
      svg.setAttribute('data-kind', kind ? kind.value : 'parastie');
      svg.setAttribute('data-surf', surf ? surf.value : 'rievots');
      svg.setAttribute('data-wood', col && col.hasAttribute('data-wood') ? col.getAttribute('data-wood') : '');
      svg.setAttribute('data-win', win && win.checked && !pano ? '1' : '');
      $$('input[name="p-virsma"]', pick).forEach(function (i) { i.disabled = pano; });
      if (win) win.disabled = pano;
      var note = $('#pick-pano');
      if (note) note.hidden = !pano;
      var parts = [kind ? kind.getAttribute('data-label') : '', col ? col.getAttribute('data-label') : ''];
      if (!pano && surf) parts.push(surf.getAttribute('data-label'));
      if (!pano && win && win.checked) parts.push('ar logiem');
      var txt = parts.filter(Boolean).join(', ');
      if (cap) cap.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
      return txt;
    };
    pick.addEventListener('change', render);
    render();
    var add = $('#pick-add');
    if (add) {
      add.addEventListener('click', function () {
        var txt = render();
        reopenForm();
        selectSlug('pacelamie-varti');
        onType();
        if (izvele) izvele.value = txt;
        updateSummary();
        var target = $('#pieteikums');
        if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (fW) setTimeout(function () { fW.focus({ preventScroll: true }); }, reduce ? 0 : 650);
      });
    }
  }

  /* ---------- automātika: pick a way to open, the drawn gate answers ---------- */
  // One timeline per click (about 7 s): the device acts, the signal reaches the
  // antenna, the lamp flashes, the gate rolls behind the fence, the car drives
  // into the yard behind the gate, the gate closes in front of it, the car is
  // parked and a new one waits on the driveway. A second click mid-way first
  // winds the scene back smoothly. Without GSAP or with reduced motion the
  // scene only switches between "open" and "closed".
  var ways = $('#ways');
  if (ways) {
    var wStatus = $('#ways-status');
    var buttons = $$('.way', ways);
    var S = function (id) { return $('#' + id, ways); };
    var svgEl = $('.ways__svg', ways);
    var gate = S('w-gate'), car = S('w-car'), glow = S('w-lamp-glow'), lamp = S('w-lamp'), beam = S('w-beam'),
      led = S('w-led'), sig = S('w-sig'), ant = S('w-ant'), antRing = S('w-ant-ring'),
      slotBack = S('w-slot-back'), slotFront = S('w-slot-front');
    var devs = { pults: S('dev-pults'), poga: S('dev-poga'), lietotne: S('dev-lietotne'), zvans: S('dev-zvans') };
    var G = window.gsap;
    var tl = null, blink = null, timer = null, touched = false, shown = 'pults';
    var SHUT = 'Vārti ir aizvērti. Izvēlieties citu veidu.';
    var OPEN_X = -252;
    var sigLen = sig ? sig.getTotalLength() : 0;

    // phones: frame the gate, operator and card, drop the house
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 560px)') : null;
    var fit = function () { if (svgEl) svgEl.setAttribute('viewBox', narrow && narrow.matches ? '150 8 610 392' : '0 0 760 400'); };
    fit();
    if (narrow && narrow.addEventListener) narrow.addEventListener('change', fit);

    if (G) {
      // transform origins are set once; passing svgOrigin again after a scale makes GSAP shift the element
      // the markup carries the same .85 scale for the no-GSAP case; GSAP starts from a clean transform
      car.removeAttribute('transform');
      G.set(car, { svgOrigin: '436 394' });
      G.set(car, { scale: 0.85 });
      G.set(S('pults-btn'), { svgOrigin: '60 64' });
      G.set(S('pults-ring'), { svgOrigin: '60 64' });
      G.set(S('poga-btn'), { svgOrigin: '71 85' });
      G.set(S('poga-ring'), { svgOrigin: '71 85' });
      G.set(S('app-tap'), { svgOrigin: '71 111' });
      G.set(antRing, { svgOrigin: '284 172' });
    }

    var lampOff = function () {
      if (blink) { blink.kill(); blink = null; }
      if (G) { G.set(glow, { opacity: 0 }); G.set(lamp, { attr: { fill: '#D39A22' } }); }
      else { glow.setAttribute('opacity', '0'); lamp.setAttribute('fill', '#D39A22'); }
    };
    var colours = function () {
      // every colour an interrupted tween could leave behind goes back to its drawing value
      G.set(ant, { attr: { fill: '#2A2E32' } });
      G.set(led, { attr: { fill: '#4CAF7D' } });
      G.set(S('pults-led'), { attr: { fill: '#5E666D' } });
      G.set([S('poga-btn'), S('app-btn')], { attr: { fill: '#F8BB22' } });
      G.set([S('pults-btn'), S('poga-btn')], { scale: 1 });
      G.set([S('pults-ring'), S('poga-ring'), S('app-tap'), S('zvans-ring'), antRing, sig], { opacity: 0 });
    };
    var showDevice = function (t, way) {
      if (way === shown) return;
      t.to(devs[shown], { opacity: 0, y: -4, duration: 0.15 }, 0)
        .fromTo(devs[way], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 }, 0.1);
      shown = way;
    };
    var ring = function (t, el, at) {
      t.fromTo(el, { opacity: 1, scale: 0.8 }, { opacity: 0, scale: 2.4, duration: 0.55, ease: 'power1.out' }, at);
    };
    var deviceAction = function (t, way) {
      if (way === 'pults') {
        t.to(S('pults-btn'), { scale: 0.72, attr: { fill: '#E3A60F' }, duration: 0.12, yoyo: true, repeat: 1 });
        ring(t, S('pults-ring'), '<');
        t.to(S('pults-led'), { attr: { fill: '#FFC845' }, duration: 0.08, yoyo: true, repeat: 3 }, '<');
      } else if (way === 'poga') {
        t.to(S('poga-btn'), { scale: 0.84, attr: { fill: '#E3A60F' }, duration: 0.14, yoyo: true, repeat: 1 });
        ring(t, S('poga-ring'), '<');
      } else if (way === 'lietotne') {
        t.to(S('app-btn'), { attr: { fill: '#E3A60F' }, duration: 0.14, yoyo: true, repeat: 1 });
        ring(t, S('app-tap'), '<');
      } else {
        t.to(S('zvans-ring'), { opacity: 1, duration: 0.16, yoyo: true, repeat: 3, ease: 'none' });
      }
    };
    var say = function (text) { if (wStatus && touched) wStatus.textContent = text; };

    // static fallback: no GSAP or reduced motion
    var staticPlay = function (way, auto) {
      clearTimeout(timer);
      Object.keys(devs).forEach(function (k) { devs[k].setAttribute('opacity', k === way ? '1' : '0'); if (G) G.set(devs[k], { opacity: k === way ? 1 : 0 }); });
      shown = way;
      var open = function (on) {
        gate.setAttribute('transform', on ? 'translate(' + OPEN_X + ' 0)' : '');
        if (G) G.set(gate, { x: on ? OPEN_X : 0 });
        lamp.setAttribute('fill', on ? '#FFC845' : '#D39A22');
        glow.setAttribute('opacity', on ? '.8' : '0');
        beam.setAttribute('opacity', on ? '.9' : '0');
        led.setAttribute('fill', on ? '#F8BB22' : '#4CAF7D');
        if (G) G.set([lamp, glow, beam, led], { clearProps: 'opacity' });
      };
      open(true);
      timer = setTimeout(function () { open(false); say(SHUT); }, 3500);
    };

    var play = function (way) {
      if (!G || reduce) { staticPlay(way); return; }
      var gx = G.getProperty(gate, 'x');
      var carBehind = car.parentNode === slotBack;
      var carMoved = carBehind || Math.abs(G.getProperty(car, 'y')) > 1 || G.getProperty(car, 'opacity') < 0.99;
      if (tl) tl.kill();
      clearTimeout(timer);
      lampOff();
      colours();

      tl = G.timeline();
      // wind back whatever an earlier run left open, without jumps
      var back = 0;
      if (gx < -1) {
        back = Math.max(0.35, Math.abs(gx) / -OPEN_X * 1.0);
        tl.to(gate, { x: 0, duration: back, ease: 'power2.inOut' }, 0);
      }
      if (carMoved) {
        tl.to(car, { opacity: 0, duration: 0.2 }, 0)
          .call(function () { slotFront.appendChild(car); })
          .set(car, { y: 26, scale: 0.85 })
          .to(car, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
        back = Math.max(back, 0.55);
      }
      showDevice(tl, way);
      var t0 = Math.max(back, 0.3);

      var dev = G.timeline();
      deviceAction(dev, way);
      tl.add(dev, t0);

      // signal: three short dashes from the device to the antenna, then the operator answers
      tl.set(sig, { opacity: 1, attr: { 'stroke-dasharray': '12 16 12 16 12 ' + sigLen, 'stroke-dashoffset': 68 } })
        .to(sig, { attr: { 'stroke-dashoffset': -sigLen }, duration: 0.6, ease: 'none' })
        .set(sig, { opacity: 0 })
        .fromTo(ant, { attr: { fill: '#F8BB22' } }, { attr: { fill: '#2A2E32' }, duration: 0.3 }, '<');
      ring(tl, antRing, '<');
      tl.call(function () {
          // a beacon: one second period, half lit
          blink = G.timeline({ repeat: -1 })
            .set(lamp, { attr: { fill: '#FFC845' } }).to(glow, { opacity: 1, duration: 0.08 })
            .to({}, { duration: 0.42 })
            .set(lamp, { attr: { fill: '#B8841C' } }).to(glow, { opacity: 0, duration: 0.12 })
            .to({}, { duration: 0.38 });
        })
        .set(led, { attr: { fill: '#F8BB22' } })
        .to(beam, { opacity: 0.9, duration: 0.2 }, '<')
        // gate: short start, steady run, soft stop
        .to(gate, { x: -26, duration: 0.3, ease: 'power1.in' }, '+=0.1')
        .to(gate, { x: -226, duration: 1.3, ease: 'none' })
        .to(gate, { x: OPEN_X, duration: 0.3, ease: 'power1.out' })
        .addLabel('opened')
        // car: rolls to the threshold, passes under the gate line into the yard and stops by the garage
        .to(car, { y: -94, scale: 0.62, duration: 1.2, ease: 'sine.in' }, 'opened-=1.0')
        .call(function () { slotBack.appendChild(car); })
        .to(car, { y: -114, scale: 0.5, duration: 0.7, ease: 'sine.out' })
        .to(gate, { x: -226, duration: 0.3, ease: 'power1.in' }, '+=0.25')
        .to(gate, { x: -26, duration: 1.3, ease: 'none' })
        .to(gate, { x: 0, duration: 0.3, ease: 'power1.out' })
        .to(beam, { opacity: 0, duration: 0.25 })
        .call(function () {
          lampOff();
          G.set(led, { attr: { fill: '#4CAF7D' } });
          say(SHUT);
        })
        // the parked car fades, the next one waits on the driveway
        .to(car, { opacity: 0, duration: 0.4 }, '+=0.3')
        .call(function () { slotFront.appendChild(car); })
        .set(car, { y: 26, scale: 0.85 })
        .to(car, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    };

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        touched = true;
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        if (wStatus) wStatus.textContent = b.getAttribute('data-status') || '';
        // on phones the buttons sit under the scene: bring the scene back into view first
        var stage = $('.ways__stage', ways);
        var r = stage.getBoundingClientRect();
        var hdrH = ($('.hdr') || stage).getBoundingClientRect().height || 68;
        if (r.top < hdrH + 4 || r.bottom > window.innerHeight) {
          stage.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
          setTimeout(function () { play(b.getAttribute('data-way')); }, reduce ? 0 : 350);
        } else {
          play(b.getAttribute('data-way'));
        }
      });
    });

    // shown once by itself when the scene first comes into view (silent for screen readers)
    if (G && !reduce && 'IntersectionObserver' in window) {
      var wio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          wio.disconnect();
          setTimeout(function () { if (!touched) play('pults'); }, 700);
        });
      }, { threshold: 0.6 });
      wio.observe($('.ways__stage', ways));
    }
  }
})();
