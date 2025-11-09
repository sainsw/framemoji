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
  try {
    // Also write to a hash-based counter for broad REST compatibility
    const hKey = guessesHashKey(day, r);
    const t2 = await kvType(hKey);
    if (t2 && t2 !== 'hash' && t2 !== 'none') {
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
    // Prefer hash-based counters for maximum compatibility
    const hKey = guessesHashKey(day, r);
    const ht = await kvType(hKey);
    if (ht && ht !== 'hash' && ht !== 'none') {
      await kvDel(hKey);
    }
    try {
      const hres = await kvFetch(`/hgetall/${encodeURIComponent(hKey)}`);
      const arrH: any[] = hres?.result || [];
      if (Array.isArray(arrH) && arrH.length > 0) {
        const entries: { key: string; count: number }[] = [];
        for (let i = 0; i < arrH.length; i += 2) {
          entries.push({ key: String(arrH[i]), count: Number(arrH[i + 1]) });
        }
        entries.sort((a, b) => b.count - a.count);
        return entries.slice(0, limit);
      }
    } catch {
      // fall through to zset path
    }
    // Validate key type first to avoid WRONGTYPE errors
    const gKey = guessesKey(day, r);
    const t = await kvType(gKey);
    if (t && t !== 'zset' && t !== 'none') {
      await kvDel(gKey);
      return [] as { key: string; count: number }[];
    }
    // Try Upstash-style ZREVRANGE first
    const end = Math.max(0, limit - 1);
    const data = await kvFetch(`/zrevrange/${encodeURIComponent(gKey)}/0/${end}?withscores=true`);
    let arr: any[] = data?.result || [];
    // Fallback: some environments may not honor withscores; if empty, try without and fetch scores per member
    if (!arr || arr.length === 0) {
      // Vercel KV-style: ZRANGE with rev=true
      try {
        const vr = await kvFetch(`/zrange/${encodeURIComponent(gKey)}/0/${end}?rev=true&withscores=true`);
        const arr2: any[] = vr?.result || [];
        if (arr2 && arr2.length > 0) {
          arr = arr2;
        } else {
          // Try without scores and then ZSCORE per member
          const vrNo = await kvFetch(`/zrange/${encodeURIComponent(gKey)}/0/${end}?rev=true`);
          const members2: any[] = vrNo?.result || [];
          if (members2 && members2.length > 0) {
            const out2: { key: string; count: number }[] = [];
            for (const m of members2) {
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
      } catch {
        // As a last try, use ZREVRANGE without scores
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

// Debug helper: inspect key type/cardinality and raw responses for diagnosis
export async function __debugKVGuesses(day: string, revealed: number, limit = 10) {
  if (!hasKV()) {
    return { hasKV: false } as any;
  }
  const r = Math.min(Math.max(revealed, 1), 10);
  const gKey = guessesKey(day, r);
  const end = Math.max(0, limit - 1);
  const type = await kvType(gKey);
  const hKey = guessesHashKey(day, r);
  const typeH = await kvType(hKey);
  let zcard: number | null = null;
  let hlen: number | null = null;
  try {
    const zc = await kvFetch(`/zcard/${encodeURIComponent(gKey)}`);
    zcard = Number(zc?.result ?? null);
  } catch {}
  try {
    const hl = await kvFetch(`/hlen/${encodeURIComponent(hKey)}`);
    hlen = Number(hl?.result ?? null);
  } catch {}
  let zrevrange: any = null;
  let zrange: any = null;
  let zrangeNoScores: any = null;
  let hgetall: any = null;
  try {
    zrevrange = await kvFetch(`/zrevrange/${encodeURIComponent(gKey)}/0/${end}?withscores=true`);
  } catch (e) {
    zrevrange = { error: (e as any)?.message || 'err' };
  }
  try {
    zrange = await kvFetch(`/zrange/${encodeURIComponent(gKey)}/0/${end}?rev=true&withscores=true`);
  } catch (e) {
    zrange = { error: (e as any)?.message || 'err' };
  }
  try {
    zrangeNoScores = await kvFetch(`/zrange/${encodeURIComponent(gKey)}/0/${end}?rev=true`);
  } catch (e) {
    zrangeNoScores = { error: (e as any)?.message || 'err' };
  }
  try {
    hgetall = await kvFetch(`/hgetall/${encodeURIComponent(hKey)}`);
  } catch (e) {
    hgetall = { error: (e as any)?.message || 'err' };
  }
  return { hasKV: true, key: gKey, type, zcard, zrevrange, zrange, zrangeNoScores, hash: { key: hKey, type: typeH, hlen, hgetall } };
}
