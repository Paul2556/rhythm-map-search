import { NextRequest, NextResponse } from "next/server";
import { search4KMapsets, type MapSource } from "@/lib/rhythm";

const VALID_SOURCES: MapSource[] = ["osu", "quaver"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const sourceParam = searchParams.get("source");

  const sources = sourceParam && VALID_SOURCES.includes(sourceParam as MapSource)
    ? [sourceParam as MapSource]
    : VALID_SOURCES;

  const result = await search4KMapsets(query, page, sources);

  return NextResponse.json(result);
}
