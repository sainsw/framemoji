import { type CSSProperties, useEffect, useRef } from "react";
import { REVEAL_STEPS } from "@/lib/reveal";
import type { GuessLogEntry } from "./hooks/useGameReducer";

export type StripOutcome = "playing" | "won" | "lost";

const TOTAL = REVEAL_STEPS[REVEAL_STEPS.length - 1];
const TAKES = REVEAL_STEPS.map((end, i) => ({ start: i === 0 ? 0 : REVEAL_STEPS[i - 1], end }));

/**
 * The ten clues as a film strip, split into the five takes a player unlocks one guess at a time.
 * Shown frames share the width between them, so the opening three are the largest; frames still
 * to come wait at the end as small slots. The note under each take logs that guess, so the strip
 * is also the game's record. Sizing lives in globals.css (.strip), driven by --shown and --locked.
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
  const finished = outcome !== "playing";
  const shownCount = finished ? TOTAL : Math.min(Math.max(reveal, REVEAL_STEPS[0]), TOTAL);
  const currentTake = TAKES.findIndex((t) => shownCount <= t.end);

  // Frames already on screen at the last render don't replay their entrance.
  const seen = useRef(0);
  const firstNew = seen.current;
  useEffect(() => {
    seen.current = loaded ? shownCount : 0;
  });

  const style = {
    "--shown": shownCount,
    "--locked": TOTAL - shownCount,
  } as CSSProperties;

  return (
    <div className="strip-wrap">
      <ol
        className={`strip${shownCount <= REVEAL_STEPS[0] ? " is-opening" : ""}`}
        style={style}
        aria-label={`Emoji clues, ${shownCount} of ${TOTAL} shown`}
      >
        {TAKES.map((take, ti) => {
          const n = take.end - take.start;
          const shown = take.end <= shownCount;
          const isNow = !finished && ti === currentTake;
          const solvedHere = outcome === "won" && ti === TAKES.findIndex((t) => reveal <= t.end);
          const spare = outcome === "won" && take.start >= reveal;
          const isNext = !finished && ti === currentTake + 1;
          const entry = history[ti];

          let note = "";
          let noteClass = "";
          if (isNow) {
            note = ti === 0 ? "Your first guess" : "Guess now";
            noteClass = "is-now";
          } else if (solvedHere) {
            note = "Solved";
            noteClass = "is-solved";
          } else if (spare) {
            note = "Not needed";
          } else if (shown) {
            note = entry ? (entry.kind === "skip" ? "Skipped" : entry.text) : "Missed";
            noteClass = entry?.kind === "skip" ? "" : "is-miss";
          } else if (isNext) {
            note = ti === TAKES.length - 1 ? "Last frame" : `+${n} next`;
          }

          return [
            ti === currentTake + 1 && !finished ? (
              <li key="break" className="strip-break" role="presentation" aria-hidden="true" />
            ) : null,
            <li
              key={take.end}
              className={`take${shown ? "" : " is-locked"}${spare ? " is-spare" : ""}`}
              aria-label={shown ? `Guess ${ti + 1}: ${note}` : undefined}
              aria-hidden={shown ? undefined : true}
            >
              <div className="take-frames">
                {Array.from({ length: n }).map((_, k) => {
                  const idx = take.start + k;
                  const glyph = shown && loaded ? clues[idx] : null;
                  const isNew = glyph && idx >= firstNew;
                  return (
                    <span
                      key={idx}
                      className={`frame${shown ? " is-shown" : ""}${shown && !loaded ? " is-loading" : ""}`}
                    >
                      {glyph ? (
                        <span
                          className={`frame-glyph${isNew ? " is-new" : ""}`}
                          style={isNew ? { animationDelay: `${160 + (idx - firstNew) * 70}ms` } : undefined}
                        >
                          {glyph}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
              <p className={`take-note ${noteClass}`} title={note || undefined}>
                {note}
              </p>
            </li>,
          ];
        })}
      </ol>
    </div>
  );
}
