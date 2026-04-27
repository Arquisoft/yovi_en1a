import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './GameBoard.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerTurn = 'P1' | 'P2';
type CellValue = '.' | 'B' | 'R';
type GameMode = 'hvh' | 'hvb';
type GameStatus = 'idle' | 'ongoing' | 'finished' | 'error';

interface GameSession {
  gameId: string;
  mode: GameMode;
  difficulty?: string;
  boardSize: number;
  rule?: string;
  moves: { player: number; x: number; y: number }[];
  status: 'ongoing' | 'finished';
  currentPlayer: number;
  winner: number | null;
}

interface GameBoardProps {
  username?: string;
  onProfile?: () => void;
  onLobby?: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_GAMEY_API_URL || 'http://localhost:3001';

function calculateDynamicHexSize(boardSize: number, screenWidth: number, screenHeight: number): string {
  const isMobile = screenWidth <= 768;
  
  // On desktop, subtract sidebars (500px). On mobile, use almost full width (minus 40px padding).
  const sidebarsWidth = isMobile ? 40 : 500; 
  const availableWidth = Math.max(screenWidth - sidebarsWidth, screenWidth * 0.85);
  
  // On mobile, the board has more vertical freedom since the layout stacks.
  const availableHeight = isMobile ? screenHeight * 0.5 : screenHeight * 0.65;
  
  const maxHexWidthByWidth = availableWidth / (boardSize * 1.05);
  const maxHexWidthByHeight = availableHeight / (boardSize * 0.85);
  
  const maxHexWidth = Math.min(maxHexWidthByWidth, maxHexWidthByHeight);
  
  // Increase the lower bound from 10 to 15-20 so it stays readable on mobile
  const hexWidth = Math.min(Math.max(maxHexWidth, 15), 80);
  return `${hexWidth}px`;
}

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

function sanitizePath(path: string): string {
  if (!/^\/[a-zA-Z0-9_/-]*$/.test(path) || path.includes('..')) {
    throw new Error('Invalid path');
  }
  return path;
}

function sanitizeGameId(gameId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) {
    throw new Error('Invalid gameId');
  }
  return gameId;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const safePath = sanitizePath(path);
  const res = await fetch(`${API_URL}${safePath}`, {
    method: 'POST',
    headers,
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
    t: any,
    gameStatus: GameStatus,
    winner: PlayerTurn | null,
    isBotThinking: boolean,
    currentTurn: PlayerTurn,
    username: string
): string {
  if (gameStatus === 'idle') return t('btn_start_game');
  if (gameStatus === 'finished') {
    const winnerName = winner === 'P1' ? username : 'P2';
    return t('msg_winner', { name: winnerName }); 
  }
  if (isBotThinking) return t('msg_bot_thinking');
  if (currentTurn === 'P1') return t('msg_turn', { name: username });
  return t('msg_p2_turn');
}

export function getTurnPanelSubtext(t:any,gameStatus: GameStatus, currentTurn: PlayerTurn): string {
  if (gameStatus === 'idle') return t('msg_choose_mode');
  return currentTurn === 'P1' ? t('color_blue') : t('color_red');
}

export function applyMovesToBoard(moves: GameSession['moves'], totalCells: number): CellValue[] {
  const newBoard: CellValue[] = new Array(totalCells).fill('.');
  for (const m of moves) {
    const idx = coordsToIndex(m.x, m.y);
    newBoard[idx] = m.player === 0 ? 'B' : 'R';
  }
  return newBoard;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameBoard({ username = "Guest User", onProfile, onLobby }: GameBoardProps) {
  const { t } = useTranslation();
  // ── Determine initial mode and difficulty from URL parameters
  const getInitialParams = () => {
    if (globalThis.window === undefined) return { mode: 'hvb' as GameMode, diff: 'beginner', size: 11 };
    const params = new URLSearchParams(globalThis.window.location.search);
    const modeParam = params.get('mode');
    const diffParam = params.get('difficulty');
    const sizeParam = params.get('size');
    const ruleParam = params.get('rule');
    return {
      mode: modeParam === 'pvp' ? ('hvh' as GameMode) : ('hvb' as GameMode),
      diff: diffParam || 'beginner',
      size: sizeParam ? Number.parseInt(sizeParam, 10) : 11,
      rule: ruleParam || 'classic',
    };
  };

  const initialParams = getInitialParams();
  const selectedMode = initialParams.mode;
  const selectedDifficulty = initialParams.diff;
  const selectedRule = initialParams.rule;
  const boardSize = initialParams.size;
  const totalCells = (boardSize * (boardSize + 1)) / 2;

  const [board, setBoard] = useState<CellValue[]>(new Array(totalCells).fill('.'));
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('P1');
  const [session, setSession] = useState<GameSession | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [winner, setWinner] = useState<PlayerTurn | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [winningPathIndices, setWinningPathIndices] = useState<Set<number>>(new Set());

  // ── Session Scores (in-memory only, resets on reload)
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [, setHasScored] = useState(false);

  // ── Screen size for dynamic board sizing
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Sync local state from a server response
  const syncFromSession = useCallback(
    (s: GameSession & { winningPath?: { x: number; y: number }[] }) => {
      setSession(s);
      const actualSize = s.boardSize || boardSize;
      const actualTotalCells = (actualSize * (actualSize + 1)) / 2;
      const newBoard = applyMovesToBoard(s.moves, actualTotalCells);
      setBoard(newBoard);
      setCurrentTurn(s.currentPlayer === 0 ? 'P1' : 'P2');
      setGameStatus(s.status === 'finished' ? 'finished' : 'ongoing');

      // --- Strategic Scoring Logic ---
      const calculateScore = (player: number) => {
        const playerMoves = s.moves.filter(m => m.player === player);
        if (playerMoves.length === 0) return 0;

        // 1. Base Points: 10 pts per piece (Updated from 1)
        let totalScore = playerMoves.length * 10;

        // 2. Identify Groups and Side Bonuses
        const moveSet = new Set(playerMoves.map(m => `${m.x},${m.y}`));
        const visited = new Set<string>();
        
        const getNeighbors = (x: number, y: number) => [
          {x: x-1, y: y-1}, {x: x, y: y-1},
          {x: x-1, y: y},   {x: x+1, y: y},
          {x: x, y: y+1},   {x: x+1, y: y+1}
        ];

        for (const move of playerMoves) {
          const key = `${move.x},${move.y}`;
          if (!visited.has(key)) {
            const queue = [move];
            visited.add(key);
            
            let groupTouchesA = false;
            let groupTouchesB = false;
            let groupTouchesC = false;

            let head = 0;
            while(head < queue.length) {
              const curr = queue[head++];
              
              if (curr.y === actualSize - 1) groupTouchesA = true;
              if (curr.x === 0) groupTouchesB = true;
              if (curr.x === curr.y) groupTouchesC = true;

              for (const n of getNeighbors(curr.x, curr.y)) {
                const nKey = `${n.x},${n.y}`;
                if (moveSet.has(nKey) && !visited.has(nKey)) {
                  visited.add(nKey);
                  queue.push({player, x: n.x, y: n.y});
                }
              }
            }

            // 3. Award 30 pts per side connection (Updated from 3)
            const sidesTouched = [groupTouchesA, groupTouchesB, groupTouchesC].filter(Boolean).length;
            if (sidesTouched >= 2) {
              // We award 30 points for each additional side bridged beyond the first one
              totalScore += (sidesTouched - 1) * 30;
            }
          }
        }

        return totalScore;
      };

      setP1Score(calculateScore(0));
      setP2Score(calculateScore(1));

      setP1Score(calculateScore(0));
      setP2Score(calculateScore(1));
      // -------------------------------

      if (s.winningPath) {
        const indices = new Set(s.winningPath.map(p => coordsToIndex(p.x, p.y)));
        setWinningPathIndices(indices);
      }

      if (s.status === 'finished') {
        setWinner(s.winner === 0 ? 'P1' : 'P2');
      }
    },
    [boardSize]
  );

  // ── Start a new game
  const handleStartGame = async () => {
    setErrorMsg(null);
    setWinner(null);
    setWinningPathIndices(new Set());
    setHasScored(false);
    setBoard(new Array(totalCells).fill('.'));
    setCurrentTurn('P1');
    try {
      const data = await apiPost<GameSession>('/play/create', {
        mode: selectedMode,
        difficulty: selectedDifficulty,
        boardSize: boardSize,
        rule: selectedRule,
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
        `/play/${sanitizeGameId(session.gameId)}/move`,
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
    try {
      const data = await apiPost<GameSession>(`/play/${sanitizeGameId(session.gameId)}/undo`, {});
      syncFromSession(data);
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
      const data = await apiPost<GameSession>(`/play/${sanitizeGameId(session.gameId)}/rematch`, {});
      const actualSize = data.boardSize || boardSize;
      const actualTotalCells = (actualSize * (actualSize + 1)) / 2;
      setBoard(new Array(actualTotalCells).fill('.'));
      setWinner(null);
      setWinningPathIndices(new Set());
      setHasScored(false);
      setErrorMsg(null);
      syncFromSession(data);
    } catch (e: unknown) {
      setErrorMsg(`Rematch failed: ${(e as Error).message}`);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────

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
    const currentBoardSize = session?.boardSize || boardSize;
    const hexWidth = calculateDynamicHexSize(currentBoardSize, screenSize.width, screenSize.height);
    const isInteractive = gameStatus === 'ongoing' && !isBotThinking;
    const rows = [];
    let currentIndex = 0;
    for (let row = 0; row < currentBoardSize; row++) {
      rows.push(renderBoardRow(row, currentIndex, hexWidth, isInteractive));
      currentIndex += row + 1;
    }
    return rows;
  };

  const activeTurn = isBotThinking ? 'P2' : currentTurn;
  const turnPanelHeader = getTurnPanelHeader(t,gameStatus, winner, isBotThinking, currentTurn, username);
  const turnPanelSubtext = getTurnPanelSubtext(t, gameStatus, activeTurn);
  const p2Label = selectedMode === 'hvb' ? t('lbl_p2_bot') : t('lbl_p2_user');
  return (
    <>
      {/* TOP BAR - Ahora fuera del contenedor principal */}
      <nav className="game-top-bar" style={{ padding: '10px 20px' }}>
        <h1 className="game-title">GAME Y</h1>
        <button
          className="game-profile-btn"
          title="View Profile"
          onClick={onProfile}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('nav_profile')}
        </button>
      </nav>

      <div className="game-container">
        <div className="game-main-layout">

          {/* LEFT SIDEBAR */}
          <div className="game-sidebar">
            {gameStatus !== 'idle' && (
              <div className={`game-panel ${activeTurn === 'P1' ? 'turn-p1' : 'turn-p2'}`}>
                <div className={`game-panel-header ${activeTurn === 'P1' ? 'text-p1' : 'text-p2'}`}>
                  {turnPanelHeader}
                </div>
                <div style={{ fontSize: 'clamp(12px, 1vw, 16px)', color: '#aaa' }}>
                  {turnPanelSubtext}
                </div>
              </div>
            )}

            {gameStatus === 'idle' && (
              <div className="game-panel" style={{ gap: 6, display: 'flex', flexDirection: 'column' }}>
                <div className="game-panel-header" style={{ color: '#ccc' }}>{t('lbl_selected_mode')}</div>
                <div style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase' }}>
                  {selectedMode === 'hvh' ? t('mode_pvp') : t('mode_pvc', { diff: t(`diff_${selectedDifficulty}`) })}
                </div>
                <div style={{ color: selectedRule === 'whynot' ? '#ff4444' : '#44ff44', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {t('lbl_rule')}: {selectedRule === 'whynot' ? t('rule_whynot') : t('rule_classic')}
                </div>
              </div>
            )}

            {gameStatus === 'idle' && (
              <button className="game-action-btn btn-end" onClick={handleStartGame}>
                {t('btn_start_game')}
              </button>
            )}

            {errorMsg && (
              <div style={{ color: '#ff4444', fontSize: 12, padding: '4px 8px', wordBreak: 'break-word' }}>
                ⚠ {errorMsg}
              </div>
            )}

            <div className="game-panel chat-panel">
              <div className="game-panel-header" style={{ color: '#ccc' }}>{t('lbl_chat')}</div>
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

                {gameStatus === 'finished' && winner && (
                    <div className="winner-popup-overlay">
                      <div className="winner-popup-content">
                        <h2>{t('msg_winner', { name: winner === 'P1' ? username : 'P2' })}</h2>
                        <p>{t('msg_great_match')}</p>
                        <div className="winner-popup-buttons">
                          <button className="winner-btn btn-rematch" onClick={handleRematch}>
                            {t('btn_rematch')}
                          </button>
                          <button className="winner-btn btn-lobby" onClick={onLobby}>
                            {t('btn_go_lobby')}
                          </button>
                        </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="game-sidebar">
            <div className="game-panel p1-card">
              <div className="game-panel-header text-p1">P1: {username}</div>
              <div style={{ fontSize: 'clamp(12px, 1vw, 18px)', color: '#aaa' }}>{t('lbl_pts', { score: p1Score })}</div>
            </div>

            <button
              className="game-action-btn btn-undo"
              onClick={handleUndo}
              disabled={!session || session.moves.length === 0 || gameStatus !== 'ongoing' || isBotThinking}
            >
              {t('btn_undo')}
            </button>

            <button className="game-action-btn btn-end" disabled>
              {t('btn_end_turn')}
            </button>

            <div className="game-panel p2-card">
              <div className="game-panel-header text-p2">{p2Label}</div>
              <div style={{ fontSize: 'clamp(12px, 1vw, 18px)', color: '#aaa' }}>
                {isBotThinking ? t('status_thinking') : t('lbl_pts', { score: p2Score })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}