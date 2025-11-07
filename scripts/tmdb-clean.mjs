#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { MOVIES_JSON, VAR_DIR, loadEnv } from './tmdb-utils.mjs';

await loadEnv();

async function rmIfExists(p) {
  try { await fs.rm(p, { force: true }); } catch {}
}

async function clean() {
  console.log(`Removing ${MOVIES_JSON} (if present)`);
  await rmIfExists(MOVIES_JSON);
  const files = ['last_export.json', 'last_changes.json', 'enrich_years.json'];
  for (const f of files) {
    const p = path.join(VAR_DIR, f);
    console.log(`Removing ${p} (if present)`);
    await rmIfExists(p);
  }
}

clean().catch((e) => { console.error(e.message || e); process.exit(1); });

