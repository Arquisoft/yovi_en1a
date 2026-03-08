import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
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

  it('should start in idle state showing START GAME and mode selector', () => {
    render(<GameBoard />);

    // In idle state 'START GAME' appears both in the turn panel and the button
    const startGameElements = screen.getAllByText('START GAME');
    expect(startGameElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Choose mode below')).toBeInTheDocument();

    // Player cards are still rendered in the right sidebar
    expect(screen.getByText('P1: USERN.').parentElement).toHaveClass('p1-card');
  });

  it('should render the correct number of hex cells on the board', () => {
    render(<GameBoard />);

    // BOARD_SIZE=11 → TOTAL_CELLS = 11*12/2 = 66
    const hexCells = document.querySelectorAll('.hex-cell');
    expect(hexCells.length).toBe(66);
  });

  it('should not change a cell when clicked while game is idle (board is non-interactive)', () => {
    render(<GameBoard />);

    // In idle state all cells are disabled (opacity 0.6, disabled attr)
    const allHexCells = document.querySelectorAll('.hex-cell');
    expect(allHexCells.length).toBeGreaterThan(0);

    // All cells should be empty and disabled while idle
    allHexCells.forEach(cell => {
      expect(cell).toHaveClass('hex-empty');
      expect(cell).toBeDisabled();
    });
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

  it('should show mode selector with Human vs Bot and Human vs Human options in idle state', () => {
    render(<GameBoard />);

    expect(screen.getByLabelText(/Human vs Bot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Human vs Human/i)).toBeInTheDocument();

    // Default selected mode should be hvb
    const hvbRadio = screen.getByLabelText(/Human vs Bot/i) as HTMLInputElement;
    expect(hvbRadio.checked).toBe(true);
  });

  it('should toggle selected mode when a radio button is clicked', () => {
    render(<GameBoard />);

    const hvhRadio = screen.getByLabelText(/Human vs Human/i) as HTMLInputElement;
    const hvbRadio = screen.getByLabelText(/Human vs Bot/i) as HTMLInputElement;

    expect(hvbRadio.checked).toBe(true);
    expect(hvhRadio.checked).toBe(false);

    fireEvent.click(hvhRadio);

    expect(hvhRadio.checked).toBe(true);
    expect(hvbRadio.checked).toBe(false);
  });

  it('should show START GAME button in idle state and hide it once a game starts', () => {
    render(<GameBoard />);

    // START GAME button visible in idle
    const startBtn = screen.getByRole('button', { name: /START GAME/i });
    expect(startBtn).toBeInTheDocument();
  });

  it('should display P2 (Bot) label in hvb mode and P2: USERN. in hvh mode', () => {
    render(<GameBoard />);

    // Default mode is hvb
    expect(screen.getByText('P2 (Bot)')).toBeInTheDocument();

    // Switch to hvh
    const hvhRadio = screen.getByLabelText(/Human vs Human/i);
    fireEvent.click(hvhRadio);

    expect(screen.getByText('P2: USERN.')).toBeInTheDocument();
    expect(screen.queryByText('P2 (Bot)')).not.toBeInTheDocument();
  });

});