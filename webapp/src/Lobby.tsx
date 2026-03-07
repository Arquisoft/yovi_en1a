import React, { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
  username?: string;
  onPlay?: (mode: string) => void;
  onLogout?: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ username = "Guest User", onPlay, onLogout }) => {
  const [selectedMode, setSelectedMode] = useState('pvp');
  const friends = ["Alice_99", "Bob_Builder", "Charlie_Hex"];

  return (
    <div className="lobby-page-wrapper">
      <nav className="lobby-navbar">
        <div className="nav-logo">GAME Y</div>
        <button className="nav-logout-btn" onClick={onLogout}>Logout</button>
      </nav>

      <main className="lobby-main-content">
        <div className="lobby-layout-container">
          <div className="game-setup-column">
            <div className="white-panel">
              <h4 className="panel-title">SELECT MODE:</h4>
              <button 
                className={`mode-option-btn ${selectedMode === 'pvp' ? 'active' : ''}`}
                onClick={() => setSelectedMode('pvp')}
              >PLAYER VS. PLAYER</button>
              <button 
                className={`mode-option-btn ${selectedMode === 'easy' ? 'active' : ''}`}
                onClick={() => setSelectedMode('easy')}
              >VS. COMPUTER: EASY</button>
              <button 
                className={`mode-option-btn ${selectedMode === 'diff' ? 'active' : ''}`}
                onClick={() => setSelectedMode('diff')}
              >VS. COMPUTER: DIFFICULT</button>
            </div>
            <button className="primary-play-btn" onClick={() => onPlay?.(selectedMode)}>
              PLAY
            </button>
          </div>

          <aside className="social-sidebar-column">
            <button className="white-panel user-profile-button" onClick={() => console.log("Profile clicked")}>
              <div className="profile-info-container">
                <div className="profile-avatar">👤</div>
                <span className="profile-username">{username}</span>
              </div>
            </button>

            {/* Friends Panel */}
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
    </div>
  );
};

export default Lobby;