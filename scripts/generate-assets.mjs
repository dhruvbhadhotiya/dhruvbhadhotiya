#!/usr/bin/env node
/**
 * generate-assets.mjs — IRON MAN / STARK (v3) SVG asset generator
 * ---------------------------------------------------------------------------
 * Regenerates every decorative SVG used by the GitHub profile README in the
 * IRON MAN / STARK design system: deep armor red + champagne gold + a single
 * arc-reactor cyan light source. Two accents only (red + gold); no violet,
 * no green, no RGB confetti, no pure black, no flat fire-engine red.
 *
 * Dependency-free Node ESM: only node:fs / node:path / node:url are used.
 *
 * INPUTS (read-only)
 *   data/profile.json -> hero, socials, about, now, projects, toolbox,
 *                        milestones, activity, footer (all display copy)
 *   data/stats.json   -> github + leetcode numeric metrics
 *
 * OUTPUTS (idempotent; safe to re-run)
 *   assets/<base>-light.svg and assets/<base>-dark.svg for every base in the
 *   manifest below: hero, footer, 9 headers, 7 buttons (6 social + video),
 *   4 info cards, 8 project cards, 3 live stat cards => 33 bases x 2 = 66 SVGs.
 *   Legacy tic-tac-toe tiles (assets/ttt/), header-play-*.svg, and any
 *   project cards beyond project-8 are removed so a re-run leaves no stale files.
 *
 * Both themes share identical layout; only palette tokens swap. Text that is
 * red or gold ALWAYS uses redText / goldText (never raw red/gold) for contrast.
 * No JavaScript, no embedded fonts -- font stacks are referenced by name only,
 * with single quotes around spaced family names so XML attributes stay valid.
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
/* Theme — EXACT palette hex values from DESIGN.md (do not substitute)         */
/* -------------------------------------------------------------------------- */
function theme(mode) {
  if (mode === 'dark') {
    return {
      canvas: '#161312', canvasDeep: '#0E0C0C', surface: '#201A18', raised: '#2A221F',
      border: '#5A4A42', borderStrong: '#7A6257', ink: '#F5EFE9', muted: '#B6A79E',
      red: '#C62828', redDeep: '#B71C1C', redText: '#FF8373',
      gold: '#D4AF37', goldText: '#F2C94C',
      arcGlow: '#A8E6F0', signal: '#56D4DD',
    };
  }
  return {
    canvas: '#FFFFFF', canvasDeep: '#F0EBE6', surface: '#FBF7F3', raised: '#F3EBE4',
    border: '#B09B8F', borderStrong: '#9A8578', ink: '#2A1E1A', muted: '#6E5A50',
    red: '#C0392B', redDeep: '#96281B', redText: '#A61B12',
    gold: '#B8860B', goldText: '#7A5800',
    arcGlow: '#0E7490', signal: '#0E7490',
  };
}

/* -------------------------------------------------------------------------- */
/* Font stacks — single quotes for spaced names; never nested double quotes.   */
/* -------------------------------------------------------------------------- */
const FONT = {
  display: "Space Grotesk, 'Trebuchet MS', 'Segoe UI', sans-serif",
  body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
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

// Armor surface panel with optional gold rivets at the four corners
// (suit panel lines motif).
function panel(x, y, w, h, t, o = {}) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 12}" `
    + `fill="${o.fill || t.surface}" stroke="${o.stroke || t.border}" `
    + `stroke-width="${o.sw ?? 1.25}"/>`;
  if (o.rivets) {
    const inset = o.rivetInset ?? 18;
    for (const [rx, ry] of [
      [x + inset, y + inset], [x + w - inset, y + inset],
      [x + inset, y + h - inset], [x + w - inset, y + h - inset],
    ]) {
      s += `<circle cx="${rx}" cy="${ry}" r="2.6" fill="${t.gold}" opacity="0.85"/>`;
    }
  }
  return s;
}

// Horizontal rule: gradient (o.grad) or solid (o.color, default gold).
function rule(x1, y, x2, t, o = {}) {
  const stroke = o.grad ? `url(#${o.grad})` : (o.color || t.gold);
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" `
    + `stroke="${stroke}" stroke-width="${o.w ?? 1.5}" `
    + `stroke-linecap="round" opacity="${o.opacity ?? 0.85}"/>`;
}

// Linear gradient def. Optional gradientTransform enables anisotropic sheen.
function grad(id, x1, y1, x2, y2, stops, transform) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`
    + `${transform ? ` gradientTransform="${transform}"` : ''}>`
    + stops.map(s => `<stop offset="${s.o}" stop-color="${s.c}"`
        + `${s.a != null ? ` stop-opacity="${s.a}"` : ''}/>`).join('')
    + `</linearGradient>`;
}

// Radial gradient def (reactor/repulsor glow blobs).
function radial(id, stops) {
  return `<radialGradient id="${id}">`
    + stops.map(s => `<stop offset="${s.o}" stop-color="${s.c}"`
        + `${s.a != null ? ` stop-opacity="${s.a}"` : ''}/>`).join('')
    + `</radialGradient>`;
}

// Gaussian blur filter def for the single reactor light source.
function blur(id, sd) {
  return `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">`
    + `<feGaussianBlur stdDeviation="${sd}"/>`
    + `</filter>`;
}

// Anisotropic red field: deep red with a diagonal specular sheen (~125°).
function redSheen(id, t, angle = 125) {
  return grad(id, 0, 0, 1, 1, [
    { o: '0%', c: t.redDeep, a: 1 },
    { o: '36%', c: t.red, a: 1 },
    { o: '50%', c: '#FFFFFF', a: 0.13 },
    { o: '64%', c: t.red, a: 1 },
    { o: '100%', c: t.redDeep, a: 1 },
  ], `rotate(${angle} .5 .5)`);
}

// Hexagonal plating tessellation (~24-40px). Seamless flat-top hex grid.
function hexPattern(id, t, o = {}) {
  const r = o.r ?? 20;
  const h = Math.sqrt(3) * r / 2;
  const W = 3 * r;      // horizontal period (two columns)
  const H = 2 * h;      // vertical period
  const color = o.color || t.border;
  let cells = '';
  for (let c = 0; c < 2; c++) {
    const cx = c * 1.5 * r;
    for (let row = -1; row <= 1; row++) {
      const cy = row * H + (c % 2 ? h : 0);
      const pts = [
        [cx + r, cy], [cx + r / 2, cy + h], [cx - r / 2, cy + h],
        [cx - r, cy], [cx - r / 2, cy - h], [cx + r / 2, cy - h],
      ].map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
      cells += `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${o.sw ?? 1}"/>`;
    }
  }
  return `<pattern id="${id}" width="${W.toFixed(2)}" height="${H.toFixed(2)}" `
    + `patternUnits="userSpaceOnUse">${cells}</pattern>`;
}

// Circuit trace: orthogonal path with 45° elbows + node dots on an 8px grid.
// Path data for an orthogonal circuit trace. Shared with the hero "energy dot"
// so its motion path uses the EXACT same geometry as the drawn trace.
function circuitPath(x, y, o = {}) {
  const snap = v => Math.round(v / 8) * 8;
  const L = o.len ?? 144;
  const k = o.rise ?? 16;
  const dir = o.dir ?? 1;
  const sy = snap(y);
  const a = snap(x + dir * L * 0.28);
  const b = snap(a + dir * k);
  const by = snap(sy - k);
  const c = snap(b + dir * L * 0.46);
  const d = snap(c + dir * k);
  const dy = snap(by + k);
  const e = snap(d + dir * L * 0.26);
  const path = `M${x} ${sy} L${a} ${sy} L${b} ${by} L${c} ${by} L${d} ${dy} L${e} ${dy}`;
  return { path, sy, b, by, d, dy, e };
}

function circuitTrace(x, y, t, o = {}) {
  const color = o.color || t.border;
  const op = o.opacity ?? 0.8;
  const { path, sy, b, by, d, dy, e } = circuitPath(x, y, o);
  let s = `<path d="${path}" fill="none" stroke="${color}" stroke-width="${o.sw ?? 1}" `
    + `opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [nx, ny] of [[x, sy], [b, by], [d, dy], [e, dy]]) {
    s += `<rect x="${nx - 2.5}" y="${ny - 2.5}" width="5" height="5" rx="1" `
      + `fill="${color}" opacity="${op}"/>`;
  }
  return s;
}

// HUD corner brackets framing a region (L-brackets).
function bracket(x, y, w, h, t, o = {}) {
  const L = o.len ?? 16;
  const c = o.color || t.gold;
  const op = o.opacity ?? 0.85;
  const sw = o.sw ?? 1.4;
  const seg = [
    `M${x} ${y + L} V${y} H${x + L}`,
    `M${x + w - L} ${y} H${x + w} V${y + L}`,
    `M${x} ${y + h - L} V${y + h} H${x + L}`,
    `M${x + w - L} ${y + h} H${x + w} V${y + h - L}`,
  ].join(' ');
  return `<path d="${seg}" fill="none" stroke="${c}" stroke-width="${sw}" `
    + `opacity="${op}" stroke-linecap="square"/>`;
}

// Arc-reactor rings: 2-4 concentric circles + radial ticks + inner hexagon +
// radial white→cyan core. The only light source in the system.
function arcReactor(cx, cy, r, t, o = {}) {
  const ring = o.ring || t.gold;
  const op = o.opacity ?? 1;
  const glow = o.glow;
  const core = o.core || glow;
  let s = '';
  if (glow) s += `<circle cx="${cx}" cy="${cy}" r="${(r * 1.4).toFixed(1)}" fill="url(#${glow})"/>`;
  const radii = o.radii || [1, 0.82, 0.62, 0.44];
  radii.forEach((f, i) => {
    s += `<circle cx="${cx}" cy="${cy}" r="${(r * f).toFixed(1)}" fill="none" `
      + `stroke="${i === 1 ? t.borderStrong : ring}" stroke-width="${i === 0 ? 2 : 1.2}" `
      + `opacity="${(op * (0.85 - i * 0.08)).toFixed(2)}"/>`;
  });
  const ticks = o.ticks ?? 12;
  for (let i = 0; i < ticks; i++) {
    const ang = i * 2 * Math.PI / ticks;
    const x1 = cx + Math.cos(ang) * r * 0.88, y1 = cy + Math.sin(ang) * r * 0.88;
    const x2 = cx + Math.cos(ang) * r * 0.97, y2 = cy + Math.sin(ang) * r * 0.97;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" `
      + `y2="${y2.toFixed(1)}" stroke="${ring}" stroke-width="1" opacity="${(op * 0.5).toFixed(2)}"/>`;
  }
  const hr = r * 0.30;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const ang = Math.PI / 3 * i - Math.PI / 6;
    return `${(cx + Math.cos(ang) * hr).toFixed(1)},${(cy + Math.sin(ang) * hr).toFixed(1)}`;
  }).join(' ');
  s += `<polygon points="${pts}" fill="${t.canvasDeep}" stroke="${t.arcGlow}" `
    + `stroke-width="1.6" opacity="${op}"/>`;
  let coreS = '';
  if (core) coreS += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.18).toFixed(1)}" fill="url(#${core})" opacity="${op}"/>`;
  coreS += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.10).toFixed(1)}" fill="${t.arcGlow}" opacity="${(op * 0.9).toFixed(2)}"/>`;
  coreS += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.04).toFixed(1)}" fill="#FFFFFF" opacity="${op}"/>`;
  // o.breath lets the hero animate ONLY the bright core (the single light source).
  s += o.breath ? `<g class="${o.breath}">${coreS}</g>` : coreS;
  return s;
}

// Abstract eye-slits: two narrow angled trapezoids. Tiny hero eyebrow mark only.
function eyeSlits(x, y, t, o = {}) {
  const c = o.color || t.gold;
  const w = o.w ?? 26, gap = o.gap ?? 10, op = o.opacity ?? 0.95;
  const left = `${x},${y + 5} ${x + w},${y} ${x + w - 4},${y + 4} ${x + 3},${y + 8}`;
  const rx = x + w + gap;
  const right = `${rx},${y} ${rx + w},${y + 5} ${rx + w - 3},${y + 8} ${rx + 4},${y + 4}`;
  const s = `<polygon points="${left}" fill="${c}" opacity="${op}"/>`
    + `<polygon points="${right}" fill="${c}" opacity="${op}"/>`
    + `<polygon points="${left}" fill="none" stroke="${t.arcGlow}" stroke-width="0.6" opacity="0.55"/>`;
  return o.cls ? `<g class="${o.cls}">${s}</g>` : s;
}

// Repulsor glow: small cyan radial disc with a 1px bright core.
function repulsor(cx, cy, r, t, glowId, o = {}) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${glowId})" opacity="${o.opacity ?? 0.8}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.28).toFixed(1)}" fill="${t.arcGlow}" opacity="0.9"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.12).toFixed(1)}" fill="#FFFFFF"/>`;
  return s;
}

// Small chip. o.style: 'pill' (default) or 'dot' (flat, no box).
// Returns { svg, w } so callers can advance the cursor.
function chip(x, y, label, t, o = {}) {
  const fs = o.size ?? 12;
  const h = o.h ?? 24;
  const w = Math.round(String(label).length * fs * 0.60 + (o.style === 'dot' ? 18 : 24));
  const color = o.color || t.signal;
  if (o.style === 'dot') {
    return {
      svg: `<circle cx="${x + 3}" cy="${y + h / 2}" r="2.5" fill="${color}" opacity="0.9"/>`
        + txt(x + 14, y + h / 2 + fs * 0.35, label, { fill: o.textFill || t.ink, size: fs }),
      w,
    };
  }
  const s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" `
    + `fill="${t.raised}" stroke="${t.borderStrong}" stroke-width="1"/>`
    + `<circle cx="${x + 10}" cy="${y + h / 2}" r="2.2" fill="${color}"/>`
    + txt(x + 19, y + h / 2 + fs * 0.35, label,
        { fill: o.textFill || t.ink, size: fs, font: 'mono' });
  return { svg: s, w };
}

// Wrap defs chunks in a single <defs> element.
function defs(...chunks) {
  return `<defs>${chunks.filter(Boolean).join('')}</defs>`;
}

// Full-bleed canvas background + optional hex plating / overlay wash.
function backdrop(t, w, h, o = {}) {
  let s = o.transparent ? '' : `<rect width="${w}" height="${h}" fill="${o.fill || t.canvas}"/>`;
  if (o.hex) s += `<rect width="${w}" height="${h}" fill="url(#${o.hex})" opacity="${o.hexOpacity ?? 0.06}"/>`;
  if (o.overlay) s += `<rect width="${w}" height="${h}" fill="url(#${o.overlay})" opacity="${o.overlayOpacity ?? 1}"/>`;
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
/* HERO (1200 x 470) — eye-slit eyebrow, 2-line name, reactor, hex, no coords   */
/* -------------------------------------------------------------------------- */

// Declarative, self-contained animation for the hero. It lives entirely in an
// internal <style> block (CSS @keyframes + a CSS motion path), so it animates
// when the SVG is loaded via <img> — no JS. ALL animation is gated behind
// prefers-reduced-motion: no-preference, with an explicit reduce kill-switch,
// so users who disable motion get a completely static hero.
function heroStyle(tracePath) {
  return `<style>`
    + `@media (prefers-reduced-motion: reduce){*{animation:none!important}}`
    + `@media (prefers-reduced-motion: no-preference){`
      // Reactor: slow breathing pulse on the bright core only.
      + `.reactor-breath{transform-box:view-box;transform-origin:948px 220px;animation:reactorBreath 3.6s ease-in-out infinite}`
      + `@keyframes reactorBreath{0%,100%{opacity:.82;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}`
      // Circuit: an arcGlow energy dot riding the exact drawn trace path (~4s loop).
      + `.energy-dot{transform-box:view-box;transform-origin:0 0;offset-path:path('${tracePath}');animation:energyRun 4s linear infinite}`
      + `@keyframes energyRun{0%{offset-distance:0%;opacity:0}8%{opacity:.9}92%{opacity:.9}100%{offset-distance:100%;opacity:0}}`
      // HUD: a faint horizontal sweep crossing only the clipped red panel (~5s).
      + `.hud-scan{animation:hudSweep 5s linear infinite}`
      + `@keyframes hudSweep{0%{transform:translateY(-12px)}100%{transform:translateY(470px)}}`
      // Eyes: restrained, intermittent slit flicker (~2.6s).
      + `.eye-flicker{animation:eyeFlicker 2.6s linear infinite}`
      + `@keyframes eyeFlicker{0%,88%,91%,100%{opacity:.95}89%{opacity:.32}90%{opacity:.92}95%{opacity:.45}96%{opacity:.95}}`
    + `}`
    + `</style>`;
}

function buildHero(t) {
  const w = 1200, h = 470;
  const H = profile.hero;
  const words = String(H.name).trim().split(/\s+/);
  const parts = words.length > 1 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : [words[0]];

  let d = defs(
    redSheen('hero-field', t, 125),
    radial('hero-glow', [
      { o: '0%', c: t.arcGlow, a: 0.40 },
      { o: '55%', c: t.signal, a: 0.16 },
      { o: '100%', c: t.signal, a: 0 },
    ]),
    radial('hero-core', [
      { o: '0%', c: '#FFFFFF', a: 1 },
      { o: '45%', c: t.arcGlow, a: 0.9 },
      { o: '100%', c: t.signal, a: 0 },
    ]),
    blur('hero-blur', 24),
    grad('hero-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.arcGlow }]),
    grad('hero-scan', 0, 0, 1, 0, [
      { o: '0%', c: t.arcGlow, a: 0 },
      { o: '50%', c: t.arcGlow, a: 1 },
      { o: '100%', c: t.arcGlow, a: 0 },
    ]),
    `<clipPath id="hero-panel-clip"><rect x="724" y="0" width="${w - 724}" height="${h}"/></clipPath>`,
    hexPattern('hero-hex', t, { r: 26, color: t.border, sw: 1 }),
  );

  // Derive the hero's circuit trace once so the animated dot follows the same path.
  const traceOpts = { color: t.borderStrong, len: 200, rise: 12, opacity: 0.55 };
  const tracePath = circuitPath(64, 414, traceOpts).path;
  let s = d + heroStyle(tracePath) + backdrop(t, w, h, { transparent: true, hex: 'hero-hex', hexOpacity: 0.09 });
  // Anisotropic red armor field on the right, behind the reactor.
  s += `<rect x="724" y="0" width="${w - 724}" height="${h}" fill="url(#hero-field)"/>`;
  s += `<rect x="724" y="0" width="${w - 724}" height="${h}" fill="url(#hero-hex)" opacity="0.12"/>`;
  // Diagonal suit seam between neutral field and armor field.
  s += `<path d="M724 0 L668 470" fill="none" stroke="${t.borderStrong}" stroke-width="1.5" opacity="0.8"/>`;
  s += `<path d="M724 0 L668 470" fill="none" stroke="${t.gold}" stroke-width="0.6" opacity="0.5"/>`;
  // HUD scan: a faint sweep line crossing only the red armor panel (clipped, <=0.10).
  s += `<g clip-path="url(#hero-panel-clip)">`
    + `<rect class="hud-scan" x="724" y="0" width="${w - 724}" height="2" fill="url(#hero-scan)" opacity="0.10"/>`
    + `</g>`;

  // Eye-slit eyebrow + mono kicker.
  s += eyeSlits(64, 56, t, { w: 28, gap: 12, cls: 'eye-flicker' });
  s += txt(152, 66, 'ARC REACTOR  /  ONLINE', { font: 'mono', size: 12, fill: t.goldText, ls: 2 });

  // Two-line name.
  s += txt(58, 178, parts[0] || '', { font: 'display', size: 94, fill: t.ink, weight: 700, ls: -2 });
  if (parts[1]) s += txt(58, 272, parts[1], { font: 'display', size: 94, fill: t.ink, weight: 700, ls: -2 });
  s += rule(64, 300, 312, t, { grad: 'hero-rule', w: 3 });

  // Role + wrapped tagline, kept clear of the armor field.
  s += txt(64, 334, H.role, { font: 'mono', size: 17, fill: t.signal, ls: 0.4 });
  wrap(H.tagline, 50).forEach((ln, i) => {
    s += txt(64, 370 + i * 26, ln, { font: 'body', size: 18, fill: t.muted });
  });

  // Circuit trace under the hero header area (motif) + travelling energy dot.
  s += circuitTrace(64, 414, t, traceOpts);
  s += `<g class="energy-dot">`
    + `<circle cx="0" cy="0" r="3.6" fill="${t.arcGlow}" opacity="0.9"/>`
    + `<circle cx="0" cy="0" r="1.4" fill="#FFFFFF"/>`
    + `</g>`;

  // Bottom mono tick + status pill. Coordinates/location line intentionally absent.
  s += txt(64, 452, 'SYS.01  /  BUILD 2026', { font: 'mono', size: 12, fill: t.muted, ls: 1.4 });

  const status = H.status;
  const pillW = Math.round(status.length * 7.1 + 52);
  const px = 1136 - pillW;
  s += `<rect x="${px}" y="424" width="${pillW}" height="34" rx="17" `
    + `fill="${t.raised}" stroke="${t.borderStrong}" stroke-width="1"/>`;
  s += repulsor(px + 20, 441, 6, t, 'hero-core', { opacity: 0.95 });
  s += txt(px + 36, 446, status, { font: 'mono', size: 12, fill: t.goldText, ls: 0.6 });

  // HUD brackets + arc-reactor centerpiece on the armor field.
  s += bracket(736, 40, 424, 356, t, { len: 18, color: t.gold, opacity: 0.7 });
  s += arcReactor(948, 220, 104, t, { glow: 'hero-glow', core: 'hero-core', ring: t.gold, opacity: 1, breath: 'reactor-breath' });
  s += txt(948, 372, 'POWERED', { font: 'mono', size: 12, fill: t.arcGlow, anchor: 'middle', ls: 3 });
  s += txt(948, 392, 'MARK 01', { font: 'mono', size: 11, fill: t.goldText, anchor: 'middle', ls: 2 });
  return svgRoot(w, h, `${H.name} — ${H.role}`, s);
}

/* -------------------------------------------------------------------------- */
/* FOOTER (1200 x 150) — hex plating + red sheen ribbon + mini reactor         */
/* -------------------------------------------------------------------------- */
function buildFooter(t) {
  const w = 1200, h = 150;
  let d = defs(
    redSheen('foot-field', t, 122),
    grad('foot-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.arcGlow }]),
    radial('foot-glow', [{ o: '0%', c: t.arcGlow, a: 0.5 }, { o: '100%', c: t.signal, a: 0 }]),
    radial('foot-core', [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
    hexPattern('foot-hex', t, { r: 22, color: t.border, sw: 1 }),
  );
  let s = d + backdrop(t, w, h, { fill: t.canvasDeep, hex: 'foot-hex', hexOpacity: 0.08 });
  s += `<rect x="0" y="0" width="${w}" height="5" fill="url(#foot-field)"/>`;
  s += rule(0, 6, w, t, { grad: 'foot-rule', w: 1, opacity: 0.6 });

  // Mini powered badge (single-hex frame + tiny reactor).
  s += `<path d="M58 40 L80 53 L80 79 L58 92 L36 79 L36 53 Z" fill="${t.surface}" `
    + `stroke="${t.borderStrong}" stroke-width="1.25"/>`;
  s += arcReactor(58, 66, 15, t, { glow: 'foot-glow', core: 'foot-core', ring: t.gold, ticks: 8, opacity: 0.9 });

  const lines = wrap(profile.footer, 94, 2);
  lines.forEach((ln, i) => { s += txt(108, 66 + i * 25, ln, { font: 'body', size: 16, fill: t.ink }); });
  s += txt(108, 124, `© 2026 ${profile.user.toUpperCase()}  ·  IRON MAN / v3`, {
    font: 'mono', size: 12, fill: t.muted, ls: 1.2,
  });
  s += txt(1140, 82, `@${profile.user}`, {
    font: 'mono', size: 16, fill: t.goldText, anchor: 'end', ls: 0.5,
  });
  return svgRoot(w, h, `${profile.user} — footer`, s);
}

/* -------------------------------------------------------------------------- */
/* HEADERS (1200 x 96) — red sheen band, circuit trace, gold HUD numeral       */
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
    redSheen(`${id}-field`, t, 120 + (index % 3) * 6),
    hexPattern(`${id}-hex`, t, { r: 16, color: t.borderStrong, sw: 0.8 }),
    grad(`${id}-rule`, 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
  );
  let s = d + backdrop(t, w, h);
  // Anisotropic red field band on the right.
  s += `<rect x="924" y="0" width="${w - 924}" height="${h}" fill="url(#${id}-field)"/>`;
  s += `<rect x="924" y="0" width="${w - 924}" height="${h}" fill="url(#${id}-hex)" opacity="0.10"/>`;
  // Gold HUD index numeral over the field (graphic, not text).
  s += txt(1168, 84, num, {
    font: 'display', size: 148, fill: 'none', stroke: t.gold,
    sw: 2, opacity: 0.32, anchor: 'end', ls: -6,
  });
  // Title + kicker on neutral canvas; gold text token for red/gold-colored text.
  s += txt(48, 48, cfg.title, { font: 'display', size: 34, fill: t.ink, weight: 700, ls: 0.2 });
  s += txt(48, 72, cfg.kicker, { font: 'mono', size: 12, fill: t.goldText, ls: 1.6 });
  const ruleLen = Math.min(560, 210 + index * 48);
  s += rule(48, 84, 48 + ruleLen, t, { grad: `${id}-rule`, w: 2 });
  // Circuit traces beneath the header.
  s += circuitTrace(600, 88, t, { color: t.borderStrong, len: 280, rise: 10, opacity: 0.45 });
  return svgRoot(w, h, `${cfg.title} — section ${num}`, s);
}

/* -------------------------------------------------------------------------- */
/* BUTTONS (200 x 56) — armor pill, red sheen cap, one repulsor bloom (email)   */
/* -------------------------------------------------------------------------- */
// The 6 social buttons are kept unchanged; the video CTA is a separate builder.
const BUTTON_ORDER = ['github', 'linkedin', 'youtube', 'leetcode', 'x', 'email'];

function buildButton(t, key, label, index) {
  const w = 200, h = 56;
  const id = `btn-${key}`;
  const bloom = key === 'email';
  let d = defs(
    redSheen(`${id}-cap`, t, 125),
    radial(`${id}-bloom`, [{ o: '0%', c: t.arcGlow, a: 0.65 }, { o: '100%', c: t.signal, a: 0 }]),
    radial(`${id}-core`, [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
  );
  let s = d + `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="9" `
    + `fill="${t.raised}" stroke="${t.borderStrong}" stroke-width="1.25"/>`;
  // Anisotropic red top cap.
  s += `<path d="M10 2 H${w - 10} Q${w - 2} 2 ${w - 2} 10 V12 H2 V10 Q2 2 10 2 Z" fill="url(#${id}-cap)"/>`;
  // HUD micro-brackets.
  s += bracket(6, 6, w - 12, h - 12, t, { len: 8, color: t.gold, opacity: 0.5, sw: 1 });
  // One button bloom; the others get a solid signal dot with a ring.
  if (bloom) s += repulsor(26, 30, 13, t, `${id}-bloom`, { opacity: 1 });
  else {
    s += `<circle cx="26" cy="30" r="9" fill="none" stroke="${t.arcGlow}" stroke-width="1" opacity="0.45"/>`;
    s += `<circle cx="26" cy="30" r="4.5" fill="${t.signal}"/>`;
    s += `<circle cx="26" cy="30" r="1.6" fill="#FFFFFF"/>`;
  }
  s += txt(46, 35, label, { font: 'body', size: 16, fill: t.ink, weight: 600 });
  s += txt(176, 35, '↗', { font: 'body', size: 16, fill: t.goldText, anchor: 'end' });
  return svgRoot(w, h, `${label} link`, s);
}

// Reusable video CTA: same pill / red sheen cap / HUD brackets family, but the
// signal dot is replaced by a small gold play triangle and a "WATCH THE BUILD"
// label. Uses the same palette + helpers; adds no new glow or accent colour.
function buildVideoButton(t) {
  const w = 200, h = 56;
  const id = 'btn-video';
  const d = defs(
    redSheen(`${id}-cap`, t, 125),
  );
  let s = d + `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="9" `
    + `fill="${t.raised}" stroke="${t.borderStrong}" stroke-width="1.25"/>`;
  s += `<path d="M10 2 H${w - 10} Q${w - 2} 2 ${w - 2} 10 V12 H2 V10 Q2 2 10 2 Z" fill="url(#${id}-cap)"/>`;
  s += bracket(6, 6, w - 12, h - 12, t, { len: 8, color: t.gold, opacity: 0.5, sw: 1 });
  // Small gold play triangle inside a thin ring (replaces the social signal dot).
  s += `<circle cx="26" cy="30" r="11" fill="none" stroke="${t.gold}" stroke-width="1" opacity="0.5"/>`;
  s += `<path d="M23 24 L35 30 L23 36 Z" fill="${t.gold}"/>`;
  s += txt(48, 35, 'WATCH THE BUILD', { font: 'body', size: 13.5, fill: t.ink, weight: 600, ls: 0.2 });
  return svgRoot(w, h, 'Watch the build — video', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: ABOUT — DYNAMIC height so bio can never collide with facts       */
/* -------------------------------------------------------------------------- */
function buildCardAbout(t) {
  const w = 1200;
  const A = profile.about;

  // Wrap ALL bio lines, then derive every vertical coordinate from line count.
  const bioLines = A.lines.flatMap(line => wrap(line, 60));
  const lineH = 26;
  const startY = 64;              // baseline of first bio line
  const bioHeight = bioLines.length * lineH;
  const lastBioY = startY + (bioLines.length - 1) * lineH;
  const gap = 24;                 // generous space between last bio line and divider
  const dividerY = lastBioY + gap;
  const labelY = dividerY + 30;
  const valueY = dividerY + 58;
  const factsHeight = 84;
  const h = Math.ceil(startY + bioHeight + gap + factsHeight); // DYNAMIC card height

  let d = defs(
    radial('about-glow', [{ o: '0%', c: t.arcGlow, a: 0.28 }, { o: '100%', c: t.signal, a: 0 }]),
    radial('about-core', [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
    grad('about-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
    hexPattern('about-hex', t, { r: 20, color: t.border, sw: 1 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'about-hex', hexOpacity: 0.05 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });

  // Reactor medallion centered over the bio block.
  const medY = (startY + lastBioY) / 2 + 6;
  s += arcReactor(134, medY, 66, t, { glow: 'about-glow', core: 'about-core', ring: t.gold, ticks: 10, opacity: 0.95 });

  // Bio block.
  let y = startY;
  for (const ln of bioLines) {
    s += txt(268, y, ln, { font: 'body', size: 17, fill: t.muted });
    y += lineH;
  }

  // Divider + fact row BELOW all bio lines.
  s += rule(48, dividerY, w - 48, t, { grad: 'about-rule', w: 1, opacity: 0.7 });
  s += circuitTrace(48, dividerY + 4, t, { color: t.borderStrong, len: 140, rise: 8, opacity: 0.4 });
  const facts = A.facts.slice(0, 4);
  const colW = (w - 96) / Math.max(1, facts.length);
  facts.forEach((f, i) => {
    const x = 48 + i * colW;
    if (i > 0) s += `<line x1="${x - 18}" y1="${labelY - 18}" x2="${x - 18}" y2="${valueY + 8}" stroke="${t.border}" stroke-width="1"/>`;
    s += txt(x, labelY, f.k, { font: 'mono', size: 11, fill: t.goldText, ls: 1.5 });
    s += txt(x, valueY, f.v, { font: 'body', size: 16, fill: t.ink, weight: 600 });
  });
  return svgRoot(w, h, 'About — identity', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: NOW — 3-column signal strip + sparkline + repulsor live dot       */
/* -------------------------------------------------------------------------- */
function buildCardNow(t) {
  const w = 1200, h = 320;
  const N = profile.now;
  let d = defs(
    grad('now-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
    grad('now-spark', 0, 0, 1, 0, [{ o: '0%', c: t.red }, { o: '100%', c: t.signal }]),
    grad('now-area', 0, 0, 0, 1, [{ o: '0%', c: t.signal, a: 0.22 }, { o: '100%', c: t.signal, a: 0 }]),
    radial('now-glow', [{ o: '0%', c: t.arcGlow, a: 0.55 }, { o: '100%', c: t.signal, a: 0 }]),
    radial('now-core', [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
    hexPattern('now-hex', t, { r: 18, color: t.border, sw: 0.8 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'now-hex', hexOpacity: 0.045 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });

  s += txt(48, 48, 'CURRENT STATE', { font: 'mono', size: 12, fill: t.muted, ls: 2 });
  s += repulsor(1108, 44, 12, t, 'now-glow', { opacity: 1 });
  s += txt(1132, 48, 'LIVE', { font: 'mono', size: 12, fill: t.goldText, ls: 1.5, anchor: 'end' });

  const cols = [
    { k: 'BUILDING', v: N.building, c: t.goldText },
    { k: 'LEARNING', v: N.learning, c: t.redText },
    { k: 'LISTENING', v: N.listening, c: t.goldText },
  ];
  const colW = (w - 96) / 3;
  cols.forEach((col, i) => {
    const x = 48 + i * colW;
    if (i > 0) s += `<line x1="${x - 24}" y1="84" x2="${x - 24}" y2="214" stroke="${t.border}" stroke-width="1"/>`;
    s += rule(x, 84, x + colW - 48, t, { grad: 'now-rule', w: 2 });
    s += txt(x, 110, col.k, { font: 'mono', size: 13, fill: col.c, ls: 1.8 });
    let yy = 140;
    for (const ln of wrap(col.v, Math.round(colW / 10))) {
      s += txt(x, yy, ln, { font: 'body', size: 16, fill: t.ink });
      yy += 24;
    }
  });

  // Calm activity sparkline (graphite field, single repulsor at the leading edge).
  const vals = [10, 14, 9, 17, 13, 21, 16, 24, 19, 27, 22, 30];
  const x0 = 48, x1 = 1152, base = 282, amp = 40;
  const pts = vals.map((v, i) => ({
    x: x0 + (x1 - x0) * (i / (vals.length - 1)),
    y: base - (v / 30) * amp,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${x1} ${base} L${x0} ${base} Z`;
  s += `<path d="${area}" fill="url(#now-area)"/>`;
  s += `<path d="${line}" fill="none" stroke="url(#now-spark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const last = pts[pts.length - 1];
  s += repulsor(last.x, last.y, 9, t, 'now-glow', { opacity: 0.9 });

  s += txt(48, 308, N.note, { font: 'body', size: 13, fill: t.muted, style: 'italic' });
  return svgRoot(w, h, 'Now — current state', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: TOOLBOX — 4 columns of flat chips + gold rivet panel seams        */
/* -------------------------------------------------------------------------- */
function buildCardToolbox(t) {
  const w = 1200;
  const groups = profile.toolbox.slice(0, 4);
  const maxItems = Math.max(1, ...groups.map(g => g.items.length));
  const h = 150 + maxItems * 30;

  let d = defs(
    grad('tool-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
    hexPattern('tool-hex', t, { r: 20, color: t.border, sw: 0.8 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'tool-hex', hexOpacity: 0.04 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });
  s += txt(48, 48, 'STACK & TOOLS', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  const colW = (w - 96) / Math.max(1, groups.length);
  groups.forEach((g, gi) => {
    const x = 48 + gi * colW;
    if (gi > 0) {
      s += `<line x1="${x - 26}" y1="72" x2="${x - 26}" y2="${h - 40}" stroke="${t.border}" stroke-width="1"/>`;
      s += `<circle cx="${x - 26}" cy="72" r="2.4" fill="${t.gold}"/>`;
    }
    s += rule(x, 78, x + colW - 52, t, { grad: 'tool-rule', w: 2 });
    s += txt(x, 104, g.group, { font: 'mono', size: 12, fill: t.goldText, ls: 1.6 });
    g.items.forEach((item, ii) => {
      const dotColor = gi % 2 === 0 ? t.signal : t.red;
      s += chip(x, 120 + ii * 30, item, t, { style: 'dot', color: dotColor, size: 15, h: 22 }).svg;
    });
  });
  return svgRoot(w, h, 'Toolbox — stack and tools', s);
}

/* -------------------------------------------------------------------------- */
/* INFO CARD: MILESTONES — timeline with CURRENT / NOW markers                 */
/* -------------------------------------------------------------------------- */
function buildCardMilestones(t) {
  const w = 1200;
  const items = profile.milestones;
  const firstY = 122, step = 66;
  const h = firstY + Math.max(0, items.length - 1) * step + 80;

  let d = defs(
    grad('mile-spine', 0, 0, 0, 1, [{ o: '0%', c: t.gold }, { o: '100%', c: t.red }]),
    radial('mile-glow', [{ o: '0%', c: t.arcGlow, a: 0.5 }, { o: '100%', c: t.signal, a: 0 }]),
    hexPattern('mile-hex', t, { r: 20, color: t.border, sw: 0.8 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'mile-hex', hexOpacity: 0.04 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });
  s += txt(48, 52, 'RESEARCH & ACHIEVEMENTS', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  const lineX = 190;
  const lastY = firstY + Math.max(0, items.length - 1) * step;
  s += `<line x1="${lineX}" y1="${firstY - 12}" x2="${lineX}" y2="${lastY + 14}" `
    + `stroke="url(#mile-spine)" stroke-width="3" stroke-linecap="round"/>`;
  items.forEach((m, i) => {
    const y = firstY + i * step;
    const isNow = String(m.date).toUpperCase() === 'NOW';
    s += txt(162, y + 5, m.date, {
      font: 'mono', size: 13, fill: isNow ? t.goldText : t.muted, anchor: 'end', ls: 0.5,
    });
    if (isNow) s += repulsor(lineX, y, 11, t, 'mile-glow', { opacity: 0.85 });
    s += `<circle cx="${lineX}" cy="${y}" r="${isNow ? 8 : 6}" fill="${t.canvas}" `
      + `stroke="${i % 2 === 0 ? t.gold : t.red}" stroke-width="3"/>`;
    s += txt(226, y - 2, m.title, { font: 'display', size: 21, fill: t.ink, weight: 700 });
    if (isNow) s += txt(226 + m.title.length * 12 + 16, y - 2, 'CURRENT', { font: 'mono', size: 10, fill: t.redText, ls: 1.2 });
    s += txt(226, y + 22, m.detail, { font: 'body', size: 14, fill: t.muted });
  });
  return svgRoot(w, h, 'Milestones — timeline', s);
}

/* -------------------------------------------------------------------------- */
/* PROJECT CARDS (580 x 290) — 8 DISTINCT variant motifs + shared identity     */
/* -------------------------------------------------------------------------- */
const VARIANTS = {
  reactor:  { hud: 'CORE ARRAY',    tag: 'REACTOR' },
  helmet:   { hud: 'VISOR ARRAY',   tag: 'VISOR' },
  circuit:  { hud: 'SIGNAL ROUTE',  tag: 'CIRCUIT' },
  plating:  { hud: 'ARMOR PLATE',   tag: 'PLATING' },
  arc:      { hud: 'ARC SWEEP',     tag: 'ARC' },
  core:     { hud: 'POWER CORE',    tag: 'CORE' },
  gauntlet: { hud: 'SERVO ARRAY',   tag: 'GAUNTLET' },
  mark:     { hud: 'MARK VIII',     tag: 'MARK' },
};

// Distinct dominant geometry per variant, drawn behind the copy (low opacity).
function projectMotif(t, id, variant, i) {
  switch (variant) {
    case 'reactor':
      return [70, 54, 38, 24].map((r, k) =>
        `<circle cx="486" cy="92" r="${r}" fill="none" stroke="${k % 2 ? t.gold : t.borderStrong}" `
        + `stroke-width="1.2" opacity="0.12"/>`).join('')
        + `<circle cx="486" cy="92" r="14" fill="url(#${id}-glow)" opacity="0.10"/>`;
    case 'helmet':
      return `<polygon points="380,40 520,18 512,52 392,72" fill="${t.red}" opacity="0.12"/>`
        + `<polygon points="400,86 528,64 520,94 412,112" fill="${t.red}" opacity="0.09"/>`
        + `<polygon points="380,40 520,18 512,52 392,72" fill="none" stroke="${t.gold}" stroke-width="1" opacity="0.22"/>`;
    case 'circuit':
      return circuitTrace(300, 56, t, { color: t.borderStrong, len: 230, rise: 18, opacity: 0.22 })
        + circuitTrace(300, 132, t, { color: t.gold, len: 200, rise: 14, opacity: 0.12 })
        + circuitTrace(330, 204, t, { color: t.borderStrong, len: 190, rise: 16, opacity: 0.18, dir: -1 });
    case 'plating':
      return `<rect x="356" y="0" width="224" height="180" fill="url(#${id}-hex)" opacity="0.18"/>`;
    case 'arc':
      return `<circle cx="556" cy="6" r="158" fill="none" stroke="${t.red}" stroke-width="26" opacity="0.13"/>`
        + `<circle cx="556" cy="6" r="120" fill="none" stroke="${t.gold}" stroke-width="1.5" opacity="0.2"/>`;
    case 'core':
      return `<polygon points="486,44 526,68 526,116 486,140 446,116 446,68" fill="none" `
        + `stroke="${t.gold}" stroke-width="1.5" opacity="0.2"/>`
        + `<circle cx="486" cy="92" r="30" fill="url(#${id}-glow)" opacity="0.16"/>`;
    case 'gauntlet':
      return [0, 1, 2].map(k => {
        const x = 410 + k * 44;
        return `<line x1="${x}" y1="12" x2="${x - 24}" y2="176" stroke="${t.borderStrong}" stroke-width="2" opacity="0.2"/>`
          + `<circle cx="${x}" cy="28" r="3" fill="${t.gold}" opacity="0.35"/>`;
      }).join('');
    case 'mark':
    default:
      return `<path d="M486 40 L526 92 L486 144 L446 92 Z" fill="none" stroke="${t.gold}" stroke-width="2" opacity="0.18"/>`
        + `<path d="M486 56 L512 92 L486 128 L460 92 Z" fill="${t.red}" opacity="0.10"/>`
        + txt(486, 98, `0${i + 1}`, { font: 'mono', size: 14, fill: t.goldText, anchor: 'middle', opacity: 0.35 });
  }
}

function buildProject(t, p, i) {
  const w = 580, h = 290;
  const idx = String(i + 1).padStart(2, '0');
  const id = `proj${i + 1}`;
  const variant = VARIANTS[p.variant] ? p.variant : 'mark';
  const meta = VARIANTS[variant];

  let d = defs(
    redSheen(`${id}-cap`, t, 120 + (i % 4) * 5),
    grad(`${id}-rule`, 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
    radial(`${id}-glow`, [{ o: '0%', c: t.arcGlow, a: 0.45 }, { o: '100%', c: t.signal, a: 0 }]),
    radial(`${id}-core`, [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
    hexPattern(`${id}-hex`, t, { r: 18, color: t.border, sw: 1 }),
  );
  let s = d + backdrop(t, w, h);
  s += panel(6, 6, w - 12, h - 12, t, { r: 14, rivets: true });

  // Anisotropic red top band with a gold underline (shared identity).
  s += `<path d="M6 20 Q6 6 20 6 H${w - 20} Q${w - 6} 6 ${w - 6} 20 V44 H6 Z" fill="url(#${id}-cap)"/>`;
  s += rule(6, 45, w - 6, t, { grad: `${id}-rule`, w: 1, opacity: 0.75 });

  // Distinct dominant motif behind the copy.
  s += projectMotif(t, id, variant, i);

  // HUD corner brackets + mono index label.
  s += bracket(14, 14, w - 28, h - 28, t, { len: 14, color: t.gold, opacity: 0.55 });
  s += txt(28, 30, `SYS.${idx}`, { font: 'mono', size: 11, fill: t.goldText, ls: 2 });
  s += txt(w - 28, 30, meta.hud, { font: 'mono', size: 10, fill: t.arcGlow, anchor: 'end', ls: 1.4 });

  // Name + wrapped description.
  s += txt(28, 84, p.name, { font: 'display', size: 29, fill: t.ink, weight: 700, ls: 0.1 });
  let y = 116;
  for (const ln of wrap(p.desc, 46, 4)) {
    s += txt(28, y, ln, { font: 'body', size: 13.5, fill: t.muted });
    y += 19;
  }

  // Circuit trace + tag chips.
  s += circuitTrace(28, 214, t, { color: t.borderStrong, len: 120, rise: 8, opacity: 0.35 });
  s += rule(28, 224, 188, t, { grad: `${id}-rule`, w: 2 });
  let cx = 28;
  for (const tag of p.tags.slice(0, 4)) {
    const c = chip(cx, 234, tag, t, { color: i % 2 ? t.signal : t.red, size: 10.5, h: 22 });
    s += c.svg;
    cx += c.w + 6;
  }
  // Metric with repulsor diamond.
  s += `<path d="M30 270 l5 -5 l5 5 l-5 5 Z" fill="${t.signal}"/>`;
  s += `<circle cx="35" cy="270" r="4" fill="url(#${id}-glow)" opacity="0.8"/>`;
  s += txt(50, 274, p.metric, { font: 'mono', size: 12, fill: t.goldText, ls: 0.5 });
  return svgRoot(w, h, `${p.name} — ${p.metric}`, s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: GITHUB (1200 x 320) — 4 gauges, repulsor centers + HUD brackets        */
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
  const max = Math.max(1, ...items.map(it => it.v));
  const r = 52, C = 2 * Math.PI * r;

  let d = defs(
    grad('gh-gauge', 0, 0, 1, 1, [{ o: '0%', c: t.red }, { o: '100%', c: t.gold }]),
    radial('gh-glow', [{ o: '0%', c: t.arcGlow, a: 0.40 }, { o: '100%', c: t.signal, a: 0 }]),
    radial('gh-core', [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
    hexPattern('gh-hex', t, { r: 18, color: t.border, sw: 0.8 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'gh-hex', hexOpacity: 0.04 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });
  s += txt(48, 52, 'GITHUB / LIVE METRICS', { font: 'mono', size: 12, fill: t.muted, ls: 2 });
  s += txt(1152, 52, 'SYNC 24H', { font: 'mono', size: 11, fill: t.goldText, ls: 1.4, anchor: 'end' });

  const centers = [195, 465, 735, 1005];
  items.forEach((it, i) => {
    const cx = centers[i], cy = 164;
    s += bracket(cx - r - 14, cy - r - 14, (r + 14) * 2, (r + 14) * 2, t,
      { len: 10, color: t.gold, opacity: 0.5 });
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-width="9"/>`;
    const frac = it.v / max;
    if (frac > 0) {
      const len = Math.max(2, C * frac);
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#gh-gauge)" `
        + `stroke-width="9" stroke-linecap="round" `
        + `stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" `
        + `transform="rotate(-90 ${cx} ${cy})"/>`;
    }
    // Repulsor glow at the gauge center.
    s += `<circle cx="${cx}" cy="${cy}" r="30" fill="url(#gh-glow)" opacity="0.5"/>`;
    s += txt(cx, cy + 8, String(it.v), { font: 'display', size: 34, fill: t.ink, weight: 700, anchor: 'middle' });
    s += txt(cx, cy + 28, it.k, { font: 'mono', size: 10, fill: t.muted, anchor: 'middle', ls: 1.1 });
    // Mono tick at gauge top.
    s += repulsor(cx, cy - r, 4, t, 'gh-core', { opacity: 0.9 });
    s += txt(cx, cy - r - 14, `0${i + 1}/04`, { font: 'mono', size: 9, fill: t.goldText, anchor: 'middle', ls: 1 });
  });

  s += txt(48, 296, 'DATA: data/stats.json  ·  REFRESHED DAILY', {
    font: 'mono', size: 11, fill: t.muted, ls: 1,
  });
  return svgRoot(w, h, 'GitHub live metrics', s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: LEETCODE (1200 x 320) — segmented core ring + rank/streak             */
/* -------------------------------------------------------------------------- */
function buildLiveLeetcode(t) {
  const w = 1200, h = 320;
  const L = stats.leetcode;
  const cx = 196, cy = 166, r = 88, C = 2 * Math.PI * r;

  let d = defs(
    radial('leet-wash', [{ o: '0%', c: t.arcGlow, a: 0.30 }, { o: '100%', c: t.signal, a: 0 }]),
    radial('leet-core', [{ o: '0%', c: '#FFFFFF', a: 1 }, { o: '100%', c: t.arcGlow, a: 0 }]),
    grad('leet-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
    hexPattern('leet-hex', t, { r: 18, color: t.border, sw: 0.8 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'leet-hex', hexOpacity: 0.04 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });
  s += txt(48, 52, 'LEETCODE / PROBLEM SOLVING', { font: 'mono', size: 12, fill: t.muted, ls: 2 });

  s += bracket(cx - r - 18, cy - r - 18, (r + 18) * 2, (r + 18) * 2, t,
    { len: 12, color: t.gold, opacity: 0.55 });
  s += `<circle cx="${cx}" cy="${cy}" r="${r + 20}" fill="url(#leet-wash)" opacity="0.6"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-width="17"/>`;
  // Segments: easy = signal, medium = red, hard = gold (never green/violet).
  const segs = [
    { v: L.easy, c: t.signal },
    { v: L.medium, c: t.red },
    { v: L.hard, c: t.gold },
  ];
  const total = Math.max(1, L.solved);
  let acc = 0;
  for (const seg of segs) {
    const len = C * (seg.v / total);
    if (len <= 0) continue;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.c}" `
      + `stroke-width="17" stroke-linecap="butt" `
      + `stroke-dasharray="${Math.max(0, len - 3).toFixed(1)} ${C.toFixed(1)}" `
      + `stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acc += len;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="44" fill="url(#leet-wash)" opacity="0.45"/>`;
  s += txt(cx, cy + 10, String(L.solved), { font: 'display', size: 50, fill: t.ink, weight: 700, anchor: 'middle' });
  s += txt(cx, cy + 34, 'SOLVED', { font: 'mono', size: 11, fill: t.muted, anchor: 'middle', ls: 2 });

  const legend = [
    { k: 'EASY', v: L.easy, c: t.signal },
    { k: 'MEDIUM', v: L.medium, c: t.red },
    { k: 'HARD', v: L.hard, c: t.gold },
  ];
  legend.forEach((row, i) => {
    const y = 122 + i * 42;
    s += `<circle cx="356" cy="${y - 4}" r="5" fill="${row.c}"/>`;
    s += txt(372, y, row.k, { font: 'mono', size: 12, fill: t.muted, ls: 1.4 });
    s += txt(520, y, String(row.v), { font: 'display', size: 22, fill: t.ink, anchor: 'end' });
  });

  s += `<line x1="580" y1="92" x2="580" y2="252" stroke="${t.border}" stroke-width="1"/>`;
  const stats2 = [
    { k: 'GLOBAL RANK', v: String(L.rank), x: 640 },
    { k: 'DAY STREAK', v: String(L.streak), x: 920 },
  ];
  stats2.forEach(b => {
    s += txt(b.x, 140, b.k, { font: 'mono', size: 12, fill: t.goldText, ls: 1.6 });
    s += txt(b.x, 206, b.v, { font: 'display', size: 50, fill: t.ink, weight: 700 });
  });
  s += rule(48, 286, 1152, t, { grad: 'leet-rule', w: 1, opacity: 0.8 });
  s += txt(48, 302, 'DATA: data/stats.json  ·  EASY / MEDIUM / HARD BREAKDOWN', {
    font: 'mono', size: 11, fill: t.muted, ls: 1,
  });
  return svgRoot(w, h, 'LeetCode live metrics', s);
}

/* -------------------------------------------------------------------------- */
/* LIVE: ACTIVITY (1200 x 320) — dated rows in a HUD frame                      */
/* -------------------------------------------------------------------------- */
function buildLiveActivity(t) {
  const w = 1200, h = 320;
  const items = profile.activity.slice(0, 6);

  let d = defs(
    grad('act-tick', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.red }]),
    grad('act-rule', 0, 0, 1, 0, [{ o: '0%', c: t.gold }, { o: '100%', c: t.signal }]),
    hexPattern('act-hex', t, { r: 18, color: t.border, sw: 0.8 }),
  );
  let s = d + backdrop(t, w, h, { hex: 'act-hex', hexOpacity: 0.04 });
  s += panel(8, 8, w - 16, h - 16, t, { rivets: true });
  s += bracket(20, 20, w - 40, h - 40, t, { len: 12, color: t.gold, opacity: 0.5 });
  s += txt(48, 52, 'RECENT ACTIVITY', { font: 'mono', size: 12, fill: t.muted, ls: 2 });
  s += txt(1152, 52, `LOG.${String(items.length).padStart(2, '0')}`, { font: 'mono', size: 11, fill: t.goldText, ls: 1.4, anchor: 'end' });

  const firstY = 88, step = 34;
  items.forEach((a, i) => {
    const y = firstY + i * step;
    s += txt(164, y + 5, a.date, { font: 'mono', size: 12, fill: t.goldText, anchor: 'end', ls: 1 });
    s += `<rect x="184" y="${y - 2}" width="26" height="5" rx="2.5" fill="url(#act-tick)" `
      + `opacity="${(0.95 - i * 0.09).toFixed(2)}"/>`;
    s += txt(224, y + 5, a.text, { font: 'body', size: 16, fill: t.ink });
    if (i < items.length - 1) {
      s += `<line x1="164" y1="${y + 17}" x2="1152" y2="${y + 17}" stroke="${t.border}" stroke-width="1" opacity="0.6"/>`;
    }
  });
  s += rule(48, 300, 1152, t, { grad: 'act-rule', w: 1, opacity: 0.8 });
  return svgRoot(w, h, 'Recent activity log', s);
}

/* -------------------------------------------------------------------------- */
/* GENERATE ALL ASSETS                                                        */
/* -------------------------------------------------------------------------- */

// Remove legacy v1/v2 artifacts and any project cards beyond project-8.
fs.rmSync(path.join(ASSETS, 'ttt'), { recursive: true, force: true });
if (fs.existsSync(ASSETS)) {
  for (const f of fs.readdirSync(ASSETS)) {
    if (/^header-play-.*\.svg$/.test(f)) fs.rmSync(path.join(ASSETS, f), { force: true });
    const m = f.match(/^project-(\d+)-(light|dark)\.svg$/);
    if (m && Number(m[1]) > 8) fs.rmSync(path.join(ASSETS, f), { force: true });
  }
}

const socialByKey = Object.fromEntries(profile.socials.map(s => [s.key, s]));

for (const mode of ['light', 'dark']) {
  const t = theme(mode);
  const V = `-${mode}.svg`;

  write(`hero${V}`, buildHero(t));
  write(`footer${V}`, buildFooter(t));

  HEADERS.forEach((cfg, i) => write(`header-${cfg.key}${V}`, buildHeader(t, cfg, i)));

  BUTTON_ORDER.forEach((key, i) => {
    const soc = socialByKey[key];
    const label = soc ? soc.label : key.charAt(0).toUpperCase() + key.slice(1);
    write(`button-${key}${V}`, buildButton(t, key, label, i));
  });
  // 7th button: reusable video CTA (keeps the 6 social buttons untouched).
  write(`button-video${V}`, buildVideoButton(t));

  write(`card-about${V}`, buildCardAbout(t));
  write(`card-now${V}`, buildCardNow(t));
  write(`card-toolbox${V}`, buildCardToolbox(t));
  write(`card-milestones${V}`, buildCardMilestones(t));

  const projectCount = Math.min(8, profile.projects.length);
  for (let i = 0; i < projectCount; i++) {
    const fallback = {
      name: `Project ${i + 1}`,
      desc: 'Project description coming soon.',
      tags: ['Code'],
      metric: '—',
      variant: 'mark',
    };
    write(`project-${i + 1}${V}`, buildProject(t, profile.projects[i] || fallback, i));
  }

  write(`live-github${V}`, buildLiveGithub(t));
  write(`live-leetcode${V}`, buildLiveLeetcode(t));
  write(`live-activity${V}`, buildLiveActivity(t));
}

console.log(`IRON MAN / STARK assets: generated ${written} SVG files in ${ASSETS}`);
