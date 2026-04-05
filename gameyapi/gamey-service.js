import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const gameyService = express();
const PORT = process.env.PORT || 3001;
const GAMEY_RUST_URL = process.env.GAMEY_RUST_URL || 'http://localhost:4000';

const API_VERSION = 'v1';

gameyService.use(cors());
gameyService.use(bodyParser.json());

// ─── In-memory session store ───────────────────────────────────────────────────
const sessions = new Map();

// ─── YEN helpers ──────────────────────────────────────────────────────────────

function buildLayout(moves, boardSize) {
  const totalCells = (boardSize * (boardSize + 1)) / 2;
  const cells = Array(totalCells).fill('.');

  for (const m of moves) {
    const idx = (m.y * (m.y + 1)) / 2 + m.x;
    cells[idx] = m.player === 0 ? 'B' : 'R';
  }

  const rows = [];
  let cursor = 0;
  for (let row = 0; row < boardSize; row++) {
    rows.push(cells.slice(cursor, cursor + row + 1).join(''));
    cursor += row + 1;
  }
  return rows.join('/');
}

function buildYEN(moves, boardSize, nextPlayer) {
  return {
    size: boardSize,
    turn: nextPlayer,
    players: ['B', 'R'],
    layout: buildLayout(moves, boardSize),
  };
}

// ─── Win detection (mirrors Rust union-find logic) ────────────────────────────
//
// Triangular board: row ∈ [0, size-1], col ∈ [0, row]
// Barycentric: x = size-1-row, y = col, z = row-col
//
// Three sides a player must connect to win:
//   Side A (apex row):  row === 0              (x = size-1)
//   Side B (left edge): col === 0              (y = 0)
//   Side C (right edge): col === row           (z = 0)
//
// Six neighbors of (row, col):
//   (row-1, col-1), (row-1, col)   — row above
//   (row,   col-1), (row,   col+1) — same row
//   (row+1, col),   (row+1, col+1) — row below

function getNeighbors(row, col, boardSize) {
  const neighbors = [];
  const candidates = [
    [row - 1, col - 1],
    [row - 1, col],
    [row,     col - 1],
    [row,     col + 1],
    [row + 1, col],
    [row + 1, col + 1],
  ];
  for (const [r, c] of candidates) {
    if (r >= 0 && r < boardSize && c >= 0 && c <= r) {
      neighbors.push([r, c]);
    }
  }
  return neighbors;
}

function touchesSideA(row, boardSize) { return row === boardSize - 1; } // bottom edge
function touchesSideB(col)       { return col === 0; }         // left edge
function touchesSideC(row, col)  { return col === row; }       // right edge

/**
 * Check whether `player` (0 or 1) has won given the current move list.
 * Uses union-find over the player's stones tracking which of the three
 * sides each connected component touches.
 *
 * Returns true if the player has a group touching all three sides.
 */
function checkWin(moves, boardSize, player) {
  const symbol = player === 0 ? 'B' : 'R';

  // Build a Set of occupied cells for fast lookup: key = row*1000+col
  const playerCells = new Map(); // key → { row, col }
  for (const m of moves) {
    if (m.player === player) {
      const key = m.y * 1000 + m.x; // y=row, x=col in session move format
      playerCells.set(key, { row: m.y, col: m.x });
    }
  }

  if (playerCells.size === 0) return false;

  // Union-Find
  const keys = [...playerCells.keys()];
  const parent = new Map(keys.map(k => [k, k]));
  const sideA  = new Map(keys.map(k => [k, touchesSideA(playerCells.get(k).row, boardSize)]));
  const sideB  = new Map(keys.map(k => [k, touchesSideB(playerCells.get(k).col)]));
  const sideC  = new Map(keys.map(k => [k, touchesSideC(playerCells.get(k).row, playerCells.get(k).col)]));

  function find(k) {
    if (parent.get(k) !== k) parent.set(k, find(parent.get(k)));
    return parent.get(k);
  }

  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    parent.set(ra, rb);
    sideA.set(rb, sideA.get(rb) || sideA.get(ra));
    sideB.set(rb, sideB.get(rb) || sideB.get(ra));
    sideC.set(rb, sideC.get(rb) || sideC.get(ra));
  }

  // Union each stone with its neighbors that also belong to this player
  for (const [key, { row, col }] of playerCells) {
    for (const [nr, nc] of getNeighbors(row, col, boardSize)) {
      const nk = nr * 1000 + nc;
      if (playerCells.has(nk)) union(key, nk);
    }
  }

  // Check if any root touches all three sides
  let winningRoot = null;
  for (const key of keys) {
    const root = find(key);
    if (sideA.get(root) && sideB.get(root) && sideC.get(root)) {
      winningRoot = root;
      break;
    }
  }

  if (winningRoot !== null) {
    const path = [];
    for (const key of keys) {
      if (find(key) === winningRoot) {
        const cell = playerCells.get(key);
        path.push({ x: cell.col, y: cell.row });
      }
    }
    return { win: true, path };
  }
  
  return { win: false, path: [] };
}

/**
 * After a move is pushed onto s.moves, check both players for a win
 * and update s.status / s.winner accordingly.
 * Returns true if the game just ended.
 */
// Replace the updateWinStatus function with this corrected version:

function updateWinStatus(s) {
  // Check the player who just moved first (most likely winner)
  const lastPlayer = s.moves[s.moves.length - 1]?.player;
  const toCheck = lastPlayer !== undefined
      ? [lastPlayer, 1 - lastPlayer]
      : [0, 1];

  for (const p of toCheck) {
    const result = checkWin(s.moves, s.boardSize, p);
    if (result.win) {
      s.status = 'finished';
      s.winner = p;
      s.winningPath = result.path;
      return true;
    }
  }

  if (isBoardFull(s.moves, s.boardSize)) {
    s.status = 'finished';
    s.winner = null; // Draw
    return true;
  }

  s.status = 'ongoing';
  return false;
}

// ─── Call Rust engine ─────────────────────────────────────────────────────────

function barycentricToRowCol(x, y, z, boardSize) {
  const row = (boardSize - 1) - z;
  const col = x;
  if (row < 0 || row >= boardSize || col < 0 || col > row) {
    console.warn(`[COORDS] Out of bounds: x=${x} y=${y} z=${z} → row=${row} col=${col}`);
    return null;
  }
  return { x: col, y: row };
}

function randomFreeCell(moves, boardSize) {
  const occupied = new Set(moves.map(m => m.y * 100 + m.x));
  const free = [];
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col <= row; col++) {
      if (!occupied.has(row * 100 + col)) free.push({ x: col, y: row });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

async function getBotMove(moves, boardSize, nextPlayer,difficulty) {
  const yen = buildYEN(moves, boardSize, nextPlayer);
  console.log('[YEN sent to Rust]', JSON.stringify(yen));

  let botToCall = 'gamer_bot';
  
  if (difficulty === 'beginner') {
    botToCall = 'easy_level_bot'; 
  }else if (difficulty === 'medium') {
     botToCall = 'gamer_bot'; }
  else if (difficulty === 'advanced') {
    botToCall = 'gamer_bot'; 
  }

  console.log(`[BOT] Difficulty: ${difficulty} -> Target Bot: ${botToCall}`);

  const res = await fetch(
      `${GAMEY_RUST_URL}/${API_VERSION}/ybot/choose/${botToCall}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yen),
      }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Rust engine error ${res.status}`);

  console.log('[Rust coords]', data.coords);

  const { x, y, z } = data.coords;
  const coords = barycentricToRowCol(x, y, z, boardSize);

  if (!coords) {
    console.warn('[BOT] Invalid coords from Rust, using random fallback');
    return randomFreeCell(moves, boardSize);
  }

  const occupied = moves.some(m => m.x === coords.x && m.y === coords.y);
  if (occupied) {
    console.warn(`[BOT] Cell (${coords.x},${coords.y}) already taken, using random fallback`);
    return randomFreeCell(moves, boardSize);
  }

  return coords;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function newSession(id, mode, boardSize, difficulty) {
  return { id, mode, boardSize, difficulty: difficulty, moves: [], status: 'ongoing', currentPlayer: 0, winner: null };
}

function sessionView(s) {
  return {
    gameId: s.id,
    mode: s.mode,
    boardSize: s.boardSize,
    moves: s.moves,
    status: s.status,
    currentPlayer: s.currentPlayer,
    winner: s.winner,
    winningPath: s.winningPath || [],
    layout: buildLayout(s.moves, s.boardSize),
  };
}

function isBoardFull(moves, boardSize) {
  return moves.length >= (boardSize * (boardSize + 1)) / 2;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

gameyService.post('/play/create', (req, res) => {
  const { mode, boardSize = 11, difficulty } = req.body;
  if (!['hvh', 'hvb'].includes(mode))
    return res.status(400).json({ error: "mode must be 'hvh' or 'hvb'" });
  if (!Number.isInteger(boardSize) || boardSize < 5 || boardSize > 15)
    return res.status(400).json({ error: 'boardSize must be an integer between 5 and 15' });

  const id = uuidv4();
 sessions.set(id, newSession(id, mode, boardSize, difficulty));
  console.log(`[CREATE] game=${id} mode=${mode} size=${boardSize}`);
  return res.status(201).json(sessionView(sessions.get(id)));
});

gameyService.get('/play/:gameId', (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  return res.json(sessionView(s));
});


// In the POST /play/:gameId/move handler, update the response handling:

gameyService.post('/play/:gameId/move', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  if (s.status === 'finished') return res.status(400).json({ error: 'Game already finished' });

  const { player, x, y } = req.body;
  if (player === undefined || x === undefined || y === undefined)
    return res.status(400).json({ error: 'player, x and y are required' });

  if (s.mode === 'hvb' && player === 1)
    return res.status(400).json({ error: 'Player 1 is the bot' });

  if (player !== s.currentPlayer)
    return res.status(400).json({ error: `It is player ${s.currentPlayer}'s turn` });

  if (x < 0 || y < 0 || y >= s.boardSize || x > y)
    return res.status(400).json({ error: `Invalid coordinates (${x},${y}) for board size ${s.boardSize}` });

  if (s.moves.some(m => m.x === x && m.y === y))
    return res.status(400).json({ error: `Cell (${x},${y}) is already occupied` });

  s.moves.push({ player, x, y });
  s.currentPlayer = player === 0 ? 1 : 0;

  const gameEnded = updateWinStatus(s);
  console.log(`[DEBUG] After move: status=${s.status}, winner=${s.winner}, gameEnded=${gameEnded}`);

  let response = sessionView(s);
  response.botMove = null;

  if (s.mode === 'hvb' && s.status === 'ongoing') {
    try {
      const botCoords = await getBotMove(s.moves, s.boardSize, s.currentPlayer, s.difficulty);

      if (!botCoords) {
        s.status = 'finished';
        s.winner = s.currentPlayer === 0 ? 1 : 0;
        response = sessionView(s);
        console.log(`[DEBUG] No bot moves, game finished: status=${s.status}`);
        return res.json(response);
      }

      s.moves.push({ player: 1, ...botCoords });
      s.currentPlayer = 0;

      const botGameEnded = updateWinStatus(s);
      console.log(`[DEBUG] After bot move: status=${s.status}, winner=${s.winner}, gameEnded=${botGameEnded}`);

      response = sessionView(s);
      response.botMove = botCoords;
      console.log(`[BOT] game=${s.id} coords=(${botCoords.x},${botCoords.y})`);
    } catch (err) {
      console.error('[BOT] Rust engine error:', err.message);
      response = sessionView(s);
      response.error = 'Bot move failed — retry with POST /play/:id/bot-move';
    }
  }

  console.log(`[MOVE] game=${s.id} player=${player} (${x},${y}) status=${s.status} winner=${s.winner}`);

  console.log(`[DEBUG] Response status field: ${response.status}`);

  return res.json(response);
});

gameyService.post('/play/:gameId/bot-move', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  if (s.mode !== 'hvb') return res.status(400).json({ error: 'Only available in hvb mode' });
  if (s.status === 'finished') return res.status(400).json({ error: 'Game already finished' });
  if (s.currentPlayer !== 1) return res.status(400).json({ error: "It is the human's turn" });

  try {
    const botCoords = await getBotMove(s.moves, s.boardSize, s.currentPlayer, s.difficulty);
    s.moves.push({ player: 1, ...botCoords });
    s.currentPlayer = 0;

    // ← Win check after manual bot-move trigger
    updateWinStatus(s);

    console.log(`[BOT-MOVE] game=${s.id} coords=(${botCoords.x},${botCoords.y}) winner=${s.winner}`);
    return res.json({ ...sessionView(s), lastMove: botCoords });
  } catch (err) {
    console.error('[BOT-MOVE]', err.message);
    return res.status(502).json({ error: 'Game engine unavailable', detail: err.message });
  }
});

gameyService.post('/play/:gameId/undo', (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  if (s.moves.length === 0) return res.status(400).json({ error: 'No moves to undo' });

  // In hvb mode, undo both the bot's and human's move if the bot already responded
  // (currentPlayer === 0 means it's human's turn, so bot already moved).
  // If currentPlayer === 1, only the human has moved — undo just 1.
  // In hvh mode, always undo just the last move.
  let undoCount = 1;
  if (s.mode === 'hvb' && s.currentPlayer === 0 && s.moves.length >= 2) {
    undoCount = 2;
  }
  const undoCount_safe = Math.min(undoCount, s.moves.length);
  s.moves.splice(-undoCount_safe, undoCount_safe);

  // Recalculate game state
  s.currentPlayer = s.moves.length % 2 === 0 ? 0 : 1;
  s.status = 'ongoing';
  s.winner = null;
  s.winningPath = undefined;

  console.log(`[UNDO] game=${s.id} removed=${undoCount_safe} remaining=${s.moves.length}`);
  return res.json(sessionView(s));
});

gameyService.post('/play/:gameId/rematch', (req, res) => {
  const old = sessions.get(req.params.gameId);
  if (!old) return res.status(404).json({ error: 'Game not found' });
  const id = uuidv4();
  sessions.set(id, newSession(id, old.mode, old.boardSize, old.difficulty));
  sessions.delete(old.id);
  console.log(`[REMATCH] new=${id} old=${old.id}`);
  return res.status(201).json(sessionView(sessions.get(id)));
});

gameyService.delete('/play/:gameId', (req, res) => {
  if (!sessions.delete(req.params.gameId))
    return res.status(404).json({ error: 'Game not found' });
  return res.json({ message: 'Game deleted' });
});

gameyService.get('/health', async (req, res) => {
  let rustOk = false;
  try {
    const r = await fetch(`${GAMEY_RUST_URL}/status`);
    rustOk = r.ok;
  } catch (_) {}
  return res.json({ api: 'ok', rustEngine: rustOk ? 'ok' : 'unreachable', activeSessions: sessions.size });
});

if (process.argv[1] && process.argv[1].endsWith('gamey-service.js')) {
  gameyService.listen(PORT, () => {
    console.log(`Game API  →  http://localhost:${PORT}`);
    console.log(`Rust engine expected at  ${GAMEY_RUST_URL}`);
  });
}

export default gameyService;