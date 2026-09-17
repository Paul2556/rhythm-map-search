import { NextResponse } from "next/server";
import { listDownloadedManifests } from "@/lib/game/mapsStore";

export async function GET() {
  return NextResponse.json({ maps: listDownloadedManifests() });
}
