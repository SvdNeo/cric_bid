import React from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import './App.css';
const Header = () => {
  return (
    <header>
      <nav>
        <div className="header">
          <h1>Cricbid</h1>
          <ul className="nav-links">
            <li>
              <Link to="/team-management">Team Management</Link>
            </li>
            <li>
              <Link to="/bidding">Bidding</Link>
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

const TeamManagement = () => <div>Team Management Page</div>;
const Bidding = () => <div>Bidding Page</div>;
const SelectedTeam = () => <div>Selected Team Page</div>;

const App = () => {
  return (
    <Router>
      <div>
        <Header />
        <Routes>
          <Route path="/team-management" component={TeamManagement} />
          <Route path="/bidding" component={Bidding} />
          <Route path="/selected-team" component={SelectedTeam} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
