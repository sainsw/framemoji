/* eslint-disable @next/next/no-img-element */
import type { RefObject } from "react";
import { normalizeTitle } from "@/lib/normalize";
import { REVEAL_STEPS, revealIndexForCount } from "@/lib/reveal";
import type { DailyStats } from "@/lib/stats";
import { Skeleton } from "@/components/common/Skeleton";
import { HistogramView } from "./HistogramView";
import type { Histogram, Movie, TopGuess } from "./types";

export function ResultsPanel({
  answer,
  solutionTitle,
  percentile,
  score,
  reveal,
  hist,
  selectedReveal,
  onSelectReveal,
  guessesLoading,
  topGuesses,
  movies,
  posterUrl,
  finalTitle,
  devAnswer,
  stats,
  remainingMs,
  resultRef,
  clues,
  isArchive,
  onPlayArchive,
}: {
  answer: string | null;
  solutionTitle: string | null;
  percentile: number | null;
  score: number | null;
  reveal: number;
  hist: Histogram | null;
  selectedReveal: number | null;
  onSelectReveal: (r: number) => void;
  guessesLoading: boolean;
  topGuesses: TopGuess[] | null;
  movies: Movie[];
  posterUrl: string | null;
  finalTitle: string | null;
  devAnswer: string | null;
  stats: DailyStats | null;
  remainingMs: number | null;
  resultRef: RefObject<HTMLDivElement>;
  clues: string[];
  isArchive?: boolean;
  onPlayArchive?: () => void;
}) {
  const selectedGuess = selectedReveal && selectedReveal > 0 ? revealIndexForCount(selectedReveal) + 1 : null;
  const selectedRevealLabel = selectedGuess ? `guess ${selectedGuess}` : undefined;
  const hasTitle = !!(finalTitle ?? answer ?? devAnswer ?? null);
  const isLoadingPoster = hasTitle && movies.length === 0;
  const emojiLabels = (() => {
    if (!clues || clues.length === 0) return null;
    const groups: string[] = [];
    let prev = 0;
    for (const step of REVEAL_STEPS) {
      groups.push(clues.slice(prev, step).join(""));
      prev = step;
    }
    return groups;
  })();

  return (
    <div className="card results-glass" style={{ marginTop: "1.25rem" }} tabIndex={-1} ref={resultRef} aria-label="Game results">
      <div className="row" style={{ alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Display the full emoji sequence in a grid for even wrapping */}
          {clues && clues.length > 0 && (
            <div 
              style={{ 
                display: "grid",
                gridTemplateColumns: "repeat(5, auto)",
                gap: "0.15em",
                fontSize: "1.5rem",
                marginBottom: "0.75rem",
                width: "fit-content",
              }}
              aria-label={`Emoji clues: ${clues.join(" ")}`}
            >
              {clues.map((emoji, i) => (
                <span key={i}>{emoji}</span>
              ))}
            </div>
          )}
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
                  <div className="status" aria-hidden="true" style={{ marginTop: "0.5rem" }}>
                    {isArchive ? "Answer" : "Today's answer"}: {solutionTitle}
                  </div>
                  <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {isArchive ? "Answer" : "Today's answer"}: {solutionTitle}
                  </div>
                </>
              )}
            </>
          )}
          <div style={{ marginTop: "0.875rem" }}>
            {percentile !== null ? `You're better than ${percentile}% of players${isArchive ? "" : " today"}.` : ""}
          </div>
          {hist && answer && (
            <div style={{ marginTop: "0.875rem", opacity: 0.85 }}>
              {`You're not alone — ❌ ${hist.fail} failed${isArchive ? "" : " today"}.`}
            </div>
          )}
          <div style={{ marginTop: "0.875rem", opacity: 0.8 }}>
            Score: {score ?? (reveal < 10 ? 11 - reveal : 0)}
          </div>
        </div>
        {(() => {
          // Reserve poster area to avoid layout shift.
          // Show skeleton while movie list loads and we know the title,
          // then either render the poster or keep a neutral placeholder.
          const posterBoxStyle = { width: 140, height: 210, borderRadius: 8, overflow: "hidden" as const };
          return (
            <div aria-hidden="true" style={{ flex: "0 0 140px" }}>
              {posterUrl ? (
                <div style={{ ...posterBoxStyle, background: "rgba(255,255,255,0.06)" }}>
                  <img src={posterUrl} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
                </div>
              ) : isLoadingPoster ? (
                <Skeleton style={posterBoxStyle} />
              ) : (
                <div style={{ ...posterBoxStyle, background: "rgba(255,255,255,0.06)" }} />
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
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                {isArchive ? "Distribution by guess" : "Today's distribution by guess"}
              </div>
              <HistogramView
                histogram={hist}
                myReveal={reveal}
                failed={!!answer}
                labels={REVEAL_STEPS.map((_, i) => String(i + 1))}
                steps={REVEAL_STEPS}
                selectedReveal={selectedReveal ?? undefined}
                onSelect={onSelectReveal}
                emojiLabels={emojiLabels ?? undefined}
              />
              {selectedReveal === 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>❌ Failures</div>
                  <div style={{ fontSize: 14, opacity: 0.95 }}>
                    {hist.fail} players failed{isArchive ? "" : " today"}.
                  </div>
                </div>
              )}
              {selectedReveal !== null && selectedReveal !== 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: 10, lineHeight: "1.2", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Popular guesses after</span>
                    <span>{selectedRevealLabel ?? selectedReveal}</span>
                  </div>
                  {guessesLoading ? (
                    <Skeleton variant="line" size="lg" style={{ width: 180, marginBottom: 8 }} />
                  ) : topGuesses && topGuesses.length > 0 ? (
                    (() => {
                      const items = topGuesses.slice(0, 10);
                      const max = Math.max(1, ...items.map((g) => g.count));
                      return items.map((g, i) => {
                        const isSkip = g.key === "skip";
                        const match = !isSkip ? movies.find((m) => normalizeTitle(m.title) === g.key) : null;
                        const label = isSkip ? "Skipped" : match ? `${match.title}${match.year ? ` (${match.year})` : ""}` : g.key;
                        const pct = Math.round((g.count / max) * 100);
                        return (
                          <div key={g.key + i} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 14, opacity: isSkip ? 0.7 : 0.95, marginBottom: 6, fontStyle: isSkip ? "italic" : "normal" }}>
                              {i + 1}. {label}
                            </div>
                            <div aria-label={`${g.count} ${isSkip ? "skips" : "guesses"}`} style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: isSkip ? "rgba(255,255,255,0.3)" : "var(--accent)", borderRadius: 6, opacity: 0.85 }} />
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div style={{ fontSize: 14, opacity: 0.9 }}>No popular guesses yet.</div>
                  )}
                </div>
              )}
              <div style={{ opacity: 0.8, marginTop: "0.75rem" }}>
                {isArchive ? `Total players: ${total}` : `Players today: ${total}`}
              </div>
            </div>
          );
        })()
      ) : (
        // Histogram skeleton placeholder to prevent layout shift
        <div style={{ marginTop: "1.25rem" }}>
          <Skeleton variant="line" size="lg" style={{ width: 220, marginBottom: 8 }} />
          <Skeleton style={{ height: 170, borderRadius: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${REVEAL_STEPS.length + 1}, 1fr)`, gap: "10px", marginTop: 10 }}>
            {Array.from({ length: REVEAL_STEPS.length + 1 }).map((_, i) => (
              <Skeleton key={i} variant="line" style={{ height: 28, borderRadius: 6 }} />
            ))}
          </div>
        </div>
      )}
      {(() => {
        const cur = stats ? stats.currentStreak ?? 0 : 0;
        const best = stats ? stats.bestScore ?? 0 : 0;
        const bestStreak = stats ? stats.bestStreak ?? 0 : 0;
        const parts: string[] = [];
        if (cur > 0) parts.push(`Streak: ${cur}`);
        if (best > 0) parts.push(`Best score: ${best}`);
        if (bestStreak > 0 && stats && bestStreak !== (stats.currentStreak ?? 0)) parts.push(`Best streak: ${bestStreak}`);
        return parts.length > 0 ? (
          <div style={{ marginTop: "1.25rem", opacity: 0.8 }} suppressHydrationWarning>
            {parts.join(" • ")}
          </div>
        ) : null;
      })()}
      <div style={{ marginTop: "0.5rem", opacity: 0.8 }} suppressHydrationWarning>
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

      {/* Play Another Day invitation */}
      {!isArchive && onPlayArchive && (
        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            onClick={onPlayArchive}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              background: "linear-gradient(135deg, rgba(124, 77, 255, 0.15), rgba(124, 77, 255, 0.08))",
              border: "1px solid rgba(124, 77, 255, 0.3)",
              borderRadius: "12px",
              color: "var(--text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(124, 77, 255, 0.25), rgba(124, 77, 255, 0.15))";
              e.currentTarget.style.borderColor = "rgba(124, 77, 255, 0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(124, 77, 255, 0.15), rgba(124, 77, 255, 0.08))";
              e.currentTarget.style.borderColor = "rgba(124, 77, 255, 0.3)";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🎬</span>
            <span>Want more? Try an older puzzle!</span>
          </button>
        </div>
      )}

      {/* Return to today link for archive games */}
      {isArchive && onPlayArchive && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            type="button"
            onClick={onPlayArchive}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "0.875rem",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            ← Browse more puzzles
          </button>
        </div>
      )}
    </div>
  );
}
