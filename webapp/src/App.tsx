import React from 'react';
import './App.css';
import RegisterForm from './RegisterForm';
import Lobby from './Lobby';

function App() {
  const storedUsername = localStorage.getItem('username');

  const isLobbyWindow = globalThis.location.search === '?view=lobby';

  React.useEffect(() => {
    if (isLobbyWindow && !storedUsername) {
      globalThis.location.href = globalThis.location.pathname;
    }
  }, [isLobbyWindow, storedUsername]);

  const handleGoToLobby = (username: string) => {
    localStorage.setItem('username', username);
    globalThis.location.href = globalThis.location.pathname + '?view=lobby';
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    globalThis.location.href = globalThis.location.pathname;
  };

  if (isLobbyWindow && storedUsername) {
    return (
      <div className="App">
        <Lobby
          username={storedUsername}
          onPlay={(mode) => console.log("Starting:", mode)}
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