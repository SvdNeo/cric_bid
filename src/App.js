import React, { useState, useEffect ,useRef} from 'react';
import { BrowserRouter as Router, Route, Routes,Link } from 'react-router-dom';
import './App.css';
import PlayerManager from './components/PlayerManager';
import SelectedTeam from './components/SelectedTeam';

import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
const Header = ({ onResetTeams, handleLogout, isAuthenticated }) => {
  return (
    <header>
      <nav>
        <div className="header">
          <h1>Cricbid</h1>
          <ul className="nav-links">
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/selected-team">Selected Team</Link>
                </li>
                <li>
                  <button className='btn-reset' onClick={onResetTeams}>Reset</button>
                </li>
                <li>
                  <button className='btn-reset' onClick={handleLogout}>Logout</button>
                </li>
              </>
            ) : (
              <li>
                <Link to="/login">Login</Link>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
};

const App = () => {
  const teamRef = useRef()
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleResetTeams = () => {
    if (teamRef.current) {
      teamRef.current.resetTeams();
    }
  };
  useEffect(() => {
    // Check the authentication state from local storage
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(isAuth);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Remove the authentication state from local storage
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div>
      <Header onResetTeams={handleResetTeams} isAuthenticated={isAuthenticated} handleLogout={handleLogout} />
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <PlayerManager onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
        
          <Route
            path="/selected-team"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SelectedTeam onLogout={handleLogout} ref={teamRef} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
