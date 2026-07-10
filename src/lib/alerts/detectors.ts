// =========================================================================
// Détecteurs d'alertes — logique pure (testable sans DB)
// -------------------------------------------------------------------------
// Chaque détecteur reçoit des données déjà chargées et retourne des
// AlertCandidate. Le moteur (engine.ts) les upsert dans la table `alerts`
// avec `dedupe_key` unique → jamais deux alertes actives identiques, et
// auto-résolution quand la condition disparaît.
//
// NE PAS dupliquer ici les alertes déjà calculées en live par la RPC
// compute_org_alerts (facture en retard/à échoir, CRA soumis/draft période
// close, mission qui se termine, consultant dispo) — elles existent déjà.
// Ici : les détections « processus » qui nécessitent relances + cycle de vie.
// =========================================================================

import type { AlertPriority, AlertType, ContractType } from '@/types';
import {
  computeCompleteness,
  resolveDocRequirements,
  type ConsultantDocForCompleteness,
  type ConsultantForCompleteness,
} from './completeness';
import type { OrgNotificationSettings } from './config';

export type AlertCandidate = {
  dedupe_key: string;
  kind: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  link: string;
  entity_kind: string;
  entity_id: string | null;
  consultant_id?: string | null;
  due_date?: string | null;
  /** Audience des notifications sortantes. */
  notify: 'org' | 'consultant' | 'both';
};

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function daysUntil(dateIso: string, today: Date): number {
  const d = new Date(dateIso + 'T00:00:00Z');
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((d.getTime() - t) / 86_400_000);
}

// ── 1. Profil consultant incomplet ────────────────────────────────────────
export type ConsultantRow = ConsultantForCompleteness & {
  id: string;
  archived: boolean | null;
  is_prospect: boolean;
};

export function detectIncompleteProfiles(
  consultants: ConsultantRow[],
  documentsByConsultant: Map<string, ConsultantDocForCompleteness[]>,
  orgDocRequirements: Array<{
    contract_type: string | null;
    kind: string;
    label: string;
    required: boolean;
    active: boolean;
  }> | null,
  today: Date = new Date(),
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const c of consultants) {
    if (c.archived || c.is_prospect) continue; // prospects : pas d'exigence KYC
    const reqs = resolveDocRequirements(c.contract_type as ContractType | null, orgDocRequirements);
    const res = computeCompleteness(c, documentsByConsultant.get(c.id) ?? [], reqs, today);
    if (res.complete) continue;

    const missing = [
      ...res.missingFields.map((f) => f.label),
      ...res.missingDocuments.map((d) => d.label),
    ];
    out.push({
      dedupe_key: `profile-incomplete:${c.id}`,
      kind: 'profile_incomplete',
      priority: res.percent < 50 ? 'high' : 'medium',
      title: `Profil de ${c.first_name ?? ''} ${c.last_name ?? ''} incomplet (${res.percent} %)`.trim(),
      description: `Manquant : ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? `… (+${missing.length - 6})` : ''}`,
      link: `/consultants/${c.id}`,
      entity_kind: 'consultant',
      entity_id: c.id,
      consultant_id: c.id,
      notify: 'both',
    });
  }
  return out;
}

// ── 2. Documents expirés / expirant ───────────────────────────────────────
export type DocumentRow = {
  id: string;
  consultant_id: string;
  kind: string;
  file_name: string;
  expires_at: string | null;
};

export function detectExpiringDocuments(
  documents: DocumentRow[],
  consultantNames: Map<string, string>,
  settings: OrgNotificationSettings,
  today: Date = new Date(),
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  const maxWindow = Math.max(...settings.cadences.document_expiry_windows, 0);
  for (const d of documents) {
    if (!d.expires_at) continue;
    const left = daysUntil(d.expires_at, today);
    if (left > maxWindow) continue;
    const name = consultantNames.get(d.consultant_id) ?? 'Consultant';
    const expired = left < 0;
    out.push({
      // Un seul fil d'alerte par document : la même alerte évolue (priorité,
      // texte) à l'approche de l'échéance au lieu d'en créer une par fenêtre.
      dedupe_key: `doc-expiry:${d.id}`,
      kind: 'document_expiring',
      priority: expired ? 'critical' : left <= 7 ? 'high' : 'medium',
      title: expired
        ? `Document expiré — ${name}`
        : `Document expire ${left === 0 ? "aujourd'hui" : `dans ${left} j`} — ${name}`,
      description: `${d.kind} (${d.file_name}) ${expired ? `a expiré le ${fmtDate(d.expires_at)}` : `expire le ${fmtDate(d.expires_at)}`}. À renouveler.`,
      link: `/consultants/${d.consultant_id}`,
      entity_kind: 'consultant_document',
      entity_id: d.id,
      consultant_id: d.consultant_id,
      due_date: d.expires_at,
      notify: 'both',
    });
  }
  return out;
}

// ── 3. CRA manquant : mission active sans CRA pour le mois précédent ─────
export type MissionRow = {
  id: string;
  title: string | null;
  consultant_id: string;
  status: string | null;
  start_date: string;
  end_date: string | null;
};

export type TimesheetRow = {
  id: string;
  mission_id: string;
  period_month: number;
  period_year: number;
  status: string | null;
};

/** Période « mois précédent » de la date donnée. */
export function previousPeriod(today: Date): { month: number; year: number } {
  const m = today.getUTCMonth(); // 0-11 (mois courant)
  return m === 0 ? { month: 12, year: today.getUTCFullYear() - 1 } : { month: m, year: today.getUTCFullYear() };
}

export function detectMissingTimesheets(
  missions: MissionRow[],
  timesheets: TimesheetRow[],
  consultantNames: Map<string, string>,
  today: Date = new Date(),
): AlertCandidate[] {
  const { month, year } = previousPeriod(today);
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const covered = new Set(
    timesheets
      .filter((t) => t.period_month === month && t.period_year === year)
      .map((t) => t.mission_id),
  );
  const out: AlertCandidate[] = [];
  for (const m of missions) {
    if (m.status !== 'active') continue;
    // La mission devait être en cours pendant le mois concerné.
    if (m.start_date > `${year}-${String(month).padStart(2, '0')}-28`) continue;
    if (m.end_date && m.end_date < periodStart) continue;
    if (covered.has(m.id)) continue;
    const name = consultantNames.get(m.consultant_id) ?? 'Consultant';
    out.push({
      dedupe_key: `ts-missing:${m.id}:${year}-${month}`,
      kind: 'timesheet_missing',
      priority: 'high',
      title: `CRA ${String(month).padStart(2, '0')}/${year} non créé — ${name}`,
      description: `La mission « ${m.title ?? 'sans titre'} » est active mais aucun CRA n'existe pour ${String(month).padStart(2, '0')}/${year}. Jours travaillés non facturables.`,
      link: `/timesheets`,
      entity_kind: 'mission',
      entity_id: m.id,
      consultant_id: m.consultant_id,
      notify: 'both',
    });
  }
  return out;
}

// ── 4. Facture oubliée : CRA validé sans facture liée ────────────────────
export type InvoiceRow = {
  id: string;
  timesheet_id: string | null;
  status: string | null;
  party: string;
  issue_date: string;
  created_at: string;
  invoice_number: string;
  due_date: string;
};

export function detectForgottenInvoices(
  validatedTimesheets: Array<
    TimesheetRow & { validated_at: string | null; consultant_id: string; days_validated: number | null }
  >,
  invoices: InvoiceRow[],
  consultantNames: Map<string, string>,
  settings: OrgNotificationSettings,
  today: Date = new Date(),
): AlertCandidate[] {
  const invoicedTs = new Set(
    invoices
      .filter((i) => i.timesheet_id && i.party === 'client' && i.status !== 'cancelled')
      .map((i) => i.timesheet_id as string),
  );
  const out: AlertCandidate[] = [];
  for (const t of validatedTimesheets) {
    if (t.status !== 'client_validated') continue;
    if (invoicedTs.has(t.id)) continue;
    if (!t.validated_at) continue;
    const ageDays = Math.floor(
      (today.getTime() - new Date(t.validated_at).getTime()) / 86_400_000,
    );
    if (ageDays < settings.thresholds.invoice_forgotten_days) continue;
    const name = consultantNames.get(t.consultant_id) ?? 'Consultant';
    out.push({
      dedupe_key: `invoice-forgotten:${t.id}`,
      kind: 'invoice_forgotten',
      priority: 'critical',
      title: `Activité validée non facturée — ${name}`,
      description: `Le CRA ${String(t.period_month).padStart(2, '0')}/${t.period_year} (${t.days_validated ?? '?'} j validés) n'a toujours pas de facture client ${ageDays} j après validation. Chiffre d'affaires bloqué.`,
      link: `/timesheets/${t.id}`,
      entity_kind: 'timesheet',
      entity_id: t.id,
      consultant_id: t.consultant_id,
      notify: 'org',
    });
  }
  return out;
}

// ── 5. Facture brouillon dormante ─────────────────────────────────────────
export function detectStaleDraftInvoices(
  invoices: InvoiceRow[],
  settings: OrgNotificationSettings,
  today: Date = new Date(),
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const i of invoices) {
    if (i.status !== 'draft') continue;
    const ageDays = Math.floor(
      (today.getTime() - new Date(i.created_at).getTime()) / 86_400_000,
    );
    if (ageDays < settings.thresholds.invoice_draft_stale_days) continue;
    out.push({
      dedupe_key: `invoice-draft-stale:${i.id}`,
      kind: 'invoice_draft_stale',
      priority: 'medium',
      title: `Facture ${i.invoice_number} en brouillon depuis ${ageDays} j`,
      description: `Créée le ${fmtDate(i.issue_date)} et jamais envoyée. À finaliser ou annuler.`,
      link: `/invoices/${i.id}`,
      entity_kind: 'invoice',
      entity_id: i.id,
      notify: 'org',
    });
  }
  return out;
}

// ── 6. Contrats : signature en attente / expiration / mission sans contrat ─
export type ContractRow = {
  id: string;
  title: string;
  status: string;
  consultant_id: string | null;
  mission_id: string | null;
  party: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string | null;
};

export function detectContractAlerts(
  contracts: ContractRow[],
  missions: MissionRow[],
  consultantNames: Map<string, string>,
  settings: OrgNotificationSettings,
  today: Date = new Date(),
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  const maxWindow = Math.max(...settings.cadences.ending_windows, 0);

  for (const c of contracts) {
    // 6a. Envoyé mais jamais signé
    if (c.status === 'sent') {
      const ref = c.updated_at ?? c.created_at;
      const ageDays = Math.floor((today.getTime() - new Date(ref).getTime()) / 86_400_000);
      if (ageDays >= 3) {
        const name = c.consultant_id ? (consultantNames.get(c.consultant_id) ?? '') : '';
        out.push({
          dedupe_key: `contract-signature:${c.id}`,
          kind: 'contract_pending_signature',
          priority: ageDays >= 10 ? 'high' : 'medium',
          title: `Contrat « ${c.title} » en attente de signature (${ageDays} j)`,
          description: `Envoyé ${name ? `à ${name} ` : ''}il y a ${ageDays} jours et toujours pas signé. Relancer le signataire.`,
          link: `/contracts`,
          entity_kind: 'contract',
          entity_id: c.id,
          consultant_id: c.consultant_id,
          notify: 'both',
        });
      }
    }
    // 6b. Contrat actif/signé arrivant à expiration
    if ((c.status === 'active' || c.status === 'signed') && c.end_date) {
      const left = daysUntil(c.end_date, today);
      if (left <= maxWindow && left >= -30) {
        out.push({
          dedupe_key: `contract-expiry:${c.id}`,
          kind: 'contract_expiring',
          priority: left < 0 ? 'critical' : left <= 15 ? 'high' : 'medium',
          title:
            left < 0
              ? `Contrat « ${c.title} » expiré`
              : `Contrat « ${c.title} » expire ${left === 0 ? "aujourd'hui" : `dans ${left} j`}`,
          description:
            left < 0
              ? `Terme dépassé le ${fmtDate(c.end_date)} sans renouvellement ni avenant.`
              : `Terme le ${fmtDate(c.end_date)}. Décider : prolongation, avenant ou clôture.`,
          link: `/contracts`,
          entity_kind: 'contract',
          entity_id: c.id,
          consultant_id: c.consultant_id,
          due_date: c.end_date,
          notify: 'org',
        });
      }
    }
  }

  // 6c. Mission active sans AUCUN contrat actif/signé pour le consultant
  const contractedConsultants = new Set(
    contracts
      .filter((c) => (c.status === 'active' || c.status === 'signed') && c.consultant_id)
      .map((c) => c.consultant_id as string),
  );
  for (const m of missions) {
    if (m.status !== 'active') continue;
    if (contractedConsultants.has(m.consultant_id)) continue;
    const name = consultantNames.get(m.consultant_id) ?? 'Consultant';
    out.push({
      dedupe_key: `mission-no-contract:${m.id}`,
      kind: 'mission_no_contract',
      priority: 'critical',
      title: `${name} travaille sans contrat actif`,
      description: `La mission « ${m.title ?? 'sans titre'} » est active mais aucun contrat signé/actif ne couvre ce consultant. Risque juridique.`,
      link: `/missions/${m.id}`,
      entity_kind: 'mission',
      entity_id: m.id,
      consultant_id: m.consultant_id,
      notify: 'org',
    });
  }

  // 6d. Mission dépassée : end_date passée mais statut encore actif
  for (const m of missions) {
    if (m.status !== 'active' || !m.end_date) continue;
    const left = daysUntil(m.end_date, today);
    if (left >= 0) continue;
    const name = consultantNames.get(m.consultant_id) ?? 'Consultant';
    out.push({
      dedupe_key: `mission-overrun:${m.id}`,
      kind: 'mission_overrun',
      priority: 'high',
      title: `Mission « ${m.title ?? 'sans titre'} » dépassée`,
      description: `Fin prévue le ${fmtDate(m.end_date)} (il y a ${-left} j) mais la mission est toujours active. Prolonger (avenant) ou clôturer — ${name}.`,
      link: `/missions/${m.id}`,
      entity_kind: 'mission',
      entity_id: m.id,
      consultant_id: m.consultant_id,
      due_date: m.end_date,
      notify: 'org',
    });
  }

  return out;
}

// ── 7. CRM : opportunité sans suivi / invitation non acceptée ────────────
export type OpportunityRow = {
  id: string;
  title: string;
  status: string;
  next_follow_up: string | null;
  last_interaction: string | null;
  updated_at: string | null;
};

export function detectStaleOpportunities(
  opportunities: OpportunityRow[],
  settings: OrgNotificationSettings,
  today: Date = new Date(),
): AlertCandidate[] {
  const CLOSED = new Set(['won', 'lost', 'on_hold']);
  const out: AlertCandidate[] = [];
  for (const o of opportunities) {
    if (CLOSED.has(o.status)) continue;
    // Suivi planifié dépassé OU aucune activité depuis le seuil.
    const followUpLate = o.next_follow_up !== null && daysUntil(o.next_follow_up, today) < 0;
    const lastTouch = o.last_interaction ?? o.updated_at;
    const idleDays = lastTouch
      ? Math.floor((today.getTime() - new Date(lastTouch).getTime()) / 86_400_000)
      : Infinity;
    const idle = idleDays >= settings.thresholds.opportunity_stale_days;
    if (!followUpLate && !idle) continue;
    out.push({
      dedupe_key: `opportunity-stale:${o.id}`,
      kind: 'opportunity_cold',
      priority: followUpLate ? 'high' : 'medium',
      title: `Opportunité « ${o.title} » sans suivi`,
      description: followUpLate
        ? `Relance prévue le ${fmtDate(o.next_follow_up!)} — dépassée. Recontacter le client.`
        : `Aucune activité depuis ${idleDays === Infinity ? 'sa création' : `${idleDays} j`}. Relancer ou clore.`,
      link: `/crm`,
      entity_kind: 'opportunity',
      entity_id: o.id,
      notify: 'org',
    });
  }
  return out;
}

export type InvitationRow = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
};

export function detectPendingInvitations(
  invitations: InvitationRow[],
  settings: OrgNotificationSettings,
  today: Date = new Date(),
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const inv of invitations) {
    if (inv.accepted_at) continue;
    const ageDays = Math.floor(
      (today.getTime() - new Date(inv.created_at).getTime()) / 86_400_000,
    );
    if (ageDays < settings.thresholds.invitation_pending_days) continue;
    const masked = inv.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    out.push({
      dedupe_key: `invitation-pending:${inv.id}`,
      kind: 'invitation_pending',
      priority: 'low',
      title: `Invitation non acceptée (${masked})`,
      description: `Envoyée il y a ${ageDays} j${inv.expires_at ? `, expire le ${fmtDate(inv.expires_at.slice(0, 10))}` : ''}. Renvoyer ou révoquer.`,
      link: `/settings/team`,
      entity_kind: 'invitation',
      entity_id: inv.id,
      notify: 'org',
    });
  }
  return out;
}
