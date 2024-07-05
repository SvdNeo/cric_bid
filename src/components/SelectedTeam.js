import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
 } from "react";
 import { db } from "./firebase/firebase_config";
 import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  writeBatch,
 } from "firebase/firestore";
 import "./SelectedTeam.css";
 import { TotpMultiFactorGenerator } from "firebase/auth/web-extension";
 
 const SelectedTeam = forwardRef((props, ref) => {
  const [initialTeams, setInitialTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [grades, setGrades] = useState({});
  const [initialPlayers, setInitialPlayers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [bidPrice, setBidPrice] = useState(null);
  const [startingBidPrice, setStartingBidPrice] = useState(0);
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
  const [disableAction, setDisableAction] = useState(false);
 
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
  setTeams(
  teamsList.filter(
  (team) => team.playerCount !== undefined && team.playerCount < 7
  )
  );
 
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
  batch.update(teamRef, { balance: 10000, playerCount: 0, hasPassed: false });

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
 
  const handleBidSubmit = async (tempTeams, isPassed) => {
    const currentTeam = tempTeams[currentBiddingTeamIndex];

    if (
      currentTeam && 
      !isPassed &&
      currentHighestBidPrice &&
      calculateMaxBidPrice(currentTeam, players, grades, selectedPlayer) < currentHighestBidPrice
    ) {
      setCurrentBiddingTeamIndex((prevIndex) => (prevIndex + 1) % tempTeams.length);
      handleBidPass();
      return;
    }
  
    if (selectedPlayer && bidPrice) {
      setCurrentHighestBiddingTeamIndex(currentBiddingTeamIndex);
      let remainingTeams = tempTeams;
      if (!isPassed) {
        remainingTeams = tempTeams.filter((team) => 
          calculateMaxBidPrice(team, players, grades, selectedPlayer) >= bidPrice
        );
      }
  
      if (remainingTeams.length === 1) {
        const winningTeam = remainingTeams[0];
        const playersOnWinningTeam = players.filter(
          (player) => player.teamId === winningTeam.id
        );
        if (playersOnWinningTeam.length >= 7) {
          setError("Team already has 7 players. Cannot add more.");
          return;
        }
  
        const currentBidPrice = isPassed ? (currentHighestBidPrice || bidPrice) : bidPrice;
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
 
  if (updatedTeam.balance <= 0) {
  updatedTeam.balance = 0;
  }
 
  setInitialTeams(
  initialTeams.map((initialTeam) => {
  if (initialTeam.id === winningTeam.id) {
  initialTeam.playerCount = updatedTeam.playerCount;
  initialTeam.balance = updatedTeam.balance;
  }
  return initialTeam;
  })
  );
 
  const teamDoc = doc(db, "teams", winningTeam.id);
  await updateDoc(teamDoc, updatedTeam);
 
  setPopupMessage(
    `${winningTeam.teamname} has won the bid for ${selectedPlayer.name} for an Auction Price of ${currentBidPrice}`
  );
 
  setDisableAction(true);
  setTimeout(() => {
  setPopupMessage("");
  setDisableAction(false);
  }, 3000);
  fetchData();
  resetBid();
  } else {
  setCurrentHighestBidPrice(bidPrice);
  setPopupMessage(
  `${currentTeam.teamname} has bid ${selectedPlayer.name} for an Auction Price of ${bidPrice}`
  );
 
  // Clear popup message after 3 seconds
  setDisableAction(true);
  setTimeout(() => {
  setPopupMessage("");
  setDisableAction(false);
  }, 3000);
  let nextBidPrice = bidPrice + 100
  setBidPrice(nextBidPrice); // Set the next bid price
  setStartingBidPrice(nextBidPrice);
  let nextTeamIndex = (currentBiddingTeamIndex + 1) % tempTeams.length;
  while (calculateMaxBidPrice(tempTeams[nextTeamIndex], players, grades, selectedPlayer) < nextBidPrice) {
  if (nextTeamIndex === currentBiddingTeamIndex) {
  handleBidSubmit([currentTeam]);
  return;
  }
  nextTeamIndex = (nextTeamIndex + 1) % tempTeams.length;
  }
  setCurrentBiddingTeamIndex(nextTeamIndex);
  }
  } else {
  setError("Please select all required fields.");
  setTimeout(() => setError(""), 3000);
  }
  };
 
  const handleBidPass = async () => {
    let newTeams = teams.filter((_, index) => index !== currentBiddingTeamIndex);
  const currentTeam = teams[currentBiddingTeamIndex];
  currentTeam.hasPassed = true;

  newTeams = newTeams.filter(
    (team) =>
      calculateMaxBidPrice(team, players, grades, selectedPlayer) >
      currentHighestBidPrice
  );

  setTeams([...newTeams]);

  if (newTeams.length === 0) {
    if (currentHighestBiddingTeamIndex !== null) {
      // If there's a highest bidder, they win at their last bid price
      handleBidSubmit([teams[currentHighestBiddingTeamIndex]], true);
    } else {
      // If no one has bid, the player is unsold
      // ... (code to mark player as unsold)
      resetBid();
    }
    return;
  }
  
    if (currentHighestBiddingTeamIndex === null && newTeams.length === 0) {
      if (selectedPlayer) {
        const updatedPlayer = { ...selectedPlayer, status: "unsold" };
        const playerDoc = doc(db, "players", selectedPlayer.id);
        await updateDoc(playerDoc, { status: "unsold" });
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
        setDisableAction(true);
        setTimeout(() => {
          setPopupMessage("");
          setDisableAction(false);
        }, 3000);
      }
      resetBid();
      return;
    }
  
    if (newTeams.length === 1 && currentHighestBiddingTeamIndex !== null) {
      handleBidSubmit(newTeams, true);
    } else {
      let nextTeamIndex = currentBiddingTeamIndex % newTeams.length;
  
      // If the next team is not eligible to bid, increment the index until an eligible team is found
      while (
        calculateMaxBidPrice(newTeams[nextTeamIndex], players, grades, selectedPlayer) <=
        currentHighestBidPrice
      ) {
        nextTeamIndex = (nextTeamIndex + 1) % newTeams.length;
        if (nextTeamIndex === currentBiddingTeamIndex) break; // Avoid infinite loop
      }
  
      if (nextTeamIndex === currentHighestBiddingTeamIndex) {
        setCurrentBiddingTeamIndex(nextTeamIndex);
        handleBidSubmit(newTeams);
      } else {
        setCurrentBiddingTeamIndex(nextTeamIndex);
        setPopupMessage(
          `${teams[currentBiddingTeamIndex].teamname} has passed the bid for ${selectedPlayer.name}`
        );
        setDisableAction(true);
        setTimeout(() => {
          setPopupMessage("");
          setDisableAction(false);
        }, 3000);
      }
    }
  };
  
  const handlePlayerDoubleClick = (player) => {
  setSelectedPlayer(player);
  const basePrice = grades[player.grade]?.price || 100;
  setInitialPrice(basePrice);
  setBidPrice(basePrice);
  setStartingBidPrice(basePrice);
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
  if (availablePlayers.length === 0 && unsoldPlayers.length > 0) {
  const randomPlayerIndex = Math.floor(
  Math.random() * unsoldPlayers.length
  );
  player = unsoldPlayers[randomPlayerIndex];
  } else {
  const randomPlayerIndex = Math.floor(
  Math.random() * availablePlayers.length
  );
  player = availablePlayers[randomPlayerIndex];
  }
 
  setSelectedPlayer(player);
  const basePrice = grades[player.grade]?.price || 100;
  setInitialPrice(basePrice);
  setBidPrice(basePrice);
  setCurrentHighestBidPrice(basePrice);
  setStartingBidPrice(basePrice);
  setCurrentBiddingTeamIndex(biddingStartTeamIndex);
  }
  };
 
 
 
  const getTopPlayerForTeam = (team, unbidPlayers, grades, currentBiddingPlayer) => {
  const teamPlayerCount = team.playerCount || 0;
  const remainingPlayers = 7 - teamPlayerCount;
 
  // Exclude the current bidding player from the top players calculation
  unbidPlayers = unbidPlayers.filter(player => player.id !== currentBiddingPlayer?.id);
 
  unbidPlayers.sort((a, b) => grades[b.grade].price - grades[a.grade].price);
  const selectedPlayers = [];
  let remainingBalance = team.balance;
  let start = 0, end = unbidPlayers.length - 1;
 
  while (start <= end && selectedPlayers.length < remainingPlayers) {
  const playerPrice = grades[unbidPlayers[start].grade].price;
  if (playerPrice <= remainingBalance) {
  const removedPlayer = selectedPlayers.length >= remainingPlayers
  ? selectedPlayers.shift()
  : null;
  selectedPlayers.push(unbidPlayers[start]);
  remainingBalance = team.balance -
  selectedPlayers.reduce(
  (sum, player) => sum + grades[player.grade].price,
  0
  );
 
  if (removedPlayer) {
  const remainingCount = 7 - (teamPlayerCount + selectedPlayers.length);
  if (remainingCount > 0) {
  selectedPlayers.unshift(removedPlayer);
  remainingBalance += grades[removedPlayer.grade].price;
  }
  }
  start++;
  } else {
  start++;
  }
  }
  return selectedPlayers;
  };
 
 
 
  const calculateMaxBidPrice = (team, players, grades, currentBiddingPlayer) => {
  // Filter out unbid players
  const unbidPlayers = players.filter(
  (player) =>
  (player.status === "new" || player.status === "unsold") &&
  player.id !== currentBiddingPlayer?.id
  );
  console.log(currentBiddingPlayer)
  // Get the top players for the team
  const topPlayers = getTopPlayerForTeam(team, unbidPlayers, grades, currentBiddingPlayer);
  console.log(topPlayers);
 
  // Calculate the total value of the top players
  const totalTopValues = topPlayers.reduce((sum, player) => {
  const playerGrade = grades[player.grade];
  return sum + (playerGrade ? playerGrade.price : 0);
  }, 0);
  console.log(totalTopValues);
 
  // Find the lowest value among the top players
  const lowestValue = topPlayers.length === 0 ? 0 : Math.min(...topPlayers.map((player) => grades[player.grade].price));
  console.log(lowestValue);
 
  // Calculate the remaining top values excluding the lowest value
  const remainingTopValues = totalTopValues - lowestValue;
  console.log(remainingTopValues);
 
  // Calculate the max bid price
  const maxBidPrice = team.balance - remainingTopValues;
  console.log(maxBidPrice);
 
  // Return the max bid price ensuring it is not less than 0
  return team.balance <= 0 ? 0 : Math.max(maxBidPrice, 0);
  };
 
 
 
  const resetBid = async (winningTeamId = null) => {
  setIsBiddingOngoing(false);
  const newPlayers = players.filter(
  (player) => player.id !== selectedPlayer?.id
  );
  setPlayers(newPlayers);
  setTeams(
  initialTeams.filter(
  (team) => team.playerCount !== undefined && team.playerCount < 7
  )
  );
 
  setSelectedPlayer(null);
  setBidPrice(null);
  let currentBidTeamLength = initialTeams.filter(
  (team) => team.playerCount !== undefined && team.playerCount < 7
  ).length;
  setBiddingStartTeamIndex(
  (biddingStartTeamIndex + 1) % currentBidTeamLength
  );
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
      const updatedPlayer = {
        ...playerToDelete,
        status: "new",
        teamId: "",
        teamName: "",
        bidPrice: null,
      };
      const playerDoc = doc(db, "players", playerToDelete.id);
      await updateDoc(playerDoc, updatedPlayer);
      const teamRef = doc(db, "teams", playerToDelete.teamId);
      const teamSnapshot = await getDoc(teamRef); // Use getDoc instead of getDocs
      const teamData = teamSnapshot.data();
      if (teamData) {
        await updateDoc(teamRef, {
          balance: teamData.balance + playerToDelete.bidPrice,
          playerCount: teamData.playerCount - 1,
        });
      }
      setPlayers(
        players.map((player) =>
          player.id === playerToDelete.id ? updatedPlayer : player
        )
      );
      setInitialPlayers(
        initialPlayers.map((player) =>
          player.id === playerToDelete.id ? updatedPlayer : player
        )
      );
      setInitialTeams(
        initialTeams.map((team) =>
          team.id === playerToDelete.teamId
            ? {
                ...team,
                balance: teamData.balance + playerToDelete.bidPrice,
                playerCount: teamData.playerCount - 1,
              }
            : team
        )
      );
      setPlayerToDelete(null);
      setShowDeleteConfirmation(false);
  
      // Refetch data after deleting a player
      await fetchData();
    }
  };
  
  const handleCancelDelete = () => {
  setPlayerToDelete(null);
  setShowDeleteConfirmation(false);
  };
 
  const gradeOrder = ["A", "B", "C", "D", "E", "F", "G"];
 
  const test = () => {
  return (
  teams[currentBiddingTeamIndex] &&
  startingBidPrice > calculateMaxBidPrice(teams[currentBiddingTeamIndex], players, grades, selectedPlayer)
  );
  };
 
 
  return (
  <>
  {error && <div className="error-popup">{error}</div>}
 
  <div className="selected-team-container">
 
  <div className="bidding-area">
  <h2 className="bidding-title">Bidding Area</h2>
  <div className="bidding-section">
  <div className="bidding-form-container">
  <div className="bidding-form">
  {selectedPlayer && (
  <>
  <h2>
  {selectedPlayer.name}/{selectedPlayer.grade}
  </h2>
  </>
  )}
  <div>
  <p
  style={{
  visibility: !isBiddingOngoing ? "hidden" : "visible",
  }}
  className="current-bidding-team"
  >
  Current Bidding Team:{" "}
  {teams[currentBiddingTeamIndex]?.teamname || ""}
  </p>
  </div>
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
 
  const maxBidPrice = calculateMaxBidPrice(
  teams[currentBiddingTeamIndex],
  players,
  grades,
  selectedPlayer
  );
 
  const startingBidPrice =
  bidPrice || grades[selectedPlayer.grade]?.price || 100;
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
 
  <button onClick={handleBidStart} disabled={isBiddingOngoing}>
  Start Bid
  </button>
  <button
  className="submit-bid-btn disabled-hover"
  onClick={() => handleBidSubmit(teams)}
  disabled={!selectedPlayer || disableAction || test()}
  >
  Submit Bid
  </button>
  <button
  className="pass-btn disabled-hover"
  onClick={handleBidPass}
  disabled={!selectedPlayer || disableAction}
  >
  Pass
  </button>
  </div>
  </div>
  <div className="bidding-info-container">
  <div className="bidding-info-left">
  <p>Current Highest Bid Price: {currentHighestBidPrice}</p>
 
  <div>
  {initialTeams.map((team) => (


    <span
      key={team.id}
      className={
        team.hasPassed
          ? "bidding-over" // orange
          : team.id === teams[currentHighestBiddingTeamIndex]?.id
          ? "current-highest-bidder" // green
          : calculateMaxBidPrice(team, players, grades, selectedPlayer) <= currentHighestBidPrice
          ? "cannot-bid" // red
          : calculateMaxBidPrice(team, players, grades, selectedPlayer) > currentHighestBidPrice
          ? "bidding-eligible" // yellow
          : "cannot-bid" // red
      }
    >
      {team.teamname}
    </span>

  ))}
  </div>
  </div>
  <div className="bidding-info-right">
  {popupMessage && (
  <div
  className={`success-popup ${popupMessage.includes("has won the bid") ? "winning-bid" : ""
  }`}
  >
  {popupMessage}
  </div>
  )}
  </div>
 
  </div>
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
  <p>
  Max Bid Price: {calculateMaxBidPrice(team, players, grades, selectedPlayer)}
  </p>
 
  <p>Balance: {team.balance}</p>
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