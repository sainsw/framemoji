"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recordLoss, recordWin, loadStats, resetLocalStats, type DailyStats } from "@/lib/stats";
import { splitGraphemes } from "@/lib/emoji";
import { getDailyResult, setDailyResult, clearAllDailyResults } from "@/lib/result";
import { msUntilNextUtcMidnight } from "@/lib/date";
import { normalizeTitle } from "@/lib/normalize";

type DailyMeta = {
  day: string;
  puzzle: { id: number; year?: number; emoji_clues: string[] };
  answer?: string; // present in dev mode
  dev?: boolean;
};

type GuessResp = { correct: boolean; revealed: number; score: number };
type Histogram = { solves: number[]; fail: number };
type FinishResp = { percentile: number; total: number; histogram: Histogram; answer?: string; id: number };

type Movie = {
  id: number;
  title: string;
  year?: number;
  popularity?: number;
  vote_count?: number;
  vote_average?: number;
  revenue?: number;
  poster_path?: string | null;
};

function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  useEffect(() => {
    fetch("/api/movies")
      .then((r) => r.json())
      .then((d) => setMovies(d))
      .catch(() => setMovies([]));
  }, []);
  return movies;
}

function filterSuggestions(movies: Movie[], q: string) {
  const n = normalizeTitle(q || "");
  if (!n) return [] as Movie[];
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match only at word boundaries (start of string or after a space)
  const re = new RegExp(`(?:^|\u0020)${escaped}`); // \u0020 = space
  let filtered = movies.filter((m) => re.test(normalizeTitle(m.title)));
  if (filtered.length === 0) {
    filtered = movies.filter((m) => normalizeTitle(m.title).includes(n));
  }
  // Prefer items many users have rated; fallback to popularity
  filtered.sort((a, b) =>
    (Number(b.vote_count || 0) - Number(a.vote_count || 0)) ||
    (Number(b.popularity || 0) - Number(a.popularity || 0)) ||
    (a.title || '').localeCompare(b.title || '')
  );
  return filtered.slice(0, 8);
}

export default function DailyGame() {
  const [meta, setMeta] = useState<DailyMeta | null>(null);
  const [reveal, setReveal] = useState(1);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong" | "finished">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [hist, setHist] = useState<Histogram | null>(null);
  const [selectedReveal, setSelectedReveal] = useState<number | null>(null);
  const [topGuesses, setTopGuesses] = useState<Array<{ key: string; count: number }> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const movies = useMovies();
  const [finalTitle, setFinalTitle] = useState<string | null>(null);
  const solutionTitle = useMemo(() => {
    const title = finalTitle ?? answer ?? meta?.answer ?? null;
    if (!title) return null;
    // Try to resolve year from TMDB list; fallback to puzzle year
    const norm = normalizeTitle(title);
    const cands = movies.filter((m) => typeof m.id === 'number' && normalizeTitle(m.title) === norm);
    const y = (() => {
      if (cands.length > 0) {
        const targetYear = meta?.puzzle.year;
        const best = cands.slice().sort((a, b) => {
          const da = targetYear && a.year ? Math.abs(a.year - targetYear) : 9999;
          const db = targetYear && b.year ? Math.abs(b.year - targetYear) : 9999;
          if (da !== db) return da - db;
          return (Number(b.popularity || 0) - Number(a.popularity || 0));
        })[0];
        if (best?.year) return best.year;
      }
      return meta?.puzzle.year;
    })();
    return `${title}${y ? ` (${y})` : ''}`;
  }, [movies, meta, finalTitle, answer]);

  // Resolve poster path by matching the final or revealed title to TMDB list
  const posterUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE;
    if (!base) return null;
    const title = finalTitle ?? answer ?? meta?.answer ?? null;
    if (!title) return null;
    const norm = normalizeTitle(title);
    const y = meta?.puzzle.year;
    const cands = movies.filter((m) => normalizeTitle(m.title) === norm);
    if (cands.length === 0) return null;
    cands.sort((a, b) => {
      // Prefer entries with poster_path
      const hasPosterA = a.poster_path ? 1 : 0;
      const hasPosterB = b.poster_path ? 1 : 0;
      if (hasPosterA !== hasPosterB) return hasPosterB - hasPosterA;
      // Prefer year closeness to the puzzle year
      const da = y && a.year ? Math.abs(a.year - y) : 9999;
      const db = y && b.year ? Math.abs(b.year - y) : 9999;
      if (da !== db) return da - db;
      // Then prefer widely-rated titles, then revenue, then rating, then popularity
      const vc = Number(b.vote_count || 0) - Number(a.vote_count || 0);
      if (vc !== 0) return vc;
      const rev = Number(b.revenue || 0) - Number(a.revenue || 0);
      if (rev !== 0) return rev;
      const va = Number(b.vote_average || 0) - Number(a.vote_average || 0);
      if (va !== 0) return va;
      return (Number(b.popularity || 0) - Number(a.popularity || 0));
    });
    const best = cands[0];
    if (!best?.poster_path) return null;
    return `${base}${best.poster_path}`;
  }, [movies, meta, finalTitle, answer]);

  useEffect(() => {
    setMounted(true);
    setStats(loadStats());
    fetch("/api/daily")
      .then((r) => r.json())
      .then((d: DailyMeta) => {
        setMeta(d);
        // If user already finished today, show the stored result immediately
        const existing = getDailyResult(d.day);
        if (existing) {
          setReveal(existing.revealed);
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
          fetch('/api/daily/finish')
            .then((r) => r.json())
            .then((data: { total: number; histogram: Histogram }) => {
              setHist(data.histogram);
              openReveal(existing.correct ? existing.revealed : 0);
            })
            .catch(() => {
              openReveal(existing.correct ? existing.revealed : 0);
            });
        } else {
          setReveal(1);
          setStatus("idle");
          setScore(null);
          setPercentile(null);
          setAnswer(null);
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
  const selectedEmoji = useMemo(() => (selectedReveal && selectedReveal > 0 ? clues[selectedReveal - 1] : undefined), [selectedReveal, clues]);
  function openReveal(rev: number) {
    if (rev === 0) {
      setSelectedReveal(0);
      setTopGuesses(null);
      return;
    }
    const r = Math.max(1, Math.min(rev, 10));
    setSelectedReveal(r);
    fetch(`/api/daily/guesses?reveal=${r}&limit=10`)
      .then((res) => res.json())
      .then((data: { reveal: number; items: { key: string; count: number }[] }) => setTopGuesses(data.items))
      .catch(() => setTopGuesses(null));
  }

  useEffect(() => {
    // reset active suggestion to top when query changes
    setSelectedIdx(0);
  }, [guess]);

  async function submit(forcedTitle?: string) {
    const toSend = (forcedTitle ?? guess).trim();
    if (!toSend) return;
    const resp = await fetch("/api/daily/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: toSend, revealed: reveal }),
    }).then((r) => r.json()) as GuessResp;
    if (resp.correct) {
      setStatus("correct");
      setFinalTitle(toSend);
      setScore(resp.score);
      setReveal(resp.revealed);
      recordWin(resp.score);
      const fin = await fetch("/api/daily/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealed: resp.revealed, correct: true }),
      }).then((r) => r.json()) as FinishResp;
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
      setStatus("finished");
    } else {
      setStatus("wrong");
      setFinalTitle(null);
      // Pick a snarky, accessible message for wrong guesses
      const WRONG_MESSAGES = [
        "Close, but no cigar. Another emoji joins the chat.",
        "Not quite. Unlocking one more emoji…",
        "Swing and a miss — have an extra emoji.",
        "Nice try! Here’s another clue.",
        "Good guess, wrong movie. Revealing another emoji.",
        "So close. Ok, one more emoji.",
        "Plot twist: that wasn’t it. New emoji revealed!",
        "Almost! Another little pictogram to help.",
        "Nope. The emoji council grants you one more.",
        "Incorrect. Let’s sweeten it with another emoji.",
        "Not this time — enjoy a fresh emoji.",
        "Incorrect guess. Another hint just dropped.",
      ];
      setWrongMsg(WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]!);
      const wasAtTen = reveal >= 10; // had all 10 emoji before this guess
      setReveal(resp.revealed);
      // After a wrong guess, return focus to the input so the
      // user can immediately type their next attempt.
      setTimeout(() => inputRef.current?.focus(), 0);
      if (wasAtTen) {
        // Already at 10 and guessed wrong again → finish as fail
        recordLoss();
        const fin = await fetch("/api/daily/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revealed: resp.revealed, correct: false }),
        }).then((r) => r.json()) as FinishResp;
        setAnswer(fin.answer ?? null);
        setPercentile(fin.percentile);
        setHist(fin.histogram);
        openReveal(0);
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
        setStatus("finished");
      }
    }
    setGuess("");
  }


  return (
    <section className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="status">Daily — {meta?.day ?? "…"}</div>
        {(() => {
          const cur = mounted && stats ? (stats.currentStreak ?? 0) : 0;
          const best = mounted && stats ? (stats.bestScore ?? 0) : 0;
          const bestStreak = mounted && stats ? (stats.bestStreak ?? 0) : 0;
          const parts: string[] = [];
          if (cur > 0) parts.push(`Streak: ${cur}`);
          if (best > 0) parts.push(`Best score: ${best}`);
          if (bestStreak > 0 && stats && bestStreak !== (stats.currentStreak ?? 0)) parts.push(`Best streak: ${bestStreak}`);
          return parts.length > 0 ? (
            <div className="status" suppressHydrationWarning>{parts.join(" • ")}</div>
          ) : null;
        })()}
      </div>
      <div className="spacer" />

      {status !== "finished" && (
        <>
          {(() => {
            const cols = reveal <= 3 ? 3 : Math.min(reveal, 10);
            return (
              <div
                className="emoji-row"
                aria-live="polite"
                aria-atomic="true"
                role="group"
                aria-label={`Emoji clues — ${reveal} of 10 revealed`}
                style={{ ['--cols' as any]: cols }}
              >
                {Array.from({ length: cols }).map((_, i) => (
                  <div className="emoji-cell" key={i}>
                    {i < reveal ? (
                      <span className="emoji-inline">{clues[i]}</span>
                    ) : (
                      ""
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          <p style={{ marginTop: "0.5rem" }}>Guesses Left: {11 - reveal}</p>
          {/* Screen reader-friendly live summary of shown clues */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {`Clues shown (${reveal}/10): ${shown}`}
          </div>
        </>
      )}

      {status !== "finished" && (
        <>
          <div className="suggest-container">
            <div className="row">
              <input
              type="text"
              placeholder="Type a movie title…"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const choice = suggestions[selectedIdx]?.title || guess;
                  submit(choice);
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
                  setGuess("");
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
              <button onClick={() => void submit()} aria-label="Submit guess" title="Press Enter to submit">
                Guess <span className="kbd-hint" aria-hidden="true">↵</span>
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
                    onClick={() => submit(m.title)}
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
              <div
                className="status error"
                aria-hidden="true"
                style={{ marginTop: "1rem" }}
              >
                {wrongMsg ?? "Not quite. Another emoji revealed."}
              </div>
              {/* Screen-reader-only live region for immediate announcement */}
              <div className="sr-only" aria-live="assertive" aria-atomic="true">
                {wrongMsg ?? "Not quite. Another emoji revealed."}
              </div>
            </>
          )}
        </>
      )}

      {status === "finished" && (
        <div className="card" style={{ marginTop: "1.25rem" }} tabIndex={-1} ref={resultRef} aria-label="Game results">
          <div className="row" style={{ alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {answer ? (
                <>
                  <div className="status" aria-hidden="true">Answer: {solutionTitle ?? answer}</div>
                  <div className="sr-only" aria-live="assertive" aria-atomic="true">Answer: {solutionTitle ?? answer}</div>
                </>
              ) : (
                <>
                  <div className="status success" aria-hidden="true">Correct!</div>
                  <div className="sr-only" aria-live="assertive" aria-atomic="true">Correct!</div>
                  {solutionTitle && (
                    <>
                      <div className="status" aria-hidden="true" style={{ marginTop: '0.5rem' }}>Today's answer: {solutionTitle}</div>
                      <div className="sr-only" aria-live="polite" aria-atomic="true">Today's answer: {solutionTitle}</div>
                    </>
                  )}
                </>
              )}
              <div style={{ marginTop: "0.875rem" }}>
                {percentile !== null ? `You're better than ${percentile}% of players today.` : ""}
              </div>
              {hist && answer && (
                <div style={{ marginTop: "0.875rem", opacity: 0.85 }}>
                  {`You're not alone — ❌ ${hist.fail} failed today.`}
                </div>
              )}
              <div style={{ marginTop: "0.875rem", opacity: 0.8 }}>
                Score: {score ?? (reveal < 10 ? (11 - reveal) : 0)}
              </div>
            </div>
            {(() => {
              // Reserve poster area to avoid layout shift.
              // Show skeleton while movie list loads and we know the title,
              // then either render the poster or keep a neutral placeholder.
              const hasTitle = !!(finalTitle ?? answer ?? meta?.answer ?? null);
              const isLoadingPoster = hasTitle && movies.length === 0;
              const posterBoxStyle = { width: 140, height: 210, borderRadius: 8, overflow: 'hidden' as const };
              return (
                <div aria-hidden="true" style={{ flex: '0 0 140px' }}>
                  {posterUrl ? (
                    <div style={{ ...posterBoxStyle, background: 'rgba(255,255,255,0.06)' }}>
                      <img src={posterUrl} alt="" style={{ display: 'block', width: '100%', height: 'auto' }} />
                    </div>
                  ) : isLoadingPoster ? (
                    <div className="skeleton" style={posterBoxStyle} />
                  ) : (
                    <div style={{ ...posterBoxStyle, background: 'rgba(255,255,255,0.06)' }} />
                  )}
                </div>
              );
            })()}
          </div>
          {hist ? (
            (() => {
              const total = hist.solves.reduce((a, b) => a + b, 0) + hist.fail;
              if (total === 0) {
                return (
                  <div style={{ marginTop: "1.25rem" }}>
                    <div className="status" style={{ opacity: 0.85 }}>Stats unavailable right now</div>
                  </div>
                );
              }
              return (
                <div style={{ marginTop: "1.25rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Today's distribution</div>
                  <HistogramView
                    histogram={hist}
                    myReveal={reveal}
                    failed={!!answer}
                    labels={clues}
                    selectedReveal={selectedReveal ?? undefined}
                    onSelect={(r) => openReveal(r)}
                  />
                  {selectedReveal === 0 && hist && (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10 }}>❌ Failures</div>
                      <div style={{ fontSize: 14, opacity: 0.95 }}>{hist.fail} players failed today.</div>
                    </div>
                  )}
                  {(selectedReveal !== null && selectedReveal !== 0 && topGuesses && topGuesses.length > 0) && (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10, lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Popular guesses at</span>
                        {selectedEmoji ? (
                          <span className="emoji-inline" aria-hidden="true">{selectedEmoji}</span>
                        ) : (
                          <span>{selectedReveal}</span>
                        )}
                      </div>
                      {(() => {
                        const items = topGuesses.slice(0, 10);
                        const max = Math.max(1, ...items.map((g) => g.count));
                        return items.map((g, i) => {
                          const match = movies.find((m) => normalizeTitle(m.title) === g.key);
                          const label = match ? `${match.title}${match.year ? ` (${match.year})` : ''}` : g.key;
                          const pct = Math.round((g.count / max) * 100);
                          return (
                            <div key={g.key + i} style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 6 }}>{i + 1}. {label}</div>
                              <div aria-label={`${g.count} guesses`} style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 6, opacity: 0.85 }} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                  <div style={{ opacity: 0.8, marginTop: "0.75rem" }}>
                    {`Players today: ${total}`}
                  </div>
                </div>
              );
            })()
          ) : (
            // Histogram skeleton placeholder to prevent layout shift
            <div style={{ marginTop: "1.25rem" }}>
              <div className="skeleton-line lg skeleton" style={{ width: 220, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 170, borderRadius: 10 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '10px', marginTop: 10 }}>
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} className="skeleton-line" style={{ height: 28, borderRadius: 6 }} />
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: "1.25rem", opacity: 0.8 }} suppressHydrationWarning>
            {remainingMs !== null ? (
              (() => {
                const total = Math.max(0, remainingMs);
                const h = Math.floor(total / 3600000);
                const m = Math.floor((total % 3600000) / 60000);
                const s = Math.floor((total % 60000) / 1000);
                const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                return `Next game in ${pad(h)}:${pad(m)}:${pad(s)}`;
              })()
            ) : null}
          </div>
        </div>
      )}

      {meta?.answer && (
        <footer style={{ marginTop: "0.75rem", opacity: 0.8, fontSize: "0.9rem", display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
          <span>Dev mode: answer is <strong>{meta.answer}</strong></span>
          <button
            className="secondary"
            onClick={() => {
              clearAllDailyResults();
              resetLocalStats();
              // Simple way to reset component state and refetch
              window.location.reload();
            }}
            aria-label="Clear local Framemoji data"
          >
            Clear local data
          </button>
        </footer>
      )}
    </section>
  );
}

function HistogramView({ histogram, myReveal, failed, onSelect, labels, selectedReveal }: { histogram: { solves: number[]; fail: number }; myReveal: number; failed: boolean; onSelect?: (reveal: number) => void; labels?: string[]; selectedReveal?: number }) {
  const max = Math.max(1, ...histogram.solves, histogram.fail);
  return (
    <div>
      <div className="hist">
        {histogram.solves.map((c, i) => {
          const h = Math.round((c / max) * 100);
          const isMe = !failed && (myReveal - 1 === i);
          const isSelected = selectedReveal === (i + 1);
          return (
            <div
              key={i}
              aria-label={`Solved at ${i+1} emoji: ${c}`}
              className={`bar${isMe ? ' me' : ''}`}
              style={{ background: 'rgba(255,255,255,0.06)', border: isSelected ? '3px solid #ffffff' : (isMe ? '3px solid var(--success)' : '1px solid rgba(255,255,255,0.08)'), borderRadius: 8, position: 'relative', height: '100%', cursor: onSelect ? 'pointer' : 'default' }}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : -1}
              onClick={() => onSelect?.(i + 1)}
              onKeyDown={(e) => {
                if (!onSelect) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(i + 1);
                }
              }}
            >
              <div className="fill" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h}%`, background: 'var(--accent)', borderRadius: 6, opacity: 0.8 }} />
            </div>
          );
        })}
        {(() => {
          const c = histogram.fail;
          const h = Math.round((c / max) * 100);
          const isMe = failed;
          const isSelected = selectedReveal === 0;
          return (
            <div
              aria-label={`Failed: ${c}`}
              className={`bar fail${isMe ? ' me' : ''}`}
              style={{ background: 'rgba(255,255,255,0.06)', border: isSelected ? '3px solid #ffffff' : (isMe ? '3px solid var(--success)' : '1px solid rgba(255,255,255,0.08)'), borderRadius: 8, position: 'relative', height: '100%', cursor: onSelect ? 'pointer' : 'default' }}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : -1}
              onClick={() => onSelect?.(0)}
              onKeyDown={(e) => {
                if (!onSelect) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(0);
                }
              }}
            >
              <div className="fill" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h}%`, background: '#666', borderRadius: 6, opacity: 0.8 }} />
            </div>
          );
        })()}
      </div>
      <div className="hist-labels">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>
            {labels?.[i] ?? (i + 1)}
          </div>
        ))}
        <div>❌</div>
      </div>
    </div>
  );
}
