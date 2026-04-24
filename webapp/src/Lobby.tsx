import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AVATAR } from './config/avatars';
import LanguageSelector from './LanguageSelector';
import { soundService, type SoundSettings, AVAILABLE_PACKS } from './SoundService';

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

  // Sound Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SoundSettings>(soundService.settings);
  const handleSettingChange = (updates: Partial<SoundSettings>) => {
    soundService.updateSettings(updates);
    setSettings({ ...soundService.settings });
  };
 
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
  <button className="help-icon-button" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px'}} onClick={() => setShowSettings(!showSettings)} title="Settings">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
  </button>
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

      {showSettings && (
        <div className="how-to-play-overlay">
          <button onClick={() => setShowSettings(false)} aria-label="Close" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'transparent', border: 'none', cursor: 'default' }} />
          <dialog open className="how-to-play-content" style={{ position: 'relative', zIndex: 1, textAlign: 'left' }}>
            <button onClick={() => setShowSettings(false)} style={{position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer'}} title="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="modal-title">SETTINGS</h2>
            <div className="rules-list">
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span className="step-num" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                </span>
                Sound Options
              </h3>
              <label style={{display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0'}}>
                <input type="checkbox" checked={!settings.muteMove} onChange={(e) => handleSettingChange({muteMove: !e.target.checked})} />
                Move Sounds
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0'}}>
                <input type="checkbox" checked={!settings.muteWin} onChange={(e) => handleSettingChange({muteWin: !e.target.checked})} />
                Win Sound
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0'}}>
                <input type="checkbox" checked={!settings.muteLoss} onChange={(e) => handleSettingChange({muteLoss: !e.target.checked})} />
                Loss Sound
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0'}}>
                <input type="checkbox" checked={!settings.muteBGM} onChange={(e) => handleSettingChange({muteBGM: !e.target.checked})} />
                Background Music
              </label>

              <h3 style={{marginTop: 20, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span className="step-num" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </span>
                Soundpack
              </h3>
              <select 
                value={settings.theme} 
                onChange={(e) => handleSettingChange({theme: e.target.value})}
                style={{padding: '5px 10px', fontSize: '1rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', width: '100%'}}
              >
                {AVAILABLE_PACKS.map(pack => (
                  <option key={pack} value={pack}>
                    {pack.charAt(0).toUpperCase() + pack.slice(1)} Pack
                  </option>
                ))}
              </select>
            </div>
            <button className="close-modal-btn" onClick={() => setShowSettings(false)}>Save & Close</button>
          </dialog>
        </div>
      )}
    </div>
  );
};

export default Lobby;