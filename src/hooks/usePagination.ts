'use client';

import { useCallback, useEffect, useState } from 'react';

import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';

/**
 * Hook de pagination client-side.
 *
 * - `pageSize` est persisté en localStorage sous une clé fournie
 *   (pour que la préférence "20 par page" survive d'une visite à l'autre).
 * - `page` se reset automatiquement à 1 quand `total` change (typiquement
 *   après un filtre qui réduit la liste).
 * - `paginate(items)` renvoie la tranche affichée pour la page courante.
 *
 * Toute la pagination vit côté client : adapté aux listes qui tiennent
 * en mémoire (consultants, contacts, factures…). Si un jour on a 10k+
 * lignes, on basculera sur une pagination DB.
 */
export type Pagination = {
  page: number;
  pageSize: number;
  totalPages: number;
  firstShown: number;
  lastShown: number;
  setPage: (n: number) => void;
  changePageSize: (n: number) => void;
  paginate: <T>(items: T[]) => T[];
};

export function usePagination(
  total: number,
  options: { storageKey?: string; defaultPageSize?: number } = {},
): Pagination {
  const { storageKey, defaultPageSize = 20 } = options;

  const [page, setPage] = useState(1);
  // Premier rendu identique au serveur ; la préférence s'applique avant la peinture.
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  useIsoLayoutEffect(() => {
    if (!storageKey) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      const n = stored ? Number(stored) : NaN;
      if (Number.isFinite(n) && n > 0) setPageSize(n);
    } catch {
      /* stockage indisponible : taille par défaut */
    }
  }, [storageKey]);

  const changePageSize = useCallback(
    (n: number) => {
      setPageSize(n);
      setPage(1);
      if (typeof window !== 'undefined' && storageKey) {
        window.localStorage.setItem(storageKey, String(n));
      }
    },
    [storageKey],
  );

  // Garde-fou : si le total descend en dessous de la page courante (filtre
  // qui réduit la liste), on revient à la page 1.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(1);
  }, [total, pageSize, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const firstShown = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastShown = Math.min(safePage * pageSize, total);

  const paginate = useCallback(
    <T,>(items: T[]): T[] =>
      items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [safePage, pageSize],
  );

  return {
    page: safePage,
    pageSize,
    totalPages,
    firstShown,
    lastShown,
    setPage,
    changePageSize,
    paginate,
  };
}
