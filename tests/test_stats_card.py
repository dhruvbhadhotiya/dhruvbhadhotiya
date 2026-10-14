import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from stats_card import build_rows, pick_repos, render_svg
from theme import DARK, LIGHT

PROFILE = {
    "name": "Dhruv Bhadhotiya",
    "login": "dhruvbhadhotiya",
    "created_at": "2024-11-03T03:00:09Z",
    "public_repos": 31,
    "followers": 7,
}

REPOS = [
    {"name": "OwnSquare", "language": "JavaScript", "pushed_at": "2026-10-01T20:24:14Z",
     "fork": False, "stargazers_count": 0},
    {"name": "NOVA", "language": "JavaScript", "pushed_at": "2025-07-12T11:51:32Z",
     "fork": False, "stargazers_count": 0},
    {"name": "gh-pages", "language": None, "pushed_at": "2026-10-13T08:48:48Z",
     "fork": False, "stargazers_count": 0},
    {"name": "mirror", "language": "Python", "pushed_at": "2026-01-01T00:00:00Z",
     "fork": True, "stargazers_count": 0},
]


# ---------- pick_repos ----------

def test_pick_repos_excludes_forks():
    names = [r["name"] for r in pick_repos(REPOS, limit=4)]
    assert "mirror" not in names


def test_pick_repos_excludes_repos_with_no_language():
    # The card prints a language column; a repo with none would render an empty column.
    assert "gh-pages" not in [r["name"] for r in pick_repos(REPOS, limit=4)]


def test_pick_repos_respects_limit():
    assert len(pick_repos(REPOS, limit=1)) == 1


def test_pick_repos_never_returns_more_than_available():
    assert len(pick_repos(REPOS[:1], limit=4)) == 1


def test_pick_repos_handles_empty_input():
    assert pick_repos([], limit=4) == []


def test_pick_repos_excludes_the_profile_repo():
    # The repo named after the user is the profile README itself, not a project.
    repos = [{"name": "dhruvbhadhotiya", "language": "Python", "fork": False,
              "pushed_at": "2026-10-13T00:00:00Z", "stargazers_count": 0}]
    assert pick_repos(repos, limit=4, login="dhruvbhadhotiya") == []


def test_pick_repos_leads_with_pinned_repos():
    # A quiet project must not fall off the card just because it stopped being pushed.
    picked = pick_repos(REPOS, limit=2, login="x", pinned=("NOVA",))
    assert picked[0]["name"] == "NOVA"


def test_pick_repos_skips_pinned_names_that_no_longer_exist():
    picked = pick_repos(REPOS, limit=4, login="x", pinned=("deleted-repo",))
    assert all(r["name"] != "deleted-repo" for r in picked)


def test_pick_repos_tolerates_pinned_defaulting_to_empty():
    picked = pick_repos(REPOS, limit=1, login="x", pinned=())
    assert len(picked) == 1


def test_pick_repos_keeps_a_pinned_repo_that_has_no_language():
    # payora has never had a language set on GitHub, but it is a featured project.
    repos = [{"name": "payora", "language": None, "fork": False,
              "pushed_at": "2026-03-20T00:00:00Z", "stargazers_count": 0}]
    assert [r["name"] for r in pick_repos(repos, limit=4, login="x", pinned=("payora",))] == ["payora"]


def test_pick_repos_still_drops_unpinned_repos_with_no_language():
    picked = pick_repos(REPOS, limit=4, login="x", pinned=())
    assert "gh-pages" not in [r["name"] for r in picked]


def test_render_svg_preserves_whitespace_so_columns_align():
    # SVG collapses runs of spaces unless xml:space="preserve" is set, which would run
    # the name and language columns together.
    svg = render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4, login="x", pinned=())))
    assert 'xml:space="preserve"' in svg


# ---------- build_rows ----------

def test_build_rows_starts_with_whoami():
    rows = build_rows(PROFILE, pick_repos(REPOS, limit=4))
    assert rows[0][0].startswith("$ whoami")


def test_build_rows_contains_the_display_name():
    rows = build_rows(PROFILE, pick_repos(REPOS, limit=4))
    assert any("Dhruv Bhadhotiya" in r[0] for r in rows)


def test_build_rows_reports_repo_and_follower_counts():
    rows = build_rows(PROFILE, pick_repos(REPOS, limit=4))
    text = " ".join(r[0] for r in rows)
    assert "31" in text and "7" in text


def test_build_rows_shows_membership_year_from_created_at():
    rows = build_rows(PROFILE, pick_repos(REPOS, limit=4))
    assert any("2024" in r[0] for r in rows)


def test_build_rows_lists_every_selected_repo():
    repos = pick_repos(REPOS, limit=4)
    rows = build_rows(PROFILE, repos)
    for repo in repos:
        assert any(repo["name"] in r[0] for r in rows)


def test_build_rows_has_no_whitespace_only_rows():
    # Empty strings are legitimate -- they are the blank lines that group the card into
    # sections. What must never appear is a row of spaces, which would render as
    # phantom leading space and break the typing reveal.
    rows = build_rows(PROFILE, pick_repos(REPOS, limit=4))
    assert all(r[0] == r[0].strip() for r in rows)


def test_build_rows_falls_back_to_login_when_name_is_missing():
    rows = build_rows({**PROFILE, "name": None}, pick_repos(REPOS, limit=4))
    assert any("dhruvbhadhotiya" in r[0] for r in rows)


def test_build_rows_survives_a_profile_with_no_repos():
    rows = build_rows(PROFILE, [])
    assert all(r[0] == r[0].strip() for r in rows)
    assert rows[0][0].startswith("$ whoami")
    assert any("$ gh repo list" in r[0] for r in rows)


# ---------- render_svg ----------

def test_render_svg_is_well_formed():
    import xml.etree.ElementTree as ET

    ET.fromstring(render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4))))


def test_render_svg_has_viewbox_and_full_width():
    svg = render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4)))
    assert "viewBox=" in svg and 'width="100%"' in svg


def test_render_svg_is_themed_and_light_mode_aware():
    svg = render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4)))
    assert DARK["bg"] in svg and LIGHT["bg"] in svg
    assert "prefers-color-scheme: light" in svg


def test_render_svg_animates_and_respects_reduced_motion():
    svg = render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4)))
    assert "@keyframes type" in svg
    assert "prefers-reduced-motion" in svg


def test_render_svg_has_one_clip_per_non_empty_row():
    import re

    rows = build_rows(PROFILE, pick_repos(REPOS, limit=4))
    svg = render_svg(rows)
    expected = sum(1 for text, _ in rows if text)
    assert len(re.findall(r"<clipPath", svg)) == expected


def test_render_svg_escapes_markup_in_repo_names():
    svg = render_svg(build_rows(
        PROFILE, [{"name": "<evil>", "language": "X", "pushed_at": "2026-01-01T00:00:00Z",
                   "fork": False, "stargazers_count": 0}]))
    assert "<evil>" not in svg
    assert "&lt;evil&gt;" in svg


def test_render_svg_contains_no_script_or_external_refs():
    svg = render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4)))
    assert "<script" not in svg
    assert "url(http" not in svg
    assert "@import" not in svg


def test_row_text_fits_inside_the_viewbox():
    # Guards the D-class defect class: text wider than the viewBox silently clips.
    svg = render_svg(build_rows(PROFILE, pick_repos(REPOS, limit=4)))
    vw = float(svg.split('viewBox="0 0 ')[1].split(" ")[0])
    import re

    for m in re.finditer(r'<text x="([\d.]+)"[^>]*>([^<]*)</text>', svg):
        end = float(m.group(1)) + len(m.group(2)) * FONT_SIZE * 0.6
        assert end <= vw - 8, f"overflows: {m.group(2)!r} ends at {end:.1f} > {vw}"


from stats_card import FONT_SIZE  # noqa: E402  (used by the fit assertion above)