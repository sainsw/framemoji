import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Centralised Neon Postgres access for the daily-game storage layer.
//
// Connection string is resolved from the standard Vercel/Neon env vars (in
// priority order). When none is configured — or EMOVI_USE_FILE_STATS=1 is set —
// callers fall back to local file storage under var/ for development.

export function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NO_SSL ||
    undefined
  );
}

export function hasPg(): boolean {
  return !!getConnectionString() && process.env.EMOVI_USE_FILE_STATS !== "1";
}

let client: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!client) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error("No Postgres connection string configured");
    }
    client = neon(connectionString);
  }
  return client;
}

// Lazily create the tables once per process. The promise is memoised so the
// DDL runs at most once; on failure it resets so a later call can retry.
let schemaPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = initSchema().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

async function initSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS daily_pins (
      day TEXT PRIMARY KEY,
      puzzle_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // bucket: 0..N-1 = reveal-step index for a solve, -1 = a failed attempt.
  await sql`
    CREATE TABLE IF NOT EXISTS daily_solves (
      day TEXT NOT NULL,
      bucket INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, bucket)
    )
  `;
  // reveal: 1-based reveal-step bucket the guess was made at.
  await sql`
    CREATE TABLE IF NOT EXISTS daily_guesses (
      day TEXT NOT NULL,
      reveal INTEGER NOT NULL,
      guess_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, reveal, guess_key)
    )
  `;
}
