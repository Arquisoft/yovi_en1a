import React, { useState, useEffect } from 'react';
import './Profile.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchResult = 'win' | 'lose';

interface MatchEntry {
    id: number;
    result: MatchResult;
    pts: number;
    mode: string;
}

interface ProfileProps {
    username?: string;
    userId?: string | null;
    winRate?: number;     // 0–100
    bestScore?: number;
    matchHistory?: MatchEntry[];
    onPlayClick?: () => void;
    onLogout?: () => void;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const DEFAULT_HISTORY: MatchEntry[] = [
    { id: 1, result: 'win',  pts: 340, mode: 'Ranked' },
    { id: 2, result: 'lose', pts: 210, mode: 'Casual' },
    { id: 3, result: 'win',  pts: 480, mode: 'Ranked' },
    { id: 4, result: 'win',  pts: 390, mode: 'Ranked' },
    { id: 5, result: 'lose', pts: 150, mode: 'Casual' },
];

// ── Winrate ring ──────────────────────────────────────────────────────────────

const WinrateRing: React.FC<{ pct: number }> = ({ pct }) => {
    // r=14, stroke-width=4 → half-stroke=2, so circle edge sits at 14+2=16 < 18 (centre), safe within 36x36 viewBox
    const CIRC = 2 * Math.PI * 14; // ≈ 87.96
    const offset = CIRC - (pct / 100) * CIRC;
    return (
        <div className="profile-winrate-row">
            <svg width="clamp(72px, 9vw, 110px)" height="clamp(72px, 9vw, 110px)" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <circle className="winrate-track" cx="18" cy="18" r="14" />
                <circle
                    className="winrate-fill"
                    cx="18" cy="18" r="14"
                    style={{ strokeDasharray: CIRC, strokeDashoffset: offset }}
                />
            </svg>
            <div style={{ textAlign: 'center' }}>
                <span className="winrate-pct">{pct}%</span>
                <span className="winrate-sub">Win rate</span>
            </div>
        </div>
    );
};

// ── Avatar SVG ────────────────────────────────────────────────────────────────

const AvatarIcon: React.FC = () => (
    <svg width="48" height="48" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="16" r="8" stroke="#666" strokeWidth="2" />
        <path d="M4 40c0-9.941 8.059-18 18-18s18 8.059 18 18"
              stroke="#666" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ── API ────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_GAMEY_API_URL ?? 'http://localhost:3001';
function useProfileStats() {
    const [stats, setStats] = useState<{
        winRate: number;
        bestScore: number;
        matchHistory: MatchEntry[];
    } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return { stats, loading };
}

// ── Component ─────────────────────────────────────────────────────────────────

const Profile: React.FC<ProfileProps> = ({ username = 'Username', onPlayClick, onLogout }) => {
    const { stats } = useProfileStats();

    const winRate      = stats?.winRate      ?? 65;   // fallback while loading
    const bestScore    = stats?.bestScore    ?? 0;
    const matchHistory = stats?.matchHistory ?? DEFAULT_HISTORY;
    return (
        <div className="profile-page-container">

            {/* ── Navbar — same as Lobby ── */}
            <nav className="profile-navbar">
                <div className="profile-nav-logo">GAME Y</div>
                <div className="profile-nav-right">
                    <button className="profile-nav-play-btn" onClick={onPlayClick}>
                        Play
                    </button>
                    <button className="profile-nav-logout-btn" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            {/* ── Centered card — mirrors the prototype rectangle ── */}
            <div className="profile-body">
                <div className="profile-card">

                    {/* Avatar + username */}
                    <div className="profile-avatar-block">
                        <div className="profile-avatar-icon">
                            <AvatarIcon />
                        </div>
                        <p className="profile-username-text">{username}</p>
                    </div>

                    {/* Stats | Match History — side by side as in sketch */}
                    <div className="profile-data-row">

                        {/* Stats */}
                        <div className="profile-stats-panel">
                            <p className="profile-panel-label">Stats</p>

                            <WinrateRing pct={winRate} />

                            <div className="profile-score-block">
                                <p className="profile-score-label">Best Score</p>
                                <p className="profile-score-value">{bestScore.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Match History */}
                        <div className="profile-history-panel">
                            <p className="profile-panel-label">Match History</p>

                            <table className="profile-history-table">
                                <thead>
                                <tr>
                                    <th>Win / Lose</th>
                                    <th>Points</th>
                                    <th>Mode</th>
                                </tr>
                                </thead>
                                <tbody>
                                {matchHistory.map((match) => (
                                    <tr key={match.id}>
                                        <td>
                        <span className={`result-badge ${match.result}`}>
                          {match.result === 'win' ? 'Win' : 'Lose'}
                        </span>
                                        </td>
                                        <td><span className="pts-value">{match.pts}</span></td>
                                        <td>{match.mode}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    );

};



export default Profile;