// Hybrid stats store: uses Vercel KV (Upstash Redis) when configured, otherwise falls back to file-based JSON in var/stats
import { loadHistogram as loadFileHistogram, bumpHistogram as bumpFileHistogram, percentileForReveal as percentileForRevealFile, recordGuess as recordFileGuess } from "@/server/statsStore";

export type DailyHistogram = {
  solves: number[];
  fail: number;
};

// Support both Vercel KV (KV_*) and Upstash for Redis (UPSTASH_REDIS_REST_*) env vars
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_FILE = process.env.EMOVI_USE_FILE_STATS === "1";

function hasKV() {
  return !!KV_URL && !!KV_TOKEN && !USE_FILE;
}

function solvesKey(day: string) { return `framemoji:${day}:solves`; }
function guessesKey(day: string, r: number) { return `framemoji:${day}:guesses:r${r}`; }

async function kvFetch(path: string, init?: RequestInit) {
  const url = `${KV_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  return res.json();
}

async function kvType(key: string): Promise<string | null> {
  try {
    const data = await kvFetch(`/type/${encodeURIComponent(key)}`);
    return (data && typeof data.result === 'string') ? data.result : null;
  } catch {
    return null;
  }
}

async function kvDel(key: string) {
  try {
    await kvFetch(`/del/${encodeURIComponent(key)}`);
  } catch {
    // ignore
  }
}

export async function loadHistogram(day: string): Promise<DailyHistogram> {
  if (!hasKV()) {
    const file = await loadFileHistogram(day);
    return { solves: file.solves, fail: file.fail };
  }
  // HGETALL solves hash; Upstash returns array [field, value, ...]
  try {
    const data = await kvFetch(`/hgetall/${encodeURIComponent(solvesKey(day))}`);
    const arr: any[] = data?.result || [];
    const map: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) {
      map[String(arr[i])] = String(arr[i + 1]);
    }
    const solves: number[] = new Array(10).fill(0).map((_, i) => Number(map[`r${i + 1}`] || 0));
    const fail = Number(map.fail || 0);
    return { solves, fail };
  } catch {
    return { solves: new Array(10).fill(0), fail: 0 };
  }
}

export async function bumpHistogram(day: string, revealed: number, correct: boolean) {
  if (!hasKV()) return bumpFileHistogram(day, revealed, correct);
  const r = Math.min(Math.max(revealed, 1), 10);
  const field = correct ? `r${r}` : "fail";
  // HINCRBY solves field 1
  try {
    await kvFetch(`/hincrby/${encodeURIComponent(solvesKey(day))}/${encodeURIComponent(field)}/1`);
    const hist = await loadHistogram(day);
    return hist;
  } catch {
    // fallback
    const hist = await loadHistogram(day);
    return hist;
  }
}

export function percentileForReveal(hist: DailyHistogram, revealed: number, correct: boolean) {
  return percentileForRevealFile({ solves: hist.solves, fail: hist.fail, guesses: Array.from({ length: 10 }, () => ({})) }, revealed, correct);
}

export async function recordGuess(day: string, revealed: number, key: string) {
  if (!hasKV()) return recordFileGuess(day, revealed, key);
  const r = Math.min(Math.max(revealed, 1), 10);
  try {
    // Ensure the key is a sorted set; delete if a wrong type was set mistakenly
    const gKey = guessesKey(day, r);
    const t = await kvType(gKey);
    if (t && t !== 'zset' && t !== 'none') {
      await kvDel(gKey);
    }
    // ZINCRBY guesses key 1 member
    await kvFetch(`/zincrby/${encodeURIComponent(gKey)}/1/${encodeURIComponent(key)}`);
  } catch {
    // ignore
  }
}

export async function topGuessesKV(day: string, revealed: number, limit = 10) {
  if (!hasKV()) {
    // not used in file mode here; API route will read from file
    return [] as { key: string; count: number }[];
  }
  const r = Math.min(Math.max(revealed, 1), 10);
  try {
    // Validate key type first to avoid WRONGTYPE errors
    const gKey = guessesKey(day, r);
    const t = await kvType(gKey);
    if (t && t !== 'zset' && t !== 'none') {
      await kvDel(gKey);
      return [] as { key: string; count: number }[];
    }
    // ZREVRANGE key 0 limit-1 WITHSCORES
    const end = Math.max(0, limit - 1);
    const data = await kvFetch(`/zrevrange/${encodeURIComponent(gKey)}/0/${end}?withscores=true`);
    let arr: any[] = data?.result || [];
    // Fallback: some environments may not honor withscores; if empty, try without and fetch scores per member
    if (!arr || arr.length === 0) {
      const dataNoScores = await kvFetch(`/zrevrange/${encodeURIComponent(gKey)}/0/${end}`);
      const members: any[] = dataNoScores?.result || [];
      if (members && members.length > 0) {
        const out2: { key: string; count: number }[] = [];
        for (const m of members) {
          try {
            const scoreRes = await kvFetch(`/zscore/${encodeURIComponent(gKey)}/${encodeURIComponent(String(m))}`);
            const sc = Number(scoreRes?.result || 0);
            out2.push({ key: String(m), count: sc });
          } catch {
            out2.push({ key: String(m), count: 0 });
          }
        }
        return out2;
      }
    }
    const out: { key: string; count: number }[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      out.push({ key: String(arr[i]), count: Number(arr[i + 1]) });
    }
    return out;
  } catch {
    return [] as { key: string; count: number }[];
  }
}
