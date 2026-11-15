import { useState } from "react";
import { signedDiff, type Standing } from "./logic";

export function Leaderboard({
  table,
  totalMatches,
  entered,
  finished,
}: {
  table: Standing[];
  totalMatches: number;
  entered: number;
  finished: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const top = table.filter((row) => row.rank === 1 && row.played > 0);

  return (
    <section className="board" aria-labelledby="board-heading">
      <div className="panel-head">
        <h2 id="board-heading">{finished ? "Final board" : "Leaderboard"}</h2>
        <p>
          {entered} of {totalMatches} matches entered. Points, then wins, then point difference.
        </p>
      </div>
      {finished && top.length > 0 && (
        <p className="champion">
          {top.length === 1
            ? `${top[0]?.name} finishes first with ${top[0]?.points} points.`
            : `${top.map((row) => row.name).join(" and ")} tie on ${top[0]?.points} points.`}
        </p>
      )}
      <ol className="board-list">
        {table.map((row) => {
          const open = openId === row.id;
          return (
            <li key={row.id} className={row.rank === 1 && row.played > 0 ? "board-row leading-row" : "board-row"}>
              <button
                type="button"
                className="board-main"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : row.id)}
              >
                <span className="rank">{row.rank}</span>
                <span className="board-name">
                  <span>{row.name}</span>
                  <span className={`badge ${row.side}`}>{row.side === "left" ? "L" : "R"}</span>
                </span>
                <span className="points">
                  <strong>{row.points}</strong>
                  <span className="points-label">pts</span>
                </span>
                <span className="stat wins">{row.wins}W</span>
                <span className="stat diff">{signedDiff(row.diff)}</span>
                <span className="meta">
                  {row.played} played · {row.wins} wins · {signedDiff(row.diff)}
                </span>
              </button>
              {open && (
                <div className="board-detail">
                  {row.results.length === 0 ? (
                    <p>No score entered yet.</p>
                  ) : (
                    <ul>
                      {row.results.map((result) => (
                        <li key={`${result.roundIndex}-${result.courtIndex}`}>
                          <span>
                            R{result.roundIndex + 1} · Court {result.courtIndex + 1}
                          </span>
                          <span>
                            with {result.partner} vs {result.opponents[0]} & {result.opponents[1]}
                          </span>
                          <strong>
                            {result.points}–{result.against}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
