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
}) {
  const open = suggestions.length > 0;
  return (
    <div className="guess">
      <div className="guess-row">
        <input
          className="guess-input"
          type="text"
          placeholder="Name the film"
          value={guess}
          onChange={(e) => onGuessChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit(suggestions[selectedIdx]?.title || guess);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              if (open) setSelectedIdx((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (open) setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onGuessChange("");
            }
          }}
          aria-label="Guess the film"
          autoComplete="off"
          autoFocus
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="suggestions-list"
          aria-activedescendant={open ? `suggestion-${selectedIdx}` : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
        <button type="button" className="btn btn-primary" onClick={() => void onSubmit()}>
          Guess
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => void onSkip()}
          title="Use a guess to see more frames"
        >
          Skip
        </button>
      </div>
      {open && (
        <div className="suggestions" id="suggestions-list" role="listbox" aria-label="Matching films">
          {suggestions.map((m, i) => (
            <div
              key={m.id}
              id={`suggestion-${i}`}
              className={`suggestion${i === selectedIdx ? " is-active" : ""}`}
              role="option"
              aria-selected={i === selectedIdx}
              onMouseEnter={() => setSelectedIdx(i)}
              onClick={() => onSubmit(m.title)}
            >
              <span>{m.title}</span>
              {m.year ? <span className="suggestion-year">{m.year}</span> : null}
            </div>
          ))}
        </div>
      )}
      <p className="feedback" aria-live="assertive" aria-atomic="true">
        {status === "wrong" ? (wrongMsg ?? "Not that one. More frames are showing.") : ""}
      </p>
    </div>
  );
}
