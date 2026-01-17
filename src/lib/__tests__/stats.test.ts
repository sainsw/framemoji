import { describe, it, expect, beforeEach } from "vitest";
import {
  loadStats,
  recordWin,
  recordLoss,
  resetLocalStats,
  type DailyStats,
} from "../stats";

describe("loadStats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default stats when nothing stored", () => {
    const stats = loadStats();
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.bestScore).toBe(0);
    expect(stats.lastScore).toBe(0);
  });

  it("returns stored stats", () => {
    const stored: DailyStats = {
      currentStreak: 5,
      bestStreak: 10,
      bestScore: 8,
      lastScore: 6,
      lastWinDate: "2025-12-30",
      lastPlayDate: "2025-12-30",
      todayKey: "2025-12-31",
    };
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    const stats = loadStats(new Date(Date.UTC(2025, 11, 31, 12, 0, 0)));
    expect(stats.currentStreak).toBe(5);
    expect(stats.bestStreak).toBe(10);
    expect(stats.bestScore).toBe(8);
  });

  it("resets todayCompleted when day rolls over", () => {
    const stored: DailyStats = {
      currentStreak: 3,
      bestStreak: 5,
      todayCompleted: true,
      todayKey: "2025-12-30",
    };
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    // Load on the next day
    const stats = loadStats(new Date(Date.UTC(2025, 11, 31, 12, 0, 0)));
    expect(stats.todayCompleted).toBe(false);
    expect(stats.todayKey).toBe("2025-12-31");
  });

  it("migrates from old emovi prefix", () => {
    const old: DailyStats = {
      currentStreak: 7,
      bestStreak: 12,
    };
    localStorage.setItem("emovi:dailyStats", JSON.stringify(old));

    const stats = loadStats();
    expect(stats.currentStreak).toBe(7);
    expect(stats.bestStreak).toBe(12);

    // Old key should be removed
    expect(localStorage.getItem("emovi:dailyStats")).toBeNull();
  });
});

describe("recordWin", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts streak at 1 for first win", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordWin(8, now);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
    expect(stats.lastWinDate).toBe("2025-12-31");
    expect(stats.todayCompleted).toBe(true);
  });

  it("continues streak from yesterday", () => {
    // Set up a win from yesterday
    const yesterday = new Date(Date.UTC(2025, 11, 30, 12, 0, 0));
    recordWin(6, yesterday);

    // Clear todayCompleted flag by simulating day change
    const stored = JSON.parse(localStorage.getItem("framemoji:dailyStats")!);
    stored.todayCompleted = false;
    stored.todayKey = "2025-12-31";
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    // Win today
    const today = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordWin(8, today);
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
  });

  it("resets streak if gap in days", () => {
    // Win on Dec 29
    const dec29 = new Date(Date.UTC(2025, 11, 29, 12, 0, 0));
    recordWin(6, dec29);

    // Clear flag
    const stored = JSON.parse(localStorage.getItem("framemoji:dailyStats")!);
    stored.todayCompleted = false;
    stored.todayKey = "2025-12-31";
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    // Win on Dec 31 (skipped Dec 30)
    const dec31 = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordWin(8, dec31);
    expect(stats.currentStreak).toBe(1); // Reset, not continued
  });

  it("prevents double counting same day", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    recordWin(8, now);
    const stats = recordWin(6, now); // Second win same day

    expect(stats.currentStreak).toBe(1); // Still 1, not 2
    expect(stats.bestScore).toBe(8); // First score kept
  });

  it("updates best score", () => {
    const day1 = new Date(Date.UTC(2025, 11, 30, 12, 0, 0));
    recordWin(4, day1);

    // Clear flag
    const stored = JSON.parse(localStorage.getItem("framemoji:dailyStats")!);
    stored.todayCompleted = false;
    stored.todayKey = "2025-12-31";
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    const day2 = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordWin(8, day2);
    expect(stats.bestScore).toBe(8);
    expect(stats.lastScore).toBe(8);
  });
});

describe("recordLoss", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("resets current streak to 0", () => {
    // Build a streak first
    const day1 = new Date(Date.UTC(2025, 11, 30, 12, 0, 0));
    recordWin(8, day1);

    // Clear flag
    const stored = JSON.parse(localStorage.getItem("framemoji:dailyStats")!);
    stored.todayCompleted = false;
    stored.todayKey = "2025-12-31";
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    const day2 = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordLoss(day2);
    expect(stats.currentStreak).toBe(0);
    expect(stats.lastScore).toBe(0);
  });

  it("preserves best streak after loss", () => {
    // Build a streak
    const day1 = new Date(Date.UTC(2025, 11, 30, 12, 0, 0));
    const afterWin = recordWin(8, day1);
    expect(afterWin.bestStreak).toBe(1);

    // Clear flag
    const stored = JSON.parse(localStorage.getItem("framemoji:dailyStats")!);
    stored.todayCompleted = false;
    stored.todayKey = "2025-12-31";
    localStorage.setItem("framemoji:dailyStats", JSON.stringify(stored));

    const day2 = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordLoss(day2);
    expect(stats.bestStreak).toBe(1); // Preserved
    expect(stats.currentStreak).toBe(0); // Reset
  });

  it("prevents double counting same day", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    recordWin(8, now); // Win first

    // Try to record loss same day (should be ignored)
    const stats = recordLoss(now);
    expect(stats.currentStreak).toBe(1); // Preserved from win
    expect(stats.todayCompleted).toBe(true);
  });

  it("sets todayCompleted flag", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const stats = recordLoss(now);
    expect(stats.todayCompleted).toBe(true);
  });
});

describe("resetLocalStats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears stats from localStorage", () => {
    recordWin(8, new Date());
    expect(localStorage.getItem("framemoji:dailyStats")).not.toBeNull();

    resetLocalStats();
    expect(localStorage.getItem("framemoji:dailyStats")).toBeNull();
  });
});
