#!/usr/bin/env node
// Enrich movies.json by filling missing years and poster paths via TMDB /movie/{id}
import path from 'node:path';
import https from 'node:https';
import { ensureDirs, readJSON, writeJSON, MOVIES_JSON, VAR_DIR, loadEnv } from './tmdb-utils.mjs';

await loadEnv();
const API = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error('TMDB_API_KEY is required for tmdb:enrich');
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

function buildUrl(pathname) {
  const u = new URL(API + pathname);
  u.searchParams.set('api_key', API_KEY);
  u.searchParams.set('language', 'en-US');
  return u.toString();
}

function parseYear(release_date) {
  if (!release_date) return undefined;
  const m = String(release_date).match(/^(\d{4})/);
  return m ? Number(m[1]) : undefined;
}

async function getDetails(id) {
  const url = buildUrl(`/movie/${id}`);
  const d = await fetchJSON(url);
  return {
    year: parseYear(d.release_date),
    poster_path: d.poster_path || null,
    vote_count: Number(d.vote_count) || 0,
    vote_average: Number(d.vote_average) || 0,
    revenue: Number(d.revenue) || 0,
  };
}

async function main() {
  await ensureDirs();
  const metaPath = path.join(VAR_DIR, 'enrich_details.json');
  const meta = await readJSON(metaPath, {});
  const LIMIT = Number(process.env.TMDB_ENRICH_LIMIT || 1000);
  const CONC = Number(process.env.TMDB_CONCURRENCY || 8);

  const list = await readJSON(MOVIES_JSON, []);
  // Target items missing year or poster_path
  const targets = list.filter(m => m.year == null || m.poster_path == null).slice(0, LIMIT);
  console.log(`Enriching details for ${targets.length} titles (limit ${LIMIT}, conc ${CONC})`);
  if (targets.length === 0) {
    console.log('No titles missing year or poster. Nothing to do.');
    process.exit(0);
  }

  let idx = 0; let done = 0; let updatedYear = 0; let updatedPoster = 0; let failed = 0;
  function nextIndex() { const i = idx; idx += 1; return i; }

  async function worker() {
    while (true) {
      const i = nextIndex();
      if (i >= targets.length) break;
      const t = targets[i];
      try {
        const info = await getDetails(t.id);
        if (info.year && !t.year) { t.year = info.year; updatedYear += 1; }
        if (info.poster_path && !t.poster_path) { t.poster_path = info.poster_path; updatedPoster += 1; }
        // Persist optional metrics if present (may be 0); don't count in updated stats
        if (typeof info.vote_count === 'number') t.vote_count = info.vote_count;
        if (typeof info.vote_average === 'number') t.vote_average = info.vote_average;
        if (typeof info.revenue === 'number') t.revenue = info.revenue;
      } catch (e) {
        failed += 1;
      } finally { done += 1; if (done % 50 === 0) console.log(`.. ${done}/${targets.length}`); }
    }
  }

  const workers = Array.from({ length: CONC }, () => worker());
  await Promise.all(workers);

  // Merge updates back into list
  const byId = new Map(list.map(m => [String(m.id), m]));
  for (const t of targets) {
    const m = byId.get(String(t.id));
    if (m) {
      if (t.year) m.year = t.year;
      if (t.poster_path) m.poster_path = t.poster_path;
    }
  }
  await writeJSON(MOVIES_JSON, Array.from(byId.values()));
  await writeJSON(metaPath, { updatedYear, updatedPoster, failed, at: new Date().toISOString() });
  console.log(`Updated years: ${updatedYear}, posters: ${updatedPoster}, failed: ${failed}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
