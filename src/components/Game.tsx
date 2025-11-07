"use client";

import { useMemo, useState } from "react";
import { PUZZLES, type Puzzle } from "@/data/puzzles";
import { normalizeTitle } from "@/lib/normalize";
import { splitGraphemes } from "@/lib/emoji";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export default function Game() {
  const [current, setCurrent] = useState<Puzzle>(() => pickRandom(PUZZLES));
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [streak, setStreak] = useState(0);

  const disabled = useMemo(() => status === "correct", [status]);

  function submit() {
    const ok = normalizeTitle(guess) === normalizeTitle(current.answer);
    if (ok) {
      setStatus("correct");
      setStreak((s) => s + 1);
    } else {
      setStatus("wrong");
      setStreak(0);
    }
  }

  function next() {
    setCurrent(pickRandom(PUZZLES));
    setGuess("");
    setStatus("idle");
  }

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="status">
          Streak: {streak}
        </div>
        <button className="secondary" onClick={next} aria-label="Skip to next">
          Skip ↻
        </button>
      </div>

      <div className="spacer" />

      <div className="emoji" aria-live="polite">
        {Array.isArray((current as any).clues)
          ? (current as any).clues.join("")
          : splitGraphemes((current as any).emoji ?? "").join("")}
      </div>

      <div className="spacer" />

      <div className="row">
        <input
          type="text"
          placeholder="Type your guess…"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-label="Guess the movie"
          disabled={disabled}
        />
        <button onClick={submit} disabled={disabled} aria-label="Submit guess">
          Guess
        </button>
      </div>

      <div className="spacer" />

      {status !== "idle" && (
        <div
          className={`status ${status === "correct" ? "success" : "error"}`}
          role="status"
          aria-live="polite"
        >
          {status === "correct" ? "Correct!" : `Nope — it was ${current.answer}`}
        </div>
      )}

      {status === "correct" && (
        <div className="spacer" />
      )}

      {status === "correct" && (
        <button onClick={next} aria-label="Next puzzle">
          Next ▶
        </button>
      )}
    </section>
  );
}
