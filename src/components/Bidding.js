import React, { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase_config";

const Bidding = ({
    teams,
    setTeams, // Add this line
    players,
    grades,
    selectedPlayer,
    setSelectedPlayer,
    setPlayers,
    setInitialPlayers,
    bidPrice,
    setBidPrice,
    initialPrice,
    setInitialPrice,
    currentBiddingTeamIndex,
    setCurrentBiddingTeamIndex,
    biddingStartTeamIndex,
    setBiddingStartTeamIndex,
    currentHighestBiddingTeamIndex,
    setCurrentHighestBiddingTeamIndex,
    currentHighestBidPrice,
    setCurrentHighestBidPrice,
    isBiddingOngoing,
    setIsBiddingOngoing,
    fetchData,
    initialPlayers,
    resetBid, // Add this line
    setPopupMessage,
    error,
    setError,
  }) => {
  const handleBidSubmit = async (tempTeams) => {
    const currentTeam = tempTeams[currentBiddingTeamIndex];
    if (currentTeam && currentHighestBidPrice && (currentTeam.balance - 100 * (6 - currentTeam.playerCount)) < currentHighestBidPrice) {
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
          playerCount: winningTeam.playerCount ? winningTeam.playerCount + 1 : 1
        };

        const teamDoc = doc(db, "teams", winningTeam.id);
        await updateDoc(teamDoc, updatedTeam);
        setPopupMessage(`  ${winningTeam.teamname} has won  the bid for ${selectedPlayer.name} for a Auction Price of Rs:${currentHighestBidPrice || currentBidPrice}`);

        fetchData();
        resetBid();
      } else {
        setCurrentHighestBidPrice(bidPrice);
        setCurrentBiddingTeamIndex(
          (prevIndex) => (prevIndex + 1) % tempTeams.length
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
      if (selectedPlayer) {
        const updatedPlayer = { ...selectedPlayer, status: "unsold" };
        const playerDoc = doc(db, "players", selectedPlayer.id);
        await updateDoc(playerDoc, { status: "unsold" });

        setPlayers(
          players.map((player) =>
            player.id === selectedPlayer.id ? updatedPlayer : player
          )
        );
        setInitialPlayers(prevPlayers =>
            prevPlayers
              ? prevPlayers.map(player =>
                  player.id === selectedPlayer.id ? updatedPlayer : player
                )
              : []
          );
          
        setPopupMessage(`${selectedPlayer.name} is unsold.`);
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
  };

  const colorCode = { new: "black", unsold: "red", sold: "blue" };

  return (
    <div className="bidding-area">
      <h2 className="bidding-title">Bidding Area</h2>
      <div className="bidding-form">
        {selectedPlayer && (
          <>
            <h2>{selectedPlayer.name}/{selectedPlayer.grade}</h2>
          </>
        )}
        <div>
          <p
            style={{
              visibility: !isBiddingOngoing ? "hidden" : "visible",
            }}
            className="current-bidding-team"
          >
            Current Bidding Team: {teams[currentBiddingTeamIndex]?.teamname || ""}
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
                if (!currentTeam) return null; 

                const unbidPlayers = players.filter(
                  (player) => player.status === "new" || player.status === "unsold"
                );

                const totalPrice = unbidPlayers.reduce((sum, player) => {
                  const playerGrade = grades[player.grade];
                  return sum + (playerGrade ? playerGrade.price : 0);
                }, 0);
                const averagePrice = totalPrice / unbidPlayers.length;
                const remainingPlayers = 7 - (currentTeam.playerCount || 0);
                let maxBidPrice = currentTeam.balance - remainingPlayers * averagePrice;
                maxBidPrice = Math.max(maxBidPrice, 0);

                const startingBidPrice = bidPrice || grades[selectedPlayer.grade]?.price || 100;

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
          disabled={!selectedPlayer}
        >
          Submit Bid
        </button>
        <button
          className="pass-btn disabled-hover"
          onClick={handleBidPass}
          disabled={!selectedPlayer}
        >
          Pass
        </button>
      </div>
    </div>
  );
};

export default Bidding;
