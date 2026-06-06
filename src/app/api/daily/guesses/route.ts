import { NextResponse } from "next/server";

// Ensure this route is always evaluated dynamically (no static caching)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
import { utcDateKey } from "@/lib/daily";
import { topGuesses as topGuessesPg, __debugGuesses } from "@/server/stats";
import { hasPg } from "@/server/db";

// Date validation regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reveal = Number(url.searchParams.get("reveal") || 1);
  const limit = Number(url.searchParams.get("limit") || 10);
  const debug = url.searchParams.get("debug") === "1";
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
  // Try Postgres-based top guesses first; fall back to file mode for local dev
  let items: { key: string; count: number }[] = [];
  const tried: string[] = [];
  try {
    tried.push("pg");
    items = await topGuessesPg(dateKey, reveal, limit);
  } catch (e) {
    if (debug) tried.push(`pg_error:${(e as any)?.message || 'err'}`);
  }
  if (items.length === 0 && !hasPg()) {
    try {
      tried.push("file");
      const { loadHistogram: loadFileHistogram, topGuesses } = await import("@/server/statsStore");
      const fileHist = await loadFileHistogram(dateKey);
      // @ts-ignore
      items = topGuesses(fileHist, reveal, limit) as any;
    } catch {
      if (debug) tried.push("file_error");
      items = [];
    }
  }
  if (debug) {
    const dbg = await __debugGuesses(dateKey, reveal).catch(() => null);
    return NextResponse.json({ reveal, items, tried, dateKey, env: {
      hasPg: hasPg(),
      runtime: process.env.NEXT_RUNTIME || 'unknown'
    }, pg: dbg });
  }
  return NextResponse.json({ reveal, items });
}
