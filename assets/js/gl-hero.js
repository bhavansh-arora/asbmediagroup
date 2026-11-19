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
  let slideStart = [performance.now(), performance.now()];
  const mouse = { x: .5, y: .5, tx: .5, ty: .5 };
  let visible = true, raf = 0, lastGrain = 0, grainT = 0, ready = false, lastDraw = 0;
  const TRANS = 1700;
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* Adaptive quality: render scale starts near device resolution (capped), drops if the GPU
     struggles, and the CSS slideshow takes back over if even the lowest scale is too slow. */
  let scale = Math.min(window.devicePixelRatio || 1, 1.25);
  const MIN_SCALE = .5;
  let ema = 16.7, lastFrame = 0, sampled = 0;
  const resize = () => {
    const r = hero.getBoundingClientRect();
    let s = scale;
    const px = r.width * r.height * s * s;
    if (px > 2.4e6) s *= Math.sqrt(2.4e6 / px);                 // never shade more than ~2.4MP
    canvas.width = Math.max(1, Math.round(r.width * s));
    canvas.height = Math.max(1, Math.round(r.height * s));
    gl.viewport(0, 0, canvas.width, canvas.height);
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
      const dt = Math.min(now - lastFrame, 250);
      if (dt < 120) { ema = ema * .92 + dt * .08; sampled++; }      // ignore tab-switch gaps
    }
    lastFrame = now;
    if (sampled > 45 && ema > 26) {
      sampled = 0;
      if (scale > MIN_SCALE) { scale = Math.max(MIN_SCALE, scale * .7); resize(); ema = 20; hero.dataset.gl = scale.toFixed(2); }
      else giveUp();
    }
  };

  const frame = (now) => {
    raf = 0;
    if (!visible || document.hidden || !ready) { lastFrame = 0; return; }
    if (hero.classList.contains("video-on")) { lastFrame = 0; return; }   // real reel is playing on top
    watchPerf(now);
    // ease mouse toward target
    mouse.x += (mouse.tx - mouse.x) * .06; mouse.y += (mouse.ty - mouse.y) * .06;
    // When nothing is moving, redraw at ~30fps (grain only changes at 24fps anyway)
    const idle = next === cur && Math.abs(mouse.tx - mouse.x) + Math.abs(mouse.ty - mouse.y) < .002;
    if (idle && now - lastDraw < 32) { raf = requestAnimationFrame(frame); return; }
    lastDraw = now;
    if (next !== cur) {
      prog = Math.min(1, (now - transStart) / TRANS);
      if (prog >= 1) { cur = next; prog = 0; slideStart[0] = slideStart[1]; }
    }
    if (now - lastGrain > 1000 / 24) { grainT = Math.random() * 100; lastGrain = now; }   // grain ticks at 24fps
    const a = slides[cur], b = slides[next];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (b.tex || a.tex));
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uI0, a.w, a.h);
    gl.uniform2f(U.uI1, b.w, b.h);
    gl.uniform2f(U.uMouse, mouse.x, 1 - mouse.y);
    gl.uniform1f(U.uTime, now / 1000);
    gl.uniform1f(U.uProg, next !== cur ? ease(prog) : 0);
    gl.uniform1f(U.uK0, (now - slideStart[0]) / 1000);
    gl.uniform1f(U.uK1, (now - slideStart[1]) / 1000);
    gl.uniform1f(U.uSeed, seed);
    gl.uniform1f(U.uGrainT, grainT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && visible && !document.hidden && ready) raf = requestAnimationFrame(frame); };

  /* Slide changes come from main.js (same timer drives labels + counter) */
  hero.addEventListener("hero:slide", async (e) => {
    const i = e.detail.index;
    if (i === next) return;
    const s = await load(slides[i]);
    if (!s || !s.tex) return;
    if (next !== cur) { cur = next; slideStart[0] = slideStart[1]; }   // finish any running transition instantly
    next = i; transStart = performance.now(); slideStart[1] = transStart; seed = Math.random() * 10;
    kick();
  });

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = (e.clientY - r.top) / r.height;
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { mouse.tx = .5; mouse.ty = .5; });
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }).observe(hero);
  document.addEventListener("visibilitychange", kick);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); ready = false; hero.classList.remove("is-gl"); });

  /* Boot: first still, then the rest in the background */
  load(slides[0]).then((s) => {
    if (!s || !s.tex) return;
    hero.querySelector(".hero__slides").appendChild(canvas);
    resize();
    ready = true;
    slideStart = [performance.now(), performance.now()];
    kick();
    requestAnimationFrame(() => hero.classList.add("is-gl"));
    const rest = () => slides.slice(1).forEach(load);
    "requestIdleCallback" in window ? requestIdleCallback(rest, { timeout: 2500 }) : setTimeout(rest, 1200);
  });
})();
