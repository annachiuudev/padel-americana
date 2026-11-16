/** One left-slot player partnered with one right-slot player. */
export type Partnership = readonly [left: number, right: number];

/** Two partnerships facing each other on one court. */
export type CourtTemplate = readonly [Partnership, Partnership];

export type RoundTemplate = readonly [CourtTemplate, CourtTemplate, CourtTemplate];

export const SIDES = 6;
export const ROUND_COUNT = 6;
export const COURT_COUNT = 3;

/**
 * Cross Americano for 6 left and 6 right players on 3 courts.
 *
 * Across the six rounds:
 * - every left slot partners every right slot exactly once
 * - every left slot opposes every right slot exactly once
 * - any two players on the same side meet as opponents at most twice
 * - every player uses all three courts, at most three times, and never three rounds in a row
 *
 * Who shares a court is fixed by the pairings. Court order was searched so that,
 * within those pairings, players move courts as evenly as possible.
 */
export const ROUNDS: readonly RoundTemplate[] = [
  [
    [[0, 0], [3, 3]],
    [[1, 1], [5, 5]],
    [[2, 2], [4, 4]],
  ],
  [
    [[3, 2], [5, 4]],
    [[1, 0], [2, 3]],
    [[0, 1], [4, 5]],
  ],
  [
    [[0, 2], [2, 1]],
    [[3, 5], [4, 3]],
    [[1, 4], [5, 0]],
  ],
  [
    [[1, 5], [3, 4]],
    [[2, 0], [4, 1]],
    [[0, 3], [5, 2]],
  ],
  [
    [[2, 5], [5, 3]],
    [[1, 2], [3, 1]],
    [[0, 4], [4, 0]],
  ],
  [
    [[1, 3], [4, 2]],
    [[0, 5], [2, 4]],
    [[3, 0], [5, 1]],
  ],
];

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Returns human-readable problems. An empty list means the draw is valid. */
export function verifySchedule(rounds: readonly RoundTemplate[] = ROUNDS): string[] {
  const errors: string[] = [];
  if (rounds.length !== ROUND_COUNT) {
    errors.push(`expected ${ROUND_COUNT} rounds, got ${rounds.length}`);
  }

  const partners = new Map<string, number>();
  const crossOpponents = new Map<string, number>();
  const leftOpponents = new Map<string, number>();
  const rightOpponents = new Map<string, number>();
  const courtVisits = Array.from({ length: 2 }, () => Array.from({ length: SIDES }, () => [0, 0, 0]));
  const courtStreak = Array.from({ length: 2 }, () => Array.from({ length: SIDES }, () => ({ court: -1, length: 0 })));

  rounds.forEach((round, roundIndex) => {
    if (round.length !== COURT_COUNT) {
      errors.push(`round ${roundIndex + 1} has ${round.length} courts`);
    }
    const lefts = new Set<number>();
    const rights = new Set<number>();
    round.forEach(([teamA, teamB], courtIndex) => {
      for (const [left, right] of [teamA, teamB]) {
        if (left < 0 || left >= SIDES || right < 0 || right >= SIDES) {
          errors.push(`round ${roundIndex + 1} has a slot outside 1–${SIDES}`);
        }
        if (lefts.has(left)) errors.push(`left ${left + 1} plays twice in round ${roundIndex + 1}`);
        if (rights.has(right)) errors.push(`right ${right + 1} plays twice in round ${roundIndex + 1}`);
        lefts.add(left);
        rights.add(right);
      }
      const [leftA, rightA] = teamA;
      const [leftB, rightB] = teamB;
      bump(partners, `${leftA}-${rightA}`);
      bump(partners, `${leftB}-${rightB}`);
      bump(crossOpponents, `${leftA}-${rightB}`);
      bump(crossOpponents, `${leftB}-${rightA}`);
      bump(leftOpponents, [leftA, leftB].sort().join("-"));
      bump(rightOpponents, [rightA, rightB].sort().join("-"));
      const stand = (side: 0 | 1, slot: number) => {
        courtVisits[side][slot][courtIndex] += 1;
        const streak = courtStreak[side][slot];
        streak.length = streak.court === courtIndex ? streak.length + 1 : 1;
        streak.court = courtIndex;
        if (streak.length > 2) {
          const label = side === 0 ? "left" : "right";
          errors.push(`${label} ${slot + 1} stays on court ${courtIndex + 1} for three rounds`);
        }
      };
      const slotsOk = [leftA, leftB, rightA, rightB].every((slot) => slot >= 0 && slot < SIDES);
      if (slotsOk) {
        stand(0, leftA);
        stand(0, leftB);
        stand(1, rightA);
        stand(1, rightB);
      }
    });
    if (lefts.size !== SIDES) errors.push(`round ${roundIndex + 1} does not use every left player`);
    if (rights.size !== SIDES) errors.push(`round ${roundIndex + 1} does not use every right player`);
  });

  for (let left = 0; left < SIDES; left += 1) {
    for (let right = 0; right < SIDES; right += 1) {
      const partnerCount = partners.get(`${left}-${right}`) ?? 0;
      const opposeCount = crossOpponents.get(`${left}-${right}`) ?? 0;
      if (partnerCount !== 1) {
        errors.push(`left ${left + 1} partners right ${right + 1} ${partnerCount} times`);
      }
      if (opposeCount !== 1) {
        errors.push(`left ${left + 1} opposes right ${right + 1} ${opposeCount} times`);
      }
    }
  }

  for (const [pair, count] of leftOpponents) {
    if (count > 2) errors.push(`left players ${pair} meet ${count} times`);
  }
  for (const [pair, count] of rightOpponents) {
    if (count > 2) errors.push(`right players ${pair} meet ${count} times`);
  }

  courtVisits.forEach((sideVisits, side) => {
    sideVisits.forEach((visits, slot) => {
      visits.forEach((count, court) => {
        if (count < 1 || count > 3) {
          const label = side === 0 ? "left" : "right";
          errors.push(`${label} ${slot + 1} plays court ${court + 1} ${count} times`);
        }
      });
    });
  });

  return errors;
}
