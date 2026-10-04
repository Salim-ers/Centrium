'use client';

import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';

import { StatusBadge, type StatusTone, EmptyState } from '@/components/app';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export type AuditRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};
type Row = AuditRow;

const ACTION_TONE: Record<string, StatusTone> = {
  created: 'success',
  updated: 'info',
  deleted: 'danger',
  archived: 'warning',
  restored: 'success',
  invited: 'violet',
  exported: 'info',
  login: 'neutral',
  logout: 'neutral',
  requested: 'warning',
};

export function AuditTable({ rows }: { rows: Row[] }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const entityTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity_type))).sort(),
    [rows],
  );
  const actions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  const filtered = rows.filter(
    (r) =>
      (!filterEntity || r.entity_type === filterEntity) &&
      (!filterAction || r.action === filterAction),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">
          <Filter className="h-3 w-3" />
          {isEn ? 'Filters' : 'Filtres'}
        </span>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="h-9 rounded-md border border-hairline bg-card px-3 text-sm"
        >
          <option value="">{isEn ? 'All entities' : 'Toutes les entités'}</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-9 rounded-md border border-hairline bg-card px-3 text-sm"
        >
          <option value="">{isEn ? 'All actions' : 'Toutes les actions'}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {(filterEntity || filterAction) && (
          <button
            type="button"
            onClick={() => {
              setFilterEntity('');
              setFilterAction('');
            }}
            className="h-9 px-3 rounded-md border border-hairline text-xs text-muted-foreground hover:text-foreground transition"
          >
            {isEn ? 'Reset' : 'Réinitialiser'}
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} / {rows.length} {isEn ? 'entries' : 'entrées'}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Filter}
          title={isEn ? 'No matching entry' : 'Aucune entrée correspondante'}
          description={
            isEn
              ? 'No event matches the selected filters.'
              : 'Aucun événement ne correspond aux filtres sélectionnés.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full text-sm">
            <thead className="bg-card/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{isEn ? 'When' : 'Quand'}</th>
                <th className="text-left px-4 py-2.5 font-medium">{isEn ? 'Entity' : 'Entité'}</th>
                <th className="text-left px-4 py-2.5 font-medium">Action</th>
                <th className="text-left px-4 py-2.5 font-medium">{isEn ? 'Organization' : 'Organisation'}</th>
                <th className="text-left px-4 py-2.5 font-medium">{isEn ? 'User' : 'Utilisateur'}</th>
                <th className="text-left px-4 py-2.5 font-medium">{isEn ? 'Details' : 'Détails'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((r) => {
                const tone = ACTION_TONE[r.action] ?? 'neutral';
                return (
                  <tr key={r.id} className="hover-surface">
                    <td className="px-4 py-2.5 whitespace-nowrap text-foreground/80 font-mono text-xs">
                      {new Date(r.created_at).toLocaleString(isEn ? 'en-US' : 'fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/90">{r.entity_type}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone={tone} dot={false}>
                        {r.action}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                      {r.organization_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                      {r.user_id ? r.user_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-md">
                      {r.details ? (
                        <details>
                          <summary className="cursor-pointer text-primary hover:underline text-xs">
                            {isEn ? 'View' : 'Voir'}
                          </summary>
                          <pre className="mt-2 text-[10px] bg-muted/80 p-2 rounded overflow-x-auto text-foreground/80">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
