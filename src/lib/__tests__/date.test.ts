import { describe, it, expect } from "vitest";
import {
  utcDateKey,
  utcYesterdayKey,
  isNewUtcDay,
  nextUtcMidnight,
  msUntilNextUtcMidnight,
  pad,
} from "../date";

describe("pad", () => {
  it("pads single digit numbers with zero", () => {
    expect(pad(0)).toBe("00");
    expect(pad(1)).toBe("01");
    expect(pad(9)).toBe("09");
  });

  it("does not pad double digit numbers", () => {
    expect(pad(10)).toBe("10");
    expect(pad(31)).toBe("31");
    expect(pad(99)).toBe("99");
  });
});

describe("utcDateKey", () => {
  it("returns YYYY-MM-DD format", () => {
    const date = new Date(Date.UTC(2025, 11, 31, 12, 0, 0)); // Dec 31, 2025 noon UTC
    expect(utcDateKey(date)).toBe("2025-12-31");
  });

  it("pads single digit months and days", () => {
    const date = new Date(Date.UTC(2025, 0, 5, 0, 0, 0)); // Jan 5, 2025
    expect(utcDateKey(date)).toBe("2025-01-05");
  });

  it("uses current date when no argument provided", () => {
    const result = utcDateKey();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles year boundaries correctly", () => {
    const newYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(utcDateKey(newYear)).toBe("2026-01-01");
  });
});

describe("utcYesterdayKey", () => {
  it("returns previous day", () => {
    const date = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    expect(utcYesterdayKey(date)).toBe("2025-12-30");
  });

  it("handles month boundaries", () => {
    const marchFirst = new Date(Date.UTC(2025, 2, 1, 12, 0, 0)); // March 1
    expect(utcYesterdayKey(marchFirst)).toBe("2025-02-28");
  });

  it("handles year boundaries", () => {
    const janFirst = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(utcYesterdayKey(janFirst)).toBe("2025-12-31");
  });

  it("handles leap year February", () => {
    const marchFirst2024 = new Date(Date.UTC(2024, 2, 1, 12, 0, 0));
    expect(utcYesterdayKey(marchFirst2024)).toBe("2024-02-29");
  });
});

describe("isNewUtcDay", () => {
  it("returns true when no previous key", () => {
    expect(isNewUtcDay(undefined)).toBe(true);
    expect(isNewUtcDay("")).toBe(true);
  });

  it("returns true when previous key differs from today", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    expect(isNewUtcDay("2025-12-30", now)).toBe(true);
  });

  it("returns false when previous key matches today", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    expect(isNewUtcDay("2025-12-31", now)).toBe(false);
  });
});

describe("nextUtcMidnight", () => {
  it("returns midnight of next UTC day", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 15, 30, 0));
    const next = nextUtcMidnight(now);
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(0);
    expect(next.getUTCDate()).toBe(1);
    expect(next.getUTCHours()).toBe(0);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCSeconds()).toBe(0);
  });

  it("handles being exactly at midnight", () => {
    const midnight = new Date(Date.UTC(2025, 11, 31, 0, 0, 0));
    const next = nextUtcMidnight(midnight);
    expect(utcDateKey(next)).toBe("2026-01-01");
  });
});

describe("msUntilNextUtcMidnight", () => {
  it("returns positive milliseconds", () => {
    const now = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    const ms = msUntilNextUtcMidnight(now);
    expect(ms).toBeGreaterThan(0);
    // 12 hours = 43,200,000 ms
    expect(ms).toBe(12 * 60 * 60 * 1000);
  });

  it("returns 24 hours when at exact midnight", () => {
    const midnight = new Date(Date.UTC(2025, 11, 31, 0, 0, 0));
    const ms = msUntilNextUtcMidnight(midnight);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  it("returns small value when close to midnight", () => {
    const almostMidnight = new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 0));
    const ms = msUntilNextUtcMidnight(almostMidnight);
    expect(ms).toBe(1000); // 1 second
  });
});
