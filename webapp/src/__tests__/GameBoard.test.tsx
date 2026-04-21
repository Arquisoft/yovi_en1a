import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameBoard, {
  getCellClass,
  getTurnPanelHeader,
  getTurnPanelSubtext,
  applyMovesToBoard,
} from '../GameBoard.tsx';




vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const dict: Record<string, string> = {
        'btn_end_turn': 'END TURN',
        'btn_undo': 'UNDO',
        'btn_start_game': 'START GAME',
        'lbl_selected_mode': 'SELECTED MODE',
        'mode_pvp': 'Player vs Player',
        'lbl_p2_bot': 'P2 (Bot)',
        'lbl_p2_user': 'P2: USERN.',
        'msg_great_match': 'Great match!',
        'btn_rematch': 'REMATCH',
        'btn_go_lobby': 'GO TO LOBBY',
        'nav_profile': 'Profile',
        'msg_bot_thinking': 'BOT THINKING…',
        'msg_p2_turn': "P2's TURN",
        'msg_choose_mode': 'Choose mode below',
        'color_blue': '(blue)',
        'color_red': '(red)',
        'diff_beginner': 'beginner',
        'diff_medium': 'medium',
        'diff_advanced': 'advanced',
        'lbl_chat': 'CHAT'
      };

      
      if (key === 'mode_pvc') return `Player vs Computer (${options?.diff})`;
      if (key === 'msg_winner') return `${options?.name} WINS!`;
      if (key === 'msg_turn') return `${options?.name}'s TURN`;
      if (key === 'lbl_pts') return `Pts: ${options?.score}`;

      return dict[key] || key;
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' }
  })
}));
// ─── Mock fetch globally ───────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeMockSession(overrides = {}) {
  return {
    gameId: 'game-123',
    mode: 'hvb',
    boardSize: 11,
    moves: [],
    status: 'ongoing',
    currentPlayer: 0,
    winner: null,
    ...overrides,
  };
}

function mockApiSuccess(data: object) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

function mockApiError(message: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: message }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Pure helper unit tests ────────────────────────────────────────────────────

describe('getCellClass', () => {
  it('returns hex-empty for empty cell', () => {
    expect(getCellClass('.', false)).toBe('hex-cell hex-empty');
  });

  it('returns hex-p1 for blue cell', () => {
    expect(getCellClass('B', false)).toBe('hex-cell hex-p1');
  });

  it('returns hex-p2 for red cell', () => {
    expect(getCellClass('R', false)).toBe('hex-cell hex-p2');
  });

  it('returns hex-p1 hex-winning for winning blue cell', () => {
    expect(getCellClass('B', true)).toBe('hex-cell hex-p1 hex-winning');
  });

  it('returns hex-p2 hex-winning for winning red cell', () => {
    expect(getCellClass('R', true)).toBe('hex-cell hex-p2 hex-winning');
  });
});

describe('getTurnPanelHeader', () => {
  const testUser = 'Guest User';
  const mockT = (k: any, options?: any) => {
    if (k === 'btn_start_game') return 'START GAME';
    if (k === 'msg_winner') return `${options?.name} WINS!`;
    if (k === 'msg_bot_thinking') return 'BOT THINKING…';
    if (k === 'msg_turn') return `${options?.name}'s TURN`;
    if (k === 'msg_p2_turn') return "P2's TURN";
    return k;
  };

  it('returns START GAME when idle', () => {
   expect(getTurnPanelHeader(mockT, 'idle', null, false, 'P1', testUser)).toBe('START GAME');
  });

  it('returns winner string when finished', () => {
    expect(getTurnPanelHeader(mockT,'finished', 'P1', false, 'P1', testUser)).toBe(`${testUser} WINS!`);
    expect(getTurnPanelHeader(mockT, 'finished', 'P2', false, 'P2', testUser)).toBe('P2 WINS!');
  });

  it('returns BOT THINKING when bot is thinking', () => {
    expect(getTurnPanelHeader(mockT,'ongoing', null, true, 'P2', testUser)).toBe('BOT THINKING…');
  });

  it('returns current turn when ongoing and not thinking', () => {
    expect(getTurnPanelHeader(mockT,'ongoing', null, false, 'P1', testUser)).toBe(`${testUser}'s TURN`);
    expect(getTurnPanelHeader(mockT, 'ongoing', null, false, 'P2', testUser)).toBe("P2's TURN");
  });
});

describe('getTurnPanelSubtext', () => {
  const mockT = (k: any) => {
    if (k === 'msg_choose_mode') return 'Choose mode below';
    if (k === 'color_blue') return '(blue)';
    if (k === 'color_red') return '(red)';
    return k;
  };
  it('returns "Choose mode below" when idle', () => {
    expect(getTurnPanelSubtext(mockT, 'idle', 'P1')).toBe('Choose mode below');
  });

  it('returns (blue) for P1 when ongoing', () => {
    expect(getTurnPanelSubtext(mockT, 'ongoing', 'P1')).toBe('(blue)');
  });

  it('returns (red) for P2 when ongoing', () => {
    expect(getTurnPanelSubtext(mockT, 'ongoing', 'P2')).toBe('(red)');
  });

  it('returns (red) for P2 when finished', () => {
    expect(getTurnPanelSubtext(mockT, 'finished', 'P2')).toBe('(red)');
  });
});

describe('applyMovesToBoard', () => {
  it('returns empty board for no moves', () => {
    const board = applyMovesToBoard([], 66);
    expect(board.every(c => c === '.')).toBe(true);
    expect(board).toHaveLength(66);
  });

  it('places B for player 0', () => {
    const board = applyMovesToBoard([{ player: 0, x: 0, y: 0 }], 66);
    expect(board[0]).toBe('B');
  });

  it('places R for player 1', () => {
    const board = applyMovesToBoard([{ player: 1, x: 0, y: 0 }], 66);
    expect(board[0]).toBe('R');
  });

  it('places multiple moves correctly', () => {
    const board = applyMovesToBoard([
      { player: 0, x: 0, y: 0 },
      { player: 1, x: 1, y: 1 },
      { player: 0, x: 0, y: 2 },
    ], 66);
    expect(board[0]).toBe('B');  // (0,0) → index 0
    expect(board[2]).toBe('R');  // (1,1) → index 2
    expect(board[3]).toBe('B');  // (0,2) → index 3
  });
});

// ─── Component tests ──────────────────────────────────────────────────────────

describe('GameBoard Component', () => {

  it('should display the title and basic buttons correctly', () => {
    render(<GameBoard />);
    expect(screen.getByText('GAME Y')).toBeInTheDocument();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /UNDO/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /END TURN/i })).toBeInTheDocument();
  });

  // FIX: label is now 'P1: Guest User' (with space)
  it('should start in idle state showing START GAME and selected mode', () => {
    render(<GameBoard />);
    const startGameElements = screen.getAllByText('START GAME');
    expect(startGameElements.length).toBe(1);
    expect(screen.getByText('SELECTED MODE')).toBeInTheDocument();
    expect(screen.getByText('P1: Guest User').parentElement).toHaveClass('p1-card');
  });

  // FIX: label is now 'P1: Guest User' (with space)
  it('should have border classes defined for all sides of player cards', () => {
    render(<GameBoard />);
    const p1Container = screen.getByText('P1: Guest User').parentElement;
    const p2Container = screen.getByText('P2 (Bot)').parentElement;
    expect(p1Container).toHaveClass('p1-card');
    expect(p2Container).toHaveClass('p2-card');
  });

  it('should render the correct number of hex cells on the board', () => {
    render(<GameBoard />);
    const hexCells = document.querySelectorAll('.hex-cell');
    expect(hexCells.length).toBe(66);
  });

  it('should not change a cell when clicked while game is idle', () => {
    render(<GameBoard />);
    const allHexCells = document.querySelectorAll('.hex-cell');
    expect(allHexCells.length).toBeGreaterThan(0);
    allHexCells.forEach(cell => {
      expect(cell).toHaveClass('hex-empty');
      expect(cell).toBeDisabled();
    });
  });

  it('should have correct classes for action buttons (Undo/End)', () => {
    render(<GameBoard />);
    expect(screen.getByText('UNDO')).toHaveClass('btn-undo');
    expect(screen.getByText('END TURN')).toHaveClass('btn-end');
  });

  it('should show correct mode text in idle state', () => {
    render(<GameBoard />);
    expect(screen.getByText(/Player vs Computer \(beginner\)/i)).toBeInTheDocument();
  });

  it('should toggle selected mode via URL mockup (mocking window.location)', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?mode=pvp&difficulty=advanced'
    } as any;

    render(<GameBoard />);
    expect(screen.getByText(/Player vs Player/i)).toBeInTheDocument();

    window.location = originalLocation as any;
  });

  it('should show START GAME button in idle state', () => {
    render(<GameBoard />);
    const startBtn = screen.getByRole('button', { name: /START GAME/i });
    expect(startBtn).toBeInTheDocument();
  });

  it('should display P2 (Bot) label initially (since defaultValue is hvb)', () => {
    render(<GameBoard />);
    expect(screen.getByText('P2 (Bot)')).toBeInTheDocument();
  });

  it('should hide mode display and START GAME button after game starts', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession());

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Player vs Computer/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /START GAME/i })).not.toBeInTheDocument();
    });
  });

  it('should show error message when game creation fails', async () => {
    render(<GameBoard />);
    mockApiError('Server unavailable');

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to create game/i)).toBeInTheDocument();
    });
  });

  it('should show P1 TURN panel header after game starts as P1', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByText("Guest User's TURN")).toBeInTheDocument();
    });
  });

  it('should place a piece when a cell is clicked during an ongoing game', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText("Guest User's TURN"));

    const sessionAfterMove = makeMockSession({
      currentPlayer: 1,
      moves: [{ player: 0, x: 0, y: 0 }],
    });
    mockApiSuccess(sessionAfterMove);

    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/move'),
          expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should show error message when a move fails', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText("Guest User's TURN"));

    mockApiError('Move rejected');

    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      expect(screen.getByText(/Move failed/i)).toBeInTheDocument();
    });
  });

  it('should apply hex-winning class to cells in the winning path', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText("Guest User's TURN"));

    const sessionWithWin = makeMockSession({
      status: 'finished',
      winner: 0,
      moves: [{ player: 0, x: 0, y: 0 }],
      winningPath: [{ x: 0, y: 0 }]
    });
    mockApiSuccess(sessionWithWin);

    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      const newCells = document.querySelectorAll('.hex-cell');
      expect(newCells[0]).toHaveClass('hex-winning');
    });
  });

  it('should show (blue) subtext when it is P1 turn', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByText('(blue)')).toBeInTheDocument();
    });
  });

  it('should show P2 WINS when winner is player 1', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 1 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      const p2WinsElements = screen.getAllByText('P2 WINS!');
      expect(p2WinsElements.length).toBeGreaterThan(0);
    });
  });

  it('UNDO button is disabled when no session', () => {
    render(<GameBoard />);
    const undoBtn = screen.getByRole('button', { name: /UNDO/i });
    expect(undoBtn).toBeDisabled();
  });

  it('should show REMATCH button when game is finished', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /REMATCH/i })).toBeInTheDocument();
      const p1WinsElements = screen.getAllByText('Guest User WINS!');
      expect(p1WinsElements.length).toBeGreaterThan(0);
    });
  });

  it('should increment P1 score and show popup when P1 wins', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession());
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText("Guest User's TURN"));

    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      expect(screen.getByText('Pts: 1')).toBeInTheDocument();
      const popupMsg = screen.getAllByText('Guest User WINS!');
      expect(popupMsg.length).toBeGreaterThan(0);
      expect(screen.getByText('Great match!')).toBeInTheDocument();
    });
  });

  it('should enable hex cells after game starts', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      const cells = document.querySelectorAll('.hex-cell');
      const enabledCells = Array.from(cells).filter(c => !(c as HTMLButtonElement).disabled);
      expect(enabledCells.length).toBeGreaterThan(0);
    });
  });

  it('should call rematch endpoint when REMATCH is clicked', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByRole('button', { name: /REMATCH/i }));

    mockApiSuccess(makeMockSession());
    fireEvent.click(screen.getByRole('button', { name: /REMATCH/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/rematch'),
          expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should show rematch error when rematch fails', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByRole('button', { name: /REMATCH/i }));

    mockApiError('Rematch server error');
    fireEvent.click(screen.getByRole('button', { name: /REMATCH/i }));

    await waitFor(() => {
      expect(screen.getByText(/Rematch failed/i)).toBeInTheDocument();
    });
  });

  it('should not place a piece on an already occupied cell', async () => {
    render(<GameBoard />);
    const sessionWithMove = makeMockSession({
      currentPlayer: 1,
      moves: [{ player: 0, x: 0, y: 0 }],
    });
    mockApiSuccess(sessionWithMove);

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText("P2's TURN"));

    const initialCallCount = mockFetch.mock.calls.length;
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    expect(mockFetch.mock.calls.length).toBe(initialCallCount);
  });

  it('should not place a piece in hvb mode when it is bot turn (P2)', async () => {
    render(<GameBoard />);
    const botTurnSession = makeMockSession({ currentPlayer: 1, mode: 'hvb' });
    mockApiSuccess(botTurnSession);

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText("P2's TURN"));

    const initialCallCount = mockFetch.mock.calls.length;
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[5]);

    expect(mockFetch.mock.calls.length).toBe(initialCallCount);
  });

  it('should start game with parameters read from URL', async () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?mode=pvp&difficulty=advanced'
    } as any;

    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ mode: 'hvh', difficulty: 'advanced' }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mode).toBe('hvh');
      expect(body.difficulty).toBe('advanced');
    });

    window.location = originalLocation as any;
  });

  it('should initialize scores at 0 for both players', () => {
    render(<GameBoard />);
    const scoreElements = screen.getAllByText('Pts: 0');
    expect(scoreElements.length).toBe(2);
  });

  it('should reset hasScored allowing scores to continue across multiple matches', async () => {
    render(<GameBoard />);

    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => expect(screen.getByText('Pts: 1')).toBeInTheDocument());

    mockApiSuccess(makeMockSession({ status: 'ongoing', currentPlayer: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /REMATCH/i }));
    await waitFor(() => expect(screen.queryByText('Great match!')).not.toBeInTheDocument());

    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      expect(screen.getByText('Pts: 2')).toBeInTheDocument();
    });
  });
});