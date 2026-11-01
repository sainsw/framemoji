import { useEffect, useRef } from "react";
import { REVEAL_STEPS } from "@/lib/reveal";
import type { GuessLogEntry } from "./hooks/useGameReducer";

export type StripOutcome = "playing" | "won" | "lost";

const TAKES = REVEAL_STEPS.map((end, i) => ({ start: i === 0 ? 0 : REVEAL_STEPS[i - 1], end }));

/**
 * The ten clues as a film strip, split into the five takes a player unlocks one guess at a time.
 * The note under each take is the log of that guess, so the strip is also the game's record.
 */
export function EmojiGrid({
  clues,
  reveal,
  loaded,
  history,
  outcome,
}: {
  clues: string[];
  reveal: number;
  loaded: boolean;
  history: GuessLogEntry[];
  outcome: StripOutcome;
}) {
  // Frames already on screen at the last render don't replay their entrance.
  const seen = useRef(0);
  const firstNew = seen.current;
  useEffect(() => {
    seen.current = outcome === "playing" ? reveal : clues.length;
  });

  const finished = outcome !== "playing";
  const takeOfReveal = TAKES.findIndex((t) => reveal <= t.end);
  const shownCount = finished ? clues.length : reveal;

  return (
    <div className="strip-wrap">
      <ol className="strip" aria-label={`Emoji clues, ${Math.min(reveal, 10)} of 10 shown`}>
        {TAKES.map((take, ti) => {
          const n = take.end - take.start;
          const used = ti < takeOfReveal || (finished && ti === takeOfReveal);
          const isNow = !finished && ti === takeOfReveal;
          const spare = finished && ti > takeOfReveal;
          const entry = history[ti];

          let note = "";
          let noteClass = "";
          if (isNow) {
            note = ti === 0 ? "Your first guess" : "Guess now";
            noteClass = "is-now";
          } else if (used && outcome === "won" && ti === takeOfReveal) {
            note = "Solved";
            noteClass = "is-solved";
          } else if (used) {
            note = entry ? (entry.kind === "skip" ? "Skipped" : entry.text) : "Missed";
            noteClass = entry?.kind === "skip" ? "" : "is-miss";
          } else if (spare) {
            note = "Not needed";
          } else if (!finished && ti === takeOfReveal + 1) {
            note = `+${n} after a miss`;
          }

          return (
            <li
              key={take.end}
              className={`take${spare ? " is-spare" : ""}`}
              style={{ ["--n" as string]: n }}
              aria-label={`Guess ${ti + 1}: ${note || "locked"}`}
            >
              <div className="take-frames">
                {Array.from({ length: n }).map((_, k) => {
                  const idx = take.start + k;
                  const shown = loaded && idx < shownCount && clues[idx];
                  const waiting = !loaded && idx < REVEAL_STEPS[0];
                  return (
                    <span
                      key={idx}
                      className={`frame${shown ? " is-shown" : ""}${waiting ? " is-loading" : ""}`}
                    >
                      {shown ? (
                        <span
                          className={`frame-glyph${idx >= firstNew ? " is-new" : ""}`}
                          style={idx >= firstNew ? { animationDelay: `${(idx - firstNew) * 70}ms` } : undefined}
                        >
                          {clues[idx]}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
              <p className={`take-note ${noteClass}`} title={note || undefined}>
                {note}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
