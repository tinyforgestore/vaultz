#!/usr/bin/env python3
"""
Generate assets/banner.png from three app screenshots.

Usage:
    python3 scripts/gen_banner.py

Screenshots are read from SCREENSHOTS_DIR (default: the tinyforge-site repo).
Output is written to assets/banner.png relative to the repo root.

Adjust the constants below to change sizing, layout, or text.
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT       = Path(__file__).parent.parent
SCREENSHOTS_DIR = Path.home() / "repos/tinyforge-site/public/screenshots/vaultz"
OUT_PATH        = REPO_ROOT / "assets/banner.png"

# ── Layout ────────────────────────────────────────────────────────────────────

CANVAS_W    = 1440
CANVAS_H    = 720
BG_COLOR    = "#0e0e0e"

CENTER_H    = 480   # height of the center (vault) screenshot
SIDE_H      = 400   # height of the side screenshots
SIDE_PEEK   = 170   # px of each side screenshot visible beyond the vault edge
SIDE_OFFSET = 50    # px the side screenshots are shifted down relative to center

SHADOW_BLUR    = 20
SHADOW_OPACITY = 140  # 0–255

# ── Text ──────────────────────────────────────────────────────────────────────

HEADLINE      = "Simple by design."
CAPTION_LEFT  = "Set up in seconds."
CAPTION_RIGHT = "Your vault, organized by folder."

FONT_PATH  = "/System/Library/Fonts/HelveticaNeue.ttc"
FONT_BIG   = 56
FONT_SMALL = 16

COLOR_HEADLINE = "#ffffff"
COLOR_CAPTION  = "#444444"

# ── Helpers ───────────────────────────────────────────────────────────────────

def resize_h(img: Image.Image, h: int) -> Image.Image:
    ratio = h / img.height
    return img.resize((int(img.width * ratio), h), Image.LANCZOS)


def drop_shadow(img: Image.Image, blur: int = SHADOW_BLUR, opacity: int = SHADOW_OPACITY) -> Image.Image:
    pad = 36
    w, h = img.width + pad * 2, img.height + pad * 2
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow.paste(Image.new("RGBA", img.size, (0, 0, 0, opacity)), (pad, pad))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(shadow)
    out.alpha_composite(img, (pad, pad))
    return out


def load_font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except OSError:
        return ImageFont.load_default()

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    left_img   = Image.open(SCREENSHOTS_DIR / "setup.png").convert("RGBA")
    center_img = Image.open(SCREENSHOTS_DIR / "vault.png").convert("RGBA")
    right_img  = Image.open(SCREENSHOTS_DIR / "settings.png").convert("RGBA")

    center_r = resize_h(center_img, CENTER_H)
    left_r   = resize_h(left_img,   SIDE_H)
    right_r  = resize_h(right_img,  SIDE_H)

    center_s = drop_shadow(center_r)
    left_s   = drop_shadow(left_r)
    right_s  = drop_shadow(right_r)

    shadow_pad = 36  # must match pad in drop_shadow

    # center screenshot: horizontally and vertically centered on canvas
    center_x = (CANVAS_W - center_r.width) // 2
    center_y = (CANVAS_H - center_r.height) // 2 + 30

    # side screenshots: peek out SIDE_PEEK px from behind the center
    left_x  = center_x - SIDE_PEEK
    left_y  = center_y + SIDE_OFFSET
    right_x = center_x + center_r.width - SIDE_PEEK
    right_y = center_y + SIDE_OFFSET

    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), BG_COLOR)
    canvas.alpha_composite(left_s,   (left_x   - shadow_pad, left_y))
    canvas.alpha_composite(right_s,  (right_x  - shadow_pad, right_y))
    canvas.alpha_composite(center_s, (center_x - shadow_pad, center_y))

    draw    = ImageDraw.Draw(canvas)
    f_big   = load_font(FONT_BIG)
    f_small = load_font(FONT_SMALL)

    draw.text((64, 52),              HEADLINE,      font=f_big,   fill=COLOR_HEADLINE)
    draw.text((64, CANVAS_H - 44),   CAPTION_LEFT,  font=f_small, fill=COLOR_CAPTION)
    draw.text((CANVAS_W - 340, CANVAS_H - 44), CAPTION_RIGHT, font=f_small, fill=COLOR_CAPTION)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT_PATH, quality=95)
    print(f"Saved {OUT_PATH}")


if __name__ == "__main__":
    main()
