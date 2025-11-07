#!/usr/bin/env node
// Enrich movies.json by filling missing years via TMDB /movie/{id}
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

async function getDetailsYear(id) {
  const url = buildUrl(`/movie/${id}`);
  const d = await fetchJSON(url);
  return parseYear(d.release_date);
}

async function main() {
  await ensureDirs();
  const metaPath = path.join(VAR_DIR, 'enrich_years.json');
  const meta = await readJSON(metaPath, {});
  const LIMIT = Number(process.env.TMDB_ENRICH_LIMIT || 10000);
  const CONC = Number(process.env.TMDB_CONCURRENCY || 8);

  const list = await readJSON(MOVIES_JSON, []);
  const targets = list.filter(m => m.year == null).slice(0, LIMIT);
  console.log(`Enriching years for ${targets.length} titles (limit ${LIMIT}, conc ${CONC})`);
  if (targets.length === 0) {
    console.log('No titles missing year. Nothing to do.');
    process.exit(0);
  }

  let idx = 0; let done = 0; let updated = 0; let failed = 0;
  function nextIndex() { const i = idx; idx += 1; return i; }

  async function worker() {
    while (true) {
      const i = nextIndex();
      if (i >= targets.length) break;
      const t = targets[i];
      try {
        const year = await getDetailsYear(t.id);
        if (year) { t.year = year; updated += 1; }
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
    if (m && t.year) m.year = t.year;
  }
  await writeJSON(MOVIES_JSON, Array.from(byId.values()));
  await writeJSON(metaPath, { updated, failed, at: new Date().toISOString() });
  console.log(`Updated years: ${updated}, failed: ${failed}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
