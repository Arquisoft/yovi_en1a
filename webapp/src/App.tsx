import React from 'react';
import './App.css';
import RegisterForm from './RegisterForm';
import Lobby from './Lobby';
import GameBoard from './GameBoard';
import Profile from './Profile';

function App() {
  const storedUsername = localStorage.getItem('username');

  const searchParams = new URLSearchParams(globalThis.location.search);
  const isLobbyWindow = searchParams.get('view') === 'lobby';
  const isGameWindow = searchParams.get('view') === 'game';
  const isProfileWindow = searchParams.get('view') === 'profile';

  React.useEffect(() => {
    if ((isLobbyWindow || isProfileWindow) && !storedUsername) {
      globalThis.location.href = globalThis.location.pathname;
    }
  }, [isLobbyWindow, isProfileWindow, storedUsername]);

  const handleGoToLobby = (username: string) => {
    localStorage.setItem('username', username);
    globalThis.location.href = globalThis.location.pathname + '?view=lobby';
  };

  const handleGoToGame = (mode: string, difficulty: string, boardSize: number = 11) => {
    globalThis.location.href = globalThis.location.pathname + `?view=game&mode=${mode}&difficulty=${difficulty}&size=${boardSize}`;
  };

  const handleGoToProfile = () => {
    globalThis.location.href = globalThis.location.pathname + '?view=profile';
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    globalThis.location.href = globalThis.location.pathname;
  };

  if (isGameWindow) {
    return (
        <GameBoard
            username={storedUsername || "Guest User"}
            onProfile={handleGoToProfile}
            onLobby={() => globalThis.location.href = globalThis.location.pathname + '?view=lobby'}
        />
    );
  }

  if (isProfileWindow && storedUsername) {
    return (
        <Profile
            username={storedUsername}
            onPlayClick={() => globalThis.location.href = globalThis.location.pathname + '?view=lobby'}
            onLogout={handleLogout}
        />
    );
  }

  if (isLobbyWindow && storedUsername) {
    return (
        <div className="App">
          <Lobby
              username={storedUsername}
              onPlay={handleGoToGame}
              onLogout={handleLogout}
              onProfile={handleGoToProfile}
          />
        </div>
    );
  }

  return (
      <RegisterForm onRegisterSuccess={handleGoToLobby} />
  );
}

export default App;