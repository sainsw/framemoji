export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Returns YYYY-MM-DD in UTC
export function utcDateKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  return `${y}-${m}-${day}`;
}

export function utcYesterdayKey(d: Date = new Date()): string {
  const y = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - 1,
    0, 0, 0, 0
  ));
  return utcDateKey(y);
}

export function isNewUtcDay(prevKey?: string, now: Date = new Date()): boolean {
  if (!prevKey) return true;
  return prevKey !== utcDateKey(now);
}

export function nextUtcMidnight(now: Date = new Date()): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
}

export function msUntilNextUtcMidnight(now: Date = new Date()): number {
  return nextUtcMidnight(now).getTime() - now.getTime();
}
