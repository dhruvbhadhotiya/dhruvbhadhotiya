import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from quote import QUOTES, pick, replace_block

START = "<!-- quote:start -->"
END = "<!-- quote:end -->"


def test_quotes_are_non_empty_and_distinct():
    assert len(QUOTES) >= 10
    assert len(set(QUOTES)) == len(QUOTES)
    assert all(q.strip() for q in QUOTES)


def test_pick_is_deterministic_for_a_given_seed():
    assert pick(QUOTES, seed=7) == pick(QUOTES, seed=7)


def test_pick_returns_a_member():
    assert pick(QUOTES, seed=3) in QUOTES


def test_replace_block_swaps_only_the_quoted_line():
    doc = f"# Title\n\n{START}\nold quote\n{END}\n\nrest of file\n"
    out = replace_block(doc, "new quote")
    assert "new quote" in out
    assert "old quote" not in out
    assert "# Title" in out
    assert "rest of file" in out


def test_replace_block_raises_when_markers_are_missing():
    doc = "# Title\n\nno markers here\n"
    with pytest.raises(ValueError, match="quote:start"):
        replace_block(doc, "new quote")


def test_replace_block_raises_when_only_one_marker_present():
    doc = f"{START}\nold\n"
    with pytest.raises(ValueError):
        replace_block(doc, "new quote")