import { COURT_COUNT, ROUND_COUNT, SIDES } from "./schedule";
import { emptyDraft } from "./logic";
import type { CourtScore, Player, Session, SetupDraft, Store } from "./types";

const KEY = "cross-court.v1";

export function defaultStore(): Store {
  return { version: 1, draft: emptyDraft(), session: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayer(value: unknown): value is Player {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && value.name.trim() !== "";
}

function isScore(value: unknown): value is CourtScore {
  if (!isRecord(value) || typeof value.linked !== "boolean") return false;
  const valid = (point: unknown) => point === null || (typeof point === "number" && Number.isInteger(point) && point >= 0 && point <= 99);
  return valid(value.a) && valid(value.b);
}

function isNameSlot(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length <= 80);
}

function readDraft(value: unknown): SetupDraft | null {
  if (!isRecord(value)) return null;
  if (typeof value.paste !== "string") return null;
  if (!Array.isArray(value.left) || value.left.length !== SIDES || !value.left.every(isNameSlot)) return null;
  if (!Array.isArray(value.right) || value.right.length !== SIDES || !value.right.every(isNameSlot)) return null;
  if (!Array.isArray(value.bench) || !value.bench.every((name) => typeof name === "string")) return null;
  const points = value.pointsTotal;
  if (points !== null && (typeof points !== "number" || !Number.isInteger(points) || points < 1 || points > 99)) return null;
  return {
    paste: value.paste,
    left: value.left,
    right: value.right,
    bench: value.bench.filter((name) => name.trim() !== ""),
    pointsTotal: points,
  };
}

function readSession(value: unknown): Session | null {
  if (!isRecord(value)) return null;
  const points = value.pointsTotal;
  if (points !== null && (typeof points !== "number" || !Number.isInteger(points) || points < 1 || points > 99)) return null;
  if (!Array.isArray(value.left) || value.left.length !== SIDES || !value.left.every(isPlayer)) return null;
  if (!Array.isArray(value.right) || value.right.length !== SIDES || !value.right.every(isPlayer)) return null;
  if (!Array.isArray(value.scores) || value.scores.length !== ROUND_COUNT) return null;
  const scores = value.scores.map((round) => {
    if (!Array.isArray(round) || round.length !== COURT_COUNT || !round.every(isScore)) return null;
    return round;
  });
  if (scores.some((round) => round === null)) return null;
  const active = value.activeRound;
  if (typeof active !== "number" || active < 0 || active >= ROUND_COUNT) return null;
  if (typeof value.createdAt !== "string") return null;
  return {
    pointsTotal: points,
    left: value.left,
    right: value.right,
    scores: scores as CourtScore[][],
    activeRound: active,
    createdAt: value.createdAt,
  };
}

export function sanitizeStore(value: unknown): Store {
  if (!isRecord(value) || value.version !== 1) return defaultStore();
  const draft = readDraft(value.draft) ?? emptyDraft();
  const session = value.session == null ? null : readSession(value.session);
  return { version: 1, draft, session };
}

export function loadStore(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return defaultStore();
    return sanitizeStore(JSON.parse(raw) as unknown);
  } catch {
    return defaultStore();
  }
}

export function saveStore(store: Store) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(store));
  } catch {
    // A full or blocked storage quota should not stop scoring on screen.
  }
}
