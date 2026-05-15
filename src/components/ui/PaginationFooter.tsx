'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { Pagination } from '@/hooks/usePagination';

type Props = {
  pagination: Pagination;
  total: number;
  /** Label en français : "profil", "facture", "contact"… */
  itemLabel: string;
  /** Pluriel optionnel — par défaut on ajoute juste un 's' */
  itemLabelPlural?: string;
  /** Choix d'items / page proposés. Défaut : 5, 10, 20, 50, 100. */
  pageSizes?: number[];
};

/**
 * Footer de pagination réutilisable.
 *
 *   [ X–Y sur Z profils ]                  [ Par page: 20 ] [ ‹ Page N / M › ]
 *
 * Caché automatiquement si `total === 0`.
 */
export function PaginationFooter({
  pagination,
  total,
  itemLabel,
  itemLabelPlural,
  pageSizes = [5, 10, 20, 50, 100],
}: Props) {
  if (total === 0) return null;
  const plural = itemLabelPlural ?? `${itemLabel}s`;
  const label = total > 1 ? plural : itemLabel;
  const { page, pageSize, totalPages, firstShown, lastShown, setPage, changePageSize } =
    pagination;

  return (
    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">
        {firstShown}–{lastShown} sur {total} {label}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-muted-foreground inline-flex items-center gap-2">
          Par page
          <Select
            value={String(pageSize)}
            onChange={(e) => changePageSize(Number(e.target.value))}
            className="h-8 w-[80px] text-xs px-2"
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-8 px-2"
            title="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2 min-w-[80px] text-center">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="h-8 px-2"
            title="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
