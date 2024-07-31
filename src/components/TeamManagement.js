import React, { useState, useEffect } from "react";
import { db } from "./firebase/firebase_config";
import { collection, getDocs, query, where } from "firebase/firestore";
import "./TeamManagement.css"; // You'll need to create this CSS file

const TeamManagement = () => {
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);

        // Fetch all teams
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        const teamsData = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch players who are default owners
        const playersQuery = query(
          collection(db, "players"),
          where("defaultOwner", "==", true)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const defaultOwners = playersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Combine team data with default owner information
        const combinedData = teamsData.map((team) => {
          const defaultOwner = defaultOwners.find(
            (player) => player.teamName === team.teamname
          );
          return {
            teamName: team.teamname,
            defaultOwnerName: defaultOwner ? defaultOwner.name : "Not assigned",
          };
        });

        setTeamData(combinedData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching team data:", err);
        setError("Failed to load team data. Please try again later.");
        setLoading(false);
      }
    };

    fetchTeamData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="team-management-container">
      <h2>Team Default Owners</h2>
      <table className="team-table">
        <thead>
          <tr>
            <th>Team Name</th>
            <th>Owners's Name</th>
          </tr>
        </thead>
        <tbody>
          {teamData.map((team, index) => (
            <tr key={index}>
              <td>{`Team${index + 1}`}</td>
              <td>{team.teamName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamManagement;
