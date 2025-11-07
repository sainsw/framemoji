import { NextResponse } from "next/server";
import { PUZZLES } from "@/data/puzzles";

export function GET() {
  const random = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]!;
  return NextResponse.json({
    count: PUZZLES.length,
    random,
    puzzles: PUZZLES,
  });
}

