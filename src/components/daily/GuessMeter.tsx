import { guessesLeftForReveal, REVEAL_STEPS } from "@/lib/reveal";

export function GuessMeter({ reveal }: { reveal: number }) {
  const total = REVEAL_STEPS.length;
  const left = guessesLeftForReveal(reveal);
  return (
    <div className="meter" aria-live="polite">
      <div className="meter-label">
        <strong className="num">{left}</strong> of {total} guesses left
      </div>
      <div className="meter-track" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`meter-seg${i < left ? " is-left" : ""}`} />
        ))}
      </div>
    </div>
  );
}
