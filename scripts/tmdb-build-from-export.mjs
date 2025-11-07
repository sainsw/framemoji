#!/usr/bin/env node
// Fetch TMDB daily export (movie_ids_MM_DD_YYYY.json.gz) and build public/data/movies.json
import path from 'node:path';
import zlib from 'node:zlib';
import { ensureDirs, readJSON, writeJSON, mergeMovies, httpsGet, MOVIES_JSON, VAR_DIR, loadEnv, isLatinTitle } from './tmdb-utils.mjs';

await loadEnv();
const today = new Date();
const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
const dd = String(today.getUTCDate()).padStart(2, '0');
const yyyy = today.getUTCFullYear();
const dateOverride = process.env.TMDB_EXPORT_DATE; // format MM_DD_YYYY
const dateStr = dateOverride || `${mm}_${dd}_${yyyy}`;

const apiKey = process.env.TMDB_API_KEY;
const base = 'https://files.tmdb.org/p/exports';
const file = `movie_ids_${dateStr}.json.gz`;
const url = `${base}/${file}${apiKey ? `?api_key=${apiKey}` : ''}`;

function parseYear(release_date) {
  if (!release_date) return undefined;
  const m = String(release_date).match(/^(\d{4})/);
  return m ? Number(m[1]) : undefined;
}

async function main() {
  await ensureDirs();
  console.log(`Downloading TMDB export: ${url}`);
  const gz = await httpsGet(url);
  const jsonl = zlib.gunzipSync(gz).toString('utf8');

  const additions = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const id = obj.id;
      const title = obj.title || obj.original_title;
      if (!id || !title) continue;
      const year = parseYear(obj.release_date);
      const adult = !!obj.adult;
      const popularity = Number(obj.popularity) || 0;
      additions.push({ id, title, year, adult, popularity });
    } catch {
      // ignore bad lines
    }
  }
  console.log(`Parsed ${additions.length} movies from export.`);

  // Filtering knobs
  const MIN_YEAR = Number(process.env.TMDB_MIN_YEAR || 1950);
  const MIN_POP = Number(process.env.TMDB_MIN_POPULARITY || 1);
  const MAX_COUNT = Number(process.env.TMDB_MAX_COUNT || 50000);
  const LATIN_ONLY = process.env.TMDB_LATIN_ONLY === undefined ? true : /^(1|true|yes)$/i.test(process.env.TMDB_LATIN_ONLY);

  const REQUIRE_YEAR = /^(1|true|yes)$/i.test(process.env.TMDB_REQUIRE_YEAR || '');

  const filtered = additions
    .filter(m => !m.adult)
    .filter(m => (m.year ? m.year >= MIN_YEAR : true))
    .filter(m => m.popularity >= MIN_POP)
    .filter(m => (LATIN_ONLY ? isLatinTitle(m.title) : true))
    .filter(m => (REQUIRE_YEAR ? !!m.year : true))
    .sort((a,b)=> (b.popularity - a.popularity) || (a.title||'').localeCompare(b.title||''))
    .slice(0, MAX_COUNT)
    .map(({id,title,year,popularity}) => ({ id, title, year, popularity }));

  const OVERWRITE = /^(1|true|yes)$/i.test(process.env.TMDB_OVERWRITE || '');
  const withYear = filtered.filter(m => m.year != null).length;
  const withoutYear = filtered.length - withYear;
  console.log(`Filtered set: ${filtered.length} (with year: ${withYear}, missing year: ${withoutYear}).`);

  const existing = await readJSON(MOVIES_JSON, []);
  // Apply a minimal prune to existing (year filter) when not overwriting
  const existingPruned = existing
    .filter(m => (m.year ? m.year >= MIN_YEAR : true))
    .filter(m => (LATIN_ONLY ? isLatinTitle(m.title) : true));
  const finalList = OVERWRITE ? filtered : mergeMovies(existingPruned, filtered);
  await writeJSON(MOVIES_JSON, finalList);

  await writeJSON(path.join(VAR_DIR, 'last_export.json'), {
    date: dateStr,
    updatedAt: new Date().toISOString(),
    count: finalList.length,
    filters: { MIN_YEAR, MIN_POP, MAX_COUNT, OVERWRITE, REQUIRE_YEAR, LATIN_ONLY },
    stats: { withYear, withoutYear }
  });
  console.log(`Wrote ${finalList.length} movies to ${MOVIES_JSON} ${OVERWRITE ? '(overwrite)' : '(merged)'}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
