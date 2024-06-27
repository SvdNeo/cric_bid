import React, { useEffect, useState,useImperativeHandle,forwardRef } from "react";
import { db } from "../firebase_config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import "./SelectedTeam.css";

const SelectedTeam = forwardRef((props,ref) => {
  const [initialTeams, setInitialTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [grades, setGrades] = useState({});
  const [initialPlayers, setInitialPlayers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [bidPrice, setBidPrice] = useState(null);
  const [currentBiddingTeamIndex, setCurrentBiddingTeamIndex] = useState(0);
  const [biddingStartTeamIndex, setBiddingStartTeamIndex] = useState(0);
  const [error, setError] = useState("");
  const [currentHighestBiddingTeamIndex, setCurrentHighestBiddingTeamIndex] =
    useState(null);
  const [currentHighestBidPrice, setCurrentHighestBidPrice] = useState(null);
  const [initialPrice, setInitialPrice] = useState(0);
  const [popupMessage, setPopupMessage] = useState("");
  const [isBiddingOngoing, setIsBiddingOngoing] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

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
      setInitialTeams(teamsList);
      setTeams(teamsList.filter(team => team.playerCount !== undefined && team.playerCount < 7));

      const gradesSnapshot = await getDocs(collection(db, "grade"));
      const gradesList = {};
      gradesSnapshot.forEach((doc) => {
        const gradeData = doc.data();
        gradesList[gradeData.name] = { price: gradeData.price };
      });
      setGrades(gradesList);

      const playersSnapshot = await getDocs(collection(db, "players"));
      const playersList = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setInitialPlayers(playersList);
      setPlayers(playersList);
    } catch (error) {
      setError("Failed to fetch data. Please try again.");
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teams = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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
          batch.update(teamRef, { balance: 10000, playerCount: 0 });
        } else {
          throw new Error(`Invalid team data: ${JSON.stringify(team)}`);
        }
      });

      const playersSnapshot = await getDocs(collection(db, "players"));
      playersSnapshot.forEach((doc) => {
        const playerRef = doc.ref;
        batch.update(playerRef, {
          status: "new",
          teamId: "",
          teamName: "",
          bidPrice: null,
        });
      });

      await batch.commit();
      fetchData();
    } catch (error) {
      setError("Failed to reset teams and players. Please try again.");
    }
  };

  useImperativeHandle(ref, () => ({
    resetTeams,
    
  }));
  const renderPlayers = (teamId) => {
    return initialPlayers
      .filter((player) => player.teamId === teamId)
      .sort((a, b) => a.grade.localeCompare(b.grade))
      .map((player) => (
        <tr key={player.id} onClick={() => handleDeletePlayer(player)}>
          <td>{player.name}</td>
          <td>{player.grade}</td>
          <td>{player.bidPrice}</td>
        </tr>
      ));
  };
  
  const colorCode = { new: "black", unsold: "red", sold: "blue" };
  const renderPlayersByGrade = (grade) => {
    return initialPlayers
      .filter((player) => player.grade === grade && player.status !== "sold")
      .map((player) => (
        <li
          key={player.id}
          style={{
            color: colorCode[player.status],
            cursor: "pointer", // Add cursor pointer to indicate clickable
          }}
          onDoubleClick={() => handlePlayerDoubleClick(player)}
        >
          {player.name}
        </li>
      ));
  };
  const handleBidSubmit = async (tempTeams) => {
  const currentTeam = tempTeams[currentBiddingTeamIndex];

  if (currentTeam && currentHighestBidPrice && calculateMaxBidPrice(currentTeam, players, grades) < currentHighestBidPrice) {
    setCurrentBiddingTeamIndex((prevIndex) => (prevIndex + 1) % tempTeams.length);
    handleBidPass();
    return;
  }

  if (selectedPlayer && bidPrice) {
    setCurrentHighestBiddingTeamIndex(currentBiddingTeamIndex);
    const remainingTeams = tempTeams.filter(
      (team) => team.balance >= bidPrice
    );

    if (remainingTeams.length === 1) {
      const winningTeam = remainingTeams[0];
      const playersOnWinningTeam = players.filter(
        (player) => player.teamId === winningTeam.id
      );
      if (playersOnWinningTeam.length >= 7) {
        setError("Team already has 7 players. Cannot add more.");
        return;
      }

      const currentBidPrice = currentHighestBidPrice || bidPrice;
      const updatedPlayer = {
        ...selectedPlayer,
        bidPrice: currentBidPrice,
        teamName: winningTeam.teamname,
        teamId: winningTeam.id,
        status: "sold",
      };

      const playerDoc = doc(db, "players", selectedPlayer.id);
      await updateDoc(playerDoc, updatedPlayer);

      const updatedTeam = {
        ...winningTeam,
        balance: winningTeam.balance - currentBidPrice,
        playerCount: winningTeam.playerCount ? winningTeam.playerCount + 1 : 1,
      };

      setInitialTeams(initialTeams.map(initialTeam => {
        if (initialTeam.id === winningTeam.id) {
          initialTeam.playerCount = updatedTeam.playerCount;
          initialTeam.balance = updatedTeam.balance;
        }
        return initialTeam;
      }));

      const teamDoc = doc(db, "teams", winningTeam.id);
      await updateDoc(teamDoc, updatedTeam);

      setPopupMessage(`${winningTeam.teamname} has won the bid for ${selectedPlayer.name} for an Auction Price of ${currentHighestBidPrice || currentBidPrice}`);

      // Clear popup message after 3 seconds
      setTimeout(() => setPopupMessage(""), 3000);

      fetchData();
      resetBid();
    } else {
      setCurrentHighestBidPrice(bidPrice);
      setPopupMessage(`${currentTeam.teamname} has bid ${selectedPlayer.name} for an Auction Price of ${bidPrice}`);

      // Clear popup message after 3 seconds
      setTimeout(() => setPopupMessage(""), 3000);

      setCurrentBiddingTeamIndex(
        (prevIndex) => (prevIndex + 1) % tempTeams.length
      );
    }
  } else {
    setError("Please select all required fields.");
    setTimeout(() => setError(""), 3000);
  }
};

  
  const handleBidPass = async () => {
    const newTeams = teams.filter(
      (_, index) => index !== currentBiddingTeamIndex
    );
    setTeams([...newTeams]);
    if (currentHighestBiddingTeamIndex === null && newTeams.length === 0) {
      console.log("Player unsold");
      if (selectedPlayer) {
        // Update the player's status to "unsold" locally and in the database
        const updatedPlayer = { ...selectedPlayer, status: "unsold" };
        const playerDoc = doc(db, "players", selectedPlayer.id);
        await updateDoc(playerDoc, { status: "unsold" });
  
        // Update local state
        setPlayers(
          players.map((player) =>
            player.id === selectedPlayer.id ? updatedPlayer : player
          )
        );
        setInitialPlayers(
          initialPlayers.map((player) =>
            player.id === selectedPlayer.id ? updatedPlayer : player
          )
        );
        setPopupMessage(`${selectedPlayer.name} is unsold.`);
        
        // Clear popup message after 3 seconds
        setTimeout(() => setPopupMessage(""), 3000);
      }
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
        setPopupMessage(`${teams[currentBiddingTeamIndex].teamname} has passed the bid for ${selectedPlayer.name}`);
  
        // Clear popup message after 3 seconds
        setTimeout(() => setPopupMessage(""), 3000);
  
        setBidPrice(currentHighestBidPrice ? currentHighestBidPrice + 100 : initialPrice); // Update bid price on pass
      }
    }
  };  
  const handlePlayerDoubleClick = (player) => {
    setSelectedPlayer(player);
    const basePrice = grades[player.grade]?.price || 100;
    setInitialPrice(basePrice);
    setBidPrice(basePrice);
    setCurrentBiddingTeamIndex(biddingStartTeamIndex);
    setIsBiddingOngoing(true);
  };
  
  const handleBidStart = () => {
    setIsBiddingOngoing(true);
  
    if (!selectedPlayer) {
      const availablePlayers = players.filter(
        (player) => player.status === "new"
      );
      const unsoldPlayers = players.filter(
        (player) => player.status === "unsold"
      );
  
      if (availablePlayers.length === 0 && unsoldPlayers.length === 0) {
        setError("No players available for bidding.");
        return;
      }
  
      let player;
      // Prioritize players who haven't been bid on
      if (availablePlayers.length === 0 && unsoldPlayers.length > 0) {
        const randomPlayerIndex = Math.floor(Math.random() * unsoldPlayers.length);
        player = unsoldPlayers[randomPlayerIndex];
      } else {
        const randomPlayerIndex = Math.floor(Math.random() * availablePlayers.length);
        player = availablePlayers[randomPlayerIndex];
      }
  
      setSelectedPlayer(player);
      const basePrice = grades[player.grade]?.price || 100;
      setInitialPrice(basePrice);
      setBidPrice(basePrice);
      setCurrentBiddingTeamIndex(biddingStartTeamIndex);
    }
  };
  
  const getTopPlayerForTeam = (team, unbidPlayers, grades) => {
    const teamPlayerCount = team.playerCount || 0;
    const remainingPlayers = 7 - teamPlayerCount;

    // Sort the unbidPlayers array based on the price in descending order to prioritize higher prices
    unbidPlayers.sort((a, b) => grades[b.grade].price - grades[a.grade].price);

    const selectedPlayers = [];
    let remainingBalance = team.balance;
    let start = 0, end = unbidPlayers.length - 1;

    while (start <= end && selectedPlayers.length < remainingPlayers) {
        // Try to pick the most expensive player first
        const playerPrice = grades[unbidPlayers[start].grade].price;
        if (playerPrice <= remainingBalance) {
            // Try removing the most expensive player and check if remaining count is achievable
            const removedPlayer = selectedPlayers.length >= remainingPlayers ? selectedPlayers.shift() : null;
            selectedPlayers.push(unbidPlayers[start]);
            remainingBalance = team.balance - selectedPlayers.reduce((sum, player) => sum + grades[player.grade].price, 0);

            if (removedPlayer) {
                const remainingCount = 7 - (teamPlayerCount + selectedPlayers.length);
                if (remainingCount > 0) {
                    selectedPlayers.unshift(removedPlayer); // Add the removed player back
                    remainingBalance += grades[removedPlayer.grade].price;
                }
            }
            start++;
        } else {
            // If the most expensive player can't be picked, move to the next one
            start++;
        }
    }

    return selectedPlayers;
}

  const calculateMaxBidPrice = (team, players, grades) => {
    // Get the list of unsold and new players
    const unbidPlayers = players.filter(player => player.status === "new" || player.status === "unsold");
  
    // Sort the unbid players by their grade price in descending order
  //   unbidPlayers.sort((a, b) => grades[b.grade].price - grades[a.grade].price);
  // const teamPlayerCount = team.playerCount || 0;
  //   // Calculate the remaining players for the current team
  //   const remainingPlayers = 7 - teamPlayerCount;
  
  //   // Get the top R players
  //  const topPlayers = unbidPlayers.slice(0, remainingPlayers);
  const topPlayers = getTopPlayerForTeam(team, unbidPlayers, grades);
    // Calculate the sum of the top R players' values
    const totalTopValues = topPlayers.reduce((sum, player) => {
      const playerGrade = grades[player.grade];
      return sum + (playerGrade ? playerGrade.price : 0);
    }, 0);
  console.log(totalTopValues);
    // Remove the highest value player from the top players list
    const highestValue = topPlayers[0] ? grades[topPlayers[0].grade].price : 0;
    const remainingTopValues = totalTopValues - highestValue;
  
    // Calculate the maximum bid price for the current team
    const maxBidPrice = team.balance - remainingTopValues;
    console.log(maxBidPrice);
  
    // Handle negative values for maxBidPrice
    return Math.max(maxBidPrice, 0);
  };
  
  
  
  const resetBid = async (winningTeamId = null) => {
    setIsBiddingOngoing(false);
    const newPlayers = players.filter(
      (player) => player.id !== selectedPlayer?.id
    );
    setPlayers(newPlayers);
    setTeams(initialTeams.filter(team => team.playerCount !== undefined && team.playerCount < 7));

    setSelectedPlayer(null);
    setBidPrice(null);
    let currentBidTeamLength = (initialTeams.filter(team => team.playerCount !== undefined && team.playerCount < 7)).length;
    setBiddingStartTeamIndex((biddingStartTeamIndex + 1) % currentBidTeamLength);
    setCurrentBiddingTeamIndex(biddingStartTeamIndex);
    setCurrentHighestBiddingTeamIndex(null);
    setCurrentHighestBidPrice(null);
    await fetchData(); // Ensure data is fetched after reset
   
  };

  const handleDeletePlayer = (player) => {
    setPlayerToDelete(player);
    setShowDeleteConfirmation(true);
  };
  
  const handleConfirmDelete = async () => {
    if (playerToDelete) {
      // Update the player's status to "new" and remove the teamId and teamName
      const updatedPlayer = {
       ...playerToDelete,
        status: "new",
        teamId: "",
        teamName: "",
        bidPrice: null,
      };
  
      // Update the player document in the database
      const playerDoc = doc(db, "players", playerToDelete.id);
      await updateDoc(playerDoc, updatedPlayer);
  
      // Update the team's balance and playerCount
      const teamRef = doc(db, "teams", playerToDelete.teamId);
      const teamSnapshot = await getDoc(teamRef); // Use getDoc instead of getDocs
      const teamData = teamSnapshot.data();
  
      if (teamData) {
        await updateDoc(teamRef, {
          balance: teamData.balance + playerToDelete.bidPrice,
          playerCount: teamData.playerCount - 1,
        });
      }
  
      // Update the local state
      setPlayers(
        players.map((player) =>
          player.id === playerToDelete.id? updatedPlayer : player
        )
      );
      setInitialPlayers(
        initialPlayers.map((player) =>
          player.id === playerToDelete.id? updatedPlayer : player
        )
      );
      setInitialTeams(
        initialTeams.map((team) =>
          team.id === playerToDelete.teamId
           ? {...team, balance: teamData.balance + playerToDelete.bidPrice, playerCount: teamData.playerCount - 1 }
            : team
        )
      );
  
      // Reset the playerToDelete state and close the delete confirmation popup
      setPlayerToDelete(null);
      setShowDeleteConfirmation(false);
    }
  };
  const handleCancelDelete = () => {
    setPlayerToDelete(null);
    setShowDeleteConfirmation(false);
  };
  
  const gradeOrder = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <>

      {error && <div className="error-popup">{error}</div>}
      {popupMessage && (
        <div className="success-popup">
          {popupMessage}
          <button onClick={() => setPopupMessage("")}>Close</button>
        </div>
      )}
      <div className="selected-team-container">


        {/* Bidding Area */}
        <div className="bidding-area">
          <h2 className="bidding-title">Bidding Area</h2>
          <div className="bidding-form">
            {selectedPlayer && (
              <>
                <h2>{selectedPlayer.name}/{selectedPlayer.grade}</h2>
               </>
              
            )}
            <div>   <p style={{
              visibility: !isBiddingOngoing ? "hidden" : "visible",
            }} className="current-bidding-team">Current Bidding Team: {teams[currentBiddingTeamIndex]?.teamname || ""}</p></div>
           {bidPrice && (
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

        const maxBidPrice = calculateMaxBidPrice(currentTeam, players, grades);

        const startingBidPrice =
          bidPrice || grades[selectedPlayer.grade]?.price || 100
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
)}


            
            <button onClick={handleBidStart} disabled={isBiddingOngoing}>Start Bid</button>
            <button className="submit-bid-btn disabled-hover" onClick={() => handleBidSubmit(teams)} disabled={!selectedPlayer}>
  Submit Bid
</button>
<button className="pass-btn disabled-hover" onClick={handleBidPass} disabled={!selectedPlayer}>
  Pass
</button>
          </div>
        </div>
        {/* Teams Section */}
        <div className="teams-container">
          <div className="reset">
            <h2>Teams</h2>
            
          </div>
          {showDeleteConfirmation && (
  <div className="modal">
    <div className="modal-content">
      <p>Are you sure you want to delete {playerToDelete?.name}?</p>
      <div className="modal-buttons">
        <button onClick={handleConfirmDelete}>Yes</button>
        <button onClick={handleCancelDelete}>No</button>
      </div>
    </div>
  </div>
)}
          <div className="teams">
            {initialTeams.map((team) => (
              <div className="team" key={team.id}>
                <h3 style={{ textAlign: "center" }}>{team.teamname}</h3>
                <div className="budget">
                <p>Max Bid Price: {calculateMaxBidPrice(team, players, grades)}</p>
                  <p>Balance: {team.balance}</p>
                  {/* <p>Players: {team.playerCount}</p> */}
                </div>
                <table border="1">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Grade</th>
                      <th>Bid Price</th>
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
            .filter((grade) => grades[grade]) // Ensure only existing grades are rendered
            .map((grade) => (
              <div className="grade-section" key={grade}>
                <h3>
                  Grade {grade} ({grades[grade].price})
                </h3>
                <ul>{renderPlayersByGrade(grade)}</ul>
              </div>
            ))}
        </div>
      </div>
    </>
  );
});

export default SelectedTeam;