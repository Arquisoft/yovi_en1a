import React from 'react';
import './App.css';
import RegisterForm from './RegisterForm';
import Lobby from './Lobby';
import GameBoard from './GameBoard';

function App() {
  const storedUsername = localStorage.getItem('username');

  const searchParams = new URLSearchParams(globalThis.location.search);
  const isLobbyWindow = searchParams.get('view') === 'lobby';
  const isGameWindow = searchParams.get('view') === 'game';

  React.useEffect(() => {
    if (isLobbyWindow && !storedUsername) {
      globalThis.location.href = globalThis.location.pathname;
    }
  }, [isLobbyWindow, storedUsername]);

  const handleGoToLobby = (username: string) => {
    localStorage.setItem('username', username);
    globalThis.location.href = globalThis.location.pathname + '?view=lobby';
  };

  const handleGoToGame = (mode: string, difficulty: string) => {
    globalThis.location.href = globalThis.location.pathname + `?view=game&mode=${mode}&difficulty=${difficulty}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    globalThis.location.href = globalThis.location.pathname;
  };

  if (isGameWindow) {
    return <GameBoard />;
  }

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
    <RegisterForm onRegisterSuccess={handleGoToLobby} />
  );
}

export default App;