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
    winRate?: number;
    bestScore?: number;
    matchHistory?: MatchEntry[];
    onPlayClick?: () => void;
    onLogout?: () => void;
}

// ── Constants & Configuration ──────────────────────────────────────────────────

/**
 * SCALABLE MODE CONFIGURATION
 * To add a new mode in the future, just add it to this object.
 */
const MODE_MAP: Record<string, string> = {
    'hvh': 'Player vs Player',
    'hvb': 'Player vs Bot',
    // 'tourney': 'Tournament', <--- Example for future expansion
    // 'blitz': 'Blitz'
};

const getModeLabel = (mode: string) => {
    const key = mode?.toLowerCase();
    return MODE_MAP[key] || mode; // Returns mapped label or raw string if not found
};

const API_URL = import.meta.env.VITE_GAMEY_API_URL || 'http://localhost:3001';

// ── Winrate Ring Component ─────────────────────────────────────────────────────

const WinrateRing: React.FC<{ pct: number }> = ({ pct }) => {
    const CIRC = 2 * Math.PI * 14; 
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

// ── API Hook ───────────────────────────────────────────────────────────────────

function useProfileStats() {
    const [stats, setStats] = useState<{
        winRate: number;
        bestScore: number;
        matchHistory: MatchEntry[];
        avatarUrl: string;
    } | null>(null);

    const [loading, setLoading] = useState(true);

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

// ── Main Component ─────────────────────────────────────────────────────────────

const Profile: React.FC<ProfileProps> = ({ username = 'Username', onPlayClick, onLogout }) => {
    const { stats } = useProfileStats();
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

    const winRate      = stats?.winRate      ?? 0;
    const bestScore    = stats?.bestScore    ?? 0;
    const matchHistory = stats?.matchHistory ?? [];

    return (
        <div className="profile-page-container">
            <nav className="profile-navbar">
                <div className="profile-nav-logo">GAME Y</div>
                <div className="profile-nav-right">
                    <button className="profile-nav-play-btn" onClick={onPlayClick}>Play</button>
                    <button className="profile-nav-logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </nav>

            <div className="profile-body">
                <div className="profile-card">
                    <div className="profile-avatar-block">
                        <div className="profile-avatar-container" onClick={() => setIsPickerOpen(!isPickerOpen)}>
                            <img 
                                src={`/${currentAvatar}`} 
                                alt="Profile" 
                                className="profile-avatar-img" 
                            />
                            <div className="avatar-edit-badge">✎</div>
                        </div>

                        {isPickerOpen && (
                            <div className="avatar-picker-dropdown">
                                {AVAILABLE_AVATARS.map(file => (
                                    <img 
                                        key={file}
                                        src={`/${file}`}
                                        className={`avatar-option ${currentAvatar === file ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();   
                                            e.stopPropagation();  
                                            handleAvatarChange(file);
                                        }}
                                        alt="Option"
                                    />
                                ))}
                            </div>
                        )}
                        <p className="profile-username-text">{username}</p>
                    </div>

                    <div className="profile-data-row">
                        <div className="profile-stats-panel">
                            <p className="profile-panel-label">Stats</p>
                            <WinrateRing pct={winRate} />
                            <div className="profile-score-block">
                                <p className="profile-score-label">Best Score</p>
                                <p className="profile-score-value">{bestScore.toLocaleString()}</p>
                            </div>
                        </div>

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
                                {matchHistory.map((match, idx) => (
                                    <tr key={match.id || idx}>
                                        <td>
                                            <span className={`result-badge ${match.result}`}>
                                                {match.result === 'win' ? 'Win' : 'Lose'}
                                            </span>
                                        </td>
                                        <td><span className="pts-value">{match.pts}</span></td>
                                        {/* Uses the scalable configuration map */}
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