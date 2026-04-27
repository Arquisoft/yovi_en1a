import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './GameBoard.css';
import { soundService } from './SoundService';

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
  coinFlip?: 'heads' | 'tails' | null;
  needsFlip?: boolean;
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
  const sidebarsWidth = isMobile ? 40 : 500;
  const availableWidth = Math.max(screenWidth - sidebarsWidth, screenWidth * 0.85);
  const availableHeight = isMobile ? screenHeight * 0.5 : screenHeight * 0.65;

  const maxHexWidthByWidth = availableWidth / (boardSize * 1.05);
  const maxHexWidthByHeight = availableHeight / (boardSize * 0.85);

  const maxHexWidth = Math.min(maxHexWidthByWidth, maxHexWidthByHeight);
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

// ─── Pure helper functions ────────────────────────────────────────────────────

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
  username: string,
  isFlippingPhase?: boolean
): string {
  if (gameStatus === 'idle') return t('btn_start_game');
  if (gameStatus === 'finished') {
    const winnerName = winner === 'P1' ? username : 'P2';
    return t('msg_winner', { name: winnerName });
  }
  if (isFlippingPhase) return t('lbl_chance_time');
  if (isBotThinking) return t('msg_bot_thinking');
  if (currentTurn === 'P1') return t('msg_turn', { name: username });
  return t('msg_p2_turn');
}

export function getTurnPanelSubtext(t: any, gameStatus: GameStatus, currentTurn: PlayerTurn, isFlippingPhase?: boolean): string {
  if (gameStatus === 'idle') return t('msg_choose_mode');
  if (isFlippingPhase) return t('msg_determining_turn');
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

export function calculateStrategicScore(moves: GameSession['moves'], player: number, boardSize: number): number {
  const playerMoves = moves.filter(m => m.player === player);
  if (playerMoves.length === 0) return 0;

  let totalScore = playerMoves.length * 10;
  const moveSet = new Set(playerMoves.map(m => `${m.x},${m.y}`));
  const visited = new Set<string>();

  let connectedAB = false, connectedBC = false, connectedAC = false;

  for (const move of playerMoves) {
    const key = `${move.x},${move.y}`;
    if (visited.has(key)) continue;

    const queue = [move];
    visited.add(key);
    let touchesA = false, touchesB = false, touchesC = false;

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      if (curr.y === boardSize - 1) touchesA = true;
      if (curr.x === 0) touchesB = true;
      if (curr.x === curr.y) touchesC = true;

      const neighbors = [
        { x: curr.x - 1, y: curr.y - 1 }, { x: curr.x, y: curr.y - 1 },
        { x: curr.x - 1, y: curr.y }, { x: curr.x + 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 }, { x: curr.x + 1, y: curr.y + 1 }
      ];

      for (const n of neighbors) {
        const nKey = `${n.x},${n.y}`;
        if (moveSet.has(nKey) && !visited.has(nKey)) {
          visited.add(nKey);
          queue.push({ player, x: n.x, y: n.y });
        }
      }
    }
    if (touchesA && touchesB) connectedAB = true;
    if (touchesB && touchesC) connectedBC = true;
    if (touchesA && touchesC) connectedAC = true;
  }

  if (connectedAB) totalScore += 30;
  if (connectedBC) totalScore += 30;
  if (connectedAC) totalScore += 30;

  return totalScore;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameBoard({ username = "Guest User", onProfile, onLobby }: GameBoardProps) {
  const { t } = useTranslation();

  const getInitialParams = () => {
    if (typeof window === 'undefined') return { mode: 'hvb' as GameMode, diff: 'beginner', size: 11, rule: 'classic' };
    const params = new URLSearchParams(window.location.search);
    return {
      mode: params.get('mode') === 'pvp' ? ('hvh' as GameMode) : ('hvb' as GameMode),
      diff: params.get('difficulty') || 'beginner',
      size: params.get('size') ? Number.parseInt(params.get('size')!, 10) : 11,
      rule: params.get('rule') || 'classic',
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
  const [coinFlip, setCoinFlip] = useState<'heads' | 'tails' | null>(null);
  const [showCoinAnim, setShowCoinAnim] = useState(false);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [hasScored, setHasScored] = useState(false);

  const [muted, setMuted] = useState(() => soundService.settings.muteMove && soundService.settings.muteBGM);
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameStatus === 'ongoing') soundService.startBGM();
    else soundService.stopBGM();
    return () => soundService.stopBGM();
  }, [gameStatus]);

  const handleGameFinished = useCallback((winnerNum: number | null, mode: string) => {
    if (hasScored || winnerNum === null) return;
    if (winnerNum === 0) {
      setP1Score(prev => prev + 1);
      soundService.playWin();
    } else {
      setP2Score(prev => prev + 1);
      mode === 'hvb' ? soundService.playLoss() : soundService.playWin();
    }
    setHasScored(true);
  }, [hasScored]);

  const syncFromSession = useCallback((s: GameSession & { winningPath?: { x: number; y: number }[] }) => {
    setSession(s);
    const actualSize = s.boardSize || boardSize;
    setBoard(applyMovesToBoard(s.moves, (actualSize * (actualSize + 1)) / 2));
    setCurrentTurn(s.currentPlayer === 0 ? 'P1' : 'P2');
    setGameStatus(s.status === 'finished' ? 'finished' : 'ongoing');
    setP1Score(calculateStrategicScore(s.moves, 0, actualSize));
    setP2Score(calculateStrategicScore(s.moves, 1, actualSize));

    if (s.winningPath) {
      setWinningPathIndices(new Set(s.winningPath.map(p => coordsToIndex(p.x, p.y))));
    }
    if (s.status === 'finished') {
      setWinner(s.winner === 0 ? 'P1' : 'P2');
      handleGameFinished(s.winner, s.mode);
    }
  }, [boardSize, handleGameFinished]);

  const handleStartGame = async () => {
    setErrorMsg(null); setWinner(null); setWinningPathIndices(new Set()); setHasScored(false);
    setBoard(new Array(totalCells).fill('.')); setCurrentTurn('P1');
    try {
      const data = await apiPost<GameSession>('/play/create', {
        mode: selectedMode, difficulty: selectedDifficulty, boardSize, rule: selectedRule,
      });
      syncFromSession(data);
    } catch (e: any) {
      setErrorMsg(t('err_failed_create', { msg: e.message }));
      setGameStatus('error');
    }
  };

  const handleCellClick = async (index: number) => {
    if (!session || gameStatus !== 'ongoing' || board[index] !== '.' || isBotThinking) return;
    if (session.mode === 'hvb' && session.currentPlayer === 1) return;

    setIsBotThinking(true);
    const { x, y } = indexToCoords(index);
    const optimistic = [...board];
    optimistic[index] = session.currentPlayer === 0 ? 'B' : 'R';
    setBoard(optimistic);
    soundService.playMove();

    try {
      const data = await apiPost<GameSession>(`/play/${sanitizeGameId(session.gameId)}/move`, { 
        player: session.currentPlayer, x, y 
      });
      syncFromSession(data);
    } catch (e: any) {
      setBoard(prev => prev.map((v, i) => (i === index ? '.' : v)));
      setErrorMsg(t('err_move_failed', { msg: e.message }));
    } finally {
      setIsBotThinking(false);
    }
  };

  const handleUndo = async () => {
    if (!session) return;
    try {
      const data = await apiPost<GameSession>(`/play/${sanitizeGameId(session.gameId)}/undo`, {});
      syncFromSession(data);
      setWinner(null); setWinningPathIndices(new Set());
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const handleFlip = async () => {
    if (!session?.needsFlip) return;
    setIsBotThinking(true);
    try {
      const data = await apiPost<GameSession>(`/play/${sanitizeGameId(session.gameId)}/flip`, {});
      syncFromSession(data);
      if (data.coinFlip) { setCoinFlip(data.coinFlip); setShowCoinAnim(true); }
    } catch (e: any) { setErrorMsg(e.message); setIsBotThinking(false); }
  };

  const handleRematch = async () => {
    if (!session) return handleStartGame();
    try {
      const data = await apiPost<GameSession>(`/play/${sanitizeGameId(session.gameId)}/rematch`, {});
      setWinner(null); setWinningPathIndices(new Set()); setHasScored(false);
      syncFromSession(data);
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    soundService.updateSettings({ muteMove: newMuted, muteWin: newMuted, muteLoss: newMuted, muteBGM: newMuted });
  };

  const renderWinnerPopup = () => {
    if (gameStatus !== 'finished' || !winner) return null;
    return (
      <div className="winner-popup-overlay">
        <div className="winner-popup-content">
          <h2 style={{ color: '#fff' }}>{t('msg_winner', { name: winner === 'P1' ? username : 'P2' })}</h2>
          <div className="winner-popup-buttons">
            <button className="winner-btn btn-rematch" onClick={handleRematch}>{t('btn_rematch')}</button>
            <button className="winner-btn btn-lobby" onClick={onLobby}>{t('btn_go_lobby')}</button>
          </div>
        </div>
      </div>
    );
  };

  const renderCoinAnimation = () => {
    if (!showCoinAnim || !coinFlip) return null;
    return (
      <div className="coin-anim-popup-full" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '150px' }}>{coinFlip === 'heads' ? '🟡' : '⚪'}</div>
        <h2 style={{ color: '#fff', fontSize: '42px' }}>{coinFlip === 'heads' ? t('msg_playing', { name: username }) : t('msg_playing', { name: 'P2' })}</h2>
        <button className="close-coin-btn" onClick={() => { setShowCoinAnim(false); setIsBotThinking(false); }} style={{ marginTop: '30px', padding: '15px 50px', backgroundColor: '#44ff44', borderRadius: '8px', cursor: 'pointer' }}>
          {t('btn_close_and_play')}
        </button>
      </div>
    );
  };

  const renderBoard = () => {
    const currentBoardSize = session?.boardSize || boardSize;
    const hexWidth = calculateDynamicHexSize(currentBoardSize, screenSize.width, screenSize.height);
    const isInteractive = gameStatus === 'ongoing' && !isBotThinking && !session?.needsFlip;
    const rows = [];
    let currentIndex = 0;

    for (let row = 0; row < currentBoardSize; row++) {
      const rowCells = [];
      for (let i = 0; i <= row; i++) {
        const cellIdx = currentIndex + i;
        const cellVal = board[cellIdx];
        const isWinning = winningPathIndices.has(cellIdx);
        rowCells.push(
          <button
            key={cellIdx}
            className={getCellClass(cellVal, isWinning)}
            style={{ width: hexWidth, opacity: isInteractive ? 1 : 0.6 }}
            onClick={() => handleCellClick(cellIdx)}
            disabled={!isInteractive}
          >
            {cellVal === '.' ? '' : cellVal}
          </button>
        );
      }
      rows.push(<div key={row} className="hex-row" style={{ marginTop: row === 0 ? '0' : `calc(${hexWidth} * -0.208 + 2px)` }}>{rowCells}</div>);
      currentIndex += row + 1;
    }
    return rows;
  };

  const isFlippingPhase = Boolean((session?.rule === 'fortuney' && session?.needsFlip) || showCoinAnim);
  const activeTurn = (isBotThinking && !isFlippingPhase) ? 'P2' : currentTurn;
  const turnHeader = getTurnPanelHeader(t, gameStatus, winner, isBotThinking, currentTurn, username, isFlippingPhase);
  const turnSubtext = getTurnPanelSubtext(t, gameStatus, activeTurn, isFlippingPhase);
  const p2Label = selectedMode === 'hvb' ? t('lbl_p2_bot') : t('lbl_p2_user');

  return (
    <>
      <nav className="game-top-bar" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="game-title">GAME Y</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={toggleMute} 
            title={muted ? 'Unmute' : 'Mute'} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
          >
            {muted ? (
              <span role="img" aria-label="muted">🔇</span>
            ) : (
              <span role="img" aria-label="unmuted">🔊</span>
            )}
          </button>
          <button onClick={onProfile} className="game-profile-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
            {t('nav_profile')}
          </button>
        </div>
      </nav>

      <div className="game-container">
        <div className="game-main-layout">
          <div className="game-sidebar">
            {gameStatus !== 'idle' && (
              <div className={`game-panel ${activeTurn === 'P1' ? 'turn-p1' : 'turn-p2'}`}>
                <div className={`game-panel-header ${activeTurn === 'P1' ? 'text-p1' : 'text-p2'}`}>{turnHeader}</div>
                <div style={{ color: '#e0e0e0' }}>{turnSubtext}</div>
              </div>
            )}

            {gameStatus === 'idle' && (
              <div className="game-panel">
                <div className="game-panel-header">{t('lbl_selected_mode')}</div>
                <div style={{ color: '#e0e0e0' }}>{selectedMode === 'hvh' ? t('mode_pvp') : t('mode_pvc', { diff: t(`diff_${selectedDifficulty}`) })}</div>
                <div style={{ color: selectedRule === 'fortuney' ? '#FFD700' : '#44ff44', fontWeight: 'bold' }}>{t('lbl_rule')}: {selectedRule}</div>
                <button className="game-action-btn btn-end" style={{ marginTop: '10px' }} onClick={handleStartGame}>{t('btn_start_game')}</button>
              </div>
            )}

            {errorMsg && <div style={{ color: '#ff6666' }}>⚠ {errorMsg}</div>}

            {gameStatus === 'ongoing' && session?.rule === 'fortuney' && session?.needsFlip && (
              <div className="game-panel" style={{ border: '2px solid #FFD700' }}>
                <div className="game-panel-header" style={{ color: '#FFD700' }}>{t('lbl_chance_time')}</div>
                <button className="game-action-btn" style={{ backgroundColor: '#FFD700', color: '#000' }} onClick={handleFlip}>{t('btn_flip_coin')}</button>
              </div>
            )}
          </div>

          <div className="board-column">
            <div className="board-wrapper">
              <div className="board-relative">
                <svg className="board-svg-bg" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polygon points="50,4 0,98 100,98" fill="#0a0a0a" stroke="#555" strokeWidth="0.8" />
                </svg>
                <div className="board-grid">{renderBoard()}</div>
                {renderWinnerPopup()}
                {renderCoinAnimation()}
              </div>
            </div>
          </div>

          <div className="game-sidebar">
            <div className="game-panel p1-card">
              <div className="text-p1">P1: {username}</div>
              <div style={{ color: '#e0e0e0' }}>{t('lbl_pts', { score: p1Score })}</div>
            </div>
            <button className="game-action-btn btn-undo" onClick={handleUndo} disabled={!session || gameStatus !== 'ongoing'}>{t('btn_undo')}</button>
            <div className="game-panel p2-card">
              <div className="text-p2">{p2Label}</div>
              <div style={{ color: '#e0e0e0' }}>{isBotThinking ? t('status_thinking') : t('lbl_pts', { score: p2Score })}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}