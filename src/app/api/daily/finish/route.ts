import { NextResponse } from "next/server";
import { utcDateKey, selectDailyIndex } from "@/lib/daily";
import { loadPuzzles } from "@/server/puzzles";
import { bumpHistogram, loadHistogram, percentileForReveal } from "@/server/stats";

type Body = { revealed?: number; correct?: boolean };

export async function POST(req: Request) {
  const { revealed, correct } = (await req.json().catch(() => ({}))) as Body;
  const r = typeof revealed === "number" && revealed > 0 ? Math.min(revealed, 10) : 10;
  const ok = !!correct;
  const dateKey = utcDateKey();
  // Update histogram
  const hist = await bumpHistogram(dateKey, r, ok);
  const { percentile, total } = percentileForReveal(hist, r, ok);
  // Reveal answer only after finish
  const secret = process.env.EMOVI_DAILY_SECRET || "dev-secret";
  const puzzles = await loadPuzzles();
  const index = selectDailyIndex(secret, dateKey, puzzles.length);
  const p = puzzles[index]!;
  return NextResponse.json({ percentile, total, histogram: hist, answer: ok ? undefined : p.title, id: p.id });
}

export async function GET() {
  // Optional: expose current histogram totals without answer
  const dateKey = utcDateKey();
  const hist = await loadHistogram(dateKey);
  const total = hist.solves.reduce((a, b) => a + b, 0) + hist.fail;
  return NextResponse.json({ total, histogram: hist });
}
