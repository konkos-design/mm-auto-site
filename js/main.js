/* M&M Auto Repair Centre — interactions */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var PHONE_SMS = '+61469431798';
  var TZ = 'Australia/Sydney';
  var OPEN_MIN = 8 * 60 + 30, CLOSE_MIN = 17 * 60 + 30; // Mon–Fri

  /* ---------- Split headings into words ---------- */
  $$('[data-split]').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var parts = ch.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.style.setProperty('--i', i++); inner.textContent = p;
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) { walk(ch); }
      });
    })(el);
    el.classList.add('split');
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('[data-reveal], [data-split], #steps, .reviews-cta');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Header, progress, parallax ---------- */
  var header = $('#header'), progress = $('#progress'), totop = $('#totop'), mbar = $('#mbar');
  var parallax = $$('[data-parallax]');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    header.classList.toggle('scrolled', y > 30);
    var menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('hide', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('hide');
    totop.classList.toggle('show', y > 900);
    if (mbar) mbar.classList.toggle('show', y > 400);
    if (!reduce) {
      parallax.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
        el.style.transform = 'translate3d(0,' + (-r.top * speed).toFixed(1) + 'px,0)';
      });
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- Active nav link ---------- */
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) secIO.observe(s); });
  }

  /* ---------- Mobile menu ---------- */
  var burger = $('#burger'), menu = $('#mobileMenu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    if (open) header.classList.remove('hide');
  }
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- Open / closed status (Sydney time) ---------- */
  function sydneyNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], min: parseInt(o.hour, 10) % 24 * 60 + parseInt(o.minute, 10) };
    } catch (e) { var d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function fmt(min) { var h = Math.floor(min / 60), m = min % 60; return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? 'am' : 'pm'); }
  function updateStatus() {
    var n = sydneyNow(), weekday = n.day >= 1 && n.day <= 5;
    var open = weekday && n.min >= OPEN_MIN && n.min < CLOSE_MIN;
    var text, sub;
    if (open) {
      var left = CLOSE_MIN - n.min;
      text = 'Open now'; sub = left <= 60 ? 'Closing soon — until ' + fmt(CLOSE_MIN) : 'Until ' + fmt(CLOSE_MIN) + ' today';
    } else {
      text = 'Closed now';
      if (weekday && n.min < OPEN_MIN) sub = 'Opens today at ' + fmt(OPEN_MIN);
      else if (n.day >= 1 && n.day <= 4) sub = 'Opens tomorrow at ' + fmt(OPEN_MIN);
      else sub = 'Opens Monday at ' + fmt(OPEN_MIN);
    }
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', open); el.classList.toggle('is-closed', !open);
      var t = $('[data-status-text]', el); if (t) t.textContent = el.classList.contains('status-pill') ? text + ' · ' + sub.replace(' today', '') : text;
      var s = $('[data-status-sub]', el); if (s) s.textContent = sub + ' (Sydney time)';
    });
    $$('#hours li').forEach(function (li) { li.classList.toggle('today', +li.getAttribute('data-day') === n.day); });
  }
  updateStatus(); setInterval(updateStatus, 60000);
  var yn = $('#yearNow'); if (yn) yn.textContent = new Date().getFullYear();

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px');
        b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px');
      });
      b.addEventListener('mouseleave', function () { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
    /* tilt + spotlight cards */
    $$('[data-tilt]').forEach(function (c) {
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
        if (c.classList.contains('in')) c.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 5).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 6).toFixed(2) + 'deg) translateY(-4px)';
      });
      c.addEventListener('mouseleave', function () { c.style.transform = ''; });
    });
  }

  /* ---------- Service drawer ---------- */
  var SERVICES = {
    euro: {
      title: 'European car specialists', img: 'img/mercedes-teardown.webp', book: 'European car service or repair',
      text: 'Mercedes-Benz, BMW, Audi, Volkswagen, Porsche and Land Rover are regular visitors in our workshop. Modern European cars need the right diagnostic equipment, oils that meet the manufacturer\'s approval specs, and mechanics who know their common problems — that\'s exactly what we focus on.',
      inc: ['Scheduled servicing using oils that meet the manufacturer\'s approval specification', 'Diagnostic scans of engine, transmission and body control modules', 'Engine, timing chain and oil-leak repairs', 'Brake pads, rotors and wear sensors', 'Suspension, steering and cooling system repairs', 'Pink slip safety inspections'],
      signs: ['Warning messages on the instrument cluster', 'Oil leaks or a burning-oil smell', 'Rough idle, hesitation or the car going into "limp mode"', 'Service reminder showing on the dash']
    },
    servicing: {
      title: 'Logbook & general servicing', img: 'img/workshop-inside.webp', book: 'Logbook / general service',
      text: 'Regular servicing is the cheapest insurance for your car. We carry out logbook services to the manufacturer\'s schedule and general services for older vehicles. Under Australian Consumer Law, your new-car warranty can\'t be voided just because an independent workshop did the service — as long as it follows the manufacturer\'s schedule and specifications.',
      inc: ['Engine oil and filter change with quality oils', 'Check and top up coolant, brake, power-steering and washer fluids', 'Air and cabin filters as scheduled', 'Inspection of brakes, tyres, suspension and steering', 'Battery and charging system test', 'Lights, wipers and horn check', 'Logbook stamped'],
      signs: ['Service light or reminder on the dashboard', 'Due by kilometres or months in your logbook', 'Oil dark, dirty or low on the dipstick', 'New noises, vibrations or leaks']
    },
    pinkslip: {
      title: 'Pink slips & safety checks', img: 'img/storefront.webp', book: 'Pink slip (safety check)',
      text: 'We\'re an authorised safety check station. In NSW, most light vehicles more than 5 years old need a safety inspection report (pink slip) before registration can be renewed, and the report must be used within 6 months. If your car doesn\'t pass, we\'ll show you exactly what needs fixing — and we can do the repairs in the same workshop.',
      inc: ['Safety inspections for cars and light vehicles', 'Motorcycle inspections', 'Defect notice clearance', 'Identity and design checks', 'Repairs to get a failed vehicle through'],
      signs: ['Your rego renewal notice says a safety inspection is required', 'You\'ve received a defect notice', 'Your car is more than 5 years old and rego is due']
    },
    engine: {
      title: 'Engine repairs & rebuilds', img: 'img/engine-block.webp', book: 'Engine repair',
      text: 'From oil leaks and misfires to head gasket replacement and complete engine removal, our workshop is set up for major engine work — including engine cranes for lifting engines out of the bay. We find the cause first, explain your options, and quote before we start.',
      inc: ['Fault diagnosis before any work begins', 'Head gasket and cylinder head work', 'Timing belt and timing chain replacement', 'Oil and coolant leak repairs', 'Engine removal and replacement', 'Turbo, intake and ignition repairs'],
      signs: ['White smoke from the exhaust or coolant disappearing', 'Milky residue under the oil cap', 'Knocking, ticking or rattling noises', 'Overheating or loss of power']
    },
    aircon: {
      title: 'Air-conditioning', img: 'img/engine-hoist.webp', book: 'Air-conditioning',
      text: 'A Sydney summer is no time for warm air. We check your system\'s performance, find leaks and repair the components — so your air-con blows cold again and stays that way, rather than just being topped up.',
      inc: ['Performance check and vent temperature test', 'Leak detection', 'System re-gas with the correct refrigerant for your car', 'Compressor, condenser and cooling fan repairs', 'Cabin filter replacement'],
      signs: ['Air isn\'t cold, or only cold when driving', 'Musty smell from the vents', 'Clicking or grinding when the air-con is on', 'Water on the passenger floor']
    },
    brakes: {
      title: 'Brakes', img: 'img/workshop-inside.webp', book: 'Brakes',
      text: 'Your brakes are the most important safety system on your car. We measure pads and rotors, check the hydraulics and explain what actually needs replacing — and what can wait.',
      inc: ['Brake inspection and measurement', 'Pad and rotor replacement', 'Brake fluid flush', 'Caliper and brake hose repairs', 'ABS fault diagnosis', 'Handbrake adjustment'],
      signs: ['Squealing or grinding when braking', 'Pulsing or vibrating brake pedal', 'Car pulls to one side under braking', 'Soft or spongy pedal', 'Brake or ABS warning light']
    },
    diag: {
      title: 'Diagnostics', img: 'img/mercedes-teardown.webp', book: 'Diagnostics / warning light',
      text: 'A warning light is the car telling you something — a scan tool tells us what. We read the fault codes, check live data and test the components involved, so you pay to fix the actual problem rather than replacing parts by trial and error.',
      inc: ['Computer scan of engine and vehicle modules', 'Live-data and component testing', 'Electrical fault tracing', 'A clear explanation of the fault and options before any repair'],
      signs: ['Check-engine or other warning light on', 'Car in limp mode or losing power', 'Fuel economy suddenly worse', 'Hard starting or stalling']
    },
    electrical: {
      title: 'Battery & electrical', img: 'img/engine-hoist.webp', book: 'Battery & electrical',
      text: 'Modern cars are full of electronics, and a weak battery or charging fault can cause all sorts of strange symptoms. We test the whole system — battery, alternator and starter — before replacing anything.',
      inc: ['Battery testing and replacement', 'Alternator and starter motor repairs', 'Lights, wiring and sensor faults', 'Central locking and power window faults'],
      signs: ['Slow cranking when starting', 'Battery warning light on', 'Dim or flickering lights', 'Electrical items working on and off']
    },
    cooling: {
      title: 'Cooling & radiators', img: 'img/engine-block.webp', book: 'Cooling / radiator',
      text: 'Overheating can warp a cylinder head in minutes. We pressure-test the cooling system and repair leaks, pumps and thermostats before a small problem turns into an engine repair.',
      inc: ['Radiator and hose replacement', 'Water pump and thermostat replacement', 'Coolant flush and refill', 'Cooling fan diagnosis and repair', 'Cooling system leak testing'],
      signs: ['Temperature gauge climbing', 'Sweet smell or steam from the engine bay', 'Coolant puddles under the car', 'Coolant level keeps dropping']
    },
    timing: {
      title: 'Timing belts & chains', img: 'img/engine-block.webp', book: 'Timing belt or chain',
      text: 'Timing belts have a replacement interval set by the manufacturer (in kilometres or years). On many engines, a snapped belt lets the valves hit the pistons — turning a routine job into a major engine repair. Timing chains last longer but can stretch, especially on some European engines.',
      inc: ['Timing belt, tensioner and idler replacement', 'Water pump replacement where it\'s belt-driven', 'Timing chain and guide replacement', 'Drive (serpentine) belt replacement'],
      signs: ['Your logbook says the belt is due', 'Rattle from the engine on cold start (chain)', 'Squealing from the front of the engine', 'Cracks or fraying on the drive belt']
    },
    general: {
      title: 'Suspension, steering & more', img: 'img/storefront-sunny.webp', book: 'Suspension, steering & other',
      text: 'Everything else that keeps your car comfortable and safe to drive — from worn shocks and bushes to steering, exhaust and clutch problems.',
      inc: ['Shock absorbers and struts', 'Control arms, bushes and ball joints', 'Steering racks and tie-rod ends', 'Exhaust repairs', 'Clutch and transmission servicing'],
      signs: ['Clunks over bumps', 'Car wanders or pulls to one side', 'Uneven tyre wear', 'Bouncy or floaty ride']
    }
  };
  var drawer = $('#drawer'), dBody = $('#drawerBody'), dImg = $('#drawerImg'), dBook = $('#drawerBook');
  var lastFocus = null, currentBook = '';
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function openDrawer(key) {
    var s = SERVICES[key]; if (!s) return;
    lastFocus = document.activeElement;
    dImg.src = s.img; dImg.alt = '';
    currentBook = s.book;
    dBody.innerHTML = '<h3 class="h-md" id="drawerTitle">' + esc(s.title) + '</h3>' +
      '<p>' + esc(s.text) + '</p>' +
      '<div><h4>What\'s included</h4><ul class="check">' + s.inc.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4>Signs you need it</h4><ul class="check check--warn">' + s.signs.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
    dBody.scrollTop = 0;
    drawer.classList.remove('open'); void drawer.offsetWidth;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('.drawer__close', drawer).focus(); }, 50);
  }
  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-svc]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(b.getAttribute('data-svc')); }); });
  $$('[data-open]').forEach(function (a) { a.addEventListener('click', function () { var k = a.getAttribute('data-open'); setTimeout(function () { openDrawer(k); }, 600); }); });
  $$('[data-close]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawer); });
  dBook.addEventListener('click', function () { closeDrawer(); presetService(currentBook); });

  /* ---------- Preset booking service ---------- */
  var svcSelect = $('#f-svc');
  function presetService(name) {
    if (!name) return;
    for (var i = 0; i < svcSelect.options.length; i++) {
      if (svcSelect.options[i].text === name) { svcSelect.selectedIndex = i; svcSelect.closest('.field').classList.remove('err'); break; }
    }
  }
  $$('[data-preset]').forEach(function (a) { a.addEventListener('click', function () { presetService(a.getAttribute('data-preset')); }); });

  /* ---------- Pink slip checker ---------- */
  var yr = $('#year'), yrOut = $('#yearOut'), verdict = $('#verdict');
  var thisYear = new Date().getFullYear();
  yr.max = thisYear;
  function check() {
    var y = +yr.value, age = thisYear - y;
    yrOut.textContent = y;
    var cls, title, sub;
    if (age > 5) { cls = ''; title = 'Yes — you\'ll most likely need a pink slip'; sub = 'Your car is around ' + age + ' years old. Most light vehicles over 5 years old need a safety inspection report before rego renewal. Book in and we\'ll take care of it.'; }
    else if (age >= 4) { cls = 'maybe'; title = 'Possibly — you\'re close to the 5-year mark'; sub = 'It depends on when your car was manufactured or first registered. Check your rego renewal notice — it will say if an inspection is needed.'; }
    else { cls = 'no'; title = 'Probably not yet'; sub = 'Light vehicles under 5 years old generally don\'t need a pink slip for rego renewal. A regular logbook service still keeps it in top shape.'; }
    verdict.className = 'verdict ' + cls;
    verdict.innerHTML = '<b>' + title + '</b><span>' + sub + '</span>';
    void verdict.offsetWidth; verdict.classList.add('anim');
  }
  yr.addEventListener('input', check); check();

  /* ---------- Warning lights ---------- */
  var LIGHTS = {
    oil: { c: 'red', t: 'Oil pressure', m: 'The engine has lost oil pressure — it may be very low on oil, or the oil pump or sensor has a problem. Without oil pressure, an engine can be seriously damaged within minutes.', d: 'Pull over as soon as it\'s safe and switch the engine off. Check the oil level once it\'s cooled. Don\'t keep driving — call us for advice.', svc: 'Engine repair' },
    temp: { c: 'red', t: 'Engine overheating', m: 'The coolant temperature is too high. Causes include low coolant, a leak, a failed water pump, thermostat or cooling fan.', d: 'Stop safely and switch off. Never open the radiator cap while the engine is hot — the coolant is under pressure. Get it checked before driving further.', svc: 'Cooling / radiator' },
    brake: { c: 'red', t: 'Brake system', m: 'Usually means the handbrake is on, the brake fluid is low, or there\'s a fault in the brake system.', d: 'Check the handbrake is fully released. If the light stays on, don\'t drive the car — low fluid can mean a leak or badly worn pads. Call us.', svc: 'Brakes' },
    battery: { c: 'red', t: 'Battery / charging', m: 'The charging system isn\'t working — often the alternator or drive belt. The car is now running on battery power alone and will eventually stop.', d: 'Turn off non-essential electrics (air-con, heated seats, radio) and drive straight to us or somewhere safe. Avoid switching the engine off until you get there.', svc: 'Battery & electrical' },
    engine: { c: 'amber', t: 'Check engine', m: 'The engine management system has stored a fault. It could be anything from a loose fuel cap to a faulty sensor or misfire.', d: 'If it\'s steady, book a diagnostic scan soon. If it\'s flashing, the engine is misfiring — reduce speed, avoid heavy acceleration and get it checked straight away to avoid damaging the catalytic converter.', svc: 'Diagnostics / warning light' },
    abs: { c: 'amber', t: 'ABS', m: 'The anti-lock braking system has a fault and is switched off. Your normal brakes still work, but the wheels can lock under hard braking.', d: 'Drive carefully, leave extra stopping distance, and book a scan — it\'s often a wheel-speed sensor.', svc: 'Brakes' },
    tyre: { c: 'amber', t: 'Tyre pressure (TPMS)', m: 'One or more tyres is below the recommended pressure, or the tyre pressure monitoring system has a fault.', d: 'Check and inflate the tyres to the pressure on the driver\'s door placard. If a tyre keeps going down, have it checked for a puncture.', svc: 'Suspension, steering & other' },
    glow: { c: 'amber', t: 'Diesel glow plugs', m: 'On a diesel, this light comes on briefly while the glow plugs pre-heat. If it flashes or stays on while driving, the engine management has found a fault.', d: 'Wait for it to go out before starting a cold diesel. If it flashes or stays on, book a diagnostic scan.', svc: 'Diagnostics / warning light' }
  };
  var info = $('#lightInfo'), wls = $$('.wl');
  function showLight(key, focus) {
    var L = LIGHTS[key];
    wls.forEach(function (w) { var on = w.getAttribute('data-light') === key; w.classList.toggle('on', on); w.setAttribute('aria-selected', on); });
    info.innerHTML = '<div class="swap" style="display:flex;flex-direction:column;height:100%">' +
      '<span class="urg ' + L.c + '">' + (L.c === 'red' ? '● Stop safely' : '● Get it checked soon') + '</span>' +
      '<h3 class="h-md">' + L.t + '</h3><p>' + L.m + '</p>' +
      '<div class="todo"><b>What to do</b>' + L.d + '</div>' +
      '<a class="btn btn--primary btn--sm" href="#book" data-light-book style="margin-top:22px">Book a check</a></div>';
    $('[data-light-book]', info).addEventListener('click', function () { presetService(L.svc); });
  }
  wls.forEach(function (w) { w.addEventListener('click', function () { showLight(w.getAttribute('data-light')); }); });
  showLight('engine');

  /* ---------- Lightbox ---------- */
  var figs = $$('#galleryGrid .g'), lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbCount = $('#lbCount'), lbIdx = 0, lbLast = null;
  function lbShow(i) {
    lbIdx = (i + figs.length) % figs.length;
    var img = $('img', figs[lbIdx]), cap = $('figcaption', figs[lbIdx]);
    lbImg.style.opacity = 0;
    setTimeout(function () { lbImg.src = img.src; lbImg.alt = img.alt; lbImg.style.opacity = 1; }, 120);
    if (cap) { var sm = $('small', cap), main = cap.lastChild ? cap.lastChild.textContent : ''; lbCap.textContent = (sm ? sm.textContent + ' — ' : '') + main; } else lbCap.textContent = '';
    lbCount.textContent = (lbIdx + 1) + ' / ' + figs.length;
  }
  lbImg.style.transition = 'opacity .2s, transform .5s cubic-bezier(.16,1,.3,1)';
  function lbOpen(i) { lbLast = document.activeElement; lbShow(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; $('[data-lb=close]', lb).focus(); }
  function lbClose() { lb.classList.remove('open'); document.body.style.overflow = ''; if (lbLast) lbLast.focus(); }
  figs.forEach(function (f, i) {
    f.addEventListener('click', function () { lbOpen(i); });
    f.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(i); } });
  });
  lb.addEventListener('click', function (e) {
    var a = e.target.closest('[data-lb]');
    if (a) { var k = a.getAttribute('data-lb'); if (k === 'close') lbClose(); else lbShow(lbIdx + (k === 'next' ? 1 : -1)); }
    else if (e.target === lb) lbClose();
  });
  var tsX = null;
  lb.addEventListener('touchstart', function (e) { tsX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (tsX === null) return; var dx = e.changedTouches[0].clientX - tsX; if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1)); tsX = null; });

  /* ---------- FAQ ---------- */
  $$('.qa button').forEach(function (b) {
    b.addEventListener('click', function () {
      var qa = b.parentElement, open = !qa.classList.contains('open');
      $$('.qa.open').forEach(function (o) { if (o !== qa) { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
      qa.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
    });
  });

  /* ---------- Booking form ---------- */
  var form = $('#bookForm'), modal = $('#modal'), mMsg = $('#modalMsg'), mSms = $('#modalSms'), mCopy = $('#modalCopy'), mText = $('#modalText');
  var dateIn = $('#f-date');
  (function () { var d = new Date(), m = d.getMonth() + 1, day = d.getDate(); dateIn.min = d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day; })();
  function validField(el) {
    var ok = el.value.trim().length > 0;
    if (ok && el.type === 'tel') ok = el.value.replace(/[^\d]/g, '').length >= 8;
    el.closest('.field').classList.toggle('err', !ok);
    return ok;
  }
  $$('[required]', form).forEach(function (el) {
    el.addEventListener('blur', function () { if (el.value) validField(el); });
    el.addEventListener('input', function () { if (el.closest('.field').classList.contains('err')) validField(el); });
    el.addEventListener('change', function () { validField(el); });
  });
  var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var req = $$('[required]', form), firstBad = null;
    req.forEach(function (el) { if (!validField(el) && !firstBad) firstBad = el; });
    if (firstBad) { firstBad.focus(); firstBad.closest('.field').animate && firstBad.closest('.field').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 }); return; }
    var f = new FormData(form);
    var dateTxt = '';
    if (f.get('date')) { var p = f.get('date').split('-'); dateTxt = new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }
    var lines = [
      'JOB CARD — M&M Auto',
      'Name: ' + f.get('name').trim(),
      'Phone: ' + f.get('phone').trim(),
      'Car: ' + f.get('car').trim() + (f.get('rego') ? ' (rego ' + f.get('rego').trim().toUpperCase() + ')' : ''),
      'Service: ' + f.get('service'),
      'Preferred: ' + (dateTxt || 'Any day') + ', ' + f.get('time')
    ];
    if (f.get('message').trim()) lines.push('Details: ' + f.get('message').trim());
    var msg = lines.join('\n');
    var sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
    var smsHref = 'sms:' + PHONE_SMS + sep + 'body=' + encodeURIComponent(msg);
    mMsg.textContent = msg; mSms.href = smsHref;
    mText.textContent = isMobile ? 'Tap "Open SMS" to send it to the workshop — or copy it and call us.' : 'Copy the text below and send it to 0469 431 798, or simply call the workshop.';
    openModal();
    if (isMobile) setTimeout(function () { window.location.href = smsHref; }, 700);
  });
  mCopy.addEventListener('click', function () {
    var t = mMsg.textContent, label = $('span', mCopy);
    function done() { label.textContent = 'Copied!'; setTimeout(function () { label.textContent = 'Copy text'; }, 2000); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = 0; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (err) {} document.body.removeChild(ta); }
  });
  var mLast = null;
  function openModal() { mLast = document.activeElement; modal.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(function () { mSms.focus(); }, 60); }
  function closeModal() { modal.classList.remove('open'); document.body.style.overflow = ''; if (mLast) mLast.focus(); }
  $('[data-modal-close]', modal).addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  /* ---------- Global keys ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lb.classList.contains('open')) lbClose();
      else if (modal.classList.contains('open')) closeModal();
      else if (drawer.classList.contains('open')) closeDrawer();
      else if (document.body.classList.contains('menu-open')) setMenu(false);
    }
    if (lb.classList.contains('open')) {
      if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    }
  });
})();
