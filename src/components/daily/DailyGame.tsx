"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recordLoss, recordWin, loadStats, type DailyStats } from "@/lib/stats";
import { getDailyResult, setDailyResult } from "@/lib/result";
import { msUntilNextUtcMidnight } from "@/lib/date";
import { REVEAL_STEPS, revealStepForCount } from "@/lib/reveal";
import { DevToolsFooter } from "./DevToolsFooter";
import { EmojiGrid } from "./EmojiGrid";
import { GuessInput } from "./GuessInput";
import { GuessMeter } from "./GuessMeter";
import { ResultsPanel } from "./ResultsPanel";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useMovies } from "./hooks/useMovies";
import { filterSuggestions } from "./utils/suggestions";
import type { DailyMeta, FinishResp, GuessResp, Histogram, TopGuess } from "./types";

export default function DailyGame() {
  const [meta, setMeta] = useState<DailyMeta | null>(null);
  const [reveal, setReveal] = useState<number>(REVEAL_STEPS[0]);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong" | "finished">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [hist, setHist] = useState<Histogram | null>(null);
  const [selectedReveal, setSelectedReveal] = useState<number | null>(null);
  const [topGuesses, setTopGuesses] = useState<TopGuess[] | null>(null);
  const [guessesLoading, setGuessesLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const movies = useMovies();
  const [finalTitle, setFinalTitle] = useState<string | null>(null);
  const { solutionTitle, posterUrl } = useMovieDetails({ movies, meta, finalTitle, answer });

  const openReveal = (rev: number) => {
    if (rev === 0) {
      setSelectedReveal(0);
      setTopGuesses(null);
      return;
    }
    const r = revealStepForCount(rev);
    setSelectedReveal(r);
    setGuessesLoading(true);
    setTopGuesses(null);
    fetch(`/api/daily/guesses?reveal=${r}&limit=10`)
      .then((res) => res.json())
      .then((data: { reveal: number; items: TopGuess[] }) => setTopGuesses(data.items))
      .catch(() => setTopGuesses([]))
      .finally(() => setGuessesLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(() => setStats(loadStats()));
    fetch("/api/daily")
      .then((r) => r.json())
      .then((d: DailyMeta) => {
        setMeta(d);
        // If user already finished today, show the stored result immediately
        const existing = getDailyResult(d.day);
        if (existing) {
          setReveal(revealStepForCount(existing.revealed));
          setScore(existing.score);
          setPercentile(existing.percentile ?? null);
          setAnswer(existing.answer ?? null);
          // If previously won, use stored title so we can
          // show the answer and poster on reload.
          if (existing.correct && existing.title) {
            setFinalTitle(existing.title);
          }
          setStatus("finished");
          // Load today's histogram so the chart renders on refresh
          fetch("/api/daily/finish")
            .then((r) => r.json())
            .then((data: { total: number; histogram: Histogram }) => {
              setHist(data.histogram);
              openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0);
            })
            .catch(() => {
              openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0);
            });
        } else {
          setReveal(REVEAL_STEPS[0]);
          setStatus("idle");
          setScore(null);
          setPercentile(null);
          setAnswer(null);
          setHasGuessed(false);
        }
        // focus input on load
        setTimeout(() => inputRef.current?.focus(), 0);
      });
  }, []);

  // Move focus to results panel when the game finishes so screen readers announce it
  useEffect(() => {
    if (status === "finished") {
      setTimeout(() => resultRef.current?.focus(), 0);
    }
  }, [status]);

  // Tick countdown to next UTC midnight when finished
  useEffect(() => {
    if (status !== "finished") return;
    const update = () => setRemainingMs(msUntilNextUtcMidnight());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [status]);

  const clues = useMemo(() => meta?.puzzle.emoji_clues ?? [], [meta]);
  const shown = useMemo(() => clues.slice(0, reveal).join(""), [clues, reveal]);
  const suggestions = useMemo(() => filterSuggestions(movies, guess), [movies, guess]);

  const handleGuessChange = (value: string) => {
    setGuess(value);
    setSelectedIdx(0);
  };

  async function submit(forcedTitle?: string) {
    const toSend = (forcedTitle ?? guess).trim();
    if (!toSend) return;
    setHasGuessed(true);
    const resp = (await fetch("/api/daily/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: toSend, revealed: reveal }),
    }).then((r) => r.json())) as GuessResp;
    if (resp.correct) {
      setStatus("correct");
      setFinalTitle(toSend);
      setScore(resp.score);
      setReveal(resp.revealed);
      recordWin(resp.score);
      if (meta) {
        setDailyResult(meta.day, {
          correct: true,
          revealed: resp.revealed,
          score: resp.score,
          title: toSend,
          id: String(meta.puzzle.id),
        });
      }
      setStatus("finished");
      void fetch("/api/daily/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealed: resp.revealed, correct: true }),
      })
        .then((r) => r.json())
        .then((fin: FinishResp) => {
          setPercentile(fin.percentile);
          setHist(fin.histogram);
          openReveal(resp.revealed);
          if (meta) {
            setDailyResult(meta.day, {
              correct: true,
              revealed: resp.revealed,
              score: resp.score,
              percentile: fin.percentile,
              title: toSend,
              id: String(meta.puzzle.id),
            });
          }
        })
        .catch(() => {
          // ignore finish errors; user can still see their result
        });
    } else {
      setStatus("wrong");
      setFinalTitle(null);
      // Pick a snarky, accessible message for wrong guesses
      const WRONG_MESSAGES = [
        "Close, but no cigar. Fresh clues just dropped.",
        "Not quite. Unlocking more emoji…",
        "Swing and a miss — here are more hints.",
        "Nice try! Here come extra clues.",
        "Good guess, wrong movie. More emoji revealed.",
        "So close. Ok, extra emoji incoming.",
        "Plot twist: that wasn’t it. New clues revealed!",
        "Almost! A couple more pictograms to help.",
        "Nope. The emoji council grants you more.",
        "Incorrect. Let’s sweeten it with extra emoji.",
        "Not this time — enjoy more clues.",
        "Incorrect guess. More hints just dropped.",
      ];
      setWrongMsg(WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]!);
      const wasAtTen = reveal >= REVEAL_STEPS[REVEAL_STEPS.length - 1]; // had all emoji before this guess
      setReveal(resp.revealed);
      // After a wrong guess, return focus to the input so the
      // user can immediately type their next attempt.
      setTimeout(() => inputRef.current?.focus(), 0);
      if (wasAtTen) {
        // Already at 10 and guessed wrong again → finish as fail
        recordLoss();
        setAnswer("Loading answer...");
        setStatus("finished");
        openReveal(0);
        if (meta) {
          setDailyResult(meta.day, {
            correct: false,
            revealed: resp.revealed,
            score: 0,
            id: String(meta.puzzle.id),
          });
        }
        void fetch("/api/daily/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revealed: resp.revealed, correct: false }),
        })
          .then((r) => r.json())
          .then((fin: FinishResp) => {
            setAnswer(fin.answer ?? null);
            setPercentile(fin.percentile);
            setHist(fin.histogram);
            if (meta) {
              setDailyResult(meta.day, {
                correct: false,
                revealed: resp.revealed,
                score: 0,
                percentile: fin.percentile,
                id: String(meta.puzzle.id),
                answer: fin.answer ?? undefined,
              });
            }
          })
          .catch(() => {
            setAnswer("Answer unavailable.");
          });
      }
    }
    setGuess("");
  }

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="status">Daily — {meta?.day ?? "…"}</div>
      </div>
      <div className="spacer" />

      {status !== "finished" && (
        <>
          <EmojiGrid clues={clues} reveal={reveal} />
          <GuessMeter reveal={reveal} hasGuessed={hasGuessed} />
          {/* Screen reader-friendly live summary of shown clues */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {`Clues shown (${reveal}/10): ${shown}`}
          </div>
          <div className="spacer" />
        </>
      )}

      {status !== "finished" && (
        <GuessInput
          guess={guess}
          onGuessChange={handleGuessChange}
          onSubmit={submit}
          suggestions={suggestions}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          inputRef={inputRef}
          status={status}
          wrongMsg={wrongMsg}
        />
      )}

      {status === "finished" && (
        <ResultsPanel
          answer={answer}
          solutionTitle={solutionTitle}
          percentile={percentile}
          score={score}
          reveal={reveal}
          hist={hist}
          selectedReveal={selectedReveal}
          onSelectReveal={openReveal}
          guessesLoading={guessesLoading}
          topGuesses={topGuesses}
          movies={movies}
          posterUrl={posterUrl}
          finalTitle={finalTitle}
          devAnswer={meta?.answer ?? null}
          stats={stats}
          remainingMs={remainingMs}
          resultRef={resultRef}
        />
      )}

      <DevToolsFooter meta={meta} />
    </section>
  );
}
