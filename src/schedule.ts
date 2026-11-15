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
 *
 * The round list was searched so both of those cross conditions hold
 * and same-side rematches stay at two.
 */
export const ROUNDS: readonly RoundTemplate[] = [
  [
    [[0, 0], [1, 1]],
    [[2, 2], [3, 3]],
    [[4, 4], [5, 5]],
  ],
  [
    [[0, 4], [2, 3]],
    [[1, 0], [3, 5]],
    [[4, 2], [5, 1]],
  ],
  [
    [[0, 3], [4, 0]],
    [[1, 5], [5, 2]],
    [[2, 4], [3, 1]],
  ],
  [
    [[0, 5], [3, 4]],
    [[1, 2], [4, 3]],
    [[2, 1], [5, 0]],
  ],
  [
    [[0, 2], [2, 5]],
    [[1, 4], [4, 1]],
    [[3, 0], [5, 3]],
  ],
  [
    [[0, 1], [3, 2]],
    [[1, 3], [5, 4]],
    [[2, 0], [4, 5]],
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

  rounds.forEach((round, roundIndex) => {
    if (round.length !== COURT_COUNT) {
      errors.push(`round ${roundIndex + 1} has ${round.length} courts`);
    }
    const lefts = new Set<number>();
    const rights = new Set<number>();
    for (const [teamA, teamB] of round) {
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
    }
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

  return errors;
}
