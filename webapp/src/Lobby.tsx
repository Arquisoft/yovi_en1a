import React, { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
  username?: string;
  onPlay?: (mode: string, difficulty: string, boardSize: number) => void;
  onLogout?: () => void;
  onProfile?: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ username = "Guest User", onPlay, onLogout, onProfile }) => {
  const [selectedMode, setSelectedMode] = useState('pvp');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [boardSize, setBoardSize] = useState(11);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const toggleHowToPlay = () => setShowHowToPlay(!showHowToPlay);
  const friends = ["Alice_99", "Bob_Builder", "Charlie_Hex"];

  return (
      <div className="lobby-page-wrapper">
        <nav className="lobby-navbar">
          <div className="nav-logo">GAME Y</div>
          
          <div className="nav-actions">
            <button className="help-icon-button" onClick={toggleHowToPlay} title="How to Play">
                ?
            </button>
            <button className="nav-logout-btn" onClick={onLogout}>Logout</button>
          </div>
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

            <aside className="social-sidebar-column">
              {/* Clicking the profile card navigates to UserProfile */}
              <button className="white-panel user-profile-button" onClick={onProfile}>
                <div className="profile-info-container">
                  <div className="profile-avatar">👤</div>
                  <span className="profile-username">{username}</span>
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
         {/* Modal structure for Game Y rules */}
        {showHowToPlay && (
            <div className="how-to-play-overlay" onClick={toggleHowToPlay}>
                <div className="how-to-play-content" onClick={(e) => e.stopPropagation()}>
                    <h2 className="modal-title">HOW TO PLAY: GAME Y</h2>
                    
                    <div className="rules-list">
                      <h3><span className="step-num">1</span> Objective</h3>
                      <p>Connect all three sides of the triangular board with a continuous chain of your stones.</p>
                      <h3><span className="step-num">2</span> Modes & Difficulty</h3>
                      <p>Choose "Player vs. Player" for a local match, or "Player vs. Computer" to challenge the AI. You can adjust the AI's level from Beginner to Advanced.</p>
                      
                      <h3><span className="step-num">3</span> Board & Corners</h3>
                      <p>The game is played on a triangular grid. The corner cells act as part of both adjacent sides.</p>
                      
                      <h3><span className="step-num">4</span> Turns</h3>
                      <p>Players take turns placing one stone of their color on any empty space on the board.</p>
                      
                      <h3><span className="step-num">5</span> Placement & Undo</h3>
                      <p>Stones connect by sharing adjacent edges. You can use the Undo button to take back your last move if you make a mistake.</p>
                      
                      <h3><span className="step-num">6</span> Winning</h3>
                      <p>The first player to form a path connecting all three sides wins. Mathematically, this game can never end in a draw!</p>
                    </div>

                    <button className="close-modal-btn" onClick={toggleHowToPlay}>
                        Got it!
                    </button>
                </div>
            </div>
        )}
      </div>
  );
};

export default Lobby;