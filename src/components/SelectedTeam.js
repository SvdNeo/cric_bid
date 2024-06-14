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
  const [selectedPlayersForDeletion, setSelectedPlayersForDeletion] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log("Fetching teams data...");
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(teamsList);
      console.log("Teams fetched:", teamsList);

      console.log("Fetching grades data...");
      const gradesSnapshot = await getDocs(collection(db, "grade"));
      const gradesList = {};
      gradesSnapshot.forEach(doc => {
        gradesList[doc.data().name] = doc.data().price;
      });
      setGrades(gradesList);
      console.log("Grades fetched:", gradesList);

      console.log("Fetching players data...");
      const playersSnapshot = await getDocs(collection(db, "players"));
      const playersList = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayers(playersList);
      console.log("Players fetched:", playersList);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
    }
  };
 
  const fetchTeams = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched teams:", teams); // Log fetched teams for verification
      return teams;
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };
  
  // Then use fetchTeams in resetTeams

  const resetTeams = async () => {
    debugger;
    const batch = writeBatch(db);
    const teams = await fetchTeams(); // Fetch teams
  
    try {
      teams.forEach((team) => {
        if (team && team.id) {
          const teamRef = doc(db, "teams", team.id);
          console.log("Updating team ID:", team.id); // Log team ID for debugging
          console.log("Team reference path:", teamRef.path); // Log document path for debugging
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
      console.error("Error resetting teams and players:", error);
      setError("Failed to reset teams and players. Please try again.");
    }
  };
  
  const handlePlayerDelete = async (playerId, teamId, playerBidPrice) => {
    try {
      const playerRef = doc(db, "players", playerId);
      await updateDoc(playerRef, { status: "new", teamId: "" });

      setPlayers(players.map(player =>
        player.id === playerId ? { ...player, status: "new", teamId: "" } : player
      ));

      const team = teams.find((team) => team.id === teamId);
      if (team) {
        const updatedTeam = {
          ...team,
          balance: team.balance + playerBidPrice,
        };

        const teamDoc = doc(db, "teams", teamId);
        await updateDoc(teamDoc, updatedTeam);

        setTeams((prevTeams) =>
          prevTeams.map((t) => (t.id === teamId ? updatedTeam : t))
        );
      }
    } catch (error) {
      console.error("Error deleting player:", error);
      setError("Failed to delete player. Please try again.");
    }
  };

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayersForDeletion((prevSelected) => ({
      ...prevSelected,
      [playerId]: !prevSelected[playerId],
    }));
  };

  const handlePlayersDelete = async () => {
    const batch = writeBatch(db);

    try {
      for (const playerId of Object.keys(selectedPlayersForDeletion)) {
        if (selectedPlayersForDeletion[playerId]) {
          const playerRef = doc(db, "players", playerId);
          batch.update(playerRef, { status: "new", teamId: "" });

          const player = players.find((p) => p.id === playerId);
          const team = teams.find((t) => t.id === player.teamId);
          if (team) {
            const updatedTeam = {
              ...team,
              balance: team.balance + player.price,
            };
            const teamDoc = doc(db, "teams", team.id);
            batch.update(teamDoc, updatedTeam);
          }
        }
      }

      await batch.commit();
      fetchData();
      setSelectedPlayersForDeletion({});
    } catch (error) {
      console.error("Error deleting players:", error);
      setError("Failed to delete players. Please try again.");
    }
  };

  const renderPlayers = (teamId) => {
    return players
      .filter((player) => player.teamId === teamId)
      .sort((a, b) => a.grade.localeCompare(b.grade))
      .map((player) => (
        <tr key={player.id}>
          <td>
            <input
              type="checkbox"
              checked={selectedPlayersForDeletion[player.id] || false}
              onChange={() => togglePlayerSelection(player.id)}
            />
          </td>
          <td>{player.name}</td>
          <td>{player.grade}</td>
          <td>{player.price}</td>
          <td>
            <button onClick={() => handlePlayerDelete(player.id, teamId, player.price)}>Delete</button>
          </td>
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
      setBidPrice(grades[player.grade] || 100);
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
      setSelectedTeamId("");
      setBidPrice(100);
      setStatus("");
    }
  };

  const gradesList = [
    { grade: "A", points: 700 },
    { grade: "B", points: 600 },
    { grade: "C", points: 500 },
    { grade: "D", points: 400 },
    { grade: "E", points: 300 },
    { grade: "F", points: 200 },
    { grade: "G", points: 100 },
  ];

  return (
    <div className="selected-team-container">
      {error && <div className="error-popup">{error}</div>}
      <div className="reset-button-container"></div>
     
      <div className="teams-container">
        <div className="reset">
          <h2>Teams</h2>
          <button onClick={resetTeams}>Reset Teams</button>
        </div>
        {teams.map((team) => (
          <div className="team" key={team.id}>
            <h3>{team.teamname}</h3>
            <div className="budget">
              <p>Budget: {team.budget}</p>
              <p>Balance: {team.balance}</p>
            </div>
            <table border="1">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th>Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>{renderPlayers(team.id)}</tbody>
            </table>
          </div>
        ))}
        <button onClick={handlePlayersDelete}>Delete Selected Players</button>
      </div>
      <div className="bidding-area">
        <h2>Bidding Area</h2>
        {selectedPlayer && (
          <div>
            <h2>{selectedPlayer.name}</h2>
            <p>Grade: {selectedPlayer.grade}</p>
            <p>Base Price: ${grades[selectedPlayer.grade]}</p>
            <div>
              <label>Bid Price: </label>
              <select
                value={bidPrice}
                onChange={(e) => setBidPrice(Number(e.target.value))}
              >
                {[...Array(49)].map((_, i) => {
                  const price = (i + 1) * 100;
                  return (
                    price >= (grades[selectedPlayer.grade] || 100) && (
                      <option key={i} value={price}>
                        {price}
                      </option>
                    )
                  );
                })}
              </select>
            </div>
            <div>
              <label>Team: </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamname}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Status: </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Select a new value</option>
                <option value="sold">Sold</option>
                <option value="unsold">Unsold</option>
              </select>
            </div>
            <button onClick={handleBidSubmit}>Submit Bid</button>
          </div>
        )}
      </div>
      <div className="grades-container">
        {gradesList.map(({ grade, points }) => (
          <div className="grade-section" key={grade}>
            <h3>Grade {grade}</h3>
            <p>Points: {points}</p>
            <ul>{renderPlayersByGrade(grade)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectedTeam;
