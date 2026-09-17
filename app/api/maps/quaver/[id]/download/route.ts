import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import path from "node:path";
import fs from "node:fs";
import { mapDir, readManifest, writeManifest } from "@/lib/game/mapsStore";
import { parseQuaFile } from "@/lib/game/quaParser";

const DOWNLOAD_URL = "https://api.quavergame.com/v2/download/mapset";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = readManifest("quaver", id);
  if (existing) return NextResponse.json(existing);

  const res = await fetch(`${DOWNLOAD_URL}/${id}`);
  if (!res.ok) {
    return NextResponse.json({ error: `Quaver download failed: ${res.status}` }, { status: 502 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return NextResponse.json({ error: "Downloaded file wasn't a valid mapset archive." }, { status: 502 });
  }

  let parsed: ReturnType<typeof parseQuaFile> = null;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.toLowerCase().endsWith(".qua")) continue;
    const candidate = parseQuaFile(entry.getData().toString("utf-8"));
    if (candidate) {
      parsed = candidate;
      break;
    }
  }

  if (!parsed) {
    return NextResponse.json({ error: "No 4-key difficulty found in this mapset." }, { status: 422 });
  }

  const audioEntry = zip.getEntries().find((e) => e.entryName === parsed!.audioFile);
  if (!audioEntry) {
    return NextResponse.json({ error: "This mapset's audio file is missing from the archive." }, { status: 422 });
  }

  const dir = mapDir("quaver", id);
  const audioFileName = `audio${path.extname(parsed.audioFile) || ".mp3"}`;
  fs.writeFileSync(path.join(dir, audioFileName), audioEntry.getData());

  const manifest = {
    source: "quaver" as const,
    id,
    title: parsed.title,
    artist: parsed.artist,
    bpm: parsed.bpm,
    lengthMs: parsed.lengthMs,
    notes: parsed.notes,
    audioUrl: `/api/maps/quaver/${id}/audio`,
  };

  writeManifest(manifest);
  return NextResponse.json(manifest);
}
