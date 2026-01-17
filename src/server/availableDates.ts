import { readdir } from "fs/promises";
import path from "path";

// Support both Vercel KV (KV_*) and Upstash for Redis (UPSTASH_REDIS_REST_*) env vars
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_FILE = process.env.EMOVI_USE_FILE_STATS === "1";

function hasKV() {
  return !!KV_URL && !!KV_TOKEN && !USE_FILE;
}

async function kvFetch(pathname: string, init?: RequestInit) {
  const url = `${KV_URL}${pathname}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  return res.json();
}

// Date key pattern: framemoji:YYYY-MM-DD:puzzle
const KEY_PATTERN = "framemoji:*:puzzle";
const DATE_REGEX = /^framemoji:(\d{4}-\d{2}-\d{2}):puzzle$/;

/**
 * List all available dates that have pinned puzzles.
 * Uses Upstash SCAN when KV is configured, otherwise reads from var/daily/*.json files.
 * Returns sorted array of date strings (YYYY-MM-DD) in descending order (most recent first).
 */
export async function listAvailableDates(): Promise<string[]> {
  if (hasKV()) {
    return listAvailableDatesFromKV();
  }
  return listAvailableDatesFromFiles();
}

async function listAvailableDatesFromKV(): Promise<string[]> {
  const dates = new Set<string>();
  let cursor = "0";
  const maxIterations = 20; // Safety limit
  let iterations = 0;

  try {
    do {
      // SCAN cursor MATCH pattern COUNT 100
      const data = await kvFetch(
        `/scan/${cursor}/MATCH/${encodeURIComponent(KEY_PATTERN)}/COUNT/100`
      );
      const result = data?.result;
      if (!Array.isArray(result) || result.length < 2) break;

      cursor = String(result[0]);
      const keys: string[] = result[1] || [];

      for (const key of keys) {
        const match = DATE_REGEX.exec(key);
        if (match?.[1]) {
          dates.add(match[1]);
        }
      }

      iterations++;
    } while (cursor !== "0" && iterations < maxIterations);

    return sortDatesDescending([...dates]);
  } catch (e) {
    console.error("Failed to list dates from KV:", e);
    // Fall back to file-based
    return listAvailableDatesFromFiles();
  }
}

async function listAvailableDatesFromFiles(): Promise<string[]> {
  const baseDir = path.join(process.cwd(), "var", "daily");
  try {
    const files = await readdir(baseDir);
    const dates: string[] = [];

    for (const file of files) {
      // Match YYYY-MM-DD.json
      const match = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(file);
      if (match?.[1]) {
        dates.push(match[1]);
      }
    }

    return sortDatesDescending(dates);
  } catch {
    // Directory doesn't exist or can't be read
    return [];
  }
}

function sortDatesDescending(dates: string[]): string[] {
  return dates.sort((a, b) => b.localeCompare(a));
}

/**
 * Check if a specific date has a pinned puzzle available.
 */
export async function isDateAvailable(dateKey: string): Promise<boolean> {
  const dates = await listAvailableDates();
  return dates.includes(dateKey);
}
