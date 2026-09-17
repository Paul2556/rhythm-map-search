export type MapSource = "osu" | "quaver";

export type MapsetStatus =
  | "ranked"
  | "qualified"
  | "loved"
  | "unranked"
  | "pending"
  | "graveyard"
  | "unknown";

export interface UnifiedMapset {
  source: MapSource;
  /** Id of the mapset on its own platform (not globally unique across sources) */
  id: number;
  title: string;
  artist: string;
  creator: string;
  status: MapsetStatus;
  coverUrl: string;
  pageUrl: string;
  bpm: number | null;
  playCount: number | null;
  difficultyCount: number;
  minDifficultyRating: number | null;
  maxDifficultyRating: number | null;
  lastUpdated: string | null;
}

export interface SearchOptions {
  query: string;
  page: number;
}

export interface SourceSearchResult {
  mapsets: UnifiedMapset[];
  total: number | null;
  error: string | null;
}
