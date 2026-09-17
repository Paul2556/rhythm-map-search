export type MapSourceKind = "osu" | "quaver" | "quaver-local";

export interface MapManifest {
  source: MapSourceKind;
  id: string;
  title: string;
  artist: string;
  bpm: number;
  lengthMs: number;
  notes: { time: number; lane: number }[];
  audioUrl: string;
}
