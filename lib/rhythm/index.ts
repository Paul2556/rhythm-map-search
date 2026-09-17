import { searchOsuMania4K } from "./osu";
import { searchQuaverMapsets } from "./quaver";
import type { MapSource, UnifiedMapset } from "./types";

export type { MapSource, MapsetStatus, UnifiedMapset } from "./types";

export interface CombinedSearchResult {
  mapsets: UnifiedMapset[];
  errors: Partial<Record<MapSource, string>>;
}

/** Searches both osu! and Quaver for 4K mapsets and merges the results. */
export async function search4KMapsets(
  query: string,
  page: number,
  sources: MapSource[] = ["osu", "quaver"],
): Promise<CombinedSearchResult> {
  const tasks = sources.map(async (source) => {
    const result = source === "osu" ? await searchOsuMania4K(query, page) : await searchQuaverMapsets(query, page);
    return { source, result };
  });

  const settled = await Promise.all(tasks);

  const mapsets: UnifiedMapset[] = [];
  const errors: Partial<Record<MapSource, string>> = {};

  for (const { source, result } of settled) {
    mapsets.push(...result.mapsets);
    if (result.error) errors[source] = result.error;
  }

  return { mapsets, errors };
}
