/**
 * ORBIT // Tic-tac-toe issue handler
 * ---------------------------------------------------------------------------
 * Invoked by .github/workflows/tic-tac-toe.yml for each "ttt|" issue. Reads the
 * untrusted issue fields only from the environment, applies a move through the
 * engine, persists data/ttt.json, and swaps the README's <!-- BEGIN:ttt -->
 * block. The issue reply is always written to $REPLY_FILE for the workflow to
 * post back. Zero dependencies; Node 20 ESM.
 *
 *   ISSUE_TITLE  "ttt|move|<0-8>" or "ttt|new"
 *   PLAYER       issue author's GitHub login
 *   REPLY_FILE   output path for the reply (default: reply.md)
 *   GITHUB_REPOSITORY  owner/name, used to build board links
 */
import { readFile, writeFile } from 'node:fs/promises';

import { newGame, play, renderSection } from './engine.mjs';

const STATE_FILE = 'data/ttt.json';
const README_FILE = 'README.md';
const REPLY_FILE = process.env.REPLY_FILE || 'reply.md';
const REPO = process.env.GITHUB_REPOSITORY || 'dhruvbhadhotiya/dhruvbhadhotiya';
const PROFILE_URL = 'https://github.com/dhruvbhadhotiya';

// Replace ONLY the content between the two ttt markers.
async function updateBoard(markup) {
  const readme = await readFile(README_FILE, 'utf8');
  const markers = /(<!-- BEGIN:ttt -->)[\s\S]*?(<!-- END:ttt -->)/;
  if (!markers.test(readme)) {
    throw new Error(`${README_FILE} is missing the ttt marker block`);
  }
  const updated = readme.replace(
    markers,
    (_match, begin, end) => `${begin}\n${markup.trim()}\n${end}`,
  );
  await writeFile(README_FILE, updated);
}

const title = (process.env.ISSUE_TITLE || '').trim();
const player = process.env.PLAYER || 'someone';
const state = JSON.parse(await readFile(STATE_FILE, 'utf8'));

const [, action, arg] = title.split('|');
let result;

if (action === 'new') {
  if (state.status === 'playing' && state.moves.length) {
    result = {
      ok: false,
      reply: `A game is already in progress — take the next move on the board instead: ${PROFILE_URL}`,
    };
  } else {
    // Clear every old key (including winLine) before installing a fresh game.
    const fresh = newGame(state.record, state.recent);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, fresh);
    result = { ok: true, reply: `Fresh board is up. Your move: ${PROFILE_URL}` };
  }
} else if (action === 'move') {
  // Validate the numeric argument before handing it to the engine.
  const cell = Number(arg);
  if (arg === undefined || arg === '' || !Number.isInteger(cell)) {
    result = {
      ok: false,
      reply: `That square (\`${String(arg)}\`) is not valid. Pick an empty square on the board: ${PROFILE_URL}`,
    };
  } else {
    result = play(state, cell, player);
  }
} else {
  result = {
    ok: false,
    reply: `I didn't understand that request. Use the board on the profile: ${PROFILE_URL}`,
  };
}

// Always write the reply, even if persisting the board fails.
try {
  if (result.ok) {
    await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
    await updateBoard(renderSection(state, REPO));
  }
} finally {
  await writeFile(REPLY_FILE, `${result.reply}\n`);
  console.log(
    result.ok
      ? `applied: ${title} by @${player}`
      : `rejected: ${title} (${result.reply})`,
  );
}
