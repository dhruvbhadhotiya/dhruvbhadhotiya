"""Generate the live terminal identity card as a self-contained animated SVG.

Replaces yogeshwaran01/github-stats-terminal-style, whose Action is permanently broken:
its action.yml points at dist/src/action/index.js but the repo .gitignore's `dist`, so
the bundle exists on no ref, including the v1.0.0 tag.

Data comes from the public GitHub REST API. Uses stdlib only -- no third-party client.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from theme import FONT, esc, root_block

API = "https://api.github.com"
FONT_SIZE = 13.0
CELL_W = FONT_SIZE * 0.6  # Courier New advance is 0.6em
LINE_H = 20.0
PAD_X = 20.0
TOP = 66.0  # below the 42px title bar
CHROME_H = 42.0
VIEW_W = 660.0
REPO_LIMIT = 4

# Kept in step with the featured set in README.md, so the card and the page agree.
PINNED = ("OwnSquare", "NOVA", "payora", "WebJava")

# Not available from the GitHub API; kept here so there is one place to edit.
ROLE = "B.Tech · full-stack + deep learning"


def _get(path: str, token: str | None) -> dict | list:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "profile-assets"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def pick_repos(
    repos: list[dict],
    limit: int = REPO_LIMIT,
    login: str | None = None,
    pinned: tuple[str, ...] = PINNED,
) -> list[dict]:
    """Featured repos, newest activity first.

    Forks are dropped because they are somebody else's work, and repos with no language
    are dropped because the card prints a language column. The repo named after the user
    is the profile README repo itself -- never a project.

    `pinned` repos lead the list so the card stays consistent with the featured set in
    README.md; a project does not fall off the card merely because it went quiet.
    """
    candidates = [
        r
        for r in repos
        if not r.get("fork") and r.get("name") != login
    ]
    # A repo with no language still earns a place in the fallback list only if it is
    # pinned: the card prints a language column, and several real projects (payora, for
    # one) have never had a language set on GitHub.
    by_name = {r["name"]: r for r in candidates}
    ordered = [by_name[n] for n in pinned if n in by_name]
    rest = sorted(
        (
            r
            for r in candidates
            if r["name"] not in pinned and r.get("language")
        ),
        key=lambda r: r.get("pushed_at") or "",
        reverse=True,
    )
    return (ordered + rest)[:limit]


def _year(iso: str | None) -> str:
    return (iso or "")[:4] or "?"


def _month(iso: str | None) -> str:
    return (iso or "")[:7] or "?"


def build_rows(profile: dict, repos: list[dict]) -> list[tuple[str, str]]:
    """Build the card's lines as (text, css_class) pairs."""
    who = profile.get("name") or profile.get("login") or "unknown"
    rows: list[tuple[str, str]] = [
        ("$ whoami", "hi"),
        (esc(who), "fg"),
        (esc(ROLE), "dim"),
        (
            f"{profile.get('public_repos', 0)} public repos"
            f" · {profile.get('followers', 0)} followers"
            f" · since {_year(profile.get('created_at'))}",
            "dim",
        ),
        ("", "dim"),
        (f"$ gh repo list --limit {len(repos)}", "hi"),
    ]

    for repo in repos:
        name = repo["name"][:20].ljust(20)
        lang = (repo.get("language") or "?")[:12].ljust(12)
        stars = repo.get("stargazers_count") or 0
        tail = f"★{stars}" if stars else _month(repo.get("pushed_at"))
        rows.append((esc(f"{name}{lang}{tail}"), "dim"))

    rows.append(("", "dim"))
    rows.append(("$ exit", "hi"))
    return rows


def render_svg(rows: list[tuple[str, str]]) -> str:
    """Wrap rows in a themed SVG with a per-row typing reveal and a blinking cursor."""
    height = round(TOP + len(rows) * LINE_H + 30, 1)

    clip_defs = []
    body = []
    y = TOP
    for i, (text, css) in enumerate(rows):
        if text:
            width = round(PAD_X + len(text) * CELL_W + 4, 1)
            delay = round(0.25 + i * 0.18, 2)
            clip_defs.append(
                f'<clipPath id="r{i}"><rect class="rv" style="--w:{width}px;'
                f'animation-delay:{delay}s" x="{PAD_X}" y="{y - LINE_H + 4}" '
                f'width="{width}" height="{LINE_H}"/></clipPath>'
            )
            body.append(
                f'<g clip-path="url(#r{i})"><text x="{PAD_X}" y="{y}" '
                f'xml:space="preserve" class="{css}">{text}</text></g>'
            )
        y += LINE_H

    last = rows[-1][0] if rows else ""
    cursor_x = round(PAD_X + (len(last) + 1) * CELL_W, 1)
    cursor_y = round(TOP + (len(rows) - 1) * LINE_H + 4, 1)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {height}" '
        f'width="100%" preserveAspectRatio="xMidYMid meet" role="img" '
        f'aria-label="Live terminal card: identity and top repositories">'
        f"<style>{root_block()}"
        f".bg{{fill:var(--bg)}}.chrome{{fill:var(--chrome)}}"
        f".fg{{fill:var(--fg)}}.hi{{fill:var(--accent)}}.dim{{fill:var(--dim)}}"
        f"@keyframes type{{from{{width:0}}to{{width:var(--w)}}}}"
        f"@keyframes blink{{0%,49%{{opacity:1}}50%,100%{{opacity:0}}}}"
        f".rv{{animation:type .45s steps(22,end) both}}"
        f"#cur{{animation:blink 1.1s step-end infinite}}"
        f"@media (prefers-reduced-motion: reduce)"
        f"{{.rv{{animation:none;width:var(--w)}}#cur{{animation:none}}}}"
        f"</style><defs>{''.join(clip_defs)}</defs>"
        f'<rect class="bg" x="0" y="0" width="{VIEW_W}" height="{height}" rx="10"/>'
        f'<rect class="chrome" x="0" y="0" width="{VIEW_W}" height="{CHROME_H}" rx="10"/>'
        f'<rect class="chrome" x="0" y="{CHROME_H - 12}" width="{VIEW_W}" height="12"/>'
        f'<circle cx="24" cy="21" r="6" class="hi" opacity=".9"/>'
        f'<circle cx="44" cy="21" r="6" class="hi" opacity=".65"/>'
        f'<circle cx="64" cy="21" r="6" class="hi" opacity=".45"/>'
        f'<text x="{VIEW_W / 2}" y="26" text-anchor="middle" class="dim" '
        f'font-family="{FONT}" font-size="12">profile · live</text>'
        f'<g font-family="{FONT}" font-size="{FONT_SIZE}">{"".join(body)}</g>'
        f'<rect id="cur" x="{cursor_x}" y="{cursor_y - 11}" '
        f'width="{round(CELL_W, 1)}" height="13" class="hi"/>'
        f"</svg>"
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--user", required=True)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--token", default=None)
    ap.add_argument("--limit", type=int, default=REPO_LIMIT)
    args = ap.parse_args(argv)

    try:
        profile = _get(f"/users/{args.user}", args.token)
        repos = _get(f"/users/{args.user}/repos?per_page=100&sort=pushed", args.token)
    except urllib.error.HTTPError as exc:
        print(f"GitHub API returned {exc.code}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"could not reach GitHub API: {exc.reason}", file=sys.stderr)
        return 1

    picked = pick_repos(repos, limit=args.limit, login=args.user)
    rows = build_rows(profile, picked)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render_svg(rows), encoding="utf-8")
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())