import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';

describe('Coverage for New Logic', () => {
  beforeEach(() => {
    // 1. Mock location
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
    // 2. Clear storage before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Lobby.tsx: Covers the return block and initial state', () => {
    const onPlayMock = vi.fn();
    const onLogoutMock = vi.fn(); // Added missing prop if interface requires it
    
    render(<Lobby onPlay={onPlayMock} onLogout={onLogoutMock} username="Tester" />);
    
    const easyBtn = screen.getByText(/VS. COMPUTER: EASY/i);
    fireEvent.click(easyBtn); 
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    fireEvent.click(playBtn);
    
    expect(onPlayMock).toHaveBeenCalledWith('easy');
    expect(screen.getByText('Tester')).toBeDefined();
  });

  it('App.tsx: Covers handleGoToLobby and isLobbyWindow logic', () => {
    // PRE-CONDITION: Set the username so the Route Guard allows entry
    localStorage.setItem('username', 'Tester');

    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test',
      href: '/test?view=lobby'
    });
    
    render(<App />);
    
    // Now it won't redirect to Login, so "SELECT MODE:" will be found
    expect(screen.getByText(/SELECT MODE:/i)).toBeDefined();
  });

  it('App.tsx: Covers handleLogout', () => {
    // PRE-CONDITION: Must be logged in to see the Logout button
    localStorage.setItem('username', 'Tester');

    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });

    render(<App />);
    const logoutBtn = screen.getByRole('button', { name: /^Logout$/i });
    fireEvent.click(logoutBtn); 
    
    // After logout, localStorage should be empty
    expect(localStorage.getItem('username')).toBeNull();
  });

  it('Lobby.tsx: Covers all game modes', () => {
    const onPlayMock = vi.fn();
    const onLogoutMock = vi.fn();
    
    render(<Lobby onPlay={onPlayMock} onLogout={onLogoutMock} username="Tester" />);
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    
    // Default mode check
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('pvp');

    // Difficult mode check
    const diffBtn = screen.getByText(/DIFFICULT/i);
    fireEvent.click(diffBtn);
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('diff');
  });
});