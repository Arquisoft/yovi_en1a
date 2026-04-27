import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        'btn_play': 'PLAY',
        'btn_pvp': 'PLAYER VS. PLAYER',
        'btn_pvc': 'PLAYER VS. COMPUTER',
        'diff_beginner': 'BEGINNER',
        'diff_medium': 'MEDIUM',
        'lbl_select_mode': 'SELECT MODE:',
        'btn_got_it': 'Got it!',
        'nav_logout': 'Logout',
        'lbl_game_rule': 'Game Rule',
        'rule_classic': 'Classic',
        'rule_whynot_name': 'Why Not'
      };
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('how_to_play_title') || lowerKey.includes('modal_title')) return 'HOW TO PLAY: GAME Y';
      if (lowerKey.includes('how_to_play') || lowerKey.includes('help')) return 'How to Play';
      
      return dict[key] || key;
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' }
  })
}));

vi.mock('../SoundService', () => ({
  soundService: {
    settings: { muteMove: false, muteWin: false, muteLoss: false, muteBGM: false, theme: 'ysound' },
    updateSettings: vi.fn(),
    playMove: vi.fn(),
    playBotMove: vi.fn(),
    playWin: vi.fn(),
    playLoss: vi.fn(),
    startBGM: vi.fn(),
    stopBGM: vi.fn(),
  },
  AVAILABLE_PACKS: ['ysound'],
}));

describe('App & Lobby Coverage Booster', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
  });
  
  it('Lobby: Covers all game mode selections', () => {
      const onPlayMock = vi.fn();
      render(<Lobby onPlay={onPlayMock} onLogout={vi.fn()} username="Tester" />);
      
      const playBtn = screen.getByRole('button', { name: /^PLAY$/i });

      // Test PVP
      fireEvent.click(screen.getByText(/PLAYER VS\. PLAYER/i));
      fireEvent.click(playBtn);
     expect(onPlayMock).toHaveBeenLastCalledWith('pvp', 'beginner', 11, 'classic');

      // Test PVC Mode and Difficulty selection
      fireEvent.click(screen.getByText(/PLAYER VS\. COMPUTER/i));
      
      // Select difficulty medium
      fireEvent.click(screen.getByText(/^MEDIUM$/i));
      fireEvent.click(playBtn);
      expect(onPlayMock).toHaveBeenLastCalledWith('pvc', 'medium', 11, 'classic');
  });

  it('Lobby: Disables difficulty when PVP is selected', () => {
    render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="Tester" />);
    
    // Default is PVP, so difficulty should be disabled
    const beginnerBtn = screen.getByRole('button', { name: /^BEGINNER$/i });
    expect(beginnerBtn).toBeDisabled();
    
    // Switch to PVC
    fireEvent.click(screen.getByText(/PLAYER VS\. COMPUTER/i));
    expect(beginnerBtn).not.toBeDisabled();
  });

  it('Lobby: Displays the provided username', () => {
    render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="MasterPlayer" />);
    // toBeInTheDocument will work now
    expect(screen.getByText(/MasterPlayer/i)).toBeInTheDocument();
  });

  it('App: Blocks Lobby access if NOT logged in', () => {
    vi.stubGlobal('location', { search: '?view=lobby', href: '/?view=lobby' });
    render(<App />);
    expect(screen.queryByText(/SELECT MODE:/i)).toBeNull();
  });

  it('App: Allows Lobby access if logged in', () => {
    localStorage.setItem('username', 'AuthorizedUser');
    vi.stubGlobal('location', { search: '?view=lobby', href: '/?view=lobby' });
    render(<App />);
    expect(screen.getByText(/SELECT MODE:/i)).toBeInTheDocument();
  });

  it('App: Handles view navigation to Home', () => {
    render(<App />);
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });
  
  it('Lobby: Toggles the How to Play modal', () => {
    render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="Tester" />);
    
    expect(screen.queryByText(/HOW TO PLAY: GAME Y/i)).not.toBeInTheDocument();

    const helpBtn = screen.getByTitle('How to Play'); 
    fireEvent.click(helpBtn);

    expect(screen.getByText(/HOW TO PLAY: GAME Y/i)).toBeInTheDocument();

    const closeBtn = screen.getByText(/Got it!/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/HOW TO PLAY: GAME Y/i)).not.toBeInTheDocument();
  });
  it('Lobby: Covers game rule selections (Classic vs Why Not)', () => {
    const onPlayMock = vi.fn();
    render(<Lobby onPlay={onPlayMock} onLogout={vi.fn()} username="Tester" />);
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });

    const whyNotBtn = screen.getByRole('button', { name: /Why Not/i });
    fireEvent.click(whyNotBtn);
    

    fireEvent.click(playBtn);

   
    expect(onPlayMock).toHaveBeenLastCalledWith('pvp', 'beginner', 11, 'whynot');
  });

it('Lobby: Selects fortuney rule and passes it to onPlay', () => {
    const onPlayMock = vi.fn();
    render(<Lobby onPlay={onPlayMock} onLogout={vi.fn()} username="Tester" />);

    fireEvent.click(screen.getByRole('button', { name: /fortuney/i }));
    fireEvent.click(screen.getByRole('button', { name: /^PLAY$/i }));

    expect(onPlayMock).toHaveBeenLastCalledWith('pvp', 'beginner', 11, 'fortuney');
  });

  it('Lobby: Opens and interacts with the Sound Settings popup', () => {
    render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="Tester" />);
    
    // Open settings
    const settingsBtn = screen.getByTitle('Settings');
    fireEvent.click(settingsBtn);
    expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    
    // Toggle a checkbox
    const moveSoundsCheckbox = screen.getByLabelText(/Move Sounds/i);
    fireEvent.click(moveSoundsCheckbox);
    
    // Change soundpack
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'retro' } });
    
    // Close settings
    const closeBtn = screen.getByText('Save & Close');
    fireEvent.click(closeBtn);
    
    expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument();
  });
});
