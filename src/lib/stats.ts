// Local, client-only stats for daily streaks (UTC-based)

import { utcDateKey, utcYesterdayKey } from "@/lib/date";

export type DailyStats = {
  currentStreak: number; // consecutive days won
  bestStreak: number;
  lastWinDate?: string; // YYYY-MM-DD (UTC)
  lastPlayDate?: string; // YYYY-MM-DD (UTC)
  // scoring
  bestScore?: number; // max points achieved in a single day (10..1)
  lastScore?: number; // last game's score
  // Track if today's daily was completed to prevent double counting
  todayCompleted?: boolean;
  todayKey?: string; // cache of last seen day to reset flags when day rolls
};

const KEY = "emovi:dailyStats";

function safeParse<T>(raw: string | null): T | undefined {
  try {
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function loadStats(now: Date = new Date()): DailyStats {
  if (typeof window === "undefined") {
    return { currentStreak: 0, bestStreak: 0, bestScore: 0, lastScore: 0 } as DailyStats;
  }
  const stored = safeParse<DailyStats>(localStorage.getItem(KEY));
  const today = utcDateKey(now);
  if (!stored) return { currentStreak: 0, bestStreak: 0, bestScore: 0, lastScore: 0, todayKey: today };
  // Reset daily flags if day rolled over
  if (stored.todayKey && stored.todayKey !== today) {
    stored.todayCompleted = false;
  }
  stored.todayKey = today;
  // Backfill missing fields
  if (stored.bestScore == null) stored.bestScore = 0;
  if (stored.lastScore == null) stored.lastScore = 0;
  return stored;
}

function saveStats(s: DailyStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function recordWin(score?: number, now: Date = new Date()) {
  const s = loadStats(now);
  const today = utcDateKey(now);
  if (s.todayCompleted) {
    // Already counted for today
    return s;
  }
  const yesterday = utcYesterdayKey(now);
  const continues = s.lastWinDate === yesterday;
  const nextStreak = continues ? (s.currentStreak || 0) + 1 : 1;
  const best = Math.max(s.bestStreak || 0, nextStreak);
  const bestScore = Math.max(s.bestScore || 0, score || 0);
  const updated: DailyStats = {
    ...s,
    currentStreak: nextStreak,
    bestStreak: best,
    lastWinDate: today,
    lastPlayDate: today,
    bestScore,
    lastScore: score || s.lastScore || 0,
    todayCompleted: true,
    todayKey: today,
  };
  saveStats(updated);
  return updated;
}

export function recordLoss(now: Date = new Date()) {
  const s = loadStats(now);
  const today = utcDateKey(now);
  if (s.todayCompleted) {
    // Already finished (e.g., previously won); don't alter streak
    return s;
  }
  const updated: DailyStats = {
    ...s,
    currentStreak: 0,
    lastPlayDate: today,
    lastScore: 0,
    todayCompleted: true,
    todayKey: today,
  };
  saveStats(updated);
  return updated;
}

export function resetLocalStats() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
