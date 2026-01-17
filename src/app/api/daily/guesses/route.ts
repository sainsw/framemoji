import { NextResponse } from "next/server";

// Ensure this route is always evaluated dynamically (no static caching)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
import { utcDateKey } from "@/lib/daily";
import { topGuessesKV, __debugKVGuesses } from "@/server/stats";

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
  // Try KV-based top guesses first; optionally fall back to file mode when explicitly enabled
  let items: { key: string; count: number }[] = [];
  const tried: string[] = [];
  try {
    tried.push("kv");
    items = await topGuessesKV(dateKey, reveal, limit);
  } catch (e) {
    if (debug) tried.push(`kv_error:${(e as any)?.message || 'err'}`);
  }
  const useFileFallback = process.env.EMOVI_USE_FILE_STATS === "1" || (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL);
  if (items.length === 0 && useFileFallback) {
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
    const dbg = await __debugKVGuesses(dateKey, reveal).catch(() => null);
    return NextResponse.json({ reveal, items, tried, dateKey, env: {
      hasKV: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
      runtime: process.env.NEXT_RUNTIME || 'unknown'
    }, kv: dbg });
  }
  return NextResponse.json({ reveal, items });
}
