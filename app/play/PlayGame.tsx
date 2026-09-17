"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateDemoChart, type Chart, type ChartNote } from "@/lib/game/chart";
import { GameAudio } from "@/lib/game/audio";
import {
  classify,
  emptyJudgeCounts,
  JUDGEMENT_COLOR,
  JUDGEMENT_WEIGHT,
  MISS_WINDOW_MS,
  type Judgement,
} from "@/lib/game/judgement";
import { loadSettings, type GameSettings } from "@/lib/settings";
import type { MapManifest } from "@/lib/game/mapTypes";

type Phase = "ready" | "playing" | "finished";
type LoadState = "none" | "loading" | "ready" | "error";

const DEFAULT_LANE_COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa"];
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

export function PlayGame() {
  const searchParams = useSearchParams();
  const mapSource = searchParams.get("source");
  const mapId = searchParams.get("id");
  const libraryDir = searchParams.get("dir");
  const isMini = searchParams.get("mini") === "1";
  const isRealMap = (mapSource === "quaver" || mapSource === "quaver-local") && !!mapId;
  const router = useRouter();

  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgeCounts, setJudgeCounts] = useState(emptyJudgeCounts());
  const [popup, setPopup] = useState<{ judgement: Judgement; id: number } | null>(null);
  const [manifest, setManifest] = useState<MapManifest | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(isRealMap ? "loading" : "none");
  const [loadError, setLoadError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const laneCursorRef = useRef([0, 0, 0, 0]);
  const laneNotesRef = useRef<ChartNote[][]>([[], [], [], []]);
  const comboRef = useRef(0);
  const pressedLanesRef = useRef([false, false, false, false]);
  const flashRef = useRef([0, 0, 0, 0]);
  const popupIdRef = useRef(0);
  const errorTicksRef = useRef<{ delta: number; at: number }[]>([]);

  useEffect(() => {
    setSettings(loadSettings().game);
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isRealMap) return;
    let cancelled = false;

    const request =
      mapSource === "quaver-local"
        ? fetch(`/api/library/quaver/manifest?id=${encodeURIComponent(mapId!)}&dir=${encodeURIComponent(libraryDir ?? "")}`)
        : fetch(`/api/maps/${mapSource}/${mapId}/download`, { method: "POST" });

    request
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Failed to load this map.");
          setLoadState("error");
          return;
        }
        setManifest(data as MapManifest);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Failed to load this map.");
          setLoadState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isRealMap, mapSource, mapId, libraryDir]);

  function elapsedMs(): number {
    if (manifest && audioElRef.current) return audioElRef.current.currentTime * 1000;
    return performance.now() - startTimeRef.current;
  }

  function resetRun() {
    const chart: Chart = manifest
      ? {
          bpm: manifest.bpm,
          lengthMs: manifest.lengthMs,
          notes: manifest.notes.map((n) => ({ time: n.time, lane: n.lane, judged: false })),
        }
      : generateDemoChart();

    chartRef.current = chart;
    laneNotesRef.current = [[], [], [], []];
    for (const note of chart.notes) {
      note.judged = false;
      laneNotesRef.current[note.lane].push(note);
    }
    laneCursorRef.current = [0, 0, 0, 0];
    comboRef.current = 0;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setJudgeCounts(emptyJudgeCounts());
    setPopup(null);
  }

  async function handleStart() {
    if (!settings) return;
    resetRun();

    const audio = new GameAudio();
    await audio.resume();
    audioRef.current = audio;

    const volume = (settings.masterVolume / 100) * (settings.musicVolume / 100);

    if (manifest && audioElRef.current) {
      const el = audioElRef.current;
      el.currentTime = 0;
      el.volume = Math.max(0, Math.min(1, volume));
      await el.play();
    } else {
      audio.scheduleMetronome(chartRef.current!, audio.startTime, volume);
      startTimeRef.current = performance.now();
    }

    setPhase("playing");
    rafRef.current = requestAnimationFrame(loop);
  }

  function applyJudgement(judgement: Judgement) {
    const weight = JUDGEMENT_WEIGHT[judgement];
    comboRef.current = judgement === "miss" ? 0 : comboRef.current + 1;

    setScore((s) => s + weight * 10);
    setCombo(comboRef.current);
    setMaxCombo((m) => Math.max(m, comboRef.current));
    setJudgeCounts((c) => ({ ...c, [judgement]: c[judgement] + 1 }));
    popupIdRef.current += 1;
    setPopup({ judgement, id: popupIdRef.current });
  }

  function judgeLane(lane: number, elapsed: number) {
    const notes = laneNotesRef.current[lane];
    const idx = laneCursorRef.current[lane];
    if (idx >= notes.length) return;
    const note = notes[idx];
    if (note.judged) return;

    const delta = elapsed - note.time;
    if (Math.abs(delta) > MISS_WINDOW_MS) return;

    note.judged = true;
    laneCursorRef.current[lane] += 1;
    applyJudgement(classify(delta));
    errorTicksRef.current.push({ delta, at: performance.now() });

    if (settings?.hitLighting) flashRef.current[lane] = performance.now();
    audioRef.current?.playHitSound(((settings?.hitSoundVolume ?? 0) / 100) * ((settings?.masterVolume ?? 0) / 100));
  }

  function autoMiss(elapsed: number) {
    for (let lane = 0; lane < 4; lane++) {
      const notes = laneNotesRef.current[lane];
      let idx = laneCursorRef.current[lane];
      while (idx < notes.length && !notes[idx].judged && notes[idx].time < elapsed - MISS_WINDOW_MS) {
        notes[idx].judged = true;
        applyJudgement("miss");
        idx += 1;
      }
      laneCursorRef.current[lane] = idx;
    }
  }

  function draw(elapsed: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !settings) return;

    const { width, height } = canvas;
    const laneWidth = width / 4;
    const laneColors = settings.laneColors ?? DEFAULT_LANE_COLORS;
    const direction = settings.scrollDirection;
    const hitLineY = direction === "down" ? height - 100 : 100;
    const pixelsPerMs = height / (12000 / settings.scrollSpeed);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(0,0,0,${settings.backgroundDim / 100})`;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
      ctx.stroke();
    }

    const circleRadius = laneWidth * 0.38;

    const chart = chartRef.current;
    if (chart) {
      const noteHeight = 20;
      for (const note of chart.notes) {
        if (note.judged) continue;
        const timeToHit = note.time - elapsed;
        const y = direction === "down" ? hitLineY - timeToHit * pixelsPerMs : hitLineY + timeToHit * pixelsPerMs;
        if (y < -noteHeight - circleRadius || y > height + noteHeight + circleRadius) continue;

        if (settings.noteShape === "circle") {
          const cx = note.lane * laneWidth + laneWidth / 2;
          ctx.beginPath();
          ctx.arc(cx, y, circleRadius, 0, Math.PI * 2);
          ctx.fillStyle = laneColors[note.lane];
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, y, circleRadius * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.55)";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          const x = note.lane * laneWidth + 6;
          const w = laneWidth - 12;
          ctx.fillStyle = laneColors[note.lane];
          ctx.beginPath();
          ctx.roundRect(x, y - noteHeight / 2, w, noteHeight, 6);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(x + 4, y - noteHeight / 2 + 3, w - 8, 3);
        }
      }
    }

    if (settings.laneCoverTop) {
      ctx.fillStyle = "rgba(0,0,0,0.92)";
      ctx.fillRect(0, 0, width, height * 0.3);
    }
    if (settings.laneCoverBottom) {
      ctx.fillStyle = "rgba(0,0,0,0.92)";
      ctx.fillRect(0, height * 0.7, width, height * 0.3);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, hitLineY);
    ctx.lineTo(width, hitLineY);
    ctx.stroke();

    for (let lane = 0; lane < 4; lane++) {
      const pressed = pressedLanesRef.current[lane];
      ctx.beginPath();
      if (settings.noteShape === "circle") {
        const cx = lane * laneWidth + laneWidth / 2;
        ctx.arc(cx, hitLineY, circleRadius, 0, Math.PI * 2);
      } else {
        const x = lane * laneWidth + 6;
        const w = laneWidth - 12;
        ctx.roundRect(x, hitLineY - 16, w, 32, 8);
      }
      ctx.fillStyle = pressed ? `${laneColors[lane]}33` : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = pressed ? laneColors[lane] : "rgba(255,255,255,0.2)";
      ctx.stroke();
    }

    // Timing error bar: shows recent hits' early/late offset, fading out over 1s.
    const barWidth = width * 0.6;
    const barX = (width - barWidth) / 2;
    const barY = direction === "down" ? hitLineY + 26 : hitLineY - 26;
    const barHeight = 6;

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barX + barWidth / 2, barY - 5);
    ctx.lineTo(barX + barWidth / 2, barY + barHeight + 5);
    ctx.stroke();

    const nowMs = performance.now();
    errorTicksRef.current = errorTicksRef.current.filter((t) => nowMs - t.at < 1000);
    for (const tick of errorTicksRef.current) {
      const age = nowMs - tick.at;
      const clamped = Math.max(-MISS_WINDOW_MS, Math.min(MISS_WINDOW_MS, tick.delta));
      const tx = barX + barWidth / 2 + (clamped / MISS_WINDOW_MS) * (barWidth / 2);
      ctx.globalAlpha = Math.max(0, 1 - age / 1000);
      ctx.fillStyle = JUDGEMENT_COLOR[classify(tick.delta)];
      ctx.fillRect(tx - 1.5, barY - 7, 3, barHeight + 14);
      ctx.globalAlpha = 1;
    }

    if (settings.hitLighting) {
      const now = performance.now();
      for (let lane = 0; lane < 4; lane++) {
        const age = now - flashRef.current[lane];
        if (age < 120) {
          ctx.fillStyle = `rgba(255,255,255,${(1 - age / 120) * 0.35})`;
          ctx.fillRect(lane * laneWidth, 0, laneWidth, height);
        }
      }
    }
  }

  function loop() {
    const chart = chartRef.current;
    if (!chart) return;

    const elapsed = elapsedMs();
    draw(elapsed);
    autoMiss(elapsed);

    if (elapsed > chart.lengthMs) {
      setPhase("finished");
      audioElRef.current?.pause();
      audioRef.current?.close();
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (phase !== "playing" || !settings) return;
      const lane = settings.keyBindings.indexOf(e.key.toLowerCase());
      if (lane === -1) return;
      pressedLanesRef.current[lane] = true;
      judgeLane(lane, elapsedMs() + settings.audioOffsetMs);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (!settings) return;
      const lane = settings.keyBindings.indexOf(e.key.toLowerCase());
      if (lane !== -1) pressedLanesRef.current[lane] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, settings, manifest]);

  const totalNotes = Object.values(judgeCounts).reduce((a, b) => a + b, 0);
  const accuracy = totalNotes === 0 ? 100 : (Object.entries(judgeCounts).reduce((sum, [j, count]) => sum + JUDGEMENT_WEIGHT[j as Judgement] * count, 0) / (totalNotes * 100)) * 100;

  if (!settings) return null;

  async function expandToFull() {
    await window.electronAPI?.toFull();
    router.push("/maps");
  }

  async function goBack() {
    if (isMini) {
      await window.electronAPI?.toIcon();
      router.push("/");
    } else if (window.electronAPI) {
      await window.electronAPI.toFull();
      router.push("/maps");
    } else {
      router.back();
    }
  }

  return (
    <main className={`mx-auto flex w-full flex-1 flex-col items-center gap-3 ${isMini ? "max-w-[360px] px-3 py-4" : "max-w-3xl px-4 py-10"}`}>
      <header className="flex w-full max-w-[480px] flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className={isMini ? "truncate text-base font-semibold" : "text-2xl font-semibold"}>
            {manifest ? manifest.title : "4K Practice Chart"}
          </h1>
          {isMini && (
            <button onClick={expandToFull} className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-300 hover:border-white/30">
              Expand
            </button>
          )}
        </div>
        {!isMini && (
          <p className="text-sm text-zinc-400">
            {manifest
              ? `${manifest.artist} — ${manifest.source === "quaver-local" ? "from your local Quaver library" : "downloaded from Quaver"}, playing the real chart and audio.`
              : "A synthesized demo chart and click track — not a real osu!/Quaver map — so you can try key bindings, scroll speed, and offset from Settings."}
          </p>
        )}
      </header>

      {manifest && <audio ref={audioElRef} src={manifest.audioUrl} preload="auto" />}

      {loadState === "loading" && <p className="text-sm text-zinc-400">Downloading map…</p>}
      {loadState === "error" && <p className="text-sm text-red-400">{loadError}</p>}

      {(loadState === "none" || loadState === "ready") && (
        <>
          {phase === "playing" && (
            <div className="flex w-full max-w-[480px] items-center justify-between text-sm text-zinc-300">
              <span>Score {score.toLocaleString()}</span>
              <span>Acc {accuracy.toFixed(2)}%</span>
              <span>Combo {combo}</span>
            </div>
          )}

          <div className="relative w-full max-w-[480px]">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="h-auto w-full rounded-lg border border-white/10 bg-black"
            />

            {phase === "playing" && popup && (
              <div
                key={popup.id}
                className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-lg font-bold uppercase tracking-wide"
                style={{ color: JUDGEMENT_COLOR[popup.judgement] }}
              >
                {popup.judgement}
              </div>
            )}

            {phase === "playing" && combo > 1 && (
              <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-white/90 drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                {combo}
              </div>
            )}

            {phase !== "playing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-black/70 text-center">
                {phase === "ready" && (
                  <>
                    <p className="max-w-xs text-sm text-zinc-300">
                      Keys: {settings.keyBindings.map((k) => k.toUpperCase()).join(" ")} — change these anytime in
                      Settings.
                    </p>
                    <button onClick={handleStart} className="rounded-md bg-white px-6 py-2 text-sm font-medium text-black">
                      Start
                    </button>
                  </>
                )}
                {phase === "finished" && (
                  <>
                    <p className="text-lg font-semibold">Cleared</p>
                    <div className="text-sm text-zinc-300">
                      <p>Score {score.toLocaleString()}</p>
                      <p>Max Combo {maxCombo}</p>
                      <p>Accuracy {accuracy.toFixed(2)}%</p>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-zinc-400">
                      {(Object.keys(judgeCounts) as Judgement[]).map((j) => (
                        <span key={j} style={{ color: JUDGEMENT_COLOR[j] }}>
                          {j}: {judgeCounts[j]}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleStart} className="rounded-md bg-white px-6 py-2 text-sm font-medium text-black">
                        Retry
                      </button>
                      <button
                        onClick={goBack}
                        className="rounded-md border border-white/15 px-6 py-2 text-sm font-medium text-zinc-300 hover:border-white/30"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
