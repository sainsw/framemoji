# Framemoji

Emoji-based movie trivia prototype built with Next.js (App Router, TypeScript).

## Getting started

- Prereqs: Node 18+ and npm (or pnpm/yarn)
- Install deps: `npm install`
- Run dev server: `npm run dev`
- Open: http://localhost:3000

## Structure

- `src/app/page.tsx`: Home page with the game
- `src/components/Game.tsx`: Client-side game logic/UI
- `data/puzzles.json`: Emoji→movie dataset (JSON schema below)
- `src/app/api/puzzles/route.ts`: Example API returning puzzles
- `src/styles/globals.css`: Minimal styling
- Daily APIs: `GET /api/daily`, `POST /api/daily/guess`, `POST /api/daily/finish`

## Notes

- Answers are matched loosely: lowercased, punctuation removed, common articles ignored.
- Update or expand puzzles in `data/puzzles.json`.
- Daily mode only: everyone sees the same movie, rotates 00:00:00 UTC.
- Server checks guesses; answer only revealed on finish.
- Daily streaks (planned): client-only via `localStorage`, keyed by UTC date.

## Local stats (streaks)

- UTC-based: streak increments only once per UTC day on a correct finish.
- Stored locally: no login/auth; see `src/lib/stats.ts`.
- Helpers: `recordWin()` and `recordLoss()` update `currentStreak` and `bestStreak`.
- Autocomplete list: `GET /api/movies` merges `data/puzzles.json` titles with `public/data/movies.json` (if present), so daily answers always appear in suggestions.

## Puzzles JSON schema

Each entry in `data/puzzles.json`:

[
  {
    "id": 1,
    "imdb_rank": 1,            // optional
    "imdb_id": "tt0111161",   // optional
    "title": "The Shawshank Redemption",
    "year": 1994,
    "emoji_clues": ["🧱","⛓️","🌧️","📖","👬","🔨","🕳️","🚽","🚪","☀️"]
  }
]

## Environment

- `FRAMEMOJI_DAILY_SECRET`: secret used to deterministically pick today’s movie via HMAC(date).
  - Backwards-compatible: `EMOVI_DAILY_SECRET` still works if set.
  - If absent, app assumes dev mode: `/api/daily` includes the answer and the UI shows it in a footer to help testing.
- `TMDB_API_KEY`: required for `npm run tmdb:update` (TMDB API changes endpoint). Optional for `tmdb:build` if the export server requires it.
- `TMDB_EXPORT_DATE` (optional): override date for `tmdb:build` in `MM_DD_YYYY` format.
- `NEXT_PUBLIC_TMDB_IMAGE_BASE`: base URL used to build poster image URLs (client-side). Example: `https://image.tmdb.org/t/p/w342`

## Percentile storage

- By default (local dev), stats are stored in the filesystem at `var/stats/YYYY-MM-DD.json`.
- In production, enable Vercel KV (Upstash Redis) by setting:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - Optional: `EMOVI_USE_FILE_STATS=1` to force file-mode even if KV is configured.
- Keys used in KV:
  - `framemoji:YYYY-MM-DD:solves` (hash fields `r1..r10`, `fail`)
  - `framemoji:YYYY-MM-DD:guesses:rN` (sorted set of normalized guesses; scores = counts)

## Autocomplete data (TMDB)

- Build from daily export:
  - `npm run tmdb:build`
  - Downloads `movie_ids_MM_DD_YYYY.json.gz` and merges into `public/data/movies.json`.
  - Filtering (env vars, with sensible defaults):
    - `TMDB_MIN_YEAR` (default 1950)
    - `TMDB_MIN_POPULARITY` (default 1)
    - `TMDB_MAX_COUNT` (default 50000, sorted by popularity desc)
    - `TMDB_OVERWRITE` (set to `1` to overwrite instead of merge; useful if you previously built a very large file)
    - `TMDB_REQUIRE_YEAR` (set to `1` to only include entries that already have a year in the export)
    - `TMDB_LATIN_ONLY` (default on). Set to `0` to allow non‑Latin titles; by default we keep only titles whose letter characters are in the Latin script (accents allowed).
  - Optional: `TMDB_EXPORT_DATE=09_01_2025` to target a specific export date.
- Incremental updates:
  - `npm run tmdb:update` (requires `TMDB_API_KEY`)
  - Uses `/movie/changes` since the last run, fetches details for changed IDs, applies the same filters as above, and merges into `public/data/movies.json`.
  - Tracks last run in `var/tmdb/last_changes.json`.
 
- Clean + full refresh:
  - `npm run tmdb:clean` removes the current `public/data/movies.json` and TMDB metadata.
  - `npm run tmdb:full` runs a fresh build with overwrite and then enriches missing years:
    - Equivalent to: `TMDB_OVERWRITE=1 npm run tmdb:build && npm run tmdb:enrich`
    - Set env filters before running to control size and recency (see above).
  
- Enrich years and posters:
  - `npm run tmdb:enrich` (requires `TMDB_API_KEY`)
  - Fetches details for titles in `public/data/movies.json` missing `year` or `poster_path` and fills them from TMDB `/movie/{id}`.
  - Env: `TMDB_ENRICH_LIMIT` (default 1000), `TMDB_CONCURRENCY` (default 8).
  - Note: The TMDB daily export typically does not include `release_date`, so most entries will initially have no `year`. Run the enrich step after building.
  - The `poster_path` saved is the TMDB path (e.g., `/kqjL17yufvn9OVLyXYpvtyrFfak.jpg`). The app uses `NEXT_PUBLIC_TMDB_IMAGE_BASE + poster_path` to hotlink posters.
