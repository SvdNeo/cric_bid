import React from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import './App.css';
import PlayerManager from './components/PlayerManager';
import SelectedTeam from './components/SelectedTeam';



const Header = () => {
  return (
    <header>
      <nav>
        <div className="header">
          <h1>Cricbid</h1>
          
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
          
            <li>
              <Link to="/selected-team">Selected Team</Link>
            </li>
            
          </ul>
        </div>
      </nav>
    </header>
  );
};




const App = () => {
  return (
    <Router>
      <div>
        <Header />
        <Routes>
          <Route path='/' element={<PlayerManager/>} />
         
          
          <Route path="/selected-team" element={<SelectedTeam/>} />
         
        </Routes>
      </div>
    </Router>
  );
};

export default App;
