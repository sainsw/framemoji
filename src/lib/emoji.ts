export function splitGraphemes(input: string): string[] {
  if (!input) return [];
  // Prefer Intl.Segmenter when available to split by grapheme clusters
  try {
    // @ts-ignore - TS may not have Intl.Segmenter types in some configs
    const seg = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });
    const iter = seg.segment(input)[Symbol.iterator]();
    const out: string[] = [];
    for (let r = iter.next(); !r.done; r = iter.next()) {
      const v = r.value;
      // In some runtimes, v is { segment: string, index: number, isWordLike?: boolean }
      out.push(typeof v === "string" ? v : v.segment);
    }
    return out;
  } catch {
    // Fallback: Array.from handles surrogate pairs but not all ZWJ sequences
    return Array.from(input);
  }
}

