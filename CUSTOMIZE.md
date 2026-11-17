# Customize your AETHER profile

Everything you want to change lives in **`data/profile.json`**. Edit it, then rebuild:

```bash
npm run build
```

That runs `fetch-stats.mjs` → `generate-assets.mjs` → `generate-readme.mjs`.

## Files

| File | Purpose |
|---|---|
| `data/profile.json` | **Your content** — name, links, bio, projects, skills, milestones, activity. |
| `data/stats.json` | Live numbers for stat cards (written by `fetch-stats.mjs`; safe to hand-edit). |
| `scripts/generate-assets.mjs` | Draws every SVG from your data and the AETHER design system. |
| `scripts/generate-readme.mjs` | Writes `README.md` from your data. |
| `scripts/fetch-stats.mjs` | Pulls public GitHub/LeetCode numbers (no token needed). |
| `DESIGN.md` | The visual system — palette, typography, anti-slop rules. |

## Edit your content

Open `data/profile.json`:

- `hero` — name, role, tagline, status, coordinates.
- `socials` — buttons. Keys: `github`, `linkedin`, `youtube`, `leetcode`, `x`, `email`.
- `about` — `lines` (bio) and `facts` (key/value grid).
- `now` — building / learning / listening / note.
- `projects` — up to 4 cards (`name`, `desc`, `tags`, `metric`, `url`).
- `toolbox` — groups of skill chips.
- `milestones` — experience/achievement timeline.
- `activity` — recent log (rendered as both a live card and a markdown list).
- `footer`, `profileViewsId`.

## Change the look

Edit the `theme(mode)` palette or the layout functions in `scripts/generate-assets.mjs`,
then run `node scripts/generate-assets.mjs`. `DESIGN.md` documents the current system
and the anti-slop rules — keep each section visually distinct.

## Automation

`.github/workflows/refresh-profile.yml` runs daily and on demand (`workflow_dispatch`)
to refresh stats, regenerate all art and the README, and commit changes with the bot.
It uses the built-in `GITHUB_TOKEN`; no personal token is needed.

## License

MIT — see `LICENSE` and `NOTICE.md`.
