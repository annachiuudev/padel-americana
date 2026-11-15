export type Side = "left" | "right";

export type Player = {
  id: string;
  name: string;
};

/** Null means the court has not been entered yet. Zero is a real score. */
export type CourtScore = {
  a: number | null;
  b: number | null;
  /** When linked, the two scores add up to the session point total. */
  linked: boolean;
};

export type Session = {
  pointsTotal: number | null;
  left: Player[];
  right: Player[];
  scores: CourtScore[][];
  activeRound: number;
  createdAt: string;
};

export type SetupDraft = {
  paste: string;
  left: (string | null)[];
  right: (string | null)[];
  bench: string[];
  pointsTotal: number | null;
};

export type Store = {
  version: 1;
  draft: SetupDraft;
  session: Session | null;
};

export const POINT_CHOICES = [16, 21, 24, 32] as const;

export const SAMPLE_PASTE = `Mina
Jonas
Aisha
Leo
Noor
Hugo

Sara
Mateo
Ines
Pavel
Chiara
Omar`;
