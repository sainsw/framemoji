import crypto from "crypto";

export function utcDateKey(d: Date = new Date()) {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Deterministic, no-repeat daily picker over a permutation of puzzles.
// We sort the puzzles by HMAC(secret, String(id)) to create a stable order,
// then pick the day's item using the UTC day number modulo N.
export function selectDailyIndex<T extends { id: number } | number>(
  secret: string,
  dateKey: string,
  items: T[]
) {
  const n = items.length;
  if (n === 0) return 0;

  // Convert dateKey (YYYY-MM-DD) to UTC day number since Unix epoch
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const dayNumber = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);

  // Build permutation: indices sorted by HMAC(secret, id)
  const ids = items.map((it) => (typeof it === "number" ? it : it.id));
  const order = ids
    .map((id, idx) => ({
      idx,
      id,
      // Use hex digest for simple lexicographic sort; tie-break on id then idx
      dig: crypto.createHmac("sha256", secret).update(String(id)).digest("hex"),
    }))
    .sort((a, b) =>
      a.dig === b.dig ? (a.id === b.id ? a.idx - b.idx : a.id - b.id) : a.dig.localeCompare(b.dig)
    )
    .map((x) => x.idx);

  const pick = dayNumber % n;
  return order[pick]!;
}
