import { NextResponse } from "next/server";
import { utcDateKey } from "@/lib/daily";
import { listAvailableDates } from "@/server/availableDates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const today = utcDateKey();
  const dates = await listAvailableDates();

  // Ensure today is always included (even if not yet pinned)
  const allDates = dates.includes(today) ? dates : [today, ...dates];

  return NextResponse.json(
    {
      today,
      dates: allDates,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
