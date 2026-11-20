/* ASB Media Group — interactions (vanilla, no dependencies).
   Native scrolling throughout; motion is CSS transitions toggled by IntersectionObserver. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Nav: solid once scrolled; mobile bottom bar after the hero */
  const nav = $(".nav");
  const mbar = $(".mbar");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      nav && nav.classList.toggle("is-solid", y > 24);
      mbar && mbar.classList.toggle("is-on", y > innerHeight * 0.7);
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu sheet */
  const menuBtn = $(".nav__menu");
  const sheet = $(".sheet");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    menuBtn && menuBtn.setAttribute("aria-expanded", String(open));
    if (sheet) { sheet.inert = !open; sheet.setAttribute("aria-hidden", String(!open)); }
  };
  if (sheet) sheet.inert = true;
  menuBtn && menuBtn.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  sheet && sheet.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

  /* Split headlines into masked words (they rise in, staggered, when revealed) */
  const splitWords = (el, wrap) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            frag.appendChild(wrap(part, i++));
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.hasAttribute("data-nosplit")) {
          // kept whole (e.g. the hero's rotating word): masked and rising like any other word
          const o = document.createElement("span"); o.className = "wd"; o.setAttribute("aria-hidden", "true");
          const n = document.createElement("span"); n.style.setProperty("--i", i++);
          ch.replaceWith(o); n.appendChild(ch); o.appendChild(n);
        } else if (ch.nodeType === 1 && !ch.classList.contains("pill") && ch.tagName !== "BR") walk(ch);
      });
    };
    walk(el);
  };
  if (!reduce) {
    $$(".hero-title, .h1, .h2").forEach((h) => {
      if (h.closest("[data-r-name], .finder__result")) return;
      if (!h.hasAttribute("aria-label")) h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
      splitWords(h, (word, i) => {
        const o = document.createElement("span"); o.className = "wd"; o.setAttribute("aria-hidden", "true");
        const n = document.createElement("span"); n.textContent = word; n.style.setProperty("--i", i);
        o.appendChild(n); return o;
      });
      h.classList.add("words");
      if (!h.closest("[data-r]")) h.setAttribute("data-r", "");
    });
    // Statement paragraphs light up word by word as they scroll through (CSS scroll timeline)
    $$(".statement").forEach((p) => splitWords(p, (word, i) => { const s = document.createElement("span"); s.className = "sw"; s.textContent = word; s.style.setProperty("--i", i); return s; }));
  }

  /* Reveal on enter (once) */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$("[data-r]").forEach((el) => revealIO.observe(el));
  // One-shot accents (rules, statement highlight, footer wordmark): get .in once, no hiding
  $$(".label, .steps, .foot__mark, .statement").forEach((el) => revealIO.observe(el));

  /* Pause CSS tickers while off-screen */
  const tickIO = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle("is-paused", !en.isIntersecting)));
  $$(".ticker").forEach((t) => tickIO.observe(t));

  /* Local Tampa time */
  const clocks = $$("[data-clock]");
  const tick = () => {
    try { const t = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date()); clocks.forEach((c) => (c.textContent = t)); } catch (e) {}
  };
  if (clocks.length) { tick(); setInterval(tick, 30000); }
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* Lightbox: Vimeo films + image galleries */
  const lb = $(".lb");
  const frame = lb && $(".lb__frame", lb);
  const cap = lb && $(".lb__cap", lb);
  let group = [], gi = 0, lastFocus = null;
  const open = (html, cls) => {
    lastFocus = document.activeElement;
    frame.className = "lb__frame" + (cls ? " " + cls : "");
    frame.innerHTML = html;
    lb.classList.add("is-open"); lb.inert = false; lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".lb__close", lb).focus();
    document.dispatchEvent(new Event("lb:open"));
  };
  const close = () => {
    if (!lb || !lb.classList.contains("is-open")) return;
    lb.classList.remove("is-open"); lb.inert = true; lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => (frame.innerHTML = ""), 300);
    lastFocus && lastFocus.focus && lastFocus.focus();
    document.dispatchEvent(new Event("lb:close"));
  };
  const showImg = (n) => {
    gi = (n + group.length) % group.length;
    open(`<img src="${group[gi].src}" alt="${group[gi].alt.replace(/"/g, "&quot;")}">`, "lb__frame--img");
    cap.textContent = `${String(gi + 1).padStart(2, "0")} / ${String(group.length).padStart(2, "0")}`;
  };
  if (lb) {
    lb.inert = true;
    $(".lb__close", lb).addEventListener("click", close);
    $(".lb__prev", lb).addEventListener("click", () => showImg(gi - 1));
    $(".lb__next", lb).addEventListener("click", () => showImg(gi + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); setMenu(false); }
    if (lb && lb.classList.contains("is-open") && group.length) {
      if (e.key === "ArrowRight") showImg(gi + 1);
      if (e.key === "ArrowLeft") showImg(gi - 1);
    }
  });
  const vimeo = (id) => `https://player.vimeo.com/video/${id}?autoplay=1&title=0&byline=0&portrait=0&color=ef5a2c&dnt=1`;
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-video]");
    if (v && lb) {
      e.preventDefault();
      group = [];
      $$(".lb__prev, .lb__next", lb).forEach((b) => (b.hidden = true));
      cap.textContent = v.dataset.title || "";
      open(`<iframe src="${vimeo(v.dataset.video)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${v.dataset.title || "Film"}"></iframe>`);
      return;
    }
    const g = e.target.closest("[data-lb]");
    if (g && lb) {
      e.preventDefault();
      const scope = g.closest("[data-lb-scope]") || document;
      group = $$("[data-lb]", scope).filter((x) => !x.closest(".is-hidden")).map((x) => ({ src: x.dataset.lb, alt: ($("img", x) || {}).alt || "" }));
      $$(".lb__prev, .lb__next", lb).forEach((b) => (b.hidden = false));
      showImg(group.findIndex((x) => x.src === g.dataset.lb));
    }
  });

  /* Inline case-study player */
  $$("[data-player]").forEach((p) => {
    const start = () => {
      if (p.querySelector("iframe")) return;
      const f = document.createElement("iframe");
      f.src = vimeo(p.dataset.player);
      f.allow = "autoplay; fullscreen; picture-in-picture";
      f.allowFullscreen = true;
      f.title = p.dataset.title || "Film";
      p.appendChild(f);
    };
    p.addEventListener("click", start);
  });

  /* Masonry with level bottoms. Each figure goes into the currently shortest column (using the
     image's width/height attributes), then each column's images are scaled a few percent so all
     columns end at the same height (object-fit crops the difference). Without JS, CSS columns stay. */
  $$(".masonry").forEach((m) => {
    const figs = [...m.children].filter((f) => f.tagName === "FIGURE");
    const ratio = (f) => { const i = $("img", f); return i && +i.getAttribute("width") ? +i.getAttribute("height") / +i.getAttribute("width") : 0; };
    if (!figs.length || figs.some((f) => !ratio(f))) return;
    const narrow = matchMedia("(max-width: 900px)");
    let lastW = 0;
    const lay = () => {
      const n = narrow.matches ? 2 : 3;
      m.classList.add("is-laid");
      const gap = parseFloat(getComputedStyle(m).columnGap) || 0;
      const w = (m.clientWidth - gap * (n - 1)) / n;
      if (w <= 0) return;
      const cols = Array.from({ length: n }, () => ({ el: Object.assign(document.createElement("div"), { className: "masonry__col" }), figs: [], img: 0 }));
      const height = (c) => c.img + gap * Math.max(0, c.figs.length - 1);
      figs.forEach((f) => {
        if (f.classList.contains("is-hidden")) { cols[0].el.append(f); return; }
        const c = cols.reduce((a, b) => (height(b) < height(a) ? b : a));
        c.figs.push(f); c.img += ratio(f) * w; c.el.append(f);
      });
      const used = cols.filter((c) => c.figs.length);
      const target = used.reduce((sum, c) => sum + height(c), 0) / (used.length || 1);
      cols.forEach((c) => {
        const gaps = gap * Math.max(0, c.figs.length - 1);
        const k = c.img ? Math.min(1.25, Math.max(0.8, (target - gaps) / c.img)) : 1;
        c.figs.forEach((f) => { f.style.aspectRatio = "1 / " + (ratio(f) * k).toFixed(4); });
      });
      m.replaceChildren(...cols.map((c) => c.el));
      lastW = m.clientWidth;
    };
    lay();
    narrow.addEventListener("change", lay);
    m.addEventListener("relayout", lay);
    let timer = 0;
    new ResizeObserver(() => { if (Math.abs(m.clientWidth - lastW) > 1) { clearTimeout(timer); timer = setTimeout(lay, 150); } }).observe(m);
  });

  /* Filters (work + stills), with deep links like photography.html#sports */
  $$("[data-filter-group]").forEach((groupEl) => {
    const scope = $(groupEl.dataset.filterGroup);
    const tabs = $$("[data-filter]", groupEl);
    const apply = (tab) => {
      tabs.forEach((t) => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-pressed", String(t === tab)); });
      const f = tab.dataset.filter;
      $$("[data-cat]", scope).forEach((it) => it.classList.toggle("is-hidden", !(f === "all" || it.dataset.cat.split(" ").includes(f))));
      scope.classList.toggle("is-filtered", f !== "all");
      scope.dispatchEvent(new Event("relayout"));
    };
    tabs.forEach((t) => t.addEventListener("click", () => apply(t)));
    const deep = location.hash && tabs.find((t) => t.dataset.filter === location.hash.slice(1));
    if (deep) apply(deep);
  });

  /* Film finder */
  const finder = $("[data-finder]");
  if (finder) {
    const steps = $$(".finder__step", finder);
    const bars = $$(".finder__bar i", finder);
    const result = $(".finder__result", finder);
    const back = $("[data-back]", finder);
    const again = $("[data-again]", finder);
    const answers = {};
    let idx = 0;
    const RECS = {
      anthem: { name: "A brand anthem <em>film.</em>", code: "anthem", run: "60–180 sec hero film", why: "You need people to feel what you stand for. An anthem film anchors your website, pitches and launches, then gets cut down for social.", chips: ["Interviews", "Cinematic B-roll", "3 social cut-downs"], ref: ["Mary Lee’s House", "film-mary-lees-house.html"] },
      product: { name: "A product <em>showcase.</em>", code: "showcase", run: "30–90 sec showcase", why: "Your product has to look as good on screen as it does in hand: controlled light, macro detail and motion that stops the scroll.", chips: ["Studio or location", "Macro detail", "Stills from set"], ref: ["Fun Bike Center", "film-fun-bike-center.html"] },
      social: { name: "A social ad <em>campaign.</em>", code: "social", run: "6+ edits, 15–30 sec", why: "You need volume and hooks that test. One shoot day, many vertical-first edits built for paid acquisition and organic reach.", chips: ["Hook-first", "9:16 native", "A/B variants"], ref: ["Fun Bike Center", "film-fun-bike-center.html"] },
      explainer: { name: "A field <em>feature.</em>", code: "feature", run: "30–120 sec explainer", why: "You have a process people don’t understand yet. We film the real work on site and make the technical feel clear and human.", chips: ["On-site crew", "Interview-led", "Graphics"], ref: ["TECO Energy Audit", "film-teco-energy-audit.html"] },
    };
    const decide = () => {
      const s = { anthem: 0, product: 0, social: 0, explainer: 0 };
      Object.values(answers).forEach((v) => v.split(",").forEach((k) => (s[k] += 1)));
      return Object.keys(s).sort((a, b) => s[b] - s[a])[0];
    };
    const show = (n) => {
      idx = n;
      const done = n >= steps.length;
      steps.forEach((s, j) => s.classList.toggle("is-active", j === n));
      bars.forEach((b, j) => b.classList.toggle("is-done", j < n));
      result.classList.toggle("is-active", done);
      back.hidden = n === 0 || done;
      again.hidden = !done;
      // Light up the matching format tile beside the quiz
      const key = done ? decide() : null;
      const outs = $("[data-outcomes]");
      if (outs) {
        outs.classList.toggle("has-match", done);
        $$("[data-outcome]", outs).forEach((o) => o.classList.toggle("is-match", o.dataset.outcome === key));
      }
      if (done) {
        const r = RECS[key];
        $("[data-r-name]", result).innerHTML = r.name;
        $("[data-r-run]", result).textContent = r.run;
        $("[data-r-why]", result).textContent = r.why;
        $("[data-r-chips]", result).innerHTML = r.chips.map((c) => `<span class="chip">${c}</span>`).join("");
        const ref = $("[data-r-ref]", result);
        ref.href = r.ref[1]; ref.firstChild.textContent = "See it: " + r.ref[0] + " ";
        $("[data-r-cta]", result).href = `contact.html?film=${r.code}`;
      }
    };
    $$(".opt", finder).forEach((o) => o.addEventListener("click", () => {
      const step = o.closest(".finder__step");
      $$(".opt", step).forEach((x) => x.classList.toggle("is-picked", x === o));
      answers[steps.indexOf(step)] = o.dataset.v;
      setTimeout(() => show(idx + 1), 220);
    }));
    back.addEventListener("click", () => show(Math.max(0, idx - 1)));
    again.addEventListener("click", () => { $$(".opt", finder).forEach((x) => x.classList.remove("is-picked")); show(0); });
    show(0);
  }

  /* Brief builder (contact) */
  const brief = $("[data-brief]");
  if (brief) {
    const sets = $$(".fs", brief);
    const tabs = $$(".brief__steps button", brief);
    const prev = $("[data-prev]", brief), next = $("[data-next]", brief), submit = $("[data-submit]", brief);
    const err = $(".form-err", brief);
    const done = $(".brief__done");
    let cur = 0;
    const pre = new URLSearchParams(location.search).get("film");
    if (pre) { const r = $(`input[name="type"][value="${CSS.escape(pre)}"]`, brief); if (r) r.checked = true; }
    const go = (n) => {
      cur = n;
      sets.forEach((s, j) => s.classList.toggle("is-active", j === n));
      tabs.forEach((t, j) => { t.classList.toggle("is-active", j === n); t.classList.toggle("is-done", j < n); });
      prev.style.visibility = n === 0 ? "hidden" : "visible";
      next.hidden = n === sets.length - 1;
      submit.hidden = n !== sets.length - 1;
      err.textContent = "";
    };
    const valid = (n) => {
      const s = sets[n];
      const names = [...new Set($$("input[type=radio][required]", s).map((r) => r.name))];
      for (const nm of names) if (!$(`input[name="${nm}"]:checked`, s)) { err.textContent = "Pick an option to continue."; return false; }
      for (const inp of $$("input[required]:not([type=radio]), textarea[required]", s)) {
        if (!inp.value.trim() || !inp.checkValidity()) { err.textContent = `Please add a valid ${inp.dataset.name || inp.name}.`; inp.focus(); return false; }
      }
      return true;
    };
    next.addEventListener("click", () => { if (valid(cur)) go(cur + 1); });
    prev.addEventListener("click", () => go(Math.max(0, cur - 1)));
    tabs.forEach((t, j) => t.addEventListener("click", () => { if (j <= cur || [...Array(j).keys()].every(valid)) go(j); }));
    const label = (n) => { const c = $(`input[name="${n}"]:checked`, brief); return c ? c.dataset.label || c.value : "—"; };
    const val = (n) => { const f = brief.elements[n]; return f && f.value.trim() ? f.value.trim() : "—"; };
    brief.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!valid(cur)) return;
      const text = `PROJECT BRIEF — ASB Media Group\n\nName:       ${val("name")}\nCompany:    ${val("company")}\nEmail:      ${val("email")}\nPhone:      ${val("phone")}\n\nProject:    ${label("type")}\nGoal:       ${label("goal")}\nTimeline:   ${label("timeline")}\nBudget:     ${label("budget")}\n\nDetails:\n${val("details")}`;
      $(".brief__summary").textContent = text;
      const subject = encodeURIComponent(`New project enquiry — ${val("company") !== "—" ? val("company") : val("name")}`);
      const mail = `mailto:aramisbooker@asbmediagroup.com?subject=${subject}&body=${encodeURIComponent(text)}`;
      $("[data-mailto]").href = mail;
      if (brief.dataset.endpoint) { try { await fetch(brief.dataset.endpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(brief) }); } catch (x) {} }
      brief.hidden = true;
      done.classList.add("is-active");
      done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (!brief.dataset.endpoint) setTimeout(() => (location.href = mail), 600);
    });
    const copy = $("[data-copy]");
    copy && copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText($(".brief__summary").textContent); copy.querySelector("span").textContent = "Copied"; } catch (x) {} });
    go(0);
  }

  /* Count-up for big stat numbers (4K, 48h) when they reveal */
  if (!reduce) {
    $$(".tile__big, [data-countup]").forEach((el) => {
      const tn = Array.from(el.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.textContent));
      if (!tn) return;
      const m = tn.textContent.match(/^(\D*)(\d+)(.*)$/);
      if (!m) return;
      const end = +m[2];
      const width = m[2].length;                       // keep leading zeros ("04")
      const fmt = (v) => String(v).padStart(width, "0");
      m[2] = null;
      tn.textContent = m[1] + fmt(0) + m[3];
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / 1400);
          tn.textContent = m[1] + fmt(Math.round(end * (1 - Math.pow(1 - k, 3)))) + m[3];
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: .6 });
      io.observe(el);
    });
  }

  /* Pointer effects (mouse/trackpad only): cursor spotlight + 3D tilt on cards, magnetic buttons */
  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const track = (el, onMove, onLeave) => {
      let raf = 0, ev = null;
      el.addEventListener("pointermove", (e) => { ev = e; if (!raf) raf = requestAnimationFrame(() => { raf = 0; onMove(ev, el.getBoundingClientRect()); }); });
      el.addEventListener("pointerleave", () => { cancelAnimationFrame(raf); raf = 0; onLeave(); });
    };
    // 3D tilt on package cards only (one transform write per frame; no per-card style vars)
    $$(".pkg").forEach((card) => {
      track(card, (e, r) => {
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.transform = `perspective(900px) rotateX(${((r.height / 2 - y) / r.height) * 6}deg) rotateY(${((x - r.width / 2) / r.width) * 6}deg) translateY(-4px)`;
      }, () => { card.style.transform = ""; });
    });
    $$(".btn, .mcard .circle").forEach((b) => {
      if (b.closest(".pkg")) return; // full-width card buttons would slide out of the card
      const k = .22;
      track(b, (e, r) => {
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * k}px ${(e.clientY - r.top - r.height / 2) * k}px`;
      }, () => { b.style.translate = ""; });
    });
  }
})();
