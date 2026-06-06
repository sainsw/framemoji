// Hybrid stats store: uses Neon Postgres when configured, otherwise falls back to file-based JSON in var/stats
import { loadHistogram as loadFileHistogram, bumpHistogram as bumpFileHistogram, percentileForReveal as percentileForRevealFile, recordGuess as recordFileGuess } from "@/server/statsStore";
import { REVEAL_STEPS, revealIndexForCount } from "@/lib/reveal";
import { hasPg, getSql, ensureSchema } from "@/server/db";

export type DailyHistogram = {
  solves: number[];
  fail: number;
};

const BUCKETS = REVEAL_STEPS.length;
const FAIL_BUCKET = -1;

export async function loadHistogram(day: string): Promise<DailyHistogram> {
  if (!hasPg()) {
    const file = await loadFileHistogram(day);
    return { solves: file.solves, fail: file.fail };
  }
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT bucket, count FROM daily_solves WHERE day = ${day}
    `) as Array<{ bucket: number; count: number }>;
    const solves: number[] = new Array(BUCKETS).fill(0);
    let fail = 0;
    for (const { bucket, count } of rows) {
      const c = Number(count || 0);
      if (bucket === FAIL_BUCKET) {
        fail += c;
      } else if (bucket >= 0 && bucket < BUCKETS) {
        solves[bucket] += c;
      }
    }
    return { solves, fail };
  } catch {
    return { solves: new Array(BUCKETS).fill(0), fail: 0 };
  }
}

export async function bumpHistogram(day: string, revealed: number, correct: boolean) {
  if (!hasPg()) return bumpFileHistogram(day, revealed, correct);
  const bucket = correct ? revealIndexForCount(revealed) : FAIL_BUCKET;
  try {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO daily_solves (day, bucket, count)
      VALUES (${day}, ${bucket}, 1)
      ON CONFLICT (day, bucket) DO UPDATE SET count = daily_solves.count + 1
    `;
  } catch {
    // ignore; loadHistogram below returns best-effort current state
  }
  return loadHistogram(day);
}

export function percentileForReveal(hist: DailyHistogram, revealed: number, correct: boolean) {
  return percentileForRevealFile({ solves: hist.solves, fail: hist.fail, guesses: Array.from({ length: BUCKETS }, () => ({})) }, revealed, correct);
}

export async function recordGuess(day: string, revealed: number, key: string) {
  if (!hasPg()) return recordFileGuess(day, revealed, key);
  const reveal = revealIndexForCount(revealed) + 1;
  try {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO daily_guesses (day, reveal, guess_key, count)
      VALUES (${day}, ${reveal}, ${key}, 1)
      ON CONFLICT (day, reveal, guess_key) DO UPDATE SET count = daily_guesses.count + 1
    `;
  } catch {
    // ignore
  }
}

export async function topGuesses(day: string, revealed: number, limit = 10) {
  if (!hasPg()) {
    // not used in file mode here; API route reads from statsStore directly
    return [] as { key: string; count: number }[];
  }
  const reveal = revealIndexForCount(revealed) + 1;
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT guess_key, count FROM daily_guesses
      WHERE day = ${day} AND reveal = ${reveal}
      ORDER BY count DESC
      LIMIT ${limit}
    `) as Array<{ guess_key: string; count: number }>;
    return rows.map((r) => ({ key: String(r.guess_key), count: Number(r.count) }));
  } catch {
    return [] as { key: string; count: number }[];
  }
}

// Debug helper: inspect stored guesses for a given day/reveal bucket.
export async function __debugGuesses(day: string, revealed: number) {
  if (!hasPg()) {
    return { hasPg: false } as const;
  }
  const reveal = revealIndexForCount(revealed) + 1;
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT guess_key, count FROM daily_guesses
      WHERE day = ${day} AND reveal = ${reveal}
      ORDER BY count DESC
    `) as Array<{ guess_key: string; count: number }>;
    return { hasPg: true, reveal, rowCount: rows.length, rows };
  } catch (e) {
    return { hasPg: true, reveal, error: (e as Error)?.message || "err" };
  }
}
