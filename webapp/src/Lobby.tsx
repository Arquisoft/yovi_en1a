import React, { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
  username?: string;
  onPlay?: (mode: string) => void;
  onLogout?: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ username = "Guest User", onPlay, onLogout }) => {
  const [selectedMode, setSelectedMode] = useState('pvp');

  const friends = [
    { name: "Alice_99", status: "online" },
    { name: "Bob_Builder", status: "online" },
    { name: "Charlie_Hex", status: "online" }
  ];

  return (
    <div className="lobby-page-wrapper">
      {/* GLOBAL NAVBAR: Spans 100% width at the top */}
      <nav className="lobby-navbar">
        <div className="nav-logo">GAME Y</div>
        <button className="nav-logout-btn" onClick={onLogout}>Logout</button>
      </nav>

      {/* CENTERED CONTENT AREA */}
      <main className="lobby-main-content">
        <div className="lobby-layout-container">
          
          {/* LEFT: Mode Selection & Play */}
          <div className="game-setup-column">
            <div className="white-panel selection-panel">
              <h4 className="panel-title">SELECT MODE:</h4>
              <div className="mode-options">
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
            </div>
            
            <button className="primary-play-btn" onClick={() => onPlay?.(selectedMode)}>
              PLAY
            </button>
          </div>

          {/* RIGHT: User & Friends */}
          <aside className="social-sidebar-column">
            <div className="white-panel user-profile-panel">
              <div className="profile-icon">👤</div>
              <strong className="profile-name">{username}</strong>
            </div>

            <div className="white-panel friends-panel">
              <h4 className="panel-title">FRIENDS</h4>
              <ul className="friends-list-ui">
                {friends.map(f => (
                  <li key={f.name} className="friend-item">
                    <span className="online-status-dot"></span>
                    {f.name}
                  </li>
                ))}
              </ul>
              <button className="text-link-btn">Friend list →</button>
            </div>
          </aside>
          
        </div>
      </main>
    </div>
  );
};

export default Lobby;