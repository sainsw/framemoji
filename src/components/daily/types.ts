export type DailyMeta = {
  day: string;
  isToday?: boolean;
  puzzle: { id: number; year?: number; emoji_clues: string[] };
  answer?: string; // present in dev mode
  dev?: boolean;
  error?: string; // present on error responses
};

export type AvailableDatesResp = {
  today: string;
  dates: string[];
};

export type GuessResp = { correct: boolean; revealed: number; score: number };

export type Histogram = { solves: number[]; fail: number };

export type FinishResp = {
  percentile: number;
  total: number;
  histogram: Histogram;
  answer?: string;
  id: number;
};

export type Movie = {
  id: number;
  title: string;
  year?: number;
  popularity?: number;
  vote_count?: number;
  vote_average?: number;
  revenue?: number;
  poster_path?: string | null;
};

export type TopGuess = { key: string; count: number };
