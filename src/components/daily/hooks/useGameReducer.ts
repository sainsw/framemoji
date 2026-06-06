"use client";

import { useReducer } from "react";
import { REVEAL_STEPS, revealStepForCount } from "@/lib/reveal";
import type { DailyMeta, Histogram, TopGuess } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

export type GameStatus = "idle" | "correct" | "wrong" | "finished";

export type GameState = {
  meta: DailyMeta | null;
  metaLoaded: boolean;
  status: GameStatus;
  reveal: number;
  score: number | null;
  percentile: number | null;
  answer: string | null;
  finalTitle: string | null;
  hist: Histogram | null;
  selectedReveal: number | null;
  topGuesses: TopGuess[] | null;
  guessesLoading: boolean;
  hasGuessed: boolean;
  wrongGuesses: string[];
  wrongMsg: string | null;
  skips: number;
};

export const initialGameState: GameState = {
  meta: null,
  metaLoaded: false,
  status: "idle",
  reveal: REVEAL_STEPS[0],
  score: null,
  percentile: null,
  answer: null,
  finalTitle: null,
  hist: null,
  selectedReveal: null,
  topGuesses: null,
  guessesLoading: false,
  hasGuessed: false,
  wrongGuesses: [],
  wrongMsg: null,
  skips: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; meta: DailyMeta }
  | { type: "LOAD_ERROR" }
  | {
      type: "RESTORE_FINISHED";
      reveal: number;
      score: number;
      percentile: number | null;
      answer: string | null;
      finalTitle: string | null;
    }
  | { type: "GUESS_WRONG"; revealed: number; wrongMsg: string; guess: string }
  | { type: "SKIP"; revealed: number }
  | {
      type: "FINISH_WIN";
      score: number;
      revealed: number;
      finalTitle: string;
    }
  | { type: "FINISH_LOSE"; revealed: number }
  | { type: "SET_PERCENTILE"; percentile: number }
  | { type: "SET_HISTOGRAM"; hist: Histogram }
  | { type: "SET_ANSWER"; answer: string }
  | { type: "OPEN_REVEAL"; reveal: number }
  | { type: "SET_TOP_GUESSES"; items: TopGuess[] }
  | { type: "CLEAR_GUESS" };

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...initialGameState,
        metaLoaded: false,
      };

    case "LOAD_SUCCESS":
      return {
        ...state,
        meta: action.meta,
        metaLoaded: true,
        status: "idle",
        reveal: REVEAL_STEPS[0],
      };

    case "LOAD_ERROR":
      return {
        ...state,
        metaLoaded: true,
      };

    case "RESTORE_FINISHED":
      return {
        ...state,
        status: "finished",
        reveal: revealStepForCount(action.reveal),
        score: action.score,
        percentile: action.percentile,
        answer: action.answer,
        finalTitle: action.finalTitle,
      };

    case "GUESS_WRONG":
      return {
        ...state,
        status: "wrong",
        reveal: action.revealed,
        wrongMsg: action.wrongMsg,
        wrongGuesses: [...state.wrongGuesses, action.guess],
        hasGuessed: true,
        finalTitle: null,
      };

    case "SKIP":
      return {
        ...state,
        status: "wrong",
        reveal: action.revealed,
        wrongMsg: "Skipped. More clues revealed.",
        skips: state.skips + 1,
        hasGuessed: true,
      };

    case "FINISH_WIN":
      return {
        ...state,
        status: "finished",
        score: action.score,
        reveal: action.revealed,
        finalTitle: action.finalTitle,
        hasGuessed: true,
      };

    case "FINISH_LOSE":
      return {
        ...state,
        status: "finished",
        reveal: action.revealed,
        score: 0,
        answer: "Loading answer...",
        hasGuessed: true,
      };

    case "SET_PERCENTILE":
      return {
        ...state,
        percentile: action.percentile,
      };

    case "SET_HISTOGRAM":
      return {
        ...state,
        hist: action.hist,
      };

    case "SET_ANSWER":
      return {
        ...state,
        answer: action.answer,
      };

    case "OPEN_REVEAL":
      if (action.reveal === 0) {
        return {
          ...state,
          selectedReveal: 0,
          topGuesses: null,
        };
      }
      return {
        ...state,
        selectedReveal: revealStepForCount(action.reveal),
        guessesLoading: true,
        topGuesses: null,
      };

    case "SET_TOP_GUESSES":
      return {
        ...state,
        topGuesses: action.items,
        guessesLoading: false,
      };

    case "CLEAR_GUESS":
      return {
        ...state,
        status: state.status === "wrong" ? "idle" : state.status,
      };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useGameReducer() {
  return useReducer(gameReducer, initialGameState);
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrong message helper
// ─────────────────────────────────────────────────────────────────────────────

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

export function getRandomWrongMessage(): string {
  return WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]!;
}
