export type SourceFilter = "both" | "osu" | "quaver";
export type ScrollDirection = "down" | "up";
export type NoteShape = "bar" | "circle";

export interface GameSettings {
  /** 4 keys, one per lane, lowercase KeyboardEvent.key values. */
  keyBindings: [string, string, string, string];
  /** Higher is faster. Modeled after osu!mania/Quaver scroll speed scales. */
  scrollSpeed: number;
  scrollDirection: ScrollDirection;
  /** Shifts when a keypress is judged relative to the note, in ms. */
  audioOffsetMs: number;
  masterVolume: number;
  musicVolume: number;
  hitSoundVolume: number;
  /** 0 (transparent) to 100 (fully black) overlay behind the note highway. */
  backgroundDim: number;
  laneCoverTop: boolean;
  laneCoverBottom: boolean;
  hitLighting: boolean;
  noteShape: NoteShape;
  /** Best-effort palette pulled from an imported Quaver .qs skin's skin.ini; null uses the built-in colors. */
  skinName: string | null;
  laneColors: [string, string, string, string] | null;
}

export interface AppSettings {
  defaultSource: SourceFilter;
  game: GameSettings;
  /** Local folder to scan for maps already downloaded via the real Quaver client. */
  quaverLibraryPath: string | null;
}

const STORAGE_KEY = "rhythm-map-search:settings";

const DEFAULT_GAME_SETTINGS: GameSettings = {
  keyBindings: ["d", "f", "j", "k"],
  scrollSpeed: 20,
  scrollDirection: "down",
  audioOffsetMs: 0,
  masterVolume: 80,
  musicVolume: 80,
  hitSoundVolume: 60,
  backgroundDim: 70,
  laneCoverTop: false,
  laneCoverBottom: false,
  hitLighting: true,
  noteShape: "bar",
  skinName: null,
  laneColors: null,
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultSource: "both",
  game: DEFAULT_GAME_SETTINGS,
  quaverLibraryPath: null,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      game: { ...DEFAULT_GAME_SETTINGS, ...(parsed.game ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
