'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronRight, Columns3, ExternalLink, Link2, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Checkbox } from './checkbox';
import { SkeletonRows } from './skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

export type Column<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Valeur de tri. Colonne triable si défini. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  /** Masquée sous md (et absente de la carte mobile). */
  hideOnMobile?: boolean;
  /** Rôle dans la carte mobile : titre, sous-titre ou ligne de détail. */
  mobile?: 'title' | 'subtitle' | 'meta' | 'trailing' | 'hidden';
  width?: string;
  /** Peut être masquée par l'utilisateur (défaut : oui, sauf la première colonne). */
  hideable?: boolean;
};

/** Action sur une ligne : menu « … » et clic droit. */
export type RowAction = {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Trait de séparation avant l'action. */
  separatorBefore?: boolean;
};

type SortState = { id: string; dir: 'asc' | 'desc' } | null;

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: React.ReactNode;
  initialSort?: SortState;
  /** Sélection multiple (actions groupées). */
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Lignes affichées par page (défaut 50). */
  pageSize?: number;
  /**
   * Écran « un écran » : le tableau occupe la hauteur restante, défile en
   * interne (en-tête collant) et pagine (25 / 50 par page) au lieu de
   * rallonger la page.
   */
  fill?: boolean;
  className?: string;
  'aria-label'?: string;
  /**
   * Identifiant stable du tableau : active le choix des colonnes visibles,
   * mémorisé sur cet appareil.
   */
  tableId?: string;
  /** Actions par ligne (menu « … » et clic droit). */
  rowActions?: (row: T) => RowAction[];
};

const COLUMNS_KEY = 'centrium-table-columns:';

function useHiddenColumns(tableId: string | undefined) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    if (!tableId) return;
    try {
      const raw = window.localStorage.getItem(COLUMNS_KEY + tableId);
      if (raw) setHidden(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* stockage indisponible : toutes les colonnes */
    }
  }, [tableId]);
  const toggle = React.useCallback(
    (id: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        if (tableId) {
          try {
            window.localStorage.setItem(COLUMNS_KEY + tableId, JSON.stringify([...next]));
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [tableId],
  );
  return [hidden, toggle] as const;
}

/**
 * Table de données : tri par colonne, sélection, pagination légère et
 * rendu en cartes sous 768 px (les tableaux larges restent lisibles sur
 * mobile). Les lignes sont des liens quand `rowHref` est fourni.
 */
export function DataTable<T>({
  rows,
  columns: columnsProp,
  getRowId,
  rowHref,
  onRowClick,
  loading,
  empty,
  initialSort = null,
  selectable,
  selected,
  onSelectedChange,
  pageSize = 50,
  fill = false,
  className,
  tableId,
  rowActions,
  ...rest
}: Props<T>) {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const router = useRouter();
  const [sort, setSort] = React.useState<SortState>(initialSort);
  const [limit, setLimit] = React.useState(pageSize);
  // Pagination du mode `fill`.
  const [page, setPage] = React.useState(0);
  const [perPage, setPerPage] = React.useState(25);
  const [hiddenCols, toggleCol] = useHiddenColumns(tableId);
  const [menuRow, setMenuRow] = React.useState<string | null>(null);
  const allColumns = columnsProp;
  const isHideable = (c: Column<T>, i: number) => c.hideable ?? i > 0;
  const columns = allColumns.filter((c, i) => !(isHideable(c, i) && hiddenCols.has(c.id)));

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), locale === 'fr' ? 'fr' : 'en', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns, locale]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const visible = fill ? sorted.slice(safePage * perPage, safePage * perPage + perPage) : sorted.slice(0, limit);
  // Nouveau filtre ou nouveau tri : retour à la première page.
  React.useEffect(() => setPage(0), [rows.length, sort, perPage]);
  const allIds = React.useMemo(() => rows.map(getRowId), [rows, getRowId]);
  const allSelected = !!selected && allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = !!selected && !allSelected && allIds.some((id) => selected.has(id));

  function toggleSort(id: string) {
    setSort((prev) =>
      prev?.id !== id ? { id, dir: 'asc' } : prev.dir === 'asc' ? { id, dir: 'desc' } : null,
    );
  }
  function toggleRow(id: string) {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }
  function toggleAll() {
    if (!onSelectedChange) return;
    onSelectedChange(allSelected ? new Set() : new Set(allIds));
  }

  if (loading) {
    return (
      <div className={cn('tile-surface overflow-hidden', className)}>
        <SkeletonRows rows={6} />
      </div>
    );
  }
  if (rows.length === 0) return <>{empty ?? null}</>;

  const titleCol = columns.find((c) => c.mobile === 'title') ?? columns[0];
  const subtitleCol = columns.find((c) => c.mobile === 'subtitle');
  const trailingCol = columns.find((c) => c.mobile === 'trailing');
  const metaCols = columns.filter((c) => c.mobile === 'meta');

  const runAction = (a: RowAction) => {
    if (a.disabled) return;
    if (a.onSelect) a.onSelect();
    else if (a.href) router.push(a.href);
  };

  return (
    <div className={cn('tile-surface overflow-hidden', fill && 'flex min-h-0 flex-1 flex-col', className)}>
      {tableId && (
        <div className="hidden items-center justify-end border-b border-border px-3 py-1.5 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Columns3 className="h-3.5 w-3.5" />
                {fr ? 'Colonnes' : 'Columns'}
                {hiddenCols.size > 0 && <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{allColumns.length - columns.length}</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{fr ? 'Colonnes affichées' : 'Visible columns'}</DropdownMenuLabel>
              {allColumns.map((c, i) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={!hiddenCols.has(c.id) || !isHideable(c, i)}
                  disabled={!isHideable(c, i)}
                  onCheckedChange={() => toggleCol(c.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {typeof c.header === 'string' ? c.header : c.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {/* Desktop / tablette */}
      <div className={cn('hidden overflow-x-auto md:block', fill && 'min-h-0 flex-1 overflow-y-auto')}>
        <table className="w-full text-sm" aria-label={rest['aria-label']}>
          <thead className={cn('bg-transparent', fill && 'sticky top-0 z-[1] bg-card shadow-[0_1px_0_hsl(var(--border))]')}>
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 px-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label={locale === 'fr' ? 'Tout sélectionner' : 'Select all'}
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.id === c.id;
                const sortable = !!c.sortValue;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'h-10 whitespace-nowrap px-3 text-[12px] font-medium text-muted-foreground',
                      c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                      c.hideOnMobile && 'hidden lg:table-cell',
                      c.headerClassName,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded hover:text-foreground',
                          active && 'text-foreground',
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th className="w-10 px-2">
                  <span className="sr-only">{fr ? 'Actions' : 'Actions'}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const id = getRowId(row);
              const href = rowHref?.(row);
              const clickable = !!href || !!onRowClick;
              const isSel = selected?.has(id) ?? false;
              return (
                <tr
                  key={id}
                  data-state={isSel ? 'selected' : undefined}
                  onContextMenu={
                    rowActions
                      ? (e) => {
                          // Clic droit : ouvre le menu d'actions de la ligne.
                          if ((e.target as HTMLElement).closest('a[href^="http"],input,textarea')) return;
                          e.preventDefault();
                          setMenuRow(id);
                        }
                      : undefined
                  }
                  onClick={(e) => {
                    // Les éléments interactifs de la ligne gardent leur propre comportement.
                    if ((e.target as HTMLElement).closest('a,button,input,[role=checkbox],[role=menuitem]')) return;
                    if (onRowClick) onRowClick(row);
                    else if (href) router.push(href);
                  }}
                  className={cn(
                    'group border-b border-border last:border-0 transition-colors hover:bg-canvas data-[state=selected]:bg-terra-blush/50',
                    clickable && 'cursor-pointer',
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={locale === 'fr' ? 'Sélectionner la ligne' : 'Select row'}
                      />
                    </td>
                  )}
                  {columns.map((c, ci) => {
                    const content = c.cell(row);
                    return (
                      <td
                        key={c.id}
                        className={cn(
                          'px-3 py-2.5 align-middle',
                          c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                          c.hideOnMobile && 'hidden lg:table-cell',
                          c.className,
                        )}
                      >
                        {href && ci === 0 ? (
                          <Link href={href} className="rounded-sm outline-none hover:text-primary-deep focus-visible:underline" prefetch={false}>
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                  {rowActions && (
                    <td className="w-10 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu open={menuRow === id} onOpenChange={(o) => setMenuRow(o ? id : null)}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={fr ? 'Actions de la ligne' : 'Row actions'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-focus group-hover:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {rowActions(row).map((a, ai) => (
                            <React.Fragment key={a.label}>
                              {a.separatorBefore && ai > 0 && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                disabled={a.disabled}
                                onSelect={() => runAction(a)}
                                className={cn(a.destructive && 'text-destructive focus:bg-danger-soft focus:text-destructive')}
                              >
                                {a.icon && <a.icon />}
                                {a.label}
                              </DropdownMenuItem>
                            </React.Fragment>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes empilées */}
      <ul className={cn('divide-y divide-border md:hidden', fill && 'min-h-0 flex-1 overflow-y-auto')}>
        {visible.map((row) => {
          const id = getRowId(row);
          const href = rowHref?.(row);
          const body = (
            <div className="flex items-start gap-3 px-4 py-3">
              {selectable && (
                <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                  <Checkbox checked={selected?.has(id) ?? false} onCheckedChange={() => toggleRow(id)} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{titleCol?.cell(row)}</div>
                {subtitleCol && <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitleCol.cell(row)}</div>}
                {metaCols.length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    {metaCols.map((c) => (
                      <div key={c.id} className="min-w-0">
                        <dt className="text-[11px] text-muted-foreground">{c.header}</dt>
                        <dd className="truncate text-xs text-foreground">{c.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {trailingCol?.cell(row)}
                {href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          );
          return (
            <li key={id} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {href ? (
                <Link href={href} prefetch={false} className="block active:bg-muted/60">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>

      {fill && sorted.length > 25 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="num">
            {safePage * perPage + 1}–{Math.min(sorted.length, (safePage + 1) * perPage)} {fr ? 'sur' : 'of'} {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              aria-label={fr ? 'Lignes par page' : 'Rows per page'}
              className="mr-2 h-7 rounded-md border border-border bg-card px-1.5 text-xs text-foreground"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-40"
              aria-label={fr ? 'Page précédente' : 'Previous page'}
            >
              ‹
            </button>
            <span className="num px-1">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-40"
              aria-label={fr ? 'Page suivante' : 'Next page'}
            >
              ›
            </button>
          </div>
        </div>
      )}
      {!fill && sorted.length > limit && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span className="num">
            {visible.length} / {sorted.length}
          </span>
          <button
            type="button"
            onClick={() => setLimit((l) => l + pageSize)}
            className="rounded-md px-2 py-1 font-medium text-primary hover:bg-brand-50"
          >
            {locale === 'fr' ? 'Afficher plus' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Actions de navigation standard d'une ligne : ouvrir, nouvel onglet, copier le lien. */
export function linkActions(href: string, fr: boolean): RowAction[] {
  return [
    { label: fr ? 'Ouvrir' : 'Open', icon: ChevronRight, href },
    {
      label: fr ? 'Ouvrir dans un nouvel onglet' : 'Open in a new tab',
      icon: ExternalLink,
      onSelect: () => window.open(href, '_blank', 'noopener'),
    },
    {
      label: fr ? 'Copier le lien' : 'Copy link',
      icon: Link2,
      onSelect: () => void navigator.clipboard?.writeText(new URL(href, window.location.origin).toString()),
    },
  ];
}
