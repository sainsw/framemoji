import { describe, it, expect, beforeEach } from "vitest";
import { setDailyResult, getCompletedDates } from "../result";

describe("getCompletedDates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty set when no results stored", () => {
    const dates = getCompletedDates();
    expect(dates.size).toBe(0);
  });

  it("returns set of completed date keys", () => {
    setDailyResult("2025-12-29", { correct: true, revealed: 3, score: 8 });
    setDailyResult("2025-12-30", { correct: false, revealed: 10, score: 0 });
    setDailyResult("2025-12-31", { correct: true, revealed: 5, score: 6 });

    const dates = getCompletedDates();
    
    expect(dates.size).toBe(3);
    expect(dates.has("2025-12-29")).toBe(true);
    expect(dates.has("2025-12-30")).toBe(true);
    expect(dates.has("2025-12-31")).toBe(true);
  });

  it("ignores non-date localStorage keys", () => {
    localStorage.setItem("framemoji:dailyResult:2025-12-31", JSON.stringify({ correct: true, revealed: 3, score: 8 }));
    localStorage.setItem("framemoji:dailyStats", JSON.stringify({ streak: 5 }));
    localStorage.setItem("other-key", "value");

    const dates = getCompletedDates();
    
    expect(dates.size).toBe(1);
    expect(dates.has("2025-12-31")).toBe(true);
  });

  it("validates date format", () => {
    localStorage.setItem("framemoji:dailyResult:2025-12-31", JSON.stringify({ correct: true, revealed: 3, score: 8 }));
    localStorage.setItem("framemoji:dailyResult:invalid", JSON.stringify({ correct: true, revealed: 3, score: 8 }));
    localStorage.setItem("framemoji:dailyResult:2025-1-1", JSON.stringify({ correct: true, revealed: 3, score: 8 }));

    const dates = getCompletedDates();
    
    expect(dates.size).toBe(1);
    expect(dates.has("2025-12-31")).toBe(true);
    expect(dates.has("invalid")).toBe(false);
    expect(dates.has("2025-1-1")).toBe(false);
  });
});
