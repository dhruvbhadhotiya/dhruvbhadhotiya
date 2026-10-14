"""Single source of truth for the profile palette and shared SVG scaffolding.

Every generated asset imports from here, so reskinning the profile means editing this
one file rather than hunting hex values across several scripts. The two hand-built SVGs
(assets/header.svg, assets/terminal.svg) carry the same values inline in their own
<style> blocks, because they are static files with no build step; see
docs/customize.md for the full swap checklist.

Contrast note: `--dim` is tuned to clear WCAG AA (4.5:1) against BOTH `--bg` and
`--chrome`, because dim text appears on both the terminal body and its title bar.
Recompute contrast before changing it.
"""

from __future__ import annotations

import xml.sax.saxutils as saxutils

FONT = "'Fira Code','Courier New',Courier,monospace"

DARK = {
    "bg": "#0d0b07",
    "fg": "#ffb000",
    "accent": "#ffcc66",
    "dim": "#a07f35",
    "chrome": "#1a150c",
}

LIGHT = {
    "bg": "#fdf6e3",
    "fg": "#8a4b00",
    "accent": "#b35c00",
    "dim": "#8a6a42",
    "chrome": "#efe3c8",
}


def root_block(dark: dict = DARK, light: dict = LIGHT) -> str:
    """CSS `:root` custom properties plus the light-mode override."""
    def decls(p: dict) -> str:
        return "".join(f"--{k}:{v};" for k, v in p.items())

    return (
        f":root{{{decls(dark)}}}"
        f"@media (prefers-color-scheme: light){{:root{{{decls(light)}}}}}"
    )


def esc(text: object) -> str:
    """XML-escape any value for use as SVG text content."""
    return saxutils.escape(str(text))