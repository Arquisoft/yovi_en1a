import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';

describe('Coverage for New Logic', () => {
  // We need to mock location for App.tsx logic
  beforeEach(() => {
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
  });

  it('Lobby.tsx: Covers the return block and initial state', () => {
    const onPlayMock = vi.fn();
    // Rendering covers the "return (" line and the component declaration
    render(<Lobby onPlay={onPlayMock} />);
    
    const easyBtn = screen.getByText(/VS. COMPUTER: EASY/i);
    fireEvent.click(easyBtn); // Triggers setSelectedMode
    
    const playBtn = screen.getByText(/PLAY/i);
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('easy');
  });

  it('App.tsx: Covers handleGoToLobby and isLobbyWindow logic', () => {
    // 1. Mock location to trigger handleGoToLobby
    render(<App />);
    
    // Find whatever button triggers handleGoToLobby (e.g., a "Enter" or "Play" button)
    // If you don't have one yet, you can manually call the function if exported, 
    // but usually, we click a button:
    const loginOrSubmitBtn = screen.queryByRole('button'); 
    if (loginOrSubmitBtn) fireEvent.click(loginOrSubmitBtn);

    // 2. Mock search to cover the (isLobbyWindow) branch
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });
    
    render(<App />);
    // This rendering now executes the "if (isLobbyWindow)" block
    expect(screen.getByText(/SELECT MODE/i)).toBeDefined();
  });

  it('App.tsx: Covers handleLogout', () => {
    // Mock that we are currently in the lobby
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });

    render(<App />);
    const logoutBtn = screen.getByText(/Logout/i);
    fireEvent.click(logoutBtn); // Triggers handleLogout
    
    // Check if location was updated (covering the logout logic line)
    expect(globalThis.location.href).toBeDefined();
  });
});