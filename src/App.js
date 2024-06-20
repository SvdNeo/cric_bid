import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, Navigate } from 'react-router-dom';
import './App.css';
import PlayerManager from './components/PlayerManager';
import SelectedTeam from './components/SelectedTeam';
import Login from './components/Login';

const Header = ({ isAuthenticated, handleLogout, onResetTeams }) => {
  return (
    <header>
      <nav>
        <div className="header">
          <h1>Cricbid</h1>
          <ul className="nav-links">
            {isAuthenticated && (
              <>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/selected-team">Selected Team</Link>
                </li>
                <li>
                  <button onClick={handleLogout}>Logout</button>
                </li>
                <li>
                  <button onClick={onResetTeams}>Reset Teams</button>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
};

const PrivateRoute = ({ element: Element, isAuthenticated, ...rest }) => {
  return isAuthenticated ? <Element {...rest} /> : <Navigate to="/login" />;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const teamRef = useRef();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  const handleResetTeams = () => {
    if (teamRef.current) {
      teamRef.current.resetTeams();
    }
  };

  return (
    <Router>
      <div>
        <Header isAuthenticated={isAuthenticated} handleLogout={handleLogout} onResetTeams={handleResetTeams} />
        <Routes>
          <Route path="/login" element={<Login handleLogin={handleLogin} />} />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <PlayerManager />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/selected-team"
            element={
              isAuthenticated ? (
                <SelectedTeam ref={teamRef} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
