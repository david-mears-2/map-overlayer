import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { activeProvider } from "../api";
import type { HeatLayer, LatLngPoint } from "../types";
import { LONDON_BBOX } from "../types";
import { DataContext } from "./useDataContext";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";

const DEBOUNCE_MS = 150;

/**
 * Fetches point data for all enabled heatmap layers in a single batched
 * Overpass query and distributes results to consumers via context.
 *
 * Fetched data is cached by category — toggling a layer off and back on
 * serves cached points instantly without a network request.
 */
export function DataProvider({
  layers,
  children,
}: {
  layers: HeatLayer[];
  children: React.ReactNode;
}) {
  const [cache, setCache] = useState<Map<string, LatLngPoint[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const enabledCategories = useMemo(
    () => layers.filter((l) => l.enabled).map((l) => l.category),
    [layers]
  );

  // The cache check lives *inside* the debounced callback so it reads
  // the latest cache at fire time, not at queue time. This is safe because
  // useDebouncedCallback always calls the most recent version of this
  // function (with its latest closure), even if `cache` has changed since
  // the call was queued.
  const debouncedFetchRef = useDebouncedCallback(
    (categories: string[]) => {
      const uncached = categories.filter((c) => !cache.has(c));
      if (uncached.length === 0) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      activeProvider
        .fetchMultipleCategories(uncached, LONDON_BBOX, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setCache((prev) => {
            const next = new Map(prev);
            for (const [category, points] of result) {
              next.set(category, points);
            }
            return next;
          });
          setLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err.message);
          setLoading(false);
        });
    },
    DEBOUNCE_MS
  );

  useEffect(() => {
    const debouncedFetch = debouncedFetchRef.current;
    debouncedFetch?.(enabledCategories);
    return () => debouncedFetch?.cancel();
  }, [enabledCategories, debouncedFetchRef]);

  useEffect(() => {
    const abort = abortRef;
    return () => {
      abort.current?.abort();
    };
  }, []);

  const getPoints = useCallback(
    (category: string): LatLngPoint[] => cache.get(category) ?? [],
    [cache]
  );

  const value = useMemo(
    () => ({ getPoints, loading, error }),
    [getPoints, loading, error]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
