import React, { useState, useEffect } from 'react';
import { db } from './firebase/firebase_config'; 
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where } from 'firebase/firestore';
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
  const [price, setPrice] = useState();
  const [teams, setTeams] = useState([]);
  

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

    // Fetch teams from Firestore
  const fetchTeams = async () => {
    try {
      const teamCollection = await getDocs(collection(db, 'teams'));
      setTeams(teamCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching teams: ", error);
    }
  };

  fetchGrades();
  fetchPlayers();
  fetchTeams();
}, []);
  
const handleAddPlayer = async () => {
  if (playerName && grade) {
    const newPlayer = { name: playerName, grade, status: 'new' };
    try {
      const playerRef = await addDoc(collection(db, 'players'), newPlayer);
      const playerId = playerRef.id;

      if (isDefaultOwner && selectedTeamName) {
        const selectedTeam = teams.find(team => team.teamname === selectedTeamName);
        if (selectedTeam) {
          // Check if the team already has an owner
          const teamPlayersSnapshot = await getDocs(query(collection(db, 'players'), where('teamName', '==', selectedTeamName), where('isOwner', '==', true)));
          if (!teamPlayersSnapshot.empty) {
            setErrorMessage(`${selectedTeamName} already has an owner.`);
            return;
          }

          // If no owner, proceed with adding the new owner
          await updateDoc(doc(db, 'players', playerId), {
            teamName: selectedTeamName,
            status: 'sold',
            defaultOwner: true,
            bidPrice: price,
            isOwner: true
          });

          // Update the team document
          const teamDoc = doc(db, 'teams', selectedTeamName);
          await updateDoc(teamDoc, {
            defaultOwner: playerId,
            playerCount: (selectedTeam?.playerCount || 0) + 1,
            teamname: playerName
          });
        }
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
  
          // Check if the selected team already has an owner
          const teamPlayersSnapshot = await getDocs(query(collection(db, 'players'), where('teamName', '==', selectedTeamName), where('isOwner', '==', true)));
          const existingOwner = teamPlayersSnapshot.docs[0];
          if (existingOwner && existingOwner.id !== editingPlayer.id) {
            setErrorMessage(`${selectedTeamName} already has an owner.`);
            return;
          }
  
          // Update the player document
          await updateDoc(playerDoc, {
            ...updatedPlayer,
            teamName: selectedTeamName,
            status: 'sold',
            defaultOwner: true,
            bidPrice: price,
            teamId: teamId || '',
            isOwner: true
          });
  
          // Update the team document
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
                defaultOwner: editingPlayer.id,
                teamname: `${playerName}'s Team`
              });
            }
          }
        } else {
          // Update the player document without the owner fields
          await updateDoc(playerDoc, {
            ...updatedPlayer,
            bidPrice: null,
            teamId: '',
            teamName: '',
            isOwner: false,
            defaultOwner: false
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
          <div className='checkbox-container'>
            <label>
              <input
                type="checkbox"
                checked={isDefaultOwner}
                onChange={handleDefaultOwnerChange}
              />
               <span style={{ marginLeft: '28px' }}>Default Owner</span>
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