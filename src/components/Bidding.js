import React, { useEffect, useState } from "react";
import { db } from "../firebase_config";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import './Bidding.css';

const BiddingPage = () => {
  const [players, setPlayers] = useState([]);
  const [grades, setGrades] = useState({});
  const [teams, setTeams] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [bidPrice, setBidPrice] = useState(0);
  const [status, setStatus] = useState("unsold");
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [timer, setTimer] = useState(15);
  const [biddingActive, setBiddingActive] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      const playersSnapshot = await getDocs(collection(db, "players"));
      const playersList = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersList);
    };

    const fetchGrades = async () => {
      const gradesSnapshot = await getDocs(collection(db, "grade"));
      const gradesList = {};
      gradesSnapshot.forEach(doc => {
        gradesList[doc.data().name] = doc.data().price;
      });
      setGrades(gradesList);
    };

    const fetchTeams = async () => {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, teamname: doc.data().teamname, bidding: true }));
        setTeams(teamsList);
      };
  
      fetchPlayers();
      fetchGrades();
      fetchTeams();
    }, []);
  
    useEffect(() => {
      let countdown;
      if (biddingActive) {
        countdown = setInterval(() => {
          setTimer(prevTimer => {
            if (prevTimer <= 1) {
              clearInterval(countdown);
              handleSkipBid();
            }
            return prevTimer - 1;
          });
        }, 1000);
      }
  
      return () => clearInterval(countdown);
    }, [biddingActive]);
  
    const handlePlayerClick = (player) => {
      setSelectedPlayer(player);
      const playerBasePrice = grades[player.grade] || 0;
      setBidPrice(playerBasePrice);
      setStatus(player.status || 'new');
      setTimer(15);
      setBiddingActive(false); // Ensure bidding is not active when selecting a player
      setCurrentTeamIndex(0);
      teams.forEach(team => team.bidding = true);
      setTeams([...teams]);
      clearTimeout(timeoutId);
    };
  
    const handleStartBid = () => {
      setTimer(15);
      setBiddingActive(true);
    };
  
    const handleBidSubmit = async () => {
      if (selectedPlayer) {
        const playerRef = doc(db, "players", selectedPlayer.id);
        await updateDoc(playerRef, {
          bidPrice,
          status,
          teamName: teams[currentTeamIndex].teamname
        });
        setBiddingActive(false);
      }
    };
  
    const handleBidIncrement = () => {
      if (biddingActive && bidPrice + 100 <= 5000) {
        setBidPrice(bidPrice + 100);
        setCurrentTeamIndex(getNextTeamIndex(currentTeamIndex));
        setTimer(15);
      }
    };
  
    const handleSkipBid = () => {
      teams[currentTeamIndex].bidding = false;
      setTeams([...teams]);
      const nextTeamIndex = getNextTeamIndex(currentTeamIndex);
      if (nextTeamIndex === currentTeamIndex) {
        setStatus("unsold");
        handleBidSubmit();
      } else {
        setCurrentTeamIndex(nextTeamIndex);
        setTimer(15);
      }
    };
  
    const getNextTeamIndex = (currentIndex) => {
      let nextIndex = (currentIndex + 1) % teams.length;
      while (!teams[nextIndex].bidding) {
        nextIndex = (nextIndex + 1) % teams.length;
        if (nextIndex === currentIndex) break; // Avoid infinite loop
      }
      return nextIndex;
    };
  
    return (
      <div className="bidding-page">
        <div className="left-panel">
          <button onClick={handleStartBid} disabled={!selectedPlayer || biddingActive}>
            Start Bid
          </button>
          {selectedPlayer && (
            <div>
              <h2>{selectedPlayer.name}</h2>
              <p>Grade: {selectedPlayer.grade}</p>
              <p>Base Price: ${grades[selectedPlayer.grade]}</p>
              <p>
                Bid Price: 
                <input 
                  type="number" 
                  value={bidPrice} 
                  readOnly 
                />
              </p>
              <p>Current Team: {teams[currentTeamIndex].teamname}</p>
              <button onClick={handleBidIncrement} disabled={!biddingActive}>Increment Bid</button>
              <button onClick={handleSkipBid} disabled={!biddingActive}>Skip</button>
              <p>
                Status: 
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={!biddingActive}
                >
                  <option value="">Select a status</option>
                  <option value="sold">Sold</option>
                  <option value="unsold">Unsold</option>
                </select>
              </p>
              <button onClick={handleBidSubmit} disabled={!biddingActive}>Submit Bid</button>
              <div>Time left: {timer} seconds</div>
            </div>
          )}
        </div>
        <div className="right-panel">
          <h2>Players List</h2>
          <ul>
            {players.map(player => (
              <li key={player.id} onClick={() => handlePlayerClick(player)}>
                {player.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  
  export default BiddingPage;
  