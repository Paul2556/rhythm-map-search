import fs from "fs";
import path from "path";

/**
 * Set by electron/main.js to app.getPath("userData") when packaged, so saved
 * credentials survive app updates. Falls back to a local gitignored folder
 * for `next dev`.
 */
function getDataDir(): string {
  return process.env.RHYTHM_MAP_SEARCH_DATA_DIR || path.join(process.cwd(), ".data");
}

function getConfigPath(): string {
  return path.join(getDataDir(), "config.json");
}

interface StoredConfig {
  osuClientId?: string;
  osuClientSecret?: string;
}

function readConfig(): StoredConfig {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config: StoredConfig) {
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

export function getOsuCredentials(): { clientId: string | null; clientSecret: string | null } {
  // Env vars win, for `.env.local` convenience during development.
  if (process.env.OSU_CLIENT_ID && process.env.OSU_CLIENT_SECRET) {
    return { clientId: process.env.OSU_CLIENT_ID, clientSecret: process.env.OSU_CLIENT_SECRET };
  }
  const stored = readConfig();
  return { clientId: stored.osuClientId ?? null, clientSecret: stored.osuClientSecret ?? null };
}

export function saveOsuCredentials(clientId: string, clientSecret: string) {
  writeConfig({ ...readConfig(), osuClientId: clientId, osuClientSecret: clientSecret });
}

export function clearOsuCredentials() {
  const config = readConfig();
  delete config.osuClientId;
  delete config.osuClientSecret;
  writeConfig(config);
}
