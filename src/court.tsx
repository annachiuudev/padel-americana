import { useEffect, useRef, useState } from "react";
import { relinkScore, stepScore, updateSide } from "./logic";
import type { CourtScore, Player } from "./types";

type ScoreUpdate = (score: CourtScore) => CourtScore;

type CourtCardProps = {
  index: number;
  teamA: [Player, Player];
  teamB: [Player, Player];
  score: CourtScore;
  pointsTotal: number | null;
  onChange: (produce: ScoreUpdate) => void;
};

export function CourtCard({ index, teamA, teamB, score, pointsTotal, onChange }: CourtCardProps) {
  const entered = score.a != null && score.b != null;
  const ahead = entered && score.a !== score.b ? (score.a! > score.b! ? "a" : "b") : null;
  const linked = score.linked && pointsTotal != null;

  return (
    <article className={entered ? "court done" : "court"}>
      <header className="court-top">
        <h3>Court {index + 1}</h3>
        <span>{entered ? "Entered" : "Waiting"}</span>
      </header>
      <TeamBlock
        players={teamA}
        side="a"
        score={score}
        pointsTotal={pointsTotal}
        leading={ahead === "a"}
        onChange={onChange}
      />
      <p className="versus">
        <span>vs</span>
      </p>
      <TeamBlock
        players={teamB}
        side="b"
        score={score}
        pointsTotal={pointsTotal}
        leading={ahead === "b"}
        onChange={onChange}
      />
      <footer className="court-foot">
        {linked ? (
          <button type="button" className="text-action" onClick={() => onChange((current) => ({ ...current, linked: false }))}>
            Separate scores
          </button>
        ) : pointsTotal != null ? (
          <button type="button" className="text-action" onClick={() => onChange((current) => relinkScore(current, pointsTotal))}>
            Make them add to {pointsTotal}
          </button>
        ) : (
          <span>Open scoring</span>
        )}
        {entered && (
          <button type="button" className="text-action" onClick={() => onChange((current) => ({ ...current, a: null, b: null }))}>
            Clear
          </button>
        )}
      </footer>
    </article>
  );
}

function TeamBlock({
  players,
  side,
  score,
  pointsTotal,
  leading,
  onChange,
}: {
  players: [Player, Player];
  side: "a" | "b";
  score: CourtScore;
  pointsTotal: number | null;
  leading: boolean;
  onChange: (produce: ScoreUpdate) => void;
}) {
  const label = `${players[0].name} and ${players[1].name}`;
  return (
    <div className={leading ? "team leading" : "team"}>
      <p className="partnership">
        <PlayerName player={players[0]} side="left" />
        <span className="plus">+</span>
        <PlayerName player={players[1]} side="right" />
      </p>
      <ScoreBox
        label={label}
        value={side === "a" ? score.a : score.b}
        cap={score.linked && pointsTotal != null ? pointsTotal : 99}
        onCommit={(value) => onChange((current) => updateSide(current, side, value, pointsTotal))}
        onStep={(base, delta) =>
          onChange((current) => {
            const starting = base == null ? current : updateSide(current, side, base, pointsTotal);
            return stepScore(starting, side, delta, pointsTotal);
          })
        }
      />
    </div>
  );
}

export function PlayerName({ player, side }: { player: Player; side: "left" | "right" }) {
  return (
    <span className="who">
      <span className={`badge ${side}`}>{side === "left" ? "L" : "R"}</span>
      <span title={player.name}>{player.name}</span>
    </span>
  );
}

function ScoreBox({
  label,
  value,
  cap,
  onCommit,
  onStep,
}: {
  label: string;
  value: number | null;
  cap: number;
  onCommit: (value: number | null) => void;
  onStep: (base: number | null, delta: -1 | 1) => void;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : String(value));
  }, [value]);

  const shown = text === "" ? null : Number(text);
  const numeric = shown != null && !Number.isNaN(shown) ? shown : value;

  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => {
          focused.current = false;
          onStep(text === "" ? null : Number(text), -1);
        }}
        disabled={numeric == null || numeric <= 0}
        aria-label={`Remove a point for ${label}`}
      >
        −
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`Points for ${label}`}
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => {
          focused.current = false;
          onCommit(text === "" ? null : Number(text));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <button
        type="button"
        onClick={() => {
          focused.current = false;
          onStep(text === "" ? null : Number(text), 1);
        }}
        disabled={numeric != null && numeric >= cap}
        aria-label={`Add a point for ${label}`}
      >
        +
      </button>
    </div>
  );
}
