@AGENTS.md

# Package manager

Use `nub` (not `npm`) for installing dependencies and running scripts in this repo — `nub install`, `nub run dev`, etc. It's a pnpm-compatible Node toolkit already available on this machine at `~/.hermes/node/bin/nub` (on PATH). `npm install` here hits a persistent local arborist bug unrelated to this project's dependencies.

# Gameplay accuracy standard

Any gameplay mechanic with a real-game equivalent (judgement windows, scoring, health, scroll speed scale, etc.) must match actual osu!mania or Quaver behavior — verify against their wiki/source before changing, don't invent numbers. Note which source you followed in a comment.

- Judgement windows (`lib/game/judgement.ts`) follow Quaver's official "Standard" preset: Marvelous ±18ms, Perfect ±43ms, Great ±76ms, Good ±106ms, Okay ±127ms, Miss ±164ms. Confirmed accurate as of 2026-09-16.
- osu!mania's hit windows are NOT a fixed preset — they're computed per-beatmap from Overall Difficulty (OD), e.g. ScoreV2 PERFECT = `22.4 − 0.6×OD` (OD≤5) or `24.9 − 1.1×OD` (OD≥5). A single hardcoded window set can't represent osu!mania accurately; if osu!-sourced real charts are ever added, judgement windows need to be computed from that map's OD rather than reusing the Quaver constants.
