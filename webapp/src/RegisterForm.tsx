import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './RegisterForm.css';
import LanguageSelector from './LanguageSelector';


interface RegisterFormProps {
  onRegisterSuccess: (username: string) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess }) => {
  const { t} = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // States for the forms
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError(t('err_required'));
      return;
    }

    if (mode === 'register' && !email.trim()) {
      setError(t('err_email'));
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const endpoint = mode === 'login' ? '/login' : '/createuser';

      const payload = mode === 'login'
        ? { usernameOrEmail: username, password }
        : { username, email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        onRegisterSuccess(data.username || username);
      } else {
       setError(data.error || t('err_server'));
      }
    } catch (err) {
      console.error("Authentication request failed:", err);
     setError(t('err_network'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setUsername('');
    setPassword('');
    setEmail('');
    setError(null);
  };
  

  return (
    <div className="start-page-container">
   
   <LanguageSelector />
      <h1 className="game-title-large">GAME Y</h1>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="email">{t('lbl_email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder={t('ph_email')}
            />
          </div>
        )}

        <div className="form-group">
         <label htmlFor="username">{mode === 'login' ? t('lbl_username_or_email') : t('lbl_username')}</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            placeholder={mode === 'login' ? t('ph_username_or_email') : t('ph_choose_username')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('lbl_password')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder={mode === 'login' ? t('ph_password') : t('ph_create_password')}
            required
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading && t('btn_waiting')}
          {!loading && mode === 'login' && t('btn_login')}
          {!loading && mode === 'register' && t('btn_register')}
        </button>

        <div className="error-message-container">
          {error && <div className="error-message">{error}</div>}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={toggleMode}
            className="mode-toggle-link"
          >
            {mode === 'login' ? t('link_register') : t('link_login')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;