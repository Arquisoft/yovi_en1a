import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';

describe('Coverage for New Logic', () => {
  // Mock global location for App.tsx logic
  beforeEach(() => {
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
  });

  it('Lobby.tsx: Covers the return block and initial state', () => {
    const onPlayMock = vi.fn();
    
    // Rendering covers the "return (" line and initial state
    render(<Lobby onPlay={onPlayMock} username="Tester" />);
    
    // 1. Target a specific mode button
    const easyBtn = screen.getByText(/VS. COMPUTER: EASY/i);
    fireEvent.click(easyBtn); 
    
    // 2. FIX: Target the "PLAY" button exactly using a regex anchor
    // This avoids matching "PLAYER VS. PLAYER"
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    fireEvent.click(playBtn);
    
    expect(onPlayMock).toHaveBeenCalledWith('easy');
    expect(screen.getByText('Tester')).toBeDefined();
  });

it('App.tsx: Covers handleGoToLobby and isLobbyWindow logic', () => {
    // Render the initial registration/login state
    render(<App />);
    
    // FIX: Target ONLY the "Lets go!" button specifically.
    // This avoids the conflict with the "Login" tab button.
    const loginOrSubmitBtn = screen.queryByRole('button', { name: /^Lets go!$/i }); 
    if (loginOrSubmitBtn) {
      fireEvent.click(loginOrSubmitBtn);
    }

    // 2. Mock search to trigger the Lobby view branch
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test',
      href: '/test?view=lobby'
    });
    
    // Render again with the new location mock to cover the "if (isLobbyWindow)" branch
    render(<App />);
    
    // Verifies the Lobby rendered successfully
    expect(screen.getByText(/SELECT MODE:/i)).toBeDefined();
  });

  it('App.tsx: Covers handleLogout', () => {
    // Mock that we are currently in the lobby
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });

    render(<App />);
    // Target the specific Logout button
    const logoutBtn = screen.getByRole('button', { name: /^Logout$/i });
    fireEvent.click(logoutBtn); 
    
    // Verifies the globalThis.location.href assignment was hit
    expect(globalThis.location.href).toBeDefined();
  });

  it('Lobby.tsx: Covers all game modes', () => {
    const onPlayMock = vi.fn();
    render(<Lobby onPlay={onPlayMock} />);
    
    // Test PvP (Default)
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('pvp');

    // Test Difficult Mode
    const diffBtn = screen.getByText(/DIFFICULT/i);
    fireEvent.click(diffBtn);
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('diff');
  });
});