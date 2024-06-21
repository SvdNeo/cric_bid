import React, {  useRef } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import './App.css';
import PlayerManager from './components/PlayerManager';
import SelectedTeam from './components/SelectedTeam';


const Header = ({  onResetTeams }) => {
  return (
    <header>
      <nav>
        <div className="header">
          <h1>Cricbid</h1>
          <ul className="nav-links">
           
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
              </>
            
          </ul>
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
        <Header   onResetTeams={handleResetTeams} />
        <Routes>
         
          <Route
            path="/"
            element={
              
                <PlayerManager />
             
            }
          />
          <Route
            path="/selected-team"
            element={
               
                <SelectedTeam ref={teamRef} />
             
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
