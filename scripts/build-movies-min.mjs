#!/usr/bin/env node

/**
 * Build a trimmed, presorted movie list for the client autocomplete.
 *
 * The full TMDB export (public/data/movies.json) is ~7MB / ~47k entries — far
 * too large to ship to the browser. This script produces a much smaller
 * public/data/movies.min.json containing only the movies a player could
 * realistically type, while guaranteeing every puzzle answer is retained so
 * answer/poster resolution still works.
 *
 * Kept entries:
 *   - the top N movies by vote_count (covers essentially every mainstream film)
 *   - every TMDB movie whose normalized title matches a puzzle answer, so the
 *     answer's poster_path always resolves regardless of its vote_count rank
 *
 * The output is merged + deduped + sorted using the same logic as the
 * /api/movies route so client behaviour is identical on the trimmed set.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const TOP_N = Number(process.env.MOVIES_MIN_TOP_N || 6000);
const SRC = path.join(ROOT, "public", "data", "movies.json");
const PUZZLES = path.join(ROOT, "data", "puzzles.json");
const OUT = path.join(ROOT, "public", "data", "movies.min.json");

// ── normalizeTitle: kept in sync with src/lib/normalize.ts ──────────────────
function stripDiacritics(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function romanToInt(roman) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  if (!/^(?=[IVXLCDM]+$)/i.test(roman)) return null;
  let sum = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const v = map[roman[i].toUpperCase()] ?? 0;
    if (v < prev) sum -= v;
    else sum += v;
    prev = v;
  }
  return sum;
}
function normalizeNumerals(s) {
  return s.replace(/\b([ivxlcdm]+)\b/gi, (m) => {
    if (m.toUpperCase() === "I") return m;
    const n = romanToInt(m);
    return n ? String(n) : m;
  });
}
function normalizeTitle(t) {
  const lower = stripDiacritics(t)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeNumerals(lower);
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`[build-movies-min] source not found: ${SRC}`);
    process.exit(0); // don't fail the build; route falls back to full list
  }

  const base = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const puzzles = fs.existsSync(PUZZLES)
    ? JSON.parse(fs.readFileSync(PUZZLES, "utf8"))
    : [];

  const puzzleTitles = new Set(puzzles.map((p) => normalizeTitle(p.title)));

  // Rank by vote_count so we can keep the top N; ties broken by popularity.
  const ranked = base
    .map((m, i) => ({ m, i }))
    .sort(
      (a, b) =>
        Number(b.m.vote_count || 0) - Number(a.m.vote_count || 0) ||
        Number(b.m.popularity || 0) - Number(a.m.popularity || 0)
    );

  const kept = [];
  ranked.forEach(({ m }, rank) => {
    if (rank < TOP_N || puzzleTitles.has(normalizeTitle(m.title))) {
      kept.push({
        id: m.id,
        title: m.title,
        year: m.year,
        popularity: m.popularity != null ? Number(m.popularity) : undefined,
        vote_count: m.vote_count != null ? Number(m.vote_count) : undefined,
        vote_average: m.vote_average != null ? Number(m.vote_average) : undefined,
        revenue: m.revenue != null ? Number(m.revenue) : undefined,
        poster_path: m.poster_path,
      });
    }
  });

  // Merge in puzzle titles (as the route does) and dedupe by normalized title+year.
  const fromPuzzles = puzzles.map((p) => ({
    id: `p-${p.id}`,
    title: p.title,
    year: p.year,
  }));
  const byKey = new Map();
  const add = (m) => {
    const key = `${normalizeTitle(m.title)}|${m.year ?? ""}`;
    if (!byKey.has(key)) byKey.set(key, m);
  };
  kept.forEach(add);
  fromPuzzles.forEach(add);

  const list = Array.from(byKey.values()).sort(
    (a, b) =>
      Number(b.vote_count || 0) - Number(a.vote_count || 0) ||
      Number(b.popularity || 0) - Number(a.popularity || 0) ||
      (a.title || "").localeCompare(b.title || "") ||
      (a.year || 0) - (b.year || 0)
  );

  fs.writeFileSync(OUT, JSON.stringify(list));
  const bytes = fs.statSync(OUT).size;
  console.log(
    `[build-movies-min] ${list.length} movies → ${OUT} (${(bytes / 1024).toFixed(0)} KB, from ${base.length} source entries)`
  );
}

main();
