import React from 'react';
import './App.css';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import Lobby from './Lobby';
import GameBoard from './GameBoard';
import reactLogo from './assets/react.svg';

function App() {
  const [mode, setMode] = React.useState<'register' | 'login'>('login');

  // 1. Check for the user in storage
  const storedUsername = localStorage.getItem('username');
  
  // 2. Determine if they are trying to see the lobby
  const isLobbyWindow = globalThis.location.search === '?view=lobby';
  const isGameWindow = globalThis.location.search === '?view=game';

  // 3. SECURITY CHECK: 
  // If they want the lobby but aren't logged in, send them home immediately.
  React.useEffect(() => {
    if (isLobbyWindow && !storedUsername) {
      globalThis.location.href = globalThis.location.pathname;
    }
  }, [isLobbyWindow, storedUsername]);

  const handleGoToLobby = () => {
    globalThis.location.href = globalThis.location.pathname + '?view=lobby';
  };

  const handleGoToGame = () => {
    globalThis.location.href = globalThis.location.pathname + '?view=game';
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    globalThis.location.href = globalThis.location.pathname;
  };

  if (isGameWindow) {
    return <GameBoard />;
  }

  // 4. Only show the Lobby if the URL is right AND we have a user
  if (isLobbyWindow && storedUsername) {
    return (
      <div className="App">
        <Lobby 
          username={storedUsername} 
          onPlay={handleGoToGame} 
          onLogout={handleLogout} 
        />
      </div>
    );
  }

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h2>Welcome to the Software Architecture 2025-2026 course</h2>

      <div style={{ margin: '20px 0', padding: '15px', border: '2px dashed #00E5FF', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>
        <button 
          onClick={handleGoToGame} 
          style={{ padding: '10px 20px', backgroundColor: '#FF0055', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
         GO TO GAME (TEST)
        </button>
      </div>

      <div className="form-switch">
        <button onClick={() => setMode('register')} disabled={mode === 'register'}>Register</button>
        <button onClick={() => setMode('login')} disabled={mode === 'login'}>Login</button>
      </div>

      <main style={{ marginTop: '20px' }}>
        {mode === 'register' ? (
          <RegisterForm onRegisterSuccess={handleGoToLobby} />
        ) : (
          <LoginForm onLoginSuccess={handleGoToLobby} />
        )}
      </main>
    </div>
  );
}

export default App;