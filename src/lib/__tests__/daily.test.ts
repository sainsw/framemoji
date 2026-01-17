import { describe, it, expect } from "vitest";
import { utcDateKey, selectDailyIndex } from "../daily";

describe("utcDateKey (from daily.ts)", () => {
  it("returns YYYY-MM-DD format", () => {
    const date = new Date(Date.UTC(2025, 5, 15, 12, 0, 0)); // June 15, 2025
    expect(utcDateKey(date)).toBe("2025-06-15");
  });
});

describe("selectDailyIndex", () => {
  const mockItems = [
    { id: 100 },
    { id: 200 },
    { id: 300 },
    { id: 400 },
    { id: 500 },
  ];

  it("is deterministic for same inputs", () => {
    const secret = "test-secret";
    const dateKey = "2025-12-31";
    const idx1 = selectDailyIndex(secret, dateKey, mockItems);
    const idx2 = selectDailyIndex(secret, dateKey, mockItems);
    expect(idx1).toBe(idx2);
  });

  it("returns same index for same date across multiple calls", () => {
    const secret = "production-secret";
    const dateKey = "2026-01-15";
    const results = Array.from({ length: 10 }, () =>
      selectDailyIndex(secret, dateKey, mockItems)
    );
    expect(new Set(results).size).toBe(1);
  });

  it("different secrets produce different permutations", () => {
    // Test multiple dates to ensure different permutations
    const dates = ["2025-01-01", "2025-06-15", "2025-12-31"];
    const secret1Results = dates.map((d) =>
      selectDailyIndex("secret-a", d, mockItems)
    );
    const secret2Results = dates.map((d) =>
      selectDailyIndex("secret-b", d, mockItems)
    );
    // At least one should differ (statistically almost certain)
    expect(secret1Results).not.toEqual(secret2Results);
  });

  it("different dates produce different indices over time", () => {
    const secret = "consistent-secret";
    const indices = new Set<number>();
    // Check 30 consecutive days
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.UTC(2025, 0, 1 + i));
      const dateKey = utcDateKey(date);
      indices.add(selectDailyIndex(secret, dateKey, mockItems));
    }
    // Should have multiple different indices (not all same)
    expect(indices.size).toBeGreaterThan(1);
  });

  it("returns valid index within array bounds", () => {
    const secret = "bounds-test";
    for (let i = 0; i < 100; i++) {
      const date = new Date(Date.UTC(2025, 0, 1 + i));
      const dateKey = utcDateKey(date);
      const idx = selectDailyIndex(secret, dateKey, mockItems);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(mockItems.length);
    }
  });

  it("returns 0 for empty array", () => {
    expect(selectDailyIndex("secret", "2025-01-01", [])).toBe(0);
  });

  it("works with numeric items", () => {
    const numericItems = [10, 20, 30, 40, 50];
    const idx = selectDailyIndex("secret", "2025-06-15", numericItems);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(numericItems.length);
  });

  it("handles single item array", () => {
    const singleItem = [{ id: 999 }];
    const idx = selectDailyIndex("secret", "2025-01-01", singleItem);
    expect(idx).toBe(0);
  });
});
