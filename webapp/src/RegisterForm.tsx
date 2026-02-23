import React, { useState } from 'react';

const RegisterForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameyStatus, setGameyStatus] = useState<'ok' | 'error' | null>(null);

  const checkGamey = async () => {
    try {
      const GAMEY_URL = import.meta.env.VITE_GAMEY_URL ?? 'http://localhost:4000';
      const res = await fetch(`${GAMEY_URL}/status`);
      setGameyStatus(res.ok ? 'ok' : 'error');
    } catch {
      setGameyStatus('error');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponseMessage(null);
    setError(null);
    setGameyStatus(null);

    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
      const res = await fetch(`${API_URL}/createuser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      const data = await res.json();
      if (res.ok) {
        setResponseMessage(data.message);
        setUsername('');
        checkGamey();
      } else {
        setError(data.error || 'Server error');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <div className="form-group">
        <label htmlFor="username">Whats your name?</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />
      </div>
      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Entering...' : 'Lets go!'}
      </button>

      {responseMessage && (
        <div className="success-message" style={{ marginTop: 12, color: 'green' }}>
          <p>{responseMessage}</p>
          <p style={{ marginTop: 12, color: 'black' }}>
            {gameyStatus === 'ok' && 'Game is ready'}
            {gameyStatus === 'error' && 'Game is not ready'}
          </p>
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginTop: 12, color: 'red' }}>
          {error}
        </div>
      )}
    </form>
  );
};

export default RegisterForm;
