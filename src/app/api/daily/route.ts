import { NextResponse } from "next/server";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { loadPuzzles } from "@/server/puzzles";

export async function GET() {
  const dateKey = utcDateKey();
  const envSecret = process.env.EMOVI_DAILY_SECRET;
  const devMode = !envSecret;
  const secret = envSecret ?? "dev-secret";
  const puzzles = await loadPuzzles();
  const index = selectDailyIndex(secret, dateKey, puzzles.length);
  const p = puzzles[index]!;
  return NextResponse.json(
    {
      day: dateKey,
      puzzle: {
        id: p.id,
        year: p.year,
        emoji_clues: p.emoji_clues,
      },
      // In dev mode (no EMOVI_DAILY_SECRET set), include the answer to help testing
      answer: devMode ? p.title : undefined,
      dev: devMode,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
