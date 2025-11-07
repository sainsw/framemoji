import { NextResponse } from "next/server";
import { utcDateKey } from "@/lib/daily";
import { loadHistogram } from "@/server/stats";
import { topGuessesKV } from "@/server/stats";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reveal = Number(url.searchParams.get("reveal") || 1);
  const limit = Number(url.searchParams.get("limit") || 10);
  const dateKey = utcDateKey();
  const hist = await loadHistogram(dateKey);
  // Try KV-based top guesses first; if empty (e.g., file mode), fall back to file histogram if available via statsStore (not imported here)
  let items = await topGuessesKV(dateKey, reveal, limit);
  if (items.length === 0) {
    // reconstruct using file histogram if running in file mode
    try {
      const { topGuesses } = await import("@/server/statsStore");
      // @ts-ignore - type mismatch not critical
      items = topGuesses(hist as any, reveal, limit) as any;
    } catch {
      items = [];
    }
  }
  return NextResponse.json({ reveal, items });
}
