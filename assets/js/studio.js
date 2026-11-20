/* ASB Media Group — Studio interactions (vanilla, no libraries).
   Every loop is paused off-screen; pointer work is batched to one write per frame. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const onScreen = (el, fn, opts) => new IntersectionObserver(([en]) => fn(en.isIntersecting), opts).observe(el);

  /* Hero reveal once fonts are ready (avoids a reflow mid-animation) */
  const reveal = () => root.classList.add("is-in");
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve()).then(() => requestAnimationFrame(reveal));

  /* One-shot reveals for scene labels and the footer wordmark */
  const once = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); once.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".scene, .wordmark").forEach((el) => once.observe(el));

  /* REC timecode (12 updates/s, only while the hero is visible) */
  const tc = $("[data-timecode]");
  if (tc) {
    const t0 = performance.now() - 7000;
    let timer = 0;
    const pad = (n) => String(n).padStart(2, "0");
    const upd = () => {
      const f = Math.floor((performance.now() - t0) / (1000 / 24));
      tc.textContent = `${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
    };
    upd();
    if (!reduce) onScreen(tc.closest(".hero") || tc, (v) => { clearInterval(timer); timer = v ? setInterval(upd, 83) : 0; });
  }

  /* "Now showing" pill follows the hero slideshow (main.js fires hero:slide) */
  const hero = $(".hero[data-slides]");
  const now = $("[data-now]");
  if (hero && now) {
    const t = $("[data-now-t]", now), b = $("[data-now-b]", now);
    hero.addEventListener("hero:slide", (e) => {
      const fig = $$(".hero__slides figure", hero)[e.detail.index];
      if (!fig) return;
      if (t) t.textContent = fig.dataset.label || "";
      if (b && fig.dataset.video) { b.dataset.video = fig.dataset.video; b.dataset.title = fig.dataset.title || fig.dataset.label || "Film"; }
    });
  }

  /* Pause CSS loops (film strip, ticker) when off-screen */
  $$(".strip, .ticker").forEach((el) => onScreen(el, (v) => el.classList.toggle("is-paused", !v)));

  /* Client list: hovering a row swaps the preview card */
  const peek = $("[data-peek]");
  if (peek) {
    const imgs = $$("img", peek), cap = $("[data-peek-cap]", peek), sub = $("[data-peek-sub]", peek);
    $$("[data-row]").forEach((row) => row.addEventListener("pointerenter", () => {
      const k = row.dataset.row;
      imgs.forEach((im) => im.classList.toggle("is-on", im.dataset.k === k));
      $$("[data-row]").forEach((r) => r.classList.toggle("is-on", r === row));
      if (cap) cap.textContent = row.dataset.cap || "";
      if (sub) sub.textContent = row.dataset.sub || "";
    }));
  }

  /* Brief slider: auto-advances every 7s while visible and not hovered */
  const qs = $("[data-slider]");
  if (qs) {
    const items = $$(".q", qs), bgs = $$(".qs__bg img", qs), segs = $$(".qnav__segs i", qs), num = $("[data-q-num]", qs);
    let i = 0, timer = 0, vis = false, hover = false;
    const show = (n) => {
      i = (n + items.length) % items.length;
      items.forEach((q, j) => q.classList.toggle("is-on", j === i));
      bgs.forEach((im, j) => im.classList.toggle("is-on", j === i));
      segs.forEach((s, j) => { s.classList.remove("is-on"); if (j === i) { void s.offsetWidth; s.classList.add("is-on"); } });
      if (num) num.textContent = `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    };
    const run = () => { clearInterval(timer); timer = 0; qs.classList.toggle("is-paused", !(vis && !hover)); if (vis && !hover && !reduce) timer = setInterval(() => show(i + 1), 7000); };
    $("[data-q-prev]", qs).addEventListener("click", () => { show(i - 1); run(); });
    $("[data-q-next]", qs).addEventListener("click", () => { show(i + 1); run(); });
    qs.addEventListener("pointerenter", () => { hover = true; run(); });
    qs.addEventListener("pointerleave", () => { hover = false; run(); });
    onScreen(qs, (v) => { vis = v; run(); });
    show(0);
  }

  /* Back to top with a scroll-progress ring */
  const top = $(".totop");
  if (top) {
    let raf = 0;
    const upd = () => {
      raf = 0;
      const max = root.scrollHeight - innerHeight;
      top.classList.toggle("is-on", scrollY > 700);
      top.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(3) : 0);
    };
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    top.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
    upd();
  }

  /* Story picker → brief builder, pre-filled */
  $$("[data-picker]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("select", f).value;
    location.href = "contact.html" + (v ? "?film=" + encodeURIComponent(v) : "");
  }));

  /* "Play" / "View" bubble at the pointer over films (the real cursor stays) */
  const cur = $(".cur");
  if (cur && fine && !reduce) {
    root.classList.add("has-cur");
    const b = $(".cur__b", cur);
    let x = 0, y = 0, on = false, raf = 0;
    const place = () => { raf = 0; cur.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; if (on && !raf) raf = requestAnimationFrame(place); }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, select, input, textarea, [data-cursor]");
      on = !!(t && t.dataset.cursor);
      cur.classList.toggle("is-on", on);
      if (on) { b.textContent = t.dataset.cursor; place(); }
    });
  }
})();
