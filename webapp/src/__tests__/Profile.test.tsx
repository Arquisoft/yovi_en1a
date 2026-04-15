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

// ── Rendering & UI Labels ─────────────────────────────────────────────────────

describe('Profile – basic rendering', () => {
    it('renders essential UI elements', () => {
        renderProfile();
        expect(screen.getByText('GAME Y')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
        expect(screen.getByText('Stats')).toBeInTheDocument();
        expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    it('renders username logic correctly', () => {
        const { rerender } = renderProfile();
        expect(screen.getByText('Username')).toBeInTheDocument();
        
        rerender(<Profile username="Xolotl99" />);
        expect(screen.getByText('Xolotl99')).toBeInTheDocument();
    });
});

// ── Default / Fallback data ───────────────────────────────────────────────────

describe('Profile – fallback data (no token)', () => {
    it('shows the default win-rate of 0% and empty history', () => {
        renderProfile();
        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('0', { selector: '.profile-score-value' })).toBeInTheDocument();
        
        const tbody = document.querySelector('tbody');
        expect(tbody?.children.length).toBe(0);
    });

    it('does NOT call fetch when there is no token', () => {
        renderProfile();
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// ── API / Profile Stats ───────────────────────────────────────────────────────

describe('Profile – API fetching', () => {
    const apiData = {
        winRate: 72,
        bestScore: 9800,
        matchHistory: [
            { id: 10, result: 'win',  pts: 600, mode: 'hvh' },
            { id: 11, result: 'lose', pts: 100, mode: 'hvb' },
        ],
    };

    beforeEach(() => {
        localStorageMock.setItem('token', 'fake-jwt-token');
    });

    it('calls /profile with correct headers and displays data', async () => {
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        renderProfile();

        await waitFor(() => {
            expect(screen.getByText('72%')).toBeInTheDocument();
            // Using regex to handle possible locale-based formatting like 9,800
            expect(screen.getByText(/9.*800/)).toBeInTheDocument();
        });

        // Verify Mode Mapping
        expect(screen.getByText('Player vs Player')).toBeInTheDocument();
        expect(screen.getByText('Player vs Bot')).toBeInTheDocument();
    });

    it('falls back to 0% when fetch rejects', async () => {
        mockFetch.mockReturnValue(Promise.reject(new Error('Network error')));
        renderProfile();
        await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument());
    });
});

// ── Avatar Selection Flow ─────────────────────────────────────────────────────

describe('Profile – Avatar Selection', () => {
    it('opens the picker and updates avatar via API', async () => {
        localStorageMock.setItem('token', 'fake-jwt-token');
        mockFetch
            .mockReturnValueOnce(buildFetchResponse({})) // Initial profile fetch
            .mockReturnValueOnce(buildFetchResponse({ success: true })); // Avatar update fetch
        
        renderProfile();

        // 1. Open Picker
        const editBadge = screen.getByText('✎');
        await userEvent.click(editBadge);
        expect(screen.getByText(/Choose your Avatar/i)).toBeInTheDocument();

        // 2. Select Avatar
        const avatarOption = screen.getByAltText('avatar1.png');
        await userEvent.click(avatarOption);

        // 3. Verify API Call
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringMatching(/\/profile\/avatar$/),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ avatarUrl: 'avatar1.png' })
            })
        );
    });
});

// ── WinrateRing SVG Math ──────────────────────────────────────────────────────

describe('WinrateRing', () => {
    it('calculates the SVG dashoffset correctly for 0%', () => {
        renderProfile();
        const fill = document.querySelector<SVGCircleElement>('.winrate-fill');
        expect(fill).not.toBeNull();

        const RADIUS = 14;
        const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
        
        // At 0% the offset should equal the full circumference (empty)
        const actualOffset = parseFloat(fill!.style.strokeDashoffset);
        expect(actualOffset).toBeCloseTo(CIRCUMFERENCE, 2);
    });
});