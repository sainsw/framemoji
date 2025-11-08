import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// Persist and read the pinned daily puzzle ID for a given UTC day key (YYYY-MM-DD).
// Uses Vercel KV/Upstash Redis when configured, otherwise falls back to local file storage under var/daily.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_FILE = process.env.EMOVI_USE_FILE_STATS === "1"; // re-use flag from stats for local FS preference

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

function kvKey(day: string) {
  return `framemoji:${day}:puzzle`;
}

const baseDir = path.join(process.cwd(), "var", "daily");

async function ensureDir() {
  await mkdir(baseDir, { recursive: true });
}

function filePath(day: string) {
  return path.join(baseDir, `${day}.json`);
}

export async function getPinnedDailyId(day: string): Promise<number | null> {
  if (hasKV()) {
    try {
      const data = await kvFetch(`/get/${encodeURIComponent(kvKey(day))}`);
      const raw = data?.result;
      if (raw == null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      // fall through to file as a best-effort fallback
    }
  }
  try {
    await ensureDir();
    const raw = await readFile(filePath(day), "utf8");
    const obj = JSON.parse(raw) as { id?: number };
    const n = obj?.id;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function pinDailyIdIfAbsent(day: string, id: number): Promise<number> {
  // Try KV first if available
  if (hasKV()) {
    try {
      // SETNX returns 1 if set, 0 if key already exists
      await kvFetch(`/setnx/${encodeURIComponent(kvKey(day))}/${encodeURIComponent(String(id))}`);
      const pinned = await getPinnedDailyId(day);
      return typeof pinned === "number" ? pinned : id;
    } catch {
      // ignore and attempt file fallback
    }
  }
  try {
    await ensureDir();
    // If already exists, keep existing
    const existing = await getPinnedDailyId(day);
    if (typeof existing === "number") return existing;
    await writeFile(filePath(day), JSON.stringify({ id }), "utf8");
    return id;
  } catch {
    return id;
  }
}

// Local-only: force-set today's pinned ID. Only used in file-storage mode for development.
export async function setPinnedDailyId(day: string, id: number): Promise<number> {
  // Intentionally avoid KV: this is a local-only helper.
  if (hasKV()) {
    throw new Error("Cannot set pinned daily ID when KV is configured");
  }
  try {
    await ensureDir();
    await writeFile(filePath(day), JSON.stringify({ id }), "utf8");
    return id;
  } catch (e) {
    // Best-effort: if write fails, surface the error for the caller
    throw e;
  }
}
