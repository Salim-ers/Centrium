'use client';

import { useMemo, useState } from 'react';

type Row = {
  id: string;
  organization_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_TONE: Record<string, string> = {
  created: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  updated: 'text-blue-300 bg-blue-400/10 border-blue-400/30',
  deleted: 'text-red-300 bg-red-400/10 border-red-400/30',
  archived: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  restored: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  invited: 'text-violet-300 bg-violet-400/10 border-violet-400/30',
  exported: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30',
  login: 'text-white/70 bg-white/5 border-white/10',
  logout: 'text-white/70 bg-white/5 border-white/10',
  requested: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
};

export function AuditTable({ rows }: { rows: Row[] }) {
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
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="h-9 rounded-md border border-hairline bg-card px-3 text-sm"
        >
          <option value="">Toutes les entités</option>
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
          <option value="">Toutes les actions</option>
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
            Réinitialiser
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} / {rows.length} entrées
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-hairline">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-white/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Quand</th>
              <th className="text-left px-4 py-2.5 font-medium">Entité</th>
              <th className="text-left px-4 py-2.5 font-medium">Action</th>
              <th className="text-left px-4 py-2.5 font-medium">Organisation</th>
              <th className="text-left px-4 py-2.5 font-medium">Utilisateur</th>
              <th className="text-left px-4 py-2.5 font-medium">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Aucune entrée correspondante.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const tone =
                ACTION_TONE[r.action] ?? 'text-white/70 bg-white/5 border-white/10';
              return (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 whitespace-nowrap text-white/70 font-mono text-xs">
                    {new Date(r.created_at).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-white/85">{r.entity_type}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${tone}`}
                    >
                      {r.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white/60 font-mono text-[11px]">
                    {r.organization_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2.5 text-white/60 font-mono text-[11px]">
                    {r.user_id ? r.user_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white/60 max-w-md">
                    {r.details ? (
                      <details>
                        <summary className="cursor-pointer text-magenta hover:underline text-xs">
                          Voir
                        </summary>
                        <pre className="mt-2 text-[10px] bg-black/30 p-2 rounded overflow-x-auto">
                          {JSON.stringify(r.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
