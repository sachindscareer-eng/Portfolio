/* Portfolio motion layer. All page text lives in index.html, not here.
   Without JS, or with "reduce motion" on, the page is a normal static layout. */
(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  // ----- Mobile menu (always on) -----
  var burger = $('.nav__burger');
  var links = $('#nav-links');
  function setMenu(open) {
    links.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && links.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });

  if (!root.classList.contains('fx') || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('fx');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) root.classList.add('fine');

  // ----- Smooth scroll -----
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = $(id);
      if (!el) return;
      e.preventDefault();
      var y = id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY - (id === '#skills' || id === '#about' ? 0 : 88);
      var st = ScrollTrigger.getById(id.slice(1));
      if (st && st.pin) y = st.start + 2;
      if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else scrollTo(0, y);
    });
  });

  // ----- Split text into characters (screen readers get the aria-label) -----
  function split(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var out = [];
    text.split(' ').forEach(function (word, i, all) {
      var w = document.createElement('span');
      w.className = 'wd';
      w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (c) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        w.appendChild(s);
        out.push(s);
      });
      el.appendChild(w);
      if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return out;
  }
  var splits = {};
  $$('[data-split]').forEach(function (el) { splits[el.id || el.className] = { el: el, chars: split(el) }; });

  // ----- Intro: preloader, then the hero assembles -----
  var seen = root.classList.contains('seen');
  var stage = { intro: 0 };
  var heroChars = splits['hero-title'].chars;
  gsap.set(heroChars, { yPercent: 115, rotate: 8 });
  gsap.set('.hero__sub, .hero__ctas', { autoAlpha: 0, y: 28 });
  gsap.set('.chip', { autoAlpha: 0, y: 40, scale: .96 });
  var intro = gsap.timeline();
  if (!seen) {
    intro.to('.pre__bar', { scaleX: 1, duration: .75, ease: 'power2.inOut' })
         .to('.pre__name, .pre__bar', { autoAlpha: 0, y: -24, duration: .3, ease: 'power2.in' })
         .to('.pre', { yPercent: -100, duration: .7, ease: 'expo.inOut' })
         .set('.pre', { display: 'none' });
    try { sessionStorage.setItem('seen', '1'); } catch (e) {}
  }
  intro.to(heroChars, { yPercent: 0, rotate: 0, duration: 1, ease: 'expo.out', stagger: .018 }, seen ? 0 : '-=.45')
       .to(stage, { intro: 1, duration: 2.2, ease: 'expo.out' }, '<-.2')
       .to('.hero__sub, .hero__ctas', { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .1 }, '<.35')
       .to('.chip', { autoAlpha: 1, y: 0, scale: 1, duration: .9, ease: 'expo.out' }, '<.1');

  // Hero drifts away as you scroll
  gsap.to('.hero__copy', { yPercent: -18, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 35%', scrub: true } });
  gsap.to('.chip', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 35%', scrub: true } });

  // ----- Marquee: speed follows scroll velocity -----
  var mq = $('.marquee');
  var list = $('.marquee__list');
  var copy = list.cloneNode(true);
  copy.removeAttribute('aria-label');
  copy.setAttribute('aria-hidden', 'true');
  mq.appendChild(copy);
  var mqX = 0;
  var mqLists = [list, copy];
  gsap.ticker.add(function () {
    var v = lenis ? lenis.velocity : 0;
    mqX -= 1 + Math.abs(v) * .35;
    var w = list.offsetWidth;
    if (w && mqX <= -w) mqX += w;
    var skew = clamp(v * .35, -14, 14);
    mqLists.forEach(function (el) { el.style.transform = 'translate3d(' + mqX + 'px,0,0) skewX(' + (-skew) + 'deg)'; });
  });

  // ----- About: pinned, words fill in as you scroll -----
  var about = $('#about-text');
  var parts = about.textContent.split(' ');
  about.textContent = '';
  var words = parts.map(function (word, i) {
    var s = document.createElement('span');
    s.className = 'w';
    s.textContent = word;
    about.appendChild(s);
    if (i < parts.length - 1) about.appendChild(document.createTextNode(' '));
    return s;
  });
  gsap.to(words, {
    color: '#F1F6FB', stagger: .05, ease: 'none',
    scrollTrigger: { id: 'about', trigger: '#about', start: 'top top', end: '+=130%', pin: true, scrub: .4, anticipatePin: 1 }
  });

  // ----- Skills: pinned horizontal scene -----
  var track = $('#panels');
  var travel = function () { return track.scrollWidth - innerWidth; };
  var slide = gsap.to(track, {
    x: function () { return -travel(); }, ease: 'none',
    scrollTrigger: {
      id: 'skills', trigger: '#skills', start: 'top top', pin: true, scrub: .6, anticipatePin: 1,
      end: function () { return '+=' + travel() * .65; }, invalidateOnRefresh: true,
      onUpdate: function (st) { gsap.set('#skills-bar', { scaleX: st.progress }); }
    }
  });
  $$('.panel').forEach(function (panel) {
    gsap.from($$('.panel__title, .tag', panel), {
      y: 48, autoAlpha: 0, duration: .7, ease: 'power3.out', stagger: .045,
      scrollTrigger: { trigger: panel, containerAnimation: slide, start: 'left 62%', toggleActions: 'play none none reverse' }
    });
  });

  // ----- Character rise for big headings -----
  ['experience-title', 'work-title', 'process-title', 'faq-title', 'contact-title', 'edu__title'].forEach(function (key) {
    var s = splits[key];
    gsap.from(s.chars, {
      yPercent: 115, rotate: 6, duration: 1, ease: 'expo.out', stagger: .02,
      scrollTrigger: { trigger: s.el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });

  // ----- Experience: the line draws, jobs slide in -----
  ScrollTrigger.create({ id: 'experience', trigger: '#experience', start: 'top 70%', end: 'bottom 60%' });
  gsap.fromTo('#timeline', { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 60%', scrub: .4 } });
  $$('.job').forEach(function (job) {
    gsap.from(job, { x: 80, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: job, start: 'top 82%', toggleActions: 'play none none reverse' } });
    gsap.from($$('li', job), { y: 20, autoAlpha: 0, duration: .6, ease: 'power3.out', stagger: .07, scrollTrigger: { trigger: job, start: 'top 74%', toggleActions: 'play none none reverse' } });
  });

  // ----- Work: cards stack, the one underneath shrinks back -----
  ScrollTrigger.create({ id: 'work', trigger: '#work', start: 'top 70%', end: 'bottom bottom' });
  gsap.from('.work__lead', { y: 24, autoAlpha: 0, duration: .8, scrollTrigger: { trigger: '.work__lead', start: 'top 88%', toggleActions: 'play none none reverse' } });
  var cases = $$('.case');
  cases.forEach(function (card, i) {
    gsap.from(card, { y: 120, rotateX: -14, autoAlpha: 0, transformPerspective: 1200, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none reverse' } });
    var next = cases[i + 1];
    if (next) {
      gsap.to(card, { scale: .95, filter: 'brightness(.72)', ease: 'none', scrollTrigger: { trigger: next, start: 'top 60%', end: 'top 15%', scrub: true } });
    }
  });

  // ----- How I work: each step rises in and its number fills -----
  $$('.step').forEach(function (step) {
    gsap.from(step, { x: 64, autoAlpha: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: step, start: 'top 88%', toggleActions: 'play none none reverse' } });
    ScrollTrigger.create({ trigger: step, start: 'top 65%', toggleClass: 'is-on' });
  });

  // ----- FAQ -----
  gsap.from('.qa', { y: 32, autoAlpha: 0, duration: .7, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.qas', start: 'top 85%', toggleActions: 'play none none reverse' } });
  $$('.qa').forEach(function (qa) {
    qa.addEventListener('toggle', function () { ScrollTrigger.refresh(); });
  });

  // ----- Contact -----
  ScrollTrigger.create({ id: 'contact', trigger: '#contact', start: 'top 80%', end: 'bottom bottom' });
  gsap.from('.contact__line, .contact__actions .btn', { y: 32, autoAlpha: 0, duration: .8, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: '.contact__line', start: 'top 92%', toggleActions: 'play none none reverse' } });

  // ----- Page progress + current section in the nav -----
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { gsap.set('.progress', { scaleX: s.progress }); } });
  $$('#nav-links a').forEach(function (a) {
    ScrollTrigger.create({
      trigger: a.getAttribute('href'), start: 'top 50%', end: function (self) { return self.trigger.id === 'skills' || self.trigger.id === 'about' ? '+=' + (ScrollTrigger.getById(self.trigger.id).end - ScrollTrigger.getById(self.trigger.id).start + innerHeight / 2) : 'bottom 50%'; },
      toggleClass: { targets: a, className: 'is-active' }
    });
  });

  // ----- Pointer: cursor, magnetic buttons, link scramble -----
  var pointer = { x: 0, y: 0, on: 0 };
  addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / innerWidth * 2 - 1;
    pointer.y = 1 - e.clientY / innerHeight * 2;
    pointer.on = 1;
  }, { passive: true });
  if (fine) {
    var ring = $('.cur--ring');
    var dot = $('.cur--dot');
    var rx = gsap.quickTo(ring, 'x', { duration: .35, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', function (e) {
      root.classList.add('moved');
      rx(e.clientX); ry(e.clientY);
      gsap.set(dot, { x: e.clientX, y: e.clientY });
    }, { passive: true });
    $$('a, button').forEach(function (el) {
      el.addEventListener('pointerenter', function () { ring.classList.add('is-big'); });
      el.addEventListener('pointerleave', function () { ring.classList.remove('is-big'); });
    });
    $$('.btn').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: .5, ease: 'elastic.out(1,.4)' });
      var my = gsap.quickTo(el, 'y', { duration: .5, ease: 'elastic.out(1,.4)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .3);
        my((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('pointerleave', function () { mx(0); my(0); });
    });
    var glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $$('.nav__links a, .footer__links a').forEach(function (a) {
      var label = a.textContent;
      var timer = 0;
      a.addEventListener('pointerenter', function () {
        var n = 0;
        clearInterval(timer);
        timer = setInterval(function () {
          n += .5;
          a.textContent = label.split('').map(function (c, i) {
            return i < n || c === ' ' ? c : glyphs[Math.floor(Math.random() * 26)];
          }).join('');
          if (n >= label.length) { clearInterval(timer); a.textContent = label; }
        }, 24);
      });
    });
  }

  // ----- Particle stage (raw WebGL) -----
  var canvas = $('#stage');
  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) { canvas.style.display = 'none'; return; }

  var COUNT = innerWidth < 768 ? 9000 : 24000;
  var TAU = Math.PI * 2;

  // Scene order. Skill words here match the panels in index.html.
  var SHAPES = ['globe', 'lens', 'SEO', 'AEO', 'LEADS', 'TOOLS', 'WEB', 'OPS', 'GA4', 'AI', 'wave', 'pages', 'ring'];
  var SPINS = { globe: 1, ring: 1 };

  function shapeGlobe() {
    var a = new Float32Array(COUNT * 3), g = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < COUNT; i++) {
      var y = 1 - (i / (COUNT - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i;
      var k = 1 + (Math.random() - .5) * .03;
      a[i * 3] = Math.cos(t) * r * k; a[i * 3 + 1] = y * k; a[i * 3 + 2] = Math.sin(t) * r * k;
    }
    return a;
  }
  function fromCanvas(draw) {
    var W = 1024, H = 512;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = x.strokeStyle = '#fff';
    draw(x, W, H);
    var d = x.getImageData(0, 0, W, H).data, pts = [];
    for (var py = 0; py < H; py += 2) for (var px = 0; px < W; px += 2) if (d[(py * W + px) * 4 + 3] > 128) pts.push(px, py);
    var a = new Float32Array(COUNT * 3), n = pts.length / 2;
    for (var i = 0; i < COUNT; i++) {
      var p = Math.floor(Math.random() * n) * 2;
      a[i * 3] = (pts[p] - W / 2 + Math.random() * 2) / (W / 2);
      a[i * 3 + 1] = -(pts[p + 1] - H / 2 + Math.random() * 2) / (W / 2);
      a[i * 3 + 2] = (Math.random() - .5) * .12;
    }
    return a;
  }
  function shapeWord(text) {
    return fromCanvas(function (x, W, H) {
      var size = 340;
      x.font = '800 ' + size + 'px Inter, Arial, sans-serif';
      var w = x.measureText(text).width;
      if (w > W * .94) { size *= W * .94 / w; x.font = '800 ' + size + 'px Inter, Arial, sans-serif'; }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, W / 2, H / 2 + size * .04);
    });
  }
  function shapeLens() {
    return fromCanvas(function (x, W, H) {
      x.lineCap = 'round';
      x.lineWidth = 46;
      x.beginPath(); x.arc(W / 2 - 50, H / 2 - 40, 150, 0, TAU); x.stroke();
      x.lineWidth = 62;
      x.beginPath(); x.moveTo(W / 2 + 62, H / 2 + 72); x.lineTo(W / 2 + 190, H / 2 + 200); x.stroke();
    });
  }
  function shapeWave() {
    var a = new Float32Array(COUNT * 3);
    var cols = Math.ceil(Math.sqrt(COUNT * 2)), rows = Math.ceil(COUNT / cols);
    for (var i = 0; i < COUNT; i++) {
      var u = (i % cols) / cols, v = Math.floor(i / cols) / rows;
      var x = (u - .5) * 5, z = (v - .5) * 3;
      a[i * 3] = x;
      a[i * 3 + 1] = Math.sin(x * 2.2) * .22 + Math.cos(z * 3 + x) * .16 - .3;
      a[i * 3 + 2] = z;
    }
    return a;
  }
  function shapePages() {
    var a = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      var layer = i % 3, t = Math.random(), edge = Math.floor(Math.random() * 4);
      var w = .62, h = .86, x, y;
      if (Math.random() < .4) { x = (Math.random() * 2 - 1) * w * .7; y = h * (.7 - Math.floor(Math.random() * 7) * .22); }
      else if (edge === 0) { x = (t * 2 - 1) * w; y = h; }
      else if (edge === 1) { x = (t * 2 - 1) * w; y = -h; }
      else if (edge === 2) { x = w; y = (t * 2 - 1) * h; }
      else { x = -w; y = (t * 2 - 1) * h; }
      a[i * 3] = x + (layer - 1) * .55; a[i * 3 + 1] = y + (1 - layer) * .12; a[i * 3 + 2] = (layer - 1) * .7;
    }
    return a;
  }
  function shapeRing() {
    var a = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      var t = Math.random() * TAU, p = Math.random() * TAU, R = 1.05, r = .1 + Math.random() * .1;
      a[i * 3] = (R + r * Math.cos(p)) * Math.cos(t);
      a[i * 3 + 1] = r * Math.sin(p);
      a[i * 3 + 2] = (R + r * Math.cos(p)) * Math.sin(t);
    }
    return a;
  }
  function build(name) {
    if (name === 'globe') return shapeGlobe();
    if (name === 'lens') return shapeLens();
    if (name === 'wave') return shapeWave();
    if (name === 'pages') return shapePages();
    if (name === 'ring') return shapeRing();
    return shapeWord(name);
  }

  var VS = [
    'attribute vec3 aA; attribute vec3 aB; attribute vec3 aR;',
    'uniform float uF,uT,uAsp,uS,uPx,uIntro,uRot,uTiltX,uTiltY,uBurst;',
    'uniform vec2 uOff,uM;',
    'varying float vC; varying float vL;',
    'void main(){',
    '  float d=aR.x*.4; float f=clamp((uF-d)/.6,0.,1.); f=f*f*(3.-2.*f);',
    '  vec3 p=mix(aA,aB,f);',
    '  float b=sin(f*3.14159);',
    '  p+=(aR-.5)*b*uBurst;',
    '  p+=.012*vec3(sin(uT*.9+aR.y*6.28),cos(uT*.7+aR.z*6.28),sin(uT*.8+aR.x*6.28));',
    '  p=mix((aR-.5)*9.,p,uIntro);',
    '  float c=cos(uRot+uTiltX),s=sin(uRot+uTiltX); p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);',
    '  c=cos(uTiltY); s=sin(uTiltY); p=vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);',
    '  float z=3.2-p.z*uS; vec2 q=p.xy*uS*2.4/z; q.x/=uAsp; q+=uOff;',
    '  vec2 dv=(q-uM)*vec2(uAsp,1.); float m=exp(-dot(dv,dv)*14.);',
    '  q+=normalize(dv+1e-4)*m*.1/vec2(uAsp,1.);',
    '  gl_Position=vec4(q,0.,1.);',
    '  gl_PointSize=uPx*(1.1+aR.y*1.5)*(3.2/z);',
    '  vC=aR.z*.6+p.y*.3+.25; vL=m;',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float; uniform float uAl; varying float vC; varying float vL;',
    'void main(){ float r=length(gl_PointCoord-.5); if(r>.5) discard;',
    '  vec3 col=mix(vec3(.31,.70,1.),vec3(.37,.92,.83),clamp(vC,0.,1.));',
    '  col=mix(col,vec3(1.),vL*.6);',
    '  gl_FragColor=vec4(col,(1.-r*2.)*uAl); }'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);
  var U = {};
  ['uF', 'uT', 'uAsp', 'uS', 'uPx', 'uIntro', 'uRot', 'uTiltX', 'uTiltY', 'uBurst', 'uOff', 'uM', 'uAl'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  var locA = gl.getAttribLocation(prog, 'aA');
  var locB = gl.getAttribLocation(prog, 'aB');
  var locR = gl.getAttribLocation(prog, 'aR');
  gl.enableVertexAttribArray(locA);
  gl.enableVertexAttribArray(locB);
  gl.enableVertexAttribArray(locR);

  var rand = new Float32Array(COUNT * 3);
  for (var i = 0; i < rand.length; i++) rand[i] = Math.random();
  var rbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, rbuf);
  gl.bufferData(gl.ARRAY_BUFFER, rand, gl.STATIC_DRAW);
  gl.vertexAttribPointer(locR, 3, gl.FLOAT, false, 0, 0);

  var buffers = [];
  function upload(index, data) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    buffers[index] = b;
  }

  var dpr = Math.min(devicePixelRatio || 1, 1.5);
  var aspect = 1, lastW = 0;
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === lastW && Math.abs(canvas.height / dpr - h) < 120) return;
    lastW = w;
    canvas.width = w * dpr; canvas.height = h * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = w / h;
  }

  // Scroll position -> particle scene. Rebuilt whenever the layout changes.
  var keys = [];
  function buildKeys() {
    var vh = innerHeight, mob = innerWidth < 960;
    var wordS = mob ? Math.min(.9, aspect * 1.3) : .86;
    var wordA = mob ? .8 : .62;
    var get = function (id) { return ScrollTrigger.getById(id); };
    var A = get('about'), S = get('skills'), E = get('experience'), W = get('work'), C = get('contact');
    if (!A || !S || !E || !W || !C) return;
    var lens = { x: mob ? .1 : .68, y: mob ? .66 : 0, s: mob ? .38 : .9, a: mob ? .5 : .7 };
    keys = [
      { p: 0, seg: 0, x: mob ? 0 : .5, y: mob ? -.5 : .08, s: mob ? .8 : 1, a: mob ? .26 : .85 },
      { p: A.start, seg: 1, x: lens.x, y: lens.y, s: lens.s, a: lens.a },
      { p: A.end, seg: 1, x: lens.x, y: lens.y, s: lens.s, a: lens.a },
      { p: S.start, seg: 2, x: mob ? 0 : .42, y: mob ? .36 : 0, s: wordS, a: wordA },
      { p: S.end, seg: 9, x: mob ? 0 : .42, y: mob ? .36 : 0, s: wordS, a: wordA, step: true },
      { p: E.start + vh * .3, seg: 10, x: 0, y: -.45, s: .9, a: .4 },
      { p: W.start, seg: 10, x: 0, y: -.45, s: .9, a: .4 },
      { p: W.start + vh * .5, seg: 11, x: mob ? 0 : -.56, y: mob ? 0 : -.3, s: mob ? .8 : .5, a: mob ? .14 : .4 },
      { p: C.start - vh * .6, seg: 11, x: mob ? 0 : -.56, y: mob ? 0 : -.3, s: mob ? .8 : .5, a: mob ? .14 : .4 },
      { p: C.start + vh * .2, seg: 12, x: mob ? 0 : .62, y: mob ? -.66 : -.1, s: mob ? .55 : .85, a: mob ? .4 : .6 }
    ];
  }
  ScrollTrigger.addEventListener('refresh', buildKeys);

  var now = { seg: 0, x: 0, y: 0, s: 1, a: 1 };
  var target = { seg: 0, x: 0, y: 0, s: 1, a: 1 };
  function readScroll(y) {
    if (!keys.length) return;
    var i = 0;
    while (i < keys.length - 2 && y >= keys[i + 1].p) i++;
    var a = keys[i], b = keys[i + 1];
    var t = clamp((y - a.p) / Math.max(1, b.p - a.p), 0, 1);
    if (b.step) {
      var u = t * (b.seg - a.seg), n = Math.floor(u), f = u - n;
      target.seg = a.seg + n + smooth(clamp((f - .3) / .4, 0, 1));
    } else {
      target.seg = mix(a.seg, b.seg, smooth(t));
    }
    var e = smooth(t);
    target.x = mix(a.x, b.x, e); target.y = mix(a.y, b.y, e);
    target.s = mix(a.s, b.s, e); target.a = mix(a.a, b.a, e);
  }

  var rot = 0, tiltX = 0, tiltY = 0, mX = 9, mY = 9;
  var ready = 0;
  gsap.ticker.add(function (time, delta) {
    if (ready < 2) return;
    resize();
    readScroll(lenis ? lenis.scroll : scrollY);
    ['seg', 'x', 'y', 's', 'a'].forEach(function (k) { now[k] += (target[k] - now[k]) * .1; });

    var top = Math.min(Math.floor(now.seg), buffers.length - 2);
    var f = clamp(now.seg - top, 0, 1);
    var from = SHAPES[top], to = SHAPES[top + 1];
    if (!buffers[top + 1]) return;
    var spin = mix(SPINS[from] || 0, SPINS[to] || 0, f);
    if (spin > .5) rot += delta * .00022;
    else rot += (Math.round(rot / TAU) * TAU - rot) * .06;
    tiltX += (pointer.x * .32 - tiltX) * .05;
    tiltY += (-pointer.y * .22 + (to === 'ring' || from === 'ring' ? .5 : 0) - tiltY) * .05;
    if (pointer.on) { mX += (pointer.x - mX) * .12; mY += (pointer.y - mY) * .12; }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[top]);
    gl.vertexAttribPointer(locA, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[top + 1]);
    gl.vertexAttribPointer(locB, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(U.uF, f);
    gl.uniform1f(U.uT, time);
    gl.uniform1f(U.uAsp, aspect);
    gl.uniform1f(U.uS, now.s);
    gl.uniform1f(U.uPx, dpr * (innerWidth < 768 ? 1.5 : 1.7));
    gl.uniform1f(U.uIntro, stage.intro);
    gl.uniform1f(U.uRot, rot);
    gl.uniform1f(U.uTiltX, tiltX);
    gl.uniform1f(U.uTiltY, tiltY);
    gl.uniform1f(U.uBurst, 1.2);
    gl.uniform2f(U.uOff, now.x, now.y);
    gl.uniform2f(U.uM, mX, mY);
    gl.uniform1f(U.uAl, now.a);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  });

  // Build shapes a little at a time, after first paint, with Inter loaded for the words
  function startStage() {
    var fonts = document.fonts && document.fonts.load ? document.fonts.load('800 200px Inter') : Promise.resolve();
    fonts.catch(function () {}).then(function () {
      resize();
      var n = 0;
      (function next() {
        upload(n, build(SHAPES[n]));
        n++;
        if (n === 2) { ready = 2; buildKeys(); }
        // Later shapes are only needed once you scroll, so build them in idle gaps
        if (n < SHAPES.length) setTimeout(next, n < 3 ? 60 : 350);
      })();
    });
  }
  function queueStage() { setTimeout(startStage, 300); }
  if (document.readyState === 'complete') queueStage();
  else addEventListener('load', queueStage);

})();
