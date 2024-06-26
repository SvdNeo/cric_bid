import React from "react";

const PlayersByGrade = ({ grades, initialPlayers }) => {
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

  const gradeOrder = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <div className="grades-container">
      {gradeOrder
        .filter((grade) => grades[grade])
        .map((grade) => (
          <div className="grade-section" key={grade}>
            <h3>
              Grade {grade} ({grades[grade].price})
            </h3>
            <ul>{renderPlayersByGrade(grade)}</ul>
          </div>
        ))}
    </div>
  );
};

export default PlayersByGrade;
