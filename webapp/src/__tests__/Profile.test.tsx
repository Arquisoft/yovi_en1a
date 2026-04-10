import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Profile from '../Profile';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./Profile.css', () => ({}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderProfile(props = {}) {
    return render(<Profile {...props} />);
}

function buildFetchResponse(data: unknown, ok = true) {
    return Promise.resolve({
        ok,
        json: () => Promise.resolve(data),
    } as Response);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Profile – basic rendering', () => {
    it('renders the navbar logo', () => {
        renderProfile();
        expect(screen.getByText('GAME Y')).toBeInTheDocument();
    });

    it('renders the Play button', () => {
        renderProfile();
        expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('renders the Logout button', () => {
        renderProfile();
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('renders the default username "Username"', () => {
        renderProfile();
        expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('renders a custom username when provided', () => {
        renderProfile({ username: 'Xolotl99' });
        expect(screen.getByText('Xolotl99')).toBeInTheDocument();
    });

    it('renders the Stats panel label', () => {
        renderProfile();
        expect(screen.getByText('Stats')).toBeInTheDocument();
    });

    it('renders the Match History panel label', () => {
        renderProfile();
        expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    it('renders Win rate label', () => {
        renderProfile();
        expect(screen.getByText('Win rate')).toBeInTheDocument();
    });

    it('renders Best Score label', () => {
        renderProfile();
        expect(screen.getByText('Best Score')).toBeInTheDocument();
    });
});

// ── Default / Fallback data ───────────────────────────────────────────────────

describe('Profile – fallback data (no token)', () => {
    it('shows the fallback win-rate of 65%', () => {
        renderProfile();
        expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('shows fallback best score of 0', () => {
        renderProfile();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders the default match history rows', () => {
        renderProfile();
        const wins = screen.getAllByText('Win');
        const losses = screen.getAllByText('Lose');
        expect(wins).toHaveLength(3);
        expect(losses).toHaveLength(2);
    });

    it('renders correct points from default history', () => {
        renderProfile();
        expect(screen.getByText('340')).toBeInTheDocument();
        expect(screen.getByText('210')).toBeInTheDocument();
        expect(screen.getByText('480')).toBeInTheDocument();
    });

    it('renders Ranked and Casual mode labels', () => {
        renderProfile();
        const ranked = screen.getAllByText('Ranked');
        const casual = screen.getAllByText('Casual');
        expect(ranked.length).toBeGreaterThan(0);
        expect(casual.length).toBeGreaterThan(0);
    });

    it('does NOT call fetch when there is no token', () => {
        renderProfile();
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// ── API / useProfileStats ─────────────────────────────────────────────────────

describe('Profile – API fetching', () => {
    const apiData = {
        winRate: 72,
        bestScore: 9800,
        matchHistory: [
            { id: 10, result: 'win',  pts: 600, mode: 'Ranked' },
            { id: 11, result: 'lose', pts: 100, mode: 'Casual' },
        ],
    };

    beforeEach(() => {
        localStorageMock.setItem('token', 'fake-jwt-token');
    });

    it('calls /profile with the Authorization header', async () => {
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        renderProfile();
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toMatch(/\/profile$/);
        expect(opts.headers.Authorization).toBe('Bearer fake-jwt-token');
    });

    it('displays win rate returned by API', async () => {
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        renderProfile();
        await waitFor(() => expect(screen.getByText('72%')).toBeInTheDocument());
    });

    it('displays best score returned by API', async () => {
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        renderProfile();
        await waitFor(() => expect(screen.getByText(/9[,.]?800/)).toBeInTheDocument());
    });

    it('displays match history returned by API', async () => {
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        renderProfile();
        await waitFor(() => expect(screen.getByText('600')).toBeInTheDocument());
        expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('falls back to defaults when fetch rejects', async () => {
        mockFetch.mockReturnValue(Promise.reject(new Error('Network error')));
        renderProfile();
        await waitFor(() => expect(screen.getByText('65%')).toBeInTheDocument());
    });
});

// ── Interactions ──────────────────────────────────────────────────────────────

describe('Profile – button interactions', () => {
    it('calls onPlayClick when Play is clicked', async () => {
        const onPlayClick = vi.fn();
        renderProfile({ onPlayClick });
        await userEvent.click(screen.getByRole('button', { name: /play/i }));
        expect(onPlayClick).toHaveBeenCalledTimes(1);
    });

    it('calls onLogout when Logout is clicked', async () => {
        const onLogout = vi.fn();
        renderProfile({ onLogout });
        await userEvent.click(screen.getByRole('button', { name: /logout/i }));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('does not throw if onPlayClick is not provided', async () => {
        renderProfile();
        await expect(
            userEvent.click(screen.getByRole('button', { name: /play/i }))
        ).resolves.not.toThrow();
    });

    it('does not throw if onLogout is not provided', async () => {
        renderProfile();
        await expect(
            userEvent.click(screen.getByRole('button', { name: /logout/i }))
        ).resolves.not.toThrow();
    });
});

// ── WinrateRing SVG ───────────────────────────────────────────────────────────

describe('WinrateRing', () => {
    it('renders an SVG element', () => {
        renderProfile();
        expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders the winrate-fill circle with correct dashoffset for 65%', () => {
        renderProfile();
        const fill = document.querySelector<SVGCircleElement>('.winrate-fill');
        expect(fill).not.toBeNull();
        const CIRC = 2 * Math.PI * 14;
        const expected = CIRC - (65 / 100) * CIRC;
        const actual = parseFloat(fill!.style.strokeDashoffset);
        expect(actual).toBeCloseTo(expected, 2);
    });

    it('renders the winrate-track circle', () => {
        renderProfile();
        expect(document.querySelector('.winrate-track')).toBeInTheDocument();
    });
});

// ── Match history table structure ─────────────────────────────────────────────

describe('Profile – match history table', () => {
    it('renders table headers: Win / Lose, Points, Mode', () => {
        renderProfile();
        expect(screen.getByText('Win / Lose')).toBeInTheDocument();
        expect(screen.getByText('Points')).toBeInTheDocument();
        expect(screen.getByText('Mode')).toBeInTheDocument();
    });

    it('applies "win" CSS class to win badges', () => {
        renderProfile();
        const winBadges = document.querySelectorAll('.result-badge.win');
        expect(winBadges.length).toBeGreaterThan(0);
    });

    it('applies "lose" CSS class to lose badges', () => {
        renderProfile();
        const loseBadges = document.querySelectorAll('.result-badge.lose');
        expect(loseBadges.length).toBeGreaterThan(0);
    });

    it('renders points inside .pts-value spans', () => {
        renderProfile();
        const pts = document.querySelectorAll('.pts-value');
        expect(pts.length).toBe(5);
    });
});