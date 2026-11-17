# Customize your ORBIT profile

Almost everything you want to change lives in **one file**: `data/profile.json`.
Edit it, then regenerate with:

```bash
npm run build
```

That runs (in order): `fetch-stats` → `generate-assets` → `generate-readme`.

## What each file does

| File | Purpose |
|---|---|
| `data/profile.json` | **Your content.** Name, bio, links, projects, skills, milestones, activity. Edit this. |
| `data/stats.json` | Numbers for the live stat cards. Usually written by `fetch-stats.mjs`; you can hand-edit the placeholders. |
| `data/ttt.json` | Live game state (board, score, recent games). Owned by the game; don't hand-edit unless you want to reset. |
| `scripts/generate-assets.mjs` | Draws every SVG from your data. You rarely need to touch it. |
| `scripts/generate-readme.mjs` | Writes `README.md` from your data + the game engine. |
| `scripts/fetch-stats.mjs` | Pulls public GitHub/LeetCode numbers. Safe to run with no token. |
| `game/engine.mjs` | Pure tic-tac-toe logic + minimax AI + board rendering. |
| `game/play.mjs` | Handles one `ttt|...` issue, applies a move, updates README/state. |
| `.github/workflows/tic-tac-toe.yml` | Plays the AI's reply when someone opens a game issue. |
| `.github/workflows/refresh-profile.yml` | Daily refresh of stats, art and README. |

## Change your content

Open `data/profile.json`. Every string is a placeholder written for you to replace:

- `hero` — name, role, tagline, status pill, coordinates.
- `socials` — the buttons. Add/remove entries with `key`, `label`, `url`.
  Supported button keys: `github`, `linkedin`, `youtube`, `leetcode`, `x`, `email`.
- `about` — `lines` (bio paragraphs) and `facts` (key/value grid).
- `now` — what you're building / learning / listening to.
- `projects` — up to 4 cards (`name`, `desc`, `tags`, `metric`, `url`).
- `toolbox` — groups of skill chips.
- `milestones` — timeline entries.
- `activity` — the recent-activity feed shown on the profile and in the generated README.
- `footer` and `profileViewsId`.

## Change the look

Edit the theme object at the top of `scripts/generate-assets.mjs` (colors) and re-run
`node scripts/generate-assets.mjs`. Add a new header/card by extending the manifest loops there.

## The tic-tac-toe game

Visitors click an empty square on the rendered profile. That opens a pre-filled issue
(`ttt|move|<0-8>`). The `tic-tac-toe` GitHub Action runs `game/play.mjs`, applies the
human move plus the AI's minimax reply, rewrites the `<!-- BEGIN:ttt -->` block in
`README.md`, updates `data/ttt.json`, and comments on + closes the issue.

- To start over manually, replace `data/ttt.json` with a fresh game (see `newGame`).
- The AI plays `O` and never loses with perfect play.

## Requirements

- Node 20+ (ESM, `.mjs`). No npm dependencies.
- GitHub Actions need `contents: write` and `issues: write` (already configured).

## License

MIT — see `LICENSE` and `NOTICE.md`.
