#!/usr/bin/env node

// Create the Postgres tables used by the daily game.
// Reads the connection string from the standard Vercel/Neon env vars.
// Usage: node scripts/db-init.mjs   (after `vercel env pull` or with env set)

import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NO_SSL;

if (!connectionString) {
  console.error(
    "No Postgres connection string found. Set DATABASE_URL / POSTGRES_URL (e.g. run `vercel env pull`)."
  );
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS daily_pins (
      day TEXT PRIMARY KEY,
      puzzle_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS daily_solves (
      day TEXT NOT NULL,
      bucket INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, bucket)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS daily_guesses (
      day TEXT NOT NULL,
      reveal INTEGER NOT NULL,
      guess_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, reveal, guess_key)
    )
  `;
  console.log("Postgres schema is ready (daily_pins, daily_solves, daily_guesses).");
}

main().catch((err) => {
  console.error("Failed to initialise schema:", err);
  process.exit(1);
});
