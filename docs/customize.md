# Customising this profile

This file explains how to change the colours, the text, and the automation behind the
profile README. You do not need to know how GitHub Actions works — every step below
names the exact click or the exact line to change.

---

## 1. Where everything lives

| Path | What it is | Safe to edit by hand? |
|---|---|---|
| `README.md` | The profile page. The only file in this repo that GitHub renders on your profile. | **Yes** |
| `assets/header.svg` | Animated ASCII name block. Hand-written. | **Yes** |
| `assets/terminal.svg` | Animated typing terminal. Hand-written. | **Yes** |
| `assets/ascii-avatar.svg` | Your GitHub avatar converted to ASCII art. | No — overwritten daily |
| `assets/amber-dark.svg` | Contribution chart, dark mode. | No — overwritten daily |
| `assets/amber-light.svg` | Contribution chart, light mode. | No — overwritten daily |
| `assets/terminal-stats.svg` | Live identity card (followers, repos, top languages). | No — overwritten daily |
| `scripts/ascii_art.py` | The block-letter glyph table used to draw the header. | **Yes**, to change the name art |
| `scripts/ascii_avatar.py` | Downloads your avatar and renders it as ASCII. Holds the avatar's colours. | **Yes**, to change the avatar's look |
| `scripts/quote.py` | The list of quotes and the logic that swaps one into `README.md`. | **Yes**, to add quotes |
| `tests/test_ascii_art.py` | Checks the glyph table produces rectangular, aligned art. | Rarely |
| `tests/test_ascii_avatar.py` | Checks the avatar renderer. | Rarely |
| `tests/test_quote.py` | Checks the quote swapper. | Rarely |
| `.github/workflows/profile.yml` | The scheduled job that regenerates the four generated assets. | **Yes** |
| `docs/customize.md` | This file. | **Yes** |

The four files marked "overwritten daily" are written by a GitHub Actions job that runs
every day at **03:17 UTC**. Hand-edits to them survive until the next run, then disappear.

> The three chart/card files (`amber-dark.svg`, `amber-light.svg`, `terminal-stats.svg`)
> are currently 124-byte 16×16 placeholder blocks — solid colour rectangles, no content.
> They are replaced with real output the first time you run the workflow by hand. See
> section 3.

---

## 2. What to change in `README.md`

Everything a visitor reads as words — as opposed to words baked into an SVG — lives in
`README.md`. These are the parts you are meant to rewrite.

### The skill bars (`~/stack`)

```text
JavaScript    [████████████████████]  95
```

The bar is 20 cells wide and each cell is worth 5 points. To change a score you must
change both halves: the number of `█` characters and the number at the end. For 70 you
would write 14 `█` and 6 `░`, then the number `70`.

The `FRAMEWORKS` list under the bars is free text — add or remove items freely.

### The featured projects (`~/projects`)

Four entries: OwnSquare, NOVA, Payora, WebJava. Each is a real HTML link inside an HTML
`<pre>` block:

```html
├── <a href="https://github.com/dhruvbhadhotiya/OwnSquare">OwnSquare</a>
```

To add a project, copy an existing entry, change the URL and the description, and keep
the `├──` / `└──` characters aligned — the last one uses `└──` with no `│` continuation.

The last line of that block is a hardcoded summary:

```text
31 public repos · 7 followers · everything →
```

Update the repo count and follower count by hand when they drift. There is no automation
for this line.

### The contact line

```text
`./contact.sh` → **TODO_EMAIL** · [TODO_LINKEDIN](https://linkedin.com/in/dhruv-bhadhotiya) · [TODO_X](https://x.com/TODO_X) · **TODO_PORTFOLIO**
`./whereami.sh` → **TODO_LOCATION**
```

Five placeholders here, described in section 4.

### The footer quote — do not touch the markers

```text
> <!-- quote:start -->
> Simplicity is prerequisite for reliability. — Edsger Dijkstra
> <!-- quote:end -->
```

The two HTML comments delimit the line that the daily job rewrites. Leave both comment
lines exactly as they are, including the leading `> ` and the space after it. If either
comment is deleted the quote job fails and stops updating the README.

---

## 3. First-time setup

Do these in order. Nothing renders correctly until steps 1–4 are done.

### Step 1 — Push the repository

Nothing appears on your profile until the repo is pushed to GitHub.

### Step 2 — Give the workflow permission to write

GitHub Actions defaults to read-only permissions. Three of the four jobs push a commit
back to this repository, and all of them fail without this setting.

1. Open **Settings** on the repository (the tab next to *Code*, *Issues*, *Pull requests*).
2. In the left sidebar, choose **Actions → General**.
3. Scroll to **Workflow permissions**.
4. Select **Read and write permissions**.
5. Save.

### Step 3 — Run the workflow once by hand

1. Open the **Actions** tab.
2. In the left sidebar, click **profile-assets**.
3. Click **Run workflow** (top right), confirm, wait ~1 minute.

Until this succeeds, the contribution chart, the identity card and the avatar are blank
placeholder rectangles. The job also runs automatically every day at 03:17 UTC, but the
first manual run gets you a correct page immediately rather than tomorrow.

### Step 4 — Replace the `TODO_` placeholders

Six markers, listed in section 4. Three are in `README.md`, three are in
`assets/terminal.svg`.

### Step 5 — Set the skill percentages

Tune the `~/stack` numbers to your own honest self-assessment. They are a starting point,
not a measurement.

---

## 4. The `TODO_` placeholders

Exactly six markers exist, split across two files. A quick check:

```bash
rg -o "TODO_[A-Z_]+" README.md assets/terminal.svg | sort -u
```

| Marker | File | Line context | Replace with |
|---|---|---|---|
| `TODO_EMAIL` | `README.md` | contact line | Your email address |
| `TODO_LINKEDIN` | `README.md` | contact line — **the URL after it is already correct**, only the visible text is a placeholder | Your LinkedIn display name |
| `TODO_X` | `README.md` | contact line | Your X/Twitter handle, in **both** the link text and the URL (`https://x.com/TODO_X`) |
| `TODO_PORTFOLIO` | `README.md` | contact line | Your portfolio URL, written as bare text |
| `TODO_LOCATION` | `README.md` | line below the contact line | Your city |
| `TODO_LEARNING` | `assets/terminal.svg` | the `cat focus.txt` output | What you are currently learning |

`TODO_EMAIL`, `TODO_X` and `TODO_LINKEDIN` also appear inside `assets/terminal.svg`, on
the `$ ./contact.sh` row. Change both copies so the terminal and the footer agree.

After editing `assets/terminal.svg` by hand, confirm the file still opens in a browser —
a stray `&` or `<` in the text makes the SVG render as nothing at all.

---

## 5. Changing the theme

### 5.1 Five places carry the palette

All five must change, or parts of the page stay amber while the rest changes.

| # | File | What to change |
|---|---|---|
| 1 | `assets/header.svg` | the `:root { … }` block, and the `@media (prefers-color-scheme: light)` line |
| 2 | `assets/terminal.svg` | the same two lines — this file has **two extra** variables, see below |
| 3 | `scripts/ascii_avatar.py` | the `BG` / `FG` / `ACCENT` and `BG_LIGHT` / `FG_LIGHT` / `ACCENT_LIGHT` constants |
| 4 | `.github/workflows/profile.yml` | `themes:` on the `crt-contrib` job |
| 5 | `.github/workflows/profile.yml` | `theme:` on the `terminal-stats` job |

`assets/terminal.svg` defines five custom properties, not three:

```css
:root{--bg:#0d0b07;--fg:#ffb000;--accent:#ffcc66;--dim:#a07f35;--chrome:#1a150c}
```

- `--bg` — the terminal background
- `--fg` — the command text
- `--accent` — the cursor and highlight
- `--dim` — the smaller grey-brown text (output values, commit hashes, the title bar)
- `--chrome` — the window title bar and its three dots

**If you only change `--bg`, `--fg` and `--accent`, the terminal ends up half-themed**:
the dim text and the title bar stay amber-brown on a green background. Change all five.

`assets/header.svg` and `scripts/ascii_avatar.py` have no `--dim` or `--chrome`, so three
variables are correct for those two.

### 5.2 Amber CRT (what is shipped)

| Target | Dark | Light |
|---|---|---|
| `assets/header.svg` | `--bg:#0d0b07; --fg:#ffb000; --accent:#ffcc66` | `--bg:#fdf6e3; --fg:#8a4b00; --accent:#b35c00` |
| `assets/terminal.svg` | `… --dim:#a07f35; --chrome:#1a150c` | `… --dim:#8a6a42; --chrome:#efe3c8` |
| `scripts/ascii_avatar.py` | `BG="#0d0b07"`, `FG="#ffb000"`, `ACCENT="#ffcc66"` | `BG_LIGHT="#fdf6e3"`, `FG_LIGHT="#8a4b00"`, `ACCENT_LIGHT="#b35c00"` |
| `crt-contrib` job | `themes: amber` | (the action emits both variants) |
| `terminal-stats` job | `theme: gruvbox` | (single file, no light variant) |

### 5.3 Matrix green

| Target | Dark | Light |
|---|---|---|
| `assets/header.svg` | `--bg:#000000; --fg:#00ff41; --accent:#7cff9b` | `--bg:#f2fbf5; --fg:#046b26; --accent:#00a63c` |
| `assets/terminal.svg` | `… --dim:#4f9c36; --chrome:#0d2617` | `… --dim:#2c7338; --chrome:#dceee1` |
| `scripts/ascii_avatar.py` | `BG="#000000"`, `FG="#00ff41"`, `ACCENT="#7cff9b"` | `BG_LIGHT="#f2fbf5"`, `FG_LIGHT="#046b26"`, `ACCENT_LIGHT="#00a63c"` |
| `crt-contrib` job | `themes: crt` | |
| `terminal-stats` job | `theme: hacker` | |

### 5.4 Cyberpunk violet

| Target | Dark | Light |
|---|---|---|
| `assets/header.svg` | `--bg:#0a0713; --fg:#c77dff; --accent:#ff4ecd` | `--bg:#f7f2fb; --fg:#6b2a9e; --accent:#b3179c` |
| `assets/terminal.svg` | `… --dim:#9a6bd0; --chrome:#1b0f30` | `… --dim:#7a4a9e; --chrome:#e7dcf2` |
| `scripts/ascii_avatar.py` | `BG="#0a0713"`, `FG="#c77dff"`, `ACCENT="#ff4ecd"` | `BG_LIGHT="#f7f2fb"`, `FG_LIGHT="#6b2a9e"`, `ACCENT_LIGHT="#b3179c"` |
| `crt-contrib` job | `themes: neon` | |
| `terminal-stats` job | `theme: dracula` | |

### 5.5 The `--dim` values are contrast-checked — yours must be too

`--dim` is used for real text at 11–14 px, so it has to meet the WCAG AA contrast
minimum of **4.5:1** against whatever is behind it. There are two backgrounds in the
terminal: the main `--bg`, and the `--chrome` title bar (the `dhruvbhadhotiya — zsh`
label sits on it). A value that passes against `--bg` can still fail against `--chrome`.

Measured ratios for the values above:

| Palette | `--dim` | vs `--bg` | vs `--chrome` |
|---|---|---|---|
| Amber dark (shipped) | `#a07f35` | **5.23:1** | 4.83:1 |
| Amber light (shipped) | `#8a6a42` | **4.61:1** | 3.91:1 |
| Matrix dark | `#4f9c36` | **6.14:1** | 4.70:1 |
| Matrix light | `#2c7338` | **5.50:1** | 4.80:1 |
| Cyberpunk dark | `#9a6bd0` | **5.12:1** | 4.65:1 |
| Cyberpunk light | `#7a4a9e` | **5.77:1** | 4.82:1 |

The bold column is the one that matters for the body text of the terminal. If you invent
your own `--dim`, check it: pick a colour that is clearly dimmer than `--fg` but still
readable, then verify both numbers.

One honest caveat, so you are not surprised: the shipped **light** amber palette is a
little weaker than the rest. `--accent:#b35c00` is 4.38:1 against `--bg`, and
`--dim:#8a6a42` is 3.91:1 against `--chrome`. Both are just under 4.5:1 — usable, but
below the line. If you retune the light palette, `#9a4d00` for `--accent` (5.67:1 on
`--bg`, 4.80:1 on `--chrome`) and `#755937` for `--dim` (6.01:1 on `--bg`, 5.09:1 on
`--chrome`) clears it on both surfaces.

### 5.6 After changing the theme

1. Save all five edits.
2. **Run `profile-assets` by hand** from the Actions tab. The three generated SVGs still
   carry the old palette until a run happens, so waiting for the 03:17 UTC schedule
   leaves the page mismatched for up to 24 hours.
3. Open the profile in a private window and in a normal one — those follow your OS
   light/dark setting, so this is the only reliable way to see the light variant.

### 5.7 Available third-party theme names

`crt-contrib` uses the `themes:` input of `stefashkaa/github-profile-crt`. Valid values:

`crt`, `amber`, `ice`, `ruby`, `mint`, `mono`, `winamp`, `neon`, `rainbow`, `chaos`,
`chaos-max`, `static`

It also accepts a comma-separated list (`themes: crt,rainbow,winamp`), the literal
`all` (renders every theme), or `custom` (a hand-built palette driven by
`CRT_CUSTOM_*` environment variables — see `docs/customize-theme.md` **in that action's own
repository**).

**The output filenames follow the theme name.** The action writes
`<theme>-dark.svg` and `<theme>-light.svg` into `output-dir`. So `themes: amber`
produces `assets/amber-dark.svg` and `assets/amber-light.svg`, and changing the theme
means the old files are no longer regenerated. If you change `themes:`, you must also
update the two `srcset` paths and the `src` in the `<picture>` block in `README.md`:

```html
<source media="(prefers-color-scheme: dark)" srcset="assets/amber-dark.svg">
<source media="(prefers-color-scheme: light)" srcset="assets/amber-light.svg">
<img src="assets/amber-dark.svg" alt="…" width="100%">
```

(`themes: custom` is the exception: it always writes `custom-dark.svg` /
`custom-light.svg`.)

`terminal-stats` uses the `theme:` input of
`yogeshwaran01/github-stats-terminal-style`. Valid values:

`dracula`, `ubuntu`, `hacker`, `atom`, `powershell`, `monokai`, `github`, `catppuccin`,
`nord`, `gruvbox`, `tokyonight`

Its `outputPath` is set explicitly to `assets/terminal-stats.svg`, so changing `theme:`
does not rename the file and `README.md` needs no edit. The `headerStyle` input accepts
`mac`, `windows`, `retro`; it is currently `mac`.

---

## 6. Changing the name in the header

The header reads `DHRUV`. `scripts/ascii_art.py` holds the block-letter glyphs and a
helper that emits ready-to-paste SVG rows:

```bash
python scripts/ascii_art.py --tspans NEWNAME
```

It prints one `<tspan>` per row. Paste them into the `<text id="name" …>` block in
`assets/header.svg`, replacing the rows already there. The helper defaults match what
`header.svg` already uses (`x=20`, first row at `y=96`, 19 px between rows, `font-size`
17), so nothing else needs adjusting.

The glyph table covers `A`–`Z`, `0`, `1`, `.`, `-` and space. A character with no glyph
raises a `KeyError` naming it rather than rendering a gap, so a typo fails loudly.

The block is inside a 620 px-wide `viewBox`. A much longer name will overflow the right
edge. If that happens, reduce `font-size="17"` on the `<text id="name">` element by one
or two rather than widening the `viewBox` — a wider box makes the art smaller on a phone.

---

## 7. Adding or changing quotes

`scripts/quote.py` has a `QUOTES` list of twelve strings. Add yours to that list and
they enter the rotation the next time the job runs. Each entry must be a single line —
the script raises `ValueError` if a quote contains a newline, because a two-line quote
would break out of the `> ` blockquote in `README.md`.

The job picks one quote per day using the date as a seed, so it only rewrites the README
when the choice actually changes. To preview a specific quote without waiting:

```bash
python scripts/quote.py --readme README.md --seed 3
```

Omit `--seed` to get the date-based choice.

---

## 8. The avatar width — do not drop `--cols 88`

`assets/ascii-avatar.svg` is regenerated daily by the `ascii-avatar` job, which runs:

```text
python scripts/ascii_avatar.py --user … --out assets/ascii-avatar.svg --cols 88
```

The script's own default is **also** `--cols 88`, so dropping the flag is now safe. It used
to default to `56`, which silently produced grey mush — 56 characters is too coarse to
resolve a face, and there is no error, just an unrecognisable smudge. If you change the
default, change the workflow flag too, and look at the result in a browser.

To change the width, pass `--cols` in the workflow and look at the resulting SVG. Anything
under roughly 72 columns will be too coarse to read as a face.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Contribution chart, identity card and avatar are flat colour rectangles | The workflow has never completed a successful run | Run `profile-assets` once from the Actions tab (section 3) |
| A job fails at `git push` with a permission error | Workflow permissions are still read-only | Settings → Actions → General → Workflow permissions → **Read and write** |
| A job fails on every run even though permissions are set | The setting is on the repository, not on your user account | Open the repository's Settings, not your account Settings |
| Contribution chart is missing or stale, other jobs fine | The `stefashkaa/github-profile-crt` job failed on its own | Open that job's Actions log — it runs independently of the other three |
| Chart is blank but the job succeeded | Private contributions are not counted for the chart | Enable private contributions in your GitHub profile settings, or accept that the chart shows public activity only |
| Identity card is stale | The upstream API rate-limited the request | Nothing to do; it succeeds on the next run |
| Quote never changes | The `<!-- quote:start -->` or `<!-- quote:end -->` comment was deleted or moved in `README.md` | Restore both comments exactly, each on its own `> ` line |
| Quote replaced your edits or broke the blockquote | The `> ` prefix was dropped from a marker line | Each marker line must start with `> ` followed by a space |
| Half the page is amber and half is your new colour | A generated SVG has not been regenerated | Run `profile-assets` by hand; check you updated both `themes:` and `theme:` |
| Chart works, page shows a broken image icon | You changed `themes:` but not the `srcset` paths in `README.md` | Update the `<picture>` block to match the new `<theme>-dark.svg` / `<theme>-light.svg` names (section 5.7) |
| Terminal is the wrong colour, but the header is right | You changed `--bg`/`--fg`/`--accent` in `terminal.svg` and forgot `--dim` and `--chrome` | Change all five custom properties (section 5.1) |
| Dim text is unreadable in light mode | The new `--dim` does not reach 4.5:1 contrast | Check both the `--bg` and `--chrome` ratios (section 5.5) |
| `assets/terminal.svg` shows nothing at all | Your edit introduced a bare `&` or `<` | Escape it as `&amp;` / `&lt;`, or re-run `python scripts/ascii_art.py --tspans DHRUV` for the header |
| Avatar is an unrecognisable smudge | `--cols` dropped below ~72 | Restore `--cols 88` in the workflow (section 8) |
| ASCII divider renders as boxes | Your browser's monospace font lacks `█` and the box-drawing characters | Cosmetic only; switch to Fira Code or another font with box-drawing support |