import { REVEAL_STEPS } from "@/lib/reveal";

export function EmojiGrid({
  clues,
  reveal,
  animate,
}: {
  clues: string[];
  reveal: number;
  animate: boolean;
}) {
  const cols = reveal <= 3 ? 3 : Math.min(reveal, 10);
  const showSkeleton = !animate;
  return (
    <div
      className="emoji-row"
      aria-live="polite"
      aria-atomic="true"
      role="group"
      aria-label={`Emoji clues — ${reveal} of ${REVEAL_STEPS[REVEAL_STEPS.length - 1]} revealed`}
      style={{ ["--cols" as any]: cols }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div className="emoji-cell" key={i}>
          {showSkeleton && i < 3 ? (
            <span className="emoji-inline emoji-skeleton" aria-hidden="true" />
          ) : i < reveal && animate ? (
            <span
              className="emoji-inline emoji-reveal"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {clues[i]}
            </span>
          ) : (
            ""
          )}
        </div>
      ))}
    </div>
  );
}
