import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const gameyService = express();
const PORT = process.env.PORT || 3001;
const GAMEY_RUST_URL = process.env.GAMEY_RUST_URL || 'http://localhost:4000';
const BOT_ID = 'gamer_bot';
const API_VERSION = 'v1';

gameyService.use(cors());
gameyService.use(bodyParser.json());

// ─── In-memory session store ───────────────────────────────────────────────────
const sessions = new Map();

// ─── YEN helpers ──────────────────────────────────────────────────────────────
// Layout format: rows separated by '/', row 0 has 1 cell, row N has N+1 cells
// Player 0 = 'B' (Blue), Player 1 = 'R' (Red)
// Moves stored as { player, x (col within row), y (row index) }

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

// ─── Call Rust engine ─────────────────────────────────────────────────────────
// POST /v1/ybot/choose/gamer_bot  body: YEN
// Response: { api_version, bot_id, coords: { x, y, z } }  (barycentric x+y+z=size-1)
//
// The triangular board rows go from top (row 0, 1 cell) to bottom (row N-1, N cells).
// Barycentric (x,y,z) where x+y+z = size-1:
//   row  = (size-1) - z        (distance from top)
//   col  = x                   (position within that row)
// This matches how GameY::to_index works in Rust: idx = row*(row+1)/2 + col

function barycentricToRowCol(x, y, z, boardSize) {
  const row = (boardSize - 1) - z;
  const col = x;
  // Validate: col must be in [0, row]
  if (row < 0 || row >= boardSize || col < 0 || col > row) {
    console.warn(`[COORDS] Out of bounds: x=${x} y=${y} z=${z} → row=${row} col=${col}`);
    return null;
  }
  return { x: col, y: row };
}

// Pick a random free cell as fallback when bot returns bad coords
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

async function getBotMove(moves, boardSize, nextPlayer) {
  const yen = buildYEN(moves, boardSize, nextPlayer);
  console.log('[YEN sent to Rust]', JSON.stringify(yen));

  const res = await fetch(
      `${GAMEY_RUST_URL}/${API_VERSION}/ybot/choose/${BOT_ID}`,
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

function newSession(id, mode, boardSize) {
  return { id, mode, boardSize, moves: [], status: 'ongoing', currentPlayer: 0, winner: null };
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
    layout: buildLayout(s.moves, s.boardSize),
  };
}

function isBoardFull(moves, boardSize) {
  return moves.length >= (boardSize * (boardSize + 1)) / 2;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /play/create
gameyService.post('/play/create', (req, res) => {
  const { mode, boardSize = 11 } = req.body;
  if (!['hvh', 'hvb'].includes(mode))
    return res.status(400).json({ error: "mode must be 'hvh' or 'hvb'" });
  if (!Number.isInteger(boardSize) || boardSize < 2 || boardSize > 11)
    return res.status(400).json({ error: 'boardSize must be an integer between 2 and 11' });

  const id = uuidv4();
  sessions.set(id, newSession(id, mode, boardSize));
  console.log(`[CREATE] game=${id} mode=${mode} size=${boardSize}`);
  return res.status(201).json(sessionView(sessions.get(id)));
});

// GET /play/:gameId
gameyService.get('/play/:gameId', (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  return res.json(sessionView(s));
});

// POST /play/:gameId/move  { player: 0|1, x, y }
gameyService.post('/play/:gameId/move', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  if (s.status === 'finished') return res.status(400).json({ error: 'Game already finished' });

  const { player, x, y } = req.body;
  if (player === undefined || x === undefined || y === undefined)
    return res.status(400).json({ error: 'player, x and y are required' });
  if (player !== s.currentPlayer)
    return res.status(400).json({ error: `It is player ${s.currentPlayer}'s turn` });
  if (s.mode === 'hvb' && player === 1)
    return res.status(400).json({ error: 'Player 1 is the bot — it moves automatically' });
  if (s.moves.some(m => m.x === x && m.y === y))
    return res.status(400).json({ error: `Cell (${x},${y}) is already occupied` });

  // Apply human move
  s.moves.push({ player, x, y });
  s.currentPlayer = player === 0 ? 1 : 0;
  if (isBoardFull(s.moves, s.boardSize)) s.status = 'finished';

  const response = { ...sessionView(s), botMove: null };

  // Bot auto-responds in hvb mode
  if (s.mode === 'hvb' && s.status === 'ongoing') {
    try {
      const botCoords = await getBotMove(s.moves, s.boardSize, s.currentPlayer);

      if (!botCoords) {
        // No free cells left — board is effectively full
        s.status = 'finished';
        response.status = s.status;
        return res.json(response);
      }

      s.moves.push({ player: 1, ...botCoords });
      s.currentPlayer = 0;
      if (isBoardFull(s.moves, s.boardSize)) s.status = 'finished';

      response.botMove = botCoords;
      response.moves = s.moves;
      response.currentPlayer = s.currentPlayer;
      response.status = s.status;
      response.layout = buildLayout(s.moves, s.boardSize);
      console.log(`[BOT] game=${s.id} coords=(${botCoords.x},${botCoords.y})`);
    } catch (err) {
      console.error('[BOT] Rust engine error:', err.message);
      response.error = 'Bot move failed — retry with POST /play/:id/bot-move';
    }
  }

  console.log(`[MOVE] game=${s.id} player=${player} (${x},${y}) status=${s.status}`);
  return res.json(response);
});

// POST /play/:gameId/bot-move  — manual bot trigger / retry
gameyService.post('/play/:gameId/bot-move', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  if (s.mode !== 'hvb') return res.status(400).json({ error: 'Only available in hvb mode' });
  if (s.status === 'finished') return res.status(400).json({ error: 'Game already finished' });
  if (s.currentPlayer !== 1) return res.status(400).json({ error: "It is the human's turn" });

  try {
    const botCoords = await getBotMove(s.moves, s.boardSize, s.currentPlayer);
    s.moves.push({ player: 1, ...botCoords });
    s.currentPlayer = 0;
    if (isBoardFull(s.moves, s.boardSize)) s.status = 'finished';
    console.log(`[BOT-MOVE] game=${s.id} coords=(${botCoords.x},${botCoords.y})`);
    return res.json({ ...sessionView(s), lastMove: botCoords });
  } catch (err) {
    console.error('[BOT-MOVE]', err.message);
    return res.status(502).json({ error: 'Game engine unavailable', detail: err.message });
  }
});

// POST /play/:gameId/rematch
gameyService.post('/play/:gameId/rematch', (req, res) => {
  const old = sessions.get(req.params.gameId);
  if (!old) return res.status(404).json({ error: 'Game not found' });
  const id = uuidv4();
  sessions.set(id, newSession(id, old.mode, old.boardSize));
  sessions.delete(old.id);
  console.log(`[REMATCH] new=${id} old=${old.id}`);
  return res.status(201).json(sessionView(sessions.get(id)));
});

// DELETE /play/:gameId
gameyService.delete('/play/:gameId', (req, res) => {
  if (!sessions.delete(req.params.gameId))
    return res.status(404).json({ error: 'Game not found' });
  return res.json({ message: 'Game deleted' });
});

// GET /health  — also pings Rust engine's /status endpoint
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