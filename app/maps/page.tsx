"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MapSource, UnifiedMapset } from "@/lib/rhythm";
import { loadSettings, type SourceFilter } from "@/lib/settings";
import type { LibraryMapsetEntry } from "@/lib/game/quaverLibrary";
import type { MapManifest } from "@/lib/game/mapTypes";

const STATUS_STYLES: Record<string, string> = {
  ranked: "bg-emerald-500/15 text-emerald-400",
  qualified: "bg-sky-500/15 text-sky-400",
  loved: "bg-pink-500/15 text-pink-400",
  unranked: "bg-zinc-500/15 text-zinc-400",
  pending: "bg-amber-500/15 text-amber-400",
  graveyard: "bg-zinc-700/30 text-zinc-500",
  unknown: "bg-zinc-500/15 text-zinc-400",
};

function MapsetCard({ mapset }: { mapset: UnifiedMapset }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadAndPlay() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/maps/quaver/${mapset.id}/download`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Download failed");
      router.push(`/play?source=quaver&id=${mapset.id}`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
      setDownloading(false);
    }
  }

  return (
    <div className="group flex gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/25 hover:bg-white/[0.06]">
      <a href={mapset.pageUrl} target="_blank" rel="noreferrer" className="h-20 w-32 shrink-0 overflow-hidden rounded-md bg-white/5">
        {mapset.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mapset.coverUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : null}
      </a>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {mapset.source}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[mapset.status]}`}>
            {mapset.status}
          </span>
        </div>
        <a href={mapset.pageUrl} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
          {mapset.title}
        </a>
        <p className="truncate text-sm text-zinc-400">{mapset.artist}</p>
        <p className="truncate text-xs text-zinc-500">mapped by {mapset.creator}</p>
        <div className="mt-auto flex items-center gap-3 text-xs text-zinc-500">
          <span>{mapset.difficultyCount} diffs</span>
          {mapset.minDifficultyRating != null && (
            <span>
              {mapset.minDifficultyRating.toFixed(1)}–{mapset.maxDifficultyRating!.toFixed(1)}★
            </span>
          )}
          {mapset.bpm != null && <span>{Math.round(mapset.bpm)} BPM</span>}
          {mapset.source === "quaver" && (
            <button
              onClick={downloadAndPlay}
              disabled={downloading}
              className="ml-auto shrink-0 rounded bg-white px-2 py-1 text-[11px] font-medium text-black disabled:opacity-50"
            >
              {downloading ? "Downloading…" : "Download & Play"}
            </button>
          )}
        </div>
        {downloadError && <p className="text-[11px] text-red-400">{downloadError}</p>}
      </div>
    </div>
  );
}

interface DownloadedItem {
  label: string;
  creator?: string;
  href: string;
}

interface DownloadedGroup {
  key: string;
  title: string;
  artist: string;
  items: DownloadedItem[];
}

function DownloadedTab() {
  const [groups, setGroups] = useState<DownloadedGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const byKey = new Map<string, DownloadedGroup>();

      function addItem(key: string, title: string, artist: string, item: DownloadedItem) {
        let group = byKey.get(key);
        if (!group) {
          group = { key, title, artist, items: [] };
          byKey.set(key, group);
        }
        group.items.push(item);
      }

      try {
        const res = await fetch("/api/maps/downloaded");
        const data = (await res.json()) as { maps: MapManifest[] };
        for (const m of data.maps) {
          addItem(`${m.title}::${m.artist}`, m.title, m.artist, {
            label: "Downloaded",
            href: `/play?source=${m.source}&id=${encodeURIComponent(m.id)}`,
          });
        }
      } catch {
        // Downloaded-cache listing is best-effort; a failure here shouldn't block the library list below.
      }

      const libraryPath = loadSettings().quaverLibraryPath;
      if (libraryPath) {
        try {
          const res = await fetch(`/api/library/quaver?dir=${encodeURIComponent(libraryPath)}`);
          const data = await res.json();
          if (res.ok) {
            for (const mapset of data.maps as LibraryMapsetEntry[]) {
              for (const diff of mapset.difficulties) {
                addItem(`${mapset.title}::${mapset.artist}`, mapset.title, mapset.artist, {
                  label: diff.difficultyName,
                  creator: diff.creator,
                  href: `/play?source=quaver-local&id=${encodeURIComponent(diff.id)}&dir=${encodeURIComponent(libraryPath)}`,
                });
              }
            }
          } else {
            setError(data.error ?? "Failed to scan your Quaver library.");
          }
        } catch {
          setError("Failed to scan your Quaver library.");
        }
      }

      if (!ignore) setGroups(Array.from(byKey.values()));
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (!groups) return <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>;

  if (groups.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        Nothing downloaded yet. Use &quot;Download &amp; Play&quot; on a Quaver search result, or set your Quaver library
        folder in Settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{group.title}</p>
              <p className="truncate text-sm text-zinc-400">{group.artist}</p>
            </div>
            <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
              4K
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs hover:border-white/30"
              >
                {item.label}
                {item.creator ? ` · ${item.creator}` : ""}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

async function fetchMapsets(query: string, source: SourceFilter, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query, page: "1" });
  if (source !== "both") params.set("source", source);

  const res = await fetch(`/api/search?${params.toString()}`, { signal });
  return (await res.json()) as { mapsets: UnifiedMapset[]; errors: Partial<Record<MapSource, string>> };
}

export default function MapsPage() {
  const [tab, setTab] = useState<"search" | "downloaded">("downloaded");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("both");
  const [mapsets, setMapsets] = useState<UnifiedMapset[]>([]);
  const [errors, setErrors] = useState<Partial<Record<MapSource, string>>>({});
  const [loading, setLoading] = useState(true);

  // Auto-run an unfiltered search on mount, using the saved default source, so the page isn't empty on load.
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    const defaultSource = loadSettings().defaultSource;
    setSource(defaultSource);

    fetchMapsets("", defaultSource, controller.signal)
      .then((data) => {
        if (ignore) return;
        setMapsets(data.mapsets);
        setErrors(data.errors ?? {});
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);

    try {
      const data = await fetchMapsets(query, source);
      setMapsets(data.mapsets);
      setErrors(data.errors ?? {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">4K Map Search</h1>
        <p className="text-sm text-zinc-400">
          Searches osu! and Quaver at once for 4-key rhythm game mapsets.
        </p>
      </header>

      <div className="flex gap-2 border-b border-white/10">
        {(["downloaded", "search"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${
              tab === t ? "border-b-2 border-white font-medium text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <>
          <form onSubmit={runSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, artist, or creator…"
              className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SourceFilter)}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-2 text-sm outline-none focus:border-white/40"
            >
              <option value="both">Both</option>
              <option value="osu">osu!</option>
              <option value="quaver">Quaver</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          {(errors.osu || errors.quaver) && (
            <div className="flex flex-col gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errors.osu && <span>osu!: {errors.osu}</span>}
              {errors.quaver && <span>Quaver: {errors.quaver}</span>}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {mapsets.map((m) => (
              <MapsetCard key={`${m.source}-${m.id}`} mapset={m} />
            ))}
            {!loading && mapsets.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-500">No mapsets found.</p>
            )}
          </div>
        </>
      ) : (
        <DownloadedTab />
      )}
    </main>
  );
}
