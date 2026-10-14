"""Rewrite the single quoted line in README.md between the quote markers.

GitHub strips JavaScript from READMEs, so a rotating quote has to be produced by a
scheduled job rather than in the page.
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import date
from pathlib import Path

START = "<!-- quote:start -->"
END = "<!-- quote:end -->"

QUOTES = [
    "Simplicity is prerequisite for reliability. — Edsger Dijkstra",
    "Programs must be written for people to read. — Harold Abelson",
    "The most damaging phrase in the language is 'we've always done it this way'. — Grace Hopper",
    "Premature optimization is the root of all evil. — Donald Knuth",
    "Make it work, make it right, make it fast. — Kent Beck",
    "Talk is cheap. Show me the code. — Linus Torvalds",
    "Testing shows the presence, not the absence of bugs. — Edsger Dijkstra",
    "The best way to predict the future is to invent it. — Alan Kay",
    "First, solve the problem. Then, write the code. — John Johnson",
    "Any sufficiently advanced technology is indistinguishable from magic. — Arthur C. Clarke",
    "It always seems impossible until it's done. — Nelson Mandela",
    "It's all in the MIND. — Dhruv Bhadhotiya",
]


def pick(quotes: list[str], seed: int | None = None) -> str:
    """Return one quote. `seed` makes the choice reproducible, which keeps the
    scheduled job from rewriting the README when nothing actually changed."""
    if not quotes:
        raise ValueError("quotes must not be empty")
    return random.Random(seed).choice(quotes)


def replace_block(
    text: str,
    quote: str,
    start: str = START,
    end: str = END,
) -> str:
    """Replace the text between `start` and `end` with `quote`.

    Raises ValueError if either marker is missing or they appear out of order, so a
    malformed README fails the job loudly instead of being silently rewritten wrong.

    Two details keep the rewrite non-destructive to everything around the block. The
    line prefix of each marker is carried onto the lines this replaces, so a marker
    nested in markdown (the README keeps the quote in a '> ' blockquote) keeps its
    prefix instead of the rewritten line escaping the construct. And the document's
    own newline is reused, so a CRLF README does not come back with a few bare-LF
    lines spliced into it.
    """
    if "\n" in quote or "\r" in quote:
        raise ValueError("quote must be a single line")

    i = text.find(start)
    if i == -1:
        raise ValueError(f"missing quote marker {start!r} in README")
    j = text.find(end, i)
    if j == -1:
        raise ValueError(f"missing quote marker {end!r} after {start!r} in README")

    prefix = text[text.rfind("\n", 0, i) + 1 : i]
    end_prefix = text[text.rfind("\n", 0, j) + 1 : j]
    nl = "\r\n" if "\r\n" in text else "\n"

    return text[: i + len(start)] + nl + prefix + quote + nl + end_prefix + text[j:]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--readme", type=Path, default=Path("README.md"))
    ap.add_argument("--seed", type=int, default=None,
                    help="omit for a random quote; pass day-of-epoch for stability")
    args = ap.parse_args(argv)

    seed = args.seed
    if seed is None:
        seed = date.today().toordinal()

    original = args.readme.read_text(encoding="utf-8")
    updated = replace_block(original, pick(QUOTES, seed=seed))

    if updated == original:
        print("quote unchanged; nothing to write")
        return 0

    args.readme.write_text(updated, encoding="utf-8")
    print("updated quote")
    return 0


if __name__ == "__main__":
    sys.exit(main())