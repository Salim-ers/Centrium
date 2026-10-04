'use client';

import Link from 'next/link';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORICAL, tooltipStyle } from './theme';
import { formatEur, formatEurCompact, formatPct } from '@/lib/format';

/**
 * Répartition du CA par client : anneau + légende chiffrée. Les clients
 * au-delà du 5e sont regroupés. Le poids du premier client mesure la
 * concentration du CA.
 */
export default function ClientShareChart({
  clients,
  lang,
}: {
  clients: Array<{ id: string; name: string; revenue: number }>;
  lang: 'fr' | 'en';
}) {
  const fr = lang === 'fr';
  const total = clients.reduce((s, c) => s + c.revenue, 0);
  const top = clients.slice(0, 5);
  const others = clients.slice(5).reduce((s, c) => s + c.revenue, 0);
  const rows = [
    ...top.map((c, i) => ({ ...c, color: CATEGORICAL[i % CATEGORICAL.length]! })),
    ...(others > 0 ? [{ id: 'others', name: fr ? 'Autres clients' : 'Other clients', revenue: others, color: '#DDCDC0' }] : []),
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto h-40 w-40 shrink-0" role="img" aria-label={fr ? 'Répartition du CA par client' : 'Revenue by client'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="revenue" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={1.5} stroke="none">
              {rows.map((r) => (
                <Cell key={r.id} fill={r.color} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [formatEur(v, lang), n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="num font-display text-base font-semibold text-foreground">{formatEurCompact(total, lang)}</span>
          <span className="text-[11px] text-muted-foreground">{fr ? '12 mois' : '12 months'}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-[13px]">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
            {r.id === 'others' ? (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.name}</span>
            ) : (
              <Link href={`/clients/${r.id}`} className="min-w-0 flex-1 truncate text-foreground hover:text-primary-deep">
                {r.name}
              </Link>
            )}
            <span className="num shrink-0 text-xs text-muted-foreground">{formatPct(total ? (r.revenue / total) * 100 : 0, lang, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
