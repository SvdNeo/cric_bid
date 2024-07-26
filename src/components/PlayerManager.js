import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { db } from "./firebase/firebase_config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import "./PlayerManager.css";

const PlayerManager = (props, ref) => {
  const [playerName, setPlayerName] = useState("");
  const [grade, setGrade] = useState("");
  const [teamName, setTeamName] = useState("");
  const [isDefaultOwner, setIsDefaultOwner] = useState(false);
  const [grades, setGrades] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [price, setPrice] = useState(null);
  // Define fetch functions outside useEffect so they can be used elsewhere
  const fetchGrades = async () => {
    try {
      const gradeCollection = await getDocs(collection(db, "grade"));
      setGrades(gradeCollection.docs.map((doc) => doc.data().name));
    } catch (error) {
      console.error("Error fetching grades: ", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const teamCollection = await getDocs(collection(db, "teams"));
      setTeams(teamCollection.docs.map((doc) => doc.data().teamname));
    } catch (error) {
      console.error("Error fetching teams: ", error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const playerCollection = await getDocs(collection(db, "players"));
      setPlayers(
        playerCollection.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Error fetching players: ", error);
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchTeams();
    fetchPlayers(); // Call fetchPlayers here
  }, []);

  const handleAddPlayer = async () => {
    if (playerName && grade && (isDefaultOwner ? teamName : true)) {
      if (
        isDefaultOwner &&
        players.some(
          (player) => player.teamName === teamName && player.defaultOwner
        )
      ) {
        setErrorMessage(`Team ${teamName} already has a default owner.`);
        return;
      }

      const newPlayer = {
        name: playerName,
        grade,
        teamName: isDefaultOwner ? teamName : "",
        defaultOwner: isDefaultOwner,
        price: isDefaultOwner ? price : null,
        status: isDefaultOwner ? "sold" : "new",
      };
      try {
        const playerRef = await addDoc(collection(db, "players"), newPlayer);
        setPlayers([...players, { id: playerRef.id, ...newPlayer }]);

        if (isDefaultOwner) {
          const teamDoc = doc(db, "teams", teamName);
          const teamData = (await getDoc(teamDoc)).data();
          const updatedTeam = {
            ...teamData,
            balance: teamData.balance - price,
            owner: playerName,
          };
          await updateDoc(teamDoc, updatedTeam);
        }

        resetForm();
      } catch (error) {
        console.error("Error adding player: ", error);
      }
    } else {
      setErrorMessage("Please enter required fields");
    }
  };

  const handleEditPlayer = (id) => {
    const player = players.find((p) => p.id === id);
    setPlayerName(player.name);
    setGrade(player.grade);
    setTeamName(player.teamName);
    setIsDefaultOwner(player.defaultOwner);
    setEditingPlayer(player);
    setErrorMessage("");
  };

  const handleUpdatePlayer = async () => {
    if (playerName && grade && (isDefaultOwner ? teamName : true)) {
      if (
        isDefaultOwner &&
        players.some(
          (player) =>
            player.teamName === teamName &&
            player.defaultOwner &&
            player.id !== editingPlayer.id
        )
      ) {
        setErrorMessage(`Team ${teamName} already has a default owner.`);
        return;
      }

      const updatedPlayer = {
        name: playerName,
        grade,
        teamName: isDefaultOwner ? teamName : "",
        defaultOwner: isDefaultOwner,
      };
      const playerDoc = doc(db, "players", editingPlayer.id);
      try {
        await updateDoc(playerDoc, updatedPlayer);
        setPlayers(
          players.map((player) =>
            player.id === editingPlayer.id
              ? { ...player, ...updatedPlayer }
              : player
          )
        );
        resetForm();
      } catch (error) {
        console.error("Error updating player: ", error);
      }
    } else {
      setErrorMessage("Please enter required fields");
    }
  };

  const resetForm = () => {
    setPlayerName("");
    setGrade("");
    setTeamName("");
    setIsDefaultOwner(false);
    setEditingPlayer(null);
    setErrorMessage("");
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDeletePlayer = async (id) => {
    const playerDoc = doc(db, "players", id);
    try {
      await deleteDoc(playerDoc);
      setPlayers(players.filter((player) => player.id !== id));
      setShowDeleteConfirmation(false);
      setPlayerToDelete(null);
    } catch (error) {
      console.error("Error deleting player: ", error);
    }
  };

  const confirmDeletePlayer = (id) => {
    setShowDeleteConfirmation(true);
    setPlayerToDelete(id);
  };

  const cancelDeletePlayer = () => {
    setShowDeleteConfirmation(false);
    setPlayerToDelete(null);
  };

  const handleResetPlayers = async () => {
    try {
      await fetchPlayers(); // Fetch the latest data from the database
    } catch (error) {
      console.error("Error resetting players: ", error);
    }
  };

  useImperativeHandle(ref, () => ({
    handleResetPlayers,
  }));

  // Sort players by grade before rendering
  const sortedPlayers = [...players].sort((a, b) =>
    a.grade.localeCompare(b.grade)
  );

  return (
    <div className="player-manager">
      <h1>Player Manager</h1>
      <div className="form-container">
        <input
          type="text"
          placeholder="Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">Select Grade</option>
          {grades.map((grade, index) => (
            <option key={index} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        <div>
          <label>
            <input
              type="checkbox"
              className="default-owner-checkbox"
              checked={isDefaultOwner}
              onChange={(e) => setIsDefaultOwner(e.target.checked)}
            />
            <div className="default-owner-text">Default Owner</div>
          </label>
          {isDefaultOwner && (
            <>
              {/* <input
                type="number"
                placeholder="Price"
                value={price || ""}
                onChange={(e) => setPrice(e.target.value)}
              /> */}
              <select
                className="team-name-select"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              >
                <option value="">Select Team</option>
                {teams.map((team, index) => (
                  <option key={index} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {editingPlayer ? (
          <div className="buttons">
            <button className="update-button" onClick={handleUpdatePlayer}>
              Update Player
            </button>
            <button className="cancel-button" onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="add-button" onClick={handleAddPlayer}>
            Add Player
          </button>
        )}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
      <div className="players-list">
        <h2>Players List</h2>
        <ul>
          {sortedPlayers.map((player) => (
            <li key={player.id}>
              {player.name} - {player.grade} - {player.teamName} -{" "}
              {player.defaultOwner ? "Default Owner" : ""}
              <div className="player-buttons">
                <button
                  className="edit-button"
                  onClick={() => handleEditPlayer(player.id)}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  onClick={() => confirmDeletePlayer(player.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {showDeleteConfirmation && (
        <div className="modal">
          <div className="modal-content">
            <p>Are you sure you want to delete this player?</p>
            <div className="modal-buttons">
              <button
                className="confirm-button"
                onClick={() => handleDeletePlayer(playerToDelete)}
              >
                Confirm
              </button>
              <button className="cancel-button" onClick={cancelDeletePlayer}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default forwardRef(PlayerManager);
