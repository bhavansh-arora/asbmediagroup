# ASB Media Group — Website

A multi-page portfolio site for ASB Media Group, a commercial video and photography studio in Tampa Bay. It is static HTML, CSS and JS, with no framework and no backend.

## Pages

| Page | File |
| --- | --- |
| Home: hero film, selected-films reel, services, Film Finder, process, industries, CTA | `index.html` |
| Work: filterable film index | `work.html` |
| Case studies (×4) | `film-mary-lees-house.html`, `film-fun-bike-center.html`, `film-teco-energy-audit.html`, `film-the-dance-room.html` |
| Services and packages | `services.html` |
| Weddings | `weddings.html` |
| Stills: sports, product and wedding gallery with lightbox | `photography.html` |
| Studio / About | `about.html` |
| Contact: 4-step Brief Builder plus FAQ | `contact.html` |
| 404 | `404.html` |

## Editing

Pages are generated. **Edit the files in `src/`, then rebuild:**

```bash
python3 build.py
```

- `src/partials/`: shared head, nav, mobile menu and the closing panel/footer (each page sets its closing headline with `"cta"` in its meta line)
- `src/pages/`: the body of each page. The first line is a JSON meta comment with title, description and nav.
- `src/cases.py`: all four case studies come from one data list and one template. To add a film, add an entry here.
- `assets/css/studio.css`: the current "Studio" design system (Arista-style: Fraunces + DM Sans, ink and cream sections, ember actions) used by every page via `"layout": "studio"` in each page's meta line. `noir.css` and `styles.css` are earlier directions, kept for reference.
- `src/partials/header_studio.html` / `footer_studio.html`: the Studio shell (nav, mobile menu, ticker, footer with wordmark, back-to-top ring)
- `assets/js/studio.js`: the first-visit loader (film strips, name reveal, split open) and the page-change curtain (closes on internal links, shows the destination's name, opens on the next page; both skipped for reduced-motion visitors), REC timecode, the "Now showing" pill, client-list previews, the brief slider, back-to-top ring, play bubble, story picker. No libraries; the pinned film reel is a CSS scroll timeline.
- Loading order (tested on throttled phone connections): the opening state is decided in the `<head>` before anything paints; the loader's two film reels are single sprites (`ld-reel-a/b.webp`, 78KB) preloaded at high priority and shown by an inline script the moment they arrive; page scripts load from the `<head>` at high priority; the home hero is a framed cinematic panel (logo-free crops `*-hero.webp`, first slide 46KB / 20KB on phones) that grows open after the loader or curtain, with a slide counter, a rotating italic word and a featured film that plays in the lightbox; the films reel loads after the opening. A 9s safety net in the head reveals the page whatever happens to the network.
- `build.py` stamps CSS/JS URLs with a content hash (`?v=…`), so a browser never pairs new HTML with a cached old script.
- `assets/js/main.js`: interactions in plain JavaScript (no libraries): word-mask headline reveals, count-ups, cursor spotlight/tilt, magnetic buttons, quiz, brief builder, lightbox. Scrolling is native.
- `assets/js/gl-hero.js`: the WebGL hero (film-burn transitions). It only draws while a transition runs; the slow zoom and mouse parallax are CSS transforms on the canvas. It lowers its own resolution on slow GPUs, and browsers rendering WebGL in software (hardware acceleration off) get the CSS cross-fade instead. Add `?gl=force` to a URL to force the shader on for testing.
- Performance rule for Noir: scroll-timeline animations keep a GPU layer alive permanently, so only the hero exit and the pinned photo strip use them. Everything else is a one-shot reveal (main.js adds `.in` once).
- Images: `build.py` adds width/height and a `-sm`/full `srcset` to every image automatically, so phones download the small versions.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Before launch

- **Form delivery.** By default the Brief Builder opens the visitor's email app with the brief pre-filled. To receive submissions directly, add `data-endpoint="https://formspree.io/f/XXXX"` to the `<form data-brief>` in `src/pages/contact.html`.
- **Vimeo embeds.** The films use ASB's existing Vimeo IDs. If the Vimeo privacy settings restrict embedding by domain, add the new domain in Vimeo.
- **Confirm with the client:** the package names and inclusions (`services.html`), the timeline wording in the FAQ ("3–6 weeks"), the "free 20-minute discovery call" and "fixed price" promises, the founder portrait (it currently uses a film still), and any client testimonials.
