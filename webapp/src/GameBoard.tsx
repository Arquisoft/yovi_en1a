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
  winningPath?: { x?: number; y?: number; row?: number; col?: number }[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_GAMEY_API_URL ?? 'http://localhost:3001';
const BOARD_SIZE = 11;
const TOTAL_CELLS = (BOARD_SIZE * (BOARD_SIZE + 1)) / 2;

// ─── Coordinate helpers ───────────────────────────────────────────────────────

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

// ─── Pure helper functions (exported for testing) ─────────────────────────────

export function getCellClass(cellValue: CellValue, isWinning: boolean): string {
  if (cellValue === 'B') return isWinning ? 'hex-cell hex-p1 hex-winning' : 'hex-cell hex-p1';
  if (cellValue === 'R') return isWinning ? 'hex-cell hex-p2 hex-winning' : 'hex-cell hex-p2';
  return 'hex-cell hex-empty';
}

export function getTurnPanelHeader(
    gameStatus: GameStatus,
    winner: PlayerTurn | null,
    isBotThinking: boolean,
    currentTurn: PlayerTurn
): string {
  if (gameStatus === 'idle') return 'START GAME';
  if (gameStatus === 'finished') return `${winner} WINS!`;
  if (isBotThinking) return 'BOT THINKING…';
  return `${currentTurn} TURN`;
}

export function getTurnPanelSubtext(gameStatus: GameStatus, currentTurn: PlayerTurn): string {
  if (gameStatus === 'idle') return 'Choose mode below';
  return currentTurn === 'P1' ? '(Blue)' : '(Red)';
}

export function applyMovesToBoard(moves: GameSession['moves']): CellValue[] {
  const newBoard: CellValue[] = new Array(TOTAL_CELLS).fill('.');
  for (const m of moves) {
    const idx = coordsToIndex(m.x, m.y);
    newBoard[idx] = m.player === 0 ? 'B' : 'R';
  }
  return newBoard;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameBoard() {
  const [board, setBoard] = useState<CellValue[]>(new Array(TOTAL_CELLS).fill('.'));
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('P1');
  const [session, setSession] = useState<GameSession | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [winner, setWinner] = useState<PlayerTurn | null>(null);
  const [winningPathIndices, setWinningPathIndices] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('hvb');

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
        if (s.winningPath) {
          const indices = s.winningPath.map((p) => coordsToIndex(p.x ?? p.col ?? 0, p.y ?? p.row ?? 0));
          setWinningPathIndices(new Set(indices));
        } else {
          setWinningPathIndices(new Set());
        }
      },
      []
  );

  // ── Start a new game
  const handleStartGame = async () => {
    setErrorMsg(null);
    setWinner(null);
    setWinningPathIndices(new Set());
    setBoard(new Array(TOTAL_CELLS).fill('.'));
    setCurrentTurn('P1');
    try {
      const data = await apiPost<GameSession>('/play/create', {
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
    if (session.mode === 'hvb' && session.currentPlayer === 1) return;
    if (isBotThinking) return;

    const { x, y } = indexToCoords(index);
    const playerNum = session.currentPlayer;

    const optimistic = [...board];
    optimistic[index] = playerNum === 0 ? 'B' : 'R';
    setBoard(optimistic);
    if (session.mode === 'hvb') setIsBotThinking(true);

    try {
      const data = await apiPost<GameSession & { botMove?: { x: number; y: number } | null }>(
          `/play/${session.gameId}/move`,
          { player: playerNum, x, y }
      );
      syncFromSession(data);
    } catch (e: unknown) {
      setBoard(prev => prev.map((v, i) => (i === index ? '.' : v)));
      setErrorMsg(`Move failed: ${(e as Error).message}`);
    } finally {
      setIsBotThinking(false);
    }
  };

  // ── Undo
  const handleUndo = async () => {
    if (!session || session.moves.length === 0) return;
    const movesToKeep =
        session.mode === 'hvb' ? session.moves.slice(0, -2) : session.moves.slice(0, -1);

    try {
      await fetch(`${API_URL}/play/${session.gameId}`, { method: 'DELETE' });
      const fresh = await apiPost<GameSession>('/play/create', {
        mode: session.mode,
        boardSize: session.boardSize,
      });
      let current: GameSession = fresh;
      for (const m of movesToKeep) {
        current = await apiPost<GameSession>(`/play/${fresh.gameId}/move`, m);
      }
      syncFromSession(current);
      setErrorMsg(null);
      setWinner(null);
      setWinningPathIndices(new Set());
    } catch (e: unknown) {
      setErrorMsg(`Undo failed: ${(e as Error).message}`);
    }
  };

  // ── Rematch
  const handleRematch = async () => {
    if (!session) return handleStartGame();
    try {
      const data = await apiPost<GameSession>(`/play/${session.gameId}/rematch`, {});
      setBoard(new Array(TOTAL_CELLS).fill('.'));
      setWinner(null);
      setWinningPathIndices(new Set());
      setErrorMsg(null);
      syncFromSession(data);
    } catch (e: unknown) {
      setErrorMsg(`Rematch failed: ${(e as Error).message}`);
    }
  };

  // ─── Extracted render helpers (reduces cognitive complexity of renderBoard) ──

  const renderCell = (cellIndex: number, cellValue: CellValue, hexWidth: string, isInteractive: boolean) => {
    const isWinning = winningPathIndices.has(cellIndex);
    return (
      <button
          key={cellIndex}
          className={getCellClass(cellValue, isWinning)}
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
  };

  const renderBoardRow = (row: number, startIndex: number, hexWidth: string, isInteractive: boolean) => {
    const rowCells = [];
    for (let i = 0; i <= row; i++) {
      const cellIndex = startIndex + i;
      rowCells.push(renderCell(cellIndex, board[cellIndex], hexWidth, isInteractive));
    }
    return (
        <div
            key={row}
            className="hex-row"
            style={{ marginTop: row === 0 ? '0' : `calc(${hexWidth} * -0.208 + 2px)` }}
        >
          {rowCells}
        </div>
    );
  };

  const renderBoard = () => {
    const hexWidth = 'clamp(30px, 8.5vmin, 130px)';
    const isInteractive = gameStatus === 'ongoing' && !isBotThinking;
    const rows = [];
    let currentIndex = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      rows.push(renderBoardRow(row, currentIndex, hexWidth, isInteractive));
      currentIndex += row + 1;
    }
    return rows;
  };

  const turnPanelHeader = getTurnPanelHeader(gameStatus, winner, isBotThinking, currentTurn);
  const turnPanelSubtext = getTurnPanelSubtext(gameStatus, currentTurn);
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

            <div className={`game-panel ${currentTurn === 'P1' ? 'turn-p1' : 'turn-p2'}`}>
              <div className={`game-panel-header ${currentTurn === 'P1' ? 'text-p1' : 'text-p2'}`}>
                {turnPanelHeader}
              </div>
              <div style={{ fontSize: 'clamp(12px, 1vw, 16px)', color: '#aaa' }}>
                {turnPanelSubtext}
              </div>
            </div>

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

            {errorMsg && (
                <div style={{ color: '#ff4444', fontSize: 12, padding: '4px 8px', wordBreak: 'break-word' }}>
                  ⚠ {errorMsg}
                </div>
            )}

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