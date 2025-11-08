import { readFile } from "fs/promises";
import path from "path";

export interface FramemojiEntry {
  id: number;
  imdb_rank?: number;
  imdb_id?: string;
  title: string;
  year: number;
  emoji_clues: [string, string, string, string, string, string, string, string, string, string];
}

let cache: { data: FramemojiEntry[]; mtime: number } | null = null;

export async function loadPuzzles(): Promise<FramemojiEntry[]> {
  const file = path.join(process.cwd(), "data", "puzzles.json");
  // For simplicity in dev, no fs stat caching; read once into memory
  if (cache) return cache.data;
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as FramemojiEntry[];
  cache = { data, mtime: Date.now() };
  return data;
}
