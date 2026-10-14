import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from theme import DARK, LIGHT, esc, root_block


def test_both_palettes_define_the_same_keys():
    assert set(DARK) == set(LIGHT)


def test_every_colour_is_a_hex_triplet():
    for palette in (DARK, LIGHT):
        for value in palette.values():
            assert value.startswith("#") and len(value) == 7, value
            int(value[1:], 16)


def test_root_block_emits_every_custom_property():
    css = root_block()
    for key in DARK:
        assert f"--{key}:{DARK[key]};" in css
        assert f"--{key}:{LIGHT[key]};" in css


def test_root_block_has_light_mode_override():
    assert "prefers-color-scheme: light" in root_block()


def test_esc_neutralises_markup():
    assert esc("<a & b>") == "&lt;a &amp; b&gt;"


def test_esc_handles_non_strings():
    assert esc(12) == "12"