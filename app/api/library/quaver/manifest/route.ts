import { NextRequest, NextResponse } from "next/server";
import { resolveLibraryMap } from "@/lib/game/quaverLibrary";
import type { MapManifest } from "@/lib/game/mapTypes";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const dir = req.nextUrl.searchParams.get("dir");
  if (!id || !dir) return NextResponse.json({ error: "Missing id or dir." }, { status: 400 });

  const resolved = resolveLibraryMap(id, dir);
  if (!resolved) return NextResponse.json({ error: "Map not found in that folder." }, { status: 404 });

  const { parsed } = resolved;
  const manifest: MapManifest = {
    source: "quaver-local",
    id,
    title: parsed.title,
    artist: parsed.artist,
    bpm: parsed.bpm,
    lengthMs: parsed.lengthMs,
    notes: parsed.notes,
    audioUrl: `/api/library/quaver/audio?id=${encodeURIComponent(id)}&dir=${encodeURIComponent(dir)}`,
  };

  return NextResponse.json(manifest);
}
