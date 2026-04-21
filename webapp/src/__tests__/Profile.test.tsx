import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Profile from '../Profile';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./Profile.css', () => ({}));

vi.mock('./config/avatars', () => ({
    AVAILABLE_AVATARS: ['default.png', 'avatar1.png', 'avatar2.png'],
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

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Profile – Rendering & Data', () => {
    const apiData = {
        winRate: 85,
        bestScore: 1250,
        matchHistory: [
            { id: 1, result: 'win', pts: 500, mode: 'hvh' }
        ],
        avatarUrl: 'avatar2.png'
    };

    it('shows loading state then displays stats and mapped mode labels', async () => {
        localStorageMock.setItem('token', 'fake-token');
        mockFetch.mockReturnValue(buildFetchResponse(apiData));
        
        renderProfile();

        // Verify loading state appears
        expect(screen.getByText(/loading profile/i)).toBeInTheDocument();

        await waitFor(() => {
            // Check winrate with regex to handle potential formatting/spaces
            expect(screen.getByText(/85\s*%/)).toBeInTheDocument();
            // Check score with regex to handle optional commas
            expect(screen.getByText(/1,?250/)).toBeInTheDocument();
            // Check that the mode 'hvh' was mapped to its label
            expect(screen.getByText('Player vs Player')).toBeInTheDocument();
        });

        // Ensure loading is gone
        expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    });

    it('immediately shows UI if no token is present (not loading)', () => {
        // No token set in localStorage
        renderProfile({ username: 'GuestPlayer' });

        expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
        expect(screen.getByText('GuestPlayer')).toBeInTheDocument();
    });
});

describe('Profile – Avatar Selection', () => {
    it('opens the picker and sends the correct payload to the API', async () => {
        localStorageMock.setItem('token', 'fake-jwt-token');
        
        // Mock 1: Initial load data
        // Mock 2: Success response for the POST update
        mockFetch
            .mockReturnValueOnce(buildFetchResponse({ avatarUrl: 'default.png' })) 
            .mockReturnValueOnce(buildFetchResponse({ ok: true }));
        
        renderProfile();

        // Wait for profile to load
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

        // 1. Click the toggle button (accessible role)
        const toggleBtn = screen.getByRole('button', { name: /change profile picture/i });
        await userEvent.click(toggleBtn);

        // 2. Select an avatar button by its ARIA label
        const targetAvatarBtn = screen.getByRole('button', { name: /select avatar1.png as avatar/i });
        await userEvent.click(targetAvatarBtn);

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
        
        // 4. Verify the picker closed (menu role)
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});

describe('Profile – Navbar Actions', () => {
    it('calls onPlayClick when play button is pressed', async () => {
        const onPlay = vi.fn();
        renderProfile({ onPlayClick: onPlay });

        const playBtn = screen.getByRole('button', { name: /play/i });
        await userEvent.click(playBtn);
        
        expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onLogout when logout button is pressed', async () => {
        const onLogout = vi.fn();
        renderProfile({ onLogout: onLogout });

        const logoutBtn = screen.getByRole('button', { name: /logout/i });
        await userEvent.click(logoutBtn);
        
        expect(onLogout).toHaveBeenCalledTimes(1);
    });
});