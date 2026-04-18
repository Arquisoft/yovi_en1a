import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, 
    i18n: { 
      changeLanguage: vi.fn(), 
      language: 'en' 
    },
  }),
}));

// ─── Mock child components ────────────────────────────────────────────────────

vi.mock('../RegisterForm', () => ({
    default: ({ onRegisterSuccess }: { onRegisterSuccess: () => void }) => (
        <div data-testid="register-form">
            <button onClick={onRegisterSuccess}>Mock Register Submit</button>
        </div>
    ),
}));

vi.mock('../LoginForm', () => ({
    default: ({ onLoginSuccess }: { onLoginSuccess: () => void }) => (
        <div data-testid="login-form">
            <button onClick={onLoginSuccess}>Mock Login Submit</button>
        </div>
    ),
}));

vi.mock('../Lobby', () => ({
    default: ({
                  username,
                  onPlay,
                  onLogout,
              }: {
        username: string;
        onPlay: () => void;
        onLogout: () => void;
    }) => (
        <div data-testid="lobby">
            <span data-testid="lobby-username">{username}</span>
            <button onClick={onPlay}>Mock Play</button>
            <button onClick={onLogout}>Mock Logout</button>
        </div>
    ),
}));

vi.mock('../GameBoard', () => ({
    default: () => <div data-testid="game-board">Mock GameBoard</div>,
}));

vi.mock('../assets/react.svg', () => ({ default: 'react.svg' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setSearch(search: string) {
    Object.defineProperty(globalThis, 'location', {
        value: {
            search,
            pathname: '/',
            href: '/',
        },
        writable: true,
        configurable: true,
    });
}

function setHref(href: string) {
    Object.defineProperty(globalThis, 'location', {
        value: {
            search: new URL(href, 'http://localhost').search,
            pathname: new URL(href, 'http://localhost').pathname,
            href,
        },
        writable: true,
        configurable: true,
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('App — game view (?view=game)', () => {
    beforeEach(() => {
        localStorage.clear();
        setSearch('?view=game');
    });

    it('renders GameBoard directly without any wrapper', () => {
        render(<App />);
        expect(screen.getByTestId('game-board')).toBeInTheDocument();
    });

    it('does not render the home page content', () => {
        render(<App />);
        expect(screen.queryByText(/Welcome to the Software Architecture/i)).not.toBeInTheDocument();
    });

    it('does not render the Lobby', () => {
        render(<App />);
        expect(screen.queryByTestId('lobby')).not.toBeInTheDocument();
    });
});

describe('App — lobby view (?view=lobby) with logged-in user', () => {
    beforeEach(() => {
        localStorage.setItem('username', 'testuser');
        setSearch('?view=lobby');
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('renders the Lobby component', () => {
        render(<App />);
        expect(screen.getByTestId('lobby')).toBeInTheDocument();
    });

    it('passes the stored username to Lobby', () => {
        render(<App />);
        expect(screen.getByTestId('lobby-username').textContent).toBe('testuser');
    });

    it('does not render home page content', () => {
        render(<App />);
        expect(screen.queryByText(/Welcome to the Software Architecture/i)).not.toBeInTheDocument();
    });

    it('navigates to game when onPlay is triggered from Lobby', () => {
        render(<App />);
        const hrefSpy = vi.spyOn(globalThis.location, 'href', 'set').mockImplementation(() => {});
        fireEvent.click(screen.getByRole('button', { name: /Mock Play/i }));
        expect(hrefSpy).toHaveBeenCalledWith(expect.stringContaining('?view=game'));
    });

    it('clears username and redirects home when Logout is triggered', () => {
        render(<App />);
        const hrefSpy = vi.spyOn(globalThis.location, 'href', 'set').mockImplementation(() => {});
        fireEvent.click(screen.getByRole('button', { name: /Mock Logout/i }));
        expect(localStorage.getItem('username')).toBeNull();
        expect(hrefSpy).toHaveBeenCalledWith('/');
    });
});

describe('App — lobby view (?view=lobby) without logged-in user (security redirect)', () => {
    beforeEach(() => {
        localStorage.clear();
        setHref('http://localhost/?view=lobby');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('redirects to home when accessing lobby without a session', async () => {
        const hrefSpy = vi.spyOn(globalThis.location, 'href', 'set').mockImplementation(() => {});
        render(<App />);
        await waitFor(() => {
            expect(hrefSpy).toHaveBeenCalledWith('/');
        });
    });

    it('does not render the Lobby component when not logged in', () => {
        vi.spyOn(globalThis.location, 'href', 'set').mockImplementation(() => {});
        render(<App />);
        expect(screen.queryByTestId('lobby')).not.toBeInTheDocument();
    });
});