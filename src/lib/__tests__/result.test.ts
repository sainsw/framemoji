import { describe, it, expect, beforeEach } from "vitest";
import { getDailyResult, setDailyResult, clearAllDailyResults, type DailyResult } from "../result";

describe("getDailyResult", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no result stored", () => {
    expect(getDailyResult("2025-12-31")).toBeNull();
  });

  it("returns stored result", () => {
    const result: DailyResult = {
      correct: true,
      revealed: 3,
      score: 8,
      title: "The Matrix",
    };
    setDailyResult("2025-12-31", result);
    expect(getDailyResult("2025-12-31")).toEqual(result);
  });

  it("returns null for different day", () => {
    const result: DailyResult = {
      correct: true,
      revealed: 5,
      score: 6,
    };
    setDailyResult("2025-12-31", result);
    expect(getDailyResult("2025-12-30")).toBeNull();
  });
});

describe("setDailyResult", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores result that can be retrieved", () => {
    const result: DailyResult = {
      correct: false,
      revealed: 10,
      score: 0,
      answer: "Inception",
    };
    setDailyResult("2025-06-15", result);
    const retrieved = getDailyResult("2025-06-15");
    expect(retrieved).toEqual(result);
  });

  it("overwrites existing result", () => {
    const result1: DailyResult = { correct: false, revealed: 5, score: 0 };
    const result2: DailyResult = { correct: true, revealed: 5, score: 6 };
    setDailyResult("2025-06-15", result1);
    setDailyResult("2025-06-15", result2);
    expect(getDailyResult("2025-06-15")).toEqual(result2);
  });

  it("stores optional fields correctly", () => {
    const result: DailyResult = {
      correct: true,
      revealed: 3,
      score: 8,
      percentile: 85,
      title: "Pulp Fiction",
      id: "12345",
    };
    setDailyResult("2025-06-15", result);
    const retrieved = getDailyResult("2025-06-15");
    expect(retrieved?.percentile).toBe(85);
    expect(retrieved?.title).toBe("Pulp Fiction");
    expect(retrieved?.id).toBe("12345");
  });
});

describe("clearAllDailyResults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes all daily results", () => {
    setDailyResult("2025-12-29", { correct: true, revealed: 3, score: 8 });
    setDailyResult("2025-12-30", { correct: false, revealed: 10, score: 0 });
    setDailyResult("2025-12-31", { correct: true, revealed: 5, score: 6 });

    clearAllDailyResults();

    expect(getDailyResult("2025-12-29")).toBeNull();
    expect(getDailyResult("2025-12-30")).toBeNull();
    expect(getDailyResult("2025-12-31")).toBeNull();
  });

  it("does not affect other localStorage keys", () => {
    localStorage.setItem("other-key", "other-value");
    setDailyResult("2025-12-31", { correct: true, revealed: 3, score: 8 });

    clearAllDailyResults();

    expect(localStorage.getItem("other-key")).toBe("other-value");
    expect(getDailyResult("2025-12-31")).toBeNull();
  });
});

describe("migration from old prefix", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates from old emovi prefix to framemoji", () => {
    const result: DailyResult = {
      correct: true,
      revealed: 5,
      score: 6,
    };
    // Simulate old storage format
    localStorage.setItem("emovi:dailyResult:2025-12-31", JSON.stringify(result));

    const retrieved = getDailyResult("2025-12-31");
    expect(retrieved).toEqual(result);

    // Old key should be removed
    expect(localStorage.getItem("emovi:dailyResult:2025-12-31")).toBeNull();
    // New key should exist
    expect(localStorage.getItem("framemoji:dailyResult:2025-12-31")).not.toBeNull();
  });
});
