import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import promBundle from 'express-prom-bundle';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gameyService = express();

// --- 1. THE CORS FIX ---
const whitelist = [
  'http://localhost',       
  'http://localhost:3000',  
  'http://localhost:80',   
  'http://127.0.0.1',
  'http://20.199.137.85'   
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.some(domain => origin.startsWith(domain))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 
};

gameyService.use(cors(corsOptions));
gameyService.options('*', cors(corsOptions)); 

// --- 2. MIDDLEWARE ---
gameyService.use(express.json());
gameyService.use(promBundle({ includeMethod: true, includePath: true }));

// --- 3. THE SWAGGER FIX ---
try {
    const yamlPath = path.join(__dirname, 'openapi.yaml');
    if (fs.existsSync(yamlPath)) {
        const openApiSpec = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
        gameyService.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
    }
} catch (e) {
    console.error("⚠️ Swagger documentation failed to load:", e.message);
}

// --- 4. CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const GAMEY_RUST_URL = process.env.GAMEY_RUST_URL || 'http://localhost:4000';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi';
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const API_VERSION = 'v1';


// ─── MongoDB connection ─────────────────────────────────────────────────────────
let db;
let mongoClient;

async function connectToMongo() {
  mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  console.log(`[DB] Connected to MongoDB: ${DB_NAME}`);
}

async function closeMongoConnection() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('[DB] Connection closed');
  }
}

// ─── JWT helper ─────────────────────────────────────────────────────────────────

function getUserIdFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || null;
  } catch (err) {
    console.error("JWT Verification failed:", err.message);
    return null;
  }
}

// ─── Save game result to MongoDB ────────────────────────────────────────────────

async function saveGameResult(session) {
  if (!db) return;

  try {
    await db.collection('games').insertOne({
      gameId: session.id,
      userId: session.userId || null,
      mode: session.mode,
      rule: session.rule || 'classic',
      boardSize: session.boardSize,
      winner: session.winner,
      totalMoves: session.moves.length,
      finishedAt: new Date(),
      createdAt: session.createdAt,
    });
    console.log(`[DB] Game ${session.id} saved (Rule: ${session.rule})`);
  } catch (err) {
    console.error('[DB] Failed to save game:', err.message);
  }
}

export { connectToMongo, closeMongoConnection };

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

// ─── Win detection ────────────────────────────────────────────────────────────

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

function touchesSideA(row, boardSize) { return row === boardSize - 1; } 
function touchesSideB(col)       { return col === 0; }             
function touchesSideC(row, col)  { return col === row; }       

function checkWin(moves, boardSize, player) {
  const playerCells = new Map();
  for (const m of moves) {
    if (m.player === player) {
      const key = m.y * 1000 + m.x; 
      playerCells.set(key, { row: m.y, col: m.x });
    }
  }

  if (playerCells.size === 0) return false;

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

  for (const [key, { row, col }] of playerCells) {
    for (const [nr, nc] of getNeighbors(row, col, boardSize)) {
      const nk = nr * 1000 + nc;
      if (playerCells.has(nk)) union(key, nk);
    }
  }

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
function updateWinStatus(s) {
  const lastPlayer = s.moves[s.moves.length - 1]?.player;
  const toCheck = lastPlayer !== undefined ? [lastPlayer, 1 - lastPlayer] : [0, 1];

  for (const p of toCheck) {
    const result = checkWin(s.moves, s.boardSize, p);
    if (result.win) {
      s.status = 'finished';
      s.winner = (s.rule === 'whynot') ? (1 - p) : p;
      s.winningPath = result.path;
      s.coinFlip = null;
      s.needsFlip = false;
      return true;
    }
  }

  if (isBoardFull(s.moves, s.boardSize)) {
    s.status = 'finished';
    s.winner = null;
    s.needsFlip = false;
    return true;
  }

  s.status = 'ongoing';

  if (s.rule === 'fortuney') {
    s.needsFlip = true;   
    s.coinFlip = null;
  } else {
    s.coinFlip = null;
    s.needsFlip = false;
  }

  return false;
}

// ─── Bot Helpers ──────────────────────────────────────────────────────────

function barycentricToRowCol(x, y, z, boardSize) {
  const row = (boardSize - 1) - z;
  const col = x;
  if (row < 0 || row >= boardSize || col < 0 || col > row) return null;
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

async function getBotMove(moves, boardSize, nextPlayer, difficulty) {
  const yen = buildYEN(moves, boardSize, nextPlayer);
  let botToCall = 'gamer_bot';
  
  if (difficulty === 'beginner') botToCall = 'easy_level_bot';
  else if (difficulty === 'medium') botToCall = 'gamer_bot';
  else if (difficulty === 'advanced') botToCall = 'evil_bot'; 

  const res = await fetch(`${GAMEY_RUST_URL}/${API_VERSION}/ybot/choose/${botToCall}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(yen),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Rust engine error ${res.status}`);

  if (data.action) {
    console.log('[BOT] Received action:', data.action);
    return { action: data.action };
  }

  if (!data.coords) {
    console.warn('[BOT] No coords in response, using random fallback');
    return randomFreeCell(moves, boardSize);
  }

  console.log('[Rust response]', data);

  const { x, y, z } = data.coords;
  
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    console.warn('[BOT] Invalid coordinate types from Rust:', data.coords);
    return randomFreeCell(moves, boardSize);
  }

  const coords = barycentricToRowCol(x, y, z, boardSize);

  if (!coords || moves.some(m => m.x === coords.x && m.y === coords.y)) {
    return randomFreeCell(moves, boardSize);
  }
  return coords;
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

function newSession(id, mode, boardSize, userId, difficulty, rule) {
  return { 
    id, mode, boardSize, difficulty: difficulty || 'medium', 
    rule: rule || 'classic',
    moves: [], status: 'ongoing', currentPlayer: 0, 
    winner: null, userId: userId || null, createdAt: new Date() ,
    coinFlip: null, 
    needsFlip: false, 
  };
}

function sessionView(s) {
  return {
    gameId: s.id, mode: s.mode, boardSize: s.boardSize,
    rule: s.rule,
    moves: s.moves, status: s.status, currentPlayer: s.currentPlayer,
    winner: s.winner, winningPath: s.winningPath || [],
    layout: buildLayout(s.moves, s.boardSize),
    coinFlip: s.coinFlip || null,
    needsFlip: s.needsFlip || false,
  };
}

function isBoardFull(moves, boardSize) {
  return moves.length >= (boardSize * (boardSize + 1)) / 2;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function yenLayoutToMoves(layout, boardSize) {
  const rows = layout.split('/');
  const moves = [];
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const ch = rows[row][col];
      if (ch === 'B') moves.push({ player: 0, x: col, y: row });
      else if (ch === 'R') moves.push({ player: 1, x: col, y: row });
    }
  }
  return moves;
}

function rowColToBarycentric(row, col, boardSize) {
  return { x: col, y: row - col, z: (boardSize - 1) - row };
}

gameyService.get('/play', async (req, res) => {
  const { position, bot_id } = req.query;
  if (!position) return res.status(400).json({ error: "'position' query parameter is required" });

  let yen;
  try { yen = JSON.parse(position); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { size: boardSize, turn: nextPlayer, layout } = yen;
  let difficulty = bot_id?.toLowerCase().includes('easy') ? 'beginner' : 'medium';

  const moves = yenLayoutToMoves(layout, boardSize);
  try {
    const result = await getBotMove(moves, boardSize, nextPlayer, difficulty);
    if (!result)
      return res.status(422).json({ error: 'No legal moves available' });

    if (result.action) {
      return res.json({ action: result.action });
    }

    if (result.x === undefined || result.y === undefined || result.x === null || result.y === null) {
      return res.status(422).json({ error: 'Invalid coordinates returned' });
    }

    const bary = rowColToBarycentric(result.y, result.x, boardSize);
    return res.json({ coords: bary });
  } catch (err) {
    return res.status(502).json({ error: 'Engine error' });
  }
});

gameyService.post('/play/create', (req, res) => {
  try {
    const { mode, boardSize = 11, difficulty, rule } = req.body;
    const userId = getUserIdFromRequest(req);
    
    const id = uuidv4();
    const session = newSession(id, mode, boardSize, userId, difficulty, rule);

    if (rule === 'fortuney') {
      session.needsFlip = true;
    }

    sessions.set(id, session);
    return res.status(201).json(sessionView(session));
  } catch (err) {
    console.error("Error in /play/create:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});
gameyService.get('/play/:gameId', (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s) return res.status(404).json({ error: 'Game not found' });
  return res.json(sessionView(s));
});

gameyService.post('/play/:gameId/bot-move', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s || s.status === 'finished' || s.currentPlayer !== 1) {
    return res.status(400).json({ error: 'Not bot turn' });
  }
  try {
    const botCoords = await getBotMove(s.moves, s.boardSize, s.currentPlayer, s.difficulty);
    if (botCoords && !botCoords.action) {
      s.moves.push({ player: 1, ...botCoords });
      updateWinStatus(s);
    }
    const response = sessionView(s);
    response.botMove = botCoords;
    if (s.status === 'finished') saveGameResult(s);
    return res.json(response);
  } catch {
    return res.status(502).json({ error: 'Bot failed' });
  }
});



gameyService.post('/play/:gameId/move', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s || s.status === 'finished') return res.status(400).json({ error: 'Invalid game state' });

  const { player, x, y } = req.body;
  if (player !== s.currentPlayer || s.moves.some(m => m.x === x && m.y === y)) {
    return res.status(400).json({ error: 'Invalid move' });
  }

  s.moves.push({ player, x, y });

  if (s.rule !== 'fortuney') {
    s.currentPlayer = player === 0 ? 1 : 0;
  }
  updateWinStatus(s);

  if (s.rule !== 'fortuney' && s.mode === 'hvb' && s.status === 'ongoing') {
    let safety = 10;
    while (s.currentPlayer === 1 && s.status === 'ongoing' && safety-- > 0) {
      try {
        const botCoords = await getBotMove(s.moves, s.boardSize, s.currentPlayer, s.difficulty);
        if (!botCoords || botCoords.action) break;
        s.moves.push({ player: 1, ...botCoords });
        s.currentPlayer = 0;
        updateWinStatus(s);
      } catch { break; }
    }
  }

  const response = sessionView(s);
  if (s.status === 'finished') saveGameResult(s);
  return res.json(response);
});

gameyService.post('/play/:gameId/flip', async (req, res) => {
  const s = sessions.get(req.params.gameId);
  if (!s || s.status === 'finished' || s.rule !== 'fortuney' || !s.needsFlip) {
    return res.status(400).json({ error: 'Cannot flip now' });
  }

  const heads = Math.random() < 0.5;
  const flipResult = heads ? 'heads' : 'tails'; 
  s.coinFlip = flipResult;
  s.needsFlip = false; 

  if (heads) {
    s.currentPlayer = 0; 
 

} else {
  s.currentPlayer = 1; 
  if (s.mode === 'hvb') {
    try {
      const botCoords = await getBotMove(s.moves, s.boardSize, 1, s.difficulty);
     
      let moveCoords = botCoords;
      if (botCoords && botCoords.action) {
        moveCoords = randomFreeCell(s.moves, s.boardSize);
      }

    
      if (moveCoords) {
        s.moves.push({ player: 1, x: moveCoords.x, y: moveCoords.y });
        updateWinStatus(s); 
        s.coinFlip = flipResult; 
      } else {
        
        s.currentPlayer = 0;
        s.needsFlip = false;
      }
    } catch {
      
      s.currentPlayer = 0;
      s.needsFlip = false;
    }
  }
}

  const response = sessionView(s);
  if (s.status === 'finished') saveGameResult(s);
  return res.json(response);
});

// ─── Profile Routes ───────────────────────────────────────────────────────────

gameyService.post('/profile/avatar', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { avatarUrl } = req.body;

  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) }, 
      { $set: { avatarUrl: avatarUrl } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ success: true, avatarUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update avatar' });
  }
});

gameyService.get('/profile', async (req, res, next) => {
  const userId = getUserIdFromRequest(req);

  if (!userId || userId === 'undefined' || userId === 'null') {
    return res.status(401).json({ error: 'Valid User ID required' });
  }

  try {
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const games = await db.collection('games')
      .find({ userId: userId.toString() })
      .sort({ finishedAt: -1 })
      .toArray();

    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    const matchHistory = (games || []).slice(0, 10).map((g, i) => ({
      id: g.gameId ?? i,
      result: g.winner === 0 ? 'win' : 'lose',
      pts: (g.totalMoves || 0) * 10,
      mode: g.mode || 'hvb',
      rule: g.rule || 'classic', 
    }));

    return res.json({
      winRate: games.length > 0 ? Math.round((games.filter(g => g.winner === 0).length / games.length) * 100) : 0,
      bestScore: games.length > 0 ? Math.max(...games.map(g => (g.totalMoves || 0) * 10)) : 0,
      matchHistory,
      totalGames: games.length,
      avatarUrl: userDoc?.avatarUrl ?? 'default.png' 
    });
  } catch (err) {
    next(err);
  }
});

// ─── Control Routes ──────────────────────────────────────────────────────────

gameyService.post('/play/:gameId/rematch', (req, res) => {
  const old = sessions.get(req.params.gameId);
  if (!old) return res.status(404).json({ error: 'Game not found' });
  const id = uuidv4();
  const session = newSession(id, old.mode, old.boardSize, old.userId, old.difficulty, old.rule);

  if (old.rule === 'fortuney') {
    session.needsFlip = true;
  }

  sessions.set(id, session);
  sessions.delete(old.id);
  return res.status(201).json(sessionView(session));
});

gameyService.delete('/play/:gameId', (req, res) => {
  if (!sessions.delete(req.params.gameId)) return res.status(404).json({ error: 'Game not found' });
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

gameyService.use((err, req, res, next) => {
  console.error('[Fatal Error]:', err.stack);
  
  // Force CORS headers even on crash so the frontend can read the error
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

if (process.argv[1] && (process.argv[1].endsWith('gamey-service.js') || process.argv[1].endsWith('index.js'))) {
  (async () => {
  try {
    await connectToMongo();
    gameyService.listen(PORT, HOST, () => {
      console.log(`🚀 Game API ready at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('[FATAL] MongoDB connection failed:', err);
    gameyService.listen(PORT, HOST, () => {
      console.log(`🚀 API started without DB at http://${HOST}:${PORT}`);
    });
  }
})();
}

export default gameyService;