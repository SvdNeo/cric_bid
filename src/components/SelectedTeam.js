import React, { useEffect, useState } from "react";
import { db } from "../firebase_config";
import { collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import "./SelectedTeam.css";

const SelectedTeam = () => {
  const [initialTeams, setInitialTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [grades, setGrades] = useState({});
  const [initialPlayers, setInitialPlayers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [bidPrice, setBidPrice] = useState(100);
  const [currentBiddingTeamIndex, setCurrentBiddingTeamIndex] = useState(0);
  const [biddingStartTeamIndex, setBiddingStartTeamIndex] = useState(0);
  const [error, setError] = useState("");
  const [currentHighestBiddingTeamIndex, setCurrentHighestBiddingTeamIndex] = useState(null);
  const [currentHighestBidPrice, setCurrentHighestBidPrice] = useState(0);

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

      const gradesSnapshot = await getDocs(collection(db, "grade"));
      const gradesList = {};
      gradesSnapshot.forEach(doc => {
        const gradeData = doc.data();
        gradesList[gradeData.name] = { price: gradeData.price };
      });

      const playersSnapshot = await getDocs(collection(db, "players"));
      const playersList = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Count players for each team
      const playerCounts = teamsList.reduce((acc, team) => {
        acc[team.id] = playersList.filter(player => player.teamId === team.id).length;
        return acc;
      }, {});

      // Add player counts to teams
      const updatedTeamsList = teamsList.map(team => ({
        ...team,
        playerCount: playerCounts[team.id] || 0,
      }));

      setInitialTeams(updatedTeamsList);
      setTeams(updatedTeamsList);
      setGrades(gradesList);
      setInitialPlayers(playersList);
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
    return initialPlayers
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
    return initialPlayers
      .filter((player) => player.grade === grade)
      .map((player) => (
        <li
          key={player.id}
          style={{
            color: player.status === "new" ? "black" : player.status === "sold" ? "blue" : "red"
          }}
        >
          {player.name}
        </li>
      ));
  };

  const handleBidSubmit = async (tempTeams) => {
    if (selectedPlayer && bidPrice) {
      setCurrentHighestBiddingTeamIndex(currentBiddingTeamIndex);
      setCurrentHighestBidPrice(bidPrice);
      const remainingTeams = tempTeams.filter((team) => team.balance >= bidPrice);

      if (remainingTeams.length === 1) {
        const winningTeam = remainingTeams[0];
        const updatedPlayer = {
          ...selectedPlayer,
          price: bidPrice,
          teamId: winningTeam.id,
          status: "sold",
        };

        const playerDoc = doc(db, "players", selectedPlayer.id);
        await updateDoc(playerDoc, updatedPlayer);

        const updatedTeam = {
          ...winningTeam,
          balance: winningTeam.balance - bidPrice,
        };

        const teamDoc = doc(db, "teams", winningTeam.id);
        await updateDoc(teamDoc, updatedTeam);

        setPlayers((prevPlayers) =>
          prevPlayers.map((player) =>
            player.id === selectedPlayer.id ? updatedPlayer : player
          )
        );

        setTeams((prevTeams) =>
          prevTeams.map((team) =>
            team.id === winningTeam.id ? updatedTeam : team
          )
        );

        resetBid();
      } else {
        setCurrentBiddingTeamIndex((prevIndex) => (prevIndex + 1) % remainingTeams.length);
        setBidPrice(currentHighestBidPrice + 100); // Set the next bid price
      }
    } else {
      setError("Please select all required fields.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleBidPass = () => {
    const newTeams = teams.filter((_, index) => index !== currentBiddingTeamIndex);
    setTeams([...newTeams]);
    if (currentHighestBiddingTeamIndex === null && newTeams.length === 0) {
      console.log("Player unsold");
      resetBid();
      return;
    }
    if (newTeams.length === 1 && currentHighestBiddingTeamIndex !== null) {
      handleBidSubmit(newTeams);
    } else {
      const nextTeamIndex = currentBiddingTeamIndex % newTeams.length;
      if (nextTeamIndex === currentHighestBiddingTeamIndex) {
        handleBidSubmit(newTeams);
      } else {
        setCurrentBiddingTeamIndex(nextTeamIndex);
        setBidPrice(currentHighestBidPrice + 100); // Update bid price on pass
      }
    }
  };

  const handleBidStart = () => {
    const availablePlayers = players.filter(player => player.status !== "sold");
    setTeams(initialTeams);
    if (availablePlayers.length === 0) {
      setError("No players available for bidding.");
      return;
    }
    const randomPlayerIndex = Math.floor(Math.random() * availablePlayers.length);
    const player = availablePlayers[randomPlayerIndex];
    setSelectedPlayer(player);
    const initialPrice = grades[player.grade]?.price || 100;
    setBidPrice(initialPrice);
    setCurrentHighestBidPrice(initialPrice - 100); // Set it lower initially to allow the first increment
    setCurrentBiddingTeamIndex(biddingStartTeamIndex);
  };

  const resetBid = () => {
    const newPlayers = players.filter((player) => player.id !== selectedPlayer.id);
    setPlayers(newPlayers);
    setTeams(initialTeams);
    setSelectedPlayer(null);
    setBidPrice(100);
    setBiddingStartTeamIndex((biddingStartTeamIndex + 1) % initialTeams.length);
    setCurrentBiddingTeamIndex((biddingStartTeamIndex + 1) % initialTeams.length);
    setCurrentHighestBidPrice(0);
    setCurrentHighestBiddingTeamIndex(null);
  };

  const gradeOrder = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <div className="selected-team-container">
      {error && <div className="error-popup">{error}</div>}

      {/* Bidding Area */}
      <div className="bidding-area">
        <h2 className="bidding-title">Bidding Area</h2>
        <div className="bidding-form">
          {selectedPlayer && (
            <>
              <h2>{selectedPlayer.name}</h2>
              <p>Grade: {selectedPlayer.grade}</p>
              <p>Base Price: {grades[selectedPlayer.grade]?.price}</p>
            </>
          )}
         <div>
  <label>Bid Price: </label>
  <select
    value={bidPrice}
    onChange={(e) => setBidPrice(Number(e.target.value))}
    style={{ width: "75px" }}
  >
    {(() => {
      const currentTeam = teams[currentBiddingTeamIndex];
      if (!currentTeam) return null; // Ensure current team exists

      const playerCount = currentTeam.playerCount || 0;
      const maxBidPrice = currentTeam.balance - 100 * (6 - playerCount);
      const startingBidPrice = currentHighestBidPrice + 100;

      const options = [];
      for (let price = startingBidPrice; price <= maxBidPrice; price += 100) {
        options.push(
          <option key={price} value={price}>
            {price}
          </option>
        );
      }

      return options;
    })()}
  </select>
</div>

          <div>
            <label>Current Bidding Team: </label>
            <input
              type="text"
              id="current-team"
              className="small-input"
              value={teams[currentBiddingTeamIndex]?.teamname || ""}
              readOnly
            />
          </div>
          <button onClick={handleBidStart}>Start Bid</button>
          <button onClick={() => handleBidSubmit(teams)} disabled={!selectedPlayer}>Submit Bid</button>
          <button onClick={handleBidPass} disabled={!selectedPlayer}>Pass</button>
        </div>
      </div>

      {/* Teams Section */}
      <div className="teams-container">
        <div className="reset">
          <h2>Teams</h2>
          <button className="btn-reset" onClick={resetTeams}>Reset</button>
        </div>
        <div className="teams">
          {initialTeams.map((team) => (
            <div className="team" key={team.id}>
              <h3 style={{ textAlign: "center" }}>{team.teamname}</h3>
              <div className="budget">
                <p>Budget: {team.budget}</p>
                <p>Balance: {team.balance}</p>
                <p>Players: {team.playerCount}</p>
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
