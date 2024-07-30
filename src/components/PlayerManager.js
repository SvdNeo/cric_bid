import React, { useState, useEffect } from 'react';
import { db } from './firebase/firebase_config'; 
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc,getDoc } from 'firebase/firestore';
import './PlayerManager.css';

const PlayerManager = () => {
  const [playerName, setPlayerName] = useState('');
  const [grade, setGrade] = useState('');
  const [grades, setGrades] = useState([]);
  const [players, setPlayers] = useState([]);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [isDefaultOwner, setIsDefaultOwner] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [price, setPrice] = useState(0);
  

  useEffect(() => {
    // Fetch grades from Firestore
    const fetchGrades = async () => {
      try {
        const gradeCollection = await getDocs(collection(db, 'grade'));
        setGrades(gradeCollection.docs.map(doc => doc.data().name));
      } catch (error) {
        console.error("Error fetching grades: ", error);
      }
    };

    // Fetch players from Firestore
    const fetchPlayers = async () => {
      try {
        const playerCollection = await getDocs(collection(db, 'players'));
        setPlayers(playerCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching players: ", error);
      }
    };

    fetchGrades();
    fetchPlayers();
  }, []);

  const handleAddPlayer = async () => {
    if (playerName && grade) {
      const newPlayer = { name: playerName, grade, status: 'new' };
      try {
        const playerRef = await addDoc(collection(db, 'players'), newPlayer);
        const playerId = playerRef.id;
  
        if (isDefaultOwner && selectedTeamName && price) {
          // Update the player document with the team name, default owner status, and other fields
          await updateDoc(doc(db, 'players', playerId), {
            teamName: selectedTeamName,
            status: 'sold',
            defaultOwner: true,
            bidPrice: price,
          });
  
          // Update the team document with the player count and balance
          const teamDoc = doc(db, 'teams', selectedTeamName);
          const teamData = (await getDocs(teamDoc)).data();
          const updatedBalance = teamData.balance - price;
          const updatedPlayerCount = teamData.playerCount + 1;
          await updateDoc(teamDoc, {
            balance: updatedBalance,
            playerCount: updatedPlayerCount,
          });
        }
  
        setPlayers([...players, { id: playerId, ...newPlayer }]);
        setPlayerName('');
        setGrade('');
        setIsDefaultOwner(false);
        setSelectedTeamName('');
        setPrice(0);
        setErrorMessage('');
      } catch (error) {
        console.error("Error adding player: ", error);
      }
    } else {
      setErrorMessage('Please enter required fields');
    }
  };
  

  const handleEditPlayer = (id) => {
    const player = players.find(p => p.id === id);
    setPlayerName(player.name);
    setGrade(player.grade);
    setEditingPlayer(player);
    setErrorMessage('');
  };

  const handleUpdatePlayer = async () => {
    if (playerName && grade) {
      const playerDoc = doc(db, 'players', editingPlayer.id);
      try {
        const updatedPlayer = { name: playerName, grade: grade };
  
        if (isDefaultOwner && selectedTeamName && price) {
          // Get the teamId based on the selectedTeamName
          const teamSnapshot = await getDocs(collection(db, 'teams'));
          const teamData = teamSnapshot.docs.find(doc => doc.data().teamname === selectedTeamName);
          const teamId = teamData?.id;
  
          // Update the player document with the team name, default owner status, and other fields
          await updateDoc(playerDoc, {
            ...updatedPlayer,
            teamName: selectedTeamName,
            status: 'sold',
            defaultOwner: true,
            bidPrice: price,
            teamId: teamId || '',
          });
  
          // Update the team document with the player count and balance
          if (teamId) {
            const teamDoc = doc(db, 'teams', teamId);
            const teamData = (await getDoc(teamDoc)).data();
  
            if (teamData) {
              const existingPlayerCount = teamData.playerCount || 0;
              const existingBalance = teamData.balance || 10000;
              const updatedBalance = existingBalance - price;
              const updatedPlayerCount = existingPlayerCount + 1;
  
              await updateDoc(teamDoc, {
                balance: updatedBalance,
                playerCount: updatedPlayerCount,
              });
            }
          }
        } else {
          // Update the player document without the default owner fields
          await updateDoc(playerDoc, {
            ...updatedPlayer,
            bidPrice: null,
            teamId: '',
            teamName: '',
          });
        }
  
        setPlayers(players.map(player => (player.id === editingPlayer.id ? { ...player, ...updatedPlayer, bidPrice: isDefaultOwner ? price : null } : player)));
        setPlayerName('');
        setGrade('');
        setEditingPlayer(null);
        setIsDefaultOwner(false);
        setSelectedTeamName('');
        setPrice(0);
        setErrorMessage('');
      } catch (error) {
        console.error("Error updating player: ", error);
      }
    } else {
      setErrorMessage('Please enter required fields');
    }
  };
 
  
  
  

  const handleCancelEdit = () => {
    setPlayerName('');
    setGrade('');
    setEditingPlayer(null);
    setErrorMessage('');
  };

  const handleDeletePlayer = async (id) => {
    const playerDoc = doc(db, 'players', id);
    try {
      await deleteDoc(playerDoc);
      setPlayers(players.filter(player => player.id !== id));
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
  const handleDefaultOwnerChange = (event) => {
    setIsDefaultOwner(event.target.checked);
  };
  const handlePriceChange = (event) => {
    setPrice(Number(event.target.value));
  };  

  // Sort players by grade before rendering
  const sortedPlayers = [...players].sort((a, b) => a.grade.localeCompare(b.grade));

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
                checked={isDefaultOwner}
                onChange={handleDefaultOwnerChange}
              />
              Default Owner
            </label>
            {isDefaultOwner && (
              <>
                <select value={selectedTeamName} onChange={(e) => setSelectedTeamName(e.target.value)}>
                  <option value="">Select Team</option>
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                  <option value="T4">T4</option>
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </>
            )}
          </div>
          {editingPlayer ? (
            <div className="buttons">
              <button className="update-button" onClick={handleUpdatePlayer}>Update Player</button>
              <button className="cancel-button" onClick={handleCancelEdit}>Cancel</button>
            </div>
          ) : (
            <button className="add-button" onClick={handleAddPlayer}>Add Player</button>
          )}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
      <div className="players-list">
        <h2>Players List</h2>
        <ul>
          {sortedPlayers.map(player => (
            <li key={player.id}>
              {player.name} - {player.grade}
              <div className="player-buttons">
                <button className="edit-button" onClick={() => handleEditPlayer(player.id)}>Edit</button>
                <button className="delete-button" onClick={() => confirmDeletePlayer(player.id)}>Delete</button>
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
              <button className="confirm-button" onClick={() => handleDeletePlayer(playerToDelete)}>Confirm</button>
              <button className="cancel-button" onClick={cancelDeletePlayer}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerManager;