import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";

const HEX_COLOR = /^#?[0-9a-f]{6}$/i;

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

/**
 * Best-effort skin.ini parser. Quaver's skin.ini schema isn't fully publicly documented,
 * so this reads it as generic `Key = Value` lines (ignoring `[Section]` headers) and pulls
 * out the skin's `Name` plus any hex-color-looking values under keys mentioning "colour"/"color".
 */
function parseSkinIni(text: string): { name: string | null; colors: string[] } {
  const lines = text.split(/\r?\n/);
  let name: string | null = null;
  const colors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith(";") || trimmed.startsWith("//")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();

    if (/^name$/i.test(key)) {
      name = value || name;
      continue;
    }

    if (/colou?r/i.test(key)) {
      const hex = normalizeHex(value);
      if (hex) colors.push(hex);
    }
  }

  return { name, colors };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No skin file uploaded." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return NextResponse.json({ error: "Skin file isn't a valid archive (expected a .qs export)." }, { status: 422 });
  }

  const iniEntry = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith("skin.ini"));
  if (!iniEntry) {
    return NextResponse.json({ error: "No skin.ini found in this skin package." }, { status: 422 });
  }

  const { name, colors } = parseSkinIni(iniEntry.getData().toString("utf-8"));

  return NextResponse.json({
    name: name ?? file.name.replace(/\.qs$|\.zip$/i, ""),
    laneColors: colors.length >= 4 ? colors.slice(0, 4) : null,
    colorsFound: colors.length,
  });
}
