import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import Lobby from '../Lobby';

describe('Coverage for New Logic', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      search: '',
      pathname: '/test',
      href: ''
    });
  });

  it('Lobby.tsx: Covers the return block and initial state', () => {
    const onPlayMock = vi.fn();
    
    render(<Lobby onPlay={onPlayMock} username="Tester" />);
    
    const easyBtn = screen.getByText(/VS. COMPUTER: EASY/i);
    fireEvent.click(easyBtn); 
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    fireEvent.click(playBtn);
    
    expect(onPlayMock).toHaveBeenCalledWith('easy');
    expect(screen.getByText('Tester')).toBeDefined();
  });

it('App.tsx: Covers handleGoToLobby and isLobbyWindow logic', () => {
    render(<App />);
    
    const loginOrSubmitBtn = screen.queryByRole('button', { name: /^Lets go!$/i }); 
    if (loginOrSubmitBtn) {
      fireEvent.click(loginOrSubmitBtn);
    }

    vi.stubGlobal('location', {
      search: '?view=lobby',
      pathname: '/test',
      href: '/test?view=lobby'
    });
    
    render(<App />);
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
    
    expect(globalThis.location.href).toBeDefined();
  });

  it('Lobby.tsx: Covers all game modes', () => {
    const onPlayMock = vi.fn();
    render(<Lobby onPlay={onPlayMock} />);
    
    const playBtn = screen.getByRole('button', { name: /^PLAY$/i });
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('pvp');

    const diffBtn = screen.getByText(/DIFFICULT/i);
    fireEvent.click(diffBtn);
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledWith('diff');
  });
});