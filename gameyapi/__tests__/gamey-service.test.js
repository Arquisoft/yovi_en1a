import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameBoard from '../GameBoard.tsx';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockGameSession = {
    gameId: 'test-game-123',
    mode: 'hvh',
    boardSize: 11,
    moves: [],
    status: 'ongoing',
    currentPlayer: 0,
    winner: null,
    layout: '.'.repeat(66),
};

function mockFetch(overrides = {}) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockGameSession, ...overrides }),
    });
}

function mockFetchSequence(...responses: object[]) {
    global.fetch = vi.fn();
    responses.forEach(res => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => res,
        });
    });
}

// Start a game by clicking the START GAME button
async function startGame() {
    const startBtn = screen.getByRole('button', { name: /START GAME/i });
    await act(async () => { fireEvent.click(startBtn); });
    await waitFor(() => expect(screen.queryByText('START GAME')).not.toBeInTheDocument());
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GameBoard Component', () => {

    it('should display the title and basic buttons correctly', () => {
        render(<GameBoard />);
        expect(screen.getByText('GAME Y')).toBeInTheDocument();
        expect(screen.getByText(/Profile/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /UNDO/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /END TURN/i })).toBeInTheDocument();
    });

    it('should show START GAME in the turn indicator before a game begins', () => {
        render(<GameBoard />);
        expect(screen.getByText('START GAME')).toBeInTheDocument();
        expect(screen.getByText('Choose mode below')).toBeInTheDocument();
    });

    it('should show P1 TURN and (Blue) after game starts', async () => {
        mockFetch();
        render(<GameBoard />);
        await startGame();
        expect(screen.getByText('P1 TURN')).toBeInTheDocument();
        expect(screen.getByText('(Blue)')).toBeInTheDocument();
    });

    it('should have correct classes for player cards', () => {
        render(<GameBoard />);
        const p1Container = screen.getByText('P1: USERN.').parentElement;
        expect(p1Container).toHaveClass('p1-card');
    });

    it('should show P2 (Bot) label in hvb mode by default', () => {
        render(<GameBoard />);
        expect(screen.getByText('P2 (Bot)')).toBeInTheDocument();
    });

    it('should have correct classes for action buttons', () => {
        render(<GameBoard />);
        expect(screen.getByText('UNDO')).toHaveClass('btn-undo');
        expect(screen.getByText('END TURN')).toHaveClass('btn-end');
    });

    it('should show mode selector before game starts', () => {
        render(<GameBoard />);
        expect(screen.getByText('Human vs Bot')).toBeInTheDocument();
        expect(screen.getByText('Human vs Human')).toBeInTheDocument();
    });

    it('should hide mode selector after game starts', async () => {
        mockFetch();
        render(<GameBoard />);
        await startGame();
        expect(screen.queryByText('Human vs Bot')).not.toBeInTheDocument();
    });

    it('should fill a cell with B and switch to P2 after P1 clicks in hvh mode', async () => {
        // Create game response
        const createResponse = { ...mockGameSession, mode: 'hvh' };
        // Move response: P1 placed at (0,0), now P2's turn
        const moveResponse = {
            ...mockGameSession,
            mode: 'hvh',
            moves: [{ player: 0, x: 0, y: 0 }],
            currentPlayer: 1,
        };
        mockFetchSequence(createResponse, moveResponse);

        render(<GameBoard />);
        await startGame();

        const cells = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('hex-cell')
        );

        await act(async () => { fireEvent.click(cells[0]); });

        await waitFor(() => {
            expect(cells[0]).toHaveClass('hex-p1');
            expect(cells[0]).toHaveTextContent('B');
        });

        expect(screen.getByText('P2 TURN')).toBeInTheDocument();
        expect(screen.getByText('(Red)')).toBeInTheDocument();
    });

    it('should not change a filled cell when clicked again', async () => {
        const createResponse = { ...mockGameSession, mode: 'hvh' };
        const moveResponse = {
            ...mockGameSession,
            mode: 'hvh',
            moves: [{ player: 0, x: 0, y: 0 }],
            currentPlayer: 1,
        };
        // Only one fetch call — second click is blocked locally
        mockFetchSequence(createResponse, moveResponse);

        render(<GameBoard />);
        await startGame();

        const cells = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('hex-cell')
        );

        await act(async () => { fireEvent.click(cells[0]); });
        await waitFor(() => expect(cells[0]).toHaveTextContent('B'));

        const callCountAfterFirst = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

        // Click the same cell again — should be blocked (board[index] !== '.')
        await act(async () => { fireEvent.click(cells[0]); });

        // fetch should not have been called again
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCountAfterFirst);
        expect(cells[0]).toHaveTextContent('B');
    });

    it('should show an error message when the API fails', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Server error' }),
        });

        render(<GameBoard />);
        const startBtn = screen.getByRole('button', { name: /START GAME/i });
        await act(async () => { fireEvent.click(startBtn); });

        await waitFor(() =>
            expect(screen.getByText(/Failed to create game/i)).toBeInTheDocument()
        );
    });

    it('should show REMATCH button when game is finished', async () => {
        const createResponse = { ...mockGameSession, mode: 'hvh' };
        const finishedResponse = {
            ...mockGameSession,
            mode: 'hvh',
            status: 'finished',
            winner: 0,
            moves: [{ player: 0, x: 0, y: 0 }],
            currentPlayer: 1,
        };
        mockFetchSequence(createResponse, finishedResponse);

        render(<GameBoard />);
        await startGame();

        const cells = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('hex-cell')
        );
        await act(async () => { fireEvent.click(cells[0]); });

        await waitFor(() =>
            expect(screen.getByRole('button', { name: /REMATCH/i })).toBeInTheDocument()
        );
        expect(screen.getByText('P1 WINS!')).toBeInTheDocument();
    });

});