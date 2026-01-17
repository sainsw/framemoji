"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordLoss, recordWin, loadStats, type DailyStats } from "@/lib/stats";
import { getDailyResult, setDailyResult, getCompletedDates } from "@/lib/result";
import { msUntilNextUtcMidnight } from "@/lib/date";
import { REVEAL_STEPS, revealStepForCount } from "@/lib/reveal";
import { DatePickerPopover } from "./DatePickerPopover";
import { DevToolsFooter } from "./DevToolsFooter";
import { EmojiGrid } from "./EmojiGrid";
import { GuessInput } from "./GuessInput";
import { GuessMeter } from "./GuessMeter";
import { ResultsPanel } from "./ResultsPanel";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useMovies } from "./hooks/useMovies";
import { filterSuggestions } from "./utils/suggestions";
import type { AvailableDatesResp, DailyMeta, FinishResp, GuessResp, Histogram, TopGuess } from "./types";

export default function DailyGame() {
  // Date selection state
  const [today, setToday] = useState<string>("");
  const [playingDate, setPlayingDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Game state
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
  const resultRef = useRef<HTMLDivElement>(null!);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const { movies, triggerLoad: triggerMoviesLoad } = useMovies();
  const [finalTitle, setFinalTitle] = useState<string | null>(null);
  const { solutionTitle, posterUrl } = useMovieDetails({ movies, meta, finalTitle, answer });

  const isPlayingToday = playingDate === today;

  const openReveal = useCallback((rev: number, dateOverride?: string) => {
    const dateKey = dateOverride ?? playingDate;
    if (rev === 0) {
      setSelectedReveal(0);
      setTopGuesses(null);
      return;
    }
    const r = revealStepForCount(rev);
    setSelectedReveal(r);
    setGuessesLoading(true);
    setTopGuesses(null);
    const dateParam = dateKey && dateKey !== today ? `&date=${dateKey}` : "";
    fetch(`/api/daily/guesses?reveal=${r}&limit=10${dateParam}`)
      .then((res) => res.json())
      .then((data: { reveal: number; items: TopGuess[] }) => setTopGuesses(data.items))
      .catch(() => setTopGuesses([]))
      .finally(() => setGuessesLoading(false));
  }, [playingDate, today]);

  // Load completed dates from local storage on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setCompletedDates(getCompletedDates());
    });
    return () => { cancelled = true; };
  }, []);

  // Load puzzle when playingDate changes
  const loadPuzzle = useCallback((dateKey: string, todayKey: string) => {
    const dateParam = dateKey !== todayKey ? `?date=${dateKey}` : "";
    setMetaLoaded(false);
    setMeta(null);
    setStatus("idle");
    setReveal(REVEAL_STEPS[0]);
    setScore(null);
    setPercentile(null);
    setAnswer(null);
    setHist(null);
    setSelectedReveal(null);
    setTopGuesses(null);
    setFinalTitle(null);
    setHasGuessed(false);
    setWrongMsg(null);

    fetch(`/api/daily${dateParam}`)
      .then((r) => r.json())
      .then((d: DailyMeta) => {
        if (d.error) {
          console.error("Failed to load puzzle:", d.error);
          setMetaLoaded(true);
          return;
        }
        setMeta(d);
        // Update today if we didn't have it yet
        if (!todayKey && d.isToday) {
          setToday(d.day);
        }

        // If user already finished this puzzle, show the stored result immediately
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
          // Load movies for poster display (archive games)
          triggerMoviesLoad();
          // Load histogram so the chart renders on refresh
          const finishDateParam = dateKey !== todayKey ? `?date=${dateKey}` : "";
          fetch(`/api/daily/finish${finishDateParam}`)
            .then((r) => r.json())
            .then((data: { total: number; histogram: Histogram }) => {
              setHist(data.histogram);
              openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, dateKey);
            })
            .catch(() => {
              openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, dateKey);
            });
        } else {
          setReveal(REVEAL_STEPS[0]);
          setStatus("idle");
          setScore(null);
          setPercentile(null);
          setAnswer(null);
          setHasGuessed(false);
        }
        setMetaLoaded(true);
        // focus input on load
        setTimeout(() => inputRef.current?.focus(), 0);
      })
      .catch(() => {
        setMetaLoaded(true);
      });
  }, [openReveal, triggerMoviesLoad]);

  // Initial load: fetch today's puzzle on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setStats(loadStats());
      // Fetch today's puzzle (no date param)
      setMetaLoaded(false);
      fetch("/api/daily")
        .then((r) => r.json())
        .then((d: DailyMeta) => {
          if (cancelled) return;
          if (d.error) {
            console.error("Failed to load puzzle:", d.error);
            setMetaLoaded(true);
            return;
          }
          // Set today and playingDate from the response
          if (d.isToday !== false) {
            setToday(d.day);
            setPlayingDate(d.day);
          }
          setMeta(d);
          
          // If user already finished this puzzle, show the stored result
          const existing = getDailyResult(d.day);
          if (existing) {
            setReveal(revealStepForCount(existing.revealed));
            setScore(existing.score);
            setPercentile(existing.percentile ?? null);
            setAnswer(existing.answer ?? null);
            if (existing.correct && existing.title) {
              setFinalTitle(existing.title);
            }
            setStatus("finished");
            // Load movies for poster display
            triggerMoviesLoad();
            fetch("/api/daily/finish")
              .then((r) => r.json())
              .then((data: { total: number; histogram: Histogram }) => {
                if (cancelled) return;
                setHist(data.histogram);
                openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, d.day);
              })
              .catch(() => {
                openReveal(existing.correct ? revealStepForCount(existing.revealed) : 0, d.day);
              });
          } else {
            setReveal(REVEAL_STEPS[0]);
            setStatus("idle");
            setHasGuessed(false);
          }
          setMetaLoaded(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        })
        .catch(() => {
          if (!cancelled) setMetaLoaded(true);
        });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Load puzzle when switching to a different date
  useEffect(() => {
    // Skip if this is the initial load (no today yet) or if we're on today already
    if (!today || !playingDate || playingDate === today) return;
    // Only trigger for archive dates
    loadPuzzle(playingDate, today);
  }, [playingDate, today, loadPuzzle]);

  // Move focus to results panel when the game finishes so screen readers announce it
  useEffect(() => {
    if (status === "finished") {
      setTimeout(() => resultRef.current?.focus(), 0);
    }
  }, [status]);

  // Tick countdown to next UTC midnight when finished (only for today's game)
  useEffect(() => {
    if (status !== "finished" || !isPlayingToday) return;
    const update = () => setRemainingMs(msUntilNextUtcMidnight());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [status, isPlayingToday]);

  const clues = useMemo(() => meta?.puzzle.emoji_clues ?? [], [meta]);
  const shown = useMemo(() => clues.slice(0, reveal).join(""), [clues, reveal]);
  const suggestions = useMemo(() => filterSuggestions(movies, guess), [movies, guess]);
  const animateEmoji = metaLoaded;

  const handleGuessChange = (value: string) => {
    setGuess(value);
    setSelectedIdx(0);
    // Lazy-load movies on first keystroke for autocomplete
    if (value.length === 1) {
      triggerMoviesLoad();
    }
  };

  const handleDateSelect = useCallback((date: string) => {
    setPlayingDate(date);
    setDatePickerOpen(false);
  }, []);

  const [datesLoading, setDatesLoading] = useState(false);
  const [datesLoaded, setDatesLoaded] = useState(false);

  const handleOpenDatePicker = useCallback(() => {
    // Refresh completed dates before opening
    setCompletedDates(getCompletedDates());
    setDatePickerOpen(true);
    
    // Lazy load available dates on first open
    if (!datesLoaded && !datesLoading) {
      setDatesLoading(true);
      fetch("/api/daily/dates")
        .then((r) => r.json())
        .then((data: AvailableDatesResp) => {
          setAvailableDates(new Set(data.dates));
          // Update today if we have it from this response
          if (data.today && !today) {
            setToday(data.today);
          }
          setDatesLoaded(true);
        })
        .catch(() => {
          // Failed to load, user can still select today
        })
        .finally(() => {
          setDatesLoading(false);
        });
    }
  }, [datesLoaded, datesLoading, today]);

  async function submit(forcedTitle?: string) {
    const toSend = (forcedTitle ?? guess).trim();
    if (!toSend || !meta) return;
    setHasGuessed(true);
    
    const dateParam = !isPlayingToday ? { date: playingDate } : {};
    const resp = (await fetch("/api/daily/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: toSend, revealed: reveal, ...dateParam }),
    }).then((r) => r.json())) as GuessResp;

    if (resp.correct) {
      setStatus("correct");
      setFinalTitle(toSend);
      setScore(resp.score);
      setReveal(resp.revealed);
      // Load movies for poster display
      triggerMoviesLoad();
      // Only update local streak stats for today's game
      if (isPlayingToday) {
        recordWin(resp.score);
      }
      setDailyResult(meta.day, {
        correct: true,
        revealed: resp.revealed,
        score: resp.score,
        title: toSend,
        id: String(meta.puzzle.id),
      });
      setCompletedDates(getCompletedDates());
      setStatus("finished");
      
      void fetch("/api/daily/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealed: resp.revealed, correct: true, ...dateParam }),
      })
        .then((r) => r.json())
        .then((fin: FinishResp) => {
          setPercentile(fin.percentile);
          setHist(fin.histogram);
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
        "Plot twist: that wasn't it. New clues revealed!",
        "Almost! A couple more pictograms to help.",
        "Nope. The emoji council grants you more.",
        "Incorrect. Let's sweeten it with extra emoji.",
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
        if (isPlayingToday) {
          recordLoss();
        }
        setAnswer("Loading answer...");
        setStatus("finished");
        // Load movies for poster display
        triggerMoviesLoad();
        openReveal(0);
        setDailyResult(meta.day, {
          correct: false,
          revealed: resp.revealed,
          score: 0,
          id: String(meta.puzzle.id),
        });
        setCompletedDates(getCompletedDates());
        
        void fetch("/api/daily/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revealed: resp.revealed, correct: false, ...dateParam }),
        })
          .then((r) => r.json())
          .then((fin: FinishResp) => {
            setAnswer(fin.answer ?? null);
            setPercentile(fin.percentile);
            setHist(fin.histogram);
            setDailyResult(meta.day, {
              correct: false,
              revealed: resp.revealed,
              score: 0,
              percentile: fin.percentile,
              id: String(meta.puzzle.id),
              answer: fin.answer ?? undefined,
            });
          })
          .catch(() => {
            setAnswer("Answer unavailable.");
          });
      }
    }
    setGuess("");
  }

  // Format the date header to be clickable
  const dateLabel = meta?.day ?? playingDate ?? "…";
  const isArchive = !isPlayingToday && !!playingDate;

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button 
          type="button"
          className="date-header-btn"
          onClick={handleOpenDatePicker}
          aria-label={`Current puzzle: ${dateLabel}. Click to select a different date.`}
        >
          <span className="status">
            {isArchive ? "Archive" : "Daily"} — {dateLabel}
          </span>
          <span className="date-header-chevron" aria-hidden="true">▼</span>
        </button>
      </div>
      <div className="spacer" />

      {status !== "finished" && (
        <>
          <EmojiGrid clues={clues} reveal={reveal} animate={animateEmoji} />
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
          remainingMs={isPlayingToday ? remainingMs : null}
          resultRef={resultRef}
          clues={clues}
          isArchive={isArchive}
          onPlayArchive={handleOpenDatePicker}
        />
      )}

      <DevToolsFooter meta={meta} />

      {today && (
        <DatePickerPopover
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          selectedDate={playingDate || today}
          onSelectDate={handleDateSelect}
          availableDates={availableDates}
          completedDates={completedDates}
          today={today}
          loading={datesLoading}
        />
      )}

      <style jsx>{`
        .date-header-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: none;
          padding: 0.25rem 0.5rem;
          margin: -0.25rem -0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          color: inherit;
          font: inherit;
          /* Safari button reset */
          -webkit-appearance: none;
          appearance: none;
          position: relative;
          z-index: 1;
          /* Ensure touch target is clickable */
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .date-header-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .date-header-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .date-header-chevron {
          font-size: 0.6rem;
          opacity: 0.6;
          transition: transform 0.15s;
          pointer-events: none;
        }
        .date-header-btn:hover .date-header-chevron {
          transform: translateY(1px);
        }
      `}</style>
    </section>
  );
}
