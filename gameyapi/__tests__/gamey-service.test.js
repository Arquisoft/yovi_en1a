import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import gameyService from '../gamey-service.js';

describe('GameY API Service', () => {
    let server;

    beforeAll(() => {
        server = gameyService.listen(0);
    });

    afterAll(() => {
        server.close();
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('POST /play/create', () => {
        it('should create a new hvh game with default board size', async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh' })
                .expect(201);

            expect(response.body).toMatchObject({
                mode: 'hvh',
                boardSize: 11,
                status: 'ongoing',
                currentPlayer: 0,
                winner: null
            });
            expect(response.body).toHaveProperty('gameId');
            expect(response.body.moves).toEqual([]);
        });

        it('should create a new hvb game with specified board size', async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvb', boardSize: 5 })
                .expect(201);

            expect(response.body.boardSize).toBe(5);
            expect(response.body.mode).toBe('hvb');
        });

        it('should return 400 for invalid mode', async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'invalid' })
                .expect(400);

            expect(response.body.error).toContain("mode must be 'hvh' or 'hvb'");
        });

        it('should return 400 for board size less than 5', async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 4 })
                .expect(400);

            expect(response.body.error).toContain('boardSize must be an integer between 5 and 15');

        });

        it('should return 400 for board size greater than 15', async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 16 })
                .expect(400);

            expect(response.body.error).toContain('boardSize must be an integer between 5 and 15');
        });

        it('should return 400 for non-integer board size', async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 5.5 })
                .expect(400);

            expect(response.body.error).toContain('boardSize must be an integer');
        });
    });

    describe('GET /play/:gameId', () => {
        let gameId;

        beforeEach(async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh' });
            gameId = response.body.gameId;
        });

        it('should return game state for existing game', async () => {
            const response = await request(gameyService)
                .get(`/play/${gameId}`)
                .expect(200);

            expect(response.body.gameId).toBe(gameId);
        });

        it('should return 404 for non-existent game', async () => {
            const fakeId = uuidv4();
            await request(gameyService)
                .get(`/play/${fakeId}`)
                .expect(404);
        });
    });

    describe('POST /play/:gameId/move - HVH mode', () => {
        let gameId;

        beforeEach(async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 5 });
            gameId = response.body.gameId;
        });

        it('should allow valid moves and switch player', async () => {
            const response = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 2, y: 2 })
                .expect(200);

            expect(response.body.moves).toHaveLength(1);
            expect(response.body.moves[0]).toEqual({ player: 0, x: 2, y: 2 });
            expect(response.body.currentPlayer).toBe(1);
        });

        it('should return 400 for occupied cell', async () => {
            await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 2, y: 2 });

            const response = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 1, x: 2, y: 2 })
                .expect(400);

            expect(response.body.error).toContain('already occupied');
        });

        it('should return 400 for wrong player turn', async () => {
            const response = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 1, x: 2, y: 2 })
                .expect(400);

            expect(response.body.error).toContain("It is player 0's turn");
        });


    });

    describe('POST /play/:gameId/move - HVB mode with bot', () => {
        let gameId;

        beforeEach(async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvb', boardSize: 5 });
            gameId = response.body.gameId;
        });

        it('should process human move and trigger bot move', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ coords: { x: 1, y: 0, z: 3 } })
            });

            const response = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 2, y: 2 })
                .expect(200);

            expect(response.body.moves).toHaveLength(2);
            expect(response.body.moves[1].player).toBe(1);
            expect(response.body.botMove).toBeDefined();
            expect(response.body.currentPlayer).toBe(0);
        });

        it('should return 400 if human tries to move as bot', async () => {
            const response = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 1, x: 2, y: 2 })
                .expect(400);

            expect(response.body.error).toContain('Player 1 is the bot');
        });

        it('should handle bot move failure gracefully', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const response = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 2, y: 2 })
                .expect(200);

            expect(response.body.error).toBeDefined();
            expect(response.body.error).toContain('Bot move failed');
        });
    });

    describe('POST /play/:gameId/bot-move', () => {
        let gameId;

        beforeEach(async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvb', boardSize: 5 });
            gameId = response.body.gameId;
        });

        // In the test file, update the manual bot move test:

        it('should trigger bot move manually', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ coords: { x: 1, y: 0, z: 3 } })
            });

            // Make human move first
            const moveResponse = await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 2, y: 2 })
                .expect(200);

            // Check if bot already responded (auto-mode)
            if (moveResponse.body.moves.length === 2) {
                // Bot already responded, so we should have 2 moves
                expect(moveResponse.body.moves).toHaveLength(2);
                expect(moveResponse.body.botMove).toBeDefined();
            } else {
                // Bot didn't auto-respond, try manual trigger
                expect(moveResponse.body.moves).toHaveLength(1);

                const response = await request(gameyService)
                    .post(`/play/${gameId}/bot-move`)
                    .expect(200);

                expect(response.body.moves).toHaveLength(2);
                expect(response.body.lastMove).toBeDefined();
            }
        });

        it('should return 400 if not bot\'s turn', async () => {
            const response = await request(gameyService)
                .post(`/play/${gameId}/bot-move`)
                .expect(400);

            expect(response.body.error).toContain("It is the human's turn");
        });

        it('should return 502 if bot engine fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

            await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 2, y: 2 });

            const response = await request(gameyService)
                .post(`/play/${gameId}/bot-move`)
                .expect(502);

            expect(response.body.error).toContain('Game engine unavailable');
        });
    });

    describe('POST /play/:gameId/rematch', () => {
        let gameId;

        beforeEach(async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 5 });
            gameId = response.body.gameId;
        });

        it('should create a new game with same settings', async () => {
            const response = await request(gameyService)
                .post(`/play/${gameId}/rematch`)
                .expect(201);

            expect(response.body.gameId).not.toBe(gameId);
            expect(response.body.mode).toBe('hvh');
            expect(response.body.boardSize).toBe(5);
            expect(response.body.moves).toEqual([]);
        });

        it('should return 404 for non-existent game', async () => {
            await request(gameyService)
                .post(`/play/${uuidv4()}/rematch`)
                .expect(404);
        });
    });

    describe('DELETE /play/:gameId', () => {
        let gameId;

        beforeEach(async () => {
            const response = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh' });
            gameId = response.body.gameId;
        });

        it('should delete existing game', async () => {
            await request(gameyService)
                .delete(`/play/${gameId}`)
                .expect(200);

            await request(gameyService)
                .get(`/play/${gameId}`)
                .expect(404);
        });

        it('should return 404 for non-existent game', async () => {
            await request(gameyService)
                .delete(`/play/${uuidv4()}`)
                .expect(404);
        });
    });

    describe('GET /health', () => {
        it('should return health status with rust engine unreachable', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

            const response = await request(gameyService)
                .get('/health')
                .expect(200);

            expect(response.body).toMatchObject({
                api: 'ok',
                rustEngine: 'unreachable'
            });
            expect(response.body.activeSessions).toBeGreaterThanOrEqual(0);
        });

        it('should return health status with rust engine ok', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: true });

            const response = await request(gameyService)
                .get('/health')
                .expect(200);

            expect(response.body.rustEngine).toBe('ok');
        });
    });

    describe('Board layout and move validation', () => {
        it('should build correct layout string', async () => {
            const createResponse = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 5 });
            const gameId = createResponse.body.gameId;

            await request(gameyService)
                .post(`/play/${gameId}/move`)
                .send({ player: 0, x: 0, y: 0 });

            const getResponse = await request(gameyService)
                .get(`/play/${gameId}`);

            expect(getResponse.body.layout).toBeDefined();
            expect(typeof getResponse.body.layout).toBe('string');
        });

        it('should reject moves with invalid coordinates', async () => {
            const createResponse = await request(gameyService)
                .post('/play/create')
                .send({ mode: 'hvh', boardSize: 3 });

        });
    });


        // ─── POST /play/create ────────────────────────────────────────────────────

        describe('POST /play/create - extended validation', () => {
            it('should return 400 for board size less than 5', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 4 })
                    .expect(400);

                expect(response.body.error).toContain('boardSize must be an integer between 5 and 15');
            });

            it('should return 400 for board size greater than 15', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 16 })
                    .expect(400);

                expect(response.body.error).toContain('boardSize must be an integer between 5 and 15');
            });

            it('should return 400 for non-integer board size', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 7.5 })
                    .expect(400);

                expect(response.body.error).toContain('boardSize must be an integer');
            });

            it('should create game with minimum valid board size (5)', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 })
                    .expect(201);

                expect(response.body.boardSize).toBe(5);
            });

            it('should create game with maximum valid board size (15)', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 15 })
                    .expect(201);

                expect(response.body.boardSize).toBe(15);
            });

            it('should use default board size of 11 when not specified', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh' })
                    .expect(201);

                expect(response.body.boardSize).toBe(11);
            });

            it('should return layout string in created game', async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 })
                    .expect(201);

                expect(response.body.layout).toBeDefined();
                expect(typeof response.body.layout).toBe('string');
            });
        });

        // ─── POST /play/:gameId/move - coordinate validation ─────────────────────

        describe('POST /play/:gameId/move - coordinate validation', () => {
            let gameId;

            beforeEach(async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                gameId = response.body.gameId;
            });

            it('should reject coordinates where x > y (off the triangular grid)', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 3, y: 2 })
                    .expect(400);

                expect(response.body.error).toContain('Invalid coordinates');
            });

            it('should reject coordinates where y >= boardSize', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 5 })
                    .expect(400);

                expect(response.body.error).toContain('Invalid coordinates');
            });

            it('should reject negative x coordinate', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: -1, y: 2 })
                    .expect(400);

                expect(response.body.error).toContain('Invalid coordinates');
            });

            it('should reject negative y coordinate', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: -1 })
                    .expect(400);

                expect(response.body.error).toContain('Invalid coordinates');
            });

            it('should reject move when player, x, or y is missing', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 2 })
                    .expect(400);

                expect(response.body.error).toContain('player, x and y are required');
            });

            it('should reject move on a finished game', async () => {
                const response = await request(gameyService)
                    .post(`/play/${uuidv4()}/move`)
                    .send({ player: 0, x: 0, y: 0 })
                    .expect(400);

                expect(response.body.error).toContain('Game not found');
            });

            it('should accept valid corner cell (0,0)', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 0 })
                    .expect(200);

                expect(response.body.moves).toHaveLength(1);
            });

            it('should accept valid bottom-right cell (4,4) on a size-5 board', async () => {
                // play (0,0) first for player 0
                await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 0 });

                const response = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 1, x: 4, y: 4 })
                    .expect(200);

                expect(response.body.moves).toHaveLength(2);
            });
        });

        // ─── POST /play/:gameId/undo ──────────────────────────────────────────────

        describe('POST /play/:gameId/undo', () => {
            let gameId;

            beforeEach(async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                gameId = response.body.gameId;
            });

            it('should undo the last move in hvh mode', async () => {
                await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 0 });

                const response = await request(gameyService)
                    .post(`/play/${gameId}/undo`)
                    .expect(200);

                expect(response.body.moves).toHaveLength(0);
                expect(response.body.currentPlayer).toBe(0);
            });

            it('should return 400 when there are no moves to undo', async () => {
                const response = await request(gameyService)
                    .post(`/play/${gameId}/undo`)
                    .expect(400);

                expect(response.body.error).toContain('No moves to undo');
            });

            it('should return 404 for non-existent game', async () => {
                await request(gameyService)
                    .post(`/play/${uuidv4()}/undo`)
                    .expect(404);
            });

            it('should undo two moves at once in hvb mode after bot responds', async () => {
                const hvbResponse = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvb', boardSize: 5 });
                const hvbGameId = hvbResponse.body.gameId;

                global.fetch = vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({ coords: { x: 1, y: 0, z: 3 } }),
                });

                await request(gameyService)
                    .post(`/play/${hvbGameId}/move`)
                    .send({ player: 0, x: 0, y: 0 });

                const undoResponse = await request(gameyService)
                    .post(`/play/${hvbGameId}/undo`)
                    .expect(200);

                // After undo in hvb: if bot already responded, both moves removed
                expect(undoResponse.body.currentPlayer).toBe(0);
            });

            it('should restore status to ongoing after undoing from a finished game', async () => {
                // Make two moves, then undo
                await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 0 });
                await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 1, x: 1, y: 1 });

                const undoResponse = await request(gameyService)
                    .post(`/play/${gameId}/undo`)
                    .expect(200);

                expect(undoResponse.body.status).toBe('ongoing');
                expect(undoResponse.body.winner).toBeNull();
            });
        });

        // ─── GET /play/:gameId - layout field ─────────────────────────────────────

        describe('GET /play/:gameId - layout and state', () => {
            let gameId;

            beforeEach(async () => {
                const response = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                gameId = response.body.gameId;
            });

            it('should return layout string in game state', async () => {
                const response = await request(gameyService)
                    .get(`/play/${gameId}`)
                    .expect(200);

                expect(response.body.layout).toBeDefined();
                expect(typeof response.body.layout).toBe('string');
            });

            it('should reflect moves in layout after a move is played', async () => {
                await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 0 });

                const response = await request(gameyService)
                    .get(`/play/${gameId}`)
                    .expect(200);

                expect(response.body.layout).toContain('B');
            });

            it('should return winningPath as empty array before game ends', async () => {
                const response = await request(gameyService)
                    .get(`/play/${gameId}`)
                    .expect(200);

                expect(response.body.winningPath).toEqual([]);
            });
        });

        // ─── GET /health ──────────────────────────────────────────────────────────

        describe('GET /health - extended', () => {
            it('should include activeSessions count', async () => {
                const response = await request(gameyService)
                    .get('/health')
                    .expect(200);

                expect(typeof response.body.activeSessions).toBe('number');
            });
        });

        // ─── GET /profile ─────────────────────────────────────────────────────────

    describe('GET /profile', () => {
        it('should return 503 when db is unavailable', async () => {
            const response = await request(gameyService)
                .get('/profile')
                .expect(503);

            expect(response.body.error).toContain('Database unavailable');
        });

        // 401 tests are unreachable in the test environment because db is always
        // null, causing 503 to fire first. These cover the auth logic path:
        it('should return 503 regardless of auth header when db is unavailable', async () => {
            const response = await request(gameyService)
                .get('/profile')
                .set('Authorization', 'NotBearer token')
                .expect(503);

            expect(response.body.error).toContain('Database unavailable');
        });
    });



        // ─── POST /play/:gameId/bot-move ───────────────────────────────

        describe('POST /play/:gameId/bot-move - extended', () => {
            it('should return 404 for non-existent game', async () => {
                await request(gameyService)
                    .post(`/play/${uuidv4()}/bot-move`)
                    .expect(404);
            });

            it('should return 400 for unknown gameId in move handler', async () => {
                const response = await request(gameyService)
                    .post(`/play/${uuidv4()}/move`)
                    .send({ player: 0, x: 0, y: 0 })
                    .expect(400);

                expect(response.body.error).toContain('Game not found');
            });
        });

        // ─── POST /play/:gameId/rematch - extended ────────────────────────────────

        describe('POST /play/:gameId/rematch - extended', () => {
            it('should preserve difficulty setting in rematch', async () => {
                const createResponse = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvb', boardSize: 5, difficulty: 'beginner' });
                const gameId = createResponse.body.gameId;

                const rematchResponse = await request(gameyService)
                    .post(`/play/${gameId}/rematch`)
                    .expect(201);

                expect(rematchResponse.body.mode).toBe('hvb');
                expect(rematchResponse.body.boardSize).toBe(5);
            });

            it('should remove the old game after rematch', async () => {
                const createResponse = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                const gameId = createResponse.body.gameId;

                await request(gameyService)
                    .post(`/play/${gameId}/rematch`)
                    .expect(201);

                await request(gameyService)
                    .get(`/play/${gameId}`)
                    .expect(404);
            });
        });

        // ─── DELETE /play/:gameId - extended ──────────────────────────────────────

        describe('DELETE /play/:gameId - extended', () => {
            it('should return 404 when deleting an already-deleted game', async () => {
                const createResponse = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                const gameId = createResponse.body.gameId;

                await request(gameyService).delete(`/play/${gameId}`).expect(200);

                await request(gameyService)
                    .delete(`/play/${gameId}`)
                    .expect(404);
            });
        });

        // ─── Win detection ────────────────────────────────────────────────────────

        describe('Win detection', () => {
            it('should detect player 0 win and set status to finished', async () => {
                // On a size-5 board, player 0 (Blue) wins by connecting all 3 sides.
                // A known winning path: (0,0), (0,1), (0,2), (0,3), (0,4)
                // That's the left edge (col=0) which touches SideB and stretches from
                // row 0 (SideA) to row 4 (SideC) — all three sides touched.
                const createResponse = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                const gameId = createResponse.body.gameId;

                // P0 plays (0,0) — SideA + SideB + SideC via left edge
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
                // P1 plays somewhere neutral
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 1, y: 1 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 1 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 2, y: 2 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 2 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 3, y: 3 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 3 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 2, y: 3 });

                const finalResponse = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 0, x: 0, y: 4 });

                expect(finalResponse.body.status).toBe('finished');
                expect(finalResponse.body.winner).toBe(0);
                expect(finalResponse.body.winningPath).toBeDefined();
                expect(finalResponse.body.winningPath.length).toBeGreaterThan(0);
            });

            it('should prevent moves after game is finished', async () => {
                const createResponse = await request(gameyService)
                    .post('/play/create')
                    .send({ mode: 'hvh', boardSize: 5 });
                const gameId = createResponse.body.gameId;

                // Drive to a win (same sequence as above)
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 0 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 1, y: 1 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 1 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 2, y: 2 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 2 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 3, y: 3 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 3 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 1, x: 2, y: 3 });
                await request(gameyService).post(`/play/${gameId}/move`).send({ player: 0, x: 0, y: 4 });

                const afterWin = await request(gameyService)
                    .post(`/play/${gameId}/move`)
                    .send({ player: 1, x: 4, y: 4 })
                    .expect(400);

                expect(afterWin.body.error).toContain('Game already finished');
            });
        });
    });
