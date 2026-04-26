import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AVATAR } from './config/avatars';
import LanguageSelector from './LanguageSelector';

interface LobbyProps {
  username?: string;
  avatarUrl?: string; 
  onPlay?: (mode: string, difficulty: string, boardSize: number,rule: string) => void;
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
  const { t} = useTranslation();
  // Local state to keep UI in sync with the database
  const [userData, setUserData] = useState({
    username: propUsername || t('guest_user'),
    avatarUrl: propAvatar || DEFAULT_AVATAR
  });

  const [selectedMode, setSelectedMode] = useState('pvp');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [boardSize, setBoardSize] = useState(11);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const toggleHowToPlay = () => setShowHowToPlay(!showHowToPlay);
 // const friends = ["Alice_99", "Bob_Builder", "Charlie_Hex"];
  const [selectedRule, setSelectedRule] = useState('classic');
 
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
          username: data.username || propUsername || t('guest_user'),
          avatarUrl: data.avatarUrl || propAvatar || DEFAULT_AVATAR
        });
      })
      .catch(err => console.error("Lobby sync error:", err));
  }, [propUsername, propAvatar]);

  return (
    <div className="lobby-page-wrapper">
      <nav className="lobby-navbar">
        <div className="nav-logo">GAME Y</div>
       <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LanguageSelector />

  <button className="help-icon-button" onClick={toggleHowToPlay} title={t('title_how_to_play')}>?</button>
  <button className="nav-logout-btn" onClick={onLogout}>{t('nav_logout')}</button>
</div>
      </nav>

      <main className="lobby-main-content">
        <div className="lobby-layout-container">
          {/* Game Configuration Column */}
          <div className="game-setup-column">
            <div className="setup-options-row">
              <div className="white-panel mode-panel">
                <h4 className="panel-title">{t('lbl_select_mode')}</h4>
                <button
                  className={`mode-option-btn ${selectedMode === 'pvp' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('pvp')}
                >{t('btn_pvp')}</button>
                <button
                  className={`mode-option-btn ${selectedMode === 'pvc' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('pvc')}
                >{t('btn_pvc')}</button>
              </div>

              <div className="white-panel difficulty-panel">
                <h4 className="panel-title">{t('lbl_select_difficulty')}</h4>
                {['beginner', 'medium', 'advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    className={`mode-option-btn ${selectedDifficulty === lvl ? 'active' : ''} ${selectedMode === 'pvp' ? 'disabled' : ''}`}
                    onClick={() => selectedMode !== 'pvp' && setSelectedDifficulty(lvl)}
                    disabled={selectedMode === 'pvp'}
                  >{t(`diff_${lvl}`)}</button>
                ))}
              </div>

              <div className="white-panel size-panel">
                <h4 className="panel-title">{t('lbl_board_size')} {boardSize}</h4>
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
           <button className="primary-play-btn" onClick={() => onPlay?.(selectedMode, selectedDifficulty, boardSize, selectedRule)}>
              {t('btn_play')}
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

            {/* <div className="white-panel friends-panel">
              <h4 className="panel-title">{t('lbl_friends')}</h4>
              <div className="friends-scroll-container">
                {friends.map((name) => (
                  <div key={name} className="friend-item">
                    <span className="status-dot online">●</span>
                    <span className="friend-name">{name}</span>
                  </div>
                ))}
              </div>
            </div> */}
            {/* Game rule panel (CLASSIC / WHY NOT)*/}
            <div className="white-panel rule-panel">
              <h4 className="panel-title">{t('lbl_game_rule')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button
                  className={`mode-option-btn ${selectedRule === 'classic' ? 'active' : ''}`}
                  onClick={() => setSelectedRule('classic')}
                >
                  {t('rule_classic')}
                </button>
                <button
                  className={`mode-option-btn ${selectedRule === 'whynot' ? 'active' : ''}`}
                  onClick={() => setSelectedRule('whynot')}
                >
                  {t('rule_whynot_name')}
                </button>

                <button
      className={`mode-option-btn ${selectedRule === 'fortuney' ? 'active' : ''}`}
      onClick={() => setSelectedRule('fortuney')}
    >
      🪙 {t('rule_fortuney')}
    </button>
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
           <h2 className="modal-title">{t('modal_title_how_to_play')}</h2>
<div className="rules-list">
  <h3><span className="step-num">1</span> {t('rule_1_title')}</h3>
  <p>{t('rule_1_desc')}</p>
  
  <h3><span className="step-num">2</span> {t('rule_2_title')}</h3>
  <p>{t('rule_2_desc')}</p>
  
  <h3><span className="step-num">3</span> {t('rule_3_title')}</h3>
  <p>{t('rule_3_desc')}</p>
</div>
<button className="close-modal-btn" onClick={toggleHowToPlay}>{t('btn_got_it')}</button>
          </dialog>
        </div>
      )}
    </div>
  );
};

export default Lobby;