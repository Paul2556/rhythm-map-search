import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resolveLibraryMap } from "@/lib/game/quaverLibrary";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const dir = req.nextUrl.searchParams.get("dir");
  if (!id || !dir) return new NextResponse("Missing id or dir", { status: 400 });

  const resolved = resolveLibraryMap(id, dir);
  if (!resolved) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(resolved.audioPath).toLowerCase();
  const contentType = ext === ".ogg" ? "audio/ogg" : ext === ".wav" ? "audio/wav" : "audio/mpeg";

  return new NextResponse(new Uint8Array(fs.readFileSync(resolved.audioPath)), {
    headers: { "Content-Type": contentType },
  });
}
