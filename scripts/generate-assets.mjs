#!/usr/bin/env node
/**
 * generate-assets.mjs
 * ---------------------------------------------------------------------------
 * Dependency-free (Node built-ins only) asset generator for the
 * "ORBIT // dev console" GitHub profile.
 *
 * INPUTS  (read-only):
 *   data/profile.json  -> all personal content (hero, socials, about, now,
 *                         projects, toolbox, milestones, activity, footer)
 *   data/stats.json    -> numeric github + leetcode stats
 *
 * OUTPUTS (idempotent; safe to re-run):
 *   assets/<base>-light.svg and assets/<base>-dark.svg for every base in the
 *   manifest from ARCHITECTURE.md: hero, footer, 10 headers, 6 buttons,
 *   4 info cards, 4 project cards, 3 live stat cards, and 5 ttt tiles.
 *
 * Both themes share identical layout; only background/text/line colors swap.
 * Accent swatches (cyan / violet / amber) stay identical across themes.
 * No fonts are embedded -- only CSS font stacks are referenced.
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
/* Font stacks                                                                 */
/* -------------------------------------------------------------------------- */
const FONT_H = 'Inter, system-ui, -apple-system, sans-serif';
const FONT_M = 'ui-monospace, SFMono-Regular, \'JetBrains Mono\', Consolas, monospace';

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */
function theme(mode) {
  const common = {
    // Accents stay identical in both themes.
    cyan: '#38E1FF',
    violet: '#B98CFF',
    amber: '#FFC978',
  };
  if (mode === 'dark') {
    return {
      ...common,
      bg: '#070B19',
      bg2: '#0F1730',
      panel: '#0F1730',
      panel2: '#16204A',
      text: '#E8EEFF',
      muted: '#8FA0C8',
      faint: '#62749F',
      grid: '#1E2A4A',
      stroke: '#26345E',
      accentText: '#38E1FF', // readable accent-colored text on dark
    };
  }
  return {
    ...common,
    bg: '#F3F6FF',
    bg2: '#E8EEFC',
    panel: '#FFFFFF',
    panel2: '#EEF3FF',
    text: '#111B36',
    muted: '#4B5D87',
    faint: '#7E8CB0',
    grid: '#D5DEF2',
    stroke: '#C4D0EC',
    accentText: '#0B7E9C', // contrast-safe cyan for text on light
  };
}

/* -------------------------------------------------------------------------- */
/* Generic helpers                                                             */
/* -------------------------------------------------------------------------- */

// Escape every character that is special in XML text/attributes.
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Strip markdown backticks from display strings, then escape.
function clean(v) {
  return esc(String(v ?? '').replace(/`/g, ''));
}

// Greedy word wrap by character count. Long tokens are hard-split.
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

// Root element: always xmlns + viewBox + width + height + <title>.
function svgRoot(w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">`
    + `<title>${esc(title)}</title>`
    + body
    + `</svg>\n`;
}

// Text element with consistent font handling.
function txt(x, y, str, o = {}) {
  const a = [
    `x="${x}"`,
    `y="${y}"`,
    `fill="${o.fill}"`,
    `font-family="${o.font === 'mono' ? FONT_M : FONT_H}"`,
    `font-size="${o.size ?? 16}"`,
    `font-weight="${o.weight ?? 400}"`,
  ];
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.ls != null) a.push(`letter-spacing="${o.ls}"`);
  if (o.opacity != null) a.push(`opacity="${o.opacity}"`);
  if (o.style) a.push(`font-style="${o.style}"`);
  return `<text ${a.join(' ')}>${esc(str)}</text>`;
}

// Thin rule with a soft glow halo beneath it.
function rule(x1, y, x2, t, o = {}) {
  const c = o.color || t.cyan;
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="${o.w ?? 1.6}" opacity="${o.opacity ?? 0.8}"/>`
    + `<line x1="${x1}" y1="${y + 3}" x2="${x2}" y2="${y + 3}" stroke="${c}" stroke-width="7" opacity="0.10"/>`;
}

// Full-bleed background with faint dot grid.
function backdrop(t, w, h, o = {}) {
  const id = o.id || 'bg';
  let s = `<rect width="${w}" height="${h}" fill="${t.bg}"/>`;
  if (o.dots !== false) {
    s += `<defs><pattern id="${id}-dots" width="26" height="26" patternUnits="userSpaceOnUse">`
      + `<circle cx="1" cy="1" r="1" fill="${t.grid}"/></pattern></defs>`;
    s += `<rect width="${w}" height="${h}" fill="url(#${id}-dots)" opacity="0.6"/>`;
  }
  return s;
}

// Rounded panel (card surface).
function panel(x, y, w, h, t, o = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 18}" `
    + `fill="${o.fill || t.panel}" stroke="${o.stroke || t.stroke}" stroke-width="${o.sw ?? 1.5}"/>`;
}

// Concentric orbital rings + a few nodes + a glowing core.
function orbits(cx, cy, t, o = {}) {
  const radii = o.radii || [66, 104, 144, 186];
  const palette = [t.cyan, t.violet, t.amber, t.cyan];
  let s = '<g fill="none">';
  radii.forEach((r, i) => {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${palette[i % 4]}" `
      + `stroke-width="${i === 0 ? 1.6 : 1}" opacity="${Math.max(0.10, 0.32 - i * 0.055).toFixed(3)}"/>`;
  });
  s += '</g>';
  const nodes = o.nodes || [
    { a: -35, r: radii[1] || 104, c: t.cyan },
    { a: 120, r: radii[2] || 144, c: t.violet },
    { a: 205, r: radii[3] || 186, c: t.amber },
  ];
  for (const n of nodes) {
    const rad = (n.a * Math.PI) / 180;
    const x = (cx + Math.cos(rad) * n.r).toFixed(1);
    const y = (cy + Math.sin(rad) * n.r).toFixed(1);
    s += `<circle cx="${x}" cy="${y}" r="4" fill="${n.c}" opacity="0.9"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="24" fill="${t.cyan}" opacity="0.12"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="11" fill="${t.cyan}" opacity="0.9"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="4" fill="${t.bg}"/>`;
  return s;
}

// Small pill chip (skills / tags). Returns markup and its computed width.
function chip(x, y, label, t, o = {}) {
  const fs = o.size ?? 13;
  const h = o.h ?? 28;
  const w = Math.round(label.length * fs * 0.62 + 24);
  const c = o.color || t.cyan;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" `
    + `fill="${c}" opacity="0.10" stroke="${c}" stroke-opacity="0.45"/>`;
  s += txt(x + 12, y + h / 2 + fs * 0.35, label, {
    fill: o.textFill || t.text, font: 'mono', size: fs,
  });
  return { svg: s, w };
}

// Lay a list of chip labels out into rows that fit a given width.
function chipRows(items, maxW) {
  const rows = [];
  let row = [];
  let used = 0;
  const gap = 8;
  for (const it of items) {
    const w = Math.round(it.length * 13 * 0.62 + 24);
    if (row.length && used + gap + w > maxW) {
      rows.push(row);
      row = [];
      used = 0;
    }
    used += w + (row.length ? gap : 0);
    row.push({ label: it, w });
  }
  if (row.length) rows.push(row);
  return rows;
}

// Minimal, original line-art social icons.
function icon(kind, cx, cy, color) {
  const g = (inner) => `<g transform="translate(${cx},${cy})" fill="none" stroke="${color}" `
    + `stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'github':
      return g(`<circle cx="0" cy="1" r="9"/>`
        + `<circle cx="-4.5" cy="-7" r="2.6" fill="${color}" stroke="none"/>`
        + `<circle cx="4.5" cy="-7" r="2.6" fill="${color}" stroke="none"/>`
        + `<circle cx="-3" cy="-1" r="1.1" fill="${color}" stroke="none"/>`
        + `<circle cx="3" cy="-1" r="1.1" fill="${color}" stroke="none"/>`
        + `<path d="M-3 4 q3 3 6 0"/>`);
    case 'linkedin':
      return g(`<rect x="-10" y="-10" width="20" height="20" rx="4"/>`
        + `<text x="0" y="5" text-anchor="middle" fill="${color}" stroke="none" `
        + `font-family="${FONT_M}" font-size="11" font-weight="700">in</text>`);
    case 'youtube':
      return g(`<rect x="-11" y="-7.5" width="22" height="15" rx="4"/>`
        + `<path d="M-3 -3.5 L5 0 L-3 3.5 Z" fill="${color}" stroke="none"/>`);
    case 'leetcode':
      return g(`<path d="M-3 -7 L-9 0 L-3 7"/><path d="M3 -7 L9 0 L3 7"/>`
        + `<line x1="-1.5" y1="0" x2="1.5" y2="0"/>`);
    case 'x':
      return g(`<line x1="-8" y1="-8" x2="8" y2="8" stroke-width="2.4"/>`
        + `<line x1="8" y1="-8" x2="-8" y2="8" stroke-width="2.4"/>`);
    case 'email':
      return g(`<rect x="-11" y="-7.5" width="22" height="15" rx="2"/>`
        + `<path d="M-11 -6 L0 2 L11 -6"/>`);
    default:
      return g(`<circle cx="0" cy="0" r="7"/>`);
  }
}

// Write a generated SVG to disk, creating parent directories as needed.
function write(name, svg) {
  const dest = path.join(ASSETS, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, svg, 'utf8');
  written += 1;
}

/* -------------------------------------------------------------------------- */
/* Shared section titles                                                       */
/* -------------------------------------------------------------------------- */
function sectionTitle(t, label, color, x = 40, y = 46) {
  return `<rect x="${x - 2}" y="${y - 20}" width="4" height="26" rx="2" fill="${color}"/>`
    + txt(x + 14, y, label, { font: 'mono', size: 13, fill: t.accentText, ls: 2 });
}

/* -------------------------------------------------------------------------- */
/* HERO (1200 x 430)                                                           */
/* -------------------------------------------------------------------------- */
function buildHero(t) {
  const w = 1200;
  const h = 430;
  const H = profile.hero;
  let s = backdrop(t, w, h, { id: 'hero' });
  s += orbits(965, 205, t, { radii: [66, 104, 144, 186] });

  // Corner brackets for the "console" frame.
  for (const [bx, by, dx, dy] of [
    [24, 24, 1, 1], [1176, 24, -1, 1], [24, 406, 1, -1], [1176, 406, -1, -1],
  ]) {
    s += `<path d="M${bx + dx * 16} ${by} H${bx} V${by + dy * 16}" fill="none" `
      + `stroke="${t.cyan}" stroke-width="2" opacity="0.45"/>`;
  }

  s += txt(56, 52, '// ORBIT — DEV CONSOLE', { font: 'mono', size: 13, fill: t.accentText, ls: 2 });
  s += txt(1144, 52, 'PROFILE / 00', { font: 'mono', size: 12, fill: t.muted, anchor: 'end', ls: 1 });

  s += txt(56, 152, H.name, { size: 66, weight: 800, fill: t.text, ls: 1 });
  s += rule(56, 176, 720, t, { color: t.cyan, w: 2, opacity: 0.9 });
  s += txt(56, 220, H.role, { size: 26, weight: 600, fill: t.violet });
  s += txt(56, 262, H.tagline, { size: 20, fill: t.muted });

  const pillW = Math.round(H.status.length * 8.3 + 52);
  s += `<rect x="56" y="292" width="${pillW}" height="40" rx="20" fill="${t.amber}" `
    + `opacity="0.10" stroke="${t.amber}" stroke-opacity="0.55"/>`;
  s += `<circle cx="78" cy="312" r="6" fill="${t.amber}"/>`;
  s += txt(94, 318, H.status, { font: 'mono', size: 14, fill: t.text, ls: 1 });

  s += txt(56, 386, `⌖ ${H.coordinates}`, { font: 'mono', size: 14, fill: t.faint, ls: 1 });
  s += txt(1144, 386, 'ORBIT // v1.0', { font: 'mono', size: 12, fill: t.faint, anchor: 'end' });
  return svgRoot(w, h, `${H.name} — ${H.role}`, s);
}

/* -------------------------------------------------------------------------- */
/* FOOTER (1200 x 120)                                                         */
/* -------------------------------------------------------------------------- */
function buildFooter(t) {
  const w = 1200;
  const h = 120;
  let s = backdrop(t, w, h, { id: 'foot', dots: false });
  s += `<line x1="0" y1="2" x2="${w}" y2="2" stroke="${t.violet}" stroke-width="2" opacity="0.6"/>`;
  s += orbits(62, 62, t, { radii: [16, 26, 36] });
  s += txt(122, 56, profile.footer, { size: 18, weight: 500, fill: t.text });
  s += txt(122, 84, `© 2026 ${profile.user.toUpperCase()} · ORBIT // DEV CONSOLE`, {
    font: 'mono', size: 12, fill: t.muted, ls: 1,
  });
  s += txt(1144, 68, `@${profile.user}`, { font: 'mono', size: 14, fill: t.accentText, anchor: 'end' });
  return svgRoot(w, h, `${profile.user} — footer`, s);
}

/* -------------------------------------------------------------------------- */
/* HEADERS (1200 x 92)                                                         */
/* -------------------------------------------------------------------------- */
const HEADERS = [
  { key: 'about',            title: 'ABOUT',            kicker: '// 01 — IDENTITY' },
  { key: 'now',              title: 'NOW',              kicker: '// 02 — CURRENT STATE' },
  { key: 'work',             title: 'WORK',             kicker: '// 03 — SELECTED PROJECTS' },
  { key: 'toolbox',          title: 'TOOLBOX',          kicker: '// 04 — STACK & TOOLS' },
  { key: 'milestones',       title: 'EXPERIENCE',       kicker: '// 05 — RESEARCH & ACHIEVEMENTS' },
  { key: 'contributions',    title: 'CONTRIBUTIONS',    kicker: '// 06 — LIVE METRICS' },
  { key: 'problem-solving',  title: 'PROBLEM SOLVING',  kicker: '// 07 — ALGORITHMS' },
  { key: 'play',             title: 'PLAY',             kicker: '// 08 — TIC TAC TOE' },
  { key: 'activity',         title: 'ACTIVITY',         kicker: '// 09 — RECENT LOG' },
  { key: 'contact',          title: 'CONTACT',          kicker: '// 10 — SAY HELLO' },
];
const HEADER_ACCENTS = [t => t.cyan, t => t.violet, t => t.amber];

function buildHeader(t, cfg, index) {
  const w = 1200;
  const h = 92;
  const accent = HEADER_ACCENTS[index % 3](t);
  let s = backdrop(t, w, h, { id: 'hdr' });
  s += `<rect x="0" y="0" width="6" height="${h}" fill="${accent}"/>`;
  s += txt(40, 61, String(index + 1).padStart(2, '0'), {
    font: 'mono', size: 38, weight: 700, fill: t.accentText, ls: -1,
  });
  s += txt(108, 33, cfg.kicker, { font: 'mono', size: 12, fill: t.muted, ls: 1.5 });
  s += txt(108, 68, cfg.title, { size: 30, weight: 750, fill: t.text, ls: 0.6 });
  s += rule(108, 80, 1140, t, { color: accent, w: 1.5, opacity: 0.75 });
  s += `<circle cx="1160" cy="46" r="10" fill="none" stroke="${accent}" stroke-opacity="0.4"/>`;
  s += `<circle cx="1160" cy="46" r="4" fill="${accent}"/>`;
  return svgRoot(w, h, `${cfg.title} — section ${index + 1}`, s);
}

/* -------------------------------------------------------------------------- */
/* BUTTONS (180 x 52)                                                          */
/* -------------------------------------------------------------------------- */
const BUTTON_ORDER = ['github', 'linkedin', 'youtube', 'leetcode', 'email', 'x'];
const BUTTON_COLORS = {
  github: 'cyan', linkedin: 'cyan', youtube: 'amber',
  leetcode: 'amber', email: 'violet', x: 'violet',
};

function buildButton(t, soc) {
  const w = 180;
  const h = 52;
  const color = t[BUTTON_COLORS[soc.key]];
  let s = `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" `
    + `fill="${t.panel}" stroke="${t.stroke}" stroke-width="1.5"/>`;
  s += `<rect x="1" y="1" width="4" height="${h - 2}" rx="2" fill="${color}"/>`;
  s += icon(soc.key, 30, 26, color);
  s += txt(52, 32, soc.label, { size: 16, weight: 600, fill: t.text });
  return svgRoot(w, h, `${soc.label} link`, s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: ABOUT                                                            */
/* -------------------------------------------------------------------------- */
function buildCardAbout(t) {
  const w = 1200;
  const h = 310;
  let s = backdrop(t, w, h, { id: 'about' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// ABOUT — IDENTITY', t.cyan);

  let y = 90;
  for (const line of profile.about.lines) {
    for (const ln of wrap(line, 104)) {
      s += txt(40, y, ln, { size: 18, fill: t.text });
      y += 28;
    }
  }
  s += rule(40, y + 4, w - 40, t, { color: t.violet, w: 1, opacity: 0.35 });

  const facts = profile.about.facts;
  const colW = (w - 80) / facts.length;
  facts.forEach((f, i) => {
    const x = 40 + i * colW;
    s += txt(x, y + 46, f.k, { font: 'mono', size: 12, fill: t.amber, ls: 1.5 });
    s += txt(x, y + 74, f.v, { size: 18, weight: 600, fill: t.text });
  });
  return svgRoot(w, h, 'About — identity', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: NOW (status console)                                             */
/* -------------------------------------------------------------------------- */
function buildCardNow(t) {
  const w = 1200;
  const h = 300;
  const N = profile.now;
  let s = backdrop(t, w, h, { id: 'now' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// NOW — CURRENT STATE', t.violet);

  // "NOW PLAYING" banner with a small equalizer.
  s += `<rect x="40" y="60" width="184" height="32" rx="8" fill="${t.amber}" `
    + `opacity="0.10" stroke="${t.amber}" stroke-opacity="0.5"/>`;
  s += `<path d="M55 70 L65 76 L55 82 Z" fill="${t.amber}"/>`;
  s += txt(76, 82, 'NOW PLAYING', { font: 'mono', size: 13, fill: t.accentText, ls: 1.4 });
  [10, 18, 28, 14, 22].forEach((bh, i) => {
    s += `<rect x="${240 + i * 8}" y="${82 - bh / 2}" width="4" height="${bh}" rx="2" `
      + `fill="${t.cyan}" opacity="${0.5 + i * 0.08}"/>`;
  });
  s += rule(40, 106, w - 40, t, { color: t.violet, w: 1, opacity: 0.35 });

  // Left: BUILDING + progress.
  s += txt(40, 136, '▸ BUILDING', { font: 'mono', size: 12, fill: t.cyan, ls: 1.5 });
  let y = 166;
  for (const ln of wrap(N.building, 60, 2)) { s += txt(40, y, ln, { size: 19, fill: t.text }); y += 27; }
  s += `<rect x="40" y="222" width="500" height="8" rx="4" fill="${t.grid}"/>`;
  s += `<rect x="40" y="222" width="310" height="8" rx="4" fill="${t.cyan}"/>`;

  // Right: LEARNING + LISTENING.
  s += txt(600, 136, '▸ LEARNING', { font: 'mono', size: 12, fill: t.violet, ls: 1.5 });
  y = 166;
  for (const ln of wrap(N.learning, 62, 2)) { s += txt(600, y, ln, { size: 19, fill: t.text }); y += 27; }
  s += txt(600, 236, '▸ LISTENING', { font: 'mono', size: 12, fill: t.amber, ls: 1.5 });
  for (const ln of wrap(N.listening, 62, 1)) { s += txt(600, 264, ln, { size: 17, fill: t.muted }); }

  // Note strip.
  s += `<rect x="40" y="266" width="4" height="22" rx="2" fill="${t.violet}"/>`;
  s += txt(54, 282, N.note, { size: 15, fill: t.muted, style: 'italic' });
  return svgRoot(w, h, 'Now — current state', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: TOOLBOX                                                          */
/* -------------------------------------------------------------------------- */
function buildCardToolbox(t) {
  const w = 1200;
  const ACCENTS = [t.cyan, t.violet, t.amber, t.cyan];
  const groups = profile.toolbox;
  const colW = (w - 80) / groups.length;
  const allRows = groups.map(g => chipRows(g.items, colW - 16));
  const maxRows = Math.max(...allRows.map(r => r.length));
  const h = Math.max(220, 132 + maxRows * 38 + 16);

  let s = backdrop(t, w, h, { id: 'toolbox' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// TOOLBOX — STACK & TOOLS', t.cyan);

  groups.forEach((g, gi) => {
    const x = 40 + gi * colW;
    const color = ACCENTS[gi % ACCENTS.length];
    s += rule(x, 76, x + colW - 24, t, { color, w: 1, opacity: 0.5 });
    s += txt(x, 100, g.group, { font: 'mono', size: 12, fill: t.accentText, ls: 1.5 });
    allRows[gi].forEach((row, ri) => {
      let cx = x;
      const cy = 116 + ri * 38;
      for (const c of row) {
        s += chip(cx, cy, c.label, t, { color }).svg;
        cx += c.w + 8;
      }
    });
  });
  return svgRoot(w, h, 'Toolbox — stack and tools', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: MILESTONES                                                       */
/* -------------------------------------------------------------------------- */
function buildCardMilestones(t) {
  const w = 1200;
  const items = profile.milestones;
  const h = Math.max(380, 150 + items.length * 56);
  let s = backdrop(t, w, h, { id: 'mile' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// MILESTONES — TIMELINE', t.amber);

  const lineX = 152;
  const firstY = 112;
  s += `<line x1="${lineX}" y1="${firstY}" x2="${lineX}" y2="${firstY + (items.length - 1) * 56}" `
    + `stroke="${t.violet}" stroke-width="2" opacity="0.45"/>`;
  items.forEach((m, i) => {
    const y = firstY + i * 56;
    s += txt(128, y + 5, m.date, { font: 'mono', size: 13, fill: t.amber, anchor: 'end' });
    s += `<circle cx="${lineX}" cy="${y}" r="7" fill="${t.bg}" stroke="${t.violet}" stroke-width="3"/>`;
    s += txt(178, y, m.title, { size: 19, weight: 700, fill: t.text });
    s += txt(178, y + 22, m.detail, { size: 15, fill: t.muted });
  });
  return svgRoot(w, h, 'Milestones — timeline', s);
}

/* -------------------------------------------------------------------------- */
/* PROJECT CARDS (580 x 270)                                                   */
/* -------------------------------------------------------------------------- */
function buildProject(t, p, i) {
  const w = 580;
  const h = 270;
  const accent = [t.cyan, t.violet, t.amber, t.cyan][i % 4];
  let s = backdrop(t, w, h, { id: `proj${i}` });
  s += panel(6, 6, w - 12, h - 12, t, { r: 16 });
  s += `<rect x="6" y="20" width="4" height="${h - 40}" rx="2" fill="${accent}" opacity="0.8"/>`;

  s += txt(28, 34, `${String(i + 1).padStart(2, '0')} / PROJECT`, {
    font: 'mono', size: 12, fill: t.accentText, ls: 1.6,
  });
  s += txt(548, 36, '↗', { size: 26, fill: accent, anchor: 'end' });
  s += txt(28, 84, p.name, { size: 36, weight: 800, fill: t.text, ls: 0.5 });

  let y = 118;
  for (const ln of wrap(p.desc, 58, 3)) { s += txt(28, y, ln, { size: 16, fill: t.muted }); y += 24; }

  s += rule(28, 214, 552, t, { color: accent, w: 1, opacity: 0.35 });
  let cx = 28;
  for (const tag of p.tags) {
    const c = chip(cx, 226, tag, t, { color: accent, size: 12, h: 26 });
    s += c.svg;
    cx += c.w + 8;
  }
  s += txt(28, 258, `◆ ${p.metric}`, { font: 'mono', size: 13, fill: t.amber, ls: 0.5 });
  return svgRoot(w, h, `${p.name} — ${p.metric}`, s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: GITHUB (1200 x 300)                                                   */
/* -------------------------------------------------------------------------- */
function buildLiveGithub(t) {
  const w = 1200;
  const h = 300;
  const g = stats.github;
  const items = [
    { k: 'FOLLOWERS', v: g.followers, c: t.cyan },
    { k: 'FOLLOWING', v: g.following, c: t.violet },
    { k: 'REPOSITORIES', v: g.repos, c: t.amber },
    { k: 'TOTAL STARS', v: g.stars, c: t.cyan },
    { k: 'CONTRIBUTIONS', v: g.contributions, c: t.violet },
  ];
  const max = Math.max(1, ...items.map(i => i.v));
  let s = backdrop(t, w, h, { id: 'livegh' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// GITHUB — LIVE METRICS', t.cyan);

  const colW = (w - 80) / items.length;
  items.forEach((it, i) => {
    const x = 40 + i * colW;
    s += txt(x, 160, String(it.v), { size: 50, weight: 800, fill: t.accentText });
    s += txt(x, 190, it.k, { font: 'mono', size: 12, fill: t.muted, ls: 1.3 });
    s += `<rect x="${x}" y="214" width="${colW - 44}" height="8" rx="4" fill="${t.grid}"/>`;
    const fw = Math.max(6, Math.round((colW - 44) * (it.v / max)));
    s += `<rect x="${x}" y="214" width="${fw}" height="8" rx="4" fill="${it.c}"/>`;
  });
  s += txt(40, 268, 'DATA: data/stats.json  ·  REFRESHED DAILY', {
    font: 'mono', size: 11, fill: t.faint, ls: 1,
  });
  return svgRoot(w, h, 'GitHub live metrics', s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: LEETCODE (1200 x 300)                                                 */
/* -------------------------------------------------------------------------- */
function buildLiveLeetcode(t) {
  const w = 1200;
  const h = 300;
  const L = stats.leetcode;
  let s = backdrop(t, w, h, { id: 'liveleet' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// LEETCODE — PROBLEM SOLVING', t.amber);

  // Solved breakdown ring.
  const cx = 168;
  const cy = 172;
  const r = 80;
  const circ = 2 * Math.PI * r;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.grid}" stroke-width="16"/>`;
  if (L.solved > 0) {
    const segs = [
      { v: L.easy, c: t.cyan },
      { v: L.medium, c: t.violet },
      { v: L.hard, c: t.amber },
    ];
    let acc = 0;
    for (const seg of segs) {
      const len = circ * (seg.v / L.solved);
      if (len <= 0) continue;
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.c}" `
        + `stroke-width="16" stroke-dasharray="${Math.max(0, len - 3).toFixed(1)} ${circ.toFixed(1)}" `
        + `stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      acc += len;
    }
  }
  s += txt(cx, cy + 6, String(L.solved), { size: 46, weight: 800, fill: t.text, anchor: 'middle' });
  s += txt(cx, cy + 30, 'SOLVED', { font: 'mono', size: 11, fill: t.muted, anchor: 'middle', ls: 2 });

  // Easy / Medium / Hard rows.
  const rows = [
    { k: 'EASY', v: L.easy, c: t.cyan },
    { k: 'MEDIUM', v: L.medium, c: t.violet },
    { k: 'HARD', v: L.hard, c: t.amber },
  ];
  const rowMax = Math.max(1, L.easy, L.medium, L.hard);
  rows.forEach((row, i) => {
    const y = 122 + i * 50;
    s += txt(300, y, row.k, { font: 'mono', size: 13, fill: t.accentText, ls: 1.5 });
    s += txt(660, y + 2, String(row.v), { size: 24, weight: 700, fill: t.text, anchor: 'end' });
    s += `<rect x="300" y="${y + 12}" width="360" height="7" rx="3.5" fill="${t.grid}"/>`;
    s += `<rect x="300" y="${y + 12}" width="${Math.max(6, Math.round(360 * row.v / rowMax))}" `
      + `height="7" rx="3.5" fill="${row.c}"/>`;
  });

  // Rank + streak boxes.
  const boxes = [
    { k: 'GLOBAL RANK', v: String(L.rank), x: 710, c: t.violet },
    { k: 'DAY STREAK', v: String(L.streak), x: 950, c: t.amber },
  ];
  for (const b of boxes) {
    s += `<rect x="${b.x}" y="110" width="220" height="118" rx="14" fill="${t.panel2}" `
      + `stroke="${t.stroke}" stroke-width="1.2"/>`;
    s += txt(b.x + 20, 140, b.k, { font: 'mono', size: 11, fill: t.muted, ls: 1.4 });
    s += txt(b.x + 20, 192, b.v, { size: 40, weight: 800, fill: b.c });
  }
  s += txt(40, 268, 'DATA: data/stats.json  ·  EASY / MEDIUM / HARD BREAKDOWN', {
    font: 'mono', size: 11, fill: t.faint, ls: 1,
  });
  return svgRoot(w, h, 'LeetCode live metrics', s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: ACTIVITY (1200 x 310)                                                 */
/* -------------------------------------------------------------------------- */
function buildLiveActivity(t) {
  const w = 1200;
  const items = profile.activity;
  const h = Math.max(310, 130 + items.length * 36);
  let s = backdrop(t, w, h, { id: 'liveact' });
  s += panel(8, 8, w - 16, h - 16, t);
  s += sectionTitle(t, '// ACTIVITY — RECENT LOG', t.cyan);

  const firstY = 96;
  s += `<line x1="136" y1="${firstY}" x2="136" y2="${firstY + (items.length - 1) * 36}" `
    + `stroke="${t.cyan}" stroke-width="2" opacity="0.4"/>`;
  items.forEach((a, i) => {
    const y = firstY + i * 36;
    s += txt(124, y + 5, a.date, { font: 'mono', size: 12, fill: t.amber, anchor: 'end' });
    s += `<circle cx="136" cy="${y}" r="5" fill="${t.bg}" stroke="${t.cyan}" stroke-width="2.5"/>`;
    s += `<text x="160" y="${y + 5}" fill="${t.text}" font-family="${FONT_H}" font-size="17">${clean(a.text)}</text>`;
  });
  return svgRoot(w, h, 'Recent activity log', s);
}

/* -------------------------------------------------------------------------- */
/* TIC-TAC-TOE TILES (88 x 88)                                                 */
/* -------------------------------------------------------------------------- */
function buildTile(t, kind) {
  const w = 88;
  const h = 88;
  const isWin = kind === 'x-win' || kind === 'o-win';
  const winColor = kind === 'x-win' ? t.cyan : t.violet;
  let s = `<rect x="1" y="1" width="86" height="86" rx="12" fill="${t.panel}" `
    + `stroke="${isWin ? winColor : t.stroke}" stroke-width="${isWin ? 2.5 : 1.5}" `
    + `stroke-opacity="${isWin ? 0.9 : 1}"/>`;

  if (isWin) {
    s += `<circle cx="44" cy="44" r="33" fill="none" stroke="${winColor}" stroke-width="2" `
      + `opacity="0.35"/>`;
    s += `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%">`
      + `<feGaussianBlur stdDeviation="3" result="b"/>`
      + `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`
      + `</filter></defs>`;
  }

  if (kind === 'empty') {
    s += `<rect x="15" y="15" width="58" height="58" rx="8" fill="none" `
      + `stroke="${t.stroke}" stroke-width="1.5" stroke-dasharray="6 6"/>`;
    s += `<circle cx="44" cy="44" r="3" fill="${t.faint}" opacity="0.5"/>`;
  }

  const filter = isWin ? ' filter="url(#glow)"' : '';
  if (kind === 'x' || kind === 'x-win') {
    s += `<g stroke="${t.cyan}" stroke-width="9" stroke-linecap="round"${filter}>`
      + `<line x1="27" y1="27" x2="61" y2="61"/><line x1="61" y1="27" x2="27" y2="61"/>`
      + `</g>`;
  }
  if (kind === 'o' || kind === 'o-win') {
    s += `<circle cx="44" cy="44" r="18" fill="none" stroke="${t.violet}" `
      + `stroke-width="9"${filter}/>`;
  }
  return svgRoot(w, h, `tic-tac-toe ${kind} tile`, s);
}

/* -------------------------------------------------------------------------- */
/* GENERATE ALL ASSETS                                                         */
/* -------------------------------------------------------------------------- */
const socialByKey = Object.fromEntries(profile.socials.map(s => [s.key, s]));

for (const mode of ['light', 'dark']) {
  const t = theme(mode);
  const V = `-${mode}.svg`;

  write(`hero${V}`, buildHero(t));
  write(`footer${V}`, buildFooter(t));

  HEADERS.forEach((cfg, i) => write(`header-${cfg.key}${V}`, buildHeader(t, cfg, i)));

  for (const key of BUTTON_ORDER) {
    write(`button-${key}${V}`, buildButton(t, socialByKey[key] || { key, label: key[0].toUpperCase() + key.slice(1) }));
  }

  write(`card-about${V}`, buildCardAbout(t));
  write(`card-now${V}`, buildCardNow(t));
  write(`card-toolbox${V}`, buildCardToolbox(t));
  write(`card-milestones${V}`, buildCardMilestones(t));

  profile.projects.slice(0, 4).forEach((p, i) => write(`project-${i + 1}${V}`, buildProject(t, p, i)));

  write(`live-github${V}`, buildLiveGithub(t));
  write(`live-leetcode${V}`, buildLiveLeetcode(t));
  write(`live-activity${V}`, buildLiveActivity(t));

  for (const kind of ['empty', 'x', 'o', 'x-win', 'o-win']) {
    write(`ttt/${kind}${V}`, buildTile(t, kind));
  }
}

console.log(`ORBIT assets: generated ${written} SVG files in ${ASSETS}`);
