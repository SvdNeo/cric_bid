import React, { useEffect, useState } from "react";
import { db } from "../firebase_config";
import { collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import "./SelectedTeam.css";

const SelectedTeam = () => {
  const [teams, setTeams] = useState([]);
  const [grades, setGrades] = useState({});
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [bidPrice, setBidPrice] = useState(100);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(teamsList);

      const gradesSnapshot = await getDocs(collection(db, "grade"));
      const gradesList = {};
      gradesSnapshot.forEach(doc => {
        const gradeData = doc.data();
        gradesList[gradeData.name] = { price: gradeData.price };
      });
      setGrades(gradesList);

      const playersSnapshot = await getDocs(collection(db, "players"));
      const playersList = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayers(playersList);
    } catch (error) {
      setError("Failed to fetch data. Please try again.");
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return teams;
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const resetTeams = async () => {
    const batch = writeBatch(db);
    const teams = await fetchTeams();
    try {
      teams.forEach((team) => {
        if (team && team.id) {
          const teamRef = doc(db, "teams", team.id);
          batch.update(teamRef, { balance: 10000 });
        } else {
          throw new Error(`Invalid team data: ${JSON.stringify(team)}`);
        }
      });

      const playersSnapshot = await getDocs(collection(db, "players"));
      playersSnapshot.forEach((doc) => {
        const playerRef = doc.ref;
        batch.update(playerRef, { status: "new", teamId: "" });
      });

      await batch.commit();
      fetchData();
    } catch (error) {
      setError("Failed to reset teams and players. Please try again.");
    }
  };

  

  

  const renderPlayers = (teamId) => {
    return players
      .filter((player) => player.teamId === teamId)
      .sort((a, b) => a.grade.localeCompare(b.grade))
      .map((player) => (
        <tr key={player.id}>
          <td>{player.name}</td>
          <td>{player.grade}</td>
        </tr>
      ));
  };

  const renderPlayersByGrade = (grade) => {
    return players
      .filter((player) => player.grade === grade)
      .map((player) => (
        <li
          key={player.id}
          style={{
            color: player.status === "new" ? "black" : player.status === "sold" ? "blue" : "red"
          }}
          onClick={() => handlePlayerClick(player)}
        >
          {player.name}
        </li>
      ));
  };

  const handlePlayerClick = (player) => {
    if (player.status === "sold") {
      setError("Player is already sold.");
      setTimeout(() => setError(""), 3000);
    } else {
      setSelectedPlayer(player);
      setBidPrice(grades[player.grade]?.price || 100);
      setStatus("");
    }
  };

  const handleBidSubmit = async () => {
    if (selectedPlayer && bidPrice && status) {
      const updatedPlayer = {
        ...selectedPlayer,
        price: bidPrice,
        teamId: status === "sold" ? selectedTeamId : "",
        status: status,
      };

      const playerDoc = doc(db, "players", selectedPlayer.id);
      await updateDoc(playerDoc, updatedPlayer);

      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === selectedPlayer.id ? updatedPlayer : player
        )
      );

      if (status === "sold" && selectedTeamId) {
        const team = teams.find((team) => team.id === selectedTeamId);
        if (team) {
          const updatedTeam = {
            ...team,
            balance: team.balance - bidPrice,
          };

          const teamDoc = doc(db, "teams", selectedTeamId);
          await updateDoc(teamDoc, updatedTeam);

          setTeams((prevTeams) =>
            prevTeams.map((t) => (t.id === selectedTeamId ? updatedTeam : t))
          );
        }
      }

      setSelectedPlayer(null);
      setBidPrice(100);
      setSelectedTeamId("");
      setStatus("");
    } else {
      setError("Please select all required fields.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const gradeOrder = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <div className="selected-team-container">
      {error && <div className="error-popup">{error}</div>}

      {/* Bidding Area */}
      <div className="bidding-area">
        <h2 className="bidding-title">Bidding Area</h2>
        {selectedPlayer && (
          <div className="bidding-form">
            <h2>{selectedPlayer.name}</h2>
            <p>Grade: {selectedPlayer.grade}</p>
            <p>Base Price: ${grades[selectedPlayer.grade]?.price}</p>
            <div >
              <label>Bid Price: </label>
              <select style={{width:"75px"}}
                value={bidPrice}
                onChange={(e) => setBidPrice(Number(e.target.value))}
              >
                {[...Array(49)].map((_, i) => {
                  const price = (i + 1) * 100;
                  return (
                    price >= (grades[selectedPlayer.grade]?.price || 100) && (
                      <option key={i} value={price}>
                        {price}
                      </option>
                    )
                  );
                })}
              </select>
            </div>
            <div>
              <label>Current Bidding Team: </label>
              <input type="text" id="current-team"  className="small-input" />
            </div>
            
            <button onClick={handleBidSubmit}>Submit Bid</button>
            <button >Pass</button>
          </div>
        )}
      </div>

      {/* Teams Section */}
      <div className="teams-container">
      <div className="reset">
          <h2>Teams</h2>
          <button className="btn-reset" onClick={resetTeams}>Reset </button>
        </div> 
      <div className="teams">
        
        {teams.map((team) => (
          <div className="team" key={team.id}>
            
            <h3 style={{textAlign:"center"}}>{team.teamname}</h3>
            <div className="budget">
              <p>Budget: {team.budget}</p>
              <p>Balance: {team.balance}</p>
            </div>
            <table border="1">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>{renderPlayers(team.id)}</tbody>
            </table>
          </div>
        ))}
        
      </div>
      </div>

      {/* Grades Section */}
      <div className="grades-container">
        {gradeOrder
          .filter(grade => grades[grade]) // Ensure only existing grades are rendered
          .map(grade => (
          <div className="grade-section" key={grade}>
            <h3>Grade {grade} ({grades[grade].price})</h3>
            <ul>{renderPlayersByGrade(grade)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectedTeam;
