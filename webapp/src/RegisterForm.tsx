import React, { useState } from 'react';
import './RegisterForm.css';

interface RegisterFormProps {
  onRegisterSuccess: (username: string) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess }) => {
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
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'register' && !email.trim()) {
      setError('Please provide an email address.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const endpoint = mode === 'login' ? '/login' : '/createuser';

      const payload = mode === 'login'
        ? { username, password }
        : { username, email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        onRegisterSuccess(username);
      } else {
        setError(data.error || 'Server error occurred');
      }
    } catch (err) {
      console.error("Authentication request failed:", err);
      setError('Network error.');
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
      <h1 className="game-title-large">GAME Y</h1>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Enter e-mail"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            placeholder={mode === 'login' ? "Enter username" : "Choose a username"}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder={mode === 'login' ? "Enter password" : "Create password"}
            required
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading && 'WAITING...'}
          {!loading && mode === 'login' && 'LOGIN'}
          {!loading && mode === 'register' && 'REGISTER'}
        </button>

        <div className="error-message-container">
          {error && <div className="error-message">{error}</div>}
        </div>

        <div style={{ textAlign: 'center' }}>
          <span
            onClick={toggleMode}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMode();
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'underline',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#aaa'}
            onFocus={(e) => e.currentTarget.style.color = '#fff'}
            onBlur={(e) => e.currentTarget.style.color = '#aaa'}
          >
            {mode === 'login' && "Don't have an account? Register here"}
            {mode === 'register' && "Already have an account? Login here"}
          </span>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;