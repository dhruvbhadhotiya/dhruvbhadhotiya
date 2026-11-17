#!/usr/bin/env node
/**
 * fetch-stats.mjs
 *
 * Purpose: refresh `data/stats.json` with public, live numbers for the profile.
 * Inputs:
 *   - data/profile.json  -> `user`, the GitHub login to query (and its LeetCode social URL)
 *   - data/stats.json    -> existing values, preserved whenever a fetch fails
 *   - GH_TOKEN           -> optional Bearer token (anonymous requests work too)
 *   - LEETCODE_USER      -> optional override for the LeetCode login
 * Output: rewrites data/stats.json with a fresh `generatedAt` ISO timestamp.
 *
 * Defensive by design: every network call is optional and wrapped. Running with
 * no internet, no token, or against a rate limit simply keeps the committed
 * placeholder values. Nothing here throws uncaught.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_FILE = path.join(ROOT, 'data', 'profile.json');
const STATS_FILE = path.join(ROOT, 'data', 'stats.json');

// Mirrors the committed placeholder file; used only if that file cannot be read.
const FALLBACK_STATS = {
  generatedAt: new Date(0).toISOString(),
  github: { followers: 0, following: 0, repos: 0, stars: 0, contributions: 0 },
  leetcode: { solved: 0, easy: 0, medium: 0, hard: 0, rank: '—', streak: 0 },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function githubHeaders() {
  const h = {
    'User-Agent': 'dhruv-profile-stats/1.0 (+https://github.com/dhruvbhadhotiya)',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GH_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

/** Public GitHub profile + summed repository stars. Any sub-failure aborts just this block. */
async function fetchGitHub(next, user, headers) {
  const login = encodeURIComponent(user);
  const info = await getJson(`https://api.github.com/users/${login}`, headers);
  if (Number.isFinite(info.followers)) next.github.followers = info.followers;
  if (Number.isFinite(info.following)) next.github.following = info.following;
  if (Number.isFinite(info.public_repos)) next.github.repos = info.public_repos;

  // Sum stargazers across public repos. Paginate, but cap the loop defensively.
  let stars = 0;
  for (let page = 1; page <= 10; page++) {
    const repos = await getJson(
      `https://api.github.com/users/${login}/repos?per_page=100&page=${page}`,
      headers,
    );
    if (!Array.isArray(repos)) break;
    for (const repo of repos) {
      if (Number.isFinite(repo.stargazers_count)) stars += repo.stargazers_count;
    }
    if (repos.length < 100) break;
  }
  next.github.stars = stars;
}

/** Derive the LeetCode login from profile data, with an env override. */
function leetcodeUser(profile) {
  if (process.env.LEETCODE_USER?.trim()) return process.env.LEETCODE_USER.trim();
  const social = profile?.socials?.find((s) => s.key === 'leetcode');
  const match = social?.url?.match(/leetcode\.com\/(?:u\/)?([^/?#]+)/i);
  return match?.[1] ?? null;
}

/** Best-effort LeetCode GraphQL query. Failures are expected and non-fatal. */
async function fetchLeetCode(next, user) {
  const query = `query matchedUser($username: String!) {
    matchedUser(username: $username) {
      profile { ranking }
      submitStats: submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
    }
  }`;
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'User-Agent': 'dhruv-profile-stats/1.0', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { username: user } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json?.data?.matchedUser;
  if (!data) return; // e.g. "not found": keep existing values
  if (Number.isFinite(data.profile?.ranking)) next.leetcode.rank = String(data.profile.ranking);
  const counts = {};
  for (const row of data.submitStats?.acSubmissionNum ?? []) counts[row.difficulty] = row.count;
  if (Number.isFinite(counts.All)) next.leetcode.solved = counts.All;
  if (Number.isFinite(counts.Easy)) next.leetcode.easy = counts.Easy;
  if (Number.isFinite(counts.Medium)) next.leetcode.medium = counts.Medium;
  if (Number.isFinite(counts.Hard)) next.leetcode.hard = counts.Hard;
}

async function main() {
  let stats;
  try {
    stats = await readJson(STATS_FILE);
  } catch {
    stats = clone(FALLBACK_STATS);
  }
  const next = clone(stats);
  // Guarantee the expected nested shapes even if the source file was edited.
  next.github = { ...FALLBACK_STATS.github, ...(next.github ?? {}) };
  next.leetcode = { ...FALLBACK_STATS.leetcode, ...(next.leetcode ?? {}) };

  let profile = null;
  try {
    profile = await readJson(PROFILE_FILE);
  } catch {
    /* without a profile we simply skip the network calls */
  }

  if (profile?.user) {
    try {
      await fetchGitHub(next, profile.user, githubHeaders());
      console.log(`[fetch-stats] GitHub refreshed for @${profile.user}`);
    } catch (err) {
      console.warn(`[fetch-stats] GitHub fetch skipped (${err?.message ?? err}); keeping existing values.`);
    }
  } else {
    console.warn('[fetch-stats] no `user` in profile.json; skipping GitHub fetch.');
  }

  const lcUser = leetcodeUser(profile);
  if (lcUser) {
    try {
      await fetchLeetCode(next, lcUser);
      console.log(`[fetch-stats] LeetCode refreshed for ${lcUser}`);
    } catch (err) {
      console.warn(`[fetch-stats] LeetCode fetch skipped (${err?.message ?? err}); keeping existing values.`);
    }
  }

  next.generatedAt = new Date().toISOString();
  try {
    await writeFile(STATS_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    console.log('[fetch-stats] wrote data/stats.json');
  } catch (err) {
    console.warn(`[fetch-stats] could not write stats (${err?.message ?? err}).`);
  }
  console.log(
    `[fetch-stats] summary: github ${next.github.followers} followers / ${next.github.repos} repos / ${next.github.stars} stars; leetcode ${next.leetcode.solved} solved`,
  );
}

main().catch((err) => {
  console.warn(`[fetch-stats] unexpected error; leaving stats unchanged (${err?.message ?? err}).`);
});
