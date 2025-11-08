export type DailyResult = {
  correct: boolean;
  revealed: number; // 1..10 or 10 on fail
  score: number; // 10..1 on success, 0 on fail
  percentile?: number; // optional if not computed yet
  answer?: string; // present if failed
  // On success, store the winning title locally so we can
  // render it (and the poster) on refresh without server reveal.
  title?: string;
  id?: string; // optional puzzle id
};

const PREFIX = "framemoji:dailyResult:";
const OLD_PREFIX = "emovi:dailyResult:";

export function getDailyResult(day: string): DailyResult | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = localStorage.getItem(PREFIX + day);
    if (!raw) {
      // migrate from old prefix if present
      const old = localStorage.getItem(OLD_PREFIX + day);
      if (old) {
        localStorage.setItem(PREFIX + day, old);
        localStorage.removeItem(OLD_PREFIX + day);
        raw = old;
      }
    }
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

export function setDailyResult(day: string, res: DailyResult) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + day, JSON.stringify(res));
  } catch {
    // ignore
  }
}

export function clearAllDailyResults() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
