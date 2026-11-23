#!/usr/bin/env python3
"""
Static site builder for ASB Media Group.

  python3 build.py

Reads src/pages/*.html, wraps each in the shared partials (src/partials/),
expands {{icon:name}} snippets, and writes finished pages to the repo root.
Each page starts with a meta comment:

  <!--meta {"title": "...", "desc": "...", "nav": "work", "loader": false} -->
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
# The live address comes from CNAME (the domain the site is served on), so canonical links, link
# previews, the sitemap and robots.txt always point at the real site. Moving domains = edit CNAME.
SITE_URL = "https://" + (ROOT / "CNAME").read_text().strip().rstrip("/")


def og_image(path):
    """Absolute URL of a page's link-preview image: its 1200x630 JPG (made by make_og.py) if there is one."""
    jpg = Path(path).parent / "og" / (Path(path).stem + ".jpg")
    return f"{SITE_URL}/{jpg.as_posix() if (ROOT / jpg).exists() else path}"

ICONS = {
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "arrow-ur": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    "arrow-l": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    "play": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4.5v15a.5.5 0 0 0 .76.43l12.5-7.5a.5.5 0 0 0 0-.86L6.76 4.07A.5.5 0 0 0 6 4.5Z"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m4 12.5 5 5L20 6.5"/></svg>',
    "close": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>',
    "star": '<svg class="marquee__star" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><path d="M20 0c1.2 10.6 9.4 18.8 20 20-10.6 1.2-18.8 9.4-20 20C18.8 29.4 10.6 21.2 0 20 10.6 18.8 18.8 10.6 20 0Z"/></svg>',
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" width="16" height="16"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    # industry icons
    "i-heart": '<svg class="ind__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M20 34S5 25.5 5 15a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 10.5-15 19-15 19Z"/></svg>',
    "i-bolt": '<svg class="ind__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M22 3 7 23h12l-2 14 16-21H21l1-13Z"/></svg>',
    "i-wheel": '<svg class="ind__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="4"/><path d="M20 5v11M20 24v11M5 20h11M24 20h11"/></svg>',
    "i-move": '<svg class="ind__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="22" cy="7" r="3"/><path d="M12 36l5-10 5 4v6M17 26l2-11 6 4 6-2M19 15l-6 3-3 6"/></svg>',
    "i-box": '<svg class="ind__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12 20 5l15 7v16l-15 7-15-7V12Z"/><path d="M5 12l15 7 15-7M20 19v16"/></svg>',
    "i-ball": '<svg class="ind__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="20" cy="20" r="15"/><path d="m20 13 6.5 4.7-2.5 7.6h-8l-2.5-7.6L20 13ZM20 5v8M33 15l-6.5 2.7M28 32l-4-6.7M12 32l4-6.7M7 15l6.5 2.7"/></svg>',
}

NAV = [
    ("work", "work.html", "Films"),
    ("services", "services.html", "Services"),
    ("weddings", "weddings.html", "Weddings"),
    ("stills", "photography.html", "Stills"),
    ("about", "about.html", "Studio"),
    ("contact", "contact.html", "Contact"),
]


def nav_html(active):
    out = []
    for key, href, label in NAV:
        cur = ' aria-current="page"' if key == active else ""
        out.append(f'<a href="{href}"{cur}>{label}</a>')
    return "\n        ".join(out)


def sheet_html():
    rows = [("index.html", "Home")] + [(h, l) for _, h, l in NAV]
    return "\n      ".join(f'<a href="{h}">{l}<span>{i:02d}</span></a>' for i, (h, l) in enumerate(rows, 1))


DEFAULT_CTA = "Let’s make something <em>worth watching.</em>"


_SIZES = {}


def add_img_dimensions(html):
    """Give every local <img> intrinsic width/height so lazy loading never shifts layout."""
    from PIL import Image

    def fix(m):
        tag = m.group(0)
        if " width=" in tag:
            return tag
        src = re.search(r'src="(assets/img/[^"]+)"', tag)
        if not src:
            return tag
        path = ROOT / src.group(1)
        if path not in _SIZES:
            try:
                _SIZES[path] = Image.open(path).size
            except OSError:
                return tag
        w, h = _SIZES[path]
        extra = f' width="{w}" height="{h}"'
        # Pair full-size and -sm variants into a srcset so phones never download 1800px images.
        rel = src.group(1)
        if "srcset=" not in tag and "data-src=" not in tag and rel.endswith(".webp"):
            base = rel[:-8] if rel.endswith("-sm.webp") else rel[:-5]
            sm, full = ROOT / f"{base}-sm.webp", ROOT / f"{base}.webp"
            if sm.exists() and full.exists():
                sw = Image.open(sm).size[0]
                fw = Image.open(full).size[0]
                extra += f' srcset="{base}-sm.webp {sw}w, {base}.webp {fw}w"'
                if "sizes=" not in tag:
                    extra += ' sizes="(max-width: 640px) 100vw, (max-width: 1100px) 70vw, 50vw"'
        return tag[:-1].rstrip("/").rstrip() + extra + ">"

    return re.sub(r"<img\b[^>]*>", fix, html)


def asset_versions(html):
    """Stamp local CSS/JS URLs with a content hash, so a browser never pairs new HTML with a cached old script."""
    def stamp(m):
        path = ROOT / m.group(2)
        if not path.exists():
            return m.group(0)
        v = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
        return f'{m.group(1)}{m.group(2)}?v={v}"'
    return re.sub(r'((?:href|src)=")(assets/(?:css|js)/[\w.-]+\.(?:css|js))"', stamp, html)


def expand_icons(html):
    return re.sub(r"\{\{icon:([\w-]+)\}\}", lambda m: ICONS[m.group(1)], html)


def build():
    import sys
    sys.path.insert(0, str(SRC))
    import cases
    cases.generate(SRC / "pages")
    partials = {p.stem: p.read_text() for p in (SRC / "partials").glob("*.html")}
    pages = sorted((SRC / "pages").glob("*.html"))
    sitemap = []
    for page in pages:
        raw = page.read_text()
        m = re.match(r"\s*<!--meta (.*?)-->\s*", raw, re.S)
        meta = json.loads(m.group(1)) if m else {}
        body = raw[m.end():] if m else raw
        slug = page.name
        canonical = f"{SITE_URL}/{'' if slug == 'index.html' else slug}"
        ctx = {
            "title": meta.get("title", "ASB Media Group"),
            "desc": meta.get("desc", ""),
            "og": og_image(meta.get("og", "assets/img/film-funbike.webp")),
            "canonical": canonical,
            "nav": nav_html(meta.get("nav")),
            "schema": meta.get("schema", ""),
            "sheet": sheet_html(),
            "cta": meta.get("cta", DEFAULT_CTA),
            "bodyclass": meta.get("bodyclass", ""),
        }
        layout = meta.get("layout")
        header = partials.get(f"header_{layout}", partials["header"]) if layout else partials["header"]
        footer = partials.get(f"footer_{layout}", partials["footer"]) if layout else partials["footer"]
        ctx["css"] = f"{layout}.css" if layout else "styles.css"
        # Studio pages fetch their scripts from the <head> at high priority (defer keeps them non-blocking),
        # so the opening sequence never waits behind the page's images on a slow connection.
        ctx["headscripts"] = (
            '<script src="assets/js/main.js" defer fetchpriority="high"></script>\n'
            '  <script src="assets/js/studio.js" defer fetchpriority="high"></script>'
        ) if layout == "studio" else ""
        ctx["site"] = SITE_URL   # last, so {{site}} inside inserted values (e.g. a page's schema) is filled too
        body = body.replace("{{devices:services}}", cases.services_devices().lstrip())
        html = partials["head"] + header + body + footer
        for k, v in ctx.items():
            html = html.replace("{{" + k + "}}", v)
        html = asset_versions(add_img_dimensions(expand_icons(html)))
        (ROOT / slug).write_text(html)
        if not meta.get("noindex"):
            sitemap.append(canonical)
        print("built", slug)
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    urls = "\n".join(f"  <url><loc>{u}</loc></url>" for u in sitemap)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n'
    )


if __name__ == "__main__":
    build()
