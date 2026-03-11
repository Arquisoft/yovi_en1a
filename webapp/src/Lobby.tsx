import React, { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
  username?: string;
  onPlay?: (mode: string) => void;
  onLogout?: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ username = "Guest User", onPlay, onLogout }) => {
  const [selectedMode, setSelectedMode] = useState('pvp');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
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
                <button 
                  className={`mode-option-btn ${selectedDifficulty === 'beginner' ? 'active' : ''} ${selectedMode === 'pvp' ? 'disabled' : ''}`}
                  onClick={() => selectedMode !== 'pvp' && setSelectedDifficulty('beginner')}
                  disabled={selectedMode === 'pvp'}
                >BEGINNER</button>
                <button 
                  className={`mode-option-btn ${selectedDifficulty === 'medium' ? 'active' : ''} ${selectedMode === 'pvp' ? 'disabled' : ''}`}
                  onClick={() => selectedMode !== 'pvp' && setSelectedDifficulty('medium')}
                  disabled={selectedMode === 'pvp'}
                >MEDIUM</button>
                <button 
                  className={`mode-option-btn ${selectedDifficulty === 'advanced' ? 'active' : ''} ${selectedMode === 'pvp' ? 'disabled' : ''}`}
                  onClick={() => selectedMode !== 'pvp' && setSelectedDifficulty('advanced')}
                  disabled={selectedMode === 'pvp'}
                >ADVANCED</button>
              </div>
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