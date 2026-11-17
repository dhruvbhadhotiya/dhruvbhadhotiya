# IRON MAN / STARK — design system (v3)

Replaces AETHER (v2). Theme: **focused, premium Iron Man — deep armor red + champagne
gold + arc-reactor cyan glow**. Two accents only (red + gold), one light source (reactor).
No violet, no green, no multi-accent "AI slop".

## Palette (implement exactly in `theme(mode)`)

DARK:
  canvas #161312 | canvasDeep #0E0C0C | surface #201A18 | raised #2A221F
  border #5A4A42 | borderStrong #7A6257 | ink #F5EFE9 | muted #B6A79E
  red #C62828 | redDeep #B71C1C | redText #FF8373
  gold #D4AF37 | goldText #F2C94C
  arcGlow #A8E6F0 | signal #56D4DD

LIGHT:
  canvas #FFFFFF | canvasDeep #F0EBE6 | surface #FBF7F3 | raised #F3EBE4
  border #B09B8F | borderStrong #9A8578 | ink #2A1E1A | muted #6E5A50
  red #C0392B | redText #A61B12
  gold #B8860B | goldText #7A5800
  arcGlow #0E7490 | signal #0E7490

Contrast (verified): dark ink 16.2:1, muted 7.9:1, redText 7.7:1, goldText 11.7:1 on canvas.
Light muted 6.5:1, redText 7.5:1, goldText 6.5:1, arcGlow 5.4:1 on canvas. All pass WCAG AA.
NEVER use raw `red` or `gold` as text on their own backgrounds — always `redText` / `goldText`.
60% neutral canvas, 30% red structural field, 10% gold + arc glow combined.

## Typography (system-safe stacks; no embedded fonts)
  display = `Space Grotesk, 'Trebuchet MS', 'Segoe UI', sans-serif`
  body    = `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`
  mono    = `'JetBrains Mono', 'SF Mono', Menlo, Consolas, 'Courier New', monospace`
CRITICAL: in double-quoted XML attributes, font names with spaces use SINGLE quotes
(e.g. font-family="Space Grotesk, 'Trebuchet MS', sans-serif"). Never nested double quotes —
this broke v1 and must not recur.

## Graphic motifs (use geometrically, no logos / helmet silhouettes / trademarks)
1. Arc-reactor rings — 2–4 concentric circles + inner hexagon + radial white→cyan core. Hero centerpiece, "powered" badge.
2. Hexagonal plating — low-opacity hex tessellation (~24–40px). Hero texture, footer, single hex as icon frame.
3. Circuit traces — orthogonal paths with 45° elbows + node dots on 8px grid, stroke 1px in border/gold. Under section headers, along project-card edges.
4. Suit panel lines — thin borderStrong seams with a single gold "rivet" dot at joins. Card corners, dividers.
5. Repulsor glow — small cyan radial disc with 1px bright core. Center of stat gauges, active dot, one button bloom.
6. Abstract eye-slits — two narrow angled trapezoids in gold/arcGlow. Tiny hero eyebrow mark only, keep abstract.
7. Anisotropic red field — deep red with diagonal specular sheen (low-opacity 120–135° linear gradient). Hero banner, headers, project top band. Never flat solid red.
8. HUD corner brackets + mono ticks — L-brackets + mono labels (SYS.01, BUILD 2026). Frame project cards and stat gauges.

## Avoid rules
1. No pure #FF0000 / #FFD700 fields or text. No raw red/gold as text — use redText/goldText.
2. One light source only: glow belongs to reactor/repulsor. No glow on text/borders/every icon.
3. Retire multi-accent entirely — no violet/green/RGB. Gold + glow <=10% of field.
4. No pure-black canvas, no 3D bevels, no emoji, no gradient-only depth. Depth = lighter surfaces + 1px borders.
5. Validate each token against the actual surface it sits on in BOTH modes.

## Content fixes required (v3)
- Hero: REMOVE coordinates/location line entirely (no AGRA, no lat/long). Keep status pill.
- About card: FIX overlap — the last bio line was overlapping the fact row. Make layout dynamic:
  compute bio height from wrapped lines, place the divider + facts BELOW all bio lines,
  and grow card height accordingly. Add generous gap. Keep 4 facts, NO university/location fact.
- Experience/milestones: mark B.Tech and CSIR-4PI as CURRENT / "NOW" / "Currently pursuing" (done in data).

## Work section — 8 project cards, each linked to its own repo
Data in `data/profile.json` projects[] has `variant` per card. Assign a DISTINCT primary motif per
variant so cards look different: reactor, helmet, circuit, plating, arc, core, gauntlet, mark.
All cards link to their own `p.url` (the generator already wraps each in an <a>).

## SVG manifest (each base -> `<base>-light.svg` / `<base>-dark.svg`)
- hero (1200x470), footer (1200x150)
- 9 headers (1200x96): about, now, work, toolbox, milestones, contributions, problem-solving, activity, contact
- 6 buttons (200x56): github, linkedin, youtube, leetcode, x, email
- 4 info cards (1200 wide, DYNAMIC height for about): about, now, toolbox, milestones
- 8 project cards (580x290): project-1..project-8 (was 4 in v2)
- 3 live stat cards (1200x320): live-github, live-leetcode, live-activity

Total = 32 bases x 2 = 64 SVGs. Remove any stale project-5..8 from v2? No — v2 had 4, so
just ADD project-5..8. Delete no assets except stale v2-specific files if any.

## Ownership
- Assets agent: `scripts/generate-assets.mjs` + all `assets/**` (rewrite for Iron Man, add 4 more project cards, fix About overlap, remove coordinates).
- Orchestrator: DESIGN.md, data/profile.json (done), README generator project loop (already handles N projects), final build + push.
