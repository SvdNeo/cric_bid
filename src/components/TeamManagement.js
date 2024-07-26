// components/TeamManagement.js
import React, { useState, useEffect } from 'react';
import { db } from './firebase/firebase_config';
import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import './TeamManagement.css';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    // Fetch players from Firestore
    const fetchTeamsAndPlayers = async () => {
      try {
        const playerCollection = await getDocs(collection(db, 'players'));
        const playersData = playerCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const teamsData = playersData
          .filter(player => player.defaultOwner && player.teamName)
          .map(player => ({
            team: player.teamName,
            owner: player.name,
          }));

        setTeams(teamsData);
      } catch (error) {
        console.error("Error fetching players: ", error);
      }
    };

    fetchTeamsAndPlayers();
  }, []);

  const resetTeamOwners = async () => {
    try {
      const playerCollection = await getDocs(collection(db, 'players'));
      const batch = writeBatch(db);

      playerCollection.docs.forEach(doc => {
        const playerRef = doc(db, 'players', doc.id);
        batch.update(playerRef, { defaultOwner: false, teamName: '' });
      });

      await batch.commit();
      console.log('Team owners and team names reset successfully');

      // Fetch the updated players data and update the teams state
      const updatedPlayerCollection = await getDocs(collection(db, 'players'));
      const updatedPlayersData = updatedPlayerCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const updatedTeamsData = updatedPlayersData.filter(player => player.defaultOwner && player.teamName);

      setTeams(updatedTeamsData);
    } catch (error) {
      console.error("Error resetting team owners and team names: ", error);
    }
  };

  return (
    <div className="team-management">
      <h1>Team Management</h1>
      <button onClick={resetTeamOwners}>Reset Team Owners and Team Names</button>
      <table>
        <thead>
          <tr>
            <th>Teams</th>
            <th>Team Name</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={index}>
              <td>{team.team}</td>
              <td>{team.owner}'s Team</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamManagement;
