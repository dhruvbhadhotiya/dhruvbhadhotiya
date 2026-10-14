import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from ascii_avatar import RAMP, render_svg, to_ascii


def test_to_ascii_returns_requested_width():
    img = Image.new("RGB", (200, 200), (128, 128, 128))
    rows = to_ascii(img, cols=56)
    assert all(len(r) == 56 for r in rows)
    assert len(rows) > 0


def test_to_ascii_white_image_maps_to_dense_end_of_ramp():
    img = Image.new("RGB", (64, 64), (255, 255, 255))
    rows = to_ascii(img, cols=16)
    assert set(rows[0]) <= set(RAMP)


def test_to_ascii_black_image_maps_to_sparse_end_of_ramp():
    img = Image.new("RGB", (64, 64), (0, 0, 0))
    rows = to_ascii(img, cols=16)
    assert set(rows[0]) <= set(RAMP)


def test_render_svg_is_well_formed_and_themed():
    import xml.etree.ElementTree as ET

    rows = ["@@", "@@"]
    svg = render_svg(rows)
    ET.fromstring(svg)
    assert "prefers-color-scheme: light" in svg
    assert "#ffb000" in svg
    assert "#fdf6e3" in svg


def test_render_svg_has_no_script_or_external_refs():
    svg = render_svg(["@@"])
    assert "<script" not in svg
    assert "http" not in svg.replace('xmlns="http://www.w3.org/2000/svg"', "")


def test_to_ascii_rejects_zero_columns():
    img = Image.new("RGB", (10, 10))
    with pytest.raises(ValueError):
        to_ascii(img, cols=0)