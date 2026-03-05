import React from 'react';
import './App.css'
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import reactLogo from './assets/react.svg'

function App() {
  const [mode, setMode] = React.useState<'register' | 'login'>('register');

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

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>

      <div className="form-switch">
        <button onClick={() => setMode('register')} disabled={mode === 'register'}>
          Registrierung
        </button>
        <button onClick={() => setMode('login')} disabled={mode === 'login'}>
          Login
        </button>
      </div>

      {mode === 'register' ? <RegisterForm /> : <LoginForm />}
    </div>
  );
}

export default App;
