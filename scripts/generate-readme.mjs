#!/usr/bin/env node
/**
 * generate-readme.mjs
 *
 * Purpose: deterministically generate the complete profile README.md from data.
 * Inputs:
 *   - data/profile.json  -> all personal content (hero, socials, projects, ...)
 *   - data/stats.json    -> live numbers used in the stat-card alt text
 *   - data/ttt.json      -> game state fed to the game engine
 *   - game/engine.mjs    -> exports renderSection(state, repo)
 * Output: overwrites README.md.
 *
 * Every image is wrapped in a <picture> with a dark <source> and a light <img>
 * so the README follows GitHub's light/dark theme. All interpolated data is
 * HTML-escaped. The BEGIN/END marker blocks are emitted verbatim so other
 * scripts can replace just those regions without regenerating the whole file.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderSection } from '../game/engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));

const profile = await readJson('data/profile.json');
const stats = await readJson('data/stats.json');
const ttt = await readJson('data/ttt.json');

const repo = profile.repo;

/** Escape any value interpolated into HTML text or an attribute. */
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** A theme-aware image: dark variant via <source>, light variant via <img>. */
const picture = (name, alt, width = '100%') => {
  const dark = `https://raw.githubusercontent.com/${repo}/main/assets/${name}-dark.svg`;
  const light = `assets/${name}-light.svg`;
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${esc(dark)}"><img src="${esc(light)}" width="${esc(width)}" alt="${esc(alt)}"></picture>`;
};

const socialUrl = (key) => profile.socials?.find((s) => s.key === key)?.url;

const L = [];
const add = (...lines) => L.push(...lines);

// Generated-file warning. Avoid literal marker syntax inside the comment so the
// comment is not terminated early.
add(
  '<!--',
  '  GENERATED FILE — do not edit by hand.',
  '  Produced by scripts/generate-readme.mjs from data/profile.json, data/stats.json,',
  '  data/ttt.json and game/engine.mjs. Every rebuild overwrites this file; only the',
  '  BEGIN/END marker blocks are meant to be replaced by automation.',
  '-->',
  '',
);

// Hero + centered row of social buttons.
const hero = profile.hero ?? {};
const count = profile.socials?.length || 1;
const buttonWidth = `${Math.max(10, Math.floor(100 / count) - 1)}%`;
add('<div align="center">', '');
add(picture('hero', `${hero.name} — ${hero.role}`), '');
for (const s of profile.socials ?? []) {
  add(`<a href="${esc(s.url)}">${picture(`button-${s.key}`, s.label, buttonWidth)}</a>`);
}
add('', '</div>', '', '<br>', '');

// 01 — About.
add(picture('header-about', '01 · About'), '');
add(picture('card-about', (profile.about?.lines ?? []).join(' / ')), '', '<br>', '');

// 02 — Now.
add(picture('header-now', '02 · Now'), '');
add(picture('card-now', `Now building: ${profile.now?.building ?? ''}`), '', '<br>', '');

// 03 — Work: project cards in a 2x2 grid.
add(picture('header-work', '03 · Selected work'), '');
add('<p align="center">');
const projects = profile.projects ?? [];
projects.forEach((p, i) => {
  const card = `<a href="${esc(p.url)}">${picture(`project-${i + 1}`, `${p.name} — ${p.desc}`, '49%')}</a>`;
  add(i % 2 === 1 && i < projects.length - 1 ? `${card}<br>` : card);
});
add('</p>', '', '<br>', '');

// 04 — Toolbox.
add(picture('header-toolbox', '04 · Toolbox'), '');
add(
  picture('card-toolbox', (profile.toolbox ?? []).map((g) => g.group).join(' · ')),
  '',
  '<br>',
  '',
);

// 05 — Experience & achievements (timeline card).
add(picture('header-milestones', '05 · Experience & achievements'), '');
add(
  picture('card-milestones', (profile.milestones ?? []).map((m) => `${m.date}: ${m.title}`).join(' · ')),
  '',
  '<br>',
  '',
);

// 06 — Contributions. This opens the live-stat marker block.
add(picture('header-contributions', '06 · GitHub contributions'), '');
add('<!-- BEGIN:live -->');
add(
  `<a href="${esc(socialUrl('github') ?? `https://github.com/${profile.user}`)}">${picture('live-github', `GitHub — ${stats.github.followers} followers, ${stats.github.repos} repositories, ${stats.github.stars} stars`)}</a>`,
  '',
);

// 07 — Problem solving.
add(picture('header-problem-solving', '07 · Problem solving'), '');
add(
  `<a href="${esc(socialUrl('leetcode') ?? '#')}">${picture('live-leetcode', `LeetCode — ${stats.leetcode.solved} problems solved`)}</a>`,
  '',
);

// 08 — Play: exact carve-out for the game engine's rendered section.
add(picture('header-play', '08 · Beat my AI'), '');
add('<!-- BEGIN:ttt -->');
add(renderSection(ttt, repo));
add('<!-- END:ttt -->', '', '<br>', '');

// 09 — Activity. Live marker block closes after this card, then the bullet list.
add(picture('header-activity', '09 · Recent activity'), '');
add(picture('live-activity', `Recent activity — ${profile.activity?.[0]?.text ?? ''}`), '');
add('<!-- END:live -->');
add('<!-- BEGIN:activity -->');
for (const a of profile.activity ?? []) {
  add(`- <code>${esc(a.date)}</code>&nbsp; ${esc(a.text)}`);
}
add('<!-- END:activity -->', '', '<br>', '');

// 10 — Contact / footer with profile-views badge.
add(picture('header-contact', '10 · Contact'), '');
add('<div align="center">', '');
add(picture('footer', profile.footer ?? ''), '');
const views = `https://komarev.com/ghpvc/?username=${encodeURIComponent(profile.profileViewsId)}&label=profile%20views&color=38E1FF&style=flat-square`;
add(`<img src="${esc(views)}" alt="Profile views">`, '');
add('</div>');

await writeFile(path.join(ROOT, 'README.md'), `${L.join('\n')}\n`, 'utf8');
console.log('[generate-readme] wrote README.md');
