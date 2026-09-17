import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseQuaFile } from "./quaParser";

export interface LibraryDifficulty {
  id: string;
  difficultyName: string;
  creator: string;
}

export interface LibraryMapsetEntry {
  mapsetKey: string;
  title: string;
  artist: string;
  difficulties: LibraryDifficulty[];
}

/** Node's fs never expands `~` the way a shell would, so do it ourselves for paths typed into the UI. */
export function expandHome(dir: string): string {
  if (dir === "~") return os.homedir();
  if (dir.startsWith("~/") || dir.startsWith("~\\")) return path.join(os.homedir(), dir.slice(2));
  return dir;
}

function collectQuaFiles(dir: string, depth: number, out: string[]) {
  if (depth < 0) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectQuaFiles(full, depth - 1, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".qua")) {
      out.push(full);
    }
  }
}

/** Scans a local Quaver install's Songs folder for already-downloaded 4K maps, grouped by mapset with every difficulty listed. */
export function scanQuaverLibrary(rootDir: string): LibraryMapsetEntry[] {
  const quaFiles: string[] = [];
  collectQuaFiles(expandHome(rootDir), 4, quaFiles);

  const mapsets = new Map<string, LibraryMapsetEntry>();

  for (const quaPath of quaFiles) {
    let text: string;
    try {
      text = fs.readFileSync(quaPath, "utf-8");
    } catch {
      continue;
    }

    const parsed = parseQuaFile(text);
    if (!parsed) continue;

    const mapsetKey = `${parsed.title}::${parsed.artist}`;
    let mapset = mapsets.get(mapsetKey);
    if (!mapset) {
      mapset = { mapsetKey, title: parsed.title, artist: parsed.artist, difficulties: [] };
      mapsets.set(mapsetKey, mapset);
    }

    mapset.difficulties.push({
      id: Buffer.from(quaPath).toString("base64url"),
      difficultyName: parsed.difficultyName,
      creator: parsed.creator,
    });
  }

  return Array.from(mapsets.values());
}

/** Resolves a library map id back to its .qua and audio file, refusing anything outside `rootDir`. */
export function resolveLibraryMap(id: string, rootDir: string) {
  const quaPath = Buffer.from(id, "base64url").toString("utf-8");
  const resolvedRoot = path.resolve(expandHome(rootDir));
  const resolvedQua = path.resolve(quaPath);

  if (!resolvedQua.startsWith(resolvedRoot + path.sep)) return null;
  if (!fs.existsSync(resolvedQua)) return null;

  const text = fs.readFileSync(resolvedQua, "utf-8");
  const parsed = parseQuaFile(text);
  if (!parsed) return null;

  const audioPath = path.join(path.dirname(resolvedQua), parsed.audioFile);
  if (!fs.existsSync(audioPath)) return null;

  return { parsed, audioPath };
}
