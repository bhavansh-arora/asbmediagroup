/* ASB Media Group — WebGL hero.
   Renders the hero film stills through a fragment shader: slow camera drift, mouse parallax,
   a noise "film burn" dissolve with an ember edge and chromatic fringing between slides,
   a drifting light leak, vignette and 24fps film grain.
   Runs only while the hero is on screen and the tab is visible. If WebGL is unavailable or the
   visitor prefers reduced motion, the plain CSS cross-fade stays in place. */
(() => {
  "use strict";
  const hero = document.querySelector(".hero[data-slides]");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "hero__gl";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  if (!gl) return;
  // Software WebGL (hardware acceleration off, blocklisted driver, VMs) renders the shader on
  // the CPU and stutters; those visitors keep the CSS cross-fade. ?gl=force overrides for testing.
  if (!/[?&]gl=force/.test(location.search)) {
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) { hero.dataset.gl = "software"; return; }
    } catch (e) {}
  }

  const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uT0, uT1;
uniform vec2 uRes, uI0, uI1, uMouse;
uniform float uTime, uProg, uK0, uK1, uSeed, uGrainT;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }

vec2 cover(vec2 uv, vec2 img, float k){
  float rs = uRes.x / uRes.y, ri = img.x / img.y;
  vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.);
  float zoom = mix(1.14, 1.04, smoothstep(0., 9., k));          // slow push-in per slide
  vec2 par = (uMouse - .5) * vec2(.022, .016);                    // mouse parallax
  return (uv - .5) * s / zoom + .5 + par;
}
vec3 sampleCA(sampler2D t, vec2 uv, vec2 d){
  return vec3(texture2D(t, uv + d).r, texture2D(t, uv).g, texture2D(t, uv - d).b);
}

void main(){
  vec2 uv0 = cover(vUv, uI0, uK0);
  vec3 col;
  if (uProg <= 0.0) {
    col = texture2D(uT0, uv0).rgb;
  } else {
    vec2 uv1 = cover(vUv, uI1, uK1);
    float n = fbm(vUv * vec2(3.2, 2.4) + uSeed);
    float t = uProg * 1.3 - .12;
    float v = n * .78 + (1. - vUv.x) * .12 + vUv.y * .1;
    float m = 1. - smoothstep(t - .07, t, v);                      // 1 = new frame shows
    float swell = sin(uProg * 3.14159);
    vec2 dir = normalize(vUv - .5 + 1e-4) * .007 * swell;          // chromatic fringe
    vec3 c0 = sampleCA(uT0, uv0 + (n - .5) * .07 * uProg, dir);
    vec3 c1 = sampleCA(uT1, uv1 - (n - .5) * .07 * (1. - uProg), dir);
    col = mix(c0, c1, m);
    float e = m * (1. - m) * 4.;                                    // band at the burn front
    col += vec3(1., .42, .17) * pow(e, 1.4) * 1.25 + vec3(1., .86, .62) * pow(e, 6.) * .9;
    col *= 1. + swell * .06;
  }
  // drifting light leak (screen blend)
  vec2 lp = vec2(.82 + .1 * sin(uTime * .13), .78 + .12 * cos(uTime * .1));
  float leak = smoothstep(.75, 0., distance(vUv * vec2(uRes.x / uRes.y, 1.), lp * vec2(uRes.x / uRes.y, 1.)));
  vec3 lc = vec3(1., .48, .22) * leak * .16;
  col = 1. - (1. - col) * (1. - lc);
  // vignette + 24fps grain
  col *= mix(1., .74, smoothstep(.42, 1.05, length((vUv - .5) * vec2(1.15, 1.25))));
  col += (hash(vUv * uRes + uGrainT) - .5) * .05;
  gl_FragColor = vec4(col, 1.);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["uT0", "uT1", "uRes", "uI0", "uI1", "uMouse", "uTime", "uProg", "uK0", "uK1", "uSeed", "uGrainT"].forEach((n) => (U[n] = gl.getUniformLocation(program, n)));
  gl.uniform1i(U.uT0, 0); gl.uniform1i(U.uT1, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  /* Textures: one per slide, uploaded as each still finishes decoding */
  const figs = Array.from(hero.querySelectorAll(".hero__slides figure"));
  const slides = figs.map((f) => ({ src: f.querySelector("img").getAttribute("src"), tex: null, w: 1, h: 1, loading: null }));
  const load = (s) => s.loading || (s.loading = new Promise((res) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = async () => {
      try { await img.decode(); } catch (e) {}       // decode off the main thread before upload
      const source = img;                            // HTMLImageElement honours UNPACK_FLIP_Y
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      s.tex = t; s.w = img.naturalWidth; s.h = img.naturalHeight;
      res(s);
    };
    img.onerror = () => res(null);
    img.src = s.src;
  }));

  /* State */
  let cur = 0, next = 0, prog = 0, transStart = 0, seed = 0;
  let visible = true, raf = 0, ready = false, dirty = true;
  const TRANS = 1700;
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* Adaptive quality: render scale starts near device resolution (capped) and drops if the GPU
     can't hold the transition at frame rate; below the floor the CSS slideshow takes over. */
  let scale = Math.min(window.devicePixelRatio || 1, 1.25);
  const MIN_SCALE = .5;
  let ema = 16.7, lastFrame = 0, sampled = 0;
  const resize = () => {
    const r = hero.getBoundingClientRect();
    let s = scale;
    const px = r.width * r.height * s * s;
    if (px > 2.2e6) s *= Math.sqrt(2.2e6 / px);                 // never shade more than ~2.2MP
    canvas.width = Math.max(1, Math.round(r.width * s));
    canvas.height = Math.max(1, Math.round(r.height * s));
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true; kick();
  };
  new ResizeObserver(resize).observe(hero);
  const giveUp = () => {
    ready = false;
    hero.dataset.gl = "off";
    hero.classList.remove("is-gl");
    setTimeout(() => canvas.remove(), 1300);
  };
  const watchPerf = (now) => {
    if (lastFrame) {
      const dt = now - lastFrame;
      if (dt < 120) { ema = ema * .85 + dt * .15; sampled++; }
    }
    lastFrame = now;
    if (sampled > 10 && ema > 22) {                            // slowness is remembered across transitions
      sampled = 0;
      if (scale > MIN_SCALE) { scale = Math.max(MIN_SCALE, scale * .7); resize(); ema = 18; hero.dataset.gl = scale.toFixed(2); }
      else giveUp();
    }
  };

  /* Event-driven rendering: the shader only runs while a transition is in progress, plus one
     frame when something changes (first paint, resize, slide settled). Between transitions the
     GPU does nothing; the slow zoom and the mouse parallax are CSS transforms on the canvas. */
  const draw = (now) => {
    const moving = next !== cur;
    if (moving) {
      prog = Math.min(1, (now - transStart) / TRANS);
      if (prog >= 1) { cur = next; prog = 0; }
    }
    const a = slides[cur], b = slides[next];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (b.tex || a.tex));
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uI0, a.w, a.h);
    gl.uniform2f(U.uI1, b.w, b.h);
    gl.uniform2f(U.uMouse, .5, .5);
    gl.uniform1f(U.uTime, 7.0 + seed);                        // light-leak position varies per slide
    gl.uniform1f(U.uProg, next !== cur ? ease(prog) : 0);
    gl.uniform1f(U.uK0, 9.0); gl.uniform1f(U.uK1, 9.0);       // fixed framing; CSS does the zoom
    gl.uniform1f(U.uSeed, seed);
    gl.uniform1f(U.uGrainT, seed * 13.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return next !== cur;
  };
  const frame = (now) => {
    raf = 0;
    if (!visible || document.hidden || !ready) { lastFrame = 0; return; }
    const moving = next !== cur;
    if (!moving && !dirty) { lastFrame = 0; return; }
    if (moving) watchPerf(now); else lastFrame = 0;
    dirty = false;
    if (draw(now)) raf = requestAnimationFrame(frame);
    else lastFrame = 0;
  };
  function kick() { if (!raf && visible && !document.hidden && ready) raf = requestAnimationFrame(frame); }

  /* Slide changes come from main.js (same timer drives labels + counter) */
  hero.addEventListener("hero:slide", async (e) => {
    const i = e.detail.index;
    if (i === next) return;
    const s = await load(slides[i]);
    if (!s || !s.tex) return;
    if (next !== cur) cur = next;                             // finish any running transition instantly
    next = i; transStart = performance.now(); seed = Math.random() * 10;
    kick();
  });

  /* Mouse parallax on the compositor: one style write per frame while the pointer moves */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let pr = 0, ev = null;
    hero.addEventListener("pointermove", (e) => {
      ev = e;
      if (pr) return;
      pr = requestAnimationFrame(() => {
        pr = 0;
        const r = hero.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
        canvas.style.translate = `${(-x * 26).toFixed(1)}px ${(-y * 18).toFixed(1)}px`;
      });
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { canvas.style.translate = ""; });
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) dirty = true; kick(); }).observe(hero);
  document.addEventListener("visibilitychange", () => { dirty = true; kick(); });
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); ready = false; hero.classList.remove("is-gl"); });

  /* Boot: first still, then the rest in the background */
  load(slides[0]).then((s) => {
    if (!s || !s.tex) return;
    hero.querySelector(".hero__slides").appendChild(canvas);
    ready = true;
    resize();
    requestAnimationFrame(() => hero.classList.add("is-gl"));
    const rest = () => slides.slice(1).forEach(load);
    "requestIdleCallback" in window ? requestIdleCallback(rest, { timeout: 2500 }) : setTimeout(rest, 1200);
  });
})();
