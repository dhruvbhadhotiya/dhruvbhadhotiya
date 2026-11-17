#!/usr/bin/env node
/**
 * generate-readme.mjs
 *
 * Purpose: deterministically generate the complete v2 (AETHER) profile README.md
 * from data only — no game, no tic-tac-toe, no external dependencies.
 * Inputs:
 *   - data/profile.json -> all personal content (hero, socials, projects, ...)
 *   - data/stats.json   -> live numbers used in the stat-card alt text
 * Output: overwrites README.md at the repo root.
 *
 * Every asset image is wrapped in a <picture> with a dark <source> and a light
 * <img> so the README follows GitHub's light/dark theme. All interpolated data
 * is HTML-escaped. The two marker blocks (BEGIN:live / END:live and
 * BEGIN:activity / END:activity) are emitted verbatim so automation can replace
 * just those regions without regenerating the whole file.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));

const profile = await readJson('data/profile.json');
const stats = await readJson('data/stats.json');

const repo = profile.repo;

/** Escape any value interpolated into HTML text or an attribute. */
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** A theme-aware asset image: dark variant via <source>, light variant via <img>. */
const picture = (name, alt, width = '100%') => {
  const dark = `https://raw.githubusercontent.com/${repo}/main/assets/${name}-dark.svg`;
  const light = `assets/${name}-light.svg`;
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${esc(dark)}"><img src="${esc(light)}" width="${esc(width)}" alt="${esc(alt)}"></picture>`;
};

/** Look up a social URL by key (github, linkedin, leetcode, email, ...). */
const socialUrl = (key) => profile.socials?.find((s) => s.key === key)?.url;

const L = [];
const add = (...lines) => L.push(...lines);

// Generated-file warning. Avoid literal marker syntax inside the comment so the
// comment is not terminated early.
add(
  '<!--',
  '  GENERATED FILE — do not edit by hand.',
  '  Produced by scripts/generate-readme.mjs from data/profile.json and data/stats.json.',
  '  Every rebuild overwrites this file; only the BEGIN/END marker blocks are meant',
  '  to be replaced by automation.',
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
const aboutLines = (profile.about?.lines ?? []).join(' / ');
const aboutFacts = (profile.about?.facts ?? []).map((f) => `${f.k}: ${f.v}`).join(' · ');
add(picture('card-about', aboutFacts ? `${aboutLines} · ${aboutFacts}` : aboutLines), '', '<br>', '');

// 02 — Now.
add(picture('header-now', '02 · Now'), '');
const now = profile.now ?? {};
const nowAlt = [now.building && `Building: ${now.building}`, now.learning && `Learning: ${now.learning}`, now.listening && `Listening: ${now.listening}`]
  .filter(Boolean)
  .join(' · ');
add(picture('card-now', nowAlt), '', '<br>', '');

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
  picture('card-toolbox', (profile.toolbox ?? []).map((g) => `${g.group}: ${(g.items ?? []).join(', ')}`).join(' · ')),
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

// 06 — GitHub contributions. This opens the live-stat marker block (06-08).
add('<!-- BEGIN:live -->', '');
add(picture('header-contributions', '06 · GitHub contributions'), '');
const gh = stats.github ?? {};
add(
  `<a href="${esc(socialUrl('github') ?? `https://github.com/${profile.user}`)}">${picture('live-github', `GitHub — ${gh.followers} followers, ${gh.repos} repositories, ${gh.stars} stars, ${gh.contributions} contributions`)}</a>`,
  '',
);

// 07 — Problem solving.
add(picture('header-problem-solving', '07 · Problem solving'), '');
const lc = stats.leetcode ?? {};
add(
  `<a href="${esc(socialUrl('leetcode') ?? '#')}">${picture('live-leetcode', `LeetCode — ${lc.solved} problems solved, rank ${lc.rank}, ${lc.streak}-day streak`)}</a>`,
  '',
);

// 08 — Recent activity: only the live card stays inside the live block.
add(picture('header-activity', '08 · Recent activity'), '');
const activity = profile.activity ?? [];
add(picture('live-activity', `${activity.length} recent updates — ${activity[0]?.text ?? ''}`), '');
add('<!-- END:live -->', '');

// The activity marker wraps ONLY the markdown bullet list.
add('<!-- BEGIN:activity -->');
for (const a of activity) {
  add(`- <code>${esc(a.date)}</code>&nbsp; ${esc(a.text)}`);
}
add('<!-- END:activity -->', '', '<br>', '');

// 09 — Contact / footer with profile-views badge.
add(picture('header-contact', '09 · Contact'), '');
add('<div align="center">', '');
add(picture('footer', profile.footer ?? ''), '');
const views = `https://komarev.com/ghpvc/?username=${encodeURIComponent(profile.profileViewsId)}&label=profile%20views&color=38E1FF&style=flat-square`;
add(`<img src="${esc(views)}" alt="Profile views">`, '');
add('</div>');

await writeFile(path.join(ROOT, 'README.md'), `${L.join('\n')}\n`, 'utf8');
console.log('[generate-readme] wrote README.md');
