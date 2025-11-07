import crypto from "crypto";

export function utcDateKey(d: Date = new Date()) {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function selectDailyIndex(secret: string, dateKey: string, total: number) {
  const h = crypto.createHmac("sha256", secret).update(dateKey).digest();
  // Use first 6 bytes as a big-endian integer for mod
  const num = h.readUIntBE(0, 6);
  return total > 0 ? num % total : 0;
}

