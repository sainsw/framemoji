import { NextResponse } from "next/server";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { loadPuzzles } from "@/server/puzzles";
import { getPinnedDailyId, pinDailyIdIfAbsent } from "@/server/dailyPin";

export async function GET() {
  const dateKey = utcDateKey();
  const envSecret = process.env.FRAMEMOJI_DAILY_SECRET || process.env.EMOVI_DAILY_SECRET;
  const devMode = !envSecret;
  const secret = envSecret ?? "dev-secret";
  const puzzles = await loadPuzzles();
  // Pin today's puzzle ID on first request and use it thereafter
  let pinned = await getPinnedDailyId(dateKey);
  let p = pinned != null ? puzzles.find((x) => x.id === pinned) : undefined;
  if (!p) {
    const index = selectDailyIndex(secret, dateKey, puzzles);
    p = puzzles[index]!;
    // Persist chosen id (no-op if already set via race)
    await pinDailyIdIfAbsent(dateKey, p.id);
  }
  return NextResponse.json(
    {
      day: dateKey,
      puzzle: {
        id: p.id,
        year: p.year,
        emoji_clues: p.emoji_clues,
      },
      // In dev mode (no secret set), include the answer to help testing
      answer: devMode ? p.title : undefined,
      dev: devMode,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
