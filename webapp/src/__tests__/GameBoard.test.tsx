import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameBoard, {
  getCellClass,
  getTurnPanelHeader,
  getTurnPanelSubtext,
  applyMovesToBoard,
} from '../GameBoard.tsx';

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
});

describe('getTurnPanelHeader', () => {
  it('returns START GAME when idle', () => {
    expect(getTurnPanelHeader('idle', null, false, 'P1')).toBe('START GAME');
  });

  it('returns winner string when finished', () => {
    expect(getTurnPanelHeader('finished', 'P1', false, 'P1')).toBe('P1 WINS!');
    expect(getTurnPanelHeader('finished', 'P2', false, 'P2')).toBe('P2 WINS!');
  });

  it('returns BOT THINKING when bot is thinking', () => {
    expect(getTurnPanelHeader('ongoing', null, true, 'P2')).toBe('BOT THINKING…');
  });

  it('returns current turn when ongoing and not thinking', () => {
    expect(getTurnPanelHeader('ongoing', null, false, 'P1')).toBe('P1 TURN');
    expect(getTurnPanelHeader('ongoing', null, false, 'P2')).toBe('P2 TURN');
  });
});

describe('getTurnPanelSubtext', () => {
  it('returns "Choose mode below" when idle', () => {
    expect(getTurnPanelSubtext('idle', 'P1')).toBe('Choose mode below');
  });

  it('returns (Blue) for P1 when ongoing', () => {
    expect(getTurnPanelSubtext('ongoing', 'P1')).toBe('(Blue)');
  });

  it('returns (Red) for P2 when ongoing', () => {
    expect(getTurnPanelSubtext('ongoing', 'P2')).toBe('(Red)');
  });

  it('returns (Red) for P2 when finished', () => {
    expect(getTurnPanelSubtext('finished', 'P2')).toBe('(Red)');
  });
});

describe('applyMovesToBoard', () => {
  it('returns empty board for no moves', () => {
    const board = applyMovesToBoard([]);
    expect(board.every(c => c === '.')).toBe(true);
    expect(board).toHaveLength(66);
  });

  it('places B for player 0', () => {
    const board = applyMovesToBoard([{ player: 0, x: 0, y: 0 }]);
    expect(board[0]).toBe('B');
  });

  it('places R for player 1', () => {
    const board = applyMovesToBoard([{ player: 1, x: 0, y: 0 }]);
    expect(board[0]).toBe('R');
  });

  it('places multiple moves correctly', () => {
    const board = applyMovesToBoard([
      { player: 0, x: 0, y: 0 },
      { player: 1, x: 1, y: 1 },
      { player: 0, x: 0, y: 2 },
    ]);
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

  it('should start in idle state showing START GAME and mode selector', () => {
    render(<GameBoard />);
    const startGameElements = screen.getAllByText('START GAME');
    expect(startGameElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Choose mode below')).toBeInTheDocument();
    expect(screen.getByText('P1: USERN.').parentElement).toHaveClass('p1-card');
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

  it('should have border classes defined for all sides of player cards', () => {
    render(<GameBoard />);
    const p1Container = screen.getByText('P1: USERN.').parentElement;
    const p2Container = screen.getByText('P2 (Bot)').parentElement;
    expect(p1Container).toHaveClass('p1-card');
    expect(p2Container).toHaveClass('p2-card');
  });

  it('should have correct classes for action buttons (Undo/End)', () => {
    render(<GameBoard />);
    expect(screen.getByText('UNDO')).toHaveClass('btn-undo');
    expect(screen.getByText('END TURN')).toHaveClass('btn-end');
  });

  it('should show mode selector with Human vs Bot and Human vs Human options in idle state', () => {
    render(<GameBoard />);
    expect(screen.getByLabelText(/Human vs Bot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Human vs Human/i)).toBeInTheDocument();
    const hvbRadio = screen.getByLabelText(/Human vs Bot/i) as HTMLInputElement;
    expect(hvbRadio.checked).toBe(true);
  });

  it('should toggle selected mode when a radio button is clicked', () => {
    render(<GameBoard />);
    const hvhRadio = screen.getByLabelText(/Human vs Human/i) as HTMLInputElement;
    const hvbRadio = screen.getByLabelText(/Human vs Bot/i) as HTMLInputElement;
    expect(hvbRadio.checked).toBe(true);
    expect(hvhRadio.checked).toBe(false);
    fireEvent.click(hvhRadio);
    expect(hvhRadio.checked).toBe(true);
    expect(hvbRadio.checked).toBe(false);
  });

  it('should show START GAME button in idle state', () => {
    render(<GameBoard />);
    const startBtn = screen.getByRole('button', { name: /START GAME/i });
    expect(startBtn).toBeInTheDocument();
  });

  it('should display P2 (Bot) label in hvb mode and P2: USERN. in hvh mode', () => {
    render(<GameBoard />);
    expect(screen.getByText('P2 (Bot)')).toBeInTheDocument();
    const hvhRadio = screen.getByLabelText(/Human vs Human/i);
    fireEvent.click(hvhRadio);
    expect(screen.getByText('P2: USERN.')).toBeInTheDocument();
    expect(screen.queryByText('P2 (Bot)')).not.toBeInTheDocument();
  });

  it('should hide mode selector and START GAME button after game starts', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession());

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/Human vs Bot/i)).not.toBeInTheDocument();
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
      expect(screen.getByText('P1 TURN')).toBeInTheDocument();
    });
  });

  it('should show (Blue) subtext when it is P1 turn', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByText('(Blue)')).toBeInTheDocument();
    });
  });

  it('should show REMATCH button when game is finished', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /REMATCH/i })).toBeInTheDocument();
      const p1WinsElements = screen.getAllByText('P1 WINS!');
      expect(p1WinsElements.length).toBeGreaterThan(0);
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

  it('should place a piece when a cell is clicked during an ongoing game', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText('P1 TURN'));

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
    await waitFor(() => screen.getByText('P1 TURN'));

    mockApiError('Move rejected');

    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      expect(screen.getByText(/Move failed/i)).toBeInTheDocument();
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
    await waitFor(() => screen.getByText('P2 TURN'));

    const initialCallCount = mockFetch.mock.calls.length;
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]); // cell[0] is already 'B'

    // fetch should not be called again
    expect(mockFetch.mock.calls.length).toBe(initialCallCount);
  });

  it('should not place a piece in hvb mode when it is bot turn (P2)', async () => {
    render(<GameBoard />);
    const botTurnSession = makeMockSession({ currentPlayer: 1, mode: 'hvb' });
    mockApiSuccess(botTurnSession);

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText('P2 TURN'));

    const initialCallCount = mockFetch.mock.calls.length;
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[5]);

    expect(mockFetch.mock.calls.length).toBe(initialCallCount);
  });

  it('should start game in hvh mode when selected', async () => {
    render(<GameBoard />);
    fireEvent.click(screen.getByLabelText(/Human vs Human/i));
    mockApiSuccess(makeMockSession({ mode: 'hvh' }));

    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mode).toBe('hvh');
    });
  });

  // ── New Tests for Scoreboard, Winning Path & Popup ──

  it('should initialize scores at 0 for both players', () => {
    render(<GameBoard />);
    expect(screen.getByText('Pts: 0')).toBeInTheDocument();
  });

  it('should increment P1 score and show popup when P1 wins', async () => {
    render(<GameBoard />);
    // Initial start
    mockApiSuccess(makeMockSession());
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText('P1 TURN'));

    // P1 wins
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      // Expect P1 score to be 1 and P2 to be 0
      expect(screen.getByText('Pts: 1')).toBeInTheDocument();
      const popupMsg = screen.getAllByText('P1 WINS!');
      expect(popupMsg.length).toBeGreaterThan(0);
      expect(screen.getByText('Great match!')).toBeInTheDocument();
    });
  });

  it('should apply hex-winning class to cells in the winning path', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ currentPlayer: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByText('P1 TURN'));

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
      // Cell 0 should now have the hex-winning class
      const newCells = document.querySelectorAll('.hex-cell');
      expect(newCells[0]).toHaveClass('hex-winning');
    });
  });

  it('should reset hasScored allowing scores to continue across multiple matches', async () => {
    render(<GameBoard />);
    
    // First match P1 wins
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => expect(screen.getByText('Pts: 1')).toBeInTheDocument());

    // Rematch
    mockApiSuccess(makeMockSession({ status: 'ongoing', currentPlayer: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /REMATCH/i }));
    await waitFor(() => expect(screen.queryByText('Great match!')).not.toBeInTheDocument()); // popup gone

    // Second match P1 wins again
    mockApiSuccess(makeMockSession({ status: 'finished', winner: 0 }));
    const cells = document.querySelectorAll('.hex-cell');
    fireEvent.click(cells[0]);

    await waitFor(() => {
      expect(screen.getByText('Pts: 2')).toBeInTheDocument();
    });
  });
});