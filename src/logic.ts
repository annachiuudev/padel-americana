import { COURT_COUNT, ROUND_COUNT, ROUNDS, SIDES, type CourtTemplate, type Partnership } from "./schedule";
import type { CourtScore, Player, Session, SetupDraft, Side } from "./types";

export function emptySlots(): (string | null)[] {
  return Array.from({ length: SIDES }, () => null);
}

export function emptyDraft(): SetupDraft {
  return {
    paste: "",
    left: emptySlots(),
    right: emptySlots(),
    bench: [],
    pointsTotal: 24,
  };
}

export function blankScore(linked: boolean): CourtScore {
  return { a: null, b: null, linked };
}

function cleanToken(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*•]+|\d+\s*[.)\-:])\s*/, "")
    .replace(/^["'«]+|["'»]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedRoster = {
  left: (string | null)[];
  right: (string | null)[];
  bench: string[];
  duplicates: string[];
};

/** Split a pasted list into the two sides. A blank line keeps the groups apart. */
export function parseRoster(text: string): ParsedRoster {
  const groups: string[][] = [];
  let current: string[] = [];
  const pushCurrent = () => {
    if (current.length > 0) groups.push(current);
    current = [];
  };

  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") {
      pushCurrent();
      continue;
    }
    for (const part of line.split(/[,;|\t]+/)) {
      const name = cleanToken(part);
      if (name) current.push(name);
    }
  }
  pushCurrent();

  const seen = new Set<string>();
  const duplicates: string[] = [];
  const uniqueGroups = groups.map((group) => {
    const names: string[] = [];
    for (const name of group) {
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) {
        duplicates.push(name);
        continue;
      }
      seen.add(key);
      names.push(name);
    }
    return names;
  });

  const left = emptySlots();
  const right = emptySlots();
  const bench: string[] = [];

  const fill = (target: (string | null)[], names: string[]) => {
    names.forEach((name, index) => {
      if (index < SIDES) target[index] = name;
      else bench.push(name);
    });
  };

  if (uniqueGroups.length >= 2) {
    fill(left, uniqueGroups[0] ?? []);
    fill(right, uniqueGroups[1] ?? []);
    for (const extra of uniqueGroups.slice(2)) bench.push(...extra);
  } else {
    const names = uniqueGroups[0] ?? [];
    fill(left, names.slice(0, SIDES));
    fill(right, names.slice(SIDES, SIDES * 2));
    bench.push(...names.slice(SIDES * 2));
  }

  return { left, right, bench, duplicates };
}

export function slotsFilled(slots: readonly (string | null)[]): number {
  return slots.filter((name) => name?.trim()).length;
}

export type RosterStatus = {
  ok: boolean;
  message: string;
};

export function rosterStatus(draft: SetupDraft): RosterStatus {
  const leftMissing = SIDES - slotsFilled(draft.left);
  const rightMissing = SIDES - slotsFilled(draft.right);
  if (leftMissing > 0 || rightMissing > 0) {
    const parts: string[] = [];
    if (leftMissing > 0) parts.push(`${leftMissing} more on the left`);
    if (rightMissing > 0) parts.push(`${rightMissing} more on the right`);
    return { ok: false, message: `Need ${parts.join(" and ")}` };
  }

  const names = [...draft.left, ...draft.right].map((name) => name?.trim() ?? "");
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.toLocaleLowerCase();
    const first = seen.get(key);
    if (first) return { ok: false, message: `${first} is listed twice` };
    seen.set(key, name);
  }

  if (draft.bench.length === 1) {
    return { ok: false, message: `${draft.bench[0]} is still out` };
  }
  if (draft.bench.length > 1) {
    return { ok: false, message: `${draft.bench.length} players are still out` };
  }

  return { ok: true, message: "Start the six rounds" };
}

export function createSession(draft: SetupDraft): Session {
  const player = (name: string): Player => ({
    id: crypto.randomUUID(),
    name: name.trim(),
  });
  const linked = draft.pointsTotal != null;
  return {
    pointsTotal: draft.pointsTotal,
    left: draft.left.map((name) => player(name ?? "")),
    right: draft.right.map((name) => player(name ?? "")),
    scores: Array.from({ length: ROUND_COUNT }, () =>
      Array.from({ length: COURT_COUNT }, () => blankScore(linked)),
    ),
    activeRound: 0,
    createdAt: new Date().toISOString(),
  };
}

export function sessionToDraft(session: Session): SetupDraft {
  return {
    paste: "",
    left: session.left.map((player) => player.name),
    right: session.right.map((player) => player.name),
    bench: [],
    pointsTotal: session.pointsTotal,
  };
}

export function moveWithin(slots: readonly (string | null)[], index: number, direction: -1 | 1): (string | null)[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= slots.length) return [...slots];
  const next = [...slots];
  const current = next[index] ?? null;
  next[index] = next[nextIndex] ?? null;
  next[nextIndex] = current;
  return next;
}

export function exchangeAt(
  left: readonly (string | null)[],
  right: readonly (string | null)[],
  index: number,
): { left: (string | null)[]; right: (string | null)[] } {
  const nextLeft = [...left];
  const nextRight = [...right];
  const leftName = nextLeft[index] ?? null;
  nextLeft[index] = nextRight[index] ?? null;
  nextRight[index] = leftName;
  return { left: nextLeft, right: nextRight };
}

export function shuffleFilled(slots: readonly (string | null)[]): (string | null)[] {
  const next = [...slots];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index] ?? null;
    next[index] = next[swap] ?? null;
    next[swap] = current;
  }
  return next;
}

export function sendToBench(
  slots: readonly (string | null)[],
  index: number,
  bench: readonly string[],
): { slots: (string | null)[]; bench: string[] } {
  const name = slots[index]?.trim();
  if (!name) return { slots: [...slots], bench: [...bench] };
  const next = [...slots];
  next[index] = null;
  return { slots: next, bench: [...bench, name] };
}

export function placeFromBench(
  slots: readonly (string | null)[],
  bench: readonly string[],
  benchIndex: number,
): { slots: (string | null)[]; bench: string[] } | null {
  const empty = slots.findIndex((name) => !name?.trim());
  const name = bench[benchIndex];
  if (empty < 0 || !name) return null;
  const next = [...slots];
  next[empty] = name;
  return { slots: next, bench: bench.filter((_, index) => index !== benchIndex) };
}

export function courtEntered(score: CourtScore | undefined): boolean {
  return !!score && score.a != null && score.b != null;
}

export function roundEntered(session: Session, roundIndex: number): boolean {
  return session.scores[roundIndex]?.every(courtEntered) ?? false;
}

export function enteredMatchCount(session: Session): number {
  return session.scores.flat().filter(courtEntered).length;
}

export function updateSide(
  score: CourtScore,
  side: "a" | "b",
  value: number | null,
  pointsTotal: number | null,
): CourtScore {
  const linked = score.linked && pointsTotal != null;
  const cap = linked ? pointsTotal : 99;
  if (value == null || Number.isNaN(value)) {
    if (linked) return { ...score, a: null, b: null };
    return { ...score, [side]: null };
  }
  const clamped = Math.max(0, Math.min(cap, Math.trunc(value)));
  if (linked) {
    const other = pointsTotal - clamped;
    return side === "a" ? { ...score, a: clamped, b: other } : { ...score, a: other, b: clamped };
  }
  return { ...score, [side]: clamped };
}

export function stepScore(
  score: CourtScore,
  side: "a" | "b",
  delta: -1 | 1,
  pointsTotal: number | null,
): CourtScore {
  const current = side === "a" ? score.a : score.b;
  if (current == null && delta < 0) return score;
  return updateSide(score, side, (current ?? 0) + delta, pointsTotal);
}

export function relinkScore(score: CourtScore, pointsTotal: number): CourtScore {
  if (score.a != null) return updateSide({ ...score, linked: true }, "a", score.a, pointsTotal);
  if (score.b != null) return updateSide({ ...score, linked: true }, "b", score.b, pointsTotal);
  return { a: null, b: null, linked: true };
}

export type PlayerResult = {
  roundIndex: number;
  courtIndex: number;
  partner: string;
  opponents: [string, string];
  points: number;
  against: number;
};

export type Standing = {
  id: string;
  name: string;
  side: Side;
  slot: number;
  points: number;
  against: number;
  diff: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  rank: number;
  results: PlayerResult[];
};

function playersFor(session: Session, partnership: Partnership): [Player, Player] {
  const left = session.left[partnership[0]];
  const right = session.right[partnership[1]];
  if (!left || !right) throw new Error("The draw refers to a missing player.");
  return [left, right];
}

export function standings(session: Session): Standing[] {
  const rows = new Map<string, Standing>();
  const add = (player: Player, side: Side, slot: number) => {
    rows.set(player.id, {
      id: player.id,
      name: player.name,
      side,
      slot,
      points: 0,
      against: 0,
      diff: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      played: 0,
      rank: 0,
      results: [],
    });
  };
  session.left.forEach((player, slot) => add(player, "left", slot));
  session.right.forEach((player, slot) => add(player, "right", slot));

  ROUNDS.forEach((round, roundIndex) => {
    round.forEach((court, courtIndex) => {
      const score = session.scores[roundIndex]?.[courtIndex];
      if (!courtEntered(score)) return;
      const teamA = playersFor(session, court[0]);
      const teamB = playersFor(session, court[1]);
      record(rows, teamA, teamB, score.a ?? 0, score.b ?? 0, roundIndex, courtIndex);
      record(rows, teamB, teamA, score.b ?? 0, score.a ?? 0, roundIndex, courtIndex);
    });
  });

  const list = [...rows.values()];
  for (const row of list) row.diff = row.points - row.against;
  list.sort(
    (a, b) => b.points - a.points || b.wins - a.wins || b.diff - a.diff || a.name.localeCompare(b.name),
  );
  let rank = 0;
  list.forEach((row, index) => {
    const previous = list[index - 1];
    if (
      !previous ||
      previous.points !== row.points ||
      previous.wins !== row.wins ||
      previous.diff !== row.diff
    ) {
      rank = index + 1;
    }
    row.rank = rank;
  });
  return list;
}

function record(
  rows: Map<string, Standing>,
  team: [Player, Player],
  opponents: [Player, Player],
  points: number,
  against: number,
  roundIndex: number,
  courtIndex: number,
) {
  for (const player of team) {
    const row = rows.get(player.id);
    if (!row) continue;
    const partner = team[0].id === player.id ? team[1] : team[0];
    row.points += points;
    row.against += against;
    row.played += 1;
    if (points > against) row.wins += 1;
    else if (points < against) row.losses += 1;
    else row.draws += 1;
    row.results.push({
      roundIndex,
      courtIndex,
      partner: partner.name,
      opponents: [opponents[0].name, opponents[1].name],
      points,
      against,
    });
  }
}

export function leaders(table: readonly Standing[]): Standing[] {
  const top = table[0];
  if (!top || top.played === 0) return [];
  return table.filter((row) => row.rank === 1 && row.points === top.points);
}

export function formatResults(session: Session, table: readonly Standing[]): string {
  const lines = [
    "Cross Court · Americano",
    "Every left player with every right player",
    session.pointsTotal == null ? "Open scoring" : `${session.pointsTotal}-point matches`,
    "",
  ];
  for (const row of table) {
    const side = row.side === "left" ? "L" : "R";
    const diff = `${row.diff > 0 ? "+" : ""}${row.diff}`;
    lines.push(`${row.rank}. ${row.name} (${side}) — ${row.points} pts, ${row.wins} wins, ${diff}`);
  }
  return lines.join("\n");
}

export function courtTeams(session: Session, court: CourtTemplate): { a: [Player, Player]; b: [Player, Player] } {
  return {
    a: playersFor(session, court[0]),
    b: playersFor(session, court[1]),
  };
}

export function previewTeams(
  left: readonly (string | null)[],
  right: readonly (string | null)[],
  court: CourtTemplate,
): { a: [string, string]; b: [string, string] } {
  const name = (side: Side, slot: number) => {
    const value = (side === "left" ? left : right)[slot];
    return value?.trim() || "—";
  };
  return {
    a: [name("left", court[0][0]), name("right", court[0][1])],
    b: [name("left", court[1][0]), name("right", court[1][1])],
  };
}

export function signedDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}
