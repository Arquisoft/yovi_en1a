import React from 'react';
import './App.css';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import Lobby from './Lobby';
import reactLogo from './assets/react.svg';

function App() {
  const [mode, setMode] = React.useState<'register' | 'login'>('register');

  // Logic to detect if we should be showing the Lobby "window"
  // This looks for "?view=lobby" in the URL
  const isLobbyWindow = window.location.search === '?view=lobby';

  const handleGoToLobby = () => {
    // This changes the URL to /?view=lobby and reloads the app into the Lobby view
    window.location.href = window.location.pathname + '?view=lobby';
  };

  const handleGoHome = () => {
    // This removes the parameter and takes us back to the login/register screen
    window.location.href = window.location.pathname;
  };

  // --- LOBBY VIEW in App.tsx ---
  if (isLobbyWindow) {
    return (
      <div className="App" style={{ backgroundColor: '#242424', minHeight: '100vh' }}>
        {/* Remove the button from here entirely */}
        <Lobby 
          username="Guest User" 
          onPlay={(selectedMode) => console.log("Starting game mode:", selectedMode)} 
          onLogout={handleGoHome} // Pass the logout function to Lobby
        />
      </div>
    );
  }

  // --- MAIN WINDOW VIEW (Login / Register) ---
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

      <div className="form-switch">
        <button 
          onClick={() => setMode('register')} 
          disabled={mode === 'register'}
        >
          Register
        </button>
        <button 
          onClick={() => setMode('login')} 
          disabled={mode === 'login'}
        >
          Login
        </button>
        <button 
          onClick={handleGoToLobby} 
          style={{ backgroundColor: '#646cff', color: 'white' }}
        >
          Lobby
        </button>
      </div>

      <main style={{ marginTop: '20px' }}>
        {mode === 'register' ? <RegisterForm /> : <LoginForm />}
      </main>
    </div>
  );
}

export default App;