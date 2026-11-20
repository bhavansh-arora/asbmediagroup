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

  /* ---------- Opening sequence: loader (first visit) / curtain (page change) / plain ---------- */
  let markOpened;
  const opened = new Promise((r) => (markOpened = r));
  const reveal = () => { root.classList.add("is-in"); markOpened(); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fontsReady = Promise.race([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), wait(1400)]);
  const ld = $(".ld");
  const curtain = $(".curtain");
  const loaded = (im) => (im.complete && im.naturalWidth ? Promise.resolve() : new Promise((r) => { im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); }));

  /* Hero wall: only columns that are shown load (the 4th is hidden on phones); the wall fades in once
     every tile in those columns has loaded (never an empty tile), and pauses while the hero is off-screen */
  const wall = $(".hero__wall");
  let wallReady = Promise.resolve();
  if (wall) {
    // Sources are set by the inline script after the wall markup; a column that becomes visible later
    // (phone rotated, window widened) gets its tiles then
    addEventListener("resize", () => wall.wallLoad && wall.wallLoad(), { passive: true });
    const tiles = $$(".wall__col", wall).filter((c) => getComputedStyle(c).display !== "none").flatMap((c) => $$("img", c));
    const unique = [...new Map(tiles.map((im) => [im.getAttribute("src") || im.dataset.src, im])).values()];
    wallReady = Promise.race([Promise.all(unique.map(loaded)), wait(4000)]).then(() => wall.classList.add("is-ready"));
    onScreen(wall.closest(".hero") || wall, (v) => wall.classList.toggle("is-paused", !v));
  }
  const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: (k) => { try { sessionStorage.removeItem(k); } catch (e) {} } };

  if (root.classList.contains("ld-on") && ld) {
    store.set("asb-seen", "1");
    // The film reels show themselves as soon as their sprite arrives (inline script in the header);
    // keep the loader up until they have been on screen for a moment
    const reels = $$(".lstrip__reel", ld);
    const reelsSeen = Promise.race([Promise.all(reels.map(loaded)), wait(3500)]).then(() => wait(900));
    const bar = $(".ld__bar", ld), tcl = $("[data-ld-tc]", ld);
    const heroImg = $(".hero__slides figure.is-on img, .phead ~ * img");
    const imgReady = Promise.all([wallReady, reelsSeen, heroImg ? Promise.race([loaded(heroImg), wait(3000)]) : Promise.resolve()]);
    let ready = false;
    // The loader's name rises once its typeface is in (header script, max ~3s); give the rise time to land
    const nameShown = (window.__asbFonts || fontsReady).then(() => wait(1000));
    Promise.all([fontsReady, nameShown, imgReady]).then(() => (ready = true));
    // Count from navigation start (capped), so a slow script download never lengthens the loader
    const t0 = Math.min(performance.now(), 600), MIN = 2200;
    const pad = (n) => String(n).padStart(2, "0");
    const step = (now) => {
      const el = now - t0;
      let k = Math.min(1, el / MIN);
      if (!ready) k = Math.min(k, .9);
      const e = 1 - Math.pow(1 - k, 3);
      bar.style.setProperty("--p", e.toFixed(3));
      const f = Math.floor(el / (1000 / 24));
      if (tcl) tcl.textContent = `00:00:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
      if (k < 1 || !ready) return requestAnimationFrame(step);
      ld.classList.add("is-out");
      setTimeout(reveal, 420);
      setTimeout(() => { root.classList.remove("ld-on"); ld.remove(); }, 1300);
    };
    requestAnimationFrame(step);
  } else if (root.classList.contains("curtain-in") && curtain) {
    if (ld) ld.remove();
    store.del("asb-curtain");
    Promise.all([fontsReady, wait(380)]).then(() => {
      curtain.classList.add("is-opening");
      setTimeout(reveal, 260);
      setTimeout(() => { root.classList.remove("curtain-in"); curtain.classList.remove("is-opening"); }, 900);
    });
  } else {
    if (ld) ld.remove();
    fontsReady.then(() => requestAnimationFrame(reveal));
  }

  /* Internal links close the curtain, show the destination's name, then navigate */
  const NAMES = { "": "Home", "index.html": "Home", "work.html": "Films", "services.html": "Services", "weddings.html": "Weddings", "photography.html": "Stills", "about.html": "Studio", "contact.html": "Contact", "film-mary-lees-house.html": "Mary Lee’s House", "film-fun-bike-center.html": "Fun Bike Center", "film-teco-energy-audit.html": "Tampa Electric", "film-the-dance-room.html": "The Dance Room", "404.html": "ASB Media" };
  if (curtain && !reduce) {
    const nameEl = $("[data-curtain-name]", curtain);
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download") || a.closest(".lb")) return;
      const url = new URL(a.getAttribute("href"), location.href);
      if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
      if (url.pathname === location.pathname) return;                       // same page: hashes and queries scroll normally
      e.preventDefault();
      const file = url.pathname.split("/").pop();
      const name = NAMES[file] || (a.textContent || "").trim().slice(0, 40) || "ASB Media";
      nameEl.textContent = name;
      store.set("asb-curtain", name);
      root.classList.remove("menu-open");
      curtain.classList.remove("is-opening");
      curtain.classList.add("is-closed");
      setTimeout(() => (location.href = url.href), 700);
    });
    // Back/forward cache: never come back to a closed curtain
    addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      curtain.classList.remove("is-closed", "is-opening");
      root.classList.remove("curtain-in", "ld-on");
      store.del("asb-curtain");
      reveal();
    });
  }

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

  /* Framed hero: the film counter and the rotating word follow the film slider
     (main.js fires hero:slide on every change; it also runs the tabs' progress bars) */
  const fh = $(".hero--frame[data-slides]");
  if (fh) {
    const num = $("[data-hero-n]", fh), words = $$(".rot__w", fh);
    let w = 0;
    fh.addEventListener("hero:slide", (e) => {
      const i = e.detail.index;
      if (num) num.textContent = String(i + 1).padStart(2, "0");
      if (words.length > 1) {
        const prev = words[w];
        w = i % words.length;
        if (prev === words[w]) return;
        prev.classList.remove("is-on"); prev.classList.add("is-out");
        words[w].classList.remove("is-out"); words[w].classList.add("is-on");
        setTimeout(() => prev.classList.remove("is-out"), 900);
      }
    });
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

  /* Sections that slide images in sideways (the films reel) can't rely on native lazy loading:
     the browser judges distance by layout position, not by the transform that moves them in.
     Start loading every image in such a section once it is within ~1.5 screens, and decode them ahead of
     time so no card hitches the first time it slides into view. */
  const pre = new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    $$("img[loading=lazy]", en.target).forEach((im) => { im.loading = "eager"; if (im.decode) im.decode().catch(() => {}); });
    pre.unobserve(en.target);
  }), { rootMargin: "150% 0px 150% 0px" });
  opened.then(() => $$("[data-preload]").forEach((el) => pre.observe(el)));

  /* Films reel. Laptops and desktops: the section pins and the page's own scroll moves the reel sideways
     (--reel-speed px across per 1px down; CSS scroll timeline where supported, else the transform is set here),
     then the page carries on after the last card. Phones, tablets and reduced motion: a native sideways
     scroller. Either way the arrows page through it (as many whole cards as fit, at least one) and switch
     off at either end, and the bar's thumb shows which part of the reel is in view. */
  const reel = $(".reel");
  const track = reel && $(".reel__track", reel);
  if (track) {
    const inner = $(".reel__in", reel) || reel;
    const thumb = $(".reel__bar i", reel);
    const prev = $("[data-reel-prev]", reel), next = $("[data-reel-next]", reel);
    const pinMQ = matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)");
    const cssDriven = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
    let travel = 0, raf = 0, speed = 1;
    const pinned = () => pinMQ.matches;
    const reelTop = () => reel.getBoundingClientRect().top + scrollY;
    // how far the reel has moved sideways, and how far it can move
    const pos = () => pinned() ? Math.min(travel, Math.max(0, (scrollY - reelTop()) * speed)) : track.scrollLeft;
    const max = () => pinned() ? travel : track.scrollWidth - track.clientWidth;
    const measure = () => {
      if (pinned()) {
        speed = parseFloat(getComputedStyle(reel).getPropertyValue("--reel-speed")) || 1;
        travel = Math.max(0, Math.round(track.scrollWidth - inner.clientWidth));
        reel.style.setProperty("--travel", `${travel}px`);
      } else {
        travel = 0;
        reel.style.removeProperty("--travel");
        track.style.transform = "";
      }
      queue();
    };
    const upd = () => {
      raf = 0;
      const x = pos(), m = max(), view = pinned() ? inner.clientWidth : track.clientWidth, full = view + m;
      if (pinned() && !cssDriven) track.style.transform = `translate3d(${-x}px, 0, 0)`;
      if (thumb) { const f = full ? view / full : 1; thumb.style.width = `${f * 100}%`; thumb.style.transform = `translateX(${m ? (x / m) * ((1 - f) / f) * 100 : 0}%)`; }
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= m - 2;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(upd); };
    track.addEventListener("scroll", queue, { passive: true });
    addEventListener("scroll", () => { if (pinned()) queue(); }, { passive: true });
    addEventListener("resize", measure, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(measure).observe(track);
    if (pinMQ.addEventListener) pinMQ.addEventListener("change", measure);
    const page = (dir) => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const card = $(".film", track);
      const step = card ? card.getBoundingClientRect().width + gap : track.clientWidth * .8;
      const room = (pinned() ? inner.clientWidth : track.clientWidth) - 2 * (parseFloat(getComputedStyle(track).paddingLeft) || 0) + gap;
      const by = dir * Math.max(1, Math.floor(room / step)) * step;
      const behavior = reduce ? "auto" : "smooth";
      if (pinned()) scrollTo({ top: reelTop() + Math.min(travel, Math.max(0, pos() + by)) / speed, behavior });
      else track.scrollBy({ left: by, behavior });
    };
    if (prev) prev.addEventListener("click", () => page(-1));
    if (next) next.addEventListener("click", () => page(1));
    // While pinned, a sideways trackpad swipe over the reel moves it too (instead of doing nothing,
    // or the browser going back a page)
    reel.addEventListener("wheel", (e) => {
      if (!pinned() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const x = pos(), unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1, dx = e.deltaX * unit;
      if ((dx < 0 && x <= 0) || (dx > 0 && x >= travel)) return;
      e.preventDefault();
      scrollBy(0, dx / speed);
    }, { passive: false });
    measure();
  }

  /* Deferred image groups ([data-defer], e.g. the film strip under the hero): sources are set only after
     the opening, so they never compete with the loader and hero for bandwidth; the group fades in once
     every frame is in, so it never moves with empty frames */
  opened.then(() => $$("[data-defer]").forEach((g) => {
    const ims = $$("img[data-src]", g);
    ims.forEach((im) => { im.src = im.dataset.src; im.removeAttribute("data-src"); });
    Promise.race([Promise.all(ims.map(loaded)), wait(8000)]).then(() => g.classList.add("is-ready"));
  }));

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
    $$("[data-top]").forEach((l) => l.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }));
    upd();
    // Step aside once the footer is in view: it has its own "Back to top" link, and the button
    // would otherwise sit on the footer's links and arrows
    const fb = $(".foot");
    if (fb) onScreen(fb, (v) => top.classList.toggle("is-docked", v));
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
