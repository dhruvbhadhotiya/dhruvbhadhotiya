# AETHER profile — architecture (v2)

See `DESIGN.md` for the visual system. This file documents structure and ownership.

## What this is
A generated GitHub profile README for `dhruvbhadhotiya`. All content lives in
`data/profile.json`; all artwork is generated as theme-aware SVGs. No game, no npm
dependencies, no runtime APIs — the daily workflow regenerates everything.

## Layout
```
data/profile.json      personal content (edit this)
data/stats.json        live numbers (written by fetch-stats.mjs)
scripts/fetch-stats.mjs       pulls public GitHub/LeetCode numbers (best-effort)
scripts/generate-assets.mjs   draws all SVGs from data (AETHER design system)
scripts/generate-readme.mjs   writes README.md from data
.github/workflows/refresh-profile.yml   daily regeneration + commit
assets/**              56 generated SVGs (28 bases x light/dark)
README.md              generated profile page (do not hand-edit)
```

## Generated SVG manifest (each base -> `<base>-light.svg` / `<base>-dark.svg`)
- `hero.svg`, `footer.svg`
- 9 headers: `header-{about,now,work,toolbox,milestones,contributions,problem-solving,activity,contact}.svg`
- 6 buttons: `button-{github,linkedin,youtube,leetcode,x,email}.svg`
- 4 info cards: `card-{about,now,toolbox,milestones}.svg`
- 4 project cards: `project-{1..4}.svg`
- 3 live cards: `live-{github,leetcode,activity}.svg`

No tic-tac-toe tiles, no game engine.

## README marker blocks
- `<!-- BEGIN:live --> ... <!-- END:live -->` — sections 06–08 (live stat cards)
- `<!-- BEGIN:activity --> ... <!-- END:activity -->` — markdown activity list

`npm run build` = `stats` → `assets` → `readme`. All generators are idempotent and
dependency-free (Node 20+ ESM). Every interpolated value is escaped.
