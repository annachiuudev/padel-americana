import { useEffect, useState } from "react";
import { Leaderboard } from "./board";
import { CourtCard } from "./court";
import { DrawSheet } from "./draw";
import {
  courtTeams,
  enteredMatchCount,
  formatResults,
  roundEntered,
  sessionToDraft,
  standings,
} from "./logic";
import { COURT_COUNT, ROUND_COUNT, ROUNDS } from "./schedule";
import type { CourtScore, Session, SetupDraft } from "./types";

type View = "round" | "draw" | "board";

export function PlayScreen({
  session,
  onSession,
  onRetire,
}: {
  session: Session;
  onSession: (update: (session: Session) => Session) => void;
  onRetire: (draft: SetupDraft) => void;
}) {
  const [view, setView] = useState<View>("round");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [session.activeRound, view]);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [confirming, setConfirming] = useState<"restart" | "players" | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!sessionOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSessionOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [sessionOpen]);
  const table = standings(session);
  const entered = enteredMatchCount(session);
  const finished = entered === ROUND_COUNT * COURT_COUNT;
  const round = session.activeRound;
  const roundDone = roundEntered(session, round);
  const openCourts = (session.scores[round] ?? [])
    .map((score, index) => (score.a == null || score.b == null ? index + 1 : null))
    .filter((court): court is number => court != null);

  function patch(recipe: (session: Session) => Partial<Session>) {
    onSession((current) => ({ ...current, ...recipe(current) }));
  }

  function setScore(courtIndex: number, produce: (score: CourtScore) => CourtScore) {
    onSession((current) => ({
      ...current,
      scores: current.scores.map((row, rowIndex) =>
        rowIndex === current.activeRound
          ? row.map((cell, index) => (index === courtIndex ? produce(cell) : cell))
          : row,
      ),
    }));
  }

  async function copyResults() {
    const text = formatResults(session, table);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="shell play" data-view={view}>
      <header className="mast compact">
        <div>
          <p className="eyebrow">Cross Court</p>
          <h1>Round {round + 1} of {ROUND_COUNT}</h1>
          <p className="lede">
            {session.pointsTotal == null ? "Open scoring" : `${session.pointsTotal} points a match`}. Each player
            keeps their team’s points.
          </p>
        </div>
        <button
          type="button"
          className="ghost session-toggle"
          aria-expanded={sessionOpen}
          onClick={() => {
            setConfirming(null);
            setSessionOpen(true);
          }}
        >
          Session
        </button>
      </header>

      <nav className="view-tabs" aria-label="Scorekeeper">
        <button type="button" aria-pressed={view === "round"} onClick={() => setView("round")}>
          Round
        </button>
        <button type="button" aria-pressed={view === "draw"} onClick={() => setView("draw")}>
          Draw
        </button>
        <button type="button" className="tab-board" aria-pressed={view === "board"} onClick={() => setView("board")}>
          Board
        </button>
      </nav>

      <div className="panel-round">
        <div className="round-switch" aria-label="Rounds">
          {ROUNDS.map((_, index) => {
            const done = roundEntered(session, index);
            return (
              <button
                key={index}
                type="button"
                className={index === round ? "on" : ""}
                aria-pressed={index === round}
                aria-label={`Round ${index + 1}${done ? ", scores entered" : ", waiting for scores"}`}
                onClick={() => patch(() => ({ activeRound: index }))}
              >
                {index + 1}
                {done && <span className="dot" />}
              </button>
            );
          })}
        </div>
        <div className="courts">
          {ROUNDS[round]?.map((court, index) => {
            const teams = courtTeams(session, court);
            const score = session.scores[round]?.[index] ?? { a: null, b: null, linked: session.pointsTotal != null };
            return (
              <CourtCard
                key={index}
                index={index}
                teamA={teams.a}
                teamB={teams.b}
                score={score}
                pointsTotal={session.pointsTotal}
                onChange={(produce) => setScore(index, produce)}
              />
            );
          })}
        </div>
        {!roundDone && openCourts.length > 0 && (
          <p className="note">Still open: {openCourts.map((court) => `court ${court}`).join(", ")}.</p>
        )}
        <div className="action-row">
          {round < ROUND_COUNT - 1 ? (
            <button type="button" className="primary" onClick={() => patch((current) => ({ activeRound: current.activeRound + 1 }))}>
              Round {round + 2}
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={() => setView("board")}
            >
              {finished ? "Final board" : "See the board"}
            </button>
          )}
          {round > 0 && (
            <button type="button" className="ghost" onClick={() => patch((current) => ({ activeRound: current.activeRound - 1 }))}>
              Round {round}
            </button>
          )}
        </div>
      </div>

      <div className="panel-draw">
        <DrawSheet
          session={session}
          activeRound={round}
          onOpenRound={(next) => {
            patch(() => ({ activeRound: next }));
            setView("round");
          }}
        />
      </div>

      <div className="panel-board">
        <Leaderboard
          table={table}
          totalMatches={ROUND_COUNT * COURT_COUNT}
          entered={entered}
          finished={finished}
        />
      </div>
      {sessionOpen && (
        <div className="session-sheet" role="dialog" aria-label="Session">
          <div className="session-sheet-head">
            <h2>Session</h2>
            <button type="button" className="ghost" onClick={() => setSessionOpen(false)}>
              Close
            </button>
          </div>
          <section className="session-block">
            <h3>Start over</h3>
            <p>Clears every score and returns to round 1. The same twelve players stay.</p>
            {confirming === "restart" ? (
              <div className="confirm">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    onSession((current) => ({
                      ...current,
                      activeRound: 0,
                      scores: current.scores.map((row) =>
                        row.map(() => ({ a: null, b: null, linked: current.pointsTotal != null })),
                      ),
                    }));
                    setConfirming(null);
                    setSessionOpen(false);
                    setView("round");
                  }}
                >
                  Clear the scores
                </button>
                <button type="button" className="ghost" onClick={() => setConfirming(null)}>
                  Keep playing
                </button>
              </div>
            ) : (
              <button type="button" className="primary" onClick={() => setConfirming("restart")}>
                Start over
              </button>
            )}
          </section>
          <section className="session-block">
            <h3>Change the players</h3>
            <p>Clears the scores and opens the name list. The names you typed stay.</p>
            {confirming === "players" ? (
              <div className="confirm">
                <button type="button" className="primary" onClick={() => onRetire(sessionToDraft(session))}>
                  Back to the names
                </button>
                <button type="button" className="ghost" onClick={() => setConfirming(null)}>
                  Keep playing
                </button>
              </div>
            ) : (
              <button type="button" className="ghost" onClick={() => setConfirming("players")}>
                Change the players
              </button>
            )}
          </section>
          <button type="button" className="ghost" onClick={() => void copyResults()}>
            {copied ? "Copied" : "Copy the board"}
          </button>
          <section className="session-block">
            <h3>Fix a name</h3>
            <NameList
              title="Left"
              names={session.left.map((player) => player.name)}
              onChange={(index, name) =>
                patch((current) => ({
                  left: current.left.map((player, playerIndex) =>
                    playerIndex === index ? { ...player, name } : player,
                  ),
                }))
              }
            />
            <NameList
              title="Right"
              names={session.right.map((player) => player.name)}
              onChange={(index, name) =>
                patch((current) => ({
                  right: current.right.map((player, playerIndex) =>
                    playerIndex === index ? { ...player, name } : player,
                  ),
                }))
              }
            />
          </section>
          <p className="fine">Scores stay on this phone.</p>
        </div>
      )}
    </div>
  );
}

function NameList({
  title,
  names,
  onChange,
}: {
  title: string;
  names: string[];
  onChange: (index: number, name: string) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {names.map((name, index) => (
        <input
          key={index}
          value={name}
          maxLength={40}
          aria-label={`${title} player ${index + 1}`}
          onChange={(event) => {
            const next = event.target.value.replace(/\s+/g, " ");
            if (next.trim() === "") return;
            onChange(index, next);
          }}
        />
      ))}
    </fieldset>
  );
}
