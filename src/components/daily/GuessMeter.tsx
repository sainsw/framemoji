import { guessesLeftForReveal, REVEAL_STEPS } from "@/lib/reveal";

export function GuessMeter({ reveal, hasGuessed }: { reveal: number; hasGuessed: boolean }) {
  if (!hasGuessed) return null;
  const totalGuesses = REVEAL_STEPS.length;
  const guessesLeft = guessesLeftForReveal(reveal);
  const pct = Math.max(0, Math.min(100, Math.round((guessesLeft / totalGuesses) * 100)));
  return (
    <div
      className="guess-meter-shell is-visible"
      aria-hidden={!hasGuessed}
      style={{ transitionDelay: `${480 + Math.max(0, reveal - 1) * 70}ms` }}
    >
      <div className="guess-meter" aria-live="polite">
        <div className="guess-meter-copy">
          <div className="guess-meter-title">Guesses remaining</div>
          <div className="guess-meter-count">
            <span className="guess-meter-value">{guessesLeft}</span>
            <span className="guess-meter-total">/ {totalGuesses}</span>
          </div>
        </div>
        <div
          className="guess-meter-bar"
          role="img"
          aria-label={`${guessesLeft} of ${totalGuesses} guesses remaining`}
          style={{ ["--ticks" as any]: totalGuesses }}
        >
          <div className="guess-meter-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
