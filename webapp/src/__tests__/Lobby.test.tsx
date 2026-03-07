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
      
      // FIXED: Using ^PLAY$ ensure we don't accidentally match "PLAYER VS. PLAYER"
      const playBtn = screen.getByRole('button', { name: /^PLAY$/i });

      // Test PVP (Click the mode button, then the exact PLAY button)
      fireEvent.click(screen.getByText(/PLAYER VS\. PLAYER/i));
      fireEvent.click(playBtn);
      expect(onPlayMock).toHaveBeenLastCalledWith('pvp');

      // Test EASY
      fireEvent.click(screen.getByText(/VS\. COMPUTER: EASY/i));
      fireEvent.click(playBtn);
      expect(onPlayMock).toHaveBeenLastCalledWith('easy');

      // Test DIFFICULT
      fireEvent.click(screen.getByText(/VS\. COMPUTER: DIFFICULT/i));
      fireEvent.click(playBtn);
      expect(onPlayMock).toHaveBeenLastCalledWith('diff');
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