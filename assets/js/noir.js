/* ASB Media Group — Noir interactions: loader, custom cursor, WebGL film preview,
   background reel, magnetic orbs. Everything is skipped for reduced-motion visitors. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hero = $(".hero");

  /* ---------- Background reel (Vimeo, muted). Only revealed once it actually plays. ---------- */
  function startVideo() {
    const holder = $("[data-vimeo-bg]");
    if (!holder || reduce || innerWidth < 900) return;
    const c = navigator.connection;
    if (c && (c.saveData || /2g/.test(c.effectiveType || ""))) return;
    const f = document.createElement("iframe");
    f.src = `https://player.vimeo.com/video/${holder.dataset.vimeoBg}?background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1&title=0&byline=0&portrait=0&controls=0`;
    f.allow = "autoplay; fullscreen; picture-in-picture";
    f.title = "Showreel (background)";
    f.tabIndex = -1;
    const post = (m) => f.contentWindow && f.contentWindow.postMessage(JSON.stringify(m), "https://player.vimeo.com");
    addEventListener("message", (e) => {
      if (e.origin !== "https://player.vimeo.com" || e.source !== f.contentWindow) return;
      let d = e.data; try { d = typeof d === "string" ? JSON.parse(d) : d; } catch (x) { return; }
      if (d.event === "ready") { post({ method: "addEventListener", value: "play" }); post({ method: "addEventListener", value: "timeupdate" }); }
      if ((d.event === "timeupdate" && d.data && d.data.seconds > .3) || d.event === "play") {
        if (!holder.classList.contains("is-playing")) { holder.classList.add("is-playing"); hero.classList.add("video-on"); }
      }
    });
    new IntersectionObserver(([en]) => post({ method: en.isIntersecting ? "play" : "pause" })).observe(hero);
    holder.appendChild(f);
  }

  /* ---------- Loader → hero reveal ---------- */
  const ld = $(".ld");
  const reveal = () => { root.classList.add("is-in"); setTimeout(startVideo, 600); };
  if (!ld || reduce) { if (ld) ld.remove(); reveal(); }
  else {
    const quick = root.classList.contains("ld-quick");
    if (quick) ld.classList.add("ld--quick");
    try { sessionStorage.setItem("asb-noir", "1"); } catch (e) {}
    const n = $(".ld__n", ld), bar = $(".ld__bar", ld);
    const img = hero && $(".hero__slides img", hero);
    let imgReady = !img || img.complete;
    if (!imgReady) img.addEventListener("load", () => (imgReady = true), { once: true });
    const dur = quick ? 450 : 1300, t0 = performance.now();
    const step = (t) => {
      let k = Math.min(1, (t - t0) / dur);
      if (!imgReady && t - t0 < dur * 2.5) k = Math.min(k, .9);      // hold briefly for the hero still
      const e = 1 - Math.pow(1 - k, 3);
      n.textContent = Math.round(e * 100);
      bar.style.setProperty("--p", e);
      if (k < 1) return requestAnimationFrame(step);
      ld.classList.add("is-done");
      setTimeout(reveal, 280);
      setTimeout(() => ld.remove(), 1200);
    };
    requestAnimationFrame(step);
  }

  /* Clicking the hero (not its buttons) plays the reel */
  if (hero && hero.hasAttribute("data-hero-play")) {
    hero.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      const r = $(".reel", hero); r && r.click();
    });
  }

  /* Pause the ticker off-screen */
  const tio = new IntersectionObserver((es) => es.forEach((en) => en.target.classList.toggle("is-paused", !en.isIntersecting)));
  $$(".tick").forEach((t) => tio.observe(t));

  /* Exclusive accordion fallback for browsers without <details name> */
  $$(".svc details").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) $$(".svc details").forEach((o) => { if (o !== d) o.open = false; });
  }));

  if (reduce || !fine) return;

  /* ---------- Custom cursor ---------- */
  const cur = $(".cur");
  let mx = innerWidth / 2, my = innerHeight / 2;
  if (cur) {
    root.classList.add("has-cur");
    const ring = $(".cur__ring", cur), dot = $(".cur__dot", cur), label = $(".cur__label", cur);
    let rx = mx, ry = my, seen = false, raf = 0;
    const tick = () => {
      rx += (mx - rx) * .2; ry += (my - ry) * .2;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = Math.abs(mx - rx) + Math.abs(my - ry) > .2 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; rx = mx; ry = my; cur.style.opacity = 1; }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener("pointerleave", () => (cur.style.opacity = 0));
    document.addEventListener("pointerenter", () => (cur.style.opacity = 1));
    cur.style.opacity = 0;
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, summary, label, .opt, [data-cursor]");
      cur.classList.remove("is-hover", "is-label");
      if (!t) return;
      if (t.dataset.cursor) { cur.classList.add("is-label"); label.textContent = t.dataset.cursor; }
      else cur.classList.add("is-hover");
    });
  }

  /* ---------- Magnetic orbs ---------- */
  $$(".reel, .orb, .nav__cta").forEach((el) => {
    const k = el.classList.contains("nav__cta") ? .2 : .32;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${(e.clientX - r.left - r.width / 2) * k}px ${(e.clientY - r.top - r.height / 2) * k}px`;
    });
    el.addEventListener("pointerleave", () => (el.style.translate = ""));
  });

  /* ---------- Film roster: floating WebGL preview that ripples and splits with cursor speed ---------- */
  const roster = $("[data-roster]"), pv = $(".preview");
  if (!roster || !pv) return;
  const rows = $$(".row", roster);
  const srcs = rows.map((r) => r.dataset.preview);
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
  let px = mx, py = my, vx = 0, vy = 0, active = -1, shown = false, scale = .8, loop = 0;
  let draw = null, setTex = null;

  if (gl) {
    pv.appendChild(canvas);
    const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    const FS = `precision mediump float;varying vec2 v;uniform sampler2D a,b;uniform vec2 ra,rb,res,vel;uniform float mixv,t;
      vec2 cov(vec2 u,vec2 im){float rs=res.x/res.y,ri=im.x/im.y;vec2 s=rs>ri?vec2(1.,ri/rs):vec2(rs/ri,1.);return (u-.5)*s+.5;}
      vec3 tap(sampler2D s,vec2 u,vec2 im,vec2 o){vec2 q=cov(u,im);return vec3(texture2D(s,q+o).r,texture2D(s,q).g,texture2D(s,q-o).b);}
      void main(){vec2 u=vec2(v.x,1.-v.y);float sp=length(vel);
        u.x+=sin(u.y*9.+t*3.)*vel.x*.0012; u.y+=sin(u.x*9.+t*2.)*vel.y*.0012;
        u=(u-.5)*(1.-min(sp,60.)*.0012)+.5;
        vec2 o=vel*.0009;
        float d=(v.x+v.y)*.5;
        float m=1.-smoothstep(mixv*1.2-.2,mixv*1.2,d);
        vec3 c=mix(tap(a,u,ra,o),tap(b,u,rb,o),m);
        gl_FragColor=vec4(c,1.);}`;
    const sh = (ty, s) => { const o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = {}; ["a", "b", "ra", "rb", "res", "vel", "mixv", "t"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
      gl.uniform1i(U.a, 0); gl.uniform1i(U.b, 1);
      const tex = srcs.map(() => ({ t: null, w: 1, h: 1 }));
      srcs.forEach((src, i) => {
        const im = new Image(); im.decoding = "async";
        im.onload = async () => {
          try { await im.decode(); } catch (e) {}
          const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
          [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
          [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
          tex[i] = { t, w: im.naturalWidth, h: im.naturalHeight };
        };
        im.src = src;
      });
      let from = 0, to = 0, mixStart = 0;
      setTex = (i) => { if (i === to) return; from = to; to = i; mixStart = performance.now(); };
      draw = (now) => {
        const r = pv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5);
        const W = Math.round(r.width * d), H = Math.round(r.height * d);
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
        const A = tex[from].t ? tex[from] : tex[to], B = tex[to];
        if (!B.t) return;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, (A.t || B.t));
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B.t);
        gl.uniform2f(U.ra, A.w, A.h); gl.uniform2f(U.rb, B.w, B.h);
        gl.uniform2f(U.res, W, H); gl.uniform2f(U.vel, vx, vy);
        gl.uniform1f(U.mixv, Math.min(1, (now - mixStart) / 450));
        gl.uniform1f(U.t, now / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
    }
  }
  if (!draw) {                                      // no WebGL: plain image preview
    const img = document.createElement("img"); img.alt = ""; pv.appendChild(img);
    setTex = (i) => { img.src = srcs[i]; };
    draw = () => {};
  }

  const frame = (now) => {
    const nx = px + (mx - px) * .14, ny = py + (my - py) * .14;
    vx = vx * .8 + (nx - px) * .2 * 4; vy = vy * .8 + (ny - py) * .2 * 4;
    px = nx; py = ny;
    scale += ((shown ? 1 : .82) - scale) * .14;
    pv.style.transform = `translate3d(${px - pv.offsetWidth / 2}px, ${py - pv.offsetHeight / 2}px, 0) rotate(${Math.max(-8, Math.min(8, vx * .35))}deg) scale(${scale})`;
    draw(now);
    loop = shown || Math.abs(scale - .82) > .01 ? requestAnimationFrame(frame) : 0;
  };
  rows.forEach((row, i) => row.addEventListener("pointerenter", () => {
    setTex(i); active = i;
    if (!shown) { shown = true; px = mx; py = my; pv.classList.add("is-on"); }
    if (!loop) loop = requestAnimationFrame(frame);
  }));
  roster.addEventListener("pointerleave", () => { shown = false; pv.classList.remove("is-on"); });
  addEventListener("scroll", () => { if (shown && !roster.matches(":hover")) { shown = false; pv.classList.remove("is-on"); } }, { passive: true });
})();
