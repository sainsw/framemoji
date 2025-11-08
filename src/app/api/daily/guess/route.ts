import { NextResponse } from "next/server";
import { loadPuzzles } from "@/server/puzzles";
import { normalizeTitle } from "@/lib/normalize";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { recordGuess } from "@/server/stats";

type Body = { guess?: string; revealed?: number };

export async function POST(req: Request) {
  const { guess, revealed } = (await req.json().catch(() => ({}))) as Body;
  if (!guess || typeof guess !== "string") {
    return NextResponse.json({ error: "Missing guess" }, { status: 400 });
  }
  const r = typeof revealed === "number" && revealed > 0 ? Math.min(revealed, 10) : 1;
  const dateKey = utcDateKey();
  const puzzles = await loadPuzzles();
  const secret = process.env.FRAMEMOJI_DAILY_SECRET || process.env.EMOVI_DAILY_SECRET || "dev-secret";
  const index = selectDailyIndex(secret, dateKey, puzzles.length);
  const p = puzzles[index]!;
  const correct = normalizeTitle(guess) === normalizeTitle(p.title);
  const nextReveal = correct ? r : Math.min(r + 1, 10);
  const score = correct ? Math.max(1, 11 - r) : 0;
  // Record guess popularity at the current reveal level (before potential reveal increment)
  await recordGuess(dateKey, r, normalizeTitle(guess));
  return NextResponse.json({ correct, revealed: nextReveal, score });
}
