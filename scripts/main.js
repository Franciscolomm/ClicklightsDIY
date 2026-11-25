// Landing page: nav, hero video, highlights, RGBW color picker, installation tabs, Design image mode, Buy selector
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* sticky nav: border + active link */
  const lnav = document.getElementById('lnav');
  const onScroll = () => lnav.classList.toggle('stuck', scrollY > 0);
  addEventListener('scroll', onScroll, { passive:true }); onScroll();
  const links = [...lnav.querySelectorAll('a.sub')];
  const secObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin:'-45% 0px -50% 0px' });
  links.forEach(a => { const h = a.getAttribute('href'); if (h.length < 2) return; const el = document.querySelector(h); if (el) secObs.observe(el); });

  /* generic tabs / segmented controls */
  document.querySelectorAll('[data-tabs]').forEach(box => {
    const btns = box.querySelectorAll('button[data-for]');
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      box.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.for));
      if (box.closest('#installation')) playInstall();
    }));
  });

  /* installation: the open tab's video plays once from the start (when the section is on screen) and holds its last frame */
  const instSec = document.getElementById('installation');
  const instVids = [...instSec.querySelectorAll('video')];
  instVids.forEach(v => { if (v.dataset.embed) embedVideo(v); else { v.muted = true; v.loop = false; } });
  let instSeen = false;
  function playInstall() {
    instVids.forEach(v => { if (v.closest('[data-pane]').classList.contains('on') && instSeen) playFromStart(v); else stopVideo(v); });
  }
  new IntersectionObserver(es => { const vis = es[0].isIntersecting;
    if (vis && !instSeen) { instSeen = true; playInstall(); }
    else if (!vis) { instSeen = false; instVids.forEach(stopVideo); }
  }, { threshold:.35 }).observe(instSec);

  /* reveal on scroll */
  const rev = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rev.unobserve(e.target); }
  }), { rootMargin:'0px 0px -12% 0px' });
  document.querySelectorAll('.pg-reveal').forEach(el => rev.observe(el));

  /* embedded videos: blob: URL, falling back to data: where blob: media is blocked.
     playFromStart() remembers that the video should be playing, so it also starts after the fallback or once it is ready. */
  function embedVideo(v) {
    const d = document.getElementById(v.dataset.embed); if (!d) return;
    const b64 = d.textContent.trim(), bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    v.loop = false; v.controls = false; v.muted = true; v.playsInline = true;
    v.addEventListener('error', () => {
      if (!v.src.startsWith('blob:')) return;
      v.src = 'data:video/mp4;base64,' + b64; v.load();
      if (v._want) playFromStart(v);
    }, { once:true });
    v.addEventListener('contextmenu', e => e.preventDefault());
    v.src = URL.createObjectURL(new Blob([buf], { type:'video/mp4' }));
  }
  /* Autoplay that also works on phones: play() is called right away (iOS/Android only start loading a video
     when play() is called, so waiting for 'canplay' left it stuck until the visitor tapped it).
     Every video stops a little before its very end and holds that frame, so a last black frame never shows.
     If the phone blocks autoplay (e.g. Low Power Mode), the video jumps to that final frame instead. */
  const END_HOLD = 0.15;                                   // seconds before the end where a video freezes
  function prepVideo(v) {
    if (v._prepped) return; v._prepped = true;
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = false; v.controls = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  }
  function holdFrame(v) {                                   // show the frame just before the end
    const go = () => { try { v.currentTime = Math.max(0, v.duration - END_HOLD); } catch (e) {} };
    v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once:true });
  }
  function playFromStart(v) {
    prepVideo(v); v._want = true; v._held = false;
    try { v.currentTime = 0; } catch (e) {}
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => { if (v._want) holdFrame(v); });
    if (v.readyState < 2) v.addEventListener('canplay', () => { if (v._want && v.paused && !v._held) v.play().catch(() => holdFrame(v)); }, { once:true });
  }
  function stopVideo(v) { v._want = false; v.pause(); }
  // watch playing videos and freeze them just before the last frame; fires a 'held' event (used like 'ended')
  (function endGuard() {
    document.querySelectorAll('video').forEach(v => {
      if (!v.paused && v.duration && !v._held && v.duration - v.currentTime <= END_HOLD) {
        v.pause(); v._held = true; v.dispatchEvent(new Event('held'));
      }
    });
    requestAnimationFrame(endGuard);
  })();
  document.querySelectorAll('video').forEach(v => { prepVideo(v); v.addEventListener('play', () => { v._held = false; }); });

  /* highlights gallery: each slide shows 6 s; a video plays once from the start when its slide becomes active */
  const track = document.getElementById('galTrack'), slides = [...track.children];
  const dotsEl = document.getElementById('galDots'), play = document.getElementById('galPlay');
  const PAUSE = play.innerHTML, PLAY = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11a1 1 0 001.5.86l9-5.5a1 1 0 000-1.72l-9-5.5A1 1 0 004 2.5z"/></svg>';
  let gi = 0, playing = !reduce, inView = false;
  slides.forEach(s => s.querySelectorAll('video[data-embed]').forEach(embedVideo));
  const dots = slides.map((s, i) => {
    const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.setAttribute('aria-label', s.dataset.name || 'Highlight ' + (i + 1));
    b.innerHTML = '<span></span>'; b.addEventListener('click', () => go(i));
    b.querySelector('span').addEventListener('animationend', () => go(gi + 1));
    dotsEl.appendChild(b); return b;
  });
  const curVideo = () => slides[gi].querySelector('video');
  function go(i) {
    gi = (i + slides.length) % slides.length;
    track.style.transform = `translateX(calc(${-gi} * (100% + 24px)))`;
    slides.forEach((s, k) => { s.classList.toggle('on', k === gi); s.setAttribute('aria-hidden', k !== gi);
      const v = s.querySelector('video'); if (v && k !== gi) stopVideo(v); });
    dots.forEach((d, k) => { d.classList.remove('on'); d.setAttribute('aria-selected', k === gi); });
    // image slides: 6 s timer. Video slides: no timer, the bar follows the video and the slide changes only when it ends
    const sv = slides[gi].querySelector('video');
    dots[gi].classList.toggle('vid', !!sv); dots[gi].querySelector('span').style.transform = '';
    void dotsEl.offsetWidth; dots[gi].classList.add('on');
    const v = curVideo(); if (v) { if (playing && inView) playFromStart(v); else { stopVideo(v); try { v.currentTime = 0; } catch (e) {} } }
  }
  const sync = () => {
    dotsEl.classList.toggle('paused', !playing || !inView);
    play.innerHTML = playing ? PAUSE : PLAY; play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    const v = curVideo(); if (v) { if (playing && inView) { if (!v.ended && !v._held) { v._want = true; v.play().catch(() => {}); } else go(gi + 1); } else stopVideo(v); }
  };
  play.addEventListener('click', () => { playing = !playing; sync(); });
  function holdGallery() { playing = false; dotsEl.classList.add('paused'); play.innerHTML = PLAY; play.setAttribute('aria-label', 'Play'); }
  new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold:.4 }).observe(track.parentElement);   // observe the gallery, not the moving track
  let sx = null;
  track.addEventListener('pointerdown', e => sx = e.clientX);
  track.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(gi + (dx < 0 ? 1 : -1)); });
  // video slides: progress = video time; next slide 1 s after the video ends (only while the carousel is playing)
  slides.forEach((s, k) => { const v = s.querySelector('video'); if (!v) return;
    const next = () => { if (k === gi && playing && inView) setTimeout(() => { if (k === gi && playing && inView) go(gi + 1); }, 1000); };
    v.addEventListener('held', next); v.addEventListener('ended', () => { if (!v._held) next(); });
  });
  (function vidProgress() {
    const v = curVideo(), d = dots[gi];
    if (v && d && d.classList.contains('vid') && v.duration) d.querySelector('span').style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
    requestAnimationFrame(vidProgress);
  })();
  go(0); sync();


  /* ---- HIGHLIGHTS · RGBW: pick a light color; only the 4 RGB LEDs light up in that color ----
     Same list as "Light colors" in Design. The camera in the RGBW video is fixed, so a WebGL shader draws:
       base  = the video's first frame (lights off: clear cap, red board, unlit LEDs)
       + the 4 RGB LED faces in the chosen color with a small glow (mask image),
     switching on and off with the video (it measures how bright the board under the cap is in the current frame).
     The cap and the 2 warm-white LEDs stay unlit. Warm white shows the original video. */
  const RGBW_COLORS = [
    { name:'Warm white', css:'#ffc58a', tint:null },
    { name:'Cool white', css:'#eef4ff', tint:'#dfe9ff' },
    { name:'Red',        css:'#ff3b30', tint:'#ff1a1a' },
    { name:'Orange',     css:'#ff9500', tint:'#ff6a00' },
    { name:'Green',      css:'#34c759', tint:'#00ff3c' },
    { name:'Blue',       css:'#0a84ff', tint:'#0a3dff' },
    { name:'Purple',     css:'#bf5af2', tint:'#7a1aff' },
    { name:'Pink',       css:'#ff2d92', tint:'#ff1a8c' },
  ];
  const RGBW_OFF = 'assets/images/highlights-rgbw-off.jpg', RGBW_MASK = 'assets/images/highlights-rgbw-mask.png';
  const rgbwSlide = document.querySelector('.pg-slide[data-name="RGBW"]');
  const rgbwVid = rgbwSlide.querySelector('video'), rgbwCv = document.getElementById('rgbwCanvas');
  const rgbwSw = document.getElementById('rgbwSwatches'), rgbwName = document.getElementById('rgbwName');
  let rgbwTint = null, gl = null, glU = {}, glTex = null, glReady = 0;
  (function initGL() {
    try { gl = rgbwCv.getContext('webgl', { premultipliedAlpha:false, preserveDrawingBuffer:true }); } catch (e) { gl = null; }
    if (!gl) return;
    const vs = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
    const fs = `precision mediump float; varying vec2 v;
      uniform sampler2D tVid, tOff, tMask; uniform vec3 tint;
      float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
      float board(sampler2D t){   // white board under the cap, between the LEDs
        return (lum(texture2D(t, vec2(.4958, .5708)).rgb) + lum(texture2D(t, vec2(.4958, .4421)).rgb)
              + lum(texture2D(t, vec2(.4271, .5107)).rgb) + lum(texture2D(t, vec2(.5651, .5107)).rgb)) * .25;
      }
      void main(){
        float e = clamp((board(tVid) - board(tOff)) / .3, 0., 1.);   // 0 = off, 1 = on (follows the video)
        vec3 off = texture2D(tOff, v).rgb, cur = texture2D(tVid, v).rgb;
        vec3 mk = texture2D(tMask, v).rgb;                              // r = LED dies, g = tight glow around them
        float L = lum(max(cur - off, 0.));                              // the real light in this frame (spill, flare, glow)
        vec3 o = 1. - (1. - off) * exp(-tint * L * 2.24);               // same light, in the chosen colour (screen-add, no flat fill)
        o = 1. - (1. - o) * exp(-tint * mk.g * 1.2 * e);                // coloured bloom hugging the dies
        float centre = clamp((mk.r - .5) / .5, 0., 1.);
        vec3 die = clamp(tint * 1.15 + .08, 0., 1.) * (1. - .55 * centre) + .55 * centre;   // saturated die, pale hot centre
        o = mix(o, max(o, die), mk.r * e);
        gl_FragColor = vec4(clamp(o, 0., 1.), 1.);
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    glU.tint = gl.getUniformLocation(pr, 'tint');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const mkTex = (unit, name) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(pr, name), unit); return t;
    };
    glTex = mkTex(0, 'tVid');
    [[1, 'tOff', RGBW_OFF], [2, 'tMask', RGBW_MASK]].forEach(([unit, name, url]) => {
      const t = mkTex(unit, name), img = new Image();
      img.onload = () => { if (!gl) return; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); glReady++; drawRGBW(); };
      img.src = url;
    });
  })();
  const hex3 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  function drawRGBW() {
    if (!gl || !rgbwTint || glReady < 2 || rgbwVid.readyState < 2) return;
    const w = rgbwVid.videoWidth, h = rgbwVid.videoHeight;
    if (rgbwCv.width !== w || rgbwCv.height !== h) { rgbwCv.width = w; rgbwCv.height = h; gl.viewport(0, 0, w, h); }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, glTex);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, rgbwVid); }
    catch (e) { gl = null; rgbwCv.classList.remove('live'); return; }   // video not readable -> plain video
    const tc = hex3(rgbwTint), tm = Math.max(...tc) || 1;
    gl.uniform3fv(glU.tint, tc.map(x => x / tm));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    rgbwCv.classList.add('live');
  }
  (function rgbwLoop() { if (rgbwTint && rgbwSlide.classList.contains('on')) drawRGBW(); requestAnimationFrame(rgbwLoop); })();
  ['seeked', 'loadeddata', 'ended'].forEach(ev => rgbwVid.addEventListener(ev, drawRGBW));
  RGBW_COLORS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'sw' + (i === 0 ? ' on' : ''); b.style.background = c.css;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0); b.setAttribute('aria-label', c.name); b.title = c.name;
    b.addEventListener('click', () => {
      [...rgbwSw.children].forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      rgbwName.textContent = c.name; rgbwTint = c.tint;
      if (!rgbwTint || !gl) rgbwCv.classList.remove('live');
      holdGallery();                 // stop auto-advance so the visitor can watch the color
      playFromStart(rgbwVid);        // the light turns on again, now in the chosen color
    });
    rgbwSw.appendChild(b);
  });

  /* ---- BUY · product selector: length + channel color + cap color -> Buy now goes to checkout ----
     Buy now goes straight to the store checkout with the chosen bundle in the cart.
     It adds the same WooCommerce products as the "ClickLights Bundle" page on myeverlights.com: one
     "ClickLights NNN' Bundle" per length (WPC Product Bundles), with the chosen channel and cap variations.
     Link: /checkout/?add-to-cart=<bundle id>&quantity=1&woosb_ids=<item id>/<item key>/<qty>/,...
     These IDs and keys come from the store; if a bundle is edited in WooCommerce, update them here. */
  const CHECKOUT_URL = 'https://myeverlights.com/checkout/';
  const BUNDLES = {
    '50':{pid:6411,items:[[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',1],[3399,'h9q5',1],[4979,'0bmv',1],[5085,'pbon',1],['caps','yyp6',1],['channel','ooxp',12]]},
    '100':{pid:5086,items:[[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',1],[3399,'h9q5',1],[4979,'0bmv',2],[5085,'pbon',1],['caps','yyp6',2],['channel','ooxp',21]]},
    '150':{pid:5091,items:[['caps','sta6',3],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',1],[3399,'h9q5',1],[4979,'16dk',3],[5085,'ow3f',1],['channel','691l',32]]},
    '200':{pid:5093,items:[['caps','egdt',4],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',1],[3399,'h9q5',1],[4979,'16dk',4],[5085,'ow3f',1],['channel','8xze',43]]},
    '250':{pid:6178,items:[['caps','egdt',5],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',1],[3399,'h9q5',1],[4979,'16dk',5],[5085,'ow3f',1],['channel','8xze',56]]},
    '300':{pid:6179,items:[['caps','egdt',6],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',1],[3399,'h9q5',1],[4979,'16dk',6],[5085,'ow3f',1],['channel','8xze',63]]},
    '350':{pid:7540,items:[['caps','egdt',7],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',2],[3399,'h9q5',2],[4979,'16dk',7],[5085,'ow3f',2],['channel','8xze',74]]},
    '400':{pid:7541,items:[['caps','egdt',8],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',2],[3399,'h9q5',2],[4979,'16dk',8],[5085,'ow3f',2],['channel','8xze',84]]},
    '450':{pid:7542,items:[['caps','egdt',9],[3375,'slyn',1],[3377,'bnmr',1],[3404,'2xgq',1],[3376,'1pqh',1],[3952,'4xy4',1],['wire','ucg7',1],[3383,'euc2',2],[3399,'h9q5',2],[4979,'16dk',9],[5085,'ow3f',2],['channel','8xze',95]]},
  };
  const WIRE_VID = 5175;                                   // Wire: 16 gauge / 3-wire / Black / 50ft
  const CAPS_VID = { 'clear':5033, 'grey':5034 };
  const CHANNEL_VID = { 'black':5028, 'dark-bronze':5029, 'muskett-brown':5030, 'pebblestone-clay':5031, 'white':5032 };
  function checkoutLink() {
    const d = BUNDLES[cfg.length];
    const ids = d.items.map(([id, key, qty]) => {
      if (id === 'wire') id = WIRE_VID;
      else if (id === 'caps') id = CAPS_VID[cfg.cap];
      else if (id === 'channel') id = CHANNEL_VID[cfg.channel];
      return `${id}/${key}/${qty}/`;
    }).join(',');
    return `${CHECKOUT_URL}?add-to-cart=${d.pid}&quantity=1&woosb_ids=${ids}`;
  }
  const buyFixed = document.getElementById('buyFixed');
  new IntersectionObserver(es => buyFixed.classList.toggle('away', es[0].isIntersecting), { threshold:.25 }).observe(document.getElementById('buy'));
  const cfg = { length:null, channel:null, cap:null };
  const NAMES = { 'white':'White', 'black':'Black', 'muskett-brown':'Musket Brown', 'dark-bronze':'Dark Bronze',
                  'pebblestone-clay':'Pebblestone Clay', 'clear':'Clear', 'grey':'Grey' };
  // price per length (ft -> USD)
  const PRICES = { 50:840, 100:1340, 150:1840, 200:2340, 250:2840, 300:3340, 350:3840, 400:4340, 450:4840 };
  // regular (before-discount) price per length, shown struck through
  const REGULAR = { 50:1050, 100:1675, 150:2300, 200:2925, 250:3550, 300:4175, 350:4800, 400:5425, 450:6050 };
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const buyNow = document.getElementById('buyNow'), buyHint = document.getElementById('buyHint');
  const cfgSum = document.getElementById('cfgSum'), cfgImgs = [...document.querySelectorAll('#cfgMedia img')];
  const cfgPrice = document.getElementById('cfgPrice'), cfgPriceNote = document.getElementById('cfgPriceNote');
  function updateCfg() {
    // the image for the selected length (50 ft until a length is chosen)
    cfgImgs.forEach(im => im.classList.toggle('show', im.dataset.len === String(cfg.length || 50)));
    const L = cfg.length || 50;
    cfgPrice.textContent = (cfg.length ? '' : 'From ') + money(PRICES[L]);
    document.getElementById('cfgWas').textContent = money(REGULAR[L]);
    document.getElementById('cfgSave').textContent = 'Save ' + money(REGULAR[L] - PRICES[L]);
    cfgPriceNote.textContent = cfg.length ? `Clicklight bundle · ${cfg.length} ft` : 'Choose a length to see the price.';
    const parts = [cfg.length && `<b>${cfg.length} ft</b>`, cfg.channel && `${NAMES[cfg.channel]} channel`, cfg.cap && `${NAMES[cfg.cap]} caps`].filter(Boolean);
    cfgSum.innerHTML = 'Clicklight' + (parts.length ? ' · ' + parts.join(' · ') : '');
    const missing = Object.keys(cfg).filter(k => !cfg[k]);
    const ready = !missing.length;
    buyNow.setAttribute('aria-disabled', !ready);
    buyNow.textContent = ready ? `Buy now · ${money(PRICES[cfg.length])}` : 'Buy now';
    buyNow.href = ready ? checkoutLink() : '#';
    buyHint.textContent = ready ? `${cfg.length} ft · ${NAMES[cfg.channel]} channel · ${NAMES[cfg.cap]} caps`
      : 'Choose ' + missing.map(k => ({ length:'a length', channel:'a channel color', cap:'a cap color' })[k]).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
  }
  document.querySelectorAll('#cfgForm [role="radiogroup"]').forEach(g => {
    const key = g.dataset.key, opts = [...g.querySelectorAll('.pg-opt')];
    opts.forEach(o => o.addEventListener('click', () => {
      opts.forEach(x => x.setAttribute('aria-checked', x === o));
      cfg[key] = o.dataset.val; updateCfg();
    }));
  });
  buyNow.addEventListener('click', e => { if (buyNow.getAttribute('aria-disabled') === 'true') { e.preventDefault(); buyHint.animate([{ opacity:.3 }, { opacity:1 }], 400); } });
  updateCfg();

  /* ---- HERO: video plays once and stays on the last frame ---- */
  const hv = document.getElementById('heroVideo'), hd = document.getElementById('hero-video-data');
  if (hd) {
    const bin = atob(hd.textContent.trim()), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    hv.src = URL.createObjectURL(new Blob([buf], { type:'video/mp4' }));
    // if blob: media is blocked (some previews), fall back to a data: URL
    hv.addEventListener('error', () => { if (hv.src.startsWith('blob:')) { hv.src = 'data:video/mp4;base64,' + hd.textContent.trim(); hv.play().catch(() => holdFrame(hv)); } }, { once:true });
  }
  prepVideo(hv);
  var showLastFrame = () => holdFrame(hv);
  const pr = hv.play(); if (pr && pr.catch) pr.catch(showLastFrame);   // if the browser blocks autoplay: show the last frame
  hv.addEventListener('canplay', () => { if (hv.paused && !hv._held && hv.currentTime < 0.1) hv.play().catch(showLastFrame); }, { once:true });
  hv.addEventListener('ended', () => hv.pause());
  hv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---- DESIGN: 3D switch (always starts OFF) + options with images ---- */
  const sw3d = document.getElementById('sw3d'), frame = document.getElementById('designFrame');
  const dImg = document.getElementById('dImg'), closerEl = document.getElementById('closer');
  function set3d(on) {
    sw3d.setAttribute('aria-checked', on); frame.classList.toggle('is-3d', on);
    closerEl.inert = !on; dImg.inert = on;
    if (on) dispatchEvent(new Event('resize'));
  }
  sw3d.addEventListener('click', () => set3d(sw3d.getAttribute('aria-checked') !== 'true'));
  set3d(false);

  const dNav = dImg.querySelector('.features'), dItems = [...dNav.querySelectorAll('li')];
  const dFigs = [...dImg.querySelectorAll('figure')];
  let dCur = null;
  dImg.querySelectorAll('video[data-embed]').forEach(embedVideo);
  const chVids = [...dImg.querySelectorAll('figure[data-img="channels"] .pg-dmedia')];   // one caps photo per channel finish
  const chBtns = [...dImg.querySelectorAll('#dChOpts button')];
  let chCur = (chBtns.find(b => b.classList.contains('on')) || chBtns[0]).dataset.ch;
  dImg.querySelectorAll('figure[data-img="channels"] video').forEach(v => { if (!v.src && v.dataset.embed) embedVideo(v); });
  const playCh = () => chVids.forEach(v => {          // crossfade to the chosen finish; a video plays once and holds its last frame
    const on = v.dataset.ch === chCur; v.classList.toggle('show', on);
    if (v.tagName === 'VIDEO') { if (on) playFromStart(v); else stopVideo(v); }
  });
  chBtns.forEach(b => b.addEventListener('click', () => {
    chCur = b.dataset.ch;
    chBtns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    playCh();
  }));
  const showFig = id => {
    dFigs.forEach(f => f.classList.toggle('show', f.dataset.img === id));
    if (id === 'channels') playCh(); else chVids.forEach(v => { if (v.tagName === 'VIDEO') stopVideo(v); });
    dFigs.forEach(f => { if (f.dataset.img === 'channels') return;      // single-video options: play once from the start
      f.querySelectorAll('video').forEach(v => f.dataset.img === id ? playFromStart(v) : stopVideo(v)); });
  };
  function openD(id) {
    dCur = id; dNav.classList.add('open');
    dItems.forEach(li => { const on = li.dataset.id === id; li.classList.toggle('active', on); li.querySelector('.pill').setAttribute('aria-expanded', on); });
    showFig(id);
  }
  function closeD() {
    dCur = null; dNav.classList.remove('open');
    dItems.forEach(li => { li.classList.remove('active'); li.querySelector('.pill').setAttribute('aria-expanded', false); });
    showFig('default');
  }
  const stepD = d => { const i = dItems.findIndex(li => li.dataset.id === dCur); openD(dItems[(i + d + dItems.length) % dItems.length].dataset.id); };
  dItems.forEach(li => li.querySelector('.pill').addEventListener('click', () => openD(li.dataset.id)));
  dImg.querySelector('[data-nav="prev"]').addEventListener('click', () => stepD(-1));
  dImg.querySelector('[data-nav="next"]').addEventListener('click', () => stepD(1));
  dImg.querySelector('[data-nav="close"]').addEventListener('click', closeD);
  addEventListener('keydown', e => { if (e.key === 'Escape' && dCur && !frame.classList.contains('is-3d')) closeD(); });
  closeD();
})();
