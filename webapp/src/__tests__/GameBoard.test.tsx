import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameBoard, { getCellClass, getTurnPanelHeader, applyMovesToBoard } from '../GameBoard';

// --- Mocks ---

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

// --- Global Setup & Helpers ---

const globalFetch = vi.fn();
global.fetch = globalFetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

export const getTurnPanelSubtext = (t: any, status: string, currentPlayer: string | null, isFlippingPhase: boolean) => {
  if (isFlippingPhase) return t('msg_determining_turn');
  if (status === 'idle') return t('msg_choose_mode');
  return currentPlayer === 'P1' ? t('color_blue') : t('color_red');
};

function mockApiSuccess(data: object) {
  globalFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

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

// --- Test Suites ---

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
    const board = applyMovesToBoard(moves, 3);
    expect(board[0]).toBe('B');
    expect(board[2]).toBe('R');
  });
});

describe('GameBoard Component Core Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders initial idle state correctly', () => {
    render(<GameBoard username="Tester" />);
    expect(screen.getByText('START GAME')).toBeDefined();
    expect(screen.getByText(/Tester/)).toBeDefined();
  });

  it('starts a game and syncs session on button click', async () => {
    mockApiSuccess(makeMockSession());
    render(<GameBoard />);
    fireEvent.click(screen.getByText('START GAME'));

    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledWith(expect.stringContaining('/play/create'), expect.any(Object));
    });
  });

  it('handles cell clicks and updates board optimistically', async () => {
    mockApiSuccess(makeMockSession({ boardSize: 3 }));
    render(<GameBoard />);
    fireEvent.click(screen.getByText('START GAME'));

    const cells = await screen.findAllByRole('button');
    const hexCells = cells.filter(b => b.className.includes('hex-cell'));

    mockApiSuccess({ 
      gameId: 'abc', 
      moves: [{ player: 0, x: 0, y: 0 }], 
      status: 'ongoing', 
      currentPlayer: 1 
    });

    fireEvent.click(hexCells[0]);

    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledWith(expect.stringContaining('/move'), expect.any(Object));
    });
  });

  it('handles API errors gracefully', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server Crash' }),
    });

    render(<GameBoard />);
    fireEvent.click(screen.getByText('START GAME'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to create game/i)).toBeDefined();
    });
  });

  it('should toggle global mute state', () => {
    render(<GameBoard />);
    const muteBtn = screen.getByTitle('Mute');
    fireEvent.click(muteBtn);
    expect(screen.getByTitle('Unmute')).toBeDefined();
    fireEvent.click(screen.getByTitle('Unmute'));
    expect(screen.getByTitle('Mute')).toBeDefined();
  });
});

describe('GameBoard - Fortuney rule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should not show flip button when rule is classic', async () => {
    render(<GameBoard username="Guest User" />);
    mockApiSuccess(makeMockSession({ rule: 'classic', needsFlip: false }));
    fireEvent.click(screen.getByText('START GAME'));

    await waitFor(() => screen.getByText("Guest User's TURN"));
    expect(screen.queryByText(/FLIP COIN/i)).toBeNull();
  });

  it('should show flip button and disable cells when needsFlip is true', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByText('START GAME'));

    const flipBtn = await screen.findByRole('button', { name: /FLIP COIN/i });
    expect(flipBtn).toBeDefined();

    // Standard DOM check for the disabled property since toBeDisabled() is missing
    const cells = document.querySelectorAll('.hex-cell');
    cells.forEach(cell => {
      expect((cell as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('should call /flip endpoint and show animation overlay', async () => {
    render(<GameBoard />);
    mockApiSuccess(makeMockSession({ rule: 'fortuney', needsFlip: true }));
    fireEvent.click(screen.getByText('START GAME'));

    const flipBtn = await screen.findByRole('button', { name: /FLIP COIN/i });
    
    mockApiSuccess({ ...makeMockSession({ rule: 'fortuney', needsFlip: false }), coinFlip: 'heads' });
    fireEvent.click(flipBtn);

    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledWith(expect.stringContaining('/flip'), expect.any(Object));
      expect(screen.getByRole('button', { name: /CLOSE AND PLAY/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /CLOSE AND PLAY/i }));
    await waitFor(() => {
        expect(screen.queryByRole('button', { name: /CLOSE AND PLAY/i })).toBeNull();
    });
  });
});

describe('Turn Panel Helper - Fortuney Logic', () => {
  const mockT = (k: any, _options?: any) => {
    const map: any = {
      'lbl_chance_time': 'CHANCE TIME!',
      'msg_determining_turn': 'Determining next turn...',
      'btn_start_game': 'START GAME'
    };
    return map[k] || k;
  };

  it('returns CHANCE TIME and determining text when flipping', () => {
    expect(getTurnPanelHeader(mockT, 'ongoing', null, false, 'P1', 'Guest User', true))
      .toBe('CHANCE TIME!');
    expect(getTurnPanelSubtext(mockT, 'ongoing', 'P1', true))
      .toBe('Determining next turn...');
  });
});