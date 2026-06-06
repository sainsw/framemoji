import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hasPg, getSql, ensureSchema } from "./db";

// Persist and read the pinned daily puzzle ID for a given UTC day key (YYYY-MM-DD).
// Uses Neon Postgres when configured, otherwise falls back to local file storage under var/daily.

const baseDir = path.join(process.cwd(), "var", "daily");

async function ensureDir() {
  await mkdir(baseDir, { recursive: true });
}

function filePath(day: string) {
  return path.join(baseDir, `${day}.json`);
}

export async function getPinnedDailyId(day: string): Promise<number | null> {
  if (hasPg()) {
    try {
      await ensureSchema();
      const sql = getSql();
      const rows = (await sql`
        SELECT puzzle_id FROM daily_pins WHERE day = ${day}
      `) as Array<{ puzzle_id: number }>;
      const id = rows[0]?.puzzle_id;
      return typeof id === "number" && Number.isFinite(id) ? id : null;
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
  if (hasPg()) {
    try {
      await ensureSchema();
      const sql = getSql();
      const rows = (await sql`
        INSERT INTO daily_pins (day, puzzle_id)
        VALUES (${day}, ${id})
        ON CONFLICT (day) DO UPDATE SET puzzle_id = daily_pins.puzzle_id
        RETURNING puzzle_id
      `) as Array<{ puzzle_id: number }>;
      const pinned = rows[0]?.puzzle_id;
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

// Force-set the pinned ID for a day, overwriting any existing value.
// Guarded to local/dev use by the calling route.
export async function setPinnedDailyId(day: string, id: number): Promise<number> {
  if (hasPg()) {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      INSERT INTO daily_pins (day, puzzle_id)
      VALUES (${day}, ${id})
      ON CONFLICT (day) DO UPDATE SET puzzle_id = EXCLUDED.puzzle_id
      RETURNING puzzle_id
    `) as Array<{ puzzle_id: number }>;
    return rows[0]?.puzzle_id ?? id;
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
