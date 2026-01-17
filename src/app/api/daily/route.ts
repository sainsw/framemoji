import { NextResponse } from "next/server";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { loadPuzzles } from "@/server/puzzles";
import { getPinnedDailyId, pinDailyIdIfAbsent } from "@/server/dailyPin";

// Date validation regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestedDate = url.searchParams.get("date");
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

  const envSecret = process.env.FRAMEMOJI_DAILY_SECRET || process.env.EMOVI_DAILY_SECRET;
  const devMode = !envSecret;
  const secret = envSecret ?? "dev-secret";
  const puzzles = await loadPuzzles();

  // Check for pinned puzzle ID
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
    // Persist chosen id (no-op if already set via race)
    await pinDailyIdIfAbsent(dateKey, p.id);
  }

  return NextResponse.json(
    {
      day: dateKey,
      isToday,
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
