import type { MapsetStatus, SourceSearchResult, UnifiedMapset } from "./types";

const API_BASE = "https://api.quavergame.com/v2";

// enums.GameMode: None=0, GameModeKeys4=1, GameModeKeys7=2 (see Quaver/api-v2 enums/game_mode.go)
const MODE_KEYS_4 = 1;

// enums.RankedStatus: NotSubmitted=0, Unranked=1, Ranked=2
const RANKED_STATUS_UNRANKED = 1;
const RANKED_STATUS_RANKED = 2;

const PAGE_SIZE = 30;

interface QuaverMap {
  id: number;
  game_mode: number;
  ranked_status: number;
  difficulty_rating: number;
  bpm: number;
  play_count: number;
}

interface QuaverMapset {
  id: number;
  artist: string;
  title: string;
  creator_username: string;
  date_last_updated: string;
  maps: QuaverMap[];
}

interface QuaverSearchResponse {
  total: number;
  mapsets: QuaverMapset[];
}

function normalizeStatus(maps: QuaverMap[]): MapsetStatus {
  if (maps.some((m) => m.ranked_status === RANKED_STATUS_RANKED)) return "ranked";
  if (maps.some((m) => m.ranked_status === RANKED_STATUS_UNRANKED)) return "unranked";
  return "unknown";
}

function toUnified(set: QuaverMapset): UnifiedMapset {
  const ratings = set.maps.map((m) => m.difficulty_rating);
  const bpms = set.maps.map((m) => m.bpm).filter((b) => b != null);
  const playCount = set.maps.reduce((sum, m) => sum + (m.play_count ?? 0), 0);

  return {
    source: "quaver",
    id: set.id,
    title: set.title,
    artist: set.artist,
    creator: set.creator_username,
    status: normalizeStatus(set.maps),
    coverUrl: `https://cdn.quavergame.com/mapsets/${set.id}.jpg`,
    pageUrl: `https://quavergame.com/mapset/${set.id}`,
    bpm: bpms.length ? bpms[0] : null,
    playCount,
    difficultyCount: set.maps.length,
    minDifficultyRating: ratings.length ? Math.min(...ratings) : null,
    maxDifficultyRating: ratings.length ? Math.max(...ratings) : null,
    lastUpdated: set.date_last_updated,
  };
}

/** Searches Quaver for 4K mapsets. This endpoint is public and needs no auth. */
export async function searchQuaverMapsets(query: string, page: number): Promise<SourceSearchResult> {
  try {
    const q = new URLSearchParams({
      search: query.trim(),
      mode: String(MODE_KEYS_4),
      page: String(Math.max(page - 1, 0)),
      limit: String(PAGE_SIZE),
    });
    q.append("ranked_status", String(RANKED_STATUS_RANKED));
    q.append("ranked_status", String(RANKED_STATUS_UNRANKED));

    const res = await fetch(`${API_BASE}/mapset/search?${q.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { mapsets: [], total: null, error: `Quaver API error ${res.status}` };
    }

    const data = (await res.json()) as QuaverSearchResponse;

    return { mapsets: data.mapsets.map(toUnified), total: data.total ?? null, error: null };
  } catch (err) {
    return { mapsets: [], total: null, error: err instanceof Error ? err.message : "Unknown Quaver error" };
  }
}
