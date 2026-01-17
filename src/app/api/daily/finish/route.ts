import { NextResponse } from "next/server";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { loadPuzzles } from "@/server/puzzles";
import { bumpHistogram, loadHistogram, percentileForReveal } from "@/server/stats";
import { getPinnedDailyId, pinDailyIdIfAbsent } from "@/server/dailyPin";
import { revealStepForCount } from "@/lib/reveal";

// Date validation regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type Body = { revealed?: number; correct?: boolean; date?: string };

export async function POST(req: Request) {
  const { revealed, correct, date: requestedDate } = (await req.json().catch(() => ({}))) as Body;

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

  const r = typeof revealed === "number" && revealed > 0 ? revealStepForCount(revealed) : revealStepForCount(10);
  const ok = !!correct;

  // Update histogram for the specific date
  const hist = await bumpHistogram(dateKey, r, ok);
  const { percentile, total } = percentileForReveal(hist, r, ok);

  // Reveal answer only after finish
  const secret = process.env.FRAMEMOJI_DAILY_SECRET || process.env.EMOVI_DAILY_SECRET || "dev-secret";
  const puzzles = await loadPuzzles();
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

  return NextResponse.json({
    percentile,
    total,
    histogram: hist,
    answer: ok ? undefined : p.title,
    id: p.id,
    isToday,
  });
}

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

  const dateKey = requestedDate || today;

  // Optional: expose current histogram totals without answer
  const hist = await loadHistogram(dateKey);
  const total = hist.solves.reduce((a, b) => a + b, 0) + hist.fail;
  return NextResponse.json({ total, histogram: hist, date: dateKey });
}
