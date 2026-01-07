import { revealStepForCount } from "@/lib/reveal";
import type { Histogram } from "./types";

export function HistogramView({
  histogram,
  myReveal,
  failed,
  onSelect,
  labels,
  selectedReveal,
  steps,
}: {
  histogram: Histogram;
  myReveal: number;
  failed: boolean;
  onSelect?: (reveal: number) => void;
  labels?: string[];
  selectedReveal?: number;
  steps: readonly number[];
}) {
  const solves = histogram.solves.map((v) => Number(v || 0));
  const failCount = Number(histogram.fail || 0);
  const max = Math.max(1, ...solves, failCount);
  const cols = steps.length + 1;
  return (
    <div>
      <div className="hist" style={{ ["--hist-cols" as any]: cols }}>
        {solves.map((c, i) => {
          const step = steps[i] ?? i + 1;
          const h = Math.round((c / max) * 100);
          const isMe = !failed && revealStepForCount(myReveal) === step;
          const isSelected = selectedReveal === step;
          return (
            <div
              key={i}
              aria-label={`Solved at ${step} emoji: ${c}`}
              className={`bar${isMe ? " me" : ""}`}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: isSelected ? "3px solid #ffffff" : isMe ? "3px solid var(--success)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                position: "relative",
                height: "100%",
                cursor: onSelect ? "pointer" : "default",
              }}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : -1}
              onClick={() => onSelect?.(step)}
              onKeyDown={(e) => {
                if (!onSelect) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(step);
                }
              }}
            >
              <div
                className="fill"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${h}%`,
                  background: "var(--accent)",
                  borderRadius: 6,
                  opacity: 0.8,
                }}
              />
            </div>
          );
        })}
        {(() => {
          const c = failCount;
          const h = Math.round((c / max) * 100);
          const isMe = failed;
          const isSelected = selectedReveal === 0;
          return (
            <div
              aria-label={`Failed: ${c}`}
              className={`bar fail${isMe ? " me" : ""}`}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: isSelected ? "3px solid #ffffff" : isMe ? "3px solid var(--success)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                position: "relative",
                height: "100%",
                cursor: onSelect ? "pointer" : "default",
              }}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : -1}
              onClick={() => onSelect?.(0)}
              onKeyDown={(e) => {
                if (!onSelect) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(0);
                }
              }}
            >
              <div
                className="fill"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${h}%`,
                  background: "var(--danger)",
                  borderRadius: 6,
                  opacity: 0.9,
                }}
              />
            </div>
          );
        })()}
      </div>
      <div className="hist-labels" style={{ ["--hist-cols" as any]: cols }}>
        {steps.map((step, i) => (
          <div key={step}>{labels?.[i] ?? step}</div>
        ))}
        <div>❌</div>
      </div>
    </div>
  );
}
