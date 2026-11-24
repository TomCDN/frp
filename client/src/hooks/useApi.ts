import { useCallback, useEffect, useRef, useState } from 'react';

/** Wraps an async loader with loading/error state and a manual refresh function. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // The loader may depend on data that is not available yet (for example a
    // stage id that comes from the show). Skip the call until the dependency
    // is known instead of firing with `undefined`.
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await loaderRef.current();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Er ging iets mis');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}

/**
 * Like `useAsync`, but waits for a required dependency (for example a stage id
 * that is only known after the show has loaded) before calling the loader.
 */
export function useAsyncWhen<T>(
  loader: () => Promise<T>,
  ready: boolean,
  deps: unknown[] = [],
) {
  const state = useAsync<T | null>(
    async () => (ready ? loader() : null),
    [ready, ...deps],
  );
  return { ...state, data: state.data as T | null };
}

/** Debounces a rapidly changing value (search inputs, autosave). */
export function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Persists a value in localStorage (used for operator device identity). */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage may be unavailable (private mode) - ignore.
      }
    },
    [key],
  );

  return [value, set];
}
