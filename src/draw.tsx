import { ROUNDS } from "./schedule";
import { courtEntered, courtTeams } from "./logic";
import type { Session } from "./types";

export function DrawSheet({
  session,
  activeRound,
  onOpenRound,
}: {
  session: Session;
  activeRound: number;
  onOpenRound: (round: number) => void;
}) {
  return (
    <section className="draw" aria-labelledby="draw-heading">
      <div className="panel-head">
        <h2 id="draw-heading">The draw</h2>
        <p>Every left player partners every right player once across these six rounds.</p>
      </div>
      <ol className="draw-rounds">
        {ROUNDS.map((round, roundIndex) => {
          const current = roundIndex === activeRound;
          return (
            <li key={roundIndex} className={current ? "draw-round current" : "draw-round"}>
              <button type="button" className="draw-open" onClick={() => onOpenRound(roundIndex)}>
                Round {roundIndex + 1}
                {current ? " · now" : ""}
              </button>
              <ul>
                {round.map((court, courtIndex) => {
                  const teams = courtTeams(session, court);
                  const score = session.scores[roundIndex]?.[courtIndex];
                  const entered = courtEntered(score);
                  return (
                    <li key={courtIndex}>
                      <span className="court-kicker">Court {courtIndex + 1}</span>
                      <span className="draw-line">
                        <span>
                          {teams.a[0].name} + {teams.a[1].name}
                        </span>
                        {entered && <strong>{score?.a}</strong>}
                      </span>
                      <span className="draw-line">
                        <span>
                          {teams.b[0].name} + {teams.b[1].name}
                        </span>
                        {entered && <strong>{score?.b}</strong>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
