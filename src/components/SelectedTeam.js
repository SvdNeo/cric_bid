import React, { useEffect, useState,forwardRef,useImperativeHandle } from "react";
import { db } from "../firebase_config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import "./SelectedTeam.css";

const SelectedTeam = forwardRef((props, ref) => {
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

  const [currentHighestBidPrice, setCurrentHighestBidPrice] = useState(0);
  const [isBiddingOngoing, setIsBiddingOngoing] = useState(false);

  const [currentHighestBidPrice, setCurrentHighestBidPrice] = useState(null);
  const [initialPrice, setInitialPrice] = useState(0);
  const [popupMessage, setPopupMessage] = useState("");


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
        <tr key={player.id}>
          <td>{player.name}</td>
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
          }}
        >
          {player.name}
        </li>
      ));
  };

  const handleBidSubmit = async (tempTeams) => {
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

          balance: winningTeam.balance - bidPrice,
          playerCount: winningTeam.playerCount
            ? winningTeam.playerCount + 1
            : 1,

          balance: winningTeam.balance - currentBidPrice,
          playerCount: winningTeam.playerCount ? winningTeam.playerCount + 1 : 1

        };
        setInitialTeams(initialTeams.map(initialTeam => {
          if (initialTeam.id === winningTeam.id) {
            initialTeam.playerCount = winningTeam.playerCount;
          }
          return initialTeam;
        }));
        const teamDoc = doc(db, "teams", winningTeam.id);
        await updateDoc(teamDoc, updatedTeam);
        setPopupMessage(`  ${winningTeam.teamname} has won  the bid for ${selectedPlayer.name} for a Auction Price of Rs:${currentHighestBidPrice || currentBidPrice}`);

        fetchData();
        resetBid();
      } else {
        setCurrentHighestBidPrice(bidPrice);
        setCurrentBiddingTeamIndex(
          (prevIndex) => (prevIndex + 1) % remainingTeams.length
        );
        setBidPrice(bidPrice + 100); // Set the next bid price
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
        setBidPrice(currentHighestBidPrice ? currentHighestBidPrice + 100 : initialPrice); // Update bid price on pass
      }
    }
  };

  const handleBidStart = () => {
    setIsBiddingOngoing(true);
    const availablePlayers = players.filter(
      (player) => player.status === "new"
    );
    const unsoldPlayers = players.filter(
      (player) => player.status === "unsold"
    );

    if (availablePlayers === 0 && unsoldPlayers === 0) {
      setError("No players available for bidding.");
      return;
    }

    let player;
    // Prioritize players who haven't been bid on
    if (availablePlayers.length === 0 && unsoldPlayers.length > 0) {

      player = unsoldPlayers.filter((player) => player.status !== "unsold")[0];

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
  };

  const resetBid = async (winningTeamId = null) => {
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

    setBidPrice(100);
    setIsBiddingOngoing(false);
    // if (winningTeamId !== null) {
    //   setBiddingStartTeamIndex(
    //     initialTeams.findIndex((team) => team.id === winningTeamId)
    //   );
    // } else if (currentHighestBiddingTeamIndex !== null) {
    //   setBiddingStartTeamIndex(currentHighestBiddingTeamIndex);
    // }
    let currentBidTeamLength = initialTeams.filter(
      (team) => team.playerCount !== undefined && team.playerCount < 7
    ).length;
    setBiddingStartTeamIndex(
      (biddingStartTeamIndex + 1) % currentBidTeamLength
    );

    setBidPrice(null);
    let currentBidTeamLength = (initialTeams.filter(team => team.playerCount !== undefined && team.playerCount < 7)).length;
    setBiddingStartTeamIndex((biddingStartTeamIndex + 1) % currentBidTeamLength);

    setCurrentBiddingTeamIndex(biddingStartTeamIndex);
    setCurrentHighestBiddingTeamIndex(null);
    setCurrentHighestBidPrice(null);
    await fetchData(); // Ensure data is fetched after reset
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

            <div>
  <p className="current-bidding-team">Current Bidding Team: {teams[currentBiddingTeamIndex]?.teamname || ""}</p>
</div>
            <div>

            {bidPrice && (<div>

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
                  const maxBidPrice =
                    currentTeam.balance - 100 * (6 - playerCount);
                  const startingBidPrice = grades[selectedPlayer.grade]?.price || 100;

                  const options = [];
                  for (
                    let price = startingBidPrice;
                    price <= maxBidPrice;
                    price += 100
                  ) {
                    options.push(
                      <option key={price} value={price}>
                        {price}
                      </option>
                    );
                  }

                  return options;
                })()}
              </select>
            </div>)}

            

            <button onClick={handleBidStart} disabled={isBiddingOngoing}>
              Start Bid
            </button>
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
          <div className="teams">
            {initialTeams.map((team) => (
              <div className="team" key={team.id}>
                <h3 style={{ textAlign: "center" }}>{team.teamname}</h3>
                <div className="budget">
                  <p>Budget: {team.budget}</p>
                  <p>Balance: {team.balance}</p>
                  {/* <p>Players: {team.playerCount}</p> */}
                </div>
                <table border="1">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Auction Price</th>
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

