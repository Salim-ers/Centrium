// =========================================================================
// Détecteurs V2 du moteur d'alertes (fonctions pures, testées) :
//   - CRA soumis qui attendent une validation ;
//   - consultants disponibles (ou bientôt) compatibles avec des
//     opportunités ouvertes (même moteur de scoring que l'écran Matching,
//     aucune compétence déduite).
// =========================================================================

import type { ConsultantSkill } from '@/types';
import type { AlertCandidate } from './detectors';
import { rankConsultants, type MatchingConsultant } from '@/lib/matching/rank';
import type { ProfileEvidence } from '@/lib/matching/needs';
import { hasSkills, opportunityToOffer, type OppLike } from '@/lib/matching/opportunity-offer';

const DAY = 86_400_000;
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export type SubmittedTimesheetRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  period_month: number;
  period_year: number;
  consultant_id: string | null;
};

/** CRA soumis depuis plus de `graceDays` jours et toujours non validés. */
export function detectTimesheetsToValidate(
  timesheets: SubmittedTimesheetRow[],
  consultantNames: Map<string, string>,
  today: Date = new Date(),
  graceDays = 1,
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const t of timesheets) {
    if (t.status !== 'submitted' || !t.submitted_at) continue;
    const age = Math.floor((today.getTime() - new Date(t.submitted_at).getTime()) / DAY);
    if (age < graceDays) continue;
    const name = t.consultant_id ? (consultantNames.get(t.consultant_id) ?? 'un consultant') : 'un consultant';
    out.push({
      dedupe_key: `timesheet-validate:${t.id}`,
      kind: 'timesheet_pending',
      priority: age >= 7 ? 'high' : 'medium',
      title: `CRA de ${MONTHS[t.period_month - 1] ?? t.period_month} ${t.period_year} à valider — ${name}`,
      description: `Soumis il y a ${age} jour${age > 1 ? 's' : ''}. La validation alimente le CA réalisé et la préfacturation.`,
      link: '/timesheets',
      entity_kind: 'timesheet',
      entity_id: t.id,
      consultant_id: t.consultant_id,
      notify: 'org',
    });
  }
  return out;
}

export type MatchConsultantRow = MatchingConsultant & { owner_id?: string | null };
export type MatchOpportunityRow = OppLike & { status: string; archived?: boolean | null };

const CLOSED = new Set(['won', 'lost', 'on_hold']);

/** Disponible maintenant ou dans les 30 jours. */
function availableSoon(c: MatchConsultantRow, today: Date): boolean {
  if (c.is_prospect || c.status === 'archived' || c.status === 'unavailable') return false;
  const horizon = today.getTime() + 30 * DAY;
  if (c.status === 'available') return true;
  if (c.available_from && new Date(c.available_from).getTime() <= horizon) return true;
  if (c.current_mission_end && new Date(c.current_mission_end).getTime() <= horizon) return true;
  return false;
}

/**
 * Une alerte par consultant disponible (ou bientôt) qui correspond à au
 * moins une opportunité ouverte avec un score ≥ `minScore`. La clé change
 * quand la liste des opportunités compatibles change (nouvelle alerte).
 */
export function detectConsultantMatches(
  consultants: MatchConsultantRow[],
  opportunities: MatchOpportunityRow[],
  skillsByConsultant: Map<string, ConsultantSkill[]>,
  today: Date = new Date(),
  minScore = 75,
  /** Expériences, missions, certifications : même score que dans l'interface. */
  evidence?: Map<string, ProfileEvidence>,
): AlertCandidate[] {
  const pool = consultants.filter((c) => availableSoon(c, today));
  if (!pool.length) return [];
  const byConsultant = new Map<string, Array<{ opp: MatchOpportunityRow; score: number }>>();
  for (const o of opportunities) {
    if (CLOSED.has(o.status) || o.archived || !hasSkills(o)) continue;
    const ranked = rankConsultants(opportunityToOffer(o), pool, skillsByConsultant, { limit: 5, minScore, evidence, today: today.toISOString().slice(0, 10) });
    for (const r of ranked) {
      const list = byConsultant.get(r.consultant.id) ?? [];
      list.push({ opp: o, score: Math.round(r.breakdown.score) });
      byConsultant.set(r.consultant.id, list);
    }
  }
  const out: AlertCandidate[] = [];
  for (const c of pool) {
    const matches = (byConsultant.get(c.id) ?? []).sort((a, b) => b.score - a.score);
    if (!matches.length) continue;
    const ids = matches.map((m) => m.opp.id).sort();
    const best = matches[0]!;
    out.push({
      dedupe_key: `consultant-match:${c.id}:${ids.map((id) => id.slice(0, 8)).join('-')}`,
      kind: 'consultant_available',
      priority: best.score >= 85 ? 'high' : 'medium',
      title: `${c.first_name} ${c.last_name} correspond à ${matches.length} opportunité${matches.length > 1 ? 's' : ''} ouverte${matches.length > 1 ? 's' : ''}`,
      description: matches
        .slice(0, 3)
        .map((m) => `${m.opp.title} (${m.score})`)
        .join(' · '),
      link: `/opportunities/${best.opp.id}`,
      entity_kind: 'consultant',
      entity_id: c.id,
      consultant_id: c.id,
      notify: 'org',
      assignee_id: c.owner_id ?? null,
    });
  }
  return out;
}
