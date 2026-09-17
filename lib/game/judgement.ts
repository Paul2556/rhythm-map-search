export type Judgement = "marvelous" | "perfect" | "great" | "good" | "okay" | "miss";

/** Modeled after Quaver's default judgement timing windows (ms of allowed error). */
export const JUDGEMENT_WINDOWS_MS: Record<Exclude<Judgement, "miss">, number> = {
  marvelous: 18,
  perfect: 43,
  great: 76,
  good: 106,
  okay: 127,
};

export const MISS_WINDOW_MS = 164;

export const JUDGEMENT_WEIGHT: Record<Judgement, number> = {
  marvelous: 100,
  perfect: 99,
  great: 65,
  good: 25,
  okay: 5,
  miss: 0,
};

export const JUDGEMENT_COLOR: Record<Judgement, string> = {
  marvelous: "#facc15",
  perfect: "#60a5fa",
  great: "#34d399",
  good: "#a3e635",
  okay: "#fb923c",
  miss: "#f87171",
};

export function classify(deltaMs: number): Judgement {
  const abs = Math.abs(deltaMs);
  if (abs <= JUDGEMENT_WINDOWS_MS.marvelous) return "marvelous";
  if (abs <= JUDGEMENT_WINDOWS_MS.perfect) return "perfect";
  if (abs <= JUDGEMENT_WINDOWS_MS.great) return "great";
  if (abs <= JUDGEMENT_WINDOWS_MS.good) return "good";
  if (abs <= JUDGEMENT_WINDOWS_MS.okay) return "okay";
  return "miss";
}

export function emptyJudgeCounts(): Record<Judgement, number> {
  return { marvelous: 0, perfect: 0, great: 0, good: 0, okay: 0, miss: 0 };
}
