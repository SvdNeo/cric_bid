import React, { useEffect, useState } from "react";
import { db } from "../firebase_config";
import { collection, getDocs } from "firebase/firestore";
import "./SelectedTeam.css";
const SelectedTeam = () => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch teams
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(teamsList);

      // Fetch players
      const playersSnapshot = await getDocs(collection(db, "players"));
      const playersList = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayers(playersList);

      // Fetch unsold players

      const unsoldPlayersList = playersList.filter(
        (player) => player.status === "unsold"
      );
      console.log(unsoldPlayersList);
      setUnsoldPlayers(unsoldPlayersList);
    };

    fetchData();
  }, []);

  const renderPlayers = (teamId) => {
    return players
      .filter((player) => player.teamId === teamId)
      .sort((a, b) => a.grade.localeCompare(b.grade))
      .map((player) => (
        <tr key={player.id}>
          <td>{player.name}</td>
          <td>{player.grade}</td>
          <td>{player.price}</td>
          <td>{player.budget}</td>
          <td>{player.balance}</td>
        </tr>
      ));
  };

  const renderPlayersByGrade = (grade) => {
    return players
      .filter((player) => player.grade === grade)
      .map((player) => <li key={player.id}>{player.name}</li>);
  };

  const grades = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <div className="selected-team-container">
      <h2>Selected Teams</h2>
      <div className="teams-container">
        {teams.map((team) => (
          <div className="team" key={team.id}>
            <h3>
              {team.name} (Team: {team.teamname})
            </h3>
            <table border="1">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Grade</th>
                  <th>Price</th>
                  <th>Budget</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>{renderPlayers(team.id)}</tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="grades-unsold-container">
        <h2>Players by Grade</h2>
        <div className="grades-container">
          {grades.map((grade) => (
            <div className="grade-section" key={grade}>
              <h3>Grade {grade}</h3>
              <ul>{renderPlayersByGrade(grade)}</ul>
            </div>
          ))}
        </div>
        <h2>Unsold Players</h2>
        <div className="unsold-players">
          <table border="1">
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {unsoldPlayers.map((player) => (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>{player.grade}</td>
                  <td>{player.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SelectedTeam;
