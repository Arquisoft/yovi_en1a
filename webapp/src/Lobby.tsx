import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { DEFAULT_AVATAR } from './config/avatars';

interface LobbyProps {
  username?: string;
  avatarUrl?: string; 
  onPlay?: (mode: string, difficulty: string, boardSize: number) => void;
  onLogout?: () => void;
  onProfile?: () => void;
}

const API_URL = import.meta.env.VITE_GAMEY_API_URL || 'http://localhost:3001';

const Lobby: React.FC<LobbyProps> = ({ 
  username: propUsername, 
  avatarUrl: propAvatar,
  onPlay, 
  onLogout, 
  onProfile 
}) => {
  // Local state to keep UI in sync with the database
  const [userData, setUserData] = useState({
    username: propUsername || "Guest User",
    avatarUrl: propAvatar || DEFAULT_AVATAR
  });

  const [selectedMode, setSelectedMode] = useState('pvp');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [boardSize, setBoardSize] = useState(11);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  
  const toggleHowToPlay = () => setShowHowToPlay(!showHowToPlay);
  const friends = ["Alice_99", "Bob_Builder", "Charlie_Hex"];

  // Sync avatar and username with the server on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setUserData({
          username: data.username || propUsername || "Guest User",
          avatarUrl: data.avatarUrl || propAvatar || DEFAULT_AVATAR
        });
      })
      .catch(err => console.error("Lobby sync error:", err));
  }, [propUsername, propAvatar]);

  return (
    <div className="lobby-page-wrapper">
      <nav className="lobby-navbar">
        <div className="nav-logo">GAME Y</div>
        <div className="nav-actions">
          <button className="help-icon-button" onClick={toggleHowToPlay} title="How to Play">?</button>
          <button className="nav-logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <main className="lobby-main-content">
        <div className="lobby-layout-container">
          {/* Game Configuration Column */}
          <div className="game-setup-column">
            <div className="setup-options-row">
              <div className="white-panel mode-panel">
                <h4 className="panel-title">SELECT MODE:</h4>
                <button
                  className={`mode-option-btn ${selectedMode === 'pvp' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('pvp')}
                >PLAYER VS. PLAYER</button>
                <button
                  className={`mode-option-btn ${selectedMode === 'pvc' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('pvc')}
                >PLAYER VS. COMPUTER</button>
              </div>

              <div className="white-panel difficulty-panel">
                <h4 className="panel-title">SELECT DIFFICULTY:</h4>
                {['beginner', 'medium', 'advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    className={`mode-option-btn ${selectedDifficulty === lvl ? 'active' : ''} ${selectedMode === 'pvp' ? 'disabled' : ''}`}
                    onClick={() => selectedMode !== 'pvp' && setSelectedDifficulty(lvl)}
                    disabled={selectedMode === 'pvp'}
                  >{lvl.toUpperCase()}</button>
                ))}
              </div>

              <div className="white-panel size-panel">
                <h4 className="panel-title">BOARD SIZE: {boardSize}</h4>
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={boardSize}
                  onChange={(e) => setBoardSize(Number(e.target.value))}
                  className="size-slider"
                  style={{ width: '100%', marginTop: '10px' }}
                />
              </div>
            </div>
            <button className="primary-play-btn" onClick={() => onPlay?.(selectedMode, selectedDifficulty, boardSize)}>
              PLAY
            </button>
          </div>

          {/* Sidebar Column */}
          <aside className="social-sidebar-column">
            <button className="white-panel user-profile-button" onClick={onProfile}>
              <div className="profile-info-container">
                <div className="profile-avatar">
                  <img 
                    src={`/${userData.avatarUrl}`} 
                    alt="User Avatar" 
                    className="lobby-avatar-img" 
                  />
                </div>
                <span className="profile-username">{userData.username}</span>
              </div>
            </button>

            <div className="white-panel friends-panel">
              <h4 className="panel-title">FRIENDS</h4>
              <div className="friends-scroll-container">
                {friends.map((name) => (
                  <div key={name} className="friend-item">
                    <span className="status-dot online">●</span>
                    <span className="friend-name">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="how-to-play-overlay">
          <button className="modal-backdrop-exit" onClick={toggleHowToPlay} />
          <dialog open className="how-to-play-content">
            <h2 className="modal-title">HOW TO PLAY: GAME Y</h2>
            <div className="rules-list">
              <h3><span className="step-num">1</span> Objective</h3>
              <p>Connect all three sides of the triangular board with a continuous chain of your stones.</p>
              <h3><span className="step-num">2</span> Placement</h3>
              <p>Players take turns placing one stone of their color on any empty space.</p>
              <h3><span className="step-num">3</span> Winning</h3>
              <p>The first player to form a path connecting all three sides wins.</p>
            </div>
            <button className="close-modal-btn" onClick={toggleHowToPlay}>Got it!</button>
          </dialog>
        </div>
      )}
    </div>
  );
};

export default Lobby;