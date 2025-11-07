export function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function romanToInt(roman: string): number | null {
  const map: Record<string, number> = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  if (!/^(?=[IVXLCDM]+$)/i.test(roman)) return null;
  let sum = 0; let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const v = map[roman[i]!.toUpperCase()] ?? 0;
    if (v < prev) sum -= v; else sum += v;
    prev = v;
  }
  return sum;
}

function normalizeNumerals(s: string): string {
  // Convert Roman numerals to Arabic numbers, but avoid converting a lone 'I'
  // so partial queries like "monsters i" still match "monsters inc".
  return s.replace(/\b([ivxlcdm]+)\b/gi, (m) => {
    const up = m.toUpperCase();
    if (up === 'I') return m; // don't convert single-letter I
    const n = romanToInt(m);
    return n ? String(n) : m;
  });
}

export function normalizeTitle(t: string) {
  const lower = stripDiacritics(t)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeNumerals(lower);
}
