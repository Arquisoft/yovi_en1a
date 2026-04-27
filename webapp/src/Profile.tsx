import React, { useState, useEffect } from 'react';
import './Profile.css';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_AVATARS, DEFAULT_AVATAR } from './config/avatars';

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchResult = 'win' | 'lose';

interface MatchEntry {
    id: number;
    result: MatchResult;
    pts: number;
    mode: string;
    rule: string;
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
const getModeLabel = (t: any, mode: string) => {
    const key = mode?.toLowerCase();
    if (key === 'hvh') return t('mode_pvp');
    if (key === 'hvb') return t('mode_pvc_short'); 
    return mode;
};

const getRuleLabel = (t: any, rule: string) => {
    const key = rule?.toLowerCase();
    if (key === 'whynot') return t('rule_whynot');
    return t('rule_classic'); // Default to Classic
};

const API_URL = import.meta.env.VITE_GAMEY_API_URL || 'http://localhost:3001';

// ── Winrate Ring Component ─────────────────────────────────────────────────────

const WinrateRing: React.FC<{ pct: number, label: string }> = ({ pct, label }) => {
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
                <span className="winrate-sub">{label}</span>
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
    const { t } = useTranslation();
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
        return <div className="profile-loading-state">{t('msg_loading_profile')}</div>;
    }

    const winRate      = stats?.winRate      ?? 0;
    const bestScore    = stats?.bestScore    ?? 0;
    const matchHistory = stats?.matchHistory ?? [];

    return (
        <div className="profile-page-container">
            <nav className="profile-navbar">
                <div className="profile-nav-logo">GAME Y</div>
                <div className="profile-nav-right">
                    <button className="profile-nav-play-btn" onClick={onPlayClick} type="button">{t('nav_play')}</button>
                    <button className="profile-nav-logout-btn" onClick={onLogout} type="button">{t('nav_logout')}</button>
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
                                alt={t('alt_user_avatar')}
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
                                        aria-label={t('aria_select_avatar', { file })}
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
                            <h2 className="profile-panel-label">{t('lbl_stats')}</h2>
                            <WinrateRing pct={winRate} label={t('lbl_win_rate')} />
                            <div className="profile-score-block">
                                <p className="profile-score-label">{t('lbl_best_score')}</p>
                                <p className="profile-score-value">{bestScore.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="profile-history-panel">
                            <h2 className="profile-panel-label">{t('lbl_match_history')}</h2>
                            <table className="profile-history-table">
                                <thead>
                                    <tr>
                                        <th scope="col">{t('th_win_lose')}</th>
                                        <th scope="col">{t('th_points')}</th>
                                        <th scope="col">{t('th_mode')}</th>
                                        <th scope="col">{t('th_rule')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {matchHistory.map((match, idx) => (
                                    <tr key={match.id || idx}>
                                        <td>
                                            <span className={`result-badge ${match.result}`}>
                                                {match.result === 'win' ? t('badge_win') : t('badge_lose')}
                                            </span>
                                        </td>
                                        <td><span className="pts-value">{match.pts}</span></td>
                                        <td>{getModeLabel(t, match.mode)}</td>
                                        <td>{getRuleLabel(t, match.rule)}</td> {/* Added Data Cell */}
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