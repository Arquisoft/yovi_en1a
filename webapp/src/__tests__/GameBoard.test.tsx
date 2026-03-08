import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GameBoard from '../GameBoard.tsx';

describe('GameBoard Component', () => {
  
  it('should display the title and basic buttons correctly', () => {
    render(<GameBoard />);
    
    expect(screen.getByText('GAME Y')).toBeInTheDocument();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /UNDO/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /END TURN/i })).toBeInTheDocument();
  });

  it('should start with P1 (Blue) player turn', () => {
    render(<GameBoard />);
    
    const turnIndicator = screen.getByText('P1 TURN');
    const colorSubtext = screen.getByText('(Blue)');
    
    expect(turnIndicator).toBeInTheDocument();
    expect(colorSubtext).toBeInTheDocument();
    expect(screen.getByText('P1: USERN.').parentElement).toHaveClass('p1-card');
  });

  it('should fill a cell and change turn when an empty cell is clicked', () => {
    render(<GameBoard />);
    
    const emptyCells = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('hex-empty')
    );
    
    fireEvent.click(emptyCells[0]);
    
    expect(emptyCells[0]).toHaveTextContent('B');
    expect(emptyCells[0]).toHaveClass('hex-p1');
    
    expect(screen.getByText('P2 TURN')).toBeInTheDocument();
    expect(screen.getByText('(Red)')).toBeInTheDocument();
  });

  it('should not change content when a filled cell is clicked again', () => {
    render(<GameBoard />);
    
    const emptyCells = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('hex-empty')
    );
    
    fireEvent.click(emptyCells[0]);
    expect(emptyCells[0]).toHaveTextContent('B');
    
    fireEvent.click(emptyCells[0]);
    
    expect(emptyCells[0]).toHaveTextContent('B');
    expect(screen.getByText('P2 TURN')).toBeInTheDocument();
  });

  it('should have border classes defined for all sides of player cards', () => {
    render(<GameBoard />);
    
    const p1Container = screen.getByText('P1: USERN.').parentElement;
    const p2Container = screen.getByText('P2 (Bot)').parentElement;
    
    expect(p1Container).toHaveClass('p1-card');
    expect(p2Container).toHaveClass('p2-card');
  });

  it('should have correct classes for action buttons (Undo/End)', () => {
    render(<GameBoard />);
    
    const undoBtn = screen.getByText('UNDO');
    const endTurnBtn = screen.getByText('END TURN');
    
    expect(undoBtn).toHaveClass('btn-undo');
    expect(endTurnBtn).toHaveClass('btn-end');
  });

});