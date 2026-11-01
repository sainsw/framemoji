"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordLoss, recordWin, loadStats, type DailyStats } from "@/lib/stats";
import { getDailyResult, setDailyResult } from "@/lib/result";
import { msUntilNextUtcMidnight } from "@/lib/date";
import { REVEAL_STEPS, revealStepForCount } from "@/lib/reveal";
import { DatePickerPopover } from "./DatePickerPopover";
import { DevToolsFooter } from "./DevToolsFooter";
import { EmojiGrid } from "./EmojiGrid";
import { GuessInput } from "./GuessInput";
import { GuessMeter } from "./GuessMeter";
import { ResultsPanel } from "./ResultsPanel";
import { useDatePicker } from "./hooks/useDatePicker";
import { useGameReducer, getRandomWrongMessage } from "./hooks/useGameReducer";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useMovies } from "./hooks/useMovies";
import { filterSuggestions } from "./utils/suggestions";
import type { DailyMeta, FinishResp, GuessResp, TopGuess } from "./types";

export default function DailyGame() {
  // ─────────────────────────────────────────────────────────────────────────
  // Hooks
  // ─────────────────────────────────────────────────────────────────────────
  const datePicker = useDatePicker();
  const [state, dispatch] = useGameReducer();
  const { movies, triggerLoad: triggerMoviesLoad } = useMovies();
  const { solutionTitle, posterUrl } = useMovieDetails({
    movies,
    meta: state.meta,
    finalTitle: state.finalTitle,
    answer: state.answer,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Local state (UI-only, not part of game logic)
  // ─────────────────────────────────────────────────────────────────────────
  const [guess, setGuess] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null!);

  // Track previous playingDate to detect date switches
  const prevPlayingDateRef = useRef<string | null>(null);

  // Derived values
  const { today, playingDate, isPlayingToday, isArchive } = datePicker;
  const clues = useMemo(() => state.meta?.puzzle.emoji_clues ?? [], [state.meta]);
  const shown = useMemo(() => clues.slice(0, state.reveal).join(""), [clues, state.reveal]);
  const suggestions = useMemo(() => filterSuggestions(movies, guess), [movies, guess]);
  const dateLabel = state.meta?.day ?? playingDate ?? "…";

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const openReveal = useCallback((rev: number, dateOverride?: string) => {
    const dateKey = dateOverride ?? playingDate;
    dispatch({ type: "OPEN_REVEAL", reveal: rev });
    
    if (rev === 0) return;
    
    const r = revealStepForCount(rev);
    const dateParam = dateKey && dateKey !== today ? `&date=${dateKey}` : "";
    fetch(`/api/daily/guesses?reveal=${r}&limit=10${dateParam}`)
      .then((res) => res.json())
      .then((data: { reveal: number; items: TopGuess[] }) => {
        dispatch({ type: "SET_TOP_GUESSES", items: data.items });
      })
      .catch(() => {
        dispatch({ type: "SET_TOP_GUESSES", items: [] });
      });
  }, [playingDate, today, dispatch]);

  /**
   * Shared logic for finishing a game as a loss.
   * Called by both submit() and handleSkip() when the user runs out of guesses.
   */
  const finishAsLoss = useCallback((revealed: number, meta: DailyMeta) => {
    if (isPlayingToday) {
      setStats(recordLoss());
    }
    dispatch({ type: "FINISH_LOSE", revealed });
    triggerMoviesLoad();
    openReveal(0);
    setDailyResult(meta.day, {
      correct: false,
      revealed,
      score: 0,
      id: String(meta.puzzle.id),
    });
    datePicker.refreshCompletedDates();

    const dateParam = !isPlayingToday ? { date: playingDate } : {};
    void fetch("/api/daily/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revealed, correct: false, ...dateParam }),
    })
      .then((r) => r.json())
      .then((fin: FinishResp) => {
        dispatch({ type: "SET_ANSWER", answer: fin.answer ?? "Answer unavailable." });
        dispatch({ type: "SET_PERCENTILE", percentile: fin.percentile });
        dispatch({ type: "SET_HISTOGRAM", hist: fin.histogram });
        setDailyResult(meta.day, {
          correct: false,
          revealed,
          score: 0,
          percentile: fin.percentile,
          id: String(meta.puzzle.id),
          answer: fin.answer ?? undefined,
        });
      })
      .catch(() => {
        dispatch({ type: "SET_ANSWER", answer: "Answer unavailable." });
      });
  }, [isPlayingToday, playingDate, dispatch, triggerMoviesLoad, openReveal, datePicker]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load puzzle
  // ─────────────────────────────────────────────────────────────────────────

  const loadPuzzle = useCallback((dateKey: string, todayKey: string) => {
    const dateParam = dateKey !== todayKey ? `?date=${dateKey}` : "";
    dispatch({ type: "LOAD_START" });

    fetch(`/api/daily${dateParam}`)
      .then((r) => r.json())
      .then((d: DailyMeta) => {
        if (d.error) {
          console.error("Failed to load puzzle:", d.error);
          dispatch({ type: "LOAD_ERROR" });
          return;
        }
        dispatch({ type: "LOAD_SUCCESS", meta: d });
        
        // Update today if we didn't have it yet
        if (!todayKey && d.isToday) {
          datePicker.setToday(d.day);
        }

        // If user already finished this puzzle, restore the finished state
        const existing = getDailyResult(d.day);
        if (existing) {
          dispatch({
            type: "RESTORE_FINISHED",
            reveal: existing.revealed,
            score: existing.score,
            percentile: existing.percentile ?? null,
            answer: existing.answer ?? null,
            finalTitle: existing.correct && existing.title ? existing.title : null,
          });
          triggerMoviesLoad();
          
          // Load histogram so the chart renders on refresh
          const finishDateParam = dateKey !== todayKey ? `?date=${dateKey}` : "";
          fetch(`/api/daily/finish${finishDateParam}`)
            .then((r) => r.json())
            .then((data: { total: number; histogram: { solves: number[]; fail: number } }) => {
              dispatch({ type: "SET_HISTOGRAM", hist: data.histogram });
              openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, dateKey);
            })
            .catch(() => {
              openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, dateKey);
            });
        }
        
        // Focus input on load
        setTimeout(() => inputRef.current?.focus(), 0);
      })
      .catch(() => {
        dispatch({ type: "LOAD_ERROR" });
      });
  }, [dispatch, datePicker, triggerMoviesLoad, openReveal]);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // Initial load: fetch today's puzzle on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setStats(loadStats());
      dispatch({ type: "LOAD_START" });
      
      fetch("/api/daily")
        .then((r) => r.json())
        .then((d: DailyMeta) => {
          if (cancelled) return;
          if (d.error) {
            console.error("Failed to load puzzle:", d.error);
            dispatch({ type: "LOAD_ERROR" });
            return;
          }
          
          // Set today and playingDate from the response
          if (d.isToday !== false) {
            datePicker.setToday(d.day);
            datePicker.setPlayingDate(d.day);
          }
          dispatch({ type: "LOAD_SUCCESS", meta: d });

          // If user already finished this puzzle, restore the finished state
          const existing = getDailyResult(d.day);
          if (existing) {
            dispatch({
              type: "RESTORE_FINISHED",
              reveal: existing.revealed,
              score: existing.score,
              percentile: existing.percentile ?? null,
              answer: existing.answer ?? null,
              finalTitle: existing.correct && existing.title ? existing.title : null,
            });
            triggerMoviesLoad();
            
            fetch("/api/daily/finish")
              .then((r) => r.json())
              .then((data: { total: number; histogram: { solves: number[]; fail: number } }) => {
                if (cancelled) return;
                dispatch({ type: "SET_HISTOGRAM", hist: data.histogram });
                openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, d.day);
              })
              .catch(() => {
                openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, d.day);
              });
          }
          
          setTimeout(() => inputRef.current?.focus(), 0);
        })
        .catch(() => {
          if (!cancelled) dispatch({ type: "LOAD_ERROR" });
        });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Load puzzle when switching to a different date (including back to today)
  useEffect(() => {
    if (!today || !playingDate) return;
    
    const prevDate = prevPlayingDateRef.current;
    prevPlayingDateRef.current = playingDate;
    
    // Skip on initial mount (prevDate is null)
    if (prevDate === null) return;
    
    // Skip if date hasn't actually changed
    if (prevDate === playingDate) return;
    
    // Load the puzzle for the new date (archive or today)
    loadPuzzle(playingDate, today);
  }, [playingDate, today, loadPuzzle]);

  // Move focus to results panel when the game finishes
  useEffect(() => {
    if (state.status === "finished") {
      setTimeout(() => resultRef.current?.focus(), 0);
    }
  }, [state.status]);

  // Tick countdown to next UTC midnight when finished (only for today's game)
  useEffect(() => {
    if (state.status !== "finished" || !isPlayingToday) return;
    const update = () => setRemainingMs(msUntilNextUtcMidnight());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [state.status, isPlayingToday]);

  // ─────────────────────────────────────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleGuessChange = (value: string) => {
    setGuess(value);
    setSelectedIdx(0);
    // Lazy-load movies on first keystroke for autocomplete
    if (value.length === 1) {
      triggerMoviesLoad();
    }
  };

  async function submit(forcedTitle?: string) {
    const toSend = (forcedTitle ?? guess).trim();
    const meta = state.meta;
    if (!toSend || !meta) return;

    const dateParam = !isPlayingToday ? { date: playingDate } : {};
    const resp = (await fetch("/api/daily/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: toSend, revealed: state.reveal, ...dateParam }),
    }).then((r) => r.json())) as GuessResp;

    if (resp.correct) {
      dispatch({ type: "FINISH_WIN", score: resp.score, revealed: resp.revealed, finalTitle: toSend });
      triggerMoviesLoad();
      
      if (isPlayingToday) {
        setStats(recordWin(resp.score));
      }
      setDailyResult(meta.day, {
        correct: true,
        revealed: resp.revealed,
        score: resp.score,
        title: toSend,
        id: String(meta.puzzle.id),
      });
      datePicker.refreshCompletedDates();

      void fetch("/api/daily/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealed: resp.revealed, correct: true, ...dateParam }),
      })
        .then((r) => r.json())
        .then((fin: FinishResp) => {
          dispatch({ type: "SET_PERCENTILE", percentile: fin.percentile });
          dispatch({ type: "SET_HISTOGRAM", hist: fin.histogram });
          openReveal(resp.revealed);
          setDailyResult(meta.day, {
            correct: true,
            revealed: resp.revealed,
            score: resp.score,
            percentile: fin.percentile,
            title: toSend,
            id: String(meta.puzzle.id),
          });
        })
        .catch(() => {
          // ignore finish errors; user can still see their result
        });
    } else {
      const wasAtMax = state.reveal >= REVEAL_STEPS[REVEAL_STEPS.length - 1];
      dispatch({ type: "GUESS_WRONG", revealed: resp.revealed, wrongMsg: getRandomWrongMessage(), guess: toSend });
      setTimeout(() => inputRef.current?.focus(), 0);

      if (wasAtMax) {
        finishAsLoss(resp.revealed, meta);
      }
    }
    setGuess("");
  }

  async function handleSkip() {
    const meta = state.meta;
    if (!meta) return;

    const dateParam = !isPlayingToday ? { date: playingDate } : {};
    const resp = (await fetch("/api/daily/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "__SKIP__", revealed: state.reveal, ...dateParam }),
    }).then((r) => r.json())) as GuessResp;

    const wasAtMax = state.reveal >= REVEAL_STEPS[REVEAL_STEPS.length - 1];
    dispatch({ type: "SKIP", revealed: resp.revealed });
    setTimeout(() => inputRef.current?.focus(), 0);

    if (wasAtMax) {
      finishAsLoss(resp.revealed, meta);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const outcome = state.status === "finished" ? (state.answer ? "lost" : "won") : "playing";
  const longDate = formatLongDate(dateLabel);
  const shortDate = formatShortDate(dateLabel);
  const streak = stats?.currentStreak ?? 0;

  let title = "Which film is this?";
  if (outcome === "won") title = solutionTitle ? `You got it: ${solutionTitle}` : "You got it";
  if (outcome === "lost") title = solutionTitle && state.answer !== "Loading answer..." ? `It was ${solutionTitle}` : "Out of guesses";

  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Framemoji, today's film">
          <svg className="wordmark-mark" viewBox="0 0 22 16" aria-hidden="true">
            <rect x="0" y="0" width="6" height="16" rx="1.5" fill="currentColor" />
            <rect x="8" y="0" width="6" height="16" rx="1.5" fill="currentColor" opacity="0.6" />
            <rect x="16" y="0" width="6" height="16" rx="1.5" fill="currentColor" opacity="0.3" />
          </svg>
          Framemoji
        </a>
        <div className="topbar-end">
          <span className="topbar-streak" suppressHydrationWarning>
            <span className="topbar-streak-label">Streak </span>
            <strong className="num">{streak}</strong>
            <span className="topbar-streak-label"> {streak === 1 ? "day" : "days"}</span>
          </span>
          <span className="topbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="date-switch"
            onClick={datePicker.openDatePicker}
            aria-label={`${isArchive ? "Archive film" : "Today's film"}: ${longDate}. Choose another day.`}
          >
            {isArchive ? `Archive · ${shortDate}` : shortDate}
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="title-row">
        <div>
          <h1>{title}</h1>
          <p className="title-sub">
            {outcome === "playing"
              ? `${isArchive ? "The film" : "Today's film"} for ${longDate}, told in ten emoji. Each miss or skip shows more frames.`
              : `${isArchive ? "The film" : "Today's film"} for ${longDate}. A new film arrives at midnight UTC.`}
          </p>
        </div>
        {outcome === "playing" && state.meta ? <GuessMeter reveal={state.reveal} /> : null}
      </div>

      {state.metaLoaded && !state.meta ? (
        <div className="load-error" role="alert">
          <strong>The film for {longDate} didn&apos;t load.</strong>
          Check your connection and reload the page to try again.
        </div>
      ) : (
        <EmojiGrid
          clues={clues}
          reveal={state.reveal}
          loaded={state.metaLoaded && !!state.meta}
          history={state.history}
          outcome={outcome}
        />
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Clues shown (${state.reveal}/10): ${shown}`}
      </div>

      {state.status !== "finished" && state.meta && (
        <GuessInput
          guess={guess}
          onGuessChange={handleGuessChange}
          onSubmit={submit}
          onSkip={handleSkip}
          suggestions={suggestions}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          inputRef={inputRef}
          status={state.status}
          wrongMsg={state.wrongMsg}
        />
      )}

      {state.status === "finished" && (
        <ResultsPanel
          answer={state.answer}
          solutionTitle={solutionTitle}
          percentile={state.percentile}
          score={state.score}
          reveal={state.reveal}
          hist={state.hist}
          selectedReveal={state.selectedReveal}
          onSelectReveal={openReveal}
          guessesLoading={state.guessesLoading}
          topGuesses={state.topGuesses}
          movies={movies}
          posterUrl={posterUrl}
          stats={stats}
          remainingMs={isPlayingToday ? remainingMs : null}
          resultRef={resultRef}
          clues={clues}
          isArchive={isArchive}
          onPlayArchive={datePicker.openDatePicker}
        />
      )}

      <DevToolsFooter meta={state.meta} />

      {today && (
        <DatePickerPopover
          open={datePicker.datePickerOpen}
          onClose={datePicker.closeDatePicker}
          selectedDate={playingDate || today}
          onSelectDate={datePicker.handleDateSelect}
          availableDates={datePicker.availableDates}
          completedDates={datePicker.completedDates}
          today={today}
          loading={datePicker.datesLoading}
        />
      )}
    </>
  );
}

function parseDay(key: string) {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

function formatLongDate(key: string) {
  const d = parseDay(key);
  if (!d) return "today";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

function formatShortDate(key: string) {
  const d = parseDay(key);
  if (!d) return "Today";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
