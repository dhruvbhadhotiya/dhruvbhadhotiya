"""Render a GitHub avatar as ASCII art inside a themed, self-contained SVG.

Runs on GitHub Actions with no token: the avatar endpoint is public.
"""

from __future__ import annotations

import argparse
import io
import sys
import urllib.request
import xml.sax.saxutils as saxutils
from pathlib import Path

from PIL import Image

RAMP = "@%#*+=-:. "
BG = "#0d0b07"
FG = "#ffb000"
ACCENT = "#ffcc66"
BG_LIGHT = "#fdf6e3"
FG_LIGHT = "#8a4b00"
ACCENT_LIGHT = "#b35c00"
FONT = "'Fira Code','Courier New',Courier,monospace"
FONT_SIZE = 13.0
# Courier New advance is 0.6em. Deriving the cell from the font size keeps the viewBox
# tight against the art; hardcoding it leaves a dead band on the right.
CELL_W = FONT_SIZE * 0.6
CELL_H = FONT_SIZE * 1.23
PAD = 16.0


def to_ascii(img: Image.Image, cols: int = 88) -> list[str]:
    """Downscale `img` to `cols` characters wide and map luminance through RAMP.

    Character cells are about twice as tall as they are wide, so the target row count
    is derived from the image aspect ratio rather than fixed.
    """
    if cols <= 0:
        raise ValueError(f"cols must be positive, got {cols}")

    grey = img.convert("L")
    w, h = grey.size
    rows = max(1, int(cols * (h / w) * 0.5))
    small = grey.resize((cols, rows))

    out = []
    for y in range(rows):
        out.append(
            "".join(RAMP[min(len(RAMP) - 1, small.getpixel((x, y)) * len(RAMP) // 256)]
                    for x in range(cols))
        )
    return out


def render_svg(rows: list[str]) -> str:
    """Wrap ASCII rows in a themed SVG that flips palette via prefers-color-scheme."""
    cell_w, cell_h, pad = CELL_W, CELL_H, PAD
    cols = max((len(r) for r in rows), default=0)
    width = round(pad * 2 + cols * cell_w, 1)
    height = round(pad * 2 + len(rows) * cell_h, 1)

    tspans = "".join(
        f'<tspan x="{pad}" y="{round(pad + (i + 1) * cell_h, 1)}">{saxutils.escape(r)}</tspan>'
        for i, r in enumerate(rows)
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="100%" preserveAspectRatio="xMidYMid meet" role="img" '
        f'aria-label="GitHub avatar rendered as ASCII art">'
        f"<style>"
        f":root{{--bg:{BG};--fg:{FG};--accent:{ACCENT}}}"
        f".bg{{fill:var(--bg)}}.fg{{fill:var(--fg)}}"
        f"@media (prefers-color-scheme: light)"
        f"{{:root{{--bg:{BG_LIGHT};--fg:{FG_LIGHT};--accent:{ACCENT_LIGHT}}}}}"
        f"</style>"
        f'<rect class="bg" x="0" y="0" width="{width}" height="{height}"/>'
        f'<text font-family="{FONT}" font-size="13" class="fg" xml:space="preserve">'
        f"{tspans}</text></svg>"
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--user", required=True, help="GitHub login")
    ap.add_argument("--out", required=True, type=Path, help="output .svg path")
    # 88, not 56: rendered against the real avatar, 56 produces grey mush that is not
    # recognisably a face. 88 is the smallest width where every feature is legible at
    # the 320px display size the README uses.
    ap.add_argument("--cols", type=int, default=88)
    ap.add_argument("--size", type=int, default=460, help="avatar fetch size")
    args = ap.parse_args(argv)

    url = f"https://github.com/{args.user}.png?size={args.size}"
    req = urllib.request.Request(url, headers={"User-Agent": "ascii-avatar"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()

    img = Image.open(io.BytesIO(raw))
    img = img.convert("RGBA")
    flat = Image.new("RGBA", img.size, (0, 0, 0, 255))
    flat.alpha_composite(img)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render_svg(to_ascii(flat, cols=args.cols)), encoding="utf-8")
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())