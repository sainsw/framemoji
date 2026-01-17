import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create the mock function outside to access it
const mockReaddir = vi.fn();

// Mock fs/promises with proper default export handling
vi.mock("fs/promises", () => ({
  readdir: mockReaddir,
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  default: {
    readdir: mockReaddir,
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Dynamic import to work with mocks and env changes
async function getModule() {
  // Reset the module cache to pick up fresh environment
  vi.resetModules();
  // Re-apply mock after reset
  vi.doMock("fs/promises", () => ({
    readdir: mockReaddir,
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    default: {
      readdir: mockReaddir,
      mkdir: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
  }));
  return await import("../availableDates");
}

describe("availableDates (file mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReaddir.mockReset();
    // Ensure we're in file mode (no KV)
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.EMOVI_USE_FILE_STATS = "1";
  });

  afterEach(() => {
    delete process.env.EMOVI_USE_FILE_STATS;
  });

  describe("listAvailableDates", () => {
    it("returns empty array when directory is empty", async () => {
      mockReaddir.mockResolvedValue([]);
      const { listAvailableDates } = await getModule();
      
      const dates = await listAvailableDates();
      
      expect(dates).toEqual([]);
    });

    it("returns empty array when directory doesn't exist", async () => {
      mockReaddir.mockRejectedValue(new Error("ENOENT: no such file or directory"));
      const { listAvailableDates } = await getModule();
      
      const dates = await listAvailableDates();
      
      expect(dates).toEqual([]);
    });

    it("extracts dates from JSON filenames", async () => {
      mockReaddir.mockResolvedValue([
        "2025-12-29.json",
        "2025-12-30.json",
        "2025-12-31.json",
      ]);
      const { listAvailableDates } = await getModule();
      
      const dates = await listAvailableDates();
      
      expect(dates).toContain("2025-12-29");
      expect(dates).toContain("2025-12-30");
      expect(dates).toContain("2025-12-31");
    });

    it("ignores non-JSON files", async () => {
      mockReaddir.mockResolvedValue([
        "2025-12-31.json",
        "README.md",
        ".gitkeep",
        "2025-12-30.json.bak",
      ]);
      const { listAvailableDates } = await getModule();
      
      const dates = await listAvailableDates();
      
      expect(dates).toEqual(["2025-12-31"]);
    });

    it("ignores files with invalid date format", async () => {
      mockReaddir.mockResolvedValue([
        "2025-12-31.json",
        "invalid.json",
        "2025-1-1.json", // Not zero-padded
        "test-2025-12-30.json",
      ]);
      const { listAvailableDates } = await getModule();
      
      const dates = await listAvailableDates();
      
      expect(dates).toEqual(["2025-12-31"]);
    });

    it("returns dates sorted in descending order", async () => {
      mockReaddir.mockResolvedValue([
        "2025-01-01.json",
        "2025-12-31.json",
        "2025-06-15.json",
      ]);
      const { listAvailableDates } = await getModule();
      
      const dates = await listAvailableDates();
      
      expect(dates).toEqual(["2025-12-31", "2025-06-15", "2025-01-01"]);
    });
  });

  describe("isDateAvailable", () => {
    it("returns true for available dates", async () => {
      mockReaddir.mockResolvedValue([
        "2025-12-31.json",
      ]);
      const { isDateAvailable } = await getModule();
      
      const available = await isDateAvailable("2025-12-31");
      
      expect(available).toBe(true);
    });

    it("returns false for unavailable dates", async () => {
      mockReaddir.mockResolvedValue([
        "2025-12-31.json",
      ]);
      const { isDateAvailable } = await getModule();
      
      const available = await isDateAvailable("2025-12-30");
      
      expect(available).toBe(false);
    });

    it("returns false when no dates available", async () => {
      mockReaddir.mockResolvedValue([]);
      const { isDateAvailable } = await getModule();
      
      const available = await isDateAvailable("2025-12-31");
      
      expect(available).toBe(false);
    });
  });
});

describe("availableDates (KV mode)", () => {
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockReaddir.mockReset();
    // Set up KV environment
    process.env.KV_REST_API_URL = "https://test-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "test-token";
    delete process.env.EMOVI_USE_FILE_STATS;
    
    // Mock global fetch
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("uses SCAN to find puzzle keys", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        result: [
          "0", // cursor
          ["framemoji:2025-12-31:puzzle", "framemoji:2025-12-30:puzzle"],
        ],
      }),
    });
    const { listAvailableDates } = await getModule();
    
    const dates = await listAvailableDates();
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/scan/0/MATCH/"),
      expect.any(Object)
    );
    expect(dates).toContain("2025-12-31");
    expect(dates).toContain("2025-12-30");
  });

  it("handles pagination when cursor is not 0", async () => {
    // First page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        result: [
          "50", // non-zero cursor means more pages
          ["framemoji:2025-12-31:puzzle"],
        ],
      }),
    });
    // Second page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        result: [
          "0", // end
          ["framemoji:2025-12-30:puzzle"],
        ],
      }),
    });
    const { listAvailableDates } = await getModule();
    
    const dates = await listAvailableDates();
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(dates).toContain("2025-12-31");
    expect(dates).toContain("2025-12-30");
  });

  it("falls back to file mode on KV error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    mockReaddir.mockResolvedValue([
      "2025-12-31.json",
    ]);
    const { listAvailableDates } = await getModule();
    
    const dates = await listAvailableDates();
    
    expect(dates).toEqual(["2025-12-31"]);
  });

  it("returns sorted dates in descending order", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        result: [
          "0",
          [
            "framemoji:2025-01-01:puzzle",
            "framemoji:2025-12-31:puzzle",
            "framemoji:2025-06-15:puzzle",
          ],
        ],
      }),
    });
    const { listAvailableDates } = await getModule();
    
    const dates = await listAvailableDates();
    
    expect(dates).toEqual(["2025-12-31", "2025-06-15", "2025-01-01"]);
  });
});
