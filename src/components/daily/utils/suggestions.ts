import { normalizeLettersOnly } from "@/lib/normalize";
import type { Movie } from "../types";

export function filterSuggestions(movies: Movie[], q: string) {
  const n = normalizeLettersOnly(q || "");
  if (!n) return [] as Movie[];
  let filtered = movies.filter((m) => normalizeLettersOnly(m.title).startsWith(n));
  if (filtered.length === 0) {
    filtered = movies.filter((m) => normalizeLettersOnly(m.title).includes(n));
  }
  if (filtered.length === 0) {
    filtered = movies.filter((m) => isSubsequence(n, normalizeLettersOnly(m.title)));
  }
  // Prefer items many users have rated; fallback to popularity
  filtered.sort((a, b) =>
    (Number(b.vote_count || 0) - Number(a.vote_count || 0)) ||
    (Number(b.popularity || 0) - Number(a.popularity || 0)) ||
    (a.title || "").localeCompare(b.title || "")
  );
  return filtered.slice(0, 8);
}

function isSubsequence(needle: string, haystack: string) {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i += 1;
  }
  return i === needle.length;
}
