/* eslint-disable @next/next/no-img-element */
import type { RefObject } from "react";
import { normalizeTitle } from "@/lib/normalize";
import { REVEAL_STEPS, revealIndexForCount } from "@/lib/reveal";
import type { DailyStats } from "@/lib/stats";
import { HistogramView } from "./HistogramView";
import type { Histogram, Movie, TopGuess } from "./types";

function formatCountdown(ms: number) {
  const total = Math.max(0, ms);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function splitTitle(full: string | null) {
  if (!full) return { name: null, year: null };
  const m = full.match(/^(.*) \((\d{4})\)$/);
  return m ? { name: m[1], year: m[2] } : { name: full, year: null };
}

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
  stats: DailyStats | null;
  remainingMs: number | null;
  resultRef: RefObject<HTMLDivElement>;
  clues: string[];
  isArchive?: boolean;
  onPlayArchive?: () => void;
}) {
  const failed = !!answer;
  const guessNo = revealIndexForCount(reveal) + 1;
  const finalScore = score ?? 0;
  const loadingAnswer = answer === "Loading answer...";
  const { name, year } = splitTitle(loadingAnswer ? null : solutionTitle);
  const answerKey = name ? normalizeTitle(name) : null;
  const when = isArchive ? "" : " today";

  const emojiLabels =
    clues.length > 0
      ? REVEAL_STEPS.map((end, i) => clues.slice(i === 0 ? 0 : REVEAL_STEPS[i - 1], end).join(""))
      : undefined;

  const total = hist ? hist.solves.reduce((a, b) => a + Number(b || 0), 0) + Number(hist.fail || 0) : 0;
  const selectedGuess = selectedReveal && selectedReveal > 0 ? revealIndexForCount(selectedReveal) + 1 : null;

  return (
    <div className="results" tabIndex={-1} ref={resultRef} role="region" aria-label="Your result">
      <section className="panel" aria-labelledby="result-heading">
        <div className="panel-head">
          <h2 id="result-heading">Your result</h2>
          {isArchive ? <span className="panel-meta">Archive</span> : null}
        </div>

        <div className={`film${posterUrl ? "" : " no-poster"}`}>
          {posterUrl ? (
            <div className="poster" aria-hidden="true">
              <img src={posterUrl} alt="" />
            </div>
          ) : null}
          <div>
            <p className="film-title" aria-live="polite">
              {name ?? (failed ? "Loading the answer…" : "")}
              {year ? <span className="film-year"> {year}</span> : null}
            </p>
            <p className="film-verdict">
              {failed
                ? `Not this time. All ${REVEAL_STEPS.length} guesses used.`
                : `Solved on guess ${guessNo} of ${REVEAL_STEPS.length}, with ${Math.min(reveal, 10)} of 10 frames showing.`}
            </p>
          </div>
        </div>

        <dl className="figures">
          <div className="figure is-lead">
            <dt>Score</dt>
            <dd>
              {finalScore}
              <small>/ 10</small>
            </dd>
          </div>
          <div className="figure">
            <dt>Better than</dt>
            <dd>
              {percentile !== null ? `${percentile}%` : "–"}
              <small>of players{when}</small>
            </dd>
          </div>
          <div className="figure" suppressHydrationWarning>
            <dt>Current streak</dt>
            <dd>
              {stats?.currentStreak ?? 0}
              <small>{(stats?.currentStreak ?? 0) === 1 ? "day" : "days"}</small>
            </dd>
          </div>
          <div className="figure" suppressHydrationWarning>
            <dt>Best streak</dt>
            <dd>
              {stats?.bestStreak ?? 0}
              <small>{(stats?.bestStreak ?? 0) === 1 ? "day" : "days"}</small>
            </dd>
          </div>
        </dl>

        <div className="panel-foot">
          {remainingMs !== null ? (
            <p className="countdown" suppressHydrationWarning>
              Next film in <strong>{formatCountdown(remainingMs)}</strong>
            </p>
          ) : null}
          {onPlayArchive ? (
            <button type="button" className="btn btn-quiet btn-wide" onClick={onPlayArchive}>
              {isArchive ? "Choose another day" : "Play an earlier day"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel" aria-labelledby="dist-heading">
        <div className="panel-head">
          <h2 id="dist-heading">How everyone did{when}</h2>
          {hist ? <span className="panel-meta num">
              {total} {total === 1 ? "player" : "players"}
            </span> : null}
        </div>

        {!hist ? (
          <div className="skeleton" style={{ height: 210 }} aria-hidden="true" />
        ) : total === 0 ? (
          <p className="popular-empty">No results yet. You are the first to finish.</p>
        ) : (
          <>
            <HistogramView
              histogram={hist}
              myReveal={reveal}
              failed={failed}
              steps={REVEAL_STEPS}
              selectedReveal={selectedReveal ?? undefined}
              onSelect={onSelectReveal}
              emojiLabels={emojiLabels}
            />

            <div className="popular" aria-live="polite">
              {selectedReveal === 0 ? (
                <h3>
                  {hist.fail} {hist.fail === 1 ? "player" : "players"} missed it{when}
                </h3>
              ) : selectedGuess ? (
                <>
                  <h3>Most common answers on guess {selectedGuess}</h3>
                  {guessesLoading ? (
                    <div className="skeleton" style={{ height: 96 }} aria-hidden="true" />
                  ) : topGuesses && topGuesses.length > 0 ? (
                    <ol className="popular-list">
                      {(() => {
                        const items = topGuesses.slice(0, 6);
                        const max = Math.max(1, ...items.map((g) => g.count));
                        return items.map((g) => {
                          const isSkip = g.key === "skip";
                          const match = isSkip ? null : movies.find((m) => normalizeTitle(m.title) === g.key);
                          const label = isSkip ? "Skipped" : match ? match.title : g.key;
                          return (
                            <li
                              key={g.key}
                              className={`popular-row${g.key === answerKey ? " is-answer" : ""}`}
                            >
                              <span className={`popular-name${isSkip ? " is-skip" : ""}`}>{label}</span>
                              <span className="popular-count">{g.count}</span>
                              <span className="popular-track" aria-hidden="true">
                                <span className="popular-fill" style={{ display: "block", width: `${(g.count / max) * 100}%` }} />
                              </span>
                            </li>
                          );
                        });
                      })()}
                    </ol>
                  ) : (
                    <p className="popular-empty">Nobody has guessed at this point yet.</p>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
