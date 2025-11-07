import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type DailyHistogram = {
  // counts for solves at reveal 1..10, and fail
  solves: number[]; // index 0..9 correspond to reveal 1..10
  fail: number;
  // guessed titles counts per reveal step (normalized keys)
  guesses: Array<Record<string, number>>; // length 10
};

const baseDir = path.join(process.cwd(), "var", "stats");

async function ensureDir() {
  await mkdir(baseDir, { recursive: true });
}

function filePath(dateKey: string) {
  return path.join(baseDir, `${dateKey}.json`);
}

export async function loadHistogram(dateKey: string): Promise<DailyHistogram> {
  await ensureDir();
  try {
    const raw = await readFile(filePath(dateKey), "utf8");
    const data = JSON.parse(raw) as Partial<DailyHistogram>;
    if (!Array.isArray(data.solves) || data.solves.length !== 10) throw new Error("bad");
    // Backfill guesses if missing
    if (!Array.isArray(data.guesses) || data.guesses.length !== 10) {
      data.guesses = Array.from({ length: 10 }, () => ({}));
    }
    return data as DailyHistogram;
  } catch {
    return { solves: new Array(10).fill(0), fail: 0, guesses: Array.from({ length: 10 }, () => ({})) };
  }
}

export async function bumpHistogram(dateKey: string, revealed: number, correct: boolean) {
  const hist = await loadHistogram(dateKey);
  if (correct) {
    const idx = Math.min(Math.max(revealed, 1), 10) - 1;
    hist.solves[idx] += 1;
  } else {
    hist.fail += 1;
  }
  await writeFile(filePath(dateKey), JSON.stringify(hist), "utf8");
  return hist;
}

export function percentileForReveal(hist: DailyHistogram, revealed: number, correct: boolean) {
  const idx = Math.min(Math.max(revealed, 1), 10) - 1;
  const total = hist.solves.reduce((a, b) => a + b, 0) + hist.fail;
  // "Top %" = portion of players you did better than (strictly worse than you)
  // If you failed, no one is strictly worse, so worse = 0
  const worseStrict = correct
    ? hist.solves.slice(idx + 1).reduce((a, b) => a + b, 0) + hist.fail
    : 0;
  const pct = total > 0 ? Math.floor((worseStrict / total) * 100) : 0;
  return { percentile: pct, total };
}

export async function recordGuess(dateKey: string, revealed: number, key: string) {
  const idx = Math.min(Math.max(revealed, 1), 10) - 1;
  const hist = await loadHistogram(dateKey);
  const bucket = hist.guesses[idx] || (hist.guesses[idx] = {});
  bucket[key] = (bucket[key] || 0) + 1;
  await writeFile(filePath(dateKey), JSON.stringify(hist), "utf8");
  return hist;
}

export function topGuesses(hist: DailyHistogram, revealed: number, limit = 10) {
  const idx = Math.min(Math.max(revealed, 1), 10) - 1;
  const bucket = hist.guesses[idx] || {};
  const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, limit);
  return entries.map(([key, count]) => ({ key, count }));
}
