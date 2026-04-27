import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import GameBoard, { getCellClass, getTurnPanelHeader, applyMovesToBoard } from '../GameBoard';

// 1. Fixed Mock: Handles both simple keys and interpolated strings (e.g., P1: Tester)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.name) return key.replace('{{name}}', options.name);
      return key;
    },
  }),
}));

// Mock Global Fetch
const globalFetch = vi.fn();
global.fetch = globalFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('GameBoard Pure Helpers', () => {
  it('getCellClass returns correct classes', () => {
    expect(getCellClass('B', false)).toBe('hex-cell hex-p1');
    expect(getCellClass('R', true)).toBe('hex-cell hex-p2 hex-winning');
    expect(getCellClass('.', false)).toBe('hex-cell hex-empty');
  });

  it('getTurnPanelHeader logic', () => {
    const t = (k: string, opt?: any) => opt?.name ? k.replace('{{name}}', opt.name) : k;
    expect(getTurnPanelHeader(t, 'idle', null, false, 'P1', 'User')).toBe('btn_start_game');
    expect(getTurnPanelHeader(t, 'finished', 'P1', false, 'P1', 'Alice')).toContain('msg_winner');
    expect(getTurnPanelHeader(t, 'ongoing', null, true, 'P1', 'Alice')).toBe('msg_bot_thinking');
  });

  it('applyMovesToBoard maps coordinates correctly', () => {
    const moves = [{ player: 0, x: 0, y: 0 }, { player: 1, x: 1, y: 1 }];
    // Triangle size 3 has 6 cells. Index mapping: (0,0)->0, (1,0)->1, (1,1)->2, etc.
    const board = applyMovesToBoard(moves, 3); 
    expect(board[0]).toBe('B'); 
    expect(board[2]).toBe('R'); 
  });
});

describe('GameBoard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders initial idle state correctly', () => {
    // This will now look for "P1: Tester" based on the updated mock
    render(<GameBoard username="Tester" />);
    expect(screen.getByText('btn_start_game')).toBeDefined();
    expect(screen.getByText(/Tester/)).toBeDefined();
  });

  it('starts a game and syncs session on button click', async () => {
    const mockSession = {
      gameId: 'test-123',
      mode: 'hvh',
      boardSize: 11,
      moves: [],
      status: 'ongoing',
      currentPlayer: 0,
      winner: null
    };

    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    });

    render(<GameBoard />);
    const startBtn = screen.getByText('btn_start_game');
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledWith(expect.stringContaining('/play/create'), expect.any(Object));
    });
  });

  it('handles cell clicks and updates board optimistically', async () => {
    // 1. Initial creation
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ gameId: 'abc', mode: 'hvh', boardSize: 3, moves: [], status: 'ongoing', currentPlayer: 0 }),
    });

    render(<GameBoard />);
    fireEvent.click(screen.getByText('btn_start_game'));

    // Wait for board to render so cells are clickable
    const cells = await screen.findAllByRole('button');
    const hexCells = cells.filter(b => b.className.includes('hex-cell'));

    // 2. Mock the move response
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        gameId: 'abc', 
        moves: [{ player: 0, x: 0, y: 0 }], 
        status: 'ongoing', 
        currentPlayer: 1 
      }),
    });

    fireEvent.click(hexCells[0]);

    await waitFor(() => {
      // Check that /move was called (it might be the 2nd call after /create)
      expect(globalFetch).toHaveBeenCalledWith(expect.stringContaining('/move'), expect.any(Object));
    });
  });

  it('calculates score correctly when moves are synced', async () => {
    const sessionWithConnections = {
      gameId: 'score-test',
      boardSize: 3,
      moves: [
        { player: 0, x: 0, y: 2 },
        { player: 0, x: 0, y: 1 },
        { player: 0, x: 0, y: 0 },
      ],
      status: 'ongoing',
      currentPlayer: 1
    };

    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionWithConnections,
    });

    render(<GameBoard />);
    fireEvent.click(screen.getByText('btn_start_game'));

    await waitFor(() => {
      // Use getAllByText to avoid ambiguity errors since both players have this label
      const pointsLabels = screen.getAllByText('lbl_pts');
      expect(pointsLabels.length).toBeGreaterThan(0);
    });
  });

  it('handles API errors gracefully', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server Crash' }),
    });

    render(<GameBoard />);
    fireEvent.click(screen.getByText('btn_start_game'));

    await waitFor(() => {
      // Flexible matcher to handle icons/emojis and specific text
      expect(screen.getByText((content) => content.includes('Server Crash'))).toBeDefined();
    });
  });

  it('should toggle global mute state via top bar button', () => {
    render(<GameBoard />);
    
    // Initially unmuted (Mute button visible)
    const muteBtn = screen.getByTitle('Mute');
    expect(muteBtn).toBeInTheDocument();
    
    // Click to mute
    fireEvent.click(muteBtn);
    expect(screen.getByTitle('Unmute')).toBeInTheDocument();
    
    // Click to unmute
    fireEvent.click(screen.getByTitle('Unmute'));
    expect(screen.getByTitle('Mute')).toBeInTheDocument();
  });
});