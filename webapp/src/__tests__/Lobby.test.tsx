import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';
import '@testing-library/jest-dom'; // MISSING IMPORT FIXED

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
      expect(onPlayMock).toHaveBeenLastCalledWith('pvp', 'beginner');

      // Test PVC Mode and Difficulty selection
      fireEvent.click(screen.getByText(/PLAYER VS\. COMPUTER/i));
      
      // Select difficulty medium
      fireEvent.click(screen.getByText(/^MEDIUM$/i));
      fireEvent.click(playBtn);
      expect(onPlayMock).toHaveBeenLastCalledWith('pvc', 'medium');
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
});