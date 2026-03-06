import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest'; // or 'jest'
import Lobby from '../Lobby';

describe('Lobby Component Coverage', () => {
  it('should render and allow mode selection', () => {
    const onPlayMock = vi.fn();
    
    // 1. Render the component (Covers the main return block)
    render(<Lobby username="Tester" onPlay={onPlayMock} />);
    
    // 2. Click a mode button (Covers the setSelectedMode state change)
    const easyModeBtn = screen.getByText(/VS. COMPUTER: EASY/i);
    fireEvent.click(easyModeBtn);
    
    // 3. Click play (Covers the onPlay?.(selectedMode) line)
    const playBtn = screen.getByText(/PLAY/i);
    fireEvent.click(playBtn);
    
    expect(onPlayMock).toHaveBeenCalledWith('easy');
    expect(screen.getByText('Tester')).toBeDefined();
  });

  it('calls onLogout when logout is clicked', () => {
    const onLogoutMock = vi.fn();
    render(<Lobby onLogout={onLogoutMock} />);
    
    const logoutBtn = screen.getByText(/Logout/i);
    fireEvent.click(logoutBtn);
    
    expect(onLogoutMock).toHaveBeenCalled();
  });
});