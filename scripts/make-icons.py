#!/usr/bin/env python3
"""Generate the app icon set from the cone brand mark (pure PIL, no SVG tools).

Draws a minimalist traffic cone: amber vertical gradient body, two dark
stripes, rounded base bar. Outputs Tauri's expected icon set.
"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons")
os.makedirs(OUT, exist_ok=True)

TOP = (255, 179, 0)     # #FFB300
BOTTOM = (242, 106, 0)  # #F26A00
DARK = (18, 18, 20)
BASE = (255, 122, 0)    # #FF7A00

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def draw_cone(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 1024.0
    cx = 512 * s
    top_y, bot_y = int(70 * s), int(830 * s)

    def half_w(y):
        t = (y - top_y) / max(1, bot_y - top_y)
        return (30 + t * 340) * s

    # Body: vertical gradient, row by row.
    for y in range(top_y, bot_y):
        t = (y - top_y) / max(1, bot_y - top_y)
        hw = half_w(y)
        d.line([(cx - hw, y), (cx + hw, y)], fill=lerp(TOP, BOTTOM, t) + (255,))

    # Dark stripes (two bands).
    for (y0, y1, alpha) in [(400, 470, 150), (560, 650, 200)]:
        y0, y1 = int(y0 * s), int(y1 * s)
        pts = []
        for y in (y0, y1):
            hw = half_w(y)
            pts.append((cx - hw, y))
        for y in (y1, y0):
            hw = half_w(y)
            pts.append((cx + hw, y))
        d.polygon(pts, fill=DARK + (alpha,))

    # Highlight edge.
    d.line([(cx - half_w(top_y), top_y), (cx - half_w(bot_y), bot_y)],
           fill=(255, 255, 255, 60), width=max(2, int(14 * s)))

    # Base bar.
    bx0, by0 = int(110 * s), int(845 * s)
    bx1, by1 = int(914 * s), int(950 * s)
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=int(40 * s), fill=BASE + (255,))
    return img

master = draw_cone(1024)
for name, px in [("32x32.png", 32), ("128x128.png", 128), ("128x128@2x.png", 256)]:
    master.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name))
master.resize((256, 256), Image.LANCZOS).save(
    os.path.join(OUT, "icon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)
master.save(os.path.join(OUT, "icon.icns"))
print("icons written to", OUT, sorted(os.listdir(OUT)))
