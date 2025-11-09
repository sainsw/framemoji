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
// Use hash-based counters for guesses per reveal bucket
function guessesHashKey(day: string, r: number) { return `framemoji:${day}:guesses2:r${r}`; }

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
    const hKey = guessesHashKey(day, r);
    const t = await kvType(hKey);
    if (t && t !== 'hash' && t !== 'none') {
      await kvDel(hKey);
    }
    await kvFetch(`/hincrby/${encodeURIComponent(hKey)}/${encodeURIComponent(key)}/1`);
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
    const hKey = guessesHashKey(day, r);
    const ht = await kvType(hKey);
    if (ht && ht !== 'hash' && ht !== 'none') {
      await kvDel(hKey);
      return [] as { key: string; count: number }[];
    }
    const hres = await kvFetch(`/hgetall/${encodeURIComponent(hKey)}`);
    const arrH: any[] = hres?.result || [];
    if (!Array.isArray(arrH) || arrH.length === 0) return [] as { key: string; count: number }[];
    const entries: { key: string; count: number }[] = [];
    for (let i = 0; i < arrH.length; i += 2) {
      entries.push({ key: String(arrH[i]), count: Number(arrH[i + 1]) });
    }
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, limit);
  } catch {
    return [] as { key: string; count: number }[];
  }
}

// Debug helper: inspect key type/cardinality and raw responses for diagnosis
export async function __debugKVGuesses(day: string, revealed: number, limit = 10) {
  if (!hasKV()) {
    return { hasKV: false } as any;
  }
  const r = Math.min(Math.max(revealed, 1), 10);
  const hKey = guessesHashKey(day, r);
  const typeH = await kvType(hKey);
  let hlen: number | null = null;
  let hgetall: any = null;
  try {
    const hl = await kvFetch(`/hlen/${encodeURIComponent(hKey)}`);
    hlen = Number(hl?.result ?? null);
  } catch {}
  try {
    hgetall = await kvFetch(`/hgetall/${encodeURIComponent(hKey)}`);
  } catch (e) {
    hgetall = { error: (e as any)?.message || 'err' };
  }
  return { hasKV: true, hash: { key: hKey, type: typeH, hlen, hgetall } };
}
