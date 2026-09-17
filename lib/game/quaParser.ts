import { parse as parseYaml } from "yaml";

interface QuaHitObject {
  StartTime: number;
  Lane: number;
}

interface QuaTimingPoint {
  StartTime: number;
  Bpm: number;
}

interface QuaFile {
  AudioFile?: string;
  Mode?: string;
  Title?: string;
  Artist?: string;
  Creator?: string;
  DifficultyName?: string;
  TimingPoints?: QuaTimingPoint[];
  HitObjects?: QuaHitObject[];
}

export interface ParsedQuaChart {
  bpm: number;
  lengthMs: number;
  notes: { time: number; lane: number }[];
  audioFile: string;
  title: string;
  artist: string;
  creator: string;
  difficultyName: string;
}

/** Parses a .qua chart file (YAML) and returns its 4K notes, or null if this difficulty isn't 4K. */
export function parseQuaFile(text: string): ParsedQuaChart | null {
  let data: QuaFile;
  try {
    data = parseYaml(text) as QuaFile;
  } catch {
    return null;
  }

  if (!data || data.Mode !== "Keys4" || !data.AudioFile || !data.HitObjects?.length) return null;

  const notes = data.HitObjects.map((h) => ({ time: h.StartTime, lane: h.Lane - 1 }))
    .filter((n) => n.lane >= 0 && n.lane <= 3 && Number.isFinite(n.time))
    .sort((a, b) => a.time - b.time || a.lane - b.lane);

  if (!notes.length) return null;

  const bpm = data.TimingPoints?.[0]?.Bpm ?? 120;
  const lengthMs = notes[notes.length - 1].time + 3000;

  return {
    bpm,
    lengthMs,
    notes,
    audioFile: data.AudioFile,
    title: data.Title ?? "Unknown title",
    artist: data.Artist ?? "Unknown artist",
    creator: data.Creator ?? "Unknown",
    difficultyName: data.DifficultyName ?? "Default",
  };
}
