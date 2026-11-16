import { POINT_CHOICES, SAMPLE_PASTE, type SetupDraft, type Side } from "./types";
import { ROUNDS } from "./schedule";
import {
  exchangeAt,
  moveWithin,
  parseRoster,
  placeFromBench,
  previewTeams,
  rosterStatus,
  sendToBench,
  shuffleFilled,
  slotsFilled,
} from "./logic";

type SetupProps = {
  draft: SetupDraft;
  onDraft: (draft: SetupDraft) => void;
  onStart: () => void;
};

export function SetupScreen({ draft, onDraft, onStart }: SetupProps) {
  const status = rosterStatus(draft);
  const parsed = parseRoster(draft.paste);

  function applyPaste() {
    const next = parseRoster(draft.paste);
    onDraft({ ...draft, left: next.left, right: next.right, bench: next.bench });
  }

  function useSample() {
    const next = parseRoster(SAMPLE_PASTE);
    onDraft({
      ...draft,
      paste: SAMPLE_PASTE,
      left: next.left,
      right: next.right,
      bench: next.bench,
      pointsTotal: draft.pointsTotal ?? 24,
    });
  }

  function patchSide(side: Side, slots: (string | null)[]) {
    onDraft({ ...draft, [side]: slots });
  }

  return (
    <div className="shell">
      <header className="mast">
        <p className="eyebrow">Padel Americano</p>
        <h1>Cross Court</h1>
        <p className="lede">
          Six players on the left, six on the right. Every left player partners every right player, and each
          player keeps their own points.
        </p>
      </header>

      <section className="panel" aria-labelledby="paste-heading">
        <div className="panel-head">
          <h2 id="paste-heading">Paste the list</h2>
          <p>One name per line, or separated by commas. A blank line splits left from right.</p>
        </div>
        <textarea
          className="paste"
          value={draft.paste}
          onChange={(event) => onDraft({ ...draft, paste: event.target.value })}
          rows={8}
          spellCheck={false}
          placeholder={"Mina\nJonas\nAisha\nLeo\nNoor\nHugo\n\nSara\nMateo\nInes\nPavel\nChiara\nOmar"}
          aria-label="Player names"
        />
        <div className="action-row">
          <button type="button" className="primary" onClick={applyPaste}>
            Use this list
          </button>
          <button type="button" className="ghost" onClick={useSample}>
            Sample roster
          </button>
        </div>
        {parsed.duplicates.length > 0 && (
          <p className="warning" role="status">
            Repeated names are skipped: {parsed.duplicates.join(", ")}.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="sides-heading">
        <div className="panel-head">
          <h2 id="sides-heading">Left and right</h2>
          <p>Order is the draw. Position 1 on the left starts with position 1 on the right.</p>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="ghost"
            onClick={() =>
              onDraft({
                ...draft,
                left: shuffleFilled(draft.left),
                right: shuffleFilled(draft.right),
              })
            }
          >
            Shuffle order
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => onDraft({ ...draft, left: draft.right, right: draft.left })}
          >
            Swap sides
          </button>
        </div>
        <div className="sides">
          <SideColumn
            side="left"
            slots={draft.left}
            other={draft.right}
            onSlots={(slots) => patchSide("left", slots)}
            onExchange={(index) => onDraft({ ...draft, ...exchangeAt(draft.left, draft.right, index) })}
            onBench={(index) => {
              const next = sendToBench(draft.left, index, draft.bench);
              onDraft({ ...draft, left: next.slots, bench: next.bench });
            }}
          />
          <SideColumn
            side="right"
            slots={draft.right}
            other={draft.left}
            onSlots={(slots) => patchSide("right", slots)}
            onExchange={(index) => onDraft({ ...draft, ...exchangeAt(draft.left, draft.right, index) })}
            onBench={(index) => {
              const next = sendToBench(draft.right, index, draft.bench);
              onDraft({ ...draft, right: next.slots, bench: next.bench });
            }}
          />
        </div>
        {draft.bench.length > 0 && (
          <div className="bench">
            <h3>Still out</h3>
            <ul>
              {draft.bench.map((name, index) => (
                <li key={`${name}-${index}`}>
                  <span>{name}</span>
                  <button
                    type="button"
                    className="ghost"
                    disabled={slotsFilled(draft.left) >= 6}
                    onClick={() => {
                      const next = placeFromBench(draft.left, draft.bench, index);
                      if (next) onDraft({ ...draft, left: next.slots, bench: next.bench });
                    }}
                  >
                    To left
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={slotsFilled(draft.right) >= 6}
                    onClick={() => {
                      const next = placeFromBench(draft.right, draft.bench, index);
                      if (next) onDraft({ ...draft, right: next.slots, bench: next.bench });
                    }}
                  >
                    To right
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onDraft({ ...draft, bench: draft.bench.filter((_, item) => item !== index) })}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="points-heading">
        <div className="panel-head">
          <h2 id="points-heading">Points in a match</h2>
          <p>Both teams’ scores usually add up to the same total. Each player keeps the points their team scored.</p>
        </div>
        <div className="choices" role="radiogroup" aria-label="Points in a match">
          {POINT_CHOICES.map((points) => (
            <button
              key={points}
              type="button"
              role="radio"
              aria-checked={draft.pointsTotal === points}
              className={draft.pointsTotal === points ? "choice on" : "choice"}
              onClick={() => onDraft({ ...draft, pointsTotal: points })}
            >
              {points}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={draft.pointsTotal == null}
            className={draft.pointsTotal == null ? "choice on" : "choice"}
            onClick={() => onDraft({ ...draft, pointsTotal: null })}
          >
            Open
          </button>
        </div>
      </section>

      <section className="panel" aria-labelledby="preview-heading">
        <div className="panel-head">
          <h2 id="preview-heading">Who plays who</h2>
          <p>Round 1 follows the order above. The other five rounds rotate partners from there.</p>
        </div>
        <ol className="preview">
          {ROUNDS[0]?.map((court, index) => {
            const teams = previewTeams(draft.left, draft.right, court);
            return (
              <li key={index}>
                <span className="court-kicker">Court {index + 1}</span>
                <span className="matchup">
                  <Names pair={teams.a} />
                  <span className="vs">vs</span>
                  <Names pair={teams.b} />
                </span>
              </li>
            );
          })}
        </ol>
        <details className="rules">
          <summary>All six rounds, and the rules</summary>
          <p>
            Three courts, nobody sits out. Partners are always one left player and one right player. Over the
            night every left player partners every right player once, and faces every right player once. Two
            players on the same side meet as opponents at most twice. Each player uses all three courts, and
            nobody stays on the same court for three rounds in a row.
          </p>
          <p>Ties on the board go to wins, then point difference.</p>
          <ol className="draw-list">
            {ROUNDS.map((round, roundIndex) => (
              <li key={roundIndex}>
                <h3>Round {roundIndex + 1}</h3>
                <ul>
                  {round.map((court, courtIndex) => {
                    const teams = previewTeams(draft.left, draft.right, court);
                    return (
                      <li key={courtIndex}>
                        Court {courtIndex + 1}: {teams.a[0]} + {teams.a[1]} vs {teams.b[0]} + {teams.b[1]}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <div className="start-bar">
        <button type="button" className="primary start" disabled={!status.ok} onClick={onStart}>
          {status.message}
        </button>
        <p className="fine">Scores stay on this phone.</p>
      </div>
    </div>
  );
}

function Names({ pair }: { pair: [string, string] }) {
  return (
    <span className="names">
      <span>{pair[0]}</span>
      <span className="plus">+</span>
      <span>{pair[1]}</span>
    </span>
  );
}

function SideColumn({
  side,
  slots,
  other,
  onSlots,
  onExchange,
  onBench,
}: {
  side: Side;
  slots: (string | null)[];
  other: (string | null)[];
  onSlots: (slots: (string | null)[]) => void;
  onExchange: (index: number) => void;
  onBench: (index: number) => void;
}) {
  const title = side === "left" ? "Left" : "Right";
  const destination = side === "left" ? "right" : "left";
  return (
    <div className={`side side-${side}`}>
      <div className="side-title">
        <h3>{title}</h3>
        <span>
          {slotsFilled(slots)}/{slots.length}
        </span>
      </div>
      <ol>
        {slots.map((name, index) => {
          const across = other[index] ?? null;
          const bothEmpty = !name?.trim() && !across?.trim();
          const label = name?.trim() || `${title} position ${index + 1}`;
          return (
            <li key={index} className="slot">
              <span className="slot-num">{index + 1}</span>
              <input
                value={name ?? ""}
                placeholder="Name"
                aria-label={`${title} player ${index + 1}`}
                maxLength={40}
                onChange={(event) => {
                  const next = [...slots];
                  const value = event.target.value;
                  next[index] = value === "" ? null : value;
                  onSlots(next);
                }}
              />
              <div className="slot-actions">
                <button
                  type="button"
                  className="icon"
                  disabled={index === 0}
                  aria-label={`Move ${label} up`}
                  onClick={() => onSlots(moveWithin(slots, index, -1))}
                >
                  <Chevron direction="up" />
                </button>
                <button
                  type="button"
                  className="icon"
                  disabled={index === slots.length - 1}
                  aria-label={`Move ${label} down`}
                  onClick={() => onSlots(moveWithin(slots, index, 1))}
                >
                  <Chevron direction="down" />
                </button>
                <button
                  type="button"
                  className="text-action"
                  disabled={bothEmpty}
                  aria-label={exchangeLabel(name, across, destination)}
                  onClick={() => onExchange(index)}
                >
                  {name?.trim() && across?.trim() ? "Swap" : name?.trim() ? `To ${destination}` : "Bring"}
                </button>
                <button
                  type="button"
                  className="text-action"
                  disabled={!name?.trim()}
                  aria-label={`Take ${label} out of the draw`}
                  onClick={() => onBench(index)}
                >
                  Out
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function exchangeLabel(here: string | null, there: string | null, destination: "left" | "right") {
  const place = destination === "left" ? "left" : "right";
  if (here?.trim() && there?.trim()) return `Swap ${here.trim()} with ${there.trim()}`;
  if (here?.trim()) return `Move ${here.trim()} to the ${place}`;
  if (there?.trim()) return `Bring ${there.trim()} over`;
  return "Swap across";
}

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={direction === "up" ? "M3 10.5 8 5.5 13 10.5" : "M3 5.5 8 10.5 13 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
