"use client";

import { useEffect, useState } from "react";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  type GameSettings,
  type NoteShape,
  type ScrollDirection,
  type SourceFilter,
} from "@/lib/settings";

const LANE_LABELS = ["Lane 1", "Lane 2", "Lane 3", "Lane 4"];

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-zinc-400">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-white"
      />
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [listeningLane, setListeningLane] = useState<number | null>(null);
  const [skinUploading, setSkinUploading] = useState(false);
  const [skinError, setSkinError] = useState<string | null>(null);
  const [skinNotice, setSkinNotice] = useState<string | null>(null);
  const [libraryPathInput, setLibraryPathInput] = useState("");
  const [libraryScanning, setLibraryScanning] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null);
  const [osuClientId, setOsuClientId] = useState("");
  const [osuClientSecret, setOsuClientSecret] = useState("");
  const [osuConfigured, setOsuConfigured] = useState(false);
  const [osuSaving, setOsuSaving] = useState(false);
  const [osuNotice, setOsuNotice] = useState<string | null>(null);
  const [osuError, setOsuError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setLibraryPathInput(loaded.quaverLibraryPath ?? "");
  }, []);

  useEffect(() => {
    fetch("/api/settings/osu-credentials")
      .then((res) => res.json())
      .then((data) => {
        setOsuConfigured(Boolean(data.configured));
        setOsuClientId(data.clientId ?? "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (listeningLane === null) return;

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key === "Escape") {
        setListeningLane(null);
        return;
      }
      const key = e.key.toLowerCase();
      setSettings((prev) => {
        if (!prev) return prev;
        const bindings = [...prev.game.keyBindings] as GameSettings["keyBindings"];
        const clashIndex = bindings.indexOf(key);
        if (clashIndex !== -1) bindings[clashIndex] = bindings[listeningLane!];
        bindings[listeningLane!] = key;
        const next = { ...prev, game: { ...prev.game, keyBindings: bindings } };
        saveSettings(next);
        return next;
      });
      setListeningLane(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [listeningLane]);

  if (!settings) return null;

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }

  function updateGame(patch: Partial<GameSettings>) {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, game: { ...prev.game, ...patch } };
      saveSettings(next);
      return next;
    });
  }

  async function handleSkinFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSkinUploading(true);
    setSkinError(null);
    setSkinNotice(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/skins/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");

      updateGame({ skinName: data.name, laneColors: data.laneColors });
      setSkinNotice(
        data.laneColors
          ? `Applied "${data.name}" — found ${data.colorsFound} color value(s) in skin.ini.`
          : `Imported "${data.name}", but couldn't find 4 column colors in skin.ini — keeping the default colors.`,
      );
    } catch (err) {
      setSkinError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSkinUploading(false);
    }
  }

  function clearSkin() {
    updateGame({ skinName: null, laneColors: null });
    setSkinNotice(null);
    setSkinError(null);
  }

  async function scanLibrary() {
    const dir = libraryPathInput.trim();
    if (!dir) return;

    setLibraryScanning(true);
    setLibraryError(null);
    setLibraryNotice(null);

    try {
      const res = await fetch(`/api/library/quaver?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");

      update({ quaverLibraryPath: dir });
      const mapsetCount = data.maps.length;
      const diffCount = data.maps.reduce((sum: number, m: { difficulties: unknown[] }) => sum + m.difficulties.length, 0);
      setLibraryNotice(`Saved. Found ${mapsetCount} mapset${mapsetCount === 1 ? "" : "s"} (${diffCount} 4K difficulties) — browse them on the Maps page under "Downloaded".`);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setLibraryScanning(false);
    }
  }

  async function saveOsuCredentials() {
    const clientId = osuClientId.trim();
    const clientSecret = osuClientSecret.trim();
    if (!clientId || !clientSecret) return;

    setOsuSaving(true);
    setOsuError(null);
    setOsuNotice(null);

    try {
      const res = await fetch("/api/settings/osu-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");

      setOsuConfigured(Boolean(data.configured));
      setOsuClientSecret("");
      setOsuNotice("Saved. osu! search will use these credentials.");
    } catch (err) {
      setOsuError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setOsuSaving(false);
    }
  }

  async function clearOsuCredentials() {
    setOsuSaving(true);
    setOsuError(null);
    setOsuNotice(null);

    try {
      const res = await fetch("/api/settings/osu-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "", clientSecret: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Remove failed.");

      setOsuConfigured(false);
      setOsuClientId("");
      setOsuClientSecret("");
      setOsuNotice("Removed. osu! search is disabled until credentials are added again.");
    } catch (err) {
      setOsuError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setOsuSaving(false);
    }
  }

  const { game } = settings;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-400">Preferences for map search and the 4K practice mode.</p>
      </header>

      <Section title="Search" description="Used as the starting filter when the Maps page loads.">
        <select
          id="default-source"
          value={settings.defaultSource}
          onChange={(e) => update({ defaultSource: e.target.value as SourceFilter })}
          className="w-fit rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
        >
          <option value="both">Both</option>
          <option value="osu">osu!</option>
          <option value="quaver">Quaver</option>
        </select>
      </Section>

      <Section
        title="osu! account"
        description="osu! search needs your own OAuth app — create one at osu.ppy.sh/home/account/edit#oauth (any callback URL works) and paste the client id/secret below. Quaver search needs no setup."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={osuClientId}
            onChange={(e) => setOsuClientId(e.target.value)}
            placeholder="Client ID"
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
          <input
            value={osuClientSecret}
            onChange={(e) => setOsuClientSecret(e.target.value)}
            placeholder={osuConfigured ? "Client Secret (re-enter to update)" : "Client Secret"}
            type="password"
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveOsuCredentials}
            disabled={osuSaving || !osuClientId.trim() || !osuClientSecret.trim()}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {osuSaving ? "Saving…" : "Save"}
          </button>
          {osuConfigured && (
            <button onClick={clearOsuCredentials} disabled={osuSaving} className="text-sm text-zinc-400 hover:text-white">
              Remove
            </button>
          )}
          <span className="text-xs text-zinc-500">{osuConfigured ? "Connected" : "Not connected"}</span>
        </div>
        {osuNotice && <p className="text-xs text-zinc-400">{osuNotice}</p>}
        {osuError && <p className="text-xs text-red-400">{osuError}</p>}
      </Section>

      <Section title="Key bindings" description="Click a lane, then press the key you want to bind to it.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANE_LABELS.map((label, lane) => (
            <button
              key={label}
              onClick={() => setListeningLane(lane)}
              className={`flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-sm ${
                listeningLane === lane
                  ? "border-white bg-white/10"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
            >
              <span className="text-xs text-zinc-500">{label}</span>
              <span className="font-mono text-base">
                {listeningLane === lane ? "…" : game.keyBindings[lane].toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Scrolling">
        <Slider
          label="Scroll speed"
          value={game.scrollSpeed}
          min={5}
          max={40}
          onChange={(v) => updateGame({ scrollSpeed: v })}
        />
        <label className="flex flex-col gap-1">
          <span className="text-sm">Scroll direction</span>
          <select
            value={game.scrollDirection}
            onChange={(e) => updateGame({ scrollDirection: e.target.value as ScrollDirection })}
            className="w-fit rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          >
            <option value="down">Downscroll</option>
            <option value="up">Upscroll</option>
          </select>
        </label>
      </Section>

      <Section title="Timing" description="Shifts when a keypress is judged relative to the note.">
        <Slider
          label="Audio offset"
          value={game.audioOffsetMs}
          min={-300}
          max={300}
          step={5}
          unit="ms"
          onChange={(v) => updateGame({ audioOffsetMs: v })}
        />
      </Section>

      <Section title="Volume">
        <Slider label="Master" value={game.masterVolume} min={0} max={100} unit="%" onChange={(v) => updateGame({ masterVolume: v })} />
        <Slider label="Music" value={game.musicVolume} min={0} max={100} unit="%" onChange={(v) => updateGame({ musicVolume: v })} />
        <Slider
          label="Hit sounds"
          value={game.hitSoundVolume}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => updateGame({ hitSoundVolume: v })}
        />
      </Section>

      <Section title="Visual">
        <Slider
          label="Background dim"
          value={game.backgroundDim}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => updateGame({ backgroundDim: v })}
        />
        <Checkbox label="Hit lighting" checked={game.hitLighting} onChange={(v) => updateGame({ hitLighting: v })} />
        <label className="flex flex-col gap-1">
          <span className="text-sm">Note shape</span>
          <select
            value={game.noteShape}
            onChange={(e) => updateGame({ noteShape: e.target.value as NoteShape })}
            className="w-fit rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          >
            <option value="bar">Bars</option>
            <option value="circle">Circles</option>
          </select>
        </label>
        <Checkbox
          label="Top lane cover"
          checked={game.laneCoverTop}
          onChange={(v) => updateGame({ laneCoverTop: v })}
        />
        <Checkbox
          label="Bottom lane cover"
          checked={game.laneCoverBottom}
          onChange={(v) => updateGame({ laneCoverBottom: v })}
        />
      </Section>

      <Section
        title="Skin"
        description="Import a Quaver skin export (.qs) to theme the lane colors. Only column colors are picked up from skin.ini — textures and receptor sprites aren't rendered yet."
      >
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:border-white/30">
            {skinUploading ? "Importing…" : "Import skin (.qs)"}
            <input type="file" accept=".qs,.zip" className="hidden" disabled={skinUploading} onChange={handleSkinFile} />
          </label>
          {game.skinName && (
            <button onClick={clearSkin} className="text-sm text-zinc-400 hover:text-white">
              Clear ({game.skinName})
            </button>
          )}
        </div>
        {game.laneColors && (
          <div className="flex gap-2">
            {game.laneColors.map((c, i) => (
              <span key={i} className="h-6 w-6 rounded border border-white/20" style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
        {skinNotice && <p className="text-xs text-zinc-400">{skinNotice}</p>}
        {skinError && <p className="text-xs text-red-400">{skinError}</p>}
      </Section>

      <Section
        title="Quaver library"
        description="Point this at your real Quaver install's Songs folder. Once saved, browse and play everything in it — every difficulty — from the Maps page's Downloaded tab."
      >
        <div className="flex gap-2">
          <input
            value={libraryPathInput}
            onChange={(e) => setLibraryPathInput(e.target.value)}
            placeholder="e.g. ~/Library/Application Support/Quaver/Songs"
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
          <button
            onClick={scanLibrary}
            disabled={libraryScanning || !libraryPathInput.trim()}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {libraryScanning ? "Scanning…" : "Save & Scan"}
          </button>
        </div>
        {libraryError && <p className="text-xs text-red-400">{libraryError}</p>}
        {libraryNotice && <p className="text-xs text-zinc-400">{libraryNotice}</p>}
      </Section>
    </main>
  );
}
