import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'tr', label: 'Türkçe' }
  ];

  return (
    <div className="language-menu-container">
      <button type="button" onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="language-toggle-btn">
        <span>{t('lbl_language')}</span> 
        <span className="language-toggle-icon">{isLangMenuOpen ? '▲' : '▼'}</span>
      </button>
      {isLangMenuOpen && (
        <div className="language-dropdown-menu">
          {languages.map((lang) => (
            <div key={lang.code} role="button" tabIndex={0}
              onClick={() => { i18n.changeLanguage(lang.code); setIsLangMenuOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { i18n.changeLanguage(lang.code); setIsLangMenuOpen(false); } }}
              className={`language-option ${i18n.language === lang.code ? 'active-lang' : ''}`}>
              {lang.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default LanguageSelector;