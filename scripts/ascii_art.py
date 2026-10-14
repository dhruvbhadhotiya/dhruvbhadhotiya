"""FIGlet-standard block letter rendering for the profile header SVG.

Glyph rows are padded to a uniform width per glyph so that composing them
side by side is exact. A space glyph is one column wide, so words separate
cleanly.
"""

GLYPHS: dict[str, list[str]] = {
    "A": [
        "     _     ",
        "    / \\    ",
        "   / _ \\   ",
        "  / ___ \\  ",
        " /_/   \\_\\ ",
        "           ",
    ],
    "B": [
        " ____      ",
        "| __ )     ",
        "|  _ \\     ",
        "| |_) |    ",
        "|____/     ",
        "           ",
    ],
    "C": [
        "  ____     ",
        " / ___|    ",
        "| |        ",
        "| |___     ",
        " \\____|    ",
        "           ",
    ],
    "D": [
        " ____      ",
        "|  _ \\     ",
        "| | | |    ",
        "| |_| |    ",
        "|____/     ",
        "           ",
    ],
    "E": [
        " _____     ",
        "| ____|    ",
        "|  _|      ",
        "| |___     ",
        "|_____|    ",
        "           ",
    ],
    "F": [
        " _____     ",
        "| ____|    ",
        "|  _|      ",
        "| |        ",
        "|___|      ",
        "           ",
    ],
    "G": [
        "  ____     ",
        " / ___|    ",
        "| |  _  _  ",
        "| | | | |  ",
        " \\____|_|  ",
        "           ",
    ],
    "H": [
        " _   _     ",
        "| | | |    ",
        "| |_| |    ",
        "|  _  |    ",
        "|_| |_|    ",
        "           ",
    ],
    "I": [
        " ___       ",
        "|_ _|      ",
        " | |       ",
        " | |       ",
        "|___|      ",
        "           ",
    ],
    "J": [
        "   ___     ",
        "  | _ _    ",
        "  | | |    ",
        "  | | |    ",
        " _| |_|    ",
        "|____/     ",
    ],
    "K": [
        " _  __     ",
        "| |/ /     ",
        "|   /      ",
        "|  \\       ",
        "|_|\\_\\     ",
        "           ",
    ],
    "L": [
        " _         ",
        "| |        ",
        "| |        ",
        "| |___     ",
        "|_____|    ",
        "           ",
    ],
    "M": [
        " __  __    ",
        "|  \\/  |   ",
        "| |\\/| |   ",
        "| |  | |   ",
        "|_|  |_|   ",
        "           ",
    ],
    "N": [
        " _   _     ",
        "| \\ | |    ",
        "|  \\| |    ",
        "| |\\  |    ",
        "|_| \\_|    ",
        "           ",
    ],
    "O": [
        "  ___      ",
        " / _ \\     ",
        "| | | |    ",
        "| |_| |    ",
        " \\___/     ",
        "           ",
    ],
    "P": [
        " ____      ",
        "|  _ \\     ",
        "| |_) |    ",
        "|  __/     ",
        "|_|        ",
        "           ",
    ],
    "Q": [
        "  ___      ",
        " / _ \\     ",
        "| | | |    ",
        "| |_| |    ",
        " \\__\\_\\    ",
        "     \\     ",
    ],
    "R": [
        " ____      ",
        "|  _ \\     ",
        "| |_) |    ",
        "|  _ <     ",
        "|_| \\_\\    ",
        "           ",
    ],
    "S": [
        " ____      ",
        "/ ___|     ",
        "\\___ \\     ",
        " ___) |    ",
        "|____/     ",
        "           ",
    ],
    "T": [
        " _____     ",
        "|_   _|    ",
        "  | |      ",
        "  | |      ",
        "  |_|      ",
        "           ",
    ],
    "U": [
        " _   _     ",
        "| | | |    ",
        "| | | |    ",
        "| |_| |    ",
        " \\___/     ",
        "           ",
    ],
    "V": [
        "__     __  ",
        "\\ \\   / /  ",
        " \\ \\ / /   ",
        "  \\ V /    ",
        "   \\_/     ",
        "           ",
    ],
    "W": [
        "__        __",
        "\\ \\      / /",
        " \\ \\ /\\ / / ",
        "  \\ V  V /  ",
        "   \\_/\\_/   ",
        "            ",
    ],
    "X": [
        " ___  __   ",
        " \\  \\/ /   ",
        "  \\  /     ",
        " /  \\ \\    ",
        "/_/\\_\\ \\   ",
        "           ",
    ],
    "Y": [
        " __  __    ",
        "\\  \\/  |   ",
        " \\  / /    ",
        "  / /      ",
        " /_/       ",
        "           ",
    ],
    "Z": [
        " _____     ",
        "|__  /     ",
        "  / /      ",
        " / /__     ",
        "|_____|    ",
        "           ",
    ],
    "0": [
        "  ___      ",
        " / _ \\     ",
        "| | | |    ",
        "| |_| |    ",
        " \\___/     ",
        "           ",
    ],
    "1": [
        "   _       ",
        "  | |      ",
        "  | |      ",
        "  | |      ",
        " _| |_     ",
        "|_____|    ",
    ],
    ".": [
        "     ",
        "     ",
        "     ",
        "     ",
        " _   ",
        "|_|  ",
    ],
    "-": [
        "        ",
        "        ",
        "        ",
        " ______ ",
        "        ",
        "        ",
    ],
    " ": ["  "] * 6,
}

_TARGET_HEIGHT = max(len(rows) for rows in GLYPHS.values())


def render(text: str, font: str = "standard") -> list[str]:
    """Render `text` as a rectangular block of ASCII art.

    Every returned line has identical length. Raises KeyError naming the offending
    character if the font has no glyph for it.
    """
    if not text:
        return []

    upper = text.upper()
    for char in upper:
        if char not in GLYPHS:
            raise KeyError(f"no glyph for character {char!r} in font {font!r}")

    blocks = []
    for char in upper:
        rows = GLYPHS[char]
        width = max(len(r) for r in rows)
        rows = rows + [" " * width] * (_TARGET_HEIGHT - len(rows))
        blocks.append([r.ljust(width) for r in rows])

    total = sum(len(b[0]) for b in blocks)
    return [
        "".join(b[row] for b in blocks).ljust(total) for row in range(_TARGET_HEIGHT)
    ]


def to_svg_tspans(text: str, x: float = 20, y: float = 96, pitch: float = 19,
                  css_class: str = "glow", font_size: float = 17) -> str:
    """Render `text` as ready-to-paste SVG <tspan> rows.

    XML-escapes the art. This matters: the FIGlet glyph for R contains a literal '<'
    (the "|  _ <" arm), which makes an SVG document invalid and causes browsers to
    render nothing at all rather than showing an error.
    """
    import xml.sax.saxutils as saxutils

    return "\n".join(
        f'<tspan x="{x}" y="{round(y + pitch * i, 1)}" class="{css_class}">'
        f"{saxutils.escape(row)}</tspan>"
        for i, row in enumerate(render(text))
    )


if __name__ == "__main__":
    import sys

    args = sys.argv[1:]
    if args and args[0] == "--tspans":
        print(to_svg_tspans(" ".join(args[1:]) or "DHRUV"))
    else:
        for line in render(" ".join(args) or "DHRUV"):
            print(line)
