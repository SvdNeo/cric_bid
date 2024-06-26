import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import './App.css';
import PlayerManager from './components/PlayerManager';
import SelectedTeam from './components/SelectedTeam';
import Login from './components/Login';
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { logout } from "./components/firebase/auth";
import { db, auth } from './components/firebase/firebase_config';
import { query, collection, getDocs, where } from "firebase/firestore";

const Header = ({ onResetTeams }) => {
  const [user, loading, error] = useAuthState(auth);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  // const fetchUserName = async () => {
  //   if (!user) return;
  //   try {
  //     const q = query(collection(db, "users"), where("uid", "==", user.uid));
  //     const querySnapshot = await getDocs(q);
  //     if (!querySnapshot.empty) {
  //       const userDoc = querySnapshot.docs[0];
  //       setName(userDoc.data().name);
  //     } else {
  //       console.error("No matching documents found.");
  //       alert("No matching user data found.");
  //     }
  //   } catch (err) {
  //     console.error("Error fetching user data:", err);
  //     alert("An error occurred while fetching user data.");
  //   }
  // };

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

  const handleResetTeams = () => {
    if (teamRef.current) {
      teamRef.current.resetTeams();
    }
  };

  return (
    <Router>
      <div>
        <Header onResetTeams={handleResetTeams} />
        <Routes>
          <Route exact path="/" element={<Login />} />
          <Route path="/playerManager" element={<PlayerManager />} />
          <Route path="/selected-team" element={<SelectedTeam ref={teamRef} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
