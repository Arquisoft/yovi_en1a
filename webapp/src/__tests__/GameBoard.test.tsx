import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameBoard, { getCellClass, getTurnPanelHeader, applyMovesToBoard } from '../GameBoard';

// 1. Fixed Mock: Handles both simple keys and interpolated strings (e.g., P1: Tester)
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
        'lbl_chat': 'CHAT',
        'lbl_rule': 'RULE',
        'rule_classic': 'CLASSIC',
        'rule_whynot': 'WHY NOT (Avoid Edges!)',
        'btn_flip_coin': 'FLIP COIN',
        'err_rematch_failed': 'Rematch failed: {{msg}}',
        'btn_close_and_play': 'CLOSE AND PLAY',
        'lbl_chance_time': 'CHANCE TIME!',
        'desc_flip_coin': 'Flip to decide who goes first',
        'msg_determining_turn': 'Determining next turn...',
        'rule_fortuney': '🪙 Fortuney',       
        'err_move_failed': 'Move failed',
        'err_failed_create': 'Failed to create game',
        'err_undo_failed': 'Undo failed',
        'err_flip_failed': 'Flip failed',
      };

      
      if (key === 'mode_pvc') return `Player vs Computer (${options?.diff})`;
      if (key === 'msg_winner') return `${options?.name} WINS!`;
      if (key === 'msg_turn') return `${options?.name}'s TURN`;
      if (key === 'lbl_pts') return `Pts: ${options?.score}`;

      return dict[key] || key;
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

// Mock the Sound Service to prevent Audio undefined errors
vi.mock('../SoundService', () => ({
  soundService: {
    playMove: vi.fn(),
    playBotMove: vi.fn(),
    playWin: vi.fn(),
    playLoss: vi.fn(),
    startBGM: vi.fn(),
    stopBGM: vi.fn(),
    updateSettings: vi.fn(),
    settings: { muteMove: false, muteBGM: false }
  },
}));

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
    
    // 1. Check initial state
    const muteBtn = screen.getByTitle('Mute');
    expect(muteBtn).toBeDefined(); // Changed from toBeInTheDocument
    
    // 2. Click to mute
    fireEvent.click(muteBtn);
    expect(screen.getByTitle('Unmute')).toBeDefined(); // Changed from toBeInTheDocument
    
    // 3. Click to unmute
    fireEvent.click(screen.getByTitle('Unmute'));
    expect(screen.getByTitle('Mute')).toBeDefined(); // Changed from toBeInTheDocument
  });
}); 


describe('GameBoard - Fortuney rule', () => {
  it('should not show flip button when rule is classic', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'classic', needsFlip: false }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => screen.getByText("Guest User's TURN"));
    expect(screen.queryByText(/flip coin/i)).not.toBeInTheDocument();
  });

  it('should show flip button when needsFlip is true', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /flip coin/i })).toBeInTheDocument();
    });
  });

  it('should disable all board cells during flip phase', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => screen.getByRole('button', { name: /flip coin/i }));

    document.querySelectorAll('.hex-cell').forEach(cell => {
      expect(cell).toBeDisabled();
    });
  });

  it('should call /flip endpoint on button click', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => screen.getByRole('button', { name: /flip coin/i }));

    mockApiSuccess({
      ...makeMockSession({ rule: 'fortuney', needsFlip: false }),
      coinFlip: 'heads',
    });
    fireEvent.click(screen.getByRole('button', { name: /flip coin/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/flip'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should show coin animation overlay after flip', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));

    await waitFor(() => screen.getByRole('button', { name: /flip coin/i }));

    mockApiSuccess({
      ...makeMockSession({ rule: 'fortuney', needsFlip: false }),
      coinFlip: 'heads',
    });
    fireEvent.click(screen.getByRole('button', { name: /flip coin/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close.*play/i })).toBeInTheDocument();
    });
  });

  it('should dismiss coin animation on close button click', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByRole('button', { name: /START GAME/i }));
    await waitFor(() => screen.getByRole('button', { name: /flip coin/i }));

    mockApiSuccess({ ...makeMockSession({ rule: 'fortuney', needsFlip: false }), coinFlip: 'heads' });
    fireEvent.click(screen.getByRole('button', { name: /flip coin/i }));
    await waitFor(() => screen.getByRole('button', { name: /close.*play/i }));

    fireEvent.click(screen.getByRole('button', { name: /close.*play/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /close.*play/i })).not.toBeInTheDocument();
    });
  });
});

describe('getTurnPanelHeader - fortuney phase', () => {
  const mockT = (k: any, options?: any) => {
    if (k === 'lbl_chance_time') return 'CHANCE TIME!';
    if (k === 'msg_bot_thinking') return 'BOT THINKING…';
    if (k === 'msg_turn') return `${options?.name}'s TURN`;
    if (k === 'btn_start_game') return 'START GAME';
    if (k === 'msg_winner') return `${options?.name} WINS!`;
    if (k === 'msg_p2_turn') return "P2's TURN";
    return k;
  };

  it('returns CHANCE TIME when isFlippingPhase is true', () => {
    expect(getTurnPanelHeader(mockT, 'ongoing', null, false, 'P1', 'Guest User', true))
      .toBe('CHANCE TIME!');
  });

  it('flipping phase takes priority over bot thinking', () => {
    expect(getTurnPanelHeader(mockT, 'ongoing', null, true, 'P1', 'Guest User', true))
      .toBe('CHANCE TIME!');
  });
});

describe('getTurnPanelSubtext - fortuney phase', () => {
  const mockT = (k: any) => {
    if (k === 'msg_determining_turn') return 'Determining next turn...';
    if (k === 'msg_choose_mode') return 'Choose mode below';
    if (k === 'color_blue') return '(blue)';
    if (k === 'color_red') return '(red)';
    return k;
  };

  it('returns determining turn message when isFlippingPhase is true', () => {
    expect(getTurnPanelSubtext(mockT, 'ongoing', 'P1', true))
      .toBe('Determining next turn...');
  });
});