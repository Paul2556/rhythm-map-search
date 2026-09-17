import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { MapManifest, MapSourceKind } from "./mapTypes";

export function mapsRoot() {
  return path.join(os.homedir(), ".rhythm-map-search", "maps");
}

export function mapDir(source: MapSourceKind, id: string | number) {
  const dir = path.join(mapsRoot(), source, String(id));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function manifestPath(source: MapSourceKind, id: string | number) {
  return path.join(mapDir(source, id), "manifest.json");
}

export function readManifest(source: MapSourceKind, id: string | number): MapManifest | null {
  const p = manifestPath(source, id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as MapManifest;
  } catch {
    return null;
  }
}

export function writeManifest(manifest: MapManifest) {
  fs.writeFileSync(manifestPath(manifest.source, manifest.id), JSON.stringify(manifest));
}

/** Lists every map previously downloaded through this app (not the local Quaver library). */
export function listDownloadedManifests(): MapManifest[] {
  const sources: MapSourceKind[] = ["osu", "quaver"];
  const manifests: MapManifest[] = [];

  for (const source of sources) {
    const sourceDir = path.join(mapsRoot(), source);
    if (!fs.existsSync(sourceDir)) continue;

    for (const id of fs.readdirSync(sourceDir)) {
      const manifest = readManifest(source, id);
      if (manifest) manifests.push(manifest);
    }
  }

  return manifests;
}
