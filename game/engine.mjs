/**
 * ORBIT // Tic-tac-toe engine
 * ---------------------------------------------------------------------------
 * A dependency-free (Node 20 ESM) game core. Visitors play X, an unbeatable
 * minimax AI plays O. The state object is deliberately plain JSON so it can be
 * stored in data/ttt.json and mutated in place by game/play.mjs.
 *
 * Public API (the ONLY exports): newGame, winner, aiMove, play, renderSection.
 * The README's <!-- BEGIN:ttt --> block is rendered by renderSection(), which
 * emits theme-aware <picture> tiles and empty-square issue links.
 */

// All eight winning triples on a 0-8 board (row-major).
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const HUMAN = 'X';
const AI = 'O';

// Link back to the profile; used in every issue reply.
const PROFILE_URL = 'https://github.com/dhruvbhadhotiya';

// Pre-filled body for the "make a move" issue the board links to.
const MOVE_BODY =
  'Just press "Create". A GitHub Action plays the AI\'s reply and refreshes the ' +
  'board on the profile within a minute.';

/** Create a fresh game state while carrying over the scoreboard and history. */
export function newGame(record = { human: 0, ai: 0, draw: 0 }, recent = []) {
  const r = record && typeof record === 'object' ? record : {};
  return {
    board: Array(9).fill(''),
    status: 'playing',
    moves: [],
    record: {
      human: Number(r.human) || 0,
      ai: Number(r.ai) || 0,
      draw: Number(r.draw) || 0,
    },
    recent: Array.isArray(recent) ? recent.slice() : [],
  };
}

/**
 * Inspect a board. Returns { mark, line } for a win (mark X/O and the winning
 * triple) or a draw (mark 'draw', empty line), otherwise null.
 */
export function winner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a], line };
    }
  }
  return board.every(Boolean) ? { mark: 'draw', line: [] } : null;
}

/**
 * Recursive minimax score for the AI (O). Positive is good for the AI:
 *   O win  -> 10 - depth  (prefer faster wins)
 *   X win  -> depth - 10  (prefer slower losses)
 *   draw   -> 0
 * Assumes `board` is a mutable working copy.
 */
function minimaxScore(board, turn, depth) {
  const w = winner(board);
  if (w) {
    if (w.mark === AI) return 10 - depth;
    if (w.mark === HUMAN) return depth - 10;
    return 0;
  }

  let best = turn === AI ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = turn;
    const score = minimaxScore(board, turn === AI ? HUMAN : AI, depth + 1);
    board[i] = '';
    best = turn === AI ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

/**
 * Choose the AI's move. Every legal cell is scored with full minimax; among
 * equally optimal choices one is picked at random so games stay varied.
 * Perfect play means this can never lose.
 */
export function aiMove(board) {
  const work = Array.isArray(board) ? board.slice(0, 9) : [];
  const candidates = [];
  let best = -Infinity;

  for (let i = 0; i < 9; i++) {
    if (work[i]) continue;
    work[i] = AI;
    const score = minimaxScore(work, HUMAN, 1); // O just moved; X is next.
    work[i] = '';
    if (score > best) {
      best = score;
      candidates.length = 0;
      candidates.push(i);
    } else if (score === best) {
      candidates.push(i);
    }
  }
  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : -1;
}

/** Record a decided game on the state object (called internally by play). */
function finish(state, w, player, now) {
  state.status = w.mark === HUMAN ? 'human' : w.mark === AI ? 'ai' : 'draw';
  state.winLine = w.line.slice();

  const key = state.status; // 'human' | 'ai' | 'draw'
  state.record[key] = (Number(state.record[key]) || 0) + 1;

  // Unique list of the humans who took part in this game.
  const players = [...new Set(
    state.moves.filter((m) => m.mark === HUMAN).map((m) => m.player),
  )];
  state.recent = [
    { players, result: state.status, at: now },
    ...state.recent,
  ].slice(0, 5);
}

/**
 * Apply a visitor's move and the AI's reply, mutating `state` in place.
 * Returns { ok, reply } where reply is the markdown posted to the issue.
 */
export function play(state, cell, player, now = new Date().toISOString()) {
  if (state.status !== 'playing') {
    return {
      ok: false,
      reply: `That game is already over. Open the profile to start a new one: ${PROFILE_URL}`,
    };
  }
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
    return {
      ok: false,
      reply: `\`${String(cell)}\` is not a square on the board (pick 1-9). Try again from the profile: ${PROFILE_URL}`,
    };
  }
  if (state.board[cell]) {
    return {
      ok: false,
      reply: `Square ${cell + 1} is already taken. Choose an empty one on the board: ${PROFILE_URL}`,
    };
  }

  // Human move.
  state.board[cell] = HUMAN;
  state.moves.push({ player, mark: HUMAN, cell, at: now });

  let w = winner(state.board);
  let aiCell = null;

  // AI replies only if the human did not just finish the game.
  if (!w) {
    aiCell = aiMove(state.board);
    if (aiCell >= 0 && !state.board[aiCell]) {
      state.board[aiCell] = AI;
      state.moves.push({ player: 'minimax', mark: AI, cell: aiCell, at: now });
    }
    w = winner(state.board);
  }

  if (w) finish(state, w, player, now);

  let reply;
  if (!w) {
    reply = `You took square ${cell + 1} and the AI answered on ${aiCell + 1}. Your turn: ${PROFILE_URL}`;
  } else if (w.mark === HUMAN) {
    reply = `You beat the minimax AI on square ${cell + 1}. That shouldn't be possible — tell me how you did it! 👀 ${PROFILE_URL}`;
  } else if (w.mark === AI) {
    reply = `The AI completed a line on square ${aiCell + 1} and takes this round. Rematch: ${PROFILE_URL}`;
  } else {
    reply = `Draw. Against perfect play that's the best result you can get. Rematch: ${PROFILE_URL}`;
  }
  return { ok: true, reply };
}

// --- Rendering helpers -----------------------------------------------------

/** Escape a value for safe interpolation into HTML text or attributes. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build a GitHub "new issue" URL with a title and pre-filled body. */
function issueUrl(repo, title, body) {
  return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** A theme-aware tile: dark raw SVG via <source>, light relative SVG via <img>. */
function tile(repo, kind, alt) {
  const dark = `https://raw.githubusercontent.com/${repo}/main/assets/ttt/${kind}-dark.svg`;
  const light = `assets/ttt/${kind}-light.svg`;
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${escapeHtml(dark)}"><img src="${escapeHtml(light)}" width="88" height="88" alt="${escapeHtml(alt)}"></picture>`;
}

const RESULT_WORD = { human: 'won', ai: 'lost', draw: 'draw' };

/** Return the README HTML for the board, status, scoreboard and recent games. */
export function renderSection(state, repo) {
  const safeRepo = escapeHtml(repo);
  const winLine = Array.isArray(state.winLine) ? state.winLine : [];

  const cells = state.board.map((mark, i) => {
    const isWin = winLine.includes(i);
    if (!mark) {
      const img = tile(repo, 'empty', `Empty square ${i + 1}`);
      return state.status === 'playing'
        ? `<a href="${escapeHtml(issueUrl(repo, `ttt|move|${i}`, MOVE_BODY))}">${img}</a>`
        : img;
    }
    const kind = `${mark.toLowerCase()}${isWin ? '-win' : ''}`;
    return tile(repo, kind, `${mark} on square ${i + 1}`);
  });

  const rows = [0, 3, 6]
    .map((start) => cells.slice(start, start + 3).join(''))
    .join('<br>\n');

  const lastHuman = [...state.moves].reverse().find((m) => m.mark === HUMAN);
  const status = {
    playing: lastHuman
      ? `<b>Your move.</b> Last played by <a href="https://github.com/${encodeURIComponent(lastHuman.player)}">@${escapeHtml(lastHuman.player)}</a>. Click an empty square.`
      : '<b>Your move.</b> Click any empty square to make the first move.',
    human: '<b>A human won.</b> The minimax AI has been beaten.',
    ai: '<b>The AI wins this round.</b>',
    draw: '<b>Draw.</b> Against perfect play, that is a win.',
  }[state.status] || '<b>Your move.</b>';

  const again = state.status === 'playing'
    ? ''
    : ` &nbsp;<a href="${escapeHtml(issueUrl(repo, 'ttt|new', MOVE_BODY))}"><b>Start a new game →</b></a>`;

  const r = state.record || {};
  const recent = state.recent && state.recent.length
    ? `<br>Recent games: ${state.recent.map((g) => {
        const names = (g.players || []).map((p) => `@${escapeHtml(p)}`).join(', ');
        return `${names} (${RESULT_WORD[g.result] || g.result})`;
      }).join(' · ')}`
    : '';

  return `<p align="center">
${rows}
</p>
<p align="center">${status}${again}</p>
<p align="center"><sub>You play <b>X</b>. The AI plays <b>O</b> with full minimax: it searches every possible game before moving, so it never loses.<br>
Each square opens a pre-filled issue; a GitHub Action plays the AI's reply and redraws this board.<br>
Scoreboard: Humans <b>${escapeHtml(r.human ?? 0)}</b> · AI <b>${escapeHtml(r.ai ?? 0)}</b> · Draws <b>${escapeHtml(r.draw ?? 0)}</b>${recent}</sub></p>`;
}
