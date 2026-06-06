import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { loadPuzzles } from "@/server/puzzles";
import { normalizeTitle } from "@/lib/normalize";

type Movie = {
  id: string | number;
  title: string;
  year?: number;
  popularity?: number;
  vote_count?: number;
  vote_average?: number;
  revenue?: number;
  poster_path?: string;
};

// Cache the assembled list in memory so a warm function instance never re-reads
// or re-parses the JSON on subsequent requests.
let cachedList: Promise<Movie[]> | null = null;

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const p = path.join(process.cwd(), "public", "data", file);
    return JSON.parse(await readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

/**
 * Build the full merged/sorted list from the complete TMDB export.
 * Only used as a fallback when the prebuilt minified list is absent
 * (e.g. `next dev` without running the prebuild step).
 */
async function buildFromFullList(): Promise<Movie[]> {
  const base =
    (await readJson<Array<Movie>>("movies.json"))?.map((m) => ({
      ...m,
      popularity: m.popularity != null ? Number(m.popularity) : undefined,
      vote_count: m.vote_count != null ? Number(m.vote_count) : undefined,
      vote_average: m.vote_average != null ? Number(m.vote_average) : undefined,
      revenue: m.revenue != null ? Number(m.revenue) : undefined,
    })) ?? [];
  const puzzles = await loadPuzzles();
  const fromPuzzles: Movie[] = puzzles.map((p) => ({ id: `p-${p.id}`, title: p.title, year: p.year }));

  const byKey = new Map<string, Movie>();
  const add = (m: Movie) => {
    const key = `${normalizeTitle(m.title)}|${m.year ?? ""}`;
    if (!byKey.has(key)) byKey.set(key, m);
  };
  base.forEach(add);
  fromPuzzles.forEach(add);

  return Array.from(byKey.values()).sort((a, b) =>
    (Number(b.vote_count || 0) - Number(a.vote_count || 0)) ||
    (Number(b.popularity || 0) - Number(a.popularity || 0)) ||
    (a.title || "").localeCompare(b.title || "") ||
    (a.year || 0) - (b.year || 0)
  );
}

async function loadMovies(): Promise<Movie[]> {
  // Prefer the prebuilt, presorted minified list (small + fast).
  const min = await readJson<Movie[]>("movies.min.json");
  if (min && min.length > 0) return min;
  return buildFromFullList();
}

export async function GET() {
  if (!cachedList) cachedList = loadMovies();
  const list = await cachedList;
  return NextResponse.json(list, {
    headers: {
      // Static, deploy-versioned data: cache hard at the CDN, revalidate in the
      // background. Invalidated automatically on the next deployment.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
