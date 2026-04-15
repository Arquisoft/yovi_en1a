import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Profile from '../Profile';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./Profile.css', () => ({}));

// Mock the external config to ensure predictable avatar lists
vi.mock('./config/avatars', () => ({
    AVAILABLE_AVATARS: ['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png'],
    DEFAULT_AVATAR: 'default.png'
}));

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

// ── Rendering & Defaults ──────────────────────────────────────────────────────

describe('Profile – UI & Defaults', () => {
    it('renders basic navbar and panel labels', () => {
        renderProfile();
        expect(screen.getByText('GAME Y')).toBeInTheDocument();
        expect(screen.getByText('Stats')).toBeInTheDocument();
        expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    it('shows default 0% winrate and 0 score when no data exists', () => {
        renderProfile();
        expect(screen.getByText('0%')).toBeInTheDocument();
        const scoreValue = document.querySelector('.profile-score-value');
        expect(scoreValue?.textContent).toBe('0');
    });
});

// ── API Fetching ──────────────────────────────────────────────────────────────

describe('Profile – API Data', () => {
    const apiData = {
        winRate: 85,
        bestScore: 1250,
        matchHistory: [
            { id: 1, result: 'win', pts: 500, mode: 'hvh' }
        ],
        avatarUrl: 'avatar2.png'
    };

    it('fetches and displays stats and mapped mode labels', async () => {
        localStorageMock.setItem('token', 'fake-token');
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        
        renderProfile();

        await waitFor(() => {
            // Match "85%" (allowing for potential spaces between number and symbol)
            expect(screen.getByText(/85\s*%/)).toBeInTheDocument();
            
            // Match "1250" with an optional comma: "1,250" or "1250"
            expect(screen.getByText(/1,?250/)).toBeInTheDocument();
            
            // Verify the mode mapping logic works
            expect(screen.getByText('Player vs Player')).toBeInTheDocument();
        });
        
        const img = screen.getByAltText('Profile') as HTMLImageElement;
        expect(img.src).toContain('avatar2.png');
    });
});

// ── Avatar Selection ──────────────────────────────────────────────────────────

describe('Profile – Avatar Selection', () => {
    it('opens the picker and sends the correct payload to the API', async () => {
        localStorageMock.setItem('token', 'fake-jwt-token');
        
        // Mock 1: Initial Profile Load
        // Mock 2: Avatar Update Success
        mockFetch
            .mockReturnValueOnce(buildFetchResponse({})) 
            .mockReturnValueOnce(buildFetchResponse({ ok: true }));
        
        renderProfile();

        // 1. Click the avatar container to open the picker
        const avatarContainer = screen.getByAltText('Profile').parentElement;
        await userEvent.click(avatarContainer!);

        // 2. Select an avatar from the options
        const options = screen.getAllByAltText('Option');
        const targetAvatar = options.find(img => img.getAttribute('src') === '/avatar1.png');
        
        expect(targetAvatar).toBeDefined();
        await userEvent.click(targetAvatar!);

        // 3. Verify the API call format
        await waitFor(() => {
            expect(mockFetch).toHaveBeenLastCalledWith(
                expect.stringMatching(/\/profile\/avatar$/),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ avatarUrl: 'avatar1.png' }),
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer fake-jwt-token',
                        'Content-Type': 'application/json'
                    })
                })
            );
        });
        
        // 4. Verify the picker closed
        expect(screen.queryByAltText('Option')).not.toBeInTheDocument();
    });
});

// ── Winrate SVG Math ──────────────────────────────────────────────────────────

describe('WinrateRing', () => {
    it('calculates stroke-dashoffset for 0% correctly', () => {
        renderProfile();
        const fill = document.querySelector<SVGCircleElement>('.winrate-fill');
        const CIRC = 2 * Math.PI * 14;
        
        const actualOffset = parseFloat(fill!.style.strokeDashoffset);
        expect(actualOffset).toBeCloseTo(CIRC, 2);
    });
});