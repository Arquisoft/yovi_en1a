import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ─── Mock fetch globally before importing the app ─────────────────────────────
global.fetch = vi.fn();

const { default: app } = await import('../gamey-service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Makes the Rust engine return a valid bot move with given barycentric coords */
function mockRustBotMove(x, y, z) {
    global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ api_version: 'v1', bot_id: 'gamer_bot', coords: { x, y, z } }),
    });
}

/** Makes the Rust /status endpoint return OK */
function mockRustStatus(ok = true) {
    global.fetch.mockResolvedValueOnce({ ok });
}

/** Creates a game and returns its gameId */
async function createGame(mode = 'hvb', boardSize = 5) {
    const res = await request(app)
        .post('/game/create')
        .send({ mode, boardSize });
    return res.body.gameId;
}

/** Creates a game and makes one human move, with a bot response mocked */
async function createGameAndMove(x, y, botX, botY, botZ) {
    const gameId = await createGame('hvb', 5);
    mockRustBotMove(botX, botY, botZ);
    const res = await request(app)
        .post(`/game/${gameId}/move`)
        .send({ player: 0, x, y });
    return { gameId, res };
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── POST /game/create ────────────────────────────────────────────────────────

describe('POST /game/create', () => {
    test('creates hvb game with default boardSize 11', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'hvb' });
        expect(res.status).toBe(201);
        expect(res.body.mode).toBe('hvb');
        expect(res.body.boardSize).toBe(11);
        expect(res.body.gameId).toBeDefined();
        expect(res.body.status).toBe('ongoing');
        expect(res.body.currentPlayer).toBe(0);
        expect(res.body.moves).toEqual([]);
    });

    test('creates hvh game with custom boardSize', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'hvh', boardSize: 5 });
        expect(res.status).toBe(201);
        expect(res.body.mode).toBe('hvh');
        expect(res.body.boardSize).toBe(5);
    });

    test('returns 400 for invalid mode', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'invalid' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/mode must be/);
    });

    test('returns 400 for boardSize too small', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'hvb', boardSize: 1 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/boardSize/);
    });

    test('returns 400 for boardSize too large', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'hvb', boardSize: 12 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/boardSize/);
    });

    test('returns 400 for non-integer boardSize', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'hvb', boardSize: 3.5 });
        expect(res.status).toBe(400);
    });

    test('layout is all dots on empty board', async () => {
        const res = await request(app).post('/game/create').send({ mode: 'hvb', boardSize: 3 });
        // Size 3: rows "." / ".." / "..." → "./../..."
        expect(res.body.layout).toBe('./../...');
    });

    test('each created game has a unique gameId', async () => {
        const r1 = await request(app).post('/game/create').send({ mode: 'hvh', boardSize: 5 });
        const r2 = await request(app).post('/game/create').send({ mode: 'hvh', boardSize: 5 });
        expect(r1.body.gameId).not.toBe(r2.body.gameId);
    });
});

// ─── GET /game/:gameId ────────────────────────────────────────────────────────

describe('GET /game/:gameId', () => {
    test('returns game state for valid gameId', async () => {
        const gameId = await createGame('hvh', 5);
        const res = await request(app).get(`/game/${gameId}`);
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBe(gameId);
        expect(res.body.status).toBe('ongoing');
    });

    test('returns 404 for unknown gameId', async () => {
        const res = await request(app).get('/game/nonexistent-id');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });
});

// ─── POST /game/:gameId/move — hvh ───────────────────────────────────────────

describe('POST /game/:gameId/move (hvh)', () => {
    test('places a move and switches turn', async () => {
        const gameId = await createGame('hvh', 5);
        const res = await request(app)
            .post(`/game/${gameId}/move`)
            .send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(200);
        expect(res.body.currentPlayer).toBe(1);
        expect(res.body.moves).toHaveLength(1);
        expect(res.body.moves[0]).toEqual({ player: 0, x: 0, y: 0 });
    });

    test('both players alternate correctly', async () => {
        const gameId = await createGame('hvh', 5);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        const res = await request(app).post(`/game/${gameId}/move`).send({ player: 1, x: 1, y: 1 });
        expect(res.status).toBe(200);
        expect(res.body.currentPlayer).toBe(0);
        expect(res.body.moves).toHaveLength(2);
    });

    test('returns 400 when wrong player moves', async () => {
        const gameId = await createGame('hvh', 5);
        const res = await request(app)
            .post(`/game/${gameId}/move`)
            .send({ player: 1, x: 0, y: 0 }); // P1 tries to go first
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/player 0/);
    });

    test('returns 400 for occupied cell', async () => {
        const gameId = await createGame('hvh', 5);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        await request(app).post(`/game/${gameId}/move`).send({ player: 1, x: 1, y: 1 });
        const res = await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/already occupied/);
    });

    test('returns 400 for missing fields', async () => {
        const gameId = await createGame('hvh', 5);
        const res = await request(app).post(`/game/${gameId}/move`).send({ player: 0 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/required/);
    });

    test('returns 404 for unknown game', async () => {
        const res = await request(app).post('/game/bad-id/move').send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(404);
    });

    test('returns 400 when game is already finished', async () => {
        // Fill a size-2 board (3 cells) to finish the game
        const gameId = await createGame('hvh', 2);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        await request(app).post(`/game/${gameId}/move`).send({ player: 1, x: 0, y: 1 });
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 1, y: 1 });
        // Board is full now
        const res = await request(app).post(`/game/${gameId}/move`).send({ player: 1, x: 0, y: 0 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/finished/);
    });

    test('layout reflects placed moves', async () => {
        const gameId = await createGame('hvh', 3);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        const res = await request(app).get(`/game/${gameId}`);
        // Row 0 should be 'B', rest dots
        expect(res.body.layout.startsWith('B/')).toBe(true);
    });
});

// ─── POST /game/:gameId/move — hvb ───────────────────────────────────────────

describe('POST /game/:gameId/move (hvb)', () => {
    test('bot responds automatically after human move', async () => {
        // Bot returns barycentric (1,0,3) on size-5 board → row=5-1-3=1, col=1
        const { res } = await createGameAndMove(0, 0, 1, 0, 3);
        expect(res.status).toBe(200);
        expect(res.body.botMove).toEqual({ x: 1, y: 1 });
        expect(res.body.moves).toHaveLength(2);
        expect(res.body.currentPlayer).toBe(0); // back to human
    });

    test('returns 400 if human tries to play as bot (player 1)', async () => {
        const gameId = await createGame('hvb', 5);
        mockRustBotMove(1, 0, 3);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        // After the human+bot move, it's player 0's turn again — submitting as player 1 hits the turn check first
        const res = await request(app).post(`/game/${gameId}/move`).send({ player: 1, x: 2, y: 2 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/player 0/i);
    });

    test('handles Rust engine failure gracefully', async () => {
        const gameId = await createGame('hvb', 5);
        global.fetch.mockRejectedValueOnce(new Error('connection refused'));
        const res = await request(app)
            .post(`/game/${gameId}/move`)
            .send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(200); // human move still saved
        expect(res.body.moves).toHaveLength(1);
        expect(res.body.error).toMatch(/bot move failed/i);
        expect(res.body.currentPlayer).toBe(1); // still bot's turn
    });

    test('handles Rust engine returning non-ok response', async () => {
        const gameId = await createGame('hvb', 5);
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'bot error' }),
        });
        const res = await request(app)
            .post(`/game/${gameId}/move`)
            .send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(200);
        expect(res.body.error).toMatch(/bot move failed/i);
    });

    test('bot fallback used when Rust returns out-of-bounds coords', async () => {
        const gameId = await createGame('hvb', 5);
        // z=99 → row = 5-1-99 = -95, out of bounds → triggers randomFreeCell
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ api_version: 'v1', bot_id: 'gamer_bot', coords: { x: 0, y: 0, z: 99 } }),
        });
        const res = await request(app)
            .post(`/game/${gameId}/move`)
            .send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(200);
        // Fallback should still place a bot move somewhere
        expect(res.body.moves).toHaveLength(2);
        expect(res.body.botMove).not.toBeNull();
    });

    test('bot fallback used when Rust returns already-occupied coords', async () => {
        const gameId = await createGame('hvb', 5);
        // First move: human at (0,0). Bot returns (0,0,4) → row=0, col=0 — same cell
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ api_version: 'v1', bot_id: 'gamer_bot', coords: { x: 0, y: 0, z: 4 } }),
        });
        const res = await request(app)
            .post(`/game/${gameId}/move`)
            .send({ player: 0, x: 0, y: 0 });
        expect(res.status).toBe(200);
        expect(res.body.moves).toHaveLength(2);
        // Bot cell must differ from human's
        expect(res.body.botMove).not.toEqual({ x: 0, y: 0 });
    });
});

// ─── POST /game/:gameId/bot-move ─────────────────────────────────────────────

describe('POST /game/:gameId/bot-move', () => {
    test('triggers bot move when it is bot turn', async () => {
        const gameId = await createGame('hvb', 5);
        // Human move — bot response fails so currentPlayer stays 1
        global.fetch.mockRejectedValueOnce(new Error('timeout'));
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });

        // Now manually trigger bot
        mockRustBotMove(1, 0, 3); // → row=1, col=1
        const res = await request(app).post(`/game/${gameId}/bot-move`);
        expect(res.status).toBe(200);
        expect(res.body.lastMove).toEqual({ x: 1, y: 1 });
        expect(res.body.currentPlayer).toBe(0);
    });

    test('returns 400 in hvh mode', async () => {
        const gameId = await createGame('hvh', 5);
        const res = await request(app).post(`/game/${gameId}/bot-move`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/hvb/i);
    });

    test("returns 400 when it is human's turn", async () => {
        const gameId = await createGame('hvb', 5);
        // No move made yet — still player 0's turn
        const res = await request(app).post(`/game/${gameId}/bot-move`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/human/i);
    });

    test('returns 404 for unknown game', async () => {
        const res = await request(app).post('/game/bad-id/bot-move');
        expect(res.status).toBe(404);
    });

    test('returns 502 when Rust engine is down', async () => {
        const gameId = await createGame('hvb', 5);
        global.fetch.mockRejectedValueOnce(new Error('timeout'));
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });

        global.fetch.mockRejectedValueOnce(new Error('timeout'));
        const res = await request(app).post(`/game/${gameId}/bot-move`);
        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/unavailable/i);
    });
});

// ─── POST /game/:gameId/rematch ───────────────────────────────────────────────

describe('POST /game/:gameId/rematch', () => {
    test('creates a new game with same settings and removes old one', async () => {
        const gameId = await createGame('hvb', 5);
        const res = await request(app).post(`/game/${gameId}/rematch`);
        expect(res.status).toBe(201);
        expect(res.body.gameId).not.toBe(gameId);
        expect(res.body.mode).toBe('hvb');
        expect(res.body.boardSize).toBe(5);
        expect(res.body.moves).toEqual([]);

        // Old game should be gone
        const old = await request(app).get(`/game/${gameId}`);
        expect(old.status).toBe(404);
    });

    test('returns 404 for unknown game', async () => {
        const res = await request(app).post('/game/bad-id/rematch');
        expect(res.status).toBe(404);
    });
});

// ─── DELETE /game/:gameId ─────────────────────────────────────────────────────

describe('DELETE /game/:gameId', () => {
    test('deletes an existing game', async () => {
        const gameId = await createGame('hvh', 5);
        const del = await request(app).delete(`/game/${gameId}`);
        expect(del.status).toBe(200);
        expect(del.body.message).toMatch(/deleted/i);

        const get = await request(app).get(`/game/${gameId}`);
        expect(get.status).toBe(404);
    });

    test('returns 404 for unknown game', async () => {
        const res = await request(app).delete('/game/nonexistent');
        expect(res.status).toBe(404);
    });
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
    test('returns ok when Rust engine is reachable', async () => {
        mockRustStatus(true);
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.api).toBe('ok');
        expect(res.body.rustEngine).toBe('ok');
        expect(typeof res.body.activeSessions).toBe('number');
    });

    test('reports rustEngine unreachable when fetch fails', async () => {
        global.fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.rustEngine).toBe('unreachable');
    });

    test('reports rustEngine unreachable when status not ok', async () => {
        mockRustStatus(false);
        const res = await request(app).get('/health');
        expect(res.body.rustEngine).toBe('unreachable');
    });

    test('activeSessions reflects live session count', async () => {
        mockRustStatus(true);
        const before = (await request(app).get('/health')).body.activeSessions;
        await createGame('hvh', 5);
        mockRustStatus(true);
        const after = (await request(app).get('/health')).body.activeSessions;
        expect(after).toBe(before + 1);
    });
});

// ─── buildLayout (internal, tested via API) ───────────────────────────────────

describe('layout string correctness', () => {
    test('size-2 board with one B at (0,0) produces correct layout', async () => {
        const gameId = await createGame('hvh', 2);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        const res = await request(app).get(`/game/${gameId}`);
        // Row 0: 'B', Row 1: '..'  → "B/.."
        expect(res.body.layout).toBe('B/..');
    });

    test('size-2 board with R at (1,1) produces correct layout', async () => {
        const gameId = await createGame('hvh', 2);
        await request(app).post(`/game/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
        await request(app).post(`/game/${gameId}/move`).send({ player: 1, x: 1, y: 1 });
        const res = await request(app).get(`/game/${gameId}`);
        expect(res.body.layout).toBe('B/.R');
    });
});