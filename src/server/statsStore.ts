import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { REVEAL_STEPS, revealIndexForCount } from "@/lib/reveal";

export type DailyHistogram = {
  // counts for solves per reveal step, and fail
  solves: number[]; // index 0..(steps-1) correspond to reveal buckets
  fail: number;
  // guessed titles counts per reveal step (normalized keys)
  guesses: Array<Record<string, number>>; // length == REVEAL_STEPS.length
};

const baseDir = path.join(process.cwd(), "var", "stats");
const BUCKETS = REVEAL_STEPS.length;

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
    if (!Array.isArray(data.solves) || data.solves.length === 0) throw new Error("bad");
    const solves = data.solves.length === BUCKETS
      ? data.solves.map((v) => Number(v || 0))
      : normalizeSolves(data.solves);
    const guesses = Array.isArray(data.guesses) && data.guesses.length > 0
      ? (data.guesses.length === BUCKETS ? data.guesses : normalizeGuesses(data.guesses))
      : Array.from({ length: BUCKETS }, () => ({}));
    return { solves, fail: Number(data.fail || 0), guesses };
  } catch {
    return { solves: new Array(BUCKETS).fill(0), fail: 0, guesses: Array.from({ length: BUCKETS }, () => ({})) };
  }
}

export async function bumpHistogram(dateKey: string, revealed: number, correct: boolean) {
  const hist = await loadHistogram(dateKey);
  if (correct) {
    const idx = revealIndexForCount(revealed);
    hist.solves[idx] += 1;
  } else {
    hist.fail += 1;
  }
  await writeFile(filePath(dateKey), JSON.stringify(hist), "utf8");
  return hist;
}

export function percentileForReveal(hist: DailyHistogram, revealed: number, correct: boolean) {
  const idx = revealIndexForCount(revealed);
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
  const idx = revealIndexForCount(revealed);
  const hist = await loadHistogram(dateKey);
  const bucket = hist.guesses[idx] || (hist.guesses[idx] = {});
  bucket[key] = (bucket[key] || 0) + 1;
  await writeFile(filePath(dateKey), JSON.stringify(hist), "utf8");
  return hist;
}

export function topGuesses(hist: DailyHistogram, revealed: number, limit = 10) {
  const idx = revealIndexForCount(revealed);
  const bucket = hist.guesses[idx] || {};
  const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, limit);
  return entries.map(([key, count]) => ({ key, count }));
}

function normalizeSolves(solves: number[]) {
  const normalized = new Array(BUCKETS).fill(0);
  for (let i = 0; i < solves.length; i++) {
    const idx = revealIndexForCount(i + 1);
    normalized[idx] += Number(solves[i] || 0);
  }
  return normalized;
}

function normalizeGuesses(guesses: Array<Record<string, number>>) {
  const normalized = Array.from({ length: BUCKETS }, () => ({} as Record<string, number>));
  for (let i = 0; i < guesses.length; i++) {
    const idx = revealIndexForCount(i + 1);
    const target = normalized[idx];
    const src = guesses[i] || {};
    for (const [key, count] of Object.entries(src)) {
      target[key] = (target[key] || 0) + Number(count || 0);
    }
  }
  return normalized;
}
