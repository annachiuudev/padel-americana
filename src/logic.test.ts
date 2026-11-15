import { ROUNDS } from "./schedule";
import {
  createSession,
  emptyDraft,
  formatResults,
  parseRoster,
  placeFromBench,
  relinkScore,
  rosterStatus,
  standings,
  stepScore,
  updateSide,
} from "./logic";
import { SAMPLE_PASTE } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const numbered = parseRoster("1. Mina\n2) Jonas\n3 - Aisha\n- Leo\n• Noor\n* Hugo, Sara; Mateo|Ines\nPavel\nChiara\nOmar\nMina");
assertEqual(numbered.left[0], "Mina", "numbered first name");
assertEqual(numbered.left[2], "Aisha", "dashed number cleaned");
assertEqual(numbered.left[5], "Hugo", "star bullet cleaned");
assertEqual(numbered.right[0], "Sara", "comma split onto the right");
assertEqual(numbered.right[5], "Omar", "last name on the right");
assert(numbered.duplicates.includes("Mina"), "duplicate reported");

const split = parseRoster("Mina\nJonas\nAisha\nLeo\nNoor\nHugo\n\nSara\nMateo\nInes\nPavel\nChiara\nOmar\n");
assertEqual(split.left.join(","), "Mina,Jonas,Aisha,Leo,Noor,Hugo", "blank line left side");
assertEqual(split.right.join(","), "Sara,Mateo,Ines,Pavel,Chiara,Omar", "blank line right side");
assertEqual(split.bench.length, 0, "no bench");

const sample = parseRoster(SAMPLE_PASTE);
const draft = {
  ...emptyDraft(),
  ...sample,
  pointsTotal: 24 as number | null,
};
assert(rosterStatus(draft).ok, rosterStatus(draft).message);

const overflow = parseRoster("A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nL\nM");
assertEqual(overflow.bench[0], "M", "13th name waits out");
const placed = placeFromBench(overflow.left.map((name, index) => (index === 5 ? null : name)), overflow.bench, 0);
assert(placed, "bench player can take an empty spot");
assertEqual(placed.slots[5], "M", "placed into the empty left spot");

const session = createSession(draft);
assertEqual(session.left.length, 6, "six left");
assertEqual(session.scores.length, 6, "six rounds");
assertEqual(session.scores[0]?.[0]?.linked, true, "scores start linked to 24");

const stepped = stepScore(session.scores[0]![0]!, "a", 1, 24);
assertEqual(stepped.a, 1, "first point");
assertEqual(stepped.b, 23, "other side keeps the total");
const typed = updateSide(stepped, "b", 8, 24);
assertEqual(typed.a, 16, "typing one side fills the other");
assertEqual(typed.b, 8, "typed side kept");
const cleared = updateSide(typed, "a", null, 24);
assertEqual(cleared.a, null, "clearing one linked side clears both");
assertEqual(cleared.b, null, "linked partner cleared");

const open = updateSide({ a: null, b: null, linked: false }, "a", 7, null);
assertEqual(open.a, 7, "open score");
assertEqual(open.b, null, "open partner stays empty");
const relinked = relinkScore({ a: 30, b: 4, linked: false }, 24);
assertEqual(relinked.a, 24, "relink clamps");
assertEqual(relinked.b, 0, "relink remainder");

const [teamA, teamB] = ROUNDS[0]![0]!;
session.scores[0]![0] = { a: 16, b: 8, linked: true };
const table = standings(session);
const leftWinner = table.find((row) => row.id === session.left[teamA[0]]!.id);
const rightWinner = table.find((row) => row.id === session.right[teamA[1]]!.id);
const leftLoser = table.find((row) => row.id === session.left[teamB[0]]!.id);
const rightLoser = table.find((row) => row.id === session.right[teamB[1]]!.id);
assert(leftWinner && rightWinner && leftLoser && rightLoser, "all four players ranked");
assertEqual(leftWinner.points, 16, "winning left player");
assertEqual(rightWinner.points, 16, "winning right player");
assertEqual(leftWinner.wins, 1, "win recorded");
assertEqual(leftWinner.diff, 8, "point difference");
assertEqual(leftLoser.points, 8, "losing points still count");
assertEqual(leftLoser.losses, 1, "loss recorded");
assertEqual(rightLoser.played, 1, "right-side loser played");
assert(leftWinner.rank < leftLoser.rank, "higher points rank first");
assertEqual(leftWinner.results[0]?.partner, rightWinner.name, "partner recorded");
assert(table.filter((row) => row.played === 0).every((row) => row.points === 0), "unplayed stay at zero");

session.scores[0]![1] = { a: 12, b: 12, linked: true };
const tied = standings(session);
const drawCourt = ROUNDS[0]![1]!;
const drawRow = tied.find((row) => row.id === session.left[drawCourt[0][0]]!.id);
assertEqual(drawRow?.draws, 1, "level score is a draw");
assertEqual(drawRow?.wins, 0, "a draw is not a win");

const text = formatResults(session, table);
assert(text.includes("16 pts"), "clipboard includes points");
assert(text.includes("(L)"), "clipboard marks the side");

const tieDraft = { ...draft };
const allZero = standings(createSession(tieDraft));
assert(allZero.every((row) => row.rank === 1), "an unstarted board is one big tie");

console.log("logic ok");
