import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';

describe('Coverage for New Logic', () => {
  beforeEach(() => {
    // Clear everything and set a fake user so the Route Guard lets us in
    localStorage.clear();
    localStorage.setItem('username', 'Tester');
    
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
  });

  it('Lobby.tsx: Covers the return block and initial state', () => {
    const onPlayMock = vi.fn();
    // Ensure you pass all required props to Lobby
    render(<Lobby onPlay={onPlayMock} onLogout={vi.fn()} username="Tester" />);
    
    const easyBtn = screen.getByText(/VS. COMPUTER: EASY/i);
    fireEvent.click(easyBtn); 
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    fireEvent.click(playBtn);
    
    expect(onPlayMock).toHaveBeenCalledWith('easy');
    expect(screen.getByText('Tester')).toBeDefined();
  });

  it('App.tsx: Covers handleGoToLobby and isLobbyWindow logic', () => {
    // Force the URL to look like the lobby
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test',
      href: '/test?view=lobby'
    });
    
    render(<App />);
    // Now that localStorage has 'Tester', it will show the Lobby
    expect(screen.getByText(/SELECT MODE:/i)).toBeDefined();
  });

  it('App.tsx: Covers handleLogout', () => {
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });

    render(<App />);
    const logoutBtn = screen.getByRole('button', { name: /^Logout$/i });
    fireEvent.click(logoutBtn); 
    
    // Check if the username was actually cleared
    expect(localStorage.getItem('username')).toBeNull();
  });
});