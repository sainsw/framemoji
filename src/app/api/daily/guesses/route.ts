import { NextResponse } from "next/server";
import { utcDateKey } from "@/lib/daily";
import { loadHistogram } from "@/server/stats";
import { topGuessesKV } from "@/server/stats";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reveal = Number(url.searchParams.get("reveal") || 1);
  const limit = Number(url.searchParams.get("limit") || 10);
  const dateKey = utcDateKey();
  // Try KV-based top guesses first; if empty (e.g., running in file mode), load file histogram (with guesses) and compute locally
  let items = await topGuessesKV(dateKey, reveal, limit);
  if (items.length === 0) {
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
