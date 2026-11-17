#!/usr/bin/env node
/**
 * generate-assets.mjs — AETHER (v2) SVG asset generator
 * ---------------------------------------------------------------------------
 * PURPOSE
 *   Regenerate every decorative SVG used by the GitHub profile README in the
 *   AETHER design system (editorial serif + restrained violet/cyan accents).
 *   Dependency-free Node ESM: only node:fs / node:path / node:url are used.
 *
 * INPUTS (read-only)
 *   data/profile.json -> hero, socials, about, now, projects, toolbox,
 *                        milestones, activity, footer (all display copy)
 *   data/stats.json   -> github + leetcode numeric metrics
 *
 * OUTPUTS (idempotent; safe to re-run)
 *   assets/<base>-light.svg and assets/<base>-dark.svg for every base in the
 *   manifest below: hero, footer, 9 headers, 6 buttons, 4 info cards,
 *   4 project cards, 3 live stat cards  =>  28 bases x 2 = 56 SVGs.
 *   Legacy tic-tac-toe tiles (assets/ttt/) and header-play-*.svg are removed.
 *
 * Both themes share identical layout; only canvas/surface/text colors swap.
 * Accent colors come straight from theme(mode) (darker variants on light).
 * No JavaScript, no embedded fonts -- font stacks are referenced by name only.
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const ASSETS = path.join(ROOT, 'assets');

const profile = JSON.parse(fs.readFileSync(path.join(DATA, 'profile.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(path.join(DATA, 'stats.json'), 'utf8'));

let written = 0;

/* -------------------------------------------------------------------------- */
/* Theme — EXACT palette values from DESIGN.md                                */
/* -------------------------------------------------------------------------- */
function theme(mode) {
  if (mode === 'dark') {
    return {
      canvas: '#0A0E1A', canvasDeep: '#070A13', surface: '#131A2A', raised: '#1A2336',
      border: '#2A3550', ink: '#F1F5F9', muted: '#94A3B8',
      violet: '#8B5CF6', cyan: '#06B6D4', cyanText: '#67E8F9',
      lime: '#A3E635', warm: '#FB7185',
    };
  }
  return {
    canvas: '#F5F7FA', canvasDeep: '#EAEFF5', surface: '#FFFFFF', raised: '#F0F4F9',
    border: '#D5DEEA', ink: '#0F172A', muted: '#5B6B80',
    violet: '#6D28D9', cyan: '#0E7490', cyanText: '#0E7490',
    lime: '#4D7C0F', warm: '#E11D48',
  };
}

/* -------------------------------------------------------------------------- */
/* Font stacks — single quotes around spaced names so XML attrs stay valid    */
/* -------------------------------------------------------------------------- */
const FONT = {
  display: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
  body: "Inter, system-ui, -apple-system, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Consolas, monospace",
};

/* -------------------------------------------------------------------------- */
/* Core helpers                                                               */
/* -------------------------------------------------------------------------- */

// Escape every character that is special in XML text and attributes.
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Greedy word wrap by character count; hard-splits long tokens; ellipsizes.
function wrap(text, max, maxLines = 99) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (let word of words) {
    while (word.length > max) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (!word) continue;
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= max) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const out = lines.slice(0, maxLines);
    out[maxLines - 1] = out[maxLines - 1].replace(/\s+\S*$/, '') + '…';
    return out;
  }
  return lines;
}

// Text node. font: 'display' | 'body' | 'mono'. Escapes the string content.
function txt(x, y, str, o = {}) {
  const a = [
    `x="${x}"`,
    `y="${y}"`,
    `fill="${o.fill ?? '#111111'}"`,
    `font-family="${FONT[o.font] || FONT.body}"`,
    `font-size="${o.size ?? 16}"`,
    `font-weight="${o.weight ?? 400}"`,
  ];
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.ls != null) a.push(`letter-spacing="${o.ls}"`);
  if (o.opacity != null) a.push(`opacity="${o.opacity}"`);
  if (o.style) a.push(`font-style="${o.style}"`);
  if (o.stroke) a.push(`stroke="${o.stroke}"`);
  if (o.sw != null) a.push(`stroke-width="${o.sw}"`);
  return `<text ${a.join(' ')}>${esc(str)}</text>`;
}

// Root <svg>: xmlns, viewBox, width, height, role, aria-label and <title>.
function svgRoot(w, h, label, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `
    + `viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">`
    + `<title>${esc(label)}</title>`
    + content
    + `</svg>\n`;
}

// Rounded surface panel.
function panel(x, y, w, h, t, o = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 14}" `
    + `fill="${o.fill || t.surface}" stroke="${o.stroke || t.border}" `
    + `stroke-width="${o.sw ?? 1.25}"/>`;
}

// Horizontal rule: gradient (o.grad) or solid (o.color) stroke.
function rule(x1, y, x2, t, o = {}) {
  const stroke = o.grad ? `url(#${o.grad})` : (o.color || t.violet);
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" `
    + `stroke="${stroke}" stroke-width="${o.w ?? 2}" `
    + `stroke-linecap="round" opacity="${o.opacity ?? 0.85}"/>`;
}

// Linear gradient def. Coordinates default to objectBoundingBox (0..1).
function grad(id, x1, y1, x2, y2, stops) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">`
    + stops.map(s => `<stop offset="${s.o}" stop-color="${s.c}"`
        + `${s.a != null ? ` stop-opacity="${s.a}"` : ''}/>`).join('')
    + `</linearGradient>`;
}

// Radial gradient def (used for soft glow blobs and monogram washes).
function radial(id, stops) {
  return `<radialGradient id="${id}">`
    + stops.map(s => `<stop offset="${s.o}" stop-color="${s.c}"`
        + `${s.a != null ? ` stop-opacity="${s.a}"` : ''}/>`).join('')
    + `</radialGradient>`;
}

// Gaussian blur filter def for ambient lighting.
function blur(id, sd) {
  return `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">`
    + `<feGaussianBlur stdDeviation="${sd}"/>`
    + `</filter>`;
}

// Fine diagonal hatch pattern def.
function hatch(id, t, o = {}) {
  return `<pattern id="${id}" width="${o.gap ?? 10}" height="${o.gap ?? 10}" `
    + `patternUnits="userSpaceOnUse" patternTransform="rotate(${o.angle ?? 45})">`
    + `<line x1="0" y1="0" x2="0" y2="${o.gap ?? 10}" `
    + `stroke="${o.color || t.border}" stroke-width="${o.sw ?? 1}"/>`
    + `</pattern>`;
}

// Wrap defs chunks in a single <defs> element.
function defs(...chunks) {
  return `<defs>${chunks.filter(Boolean).join('')}</defs>`;
}

// Small chip. o.style: 'pill' (default) or 'dot' (flat, no box).
// Returns { svg, w } so callers can advance the cursor.
function chip(x, y, label, t, o = {}) {
  const fs = o.size ?? 12;
  const h = o.h ?? 24;
  const w = Math.round(String(label).length * fs * 0.60 + (o.style === 'dot' ? 18 : 24));
  const color = o.color || t.cyan;
  if (o.style === 'dot') {
    return {
      svg: `<circle cx="${x + 3}" cy="${y + h / 2}" r="2.5" fill="${color}" opacity="0.9"/>`
        + txt(x + 14, y + h / 2 + fs * 0.35, label, { fill: o.textFill || t.ink, size: fs }),
      w,
    };
  }
  const s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" `
    + `fill="${t.raised}" stroke="${color}" stroke-opacity="0.45" stroke-width="1"/>`
    + txt(x + 12, y + h / 2 + fs * 0.35, label,
        { fill: o.textFill || t.ink, size: fs, font: 'mono' });
  return { svg: s, w };
}

// Full-bleed canvas background. Optionally overlay a subtle diagonal hatch.
function backdrop(t, w, h, o = {}) {
  let s = `<rect width="${w}" height="${h}" fill="${t.canvas}"/>`;
  if (o.hatch) s += `<rect width="${w}" height="${h}" fill="url(#${o.hatch})" opacity="${o.hatchOpacity ?? 0.05}"/>`;
  return s;
}

// Write one generated SVG (creating parent dirs as needed).
function write(name, svg) {
  const dest = path.join(ASSETS, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, svg, 'utf8');
  written += 1;
}

/* -------------------------------------------------------------------------- */
/* HERO (1200 x 470) — mesh glow, huge serif name on 2 lines                  */
/* -------------------------------------------------------------------------- */
function buildHero(t) {
  const w = 1200, h = 470;
  const H = profile.hero;
  const words = String(H.name).trim().split(/\s+/);
  const parts = words.length > 1 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : [words[0]];

  let d = defs(
    radial('hero-rv', [{ o: '0%', c: t.violet, a: 0.55 }, { o: '100%', c: t.violet, a: 0 }]),
    radial('hero-rc', [{ o: '0%', c: t.cyan, a: 0.50 }, { o: '100%', c: t.cyan, a: 0 }]),
    radial('hero-rl', [{ o: '0%', c: t.lime, a: 0.22 }, { o: '100%', c: t.lime, a: 0 }]),
    blur('hero-blur', 30),
    grad('hero-rule', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    hatch('hero-hatch', t, { gap: 12, sw: 0.7 }),
  );

  let s = d + backdrop(t, w, h, { hatch: 'hero-hatch', hatchOpacity: 0.035 });
  // Ambient mesh lighting: overlapping blurred radial blobs, top-right.
  s += `<g filter="url(#hero-blur)">`
    + `<ellipse cx="980" cy="120" rx="300" ry="250" fill="url(#hero-rv)"/>`
    + `<ellipse cx="1110" cy="250" rx="270" ry="270" fill="url(#hero-rc)" opacity="0.85"/>`
    + `<ellipse cx="860" cy="40" rx="210" ry="170" fill="url(#hero-rl)" opacity="0.7"/>`
    + `</g>`;

  s += txt(64, 56, 'AETHER  /  PROFILE  2026', { font: 'mono', size: 12, fill: t.muted, ls: 2.2 });
  s += txt(64, 196, parts[0] || '', { font: 'display', size: 106, fill: t.ink, weight: 400, ls: -2 });
  if (parts[1]) s += txt(64, 308, parts[1], { font: 'display', size: 106, fill: t.ink, weight: 400, ls: -2 });
  s += rule(64, 340, 300, t, { grad: 'hero-rule', w: 3 });
  s += txt(64, 376, H.role, { font: 'mono', size: 18, fill: t.cyanText, ls: 0.6 });
  s += txt(64, 410, H.tagline, { font: 'display', size: 21, fill: t.muted, style: 'italic' });

  // Hairline footer.
  s += rule(64, 430, 1136, t, { grad: 'hero-rule', w: 1, opacity: 0.55 });
  s += txt(64, 456, H.coordinates, { font: 'mono', size: 13, fill: t.muted, ls: 1 });

  const status = H.status;
  const pillW = Math.round(status.length * 7.1 + 46);
  const px = 1136 - pillW;
  s += `<rect x="${px}" y="436" width="${pillW}" height="30" rx="15" `
    + `fill="${t.raised}" stroke="${t.border}" stroke-width="1"/>`;
  s += `<circle cx="${px + 18}" cy="451" r="4.5" fill="${t.lime}"/>`;
  s += txt(px + 32, 455, status, { font: 'mono', size: 12, fill: t.cyanText, ls: 0.7 });
  return svgRoot(w, h, `${H.name} — ${H.role}`, s);
}

/* -------------------------------------------------------------------------- */
/* FOOTER (1200 x 150) — gradient ribbon + diamond sigil                      */
/* -------------------------------------------------------------------------- */
function buildFooter(t) {
  const w = 1200, h = 150;
  let d = defs(
    grad('foot-ribbon', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    radial('foot-wash', [{ o: '0%', c: t.violet, a: 0.20 }, { o: '100%', c: t.violet, a: 0 }]),
    blur('foot-blur', 22),
  );
  let s = d + backdrop(t, w, h);
  s += `<ellipse cx="90" cy="150" rx="220" ry="120" fill="url(#foot-wash)" filter="url(#foot-blur)"/>`;
  s += `<rect x="0" y="0" width="${w}" height="4" fill="url(#foot-ribbon)"/>`;

  // Diamond sigil.
  s += `<g transform="translate(58,76) rotate(45)">`
    + `<rect x="-17" y="-17" width="34" height="34" rx="3" fill="none" `
    + `stroke="url(#foot-ribbon)" stroke-width="2"/>`
    + `<rect x="-6" y="-6" width="12" height="12" rx="1" fill="${t.cyan}" opacity="0.85"/>`
    + `</g>`;

  const lines = wrap(profile.footer, 96, 2);
  lines.forEach((ln, i) => { s += txt(110, 70 + i * 26, ln, { font: 'body', size: 17, fill: t.ink }); });
  s += txt(110, 122, `© 2026 ${profile.user.toUpperCase()}  ·  AETHER / v2`, {
    font: 'mono', size: 12, fill: t.muted, ls: 1.2,
  });
  s += txt(1140, 82, `@${profile.user}`, {
    font: 'mono', size: 16, fill: t.cyanText, anchor: 'end', ls: 0.5,
  });
  return svgRoot(w, h, `${profile.user} — footer`, s);
}

/* -------------------------------------------------------------------------- */
/* HEADERS (1200 x 96) — outline index numeral + serif title + gradient rule   */
/* -------------------------------------------------------------------------- */
const HEADERS = [
  { key: 'about',            title: 'ABOUT',           kicker: 'IDENTITY & BACKGROUND' },
  { key: 'now',              title: 'NOW',             kicker: 'CURRENT STATE' },
  { key: 'work',             title: 'SELECTED WORK',   kicker: 'PROJECTS & SYSTEMS' },
  { key: 'toolbox',          title: 'TOOLBOX',         kicker: 'STACK & TOOLS' },
  { key: 'milestones',       title: 'EXPERIENCE',      kicker: 'RESEARCH & ACHIEVEMENTS' },
  { key: 'contributions',    title: 'CONTRIBUTIONS',   kicker: 'LIVE GITHUB METRICS' },
  { key: 'problem-solving',  title: 'PROBLEM SOLVING', kicker: 'ALGORITHMS & RANK' },
  { key: 'activity',         title: 'ACTIVITY',        kicker: 'RECENT LOG' },
  { key: 'contact',          title: 'CONTACT',         kicker: 'SAY HELLO' },
];

function buildHeader(t, cfg, index) {
  const w = 1200, h = 96;
  const num = String(index + 1).padStart(2, '0');
  const id = `hdr-${cfg.key}`;
  let d = defs(
    grad(`${id}-grad`, 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + backdrop(t, w, h);
  // Giant translucent OUTLINE index numeral on the right.
  s += txt(1160, 82, num, {
    font: 'display', size: 150, fill: 'none', stroke: t.violet,
    sw: 2.2, opacity: 0.16, anchor: 'end', ls: -6,
  });
  // Title (serif) + short mono kicker, left aligned.
  s += txt(48, 46, cfg.title, { font: 'display', size: 34, fill: t.ink, ls: 0.3 });
  s += txt(48, 70, cfg.kicker, { font: 'mono', size: 12, fill: t.cyanText, ls: 1.7 });
  // 2px gradient rule whose length varies by section.
  const ruleLen = Math.min(700, 210 + index * 62);
  s += rule(48, 86, 48 + ruleLen, t, { grad: `${id}-grad`, w: 2 });
  return svgRoot(w, h, `${cfg.title} — section ${num}`, s);
}

/* -------------------------------------------------------------------------- */
/* BUTTONS (200 x 56) — pill with gradient dot + label                        */
/* -------------------------------------------------------------------------- */
const BUTTON_ORDER = ['github', 'linkedin', 'youtube', 'leetcode', 'x', 'email'];

function buildButton(t, key, label) {
  const w = 200, h = 56;
  const id = `btn-${key}`;
  let d = defs(
    grad(`${id}-dot`, 0, 0, 1, 1, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="27" `
    + `fill="${t.raised}" stroke="${t.border}" stroke-width="1.25"/>`;
  s += `<circle cx="30" cy="28" r="7" fill="url(#${id}-dot)"/>`;
  s += `<circle cx="30" cy="28" r="11" fill="none" stroke="url(#${id}-dot)" `
    + `stroke-width="1" opacity="0.35"/>`;
  s += txt(50, 35, label, { font: 'body', size: 17, fill: t.ink, weight: 600 });
  s += txt(176, 35, '↗', { font: 'body', size: 15, fill: t.cyanText, anchor: 'end' });
  return svgRoot(w, h, `${label} link`, s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: ABOUT (1200 x 330) — monogram + bio + fact baseline              */
/* -------------------------------------------------------------------------- */
function buildCardAbout(t) {
  const w = 1200, h = 330;
  const A = profile.about;
  const initial = String(profile.hero.name).trim()[0] || 'A';
  let d = defs(
    radial('about-grad', [
      { o: '0%', c: t.violet, a: 0.45 },
      { o: '65%', c: t.cyan, a: 0.18 },
      { o: '100%', c: t.cyan, a: 0 },
    ]),
    blur('about-blur', 8),
    grad('about-rule', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);

  // Soft gradient circle + monogram.
  s += `<circle cx="130" cy="160" r="86" fill="url(#about-grad)" filter="url(#about-blur)"/>`;
  s += `<circle cx="130" cy="160" r="72" fill="none" stroke="${t.border}" stroke-width="1.25"/>`;
  s += txt(130, 200, initial, {
    font: 'display', size: 110, fill: t.ink, opacity: 0.92, anchor: 'middle',
  });

  // Bio lines.
  let y = 74;
  for (const line of A.lines) {
    for (const ln of wrap(line, 60)) {
      s += txt(268, y, ln, { font: 'body', size: 17, fill: t.muted });
      y += 26;
    }
  }

  // Facts as a 4-column baseline row.
  s += rule(48, 246, w - 48, t, { grad: 'about-rule', w: 1, opacity: 0.5 });
  const facts = A.facts.slice(0, 4);
  const colW = (w - 96) / Math.max(1, facts.length);
  facts.forEach((f, i) => {
    const x = 48 + i * colW;
    if (i > 0) s += `<line x1="${x - 18}" y1="266" x2="${x - 18}" y2="308" stroke="${t.border}" stroke-width="1"/>`;
    s += txt(x, 276, f.k, { font: 'mono', size: 11, fill: t.cyanText, ls: 1.5 });
    s += txt(x, 304, f.v, { font: 'body', size: 16, fill: t.ink, weight: 600 });
  });
  return svgRoot(w, h, 'About — identity', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: NOW (1200 x 320) — 3-column signal strip + sparkline + status    */
/* -------------------------------------------------------------------------- */
function buildCardNow(t) {
  const w = 1200, h = 320;
  const N = profile.now;
  let d = defs(
    grad('now-rule', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    grad('now-spark', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    grad('now-area', 0, 0, 0, 1, [{ o: '0%', c: t.cyan, a: 0.28 }, { o: '100%', c: t.cyan, a: 0 }]),
    radial('now-dot', [{ o: '0%', c: t.lime, a: 0.9 }, { o: '100%', c: t.lime, a: 0 }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);

  s += txt(48, 48, 'CURRENT STATE', { font: 'mono', size: 12, fill: t.muted, ls: 2 });
  s += `<circle cx="1108" cy="44" r="9" fill="url(#now-dot)"/>`;
  s += `<circle cx="1108" cy="44" r="3.5" fill="${t.lime}"/>`;
  s += txt(1132, 48, 'LIVE', { font: 'mono', size: 12, fill: t.cyanText, ls: 1.5, anchor: 'end' });

  const cols = [
    { k: 'BUILDING', v: N.building, c: t.cyanText },
    { k: 'LEARNING', v: N.learning, c: t.violet },
    { k: 'LISTENING', v: N.listening, c: t.cyanText },
  ];
  const colW = (w - 96) / 3;
  cols.forEach((col, i) => {
    const x = 48 + i * colW;
    if (i > 0) s += `<line x1="${x - 24}" y1="84" x2="${x - 24}" y2="208" stroke="${t.border}" stroke-width="1"/>`;
    s += rule(x, 84, x + colW - 48, t, { grad: 'now-rule', w: 2 });
    s += txt(x, 110, col.k, { font: 'mono', size: 13, fill: col.c, ls: 1.8 });
    let y = 140;
    for (const ln of wrap(col.v, Math.round(colW / 10))) {
      s += txt(x, y, ln, { font: 'body', size: 16, fill: t.ink });
      y += 24;
    }
  });

  // Calm activity sparkline.
  const vals = [10, 14, 9, 17, 13, 21, 16, 24, 19, 27, 22, 30];
  const x0 = 48, x1 = 1152, base = 278, amp = 44;
  const pts = vals.map((v, i) => ({
    x: x0 + (x1 - x0) * (i / (vals.length - 1)),
    y: base - (v / 30) * amp,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${x1} ${base} L${x0} ${base} Z`;
  s += `<path d="${area}" fill="url(#now-area)"/>`;
  s += `<path d="${line}" fill="none" stroke="url(#now-spark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const last = pts[pts.length - 1];
  s += `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${t.cyan}"/>`;

  s += txt(48, 308, N.note, { font: 'body', size: 13, fill: t.muted, style: 'italic' });
  return svgRoot(w, h, 'Now — current state', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: TOOLBOX — 4 columns of flat chips + hairline dividers            */
/* -------------------------------------------------------------------------- */
function buildCardToolbox(t) {
  const w = 1200;
  const groups = profile.toolbox.slice(0, 4);
  const maxItems = Math.max(1, ...groups.map(g => g.items.length));
  const h = 150 + maxItems * 30;
  const dotColors = [t.cyan, t.violet, t.cyan, t.violet];

  let d = defs(
    grad('tool-rule', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);
  s += txt(48, 48, 'STACK & TOOLS', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  const colW = (w - 96) / Math.max(1, groups.length);
  groups.forEach((g, gi) => {
    const x = 48 + gi * colW;
    if (gi > 0) s += `<line x1="${x - 26}" y1="72" x2="${x - 26}" y2="${h - 40}" stroke="${t.border}" stroke-width="1"/>`;
    s += rule(x, 78, x + colW - 52, t, { grad: 'tool-rule', w: 2 });
    s += txt(x, 104, g.group, { font: 'mono', size: 12, fill: t.cyanText, ls: 1.6 });
    g.items.forEach((item, ii) => {
      s += chip(x, 120 + ii * 30, item, t, { style: 'dot', color: dotColors[gi], size: 15, h: 22 }).svg;
    });
  });
  return svgRoot(w, h, 'Toolbox — stack and tools', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: MILESTONES — vertical timeline, gradient spine, alternating dots */
/* -------------------------------------------------------------------------- */
function buildCardMilestones(t) {
  const w = 1200;
  const items = profile.milestones;
  const firstY = 120, step = 64;
  const h = firstY + Math.max(0, items.length - 1) * step + 78;

  let d = defs(
    grad('mile-spine', 0, 0, 0, 1, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);
  s += txt(48, 52, 'RESEARCH & ACHIEVEMENTS', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  const lineX = 176;
  const lastY = firstY + Math.max(0, items.length - 1) * step;
  s += `<line x1="${lineX}" y1="${firstY - 10}" x2="${lineX}" y2="${lastY + 10}" `
    + `stroke="url(#mile-spine)" stroke-width="3" stroke-linecap="round"/>`;
  items.forEach((m, i) => {
    const y = firstY + i * step;
    s += txt(148, y + 5, m.date, { font: 'mono', size: 13, fill: t.cyanText, anchor: 'end', ls: 0.5 });
    const r = i % 2 === 0 ? 9 : 5.5;
    s += `<circle cx="${lineX}" cy="${y}" r="${r}" fill="${t.canvas}" `
      + `stroke="${i % 2 === 0 ? t.violet : t.cyan}" stroke-width="3"/>`;
    s += txt(210, y - 2, m.title, { font: 'display', size: 21, fill: t.ink, weight: 600 });
    s += txt(210, y + 22, m.detail, { font: 'body', size: 14, fill: t.muted });
  });
  return svgRoot(w, h, 'Milestones — timeline', s);
}

/* -------------------------------------------------------------------------- */
/* PROJECT CARDS (580 x 290) — ghost index, sheen, serif name, tags, metric    */
/* -------------------------------------------------------------------------- */
function buildProject(t, p, i) {
  const w = 580, h = 290;
  const idx = String(i + 1).padStart(2, '0');
  const id = `proj${i + 1}`;
  const accent = [t.cyan, t.violet, t.cyan, t.violet][i % 4];

  let d = defs(
    grad(`${id}-sheen`, 0, 0, 1, 1, [
      { o: '0%', c: t.violet, a: 0.30 },
      { o: '55%', c: t.cyan, a: 0.10 },
      { o: '100%', c: t.cyan, a: 0 },
    ]),
    grad(`${id}-rule`, 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(6, 6, w - 12, h - 12, t, { r: 16 });
  // Diagonal gradient sheen in one corner.
  s += `<path d="M${w - 6} 6 L${w - 6} 168 L${w - 168} 6 Z" fill="url(#${id}-sheen)"/>`;
  // Large ghost index number.
  s += txt(w - 26, h - 18, idx, {
    font: 'display', size: 150, fill: 'none', stroke: t.violet,
    sw: 2, opacity: 0.10, anchor: 'end', ls: -6,
  });

  s += txt(28, 38, `PROJECT  ${idx}`, { font: 'mono', size: 11, fill: t.cyanText, ls: 1.8 });
  s += txt(28, 88, p.name, { font: 'display', size: 30, fill: t.ink, ls: 0.2 });

  let y = 120;
  for (const ln of wrap(p.desc, 46, 4)) {
    s += txt(28, y, ln, { font: 'body', size: 14, fill: t.muted });
    y += 21;
  }

  s += rule(28, 214, 200, t, { grad: `${id}-rule`, w: 2 });
  let cx = 28;
  for (const tag of p.tags.slice(0, 4)) {
    const c = chip(cx, 226, tag, t, { color: accent, size: 11, h: 24 });
    s += c.svg;
    cx += c.w + 7;
  }
  s += `<path d="M30 268 l5 -5 l5 5 l-5 5 Z" fill="${t.lime}"/>`;
  s += txt(48, 272, p.metric, { font: 'mono', size: 13, fill: t.cyanText, ls: 0.5 });
  return svgRoot(w, h, `${p.name} — ${p.metric}`, s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: GITHUB (1200 x 320) — 4 radial gauges                                */
/* -------------------------------------------------------------------------- */
function buildLiveGithub(t) {
  const w = 1200, h = 320;
  const g = stats.github;
  const items = [
    { k: 'FOLLOWERS', v: g.followers },
    { k: 'REPOSITORIES', v: g.repos },
    { k: 'TOTAL STARS', v: g.stars },
    { k: 'CONTRIBUTIONS', v: g.contributions },
  ];
  const max = Math.max(1, ...items.map(i => i.v));
  const r = 54, C = 2 * Math.PI * r;

  let d = defs(
    grad('gh-gauge', 0, 0, 1, 1, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    radial('gh-glow', [{ o: '0%', c: t.cyan, a: 0.16 }, { o: '100%', c: t.cyan, a: 0 }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);
  s += txt(48, 52, 'GITHUB / LIVE METRICS', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  const centers = [195, 465, 735, 1005];
  items.forEach((it, i) => {
    const cx = centers[i], cy = 158;
    s += `<circle cx="${cx}" cy="${cy}" r="${r + 16}" fill="url(#gh-glow)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-width="10"/>`;
    const frac = it.v / max;
    if (frac > 0) {
      const len = Math.max(2, C * frac);
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#gh-gauge)" `
        + `stroke-width="10" stroke-linecap="round" `
        + `stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" `
        + `transform="rotate(-90 ${cx} ${cy})"/>`;
    }
    s += txt(cx, cy + 10, String(it.v), {
      font: 'display', size: 38, fill: t.ink, anchor: 'middle',
    });
    s += txt(cx, cy + 34, it.k, {
      font: 'mono', size: 11, fill: t.muted, anchor: 'middle', ls: 1.2,
    });
  });

  s += rule(48, 282, 1152, t, { grad: 'gh-foot', w: 1, opacity: 0 });
  s += txt(48, 296, 'DATA: data/stats.json  ·  REFRESHED DAILY', {
    font: 'mono', size: 11, fill: t.muted, ls: 1,
  });
  return svgRoot(w, h, 'GitHub live metrics', s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: LEETCODE (1200 x 320) — solved number + stacked ring + rank + streak   */
/* -------------------------------------------------------------------------- */
function buildLiveLeetcode(t) {
  const w = 1200, h = 320;
  const L = stats.leetcode;
  const cx = 200, cy = 164, r = 92, C = 2 * Math.PI * r;

  let d = defs(
    grad('leet-rule', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    radial('leet-wash', [{ o: '0%', c: t.violet, a: 0.20 }, { o: '100%', c: t.violet, a: 0 }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);
  s += txt(48, 52, 'LEETCODE / PROBLEM SOLVING', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  s += `<circle cx="${cx}" cy="${cy}" r="${r + 26}" fill="url(#leet-wash)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-width="18"/>`;
  const segs = [
    { v: L.easy, c: t.cyan },
    { v: L.medium, c: t.violet },
    { v: L.hard, c: t.lime },
  ];
  const total = Math.max(1, L.solved);
  let acc = 0;
  for (const seg of segs) {
    const len = C * (seg.v / total);
    if (len <= 0) continue;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.c}" `
      + `stroke-width="18" stroke-linecap="butt" `
      + `stroke-dasharray="${Math.max(0, len - 3).toFixed(1)} ${C.toFixed(1)}" `
      + `stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acc += len;
  }
  s += txt(cx, cy + 12, String(L.solved), {
    font: 'display', size: 56, fill: t.ink, anchor: 'middle',
  });
  s += txt(cx, cy + 40, 'SOLVED', { font: 'mono', size: 11, fill: t.muted, anchor: 'middle', ls: 2 });

  // Difficulty legend.
  const legend = [
    { k: 'EASY', v: L.easy, c: t.cyan },
    { k: 'MEDIUM', v: L.medium, c: t.violet },
    { k: 'HARD', v: L.hard, c: t.lime },
  ];
  legend.forEach((row, i) => {
    const y = 116 + i * 40;
    s += `<circle cx="356" cy="${y - 4}" r="5" fill="${row.c}"/>`;
    s += txt(372, y, row.k, { font: 'mono', size: 12, fill: t.muted, ls: 1.4 });
    s += txt(520, y, String(row.v), { font: 'display', size: 22, fill: t.ink, anchor: 'end' });
  });

  // Divider.
  s += `<line x1="580" y1="92" x2="580" y2="248" stroke="${t.border}" stroke-width="1"/>`;

  // Rank + streak.
  const stats2 = [
    { k: 'GLOBAL RANK', v: String(L.rank), x: 640 },
    { k: 'DAY STREAK', v: String(L.streak), x: 910 },
  ];
  stats2.forEach((b) => {
    s += txt(b.x, 136, b.k, { font: 'mono', size: 12, fill: t.cyanText, ls: 1.6 });
    s += txt(b.x, 202, b.v, { font: 'display', size: 52, fill: t.ink });
  });
  s += rule(48, 284, 1152, t, { grad: 'leet-rule', w: 1, opacity: 0 });
  s += txt(48, 298, 'DATA: data/stats.json  ·  EASY / MEDIUM / HARD BREAKDOWN', {
    font: 'mono', size: 11, fill: t.muted, ls: 1,
  });
  return svgRoot(w, h, 'LeetCode live metrics', s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: ACTIVITY (1200 x 320) — dated rows with gradient ticks               */
/* -------------------------------------------------------------------------- */
function buildLiveActivity(t) {
  const w = 1200, h = 320;
  const items = profile.activity.slice(0, 6);

  let d = defs(
    grad('act-tick', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
    grad('act-rule', 0, 0, 1, 0, [{ o: '0%', c: t.violet }, { o: '100%', c: t.cyan }]),
  );
  let s = d + backdrop(t, w, h);
  s += panel(8, 8, w - 16, h - 16, t);
  s += txt(48, 50, 'RECENT ACTIVITY', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  const firstY = 92, step = 34;
  items.forEach((a, i) => {
    const y = firstY + i * step;
    s += txt(164, y + 5, a.date, { font: 'mono', size: 12, fill: t.cyanText, anchor: 'end', ls: 1 });
    s += `<rect x="184" y="${y - 2}" width="26" height="5" rx="2.5" fill="url(#act-tick)" `
      + `opacity="${(0.95 - i * 0.09).toFixed(2)}"/>`;
    s += txt(224, y + 5, a.text, { font: 'body', size: 16, fill: t.ink });
    if (i < items.length - 1) {
      s += `<line x1="164" y1="${y + 17}" x2="1152" y2="${y + 17}" stroke="${t.border}" stroke-width="1" opacity="0.6"/>`;
    }
  });
  s += rule(48, 298, 1152, t, { grad: 'act-rule', w: 1, opacity: 0 });
  return svgRoot(w, h, 'Recent activity log', s);
}

/* -------------------------------------------------------------------------- */
/* GENERATE ALL ASSETS                                                        */
/* -------------------------------------------------------------------------- */

// Remove legacy v1 artifacts so a re-run never leaves stale files behind.
fs.rmSync(path.join(ASSETS, 'ttt'), { recursive: true, force: true });
if (fs.existsSync(ASSETS)) {
  for (const f of fs.readdirSync(ASSETS)) {
    if (/^header-play-.*\.svg$/.test(f)) fs.rmSync(path.join(ASSETS, f), { force: true });
  }
}

const socialByKey = Object.fromEntries(profile.socials.map(s => [s.key, s]));

for (const mode of ['light', 'dark']) {
  const t = theme(mode);
  const V = `-${mode}.svg`;

  write(`hero${V}`, buildHero(t));
  write(`footer${V}`, buildFooter(t));

  HEADERS.forEach((cfg, i) => write(`header-${cfg.key}${V}`, buildHeader(t, cfg, i)));

  for (const key of BUTTON_ORDER) {
    const soc = socialByKey[key];
    const label = soc ? soc.label : key.charAt(0).toUpperCase() + key.slice(1);
    write(`button-${key}${V}`, buildButton(t, key, label));
  }

  write(`card-about${V}`, buildCardAbout(t));
  write(`card-now${V}`, buildCardNow(t));
  write(`card-toolbox${V}`, buildCardToolbox(t));
  write(`card-milestones${V}`, buildCardMilestones(t));

  for (let i = 0; i < 4; i++) {
    const fallback = {
      name: `Project ${i + 1}`,
      desc: 'Project description coming soon.',
      tags: ['Code'],
      metric: '—',
    };
    write(`project-${i + 1}${V}`, buildProject(t, profile.projects[i] || fallback, i));
  }

  write(`live-github${V}`, buildLiveGithub(t));
  write(`live-leetcode${V}`, buildLiveLeetcode(t));
  write(`live-activity${V}`, buildLiveActivity(t));
}

console.log(`AETHER assets: generated ${written} SVG files in ${ASSETS}`);
