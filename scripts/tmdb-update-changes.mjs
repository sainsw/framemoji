#!/usr/bin/env node
// Incremental update using TMDB /movie/changes and per-movie details
import path from 'node:path';
import { ensureDirs, readJSON, writeJSON, mergeMovies, MOVIES_JSON, VAR_DIR, loadEnv, isLatinTitle } from './tmdb-utils.mjs';
import https from 'node:https';

await loadEnv();
const API = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error('TMDB_API_KEY is required for changes update');
  process.exit(1);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function buildUrl(pathname, params = {}) {
  const u = new URL(API + pathname);
  u.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
}

function parseYear(release_date) {
  if (!release_date) return undefined;
  const m = String(release_date).match(/^(\d{4})/);
  return m ? Number(m[1]) : undefined;
}

async function getChanges(since) {
  const results = new Set();
  let page = 1;
  while (true) {
    const url = buildUrl('/movie/changes', { page, start_date: since });
    const data = await fetchJSON(url);
    for (const r of data.results || []) results.add(r.id);
    if (page >= (data.total_pages || 1)) break;
    page += 1;
  }
  return Array.from(results);
}

async function getDetails(id) {
  const url = buildUrl(`/movie/${id}`, { language: 'en-US' });
  const d = await fetchJSON(url);
  return {
    id: d.id,
    title: d.title || d.original_title,
    year: parseYear(d.release_date),
    adult: !!d.adult,
    popularity: Number(d.popularity) || 0,
    vote_count: Number(d.vote_count) || 0,
    vote_average: Number(d.vote_average) || 0,
    revenue: Number(d.revenue) || 0,
    poster_path: d.poster_path || null,
  };
}

async function main() {
  await ensureDirs();
  const metaPath = path.join(VAR_DIR, 'last_changes.json');
  const meta = await readJSON(metaPath, { since: new Date(Date.now() - 7*86400000).toISOString().slice(0,10) });
  const since = process.env.TMDB_SINCE || meta.since;
  const MIN_YEAR = Number(process.env.TMDB_MIN_YEAR || 1950);
  const MIN_POP = Number(process.env.TMDB_MIN_POPULARITY || 1);
  const LATIN_ONLY = process.env.TMDB_LATIN_ONLY === undefined ? true : /^(1|true|yes)$/i.test(process.env.TMDB_LATIN_ONLY);
  console.log(`Fetching TMDB changes since ${since}...`);
  const ids = await getChanges(since);
  console.log(`Changed movies: ${ids.length}`);
  const additions = [];
  for (const id of ids) {
    try { additions.push(await getDetails(id)); }
    catch (e) { console.warn(`Skip ${id}: ${e.message || e}`); }
  }
  const filtered = additions
    .filter(m => !m.adult)
    .filter(m => (m.year ? m.year >= MIN_YEAR : true))
    .filter(m => m.popularity >= MIN_POP)
    .filter(m => (LATIN_ONLY ? isLatinTitle(m.title) : true))
    .map(({id,title,year,popularity,poster_path,vote_count,vote_average,revenue}) => ({ id, title, year, popularity, poster_path, vote_count, vote_average, revenue }));
  const existing = await readJSON(MOVIES_JSON, []);
  const existingPruned = existing
    .filter(m => (m.year ? m.year >= MIN_YEAR : true))
    .filter(m => (LATIN_ONLY ? isLatinTitle(m.title) : true));
  const merged = mergeMovies(existingPruned, filtered);
  await writeJSON(MOVIES_JSON, merged);
  await writeJSON(metaPath, { since: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString(), count: merged.length });
  console.log(`Wrote ${merged.length} movies to ${MOVIES_JSON}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
