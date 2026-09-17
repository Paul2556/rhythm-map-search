import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { mapDir, readManifest } from "@/lib/game/mapsStore";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manifest = readManifest("quaver", id);
  if (!manifest) return new NextResponse("Not found", { status: 404 });

  const dir = mapDir("quaver", id);
  const audioFile = fs.readdirSync(dir).find((f) => f.startsWith("audio."));
  if (!audioFile) return new NextResponse("Not found", { status: 404 });
  const filePath = path.join(dir, audioFile);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".ogg" ? "audio/ogg" : ext === ".wav" ? "audio/wav" : "audio/mpeg";

  return new NextResponse(new Uint8Array(fs.readFileSync(filePath)), {
    headers: { "Content-Type": contentType },
  });
}
