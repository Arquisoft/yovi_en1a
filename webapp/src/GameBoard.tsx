import { useState, useCallback } from 'react';
import './GameBoard.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerTurn = 'P1' | 'P2';
type CellValue = '.' | 'B' | 'R';
type GameMode = 'hvh' | 'hvb';
type GameStatus = 'idle' | 'ongoing' | 'finished' | 'error';

interface GameSession {
  gameId: string;
  mode: GameMode;
  boardSize: number;
  moves: { player: number; x: number; y: number }[];
  status: 'ongoing' | 'finished';
  currentPlayer: number;
  winner: number | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_GAMEY_API_URL ?? 'http://localhost:3001';
const BOARD_SIZE = 11;
const TOTAL_CELLS = (BOARD_SIZE * (BOARD_SIZE + 1)) / 2;

// ─── Coordinate helpers ───────────────────────────────────────────────────────
// The board is a triangle. Row `r` (0-indexed) has r+1 cells.
// Cell index → (x, y) where x = column within row, y = row
function indexToCoords(index: number): { x: number; y: number } {
  let row = 0;
  let remaining = index;
  while (remaining >= row + 1) {
    remaining -= row + 1;
    row++;
  }
  return { x: remaining, y: row };
}

function coordsToIndex(x: number, y: number): number {
  return (y * (y + 1)) / 2 + x;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameBoard() {
  // ── UI state
  const [board, setBoard] = useState<CellValue[]>(Array(TOTAL_CELLS).fill('.'));
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('P1');

  // ── Game session state
  const [session, setSession] = useState<GameSession | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [winner, setWinner] = useState<PlayerTurn | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('hvb');

  // ── Apply a list of server moves onto the local board array
  const applyMovesToBoard = useCallback(
      (moves: GameSession['moves']): CellValue[] => {
        const newBoard: CellValue[] = Array(TOTAL_CELLS).fill('.');
        for (const m of moves) {
          const idx = coordsToIndex(m.x, m.y);
          newBoard[idx] = m.player === 0 ? 'B' : 'R';
        }
        return newBoard;
      },
      []
  );

  // ── Sync local state from a server response
  const syncFromSession = useCallback(
      (s: GameSession & { layout?: string; botMove?: { x: number; y: number } | null }) => {
        setSession(s);
        setBoard(applyMovesToBoard(s.moves));
        setCurrentTurn(s.currentPlayer === 0 ? 'P1' : 'P2');
        setGameStatus(s.status === 'finished' ? 'finished' : 'ongoing');
        if (s.status === 'finished') {
          setWinner(s.winner === 0 ? 'P1' : 'P2');
        }
      },
      [applyMovesToBoard]
  );

  // ── Start a new game
  const handleStartGame = async () => {
    setErrorMsg(null);
    setWinner(null);
    setBoard(Array(TOTAL_CELLS).fill('.'));
    setCurrentTurn('P1');
    try {
      const data = await apiPost<GameSession>('/game/create', {
        mode: selectedMode,
        boardSize: BOARD_SIZE,
      });
      syncFromSession(data);
    } catch (e: unknown) {
      setErrorMsg(`Failed to create game: ${(e as Error).message}`);
      setGameStatus('error');
    }
  };

  // ── Human places a piece
  const handleCellClick = async (index: number) => {
    if (!session || gameStatus !== 'ongoing') return;
    if (board[index] !== '.') return;
    // In hvb mode, block clicks when it's the bot's turn
    if (session.mode === 'hvb' && session.currentPlayer === 1) return;
    if (isBotThinking) return;

    const { x, y } = indexToCoords(index);
    const playerNum = session.currentPlayer; // 0 or 1

    // Optimistic local update so click feels instant
    const optimistic = [...board];
    optimistic[index] = playerNum === 0 ? 'B' : 'R';
    setBoard(optimistic);
    if (session.mode === 'hvb') setIsBotThinking(true);

    try {
      const data = await apiPost<GameSession & { botMove?: { x: number; y: number } | null }>(
          `/game/${session.gameId}/move`,
          { player: playerNum, x, y }
      );
      syncFromSession(data);
    } catch (e: unknown) {
      // Roll back optimistic update
      setBoard(board);
      setErrorMsg(`Move failed: ${(e as Error).message}`);
    } finally {
      setIsBotThinking(false);
    }
  };

  // ── Undo: delete session and recreate with same moves minus last 1 (hvh) or 2 (hvb)
  const handleUndo = async () => {
    if (!session || session.moves.length === 0) return;
    const movesToKeep = session.mode === 'hvb'
        ? session.moves.slice(0, -2)   // remove both human + bot move
        : session.moves.slice(0, -1);  // remove last human move

    try {
      // Delete old session
      await fetch(`${API_URL}/game/${session.gameId}`, { method: 'DELETE' });
      // Create fresh session
      const fresh = await apiPost<GameSession>('/game/create', {
        mode: session.mode,
        boardSize: session.boardSize,
      });
      // Replay kept moves
      let current: GameSession = fresh;
      for (const m of movesToKeep) {
        current = await apiPost<GameSession>(`/game/${fresh.gameId}/move`, m);
      }
      syncFromSession(current);
      setErrorMsg(null);
      setWinner(null);
    } catch (e: unknown) {
      setErrorMsg(`Undo failed: ${(e as Error).message}`);
    }
  };

  // ── Rematch
  const handleRematch = async () => {
    if (!session) return handleStartGame();
    try {
      const data = await apiPost<GameSession>(`/game/${session.gameId}/rematch`, {});
      setBoard(Array(TOTAL_CELLS).fill('.'));
      setWinner(null);
      setErrorMsg(null);
      syncFromSession(data);
    } catch (e: unknown) {
      setErrorMsg(`Rematch failed: ${(e as Error).message}`);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderBoard = () => {
    const rows = [];
    let currentIndex = 0;
    const hexWidth = 'clamp(30px, 8.5vmin, 130px)';

    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowCells = [];
      const cellsInThisRow = row + 1;

      for (let i = 0; i < cellsInThisRow; i++) {
        const cellIndex = currentIndex;
        const cellValue = board[cellIndex];

        let cellClass = 'hex-cell ';
        if (cellValue === '.') cellClass += 'hex-empty';
        else if (cellValue === 'B') cellClass += 'hex-p1';
        else if (cellValue === 'R') cellClass += 'hex-p2';

        // Dim board while bot is thinking or game is idle
        const isInteractive = gameStatus === 'ongoing' && !isBotThinking;

        rowCells.push(
            <button
                key={cellIndex}
                className={cellClass}
                style={{
                  width: hexWidth,
                  opacity: isInteractive ? 1 : 0.6,
                  cursor: isInteractive && cellValue === '.' ? 'pointer' : 'default',
                }}
                onClick={() => handleCellClick(cellIndex)}
                disabled={!isInteractive}
            >
              {cellValue === '.' ? '' : cellValue}
            </button>
        );
        currentIndex++;
      }

      rows.push(
          <div
              key={row}
              className="hex-row"
              style={{ marginTop: row === 0 ? '0' : `calc(${hexWidth} * -0.208 + 2px)` }}
          >
            {rowCells}
          </div>
      );
    }
    return rows;
  };

  const p2Label = selectedMode === 'hvb' ? 'P2 (Bot)' : 'P2: USERN.';

  return (
      <div className="game-container">

        {/* TOP BAR */}
        <div className="game-top-bar">
          <h1 className="game-title">GAME Y</h1>
          <div className="game-profile-btn" title="Stats / Profile">Profile 👤</div>
        </div>

        <div className="game-main-layout">

          {/* LEFT SIDEBAR */}
          <div className="game-sidebar">

            {/* Turn indicator — changes based on live server state */}
            <div className={`game-panel ${currentTurn === 'P1' ? 'turn-p1' : 'turn-p2'}`}>
              <div className={`game-panel-header ${currentTurn === 'P1' ? 'text-p1' : 'text-p2'}`}>
                {gameStatus === 'idle'
                    ? 'START GAME'
                    : gameStatus === 'finished'
                        ? `${winner} WINS!`
                        : isBotThinking
                            ? 'BOT THINKING…'
                            : `${currentTurn} TURN`}
              </div>
              <div style={{ fontSize: 'clamp(12px, 1vw, 16px)', color: '#aaa' }}>
                {gameStatus === 'idle'
                    ? 'Choose mode below'
                    : currentTurn === 'P1'
                        ? '(Blue)'
                        : '(Red)'}
              </div>
            </div>

            {/* Mode selector — only visible before game starts */}
            {gameStatus === 'idle' && (
                <div className="game-panel" style={{ gap: 6 }}>
                  <div className="game-panel-header" style={{ color: '#ccc' }}>MODE</div>
                  <label style={{ color: '#aaa', fontSize: 13, cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="mode"
                        value="hvb"
                        checked={selectedMode === 'hvb'}
                        onChange={() => setSelectedMode('hvb')}
                    />{' '}
                    Human vs Bot
                  </label>
                  <label style={{ color: '#aaa', fontSize: 13, cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="mode"
                        value="hvh"
                        checked={selectedMode === 'hvh'}
                        onChange={() => setSelectedMode('hvh')}
                    />{' '}
                    Human vs Human
                  </label>
                </div>
            )}

            {/* Start / Rematch buttons */}
            {gameStatus === 'idle' && (
                <button className="game-action-btn btn-end" onClick={handleStartGame}>
                  START GAME
                </button>
            )}
            {gameStatus === 'finished' && (
                <button className="game-action-btn btn-end" onClick={handleRematch}>
                  REMATCH
                </button>
            )}

            {/* Error message */}
            {errorMsg && (
                <div style={{ color: '#ff4444', fontSize: 12, padding: '4px 8px', wordBreak: 'break-word' }}>
                  ⚠ {errorMsg}
                </div>
            )}

            {/* Chat panel */}
            <div className="game-panel chat-panel">
              <div className="game-panel-header" style={{ color: '#ccc' }}>CHAT</div>
              <div className="chat-content">...</div>
            </div>
          </div>

          {/* CENTER: Board */}
          <div className="board-column">
            <div className="board-wrapper">
              <div className="board-relative">
                <svg
                    className="board-svg-bg"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                >
                  <polygon
                      points="50,4 0,98 100,98"
                      fill="#0a0a0a"
                      stroke="#555555"
                      strokeWidth="0.8"
                      vectorEffect="nonScalingStroke"
                  />
                </svg>
                <div className="board-grid">{renderBoard()}</div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="game-sidebar">
            <div className="game-panel p1-card">
              <div className="game-panel-header text-p1">P1: USERN.</div>
              <div style={{ fontSize: 'clamp(12px, 1vw, 18px)', color: '#aaa' }}>Pts: 0</div>
            </div>

            <button
                className="game-action-btn btn-undo"
                onClick={handleUndo}
                disabled={!session || session.moves.length === 0 || gameStatus !== 'ongoing'}
            >
              UNDO
            </button>

            <button className="game-action-btn btn-end" disabled>
              END TURN
            </button>

            <div className="game-panel p2-card">
              <div className="game-panel-header text-p2">{p2Label}</div>
              <div style={{ fontSize: 'clamp(12px, 1vw, 18px)', color: '#aaa' }}>
                {isBotThinking ? '🤔 thinking...' : 'Pts: 0'}
              </div>
            </div>
          </div>

        </div>
      </div>
  );
}