import { NextResponse } from "next/server";
import { loadPuzzles } from "@/server/puzzles";

export async function GET() {
  const puzzles = await loadPuzzles();
  const random = puzzles[Math.floor(Math.random() * puzzles.length)]!;
  return NextResponse.json({
    count: puzzles.length,
    random,
    puzzles,
  });
}
