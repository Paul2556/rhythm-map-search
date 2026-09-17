import { NextRequest, NextResponse } from "next/server";
import { clearOsuCredentials, getOsuCredentials, saveOsuCredentials } from "@/lib/serverConfig";

export async function GET() {
  const { clientId } = getOsuCredentials();
  return NextResponse.json({ configured: Boolean(clientId), clientId: clientId ?? "" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";

  if (!clientId || !clientSecret) {
    clearOsuCredentials();
    return NextResponse.json({ configured: false });
  }

  saveOsuCredentials(clientId, clientSecret);
  return NextResponse.json({ configured: true });
}
