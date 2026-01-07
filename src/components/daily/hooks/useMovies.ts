import { useEffect, useState } from "react";
import type { Movie } from "../types";

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/movies")
      .then((r) => r.json())
      .then((d) => setMovies(d))
      .catch(() => setMovies([]))
      .finally(() => setLoaded(true));
  }, []);
  return { movies, loaded };
}
