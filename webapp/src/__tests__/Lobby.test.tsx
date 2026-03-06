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
    
    // 1. FIX: Find the specific submit button to trigger navigation
    // Using a regex that matches your "Lets go!" or "Login" button
    const loginOrSubmitBtn = screen.queryByRole('button', { name: /Lets go!|Login/i }); 
    if (loginOrSubmitBtn) {
      fireEvent.click(loginOrSubmitBtn);
    }

    // 2. Mock search to trigger the Lobby view branch
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });
    
    // Render again with the new location mock
    render(<App />);
    
    // Verifies the Lobby rendered successfully
    expect(screen.getByText(/SELECT MODE:/i)).toBeDefined();
  });

  it('App.tsx: Covers handleLogout', () => {
    // Set mock to Lobby state
    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test'
    });

    render(<App />);
    
    // Target the logout button
    const logoutBtn = screen.getByRole('button', { name: /Logout/i });
    fireEvent.click(logoutBtn); 
    
    // Verifies the code on the handleLogout line was executed
    expect(globalThis.location.href).toBeDefined();
  });
});