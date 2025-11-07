import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';

const VAR_DIR = path.join(process.cwd(), 'var', 'tmdb');
const MOVIES_JSON = path.join(process.cwd(), 'public', 'data', 'movies.json');

export async function ensureDirs() {
  await fsp.mkdir(path.dirname(MOVIES_JSON), { recursive: true });
  await fsp.mkdir(VAR_DIR, { recursive: true });
}

export async function readJSON(file, def) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return def; }
}

export async function writeJSON(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export function normalizeTitle(t) { return t.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase(); }

export function isLatinTitle(title) {
  if (!title) return false;
  // Check all letters belong to Latin script (accents allowed). Allow digits/punct/space.
  const letters = title.match(/\p{L}/gu) || [];
  for (const ch of letters) {
    if (!/\p{Script=Latin}/u.test(ch)) return false;
  }
  return true;
}

export function mergeMovies(base, additions) {
  const byId = new Map(base.map(m => [String(m.id), m]));
  for (const m of additions) {
    const id = String(m.id);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, m);
    } else {
      // prefer newer title/year if present
      byId.set(id, { ...existing, ...m });
    }
  }
  // stable sort by popularity desc (if present), then title, then year
  return Array.from(byId.values()).sort((a,b)=> (Number(b.popularity||0) - Number(a.popularity||0)) || (a.title||'').localeCompare(b.title||'') || (a.year||0)-(b.year||0));
}

export function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect
        httpsGet(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

export async function loadEnv() {
  // Minimal .env loader (no deps). Parses KEY=VALUE lines.
  const candidates = [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')];
  for (const file of candidates) {
    try {
      const raw = await fsp.readFile(file, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const [, key, valRaw] = m;
        // Remove optional surrounding quotes
        const val = valRaw.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        if (!(key in process.env)) process.env[key] = val;
      }
    } catch {
      // ignore missing
    }
  }
}

export { VAR_DIR, MOVIES_JSON };
