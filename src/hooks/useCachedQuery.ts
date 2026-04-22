'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CacheEntry<T> = { data: T; ts: number };

const STORAGE_PREFIX = 'qc_cache:';
const DEFAULT_TTL_MS = 5 * 60_000;

function readCache<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>),
    );
  } catch {
    // quota, private mode — silent
  }
}

export type UseCachedQueryResult<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | null) => T)) => void;
};

/**
 * Stale-while-revalidate client-side fetch with sessionStorage cache.
 *
 * - Hydrates instantly from cache if present → `loading` starts false, page never blank on return.
 * - Refetches in background → `refreshing` toggles true during that.
 * - Enabled=false skips the fetch (useful while a dependency isn't ready yet).
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean; ttlMs?: number } = {},
): UseCachedQueryResult<T> {
  const { enabled = true, ttlMs = DEFAULT_TTL_MS } = options;

  const cached = enabled ? readCache<T>(key) : null;
  const [data, setDataState] = useState<T | null>(cached?.data ?? null);
  const [loading, setLoading] = useState<boolean>(enabled && !cached);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (!enabled) return;
    const existing = readCache<T>(key);
    if (existing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const fresh = await fetcherRef.current();
      setDataState(fresh);
      writeCache(key, fresh);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) return;
    const existing = readCache<T>(key);
    if (!existing || Date.now() - existing.ts > ttlMs) {
      run();
    }
  }, [enabled, key, ttlMs, run]);

  const setData = useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      setDataState((prev) => {
        const next =
          typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater;
        writeCache(key, next);
        return next;
      });
    },
    [key],
  );

  return { data, loading, refreshing, error, reload: run, setData };
}
