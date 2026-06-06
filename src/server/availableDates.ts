import { readdir } from "fs/promises";
import path from "path";
import { hasPg, getSql, ensureSchema } from "./db";

/**
 * List all available dates that have pinned puzzles.
 * Uses Neon Postgres when configured, otherwise reads from var/daily/*.json files.
 * Returns sorted array of date strings (YYYY-MM-DD) in descending order (most recent first).
 */
export async function listAvailableDates(): Promise<string[]> {
  if (hasPg()) {
    return listAvailableDatesFromPg();
  }
  return listAvailableDatesFromFiles();
}

async function listAvailableDatesFromPg(): Promise<string[]> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT day FROM daily_pins ORDER BY day DESC
    `) as Array<{ day: string }>;
    return rows.map((r) => String(r.day));
  } catch (e) {
    console.error("Failed to list dates from Postgres:", e);
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
