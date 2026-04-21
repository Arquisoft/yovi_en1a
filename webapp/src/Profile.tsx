import React, { useState, useEffect } from 'react';
import './Profile.css';
import { AVAILABLE_AVATARS, DEFAULT_AVATAR } from './config/avatars';

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
    bestScore?: number;
    matchHistory?: MatchEntry[];
    onPlayClick?: () => void;
    onLogout?: () => void;
}

// ── Constants & Configuration ──────────────────────────────────────────────────

const MODE_MAP: Record<string, string> = {
    'hvh': 'Player vs Player',
    'hvb': 'Player vs Bot',
};

const getModeLabel = (mode: string) => {
    const key = mode?.toLowerCase();
    return MODE_MAP[key] || mode;
};

const API_URL = import.meta.env.VITE_GAMEY_API_URL || 'http://localhost:3001';

// ── Winrate Ring Component ─────────────────────────────────────────────────────

const WinrateRing: React.FC<{ pct: number }> = ({ pct }) => {
    const CIRC = 2 * Math.PI * 14; 
    const offset = CIRC - (pct / 100) * CIRC;
    return (
        <div className="profile-winrate-row">
            <svg width="clamp(72px, 9vw, 110px)" height="clamp(72px, 9vw, 110px)" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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

// ── API Hook ───────────────────────────────────────────────────────────────────

function useProfileStats() {
    // 1. Check for token immediately to set the initial loading state
    const [stats, setStats] = useState<{
        winRate: number;
        bestScore: number;
        matchHistory: MatchEntry[];
        avatarUrl: string;
    } | null>(null);

    // If there's no token, we aren't "loading" anything from the API
    const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

    useEffect(() => {
        const token = localStorage.getItem('token');
        
        // 2. If no token, we've already set loading to false via the initializer
        if (!token) return;

        let isMounted = true; // Cleanup flag to prevent state updates on unmounted component

        fetch(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (isMounted) setStats(data);
            })
            .catch(console.error)
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    return { stats, loading };
}

// ── Main Component ─────────────────────────────────────────────────────────────

const Profile: React.FC<ProfileProps> = ({ username = 'Username', onPlayClick, onLogout }) => {
    const { stats, loading } = useProfileStats();
    const [localSelectedAvatar, setLocalSelectedAvatar] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const currentAvatar = localSelectedAvatar || stats?.avatarUrl || DEFAULT_AVATAR;

    const handleAvatarChange = async (filename: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/profile/avatar`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ avatarUrl: filename })
            });
            if (res.ok) {
                setLocalSelectedAvatar(filename);
                setIsPickerOpen(false);
            }
        } catch (err) {
            console.error("Failed to update avatar", err);
        }
    };

    if (loading) {
        return <div className="profile-loading-state">Loading Profile...</div>;
    }

    const winRate      = stats?.winRate      ?? 0;
    const bestScore    = stats?.bestScore    ?? 0;
    const matchHistory = stats?.matchHistory ?? [];

    return (
        <div className="profile-page-container">
            <nav className="profile-navbar">
                <div className="profile-nav-logo">GAME Y</div>
                <div className="profile-nav-right">
                    <button className="profile-nav-play-btn" onClick={onPlayClick} type="button">Play</button>
                    <button className="profile-nav-logout-btn" onClick={onLogout} type="button">Logout</button>
                </div>
            </nav>

            <div className="profile-body">
                <div className="profile-card">
                    <div className="profile-avatar-block">
                        <button 
                            className="profile-avatar-container" 
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                            aria-label="Change profile picture"
                            type="button"
                        >
                            <img 
                                src={`/${currentAvatar}`} 
                                alt="User avatar" 
                                className="profile-avatar-img" 
                            />
                            <div className="avatar-edit-badge" aria-hidden="true">✎</div>
                        </button>

                        {isPickerOpen && (
                            <div className="avatar-picker-dropdown" role="menu">
                                {AVAILABLE_AVATARS.map(file => (
                                    <button 
                                        key={file}
                                        type="button"
                                        className={`avatar-option-btn ${currentAvatar === file ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault(); 
                                            e.stopPropagation();
                                            handleAvatarChange(file);
                                        }}
                                        aria-label={`Select ${file} as avatar`}
                                    >
                                        <img 
                                            src={`/${file}`}
                                            className="avatar-option-img"
                                            alt=""
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="profile-username-text">{username}</p>
                    </div>

                    <div className="profile-data-row">
                        <div className="profile-stats-panel">
                            <h2 className="profile-panel-label">Stats</h2>
                            <WinrateRing pct={winRate} />
                            <div className="profile-score-block">
                                <p className="profile-score-label">Best Score</p>
                                <p className="profile-score-value">{bestScore.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="profile-history-panel">
                            <h2 className="profile-panel-label">Match History</h2>
                            <table className="profile-history-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Win / Lose</th>
                                        <th scope="col">Points</th>
                                        <th scope="col">Mode</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {matchHistory.map((match, idx) => (
                                    <tr key={match.id || idx}>
                                        <td>
                                            <span className={`result-badge ${match.result}`}>
                                                {match.result === 'win' ? 'Win' : 'Lose'}
                                            </span>
                                        </td>
                                        <td><span className="pts-value">{match.pts}</span></td>
                                        <td>{getModeLabel(match.mode)}</td>
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