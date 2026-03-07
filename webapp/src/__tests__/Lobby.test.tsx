import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';

describe('App & Lobby Coverage Booster', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
  });

  // --- LOBBY COMPONENT TESTS ---

  it('Lobby: Covers all game mode selections', () => {
    const onPlayMock = vi.fn();
    render(<Lobby onPlay={onPlayMock} onLogout={vi.fn()} username="Tester" />);
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });

    // Test EASY mode
    fireEvent.click(screen.getByText(/VS. COMPUTER: EASY/i));
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenLastCalledWith('easy');

    // Test DIFFICULT mode
    fireEvent.click(screen.getByText(/VS. COMPUTER: DIFFICULT/i));
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenLastCalledWith('diff');

    // Test PVP (Default/Manual selection)
    fireEvent.click(screen.getByText(/PLAYER VS PLAYER/i));
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenLastCalledWith('pvp');
  });

  it('Lobby: Displays the provided username', () => {
    render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="MasterPlayer" />);
    expect(screen.getByText(/MasterPlayer/i)).toBeInTheDocument();
  });

  // --- APP COMPONENT TESTS (ROUTE GUARDS & LOGIC) ---

  it('App: Blocks Lobby access if NOT logged in (Covers redirect branch)', () => {
    // 1. Ensure localStorage is empty
    localStorage.clear();
    
    // 2. Try to visit lobby URL
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test',
      href: '/test?view=lobby'
    });
    
    render(<App />);
    
    // 3. Verify Lobby is NOT rendered (Should show login instead)
    expect(screen.queryByText(/SELECT MODE:/i)).toBeNull();
    expect(screen.getByText(/Welcome to the Software Architecture/i)).toBeInTheDocument();
  });

  it('App: Allows Lobby access if logged in', () => {
    localStorage.setItem('username', 'AuthorizedUser');
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test',
      href: '/test?view=lobby'
    });
    
    render(<App />);
    expect(screen.getByText(/SELECT MODE:/i)).toBeInTheDocument();
  });

  it('App: handleLogout clears storage and redirects', () => {
    localStorage.setItem('username', 'UserToDelete');
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });

    render(<App />);
    const logoutBtn = screen.getByRole('button', { name: /^Logout$/i });
    fireEvent.click(logoutBtn); 
    
    expect(localStorage.getItem('username')).toBeNull();
  });

  it('App: Handles view navigation to Home', () => {
    vi.stubGlobal('location', {
      search: '', // No query params = Home
      pathname: '/test'
    });

    render(<App />);
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });
});