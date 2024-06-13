import React, { useState, useEffect } from 'react';
import { db } from '../firebase_config'; 
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
      const newPlayer = { name: playerName, grade };
      try {
        const playerRef = await addDoc(collection(db, 'players'), newPlayer);
        setPlayers([...players, { id: playerRef.id, ...newPlayer }]);
        setPlayerName('');
        setGrade('');
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
        await updateDoc(playerDoc, { name: playerName, grade: grade });
        setPlayers(players.map(player => (player.id === editingPlayer.id ? { ...player, name: playerName, grade: grade } : player)));
        setPlayerName('');
        setGrade('');
        setEditingPlayer(null);
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
            <option key={index} value={grade}>{grade}</option>
          ))}
        </select>
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
          {players.map(player => (
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
