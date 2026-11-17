# AETHER — design system (v2, replaces ORBIT)

Goal: replace the generic "AI slop" glow-console look with a refined, editorial,
graphics-rich profile. Aadi's repo and the earlier ORBIT build are references only.

## Research-backed decisions (2026)
- Tinted near-black canvas, NEVER pure black (halation / eye strain).
- Layered surfaces (canvas → surface → raised) create depth, not shadows alone.
- ONE accent family (violet→cyan) with a single lime "signal" color. Restraint wins.
- Mesh gradients / aurora blurs used as ambient LIGHTING, not as card fills.
- WCAG AA: >= 4.5:1 normal text, >= 3:1 large text/graphics.
- 60-30-10: 60% neutral canvas, 30% surfaces, 10% accent.
- Distinct composition per section — do not repeat one card template 10 times.

## Anti-slop rules
- NO concentric orbit rings, NO dot grids, NO "DEV CONSOLE" mono kickers.
- NO identical left-accent-bar + title + rule on every card.
- NO rainbow of neon colors. Accent is violet/cyan only; lime is a tiny signal dot.
- Use large translucent outline numerals, asymmetric layout, fine diagonal hatch,
  editorial serif display type, layered gradient fields, and real chart geometry.

## Palette (implement as a `theme(mode)` object)

DARK:
  canvas #0A0E1A | canvasDeep #070A13 | surface #131A2A | raised #1A2336
  border #2A3550 | ink #F1F5F9 | muted #94A3B8
  violet #8B5CF6 | cyan #06B6D4 | cyanText #67E8F9 | lime #A3E635 | warm #FB7185

LIGHT:
  canvas #F5F7FA | canvasDeep #EAEFF5 | surface #FFFFFF | raised #F0F4F9
  border #D5DEEA | ink #0F172A | muted #5B6B80
  violet #6D28D9 | cyan #0E7490 | cyanText #0E7490 | lime #4D7C0F | warm #E11D48

Fonts (no embedding): display = `Georgia, "Iowan Old Style", "Times New Roman", serif`;
body = `Inter, system-ui, -apple-system, sans-serif`; mono = `ui-monospace, SFMono-Regular, Consolas, monospace`.
Important: in double-quoted XML attributes, font names with spaces MUST use single quotes
(e.g. font-family="Georgia, 'Iowan Old Style', serif") — never nested double quotes.

## SVG output manifest (each base -> `<base>-light.svg` and `<base>-dark.svg`)
- `assets/hero.svg` (1200x470) — mesh glow top-right, huge serif name on 2 lines, role in mono, thin hairline footer with coordinates + status pill. Unique, not a console.
- `assets/footer.svg` (1200x150) — wide gradient ribbon + small diamond sigil + footer text.
- headers (1200x96): `header-about`, `header-now`, `header-work`, `header-toolbox`,
  `header-milestones`, `header-contributions`, `header-problem-solving`,
  `header-activity`, `header-contact`.
  New recipe: giant translucent OUTLINE index numeral (01..09) on the right, title in serif
  on the left, short mono kicker under it, a 2px gradient rule (violet->cyan) that varies in length.
- buttons (200x56): `button-github`, `button-linkedin`, `button-youtube`, `button-leetcode`,
  `button-x`, `button-email`. Pill with a tiny gradient dot + label; no boxes with left bars.
- cards (1200 wide): `card-about`, `card-now`, `card-toolbox`, `card-milestones`.
  - about: large monogram in a soft gradient circle + bio lines + facts as a 4-col baseline row.
  - now: a horizontal "signal strip" with 3 columns (BUILDING / LEARNING / LISTENING),
    a thin activity sparkline, and a status dot — dashboard-like but calm.
  - toolbox: skill chips arranged in 4 columns with hairline dividers, no boxes.
  - milestones: vertical timeline with gradient spine and alternating dot sizes.
- project cards (580x290): `project-1`..`project-4`. Large ghost index number,
  a diagonal gradient sheen in one corner, name in serif, wrapped desc, tag chips, metric.
- live stat cards (1200x320): `live-github`, `live-leetcode`, `live-activity`.
  - github: 4 radial gauges (followers, repos, stars, contributions) with gradient strokes + center numbers.
  - leetcode: big solved number + a stacked ring (easy/medium/hard) + rank + streak.
  - activity: 6 rows with date in mono, a gradient tick, and text.
- NO tic-tac-toe tiles. NO `header-play`.

Every SVG root: xmlns, viewBox, width, height, role="img", aria-label, `<title>`.
Use unique `<defs>` id prefixes per asset (e.g. `hero-grad`, `hdr-grad`) to avoid collisions.
Data-driven from `data/profile.json` and `data/stats.json`; dependency-free Node ESM; idempotent.

## README sections (no game, no ttt marker)
01 About, 02 Now, 03 Selected work, 04 Toolbox, 05 Experience & achievements,
06 GitHub contributions, 07 Problem solving, 08 Recent activity, 09 Contact.
Keep markers `<!-- BEGIN:live --> ... <!-- END:live -->` (sections 06-08) and
`<!-- BEGIN:activity --> ... <!-- END:activity -->` (markdown list in section 08).
Remove the `<!-- BEGIN:ttt -->` block entirely and all game references.

## File ownership
- Assets agent: `scripts/generate-assets.mjs` + all `assets/**` (delete old ttt tiles + play header).
- Automation agent: `scripts/generate-readme.mjs` only.
- Orchestrator: docs (`ARCHITECTURE.md`, `CUSTOMIZE.md`, `NOTICE.md`, `DESIGN.md`),
  deletion of `game/`, `data/ttt.json`, `.github/workflows/tic-tac-toe.yml`,
  `package.json` cleanup, final build + push.
