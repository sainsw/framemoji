import { useMemo } from "react";
import { normalizeTitle } from "@/lib/normalize";
import type { DailyMeta, Movie } from "../types";

export function useMovieDetails({
  movies,
  meta,
  finalTitle,
  answer,
}: {
  movies: Movie[];
  meta: DailyMeta | null;
  finalTitle: string | null;
  answer: string | null;
}) {
  const solutionTitle = useMemo(() => {
    const title = finalTitle ?? answer ?? meta?.answer ?? null;
    if (!title) return null;
    // Try to resolve year from TMDB list; fallback to puzzle year
    const norm = normalizeTitle(title);
    // Prefer exact normalized match; fallback to word-boundary partial match for alternate titles
    let cands = movies.filter((m) => typeof m.id === "number" && normalizeTitle(m.title) === norm);
    if (cands.length === 0) {
      const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRe = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
      cands = movies.filter((m) => typeof m.id === "number" && wordRe.test(normalizeTitle(m.title)));
    }
    const y = (() => {
      if (cands.length > 0) {
        const targetYear = meta?.puzzle.year;
        const best = cands.slice().sort((a, b) => {
          const da = targetYear && a.year ? Math.abs(a.year - targetYear) : 9999;
          const db = targetYear && b.year ? Math.abs(b.year - targetYear) : 9999;
          if (da !== db) return da - db;
          return Number(b.popularity || 0) - Number(a.popularity || 0);
        })[0];
        if (best?.year) return best.year;
      }
      return meta?.puzzle.year;
    })();
    return `${title}${y ? ` (${y})` : ""}`;
  }, [movies, meta, finalTitle, answer]);

  const posterUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE;
    if (!base) return null;
    const title = finalTitle ?? answer ?? meta?.answer ?? null;
    if (!title) return null;
    const norm = normalizeTitle(title);
    const y = meta?.puzzle.year;
    // First try exact normalized title match
    const cands = movies.filter((m) => normalizeTitle(m.title) === norm);
    // If no exact matches OR no posters among exact matches, augment with word-boundary partials
    const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordRe = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
    if (cands.length === 0 || cands.every((m) => !m.poster_path)) {
      const partials = movies.filter((m) => wordRe.test(normalizeTitle(m.title)));
      // Dedupe by id while preserving existing exact matches
      const seen = new Set(cands.map((m) => m.id));
      for (const m of partials) {
        if (!seen.has(m.id)) {
          cands.push(m);
          seen.add(m.id);
        }
      }
    }
    if (cands.length === 0) return null;
    cands.sort((a, b) => {
      // Prefer entries with poster_path
      const hasPosterA = a.poster_path ? 1 : 0;
      const hasPosterB = b.poster_path ? 1 : 0;
      if (hasPosterA !== hasPosterB) return hasPosterB - hasPosterA;
      // Prefer year closeness to the puzzle year
      const da = y && a.year ? Math.abs(a.year - y) : 9999;
      const db = y && b.year ? Math.abs(b.year - y) : 9999;
      if (da !== db) return da - db;
      // Then prefer widely-rated titles, then revenue, then rating, then popularity
      const vc = Number(b.vote_count || 0) - Number(a.vote_count || 0);
      if (vc !== 0) return vc;
      const rev = Number(b.revenue || 0) - Number(a.revenue || 0);
      if (rev !== 0) return rev;
      const va = Number(b.vote_average || 0) - Number(a.vote_average || 0);
      if (va !== 0) return va;
      return Number(b.popularity || 0) - Number(a.popularity || 0);
    });
    const best = cands[0];
    if (!best?.poster_path) return null;
    return `${base}${best.poster_path}`;
  }, [movies, meta, finalTitle, answer]);

  return { solutionTitle, posterUrl };
}
