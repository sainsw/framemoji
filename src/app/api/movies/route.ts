import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { loadPuzzles } from "@/server/puzzles";
import { normalizeTitle } from "@/lib/normalize";

type Movie = { id: string | number; title: string; year?: number; popularity?: number; poster_path?: string };

async function loadPublicList(): Promise<Movie[]> {
  try {
    const p = path.join(process.cwd(), "public", "data", "movies.json");
    const raw = await readFile(p, "utf8");
    const data = JSON.parse(raw) as Array<{ id: number; title: string; year?: number; popularity?: number; poster_path?: string }>;
    // Ensure numeric popularity if present; pass through poster_path
    return data.map(m => ({ ...m, popularity: m.popularity != null ? Number(m.popularity) : undefined, poster_path: m.poster_path }));
  } catch {
    return [];
  }
}

export async function GET() {
  const base = await loadPublicList();
  const puzzles = await loadPuzzles();
  const fromPuzzles: Movie[] = puzzles.map((p) => ({ id: `p-${p.id}`, title: p.title, year: p.year }));

  const byKey = new Map<string, Movie>();
  const add = (m: Movie) => {
    const key = `${normalizeTitle(m.title)}|${m.year ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, m);
  };
  base.forEach(add);
  fromPuzzles.forEach(add);

  const list = Array.from(byKey.values()).sort((a, b) => (Number(b.popularity || 0) - Number(a.popularity || 0)) || (a.title || '').localeCompare(b.title || '') || (a.year || 0) - (b.year || 0));
  return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
}
