import { NextResponse } from "next/server";

// Ensure this route is always evaluated dynamically (no static caching)
export const dynamic = "force-dynamic";
import { utcDateKey } from "@/lib/daily";
import { loadHistogram } from "@/server/stats";
import { topGuessesKV } from "@/server/stats";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reveal = Number(url.searchParams.get("reveal") || 1);
  const limit = Number(url.searchParams.get("limit") || 10);
  const dateKey = utcDateKey();
  // Try KV-based top guesses first; optionally fall back to file mode when explicitly enabled
  let items = await topGuessesKV(dateKey, reveal, limit);
  const useFileFallback = process.env.EMOVI_USE_FILE_STATS === "1" || (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL);
  if (items.length === 0 && useFileFallback) {
    try {
      const { loadHistogram: loadFileHistogram, topGuesses } = await import("@/server/statsStore");
      const fileHist = await loadFileHistogram(dateKey);
      // @ts-ignore
      items = topGuesses(fileHist, reveal, limit) as any;
    } catch {
      items = [];
    }
  }
  return NextResponse.json({ reveal, items });
}
