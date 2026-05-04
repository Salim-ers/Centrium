'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CacheEntry<T> = { data: T; ts: number };

const STORAGE_PREFIX = 'qc_cache:';

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

/** Décide si une réponse "vide" doit être ignorée pour ne pas écraser
 *  un cache précédemment plein (cas typique : token refresh transitoire
 *  qui fait que RLS retourne 0 ligne sans erreur formelle). */
function isSuspiciousEmpty(prev: unknown, next: unknown): boolean {
  if (prev == null) return false;
  if (Array.isArray(next) && next.length === 0) {
    return Array.isArray(prev) && prev.length > 0;
  }
  return false;
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
 * - Stale-on-error : si le fetcher throw, on garde la donnée cachée
 *   plutôt que de virer l'écran. L'utilisateur voit toujours qqch.
 * - Stale-on-empty : si le fetcher renvoie un tableau vide alors que
 *   le cache était non-vide, on suspecte un glitch transitoire (auth
 *   token, RLS race). On ne touche pas au cache, on garde l'affichage
 *   et on retry une fois après 1.5s. 2 réponses vides consécutives →
 *   on accepte enfin que la liste est vraiment vide.
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean; ttlMs?: number } = {},
): UseCachedQueryResult<T> {
  const { enabled = true } = options;

  const cached = enabled ? readCache<T>(key) : null;
  const [data, setDataState] = useState<T | null>(cached?.data ?? null);
  const [loading, setLoading] = useState<boolean>(enabled && !cached);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Compteur de réponses "suspectes" (vides après un cache plein).
  // Reset à chaque réponse non-vide ou changement de clé.
  const suspiciousEmptyCountRef = useRef(0);

  const run = useCallback(
    async (): Promise<void> => {
      if (!enabled) return;
      const existing = readCache<T>(key);
      if (existing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const fresh = await fetcherRef.current();
        const prev = existing?.data ?? null;
        if (isSuspiciousEmpty(prev, fresh)) {
          suspiciousEmptyCountRef.current += 1;
          if (suspiciousEmptyCountRef.current < 2) {
            // 1re réponse vide après cache plein : on suspecte un glitch
            // transitoire (auth/RLS). On garde le cache et on retry
            // après 1.5s. Si la 2e tentative est aussi vide, on accepte.
            console.warn(
              `[useCachedQuery] empty result for key=${key} but cache had data — keeping stale, retrying`,
            );
            setRefreshing(false);
            setLoading(false);
            setTimeout(() => void run(), 1500);
            return;
          }
        }
        suspiciousEmptyCountRef.current = 0;
        setDataState(fresh);
        writeCache(key, fresh);
        setError(null);
      } catch (e) {
        // Stale-on-error : on garde la donnée affichée, on signale
        // l'erreur mais on ne vide pas l'écran.
        console.warn(`[useCachedQuery] fetch failed for key=${key}`, e);
        setError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, key],
  );

  useEffect(() => {
    if (!enabled) return;
    suspiciousEmptyCountRef.current = 0;
    // Toujours refetch au mount : le cache sert à afficher instantanément
    // le dernier snapshot, mais la donnée doit être fraîche à chaque visite
    // sinon les updates faites par un autre compte n'apparaissent pas.
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  // Refetch au retour sur l'onglet si la donnée est "trop vieille". Sans ça,
  // après une longue idle, le composant reste affiché avec des données
  // périmées (et parfois vides si le JWT avait expiré au moment du dernier
  // fetch). Seuil 60s pour éviter le spam.
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const last = readCache<T>(key);
      if (last && Date.now() - last.ts < 60_000) return;
      run();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled, key, run]);

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
