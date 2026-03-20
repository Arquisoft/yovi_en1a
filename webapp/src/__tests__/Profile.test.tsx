import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import App from '../App';
import Lobby from '../Lobby';
import Profile from '../Profile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stubLocation(search: string, pathname = '/test') {
    vi.stubGlobal('location', {
        search,
        pathname,
        href: '',
    });
}

// ─── App & Lobby ──────────────────────────────────────────────────────────────

describe('App & Lobby Coverage Booster', () => {
    beforeEach(() => {
        localStorage.clear();
        stubLocation('');
    });

    it('Lobby: Covers all game mode selections', () => {
        const onPlayMock = vi.fn();
        render(<Lobby onPlay={onPlayMock} onLogout={vi.fn()} username="Tester" />);

        const playBtn = screen.getByRole('button', { name: /^PLAY$/i });

        fireEvent.click(screen.getByText(/PLAYER VS\. PLAYER/i));
        fireEvent.click(playBtn);
        expect(onPlayMock).toHaveBeenLastCalledWith('pvp', 'beginner');

         fireEvent.click(screen.getByText(/PLAYER VS\. COMPUTER/i));
        fireEvent.click(screen.getByText(/^MEDIUM$/i));
        fireEvent.click(playBtn);
        expect(onPlayMock).toHaveBeenLastCalledWith('pvc', 'medium');
    });

    it('Lobby: Disables difficulty when PVP is selected', () => {
        render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="Tester" />);

        const beginnerBtn = screen.getByRole('button', { name: /^BEGINNER$/i });
        expect(beginnerBtn).toBeDisabled();

        fireEvent.click(screen.getByText(/PLAYER VS\. COMPUTER/i));
        expect(beginnerBtn).not.toBeDisabled();
    });

    it('Lobby: Displays the provided username', () => {
        render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} username="MasterPlayer" />);
        expect(screen.getByText(/MasterPlayer/i)).toBeInTheDocument();
    });

    it('Lobby: Calls onProfile when profile button is clicked', () => {
        const onProfileMock = vi.fn();
        render(<Lobby onPlay={vi.fn()} onLogout={vi.fn()} onProfile={onProfileMock} username="Tester" />);
        fireEvent.click(screen.getByText(/Tester/i).closest('button')!);
        expect(onProfileMock).toHaveBeenCalled();
    });

    it('App: Blocks Lobby access if NOT logged in', () => {
        stubLocation('?view=lobby', '/');
        render(<App />);
        expect(screen.queryByText(/SELECT MODE:/i)).toBeNull();
    });

    it('App: Allows Lobby access if logged in', () => {
        localStorage.setItem('username', 'AuthorizedUser');
        stubLocation('?view=lobby', '/');
        render(<App />);
        expect(screen.getByText(/SELECT MODE:/i)).toBeInTheDocument();
    });

    it('App: Shows RegisterForm on home view', () => {
        stubLocation('');
        render(<App />);
        expect(screen.getByRole('button', { name: /LOGIN/i })).toBeInTheDocument();
    });

    it('App: Renders Profile page when view=profile and logged in', () => {
        localStorage.setItem('username', 'ProfileUser');
        stubLocation('?view=profile', '/');
        render(<App />);
        expect(screen.getByText(/GAME Y/i)).toBeInTheDocument();
        expect(screen.getByText(/Match History/i)).toBeInTheDocument();
    });

    it('App: Blocks Profile access if NOT logged in', () => {
        stubLocation('?view=profile', '/');
        render(<App />);
        expect(screen.queryByText(/Match History/i)).toBeNull();
    });
});

// ─── Profile component ────────────────────────────────────────────────────────

describe('Profile Component', () => {
    const mockHistory = [
        { id: 1, result: 'win'  as const, pts: 340, mode: 'Ranked' },
        { id: 2, result: 'lose' as const, pts: 210, mode: 'Casual' },
        { id: 3, result: 'win'  as const, pts: 480, mode: 'Ranked' },
    ];

    it('renders the navbar logo', () => {
        render(<Profile />);
        expect(screen.getByText('GAME Y')).toBeInTheDocument();
    });

    it('renders the username', () => {
        render(<Profile username="HexMaster" />);
        expect(screen.getByText('HexMaster')).toBeInTheDocument();
    });

    it('renders the default username when none is provided', () => {
        render(<Profile />);
        expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('renders the Stats section label', () => {
        render(<Profile />);
        const labels = screen.getAllByText(/stats/i);
        expect(labels.length).toBeGreaterThan(0);
    });

    it('renders the winrate percentage', () => {
        render(<Profile winRate={72} />);
        // The pct and % are in the same span so getByText needs a regex
        expect(screen.getByText(/72/)).toBeInTheDocument();
    });

    it('renders the best score', () => {
        render(<Profile bestScore={1200} />);
        expect(screen.getByText('1200')).toBeInTheDocument();
    });

    it('renders Match History section label', () => {
        render(<Profile />);
        expect(screen.getByText(/match history/i)).toBeInTheDocument();
    });

    it('renders all match history rows', () => {
        render(<Profile matchHistory={mockHistory} />);
        const winBadges  = screen.getAllByText('Win');
        const loseBadges = screen.getAllByText('Lose');
        expect(winBadges.length).toBe(2);
        expect(loseBadges.length).toBe(1);
    });

    it('renders the correct points for each match', () => {
        render(<Profile matchHistory={mockHistory} />);
        expect(screen.getByText('340')).toBeInTheDocument();
        expect(screen.getByText('210')).toBeInTheDocument();
        // 480 appears both as bestScore default AND in history — use getAllByText
        expect(screen.getAllByText('480').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the correct mode for each match', () => {
        render(<Profile matchHistory={mockHistory} />);
        const ranked = screen.getAllByText('Ranked');
        const casual = screen.getAllByText('Casual');
        expect(ranked.length).toBe(2);
        expect(casual.length).toBe(1);
    });

    it('calls onPlayClick when Play nav button is clicked', () => {
        const onPlayClick = vi.fn();
        render(<Profile onPlayClick={onPlayClick} />);
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
        expect(onPlayClick).toHaveBeenCalled();
    });

    it('calls onLogout when Logout button is clicked', () => {
        const onLogout = vi.fn();
        render(<Profile onLogout={onLogout} />);
        fireEvent.click(screen.getByRole('button', { name: /logout/i }));
        expect(onLogout).toHaveBeenCalled();
    });

    it('renders win badges with correct class', () => {
        render(<Profile matchHistory={mockHistory} />);
        const winBadges = document.querySelectorAll('.result-badge.win');
        expect(winBadges.length).toBe(2);
    });

    it('renders lose badges with correct class', () => {
        render(<Profile matchHistory={mockHistory} />);
        const loseBadges = document.querySelectorAll('.result-badge.lose');
        expect(loseBadges.length).toBe(1);
    });

    it('renders the Win rate label below the ring', () => {
        render(<Profile />);
        expect(screen.getByText(/win rate/i)).toBeInTheDocument();
    });

    it('renders the Best Score label', () => {
        render(<Profile />);
        expect(screen.getByText(/best score/i)).toBeInTheDocument();
    });

    it('renders history table headers', () => {
        render(<Profile />);
        expect(screen.getByText(/win \/ lose/i)).toBeInTheDocument();
        expect(screen.getByText(/points/i)).toBeInTheDocument();
        expect(screen.getByText(/mode/i)).toBeInTheDocument();
    });
});