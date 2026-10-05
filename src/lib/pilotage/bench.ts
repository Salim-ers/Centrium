// =========================================================================
// Intercontrat : consultants de l'effectif sans mission aujourd'hui (même
// définition que l'occupation), depuis quand, ce que cela coûte quand le
// CJM est connu, et combien d'opportunités ouvertes leur correspondent.
// =========================================================================

import { businessDaysBetween } from '@/lib/utils/business-days';
import { activeConsultants, iso, type ConsultantLite, type MissionLite } from './metrics';

type BenchConsultant = ConsultantLite & { first_name: string; last_name: string; job_title?: string | null };

export type BenchPerson = {
  id: string;
  name: string;
  title: string | null;
  /** Premier jour d'intercontrat (lendemain de la dernière mission, sinon date de disponibilité). */
  since: string | null;
  days: number | null;
  /** CJM × jours ouvrés d'intercontrat, si le CJM est connu. */
  cost: number | null;
  /** Opportunités ouvertes pour lesquelles le profil ressort (moteur de matching). */
  matches: number;
};

export type BenchSummary = {
  count: number;
  avgDays: number | null;
  estimatedCost: number | null;
  /** Nombre de consultants dont le coût est connu (le coût estimé ne couvre qu'eux). */
  costKnown: number;
  people: BenchPerson[];
  compatibleOpportunities: number;
};

const DAY = 86_400_000;
const parse = (d: string) => new Date(d + 'T00:00:00');
const nextDay = (d: string) => {
  const x = parse(d);
  x.setDate(x.getDate() + 1);
  return iso(x);
};

/** Consultants de l'effectif sans mission couvrant aujourd'hui, et depuis quand. */
export function benchRows<C extends BenchConsultant>(consultants: C[], missions: MissionLite[], today: Date): Array<{ consultant: C; since: string | null }> {
  const t = iso(today);
  const worked = missions.filter((m) => m.status === 'active' || m.status === 'ended');
  const covering = new Set(worked.filter((m) => m.start_date <= t && (!m.end_date || m.end_date >= t)).map((m) => m.consultant_id));
  return activeConsultants(consultants)
    .filter((c) => c.status !== 'unavailable' && !covering.has(c.id))
    .map((c) => {
      const lastEnd =
        worked
          .filter((m) => m.consultant_id === c.id && m.end_date && m.end_date < t)
          .map((m) => m.end_date!)
          .sort()
          .at(-1) ?? null;
      const since = lastEnd ? nextDay(lastEnd) : c.available_from && c.available_from <= t ? c.available_from : null;
      return { consultant: c, since };
    });
}

export function summarizeBench<C extends BenchConsultant>(
  rows: Array<{ consultant: C; since: string | null }>,
  opts: { today: Date; costOf?: (consultantId: string) => number | null; matches?: Map<string, number>; compatibleOpportunities?: number; limit?: number },
): BenchSummary {
  const t = parse(iso(opts.today));
  const people: BenchPerson[] = rows
    .map(({ consultant: c, since }) => {
      const cjm = opts.costOf?.(c.id) ?? null;
      return {
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
        title: c.job_title ?? null,
        since,
        days: since ? Math.max(0, Math.round((t.getTime() - parse(since).getTime()) / DAY)) : null,
        cost: cjm != null && since ? Math.round(cjm * businessDaysBetween(since, opts.today)) : null,
        matches: opts.matches?.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
  const dated = people.filter((p) => p.days != null);
  const costed = people.filter((p) => p.cost != null);
  return {
    count: people.length,
    avgDays: dated.length ? Math.round(dated.reduce((s, p) => s + p.days!, 0) / dated.length) : null,
    estimatedCost: costed.length ? costed.reduce((s, p) => s + p.cost!, 0) : null,
    costKnown: costed.length,
    people: people.slice(0, opts.limit ?? 6),
    compatibleOpportunities: opts.compatibleOpportunities ?? 0,
  };
}
