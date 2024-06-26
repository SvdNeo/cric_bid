import React from "react";

const Teams = ({ initialTeams, initialPlayers }) => {
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

  return (
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
  );
};

export default Teams;
