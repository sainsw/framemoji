import { useCallback, useState } from "react";
import type { Movie } from "../types";

// Singleton cache to avoid re-fetching across component instances
let cachedMovies: Movie[] | null = null;
let fetchPromise: Promise<Movie[]> | null = null;

async function fetchMovies(): Promise<Movie[]> {
  if (cachedMovies) return cachedMovies;
  if (fetchPromise) return fetchPromise;
  
  fetchPromise = fetch("/api/movies")
    .then((r) => r.json())
    .then((d: Movie[]) => {
      cachedMovies = d;
      return d;
    })
    .catch(() => {
      cachedMovies = [];
      return [];
    })
    .finally(() => {
      fetchPromise = null;
    });
  
  return fetchPromise;
}

/**
 * Lazy-loading movies hook.
 * Movies are only fetched when `triggerLoad()` is called.
 * This defers the large movies.json download until actually needed.
 */
export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>(cachedMovies ?? []);
  const [loaded, setLoaded] = useState(!!cachedMovies);
  const [loading, setLoading] = useState(false);

  const triggerLoad = useCallback(() => {
    if (cachedMovies) {
      // Already cached, just use it
      setMovies(cachedMovies);
      setLoaded(true);
      return;
    }
    if (loading) return; // Already loading
    
    setLoading(true);
    fetchMovies()
      .then((data) => {
        setMovies(data);
        setLoaded(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loading]);

  return { movies, loaded, loading, triggerLoad };
}
