import type { RefObject } from "react";
import type { Movie } from "./types";

export function GuessInput({
  guess,
  onGuessChange,
  onSubmit,
  onSkip,
  suggestions,
  selectedIdx,
  setSelectedIdx,
  inputRef,
  status,
  wrongMsg,
  wrongGuesses,
  skips,
}: {
  guess: string;
  onGuessChange: (value: string) => void;
  onSubmit: (title?: string) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  suggestions: Movie[];
  selectedIdx: number;
  setSelectedIdx: (updater: number | ((prev: number) => number)) => void;
  inputRef: RefObject<HTMLInputElement>;
  status: "idle" | "correct" | "wrong" | "finished";
  wrongMsg: string | null;
  wrongGuesses: string[];
  skips: number;
}) {
  return (
    <>
      <div className="suggest-container">
        <div className="row">
          <input
            type="text"
            placeholder="Type a movie title…"
            value={guess}
            onChange={(e) => onGuessChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const choice = suggestions[selectedIdx]?.title || guess;
                onSubmit(choice);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (suggestions.length > 0) {
                  setSelectedIdx((i) => (i + 1) % suggestions.length);
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (suggestions.length > 0) {
                  setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                // Clear current query to collapse suggestions
                onGuessChange("");
              }
            }}
            aria-label="Guess the movie"
            autoFocus
            ref={inputRef}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="suggestions-list"
            aria-activedescendant={suggestions.length > 0 ? `suggestion-${selectedIdx}` : undefined}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-describedby="guess-instructions"
          />
          <button onClick={() => void onSubmit()} aria-label="Submit guess" title="Press Enter to submit">
            Guess <span className="kbd-hint" aria-hidden="true">↵</span>
          </button>
          <button 
            onClick={() => void onSkip()} 
            aria-label="Skip and reveal more clues"
            title="Skip this guess and reveal more emoji"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            Skip
          </button>
        </div>
        <p id="guess-instructions" className="sr-only">
          Type a movie title. Use the up and down arrow keys to choose a suggestion and press Enter to submit.
        </p>
        {suggestions.length > 0 && (
          <div className="card suggestions suggestions-popup" id="suggestions-list" role="listbox">
            {suggestions.map((m, i) => (
              <div
                key={m.id}
                id={`suggestion-${i}`}
                className={`suggestion${i === selectedIdx ? " active" : ""}`}
                role="option"
                aria-selected={i === selectedIdx}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => onSubmit(m.title)}
              >
                {m.title} {m.year ? `(${m.year})` : ""}
              </div>
            ))}
          </div>
        )}
      </div>
      {status === "wrong" && (
        <>
          {/* Visible feedback for sighted users, hidden from SRs to avoid duplicate announcements */}
          <div className="status error" aria-hidden="true" style={{ marginTop: "1rem" }}>
            {wrongMsg ?? "Not quite. Another emoji revealed."}
          </div>
          {/* Screen-reader-only live region for immediate announcement */}
          <div className="sr-only" aria-live="assertive" aria-atomic="true">
            {wrongMsg ?? "Not quite. Another emoji revealed."}
          </div>
        </>
      )}
      {(wrongGuesses.length > 0 || skips > 0) && (
        <div 
          style={{ 
            marginTop: "1rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
          aria-label={`Previous guesses: ${wrongGuesses.join(", ")}${skips > 0 ? `, ${skips} skip${skips > 1 ? "s" : ""}` : ""}`}
        >
          {wrongGuesses.map((g, i) => (
            <span
              key={i}
              style={{
                padding: "0.25rem 0.6rem",
                background: "rgba(220, 80, 80, 0.25)",
                borderRadius: "6px",
                fontSize: "0.85rem",
                opacity: 0.85,
              }}
            >
              {g}
            </span>
          ))}
          {skips > 0 && (
            <span
              style={{
                padding: "0.25rem 0.6rem",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                fontSize: "0.85rem",
                opacity: 0.7,
                fontStyle: "italic",
              }}
            >
              {skips} skip{skips > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </>
  );
}
