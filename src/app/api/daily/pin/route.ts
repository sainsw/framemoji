import { NextResponse } from "next/server";
import { utcDateKey } from "@/lib/date";
import { loadPuzzles } from "@/server/puzzles";
import { setPinnedDailyId } from "@/server/dailyPin";

export async function POST(req: Request) {
  // Local-only: allow when no daily secret is set OR when explicitly using file storage.
  const envSecret = process.env.FRAMEMOJI_DAILY_SECRET || process.env.EMOVI_DAILY_SECRET;
  const devMode = !envSecret;
  const useFile = process.env.EMOVI_USE_FILE_STATS === "1";
  if (!devMode && !useFile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = Number((body as any)?.id);
  const day = (body as any)?.day as string | undefined;
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }
  const dateKey = day || utcDateKey();

  const puzzles = await loadPuzzles();
  const exists = puzzles.some((p) => p.id === id);
  if (!exists) {
    return NextResponse.json({ error: "Unknown puzzle id" }, { status: 400 });
  }

  try {
    const pinned = await setPinnedDailyId(dateKey, id);
    return NextResponse.json({ day: dateKey, id: pinned }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to pin id" }, { status: 500 });
  }
}

