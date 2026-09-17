import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { expandHome, scanQuaverLibrary } from "@/lib/game/quaverLibrary";

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get("dir");
  if (!dir) return NextResponse.json({ error: "Missing dir." }, { status: 400 });
  if (!fs.existsSync(expandHome(dir))) return NextResponse.json({ error: "That folder doesn't exist." }, { status: 404 });

  const maps = scanQuaverLibrary(dir);
  return NextResponse.json({ maps });
}
