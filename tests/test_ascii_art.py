import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from ascii_art import GLYPHS, render, to_svg_tspans


def test_every_glyph_has_uniform_width():
    for char, rows in GLYPHS.items():
        widths = {len(r) for r in rows}
        assert len(widths) == 1, f"glyph {char!r} has ragged rows: {widths}"


def test_glyphs_are_uniform_width():
    # Uniform width is what makes composition exact. Leading and trailing whitespace
    # are both legitimate -- leading positions the glyph, trailing pads it to width,
    # and the final row is blank for letters without descenders (FIGlet convention).
    for char, rows in GLYPHS.items():
        widths = {len(r) for r in rows}
        assert len(widths) == 1, f"glyph {char!r} has ragged rows: {widths}"
        assert all(r for r in rows), f"glyph {char!r} has an empty row string"


def test_render_is_rectangular():
    lines = render("DHRUV")
    widths = {len(line) for line in lines}
    assert len(widths) == 1, f"ragged render: {widths}"


def test_render_is_blank_for_empty_text():
    assert render("") == []


def test_render_rejects_unknown_characters():
    try:
        render("DHR@V")
    except KeyError as exc:
        assert "@" in str(exc)
    else:
        raise AssertionError("expected KeyError for unsupported character")


def test_tspans_are_valid_xml():
    # Regression guard, and the only check worth having here. The FIGlet 'R' contains a
    # literal '<', which makes an SVG document invalid and causes browsers to render
    # nothing at all rather than surfacing an error.
    import xml.etree.ElementTree as ET

    payload = to_svg_tspans("DHRUV")
    root = ET.fromstring(f'<svg xmlns="http://www.w3.org/2000/svg">{payload}</svg>')
    assert len(list(root)) == 6
    # The R arm must arrive as an escaped entity, not a raw '<'.
    assert "&lt;" in payload