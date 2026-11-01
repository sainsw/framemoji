import { revealStepForCount } from "@/lib/reveal";
import type { Histogram } from "./types";

/** One column per guess plus misses. Your column carries the data hue; the selected one is raised. */
export function HistogramView({
  histogram,
  myReveal,
  failed,
  onSelect,
  selectedReveal,
  steps,
  emojiLabels,
}: {
  histogram: Histogram;
  myReveal: number;
  failed: boolean;
  onSelect?: (reveal: number) => void;
  selectedReveal?: number;
  steps: readonly number[];
  emojiLabels?: string[];
}) {
  const solves = histogram.solves.map((v) => Number(v || 0));
  const failCount = Number(histogram.fail || 0);
  const max = Math.max(1, ...solves, failCount);
  const cols = [
    ...steps.map((step, i) => ({
      key: step,
      value: solves[i] ?? 0,
      label: `Guess ${i + 1}`,
      short: String(i + 1),
      emoji: emojiLabels?.[i],
      isYou: !failed && revealStepForCount(myReveal) === step,
      isMiss: false,
    })),
    { key: 0, value: failCount, label: "Missed", short: "Missed", emoji: undefined, isYou: failed, isMiss: true },
  ];

  return (
    <div className="dist" role="group" aria-label="Players by the guess they solved on">
      {cols.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`dist-col${c.isYou ? " is-you" : ""}${c.isMiss ? " is-miss" : ""}${selectedReveal === c.key ? " is-selected" : ""}`}
          aria-pressed={selectedReveal === c.key}
          aria-label={`${c.label}: ${c.value} players${c.isYou ? ", you" : ""}`}
          onClick={() => onSelect?.(c.key)}
        >
          <span className="dist-count">{c.value}</span>
          <span className="dist-bar-track">
            <span className="dist-bar" style={{ height: `${(c.value / max) * 100}%` }} />
          </span>
          <span className="dist-label">
            <span className="dist-label-long">{c.isMiss ? "Missed" : c.short}</span>
            {c.emoji ? (
              <span className="dist-emoji" aria-hidden="true">
                {c.emoji}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
