import { NextResponse } from "next/server";
import { loadPuzzles } from "@/server/puzzles";
import { normalizeTitle } from "@/lib/normalize";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { recordGuess } from "@/server/stats";
import { getPinnedDailyId, pinDailyIdIfAbsent } from "@/server/dailyPin";
import { nextRevealCount, revealStepForCount } from "@/lib/reveal";

// Date validation regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type Body = { guess?: string; revealed?: number; date?: string };

export async function POST(req: Request) {
  const { guess, revealed, date: requestedDate } = (await req.json().catch(() => ({}))) as Body;
  if (!guess || typeof guess !== "string") {
    return NextResponse.json({ error: "Missing guess" }, { status: 400 });
  }

  const today = utcDateKey();

  // Validate date format if provided
  if (requestedDate && !DATE_REGEX.test(requestedDate)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  // Don't allow future dates
  if (requestedDate && requestedDate > today) {
    return NextResponse.json(
      { error: "Cannot access future puzzles." },
      { status: 400 }
    );
  }

  const dateKey = requestedDate || today;
  const isToday = dateKey === today;

  const r = typeof revealed === "number" && revealed > 0 ? revealStepForCount(revealed) : revealStepForCount(3);
  const puzzles = await loadPuzzles();
  const secret = process.env.FRAMEMOJI_DAILY_SECRET || process.env.EMOVI_DAILY_SECRET || "dev-secret";

  // Use pinned id if present
  const pinned = await getPinnedDailyId(dateKey);
  let p = pinned != null ? puzzles.find((x) => x.id === pinned) : undefined;

  if (!p) {
    // For past dates, if no pinned puzzle exists, the date is not available
    if (!isToday) {
      return NextResponse.json(
        { error: "No puzzle available for this date." },
        { status: 404 }
      );
    }
    // For today, calculate and pin
    const index = selectDailyIndex(secret, dateKey, puzzles);
    p = puzzles[index]!;
    await pinDailyIdIfAbsent(dateKey, p.id);
  }

  const correct = normalizeTitle(guess) === normalizeTitle(p.title);
  const nextReveal = correct ? r : nextRevealCount(r);
  const score = correct ? Math.max(1, 11 - r) : 0;
  // Record guess popularity at the current reveal level (before potential reveal increment)
  await recordGuess(dateKey, r, normalizeTitle(guess));
  return NextResponse.json({ correct, revealed: nextReveal, score });
}
