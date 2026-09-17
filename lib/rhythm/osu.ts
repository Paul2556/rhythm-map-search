import { getOsuCredentials } from "@/lib/serverConfig";
import type { MapsetStatus, SourceSearchResult, UnifiedMapset } from "./types";

const TOKEN_URL = "https://osu.ppy.sh/oauth/token";
const API_BASE = "https://osu.ppy.sh/api/v2";

// osu! mania mode id, per the beatmapsets/search `m` param.
const MODE_MANIA = 3;

interface OsuTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: OsuTokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getOsuCredentials();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing osu! credentials. Create an OAuth app at https://osu.ppy.sh/home/account/edit#oauth and add the client id/secret in Settings.",
    );
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 10_000) {
    return tokenCache.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });

  if (!res.ok) {
    throw new Error(`osu! token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

interface OsuCovers {
  cover?: string;
  "cover@2x"?: string;
  card?: string;
  "card@2x"?: string;
  list?: string;
  "list@2x"?: string;
}

interface OsuBeatmap {
  difficulty_rating: number;
  bpm: number | null;
}

interface OsuBeatmapset {
  id: number;
  title: string;
  artist: string;
  creator: string;
  status: string;
  play_count: number;
  last_updated: string | null;
  covers: OsuCovers;
  beatmaps?: OsuBeatmap[];
}

interface OsuSearchResponse {
  beatmapsets: OsuBeatmapset[];
  total: number;
  error?: string | null;
}

function normalizeStatus(status: string): MapsetStatus {
  switch (status) {
    case "ranked":
    case "qualified":
    case "loved":
    case "pending":
    case "graveyard":
      return status;
    case "wip":
      return "pending";
    default:
      return "unknown";
  }
}

function toUnified(set: OsuBeatmapset): UnifiedMapset {
  const ratings = (set.beatmaps ?? []).map((b) => b.difficulty_rating);
  const bpms = (set.beatmaps ?? []).map((b) => b.bpm).filter((b): b is number => b != null);

  return {
    source: "osu",
    id: set.id,
    title: set.title,
    artist: set.artist,
    creator: set.creator,
    status: normalizeStatus(set.status),
    coverUrl: set.covers["cover@2x"] ?? set.covers.cover ?? "",
    pageUrl: `https://osu.ppy.sh/beatmapsets/${set.id}`,
    bpm: bpms.length ? bpms[0] : null,
    playCount: set.play_count ?? null,
    difficultyCount: set.beatmaps?.length ?? 0,
    minDifficultyRating: ratings.length ? Math.min(...ratings) : null,
    maxDifficultyRating: ratings.length ? Math.max(...ratings) : null,
    lastUpdated: set.last_updated,
  };
}

/**
 * Searches osu! for ranked-and-below mania beatmapsets restricted to 4 keys.
 * `keys=4` rides inside the free-text query because osu!'s search grammar
 * (BeatmapsetQueryParser) only exposes key-count filtering that way, not as
 * a dedicated query-string param.
 */
export async function searchOsuMania4K(query: string, page: number): Promise<SourceSearchResult> {
  try {
    const token = await getAccessToken();

    const q = new URLSearchParams({
      m: String(MODE_MANIA),
      s: "any",
      page: String(page),
      q: [query.trim(), "keys=4"].filter(Boolean).join(" "),
    });

    const res = await fetch(`${API_BASE}/beatmapsets/search?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (!res.ok) {
      return { mapsets: [], total: null, error: `osu! API error ${res.status}` };
    }

    const data = (await res.json()) as OsuSearchResponse;

    return { mapsets: data.beatmapsets.map(toUnified), total: data.total ?? null, error: null };
  } catch (err) {
    return { mapsets: [], total: null, error: err instanceof Error ? err.message : "Unknown osu! error" };
  }
}
