// Next's `output: "standalone"` server doesn't include static assets or the
// public/ folder — the docs say to copy them in manually before packaging.
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error('.next/standalone not found — did `next build` run with output: "standalone"?');
  process.exit(1);
}

cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });

// electron-builder's file copier hardcodes an exclusion for a `node_modules`
// dir that sits *directly* at the root of an extraResources `from` path,
// with no way to opt out via `filter` (app-builder-lib/out/util/filter.js).
// Nesting the whole server one level deeper — root/server/... instead of
// root/... — keeps `node_modules` from ever being at that exact root, so it
// survives packaging.
const staged = path.join(root, ".next", "standalone-app");
rmSync(staged, { recursive: true, force: true });
mkdirSync(staged, { recursive: true });
renameSync(standalone, path.join(staged, "server"));

console.log("Staged .next/standalone-app/server for packaging (with static/ and public/ copied in)");
