#!/usr/bin/env python3
"""
Link-preview images: 1200x630 JPGs (the size and format every app that shows link previews accepts;
some don't show WebP). Run after adding or changing a page's "og" image, then python3 build.py:

  python3 make_og.py

Writes assets/img/og/<name>.jpg for each image in FOCUS. build.py uses the JPG when it exists.
Needs Pillow (pip install pillow); the site build itself does not.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
IMG = ROOT / "assets" / "img"
W, H = 1200, 630

# where the subject is in each source (x, y as fractions), so the crop keeps faces in frame
FOCUS = {
    "film-funbike": (0.5, 0.3),
    "film-dance": (0.5, 0.12),
    "film-mary": (0.5, 0.35),
    "film-teco": (0.5, 0.3),
    "prod-06": (0.5, 0.5),
    "sport-08": (0.5, 0.4),
    "wed-04": (0.5, 0.3),
}


def crop_to(im, fx, fy):
    sw, sh = im.size
    scale = max(W / sw, H / sh)
    im = im.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    sw, sh = im.size
    left = min(max(0, round(fx * sw - W / 2)), sw - W)
    top = min(max(0, round(fy * sh - H / 2)), sh - H)
    return im.crop((left, top, left + W, top + H))


def main():
    out = IMG / "og"
    out.mkdir(exist_ok=True)
    for name, (fx, fy) in FOCUS.items():
        im = Image.open(IMG / f"{name}.webp").convert("RGB")
        crop_to(im, fx, fy).save(out / f"{name}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
        print("wrote", f"assets/img/og/{name}.jpg")


if __name__ == "__main__":
    main()
