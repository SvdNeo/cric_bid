// App.js
import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import './App.css';
import PlayerManager from './components/PlayerManager';
import SelectedTeam from './components/SelectedTeam';
import Login from './components/Login';
import TeamManagement from './components/TeamManagement';
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { logout } from "./components/firebase/auth";
import { db, auth } from './components/firebase/firebase_config';
import { query, collection, getDocs, where } from "firebase/firestore";

const Header = ({ onResetTeams }) => {
  const [user, loading, error] = useAuthState(auth);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  return (
    <header>
      <nav>
        <div className="header">
          <h1>Cricbid</h1>
          {user && (
            <ul className="nav-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/selected-team">Selected Team</Link>
              </li>
              <li>
                <Link to="/team-management">Team Management</Link>
              </li>
              <li>
                <button className='btn-reset' onClick={onResetTeams}>Reset</button>
              </li>
              <li>
                <button onClick={logout}>Logout</button>
              </li>
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
};

const App = () => {
  const teamRef = useRef();
  const playerManagerRef = useRef();

  const handleResetTeams = () => {
    if (teamRef.current) {
      teamRef.current.resetTeams();
    }
    if (playerManagerRef.current) {
      playerManagerRef.current.handleResetPlayers();
    }
  };

  return (
    <Router>
      <div>
        <Header onResetTeams={handleResetTeams} />
        <Routes>
          <Route exact path="/" element={<Login />} />
          <Route path="/playerManager" element={<PlayerManager ref={playerManagerRef} />} />
          <Route path="/selected-team" element={<SelectedTeam ref={teamRef} />} />
          <Route path="/team-management" element={<TeamManagement />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
