export interface ChartNote {
  time: number;
  lane: number;
  judged: boolean;
}

export interface Chart {
  bpm: number;
  lengthMs: number;
  notes: ChartNote[];
}

const LEAD_IN_MS = 2000;
const LEAD_OUT_MS = 2000;

/**
 * Procedurally generates a 4-lane practice chart on a fixed beat grid, seeded
 * for reproducibility. There's no licensed audio or map data behind this —
 * it's a synthesized stand-in so the game mode works without redistributing
 * copyrighted osu!/Quaver content.
 */
export function generateDemoChart(bpm = 140, bars = 32): Chart {
  const beatMs = 60000 / bpm;
  const stepMs = beatMs / 2;
  const stepsPerBar = 8;
  const totalSteps = bars * stepsPerBar;

  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const notes: ChartNote[] = [];
  let lastLane = -1;

  for (let step = 0; step < totalSteps; step++) {
    const isDownbeat = step % 2 === 0;
    const density = isDownbeat ? 0.9 : 0.55;
    if (rand() > density) continue;

    let lane = Math.floor(rand() * 4);
    if (lane === lastLane) lane = (lane + 1 + Math.floor(rand() * 2)) % 4;
    lastLane = lane;

    const time = LEAD_IN_MS + step * stepMs;
    notes.push({ time, lane, judged: false });

    if (rand() > 0.85) {
      let lane2 = Math.floor(rand() * 4);
      if (lane2 === lane) lane2 = (lane2 + 1) % 4;
      notes.push({ time, lane: lane2, judged: false });
    }
  }

  notes.sort((a, b) => a.time - b.time || a.lane - b.lane);

  return {
    bpm,
    lengthMs: LEAD_IN_MS + totalSteps * stepMs + LEAD_OUT_MS,
    notes,
  };
}
