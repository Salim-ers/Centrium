import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';
import { pick, sendEmail, type EmailLocale } from '@/lib/email/send';
import { sendSms } from '@/lib/sms/send';
import { recordHeartbeat } from '@/lib/observability/heartbeat';
import { logger } from '@/lib/logger';
import type { Alert, AlertPriority, AlertType } from '@/types';

import {
  ALERT_CATEGORY,
  MANDATORY_ALERT_KINDS,
  reminderIntervalDays,
  resolveOrgSettings,
  type NotificationCategory,
  type OrgNotificationSettings,
} from './config';
import {
  detectContractAlerts,
  detectExpiringDocuments,
  detectForgottenInvoices,
  detectIncompleteProfiles,
  detectMissingTimesheets,
  detectPendingInvitations,
  detectStaleDraftInvoices,
  detectStaleOpportunities,
  detectMissionEndings,
  planQuoteExpiryTasks,
  planStaleOpportunityTasks,
  type AlertCandidate,
  type AutomationTask,
  type QuoteRow,
} from './detectors';
import { resolveAutomations } from '@/lib/automations/rules';
import { detectConsultantMatches, detectTimesheetsToValidate, type MatchOpportunityRow } from './v2-detectors';
import { loadMatchingPool } from '@/lib/matching/server-pool';
import { buildSmsBody, escalatePriority, shouldNotify } from './reminders';

// =========================================================================
// Moteur d'alertes — exécuté par le cron quotidien /api/cron/alerts-engine
// -------------------------------------------------------------------------
// Pour chaque organisation :
//   1. DÉTECTE : exécute les détecteurs purs sur les données réelles.
//   2. SYNCHRONISE la table `alerts` (source='engine') par dedupe_key :
//      upsert si actif, réouverture si résolu mais condition persistante
//      (grâce 3 j), auto-résolution si la condition a disparu, réveil des
//      snoozes échus. `dismissed` = choix humain définitif, jamais rouvert.
//   3. NOTIFIE : in-app (table notifications) + email + SMS selon les
//      réglages org, les préférences utilisateur et la cadence de relance.
//      Idempotent via notification_deliveries (max(created_at) par
//      (dedupe_key, canal)). Fallback SMS→email. Cap anti-envoi massif.
//   4. DIGESTS : récapitulatif quotidien/hebdomadaire aux admins abonnés.
// =========================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.centrium-platform.com';
/** Anti-envoi massif : emails d'alerte max par destinataire et par run. */
const MAX_EMAILS_PER_RECIPIENT_PER_RUN = 5;
/** Grâce avant réouverture d'une alerte résolue dont la condition persiste. */
const REOPEN_GRACE_DAYS = 3;

export type EngineOrgReport = {
  organization_id: string;
  name: string;
  detected: number;
  created: number;
  updated: number;
  reopened: number;
  auto_resolved: number;
  notified_email: number;
  notified_sms: number;
  notified_in_app: number;
  skipped: number;
  digest_sent: boolean;
  tasks_created: number;
  errors: string[];
};

export type EngineReport = {
  ran_at: string;
  orgs: EngineOrgReport[];
};

type MemberRecipient = {
  user_id: string;
  email: string;
  phone: string | null;
  role: string;
  first_name: string | null;
  preferred_locale?: string | null;
  prefs: {
    email_enabled: boolean;
    sms_enabled: boolean;
    categories: Record<string, Partial<Record<'in_app' | 'email' | 'sms', boolean>>>;
    digest_daily: boolean;
    digest_weekly: boolean;
    phone: string | null;
  } | null;
};

/** Rôles internes destinataires par catégorie d'alerte. */
function rolesForCategory(cat: NotificationCategory): string[] {
  switch (cat) {
    case 'invoices':
      return ['admin', 'finance'];
    case 'system':
      return ['admin'];
    default:
      return ['admin', 'business_manager'];
  }
}

function channelAllowed(
  r: MemberRecipient,
  cat: NotificationCategory,
  kind: AlertType,
  channel: 'in_app' | 'email' | 'sms',
): boolean {
  // Les alertes imposées par l'organisation restent toujours visibles in-app.
  if (channel === 'in_app' && MANDATORY_ALERT_KINDS.includes(kind)) return true;
  const catOverride = r.prefs?.categories?.[cat]?.[channel];
  if (catOverride !== undefined) return catOverride;
  if (channel === 'email') return r.prefs?.email_enabled ?? true;
  if (channel === 'sms') return r.prefs?.sms_enabled ?? false;
  return true; // in_app par défaut
}

/** Wording adressé AU CONSULTANT (portail) — jamais le titre interne. */
function consultantFacingCopy(
  a: AlertCandidate,
  locale: EmailLocale = 'fr',
): { subject: string; paragraphs: string[]; ctaLabel: string; ctaPath: string } | null {
  switch (a.kind) {
    case 'profile_incomplete':
      return {
        subject: pick(
          locale,
          'Action requise : complétez votre profil Centrium',
          'Action required: complete your Centrium profile',
        ),
        paragraphs: [
          pick(
            locale,
            'Votre profil consultant est incomplet. Certaines informations ou documents obligatoires manquent encore.',
            'Your consultant profile is incomplete. Some required information or documents are still missing.',
          ),
          a.description,
          pick(
            locale,
            'Sans ces éléments, votre positionnement en mission et votre facturation peuvent être bloqués.',
            'Without these items, your mission staffing and invoicing may be blocked.',
          ),
        ],
        ctaLabel: pick(locale, 'Compléter mon profil', 'Complete my profile'),
        ctaPath: '/portal/profile',
      };
    case 'document_expiring':
      return {
        subject: pick(
          locale,
          'Un de vos documents expire bientôt',
          'One of your documents expires soon',
        ),
        paragraphs: [
          a.description,
          pick(
            locale,
            'Merci de déposer un document à jour dans votre espace pour rester en conformité.',
            'Please upload an up-to-date document in your workspace to stay compliant.',
          ),
        ],
        ctaLabel: pick(locale, 'Mettre à jour mes documents', 'Update my documents'),
        ctaPath: '/portal/profile',
      };
    case 'timesheet_missing':
      return {
        subject: pick(
          locale,
          'Votre CRA du mois dernier est attendu',
          'Your timesheet for last month is due',
        ),
        paragraphs: [
          a.description,
          pick(
            locale,
            'Complétez et soumettez votre compte rendu d’activité pour permettre la facturation.',
            'Complete and submit your timesheet to enable invoicing.',
          ),
        ],
        ctaLabel: pick(locale, 'Compléter mon CRA', 'Complete my timesheet'),
        ctaPath: '/portal/cra',
      };
    case 'contract_pending_signature':
      return {
        subject: pick(
          locale,
          'Un contrat attend votre signature',
          'A contract is awaiting your signature',
        ),
        paragraphs: [
          a.description,
          pick(
            locale,
            'Vous pouvez le consulter et le signer électroniquement depuis votre espace.',
            'You can review and sign it electronically from your workspace.',
          ),
        ],
        ctaLabel: pick(locale, 'Signer mon contrat', 'Sign my contract'),
        ctaPath: '/portal/contracts',
      };
    default:
      return null;
  }
}

// ── Chargement des données d'une organisation ─────────────────────────────

async function loadOrgData(admin: SupabaseClient, orgId: string) {
  const [
    consultants,
    documents,
    missions,
    timesheets,
    invoices,
    contracts,
    opportunities,
    invitations,
    members,
    prefs,
    settingsRow,
    docReqs,
  ] = await Promise.all([
    admin
      .from('consultants')
      .select(
        'id, first_name, last_name, email, phone, job_title, daily_rate_eur, contract_type, status, city, address, legal_status, company_name, siret, iban, bic, archived, is_prospect, preferred_locale',
      )
      .eq('organization_id', orgId),
    admin
      .from('consultant_documents')
      .select('id, consultant_id, kind, file_name, expires_at, consultants!inner(organization_id)')
      .eq('consultants.organization_id', orgId),
    admin
      .from('missions')
      .select('id, title, consultant_id, status, start_date, end_date')
      .eq('organization_id', orgId)
      .eq('archived', false),
    admin
      .from('timesheets')
      .select('id, mission_id, consultant_id, period_month, period_year, status, validated_at, days_validated, submitted_at')
      .eq('organization_id', orgId)
      .eq('archived', false),
    admin
      .from('invoices')
      .select('id, timesheet_id, status, party, issue_date, created_at, invoice_number, due_date')
      .eq('organization_id', orgId)
      .eq('archived', false),
    admin
      .from('contracts')
      .select('id, title, status, consultant_id, mission_id, party, start_date, end_date, created_at, updated_at')
      .eq('organization_id', orgId)
      .or('archived.is.null,archived.eq.false'),
    admin
      .from('opportunities')
      .select('id, title, status, next_follow_up, last_interaction, updated_at')
      .eq('organization_id', orgId),
    admin
      .from('organization_invitations')
      .select('id, email, created_at, expires_at, accepted_at')
      .eq('organization_id', orgId),
    // NB : pas d'embed profiles!inner ici — la FK de organization_members
    // pointe vers auth.users, PostgREST ne connaît pas la relation avec
    // profiles. On joint en 2 requêtes (voir plus bas).
    admin
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', orgId),
    admin.from('notification_preferences').select('*').eq('organization_id', orgId),
    admin
      .from('org_notification_settings')
      .select('settings')
      .eq('organization_id', orgId)
      .maybeSingle(),
    admin.from('document_requirements').select('*').eq('organization_id', orgId),
  ]);

  const firstError = [
    consultants.error, documents.error, missions.error, timesheets.error,
    invoices.error, contracts.error, opportunities.error, invitations.error,
    members.error, prefs.error, settingsRow.error, docReqs.error,
  ].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  // Données V2 (migration 097) chargées à part et de façon tolérante : si la
  // migration n'est pas encore appliquée, le moteur continue sans elles.
  const [missionsV2, oppOwners, quotesV2] = await Promise.all([
    admin.from('missions').select('id, owner_id, renewal_status').eq('organization_id', orgId).eq('archived', false),
    admin.from('opportunities').select('id, owner_id').eq('organization_id', orgId),
    admin.from('quotes').select('id, number, title, status, valid_until, created_by').eq('organization_id', orgId).eq('status', 'sent'),
  ]);
  const missionExtra = new Map(
    (missionsV2.error ? [] : (missionsV2.data ?? [])).map((m) => [m.id as string, m as { owner_id: string | null; renewal_status: string | null }]),
  );
  const oppOwner = new Map(
    (oppOwners.error ? [] : (oppOwners.data ?? [])).map((o) => [o.id as string, (o.owner_id as string | null) ?? null]),
  );

  const prefsByUser = new Map(
    (prefs.data ?? []).map((p) => [p.user_id as string, p]),
  );

  // Jointure explicite members ↔ profiles (pas de FK PostgREST entre les deux).
  const memberIds = (members.data ?? []).map((m) => m.user_id as string);
  const { data: memberProfiles, error: profErr } =
    memberIds.length > 0
      ? await admin
          .from('profiles')
          .select('id, email, phone, first_name, consultant_id, preferred_locale')
          .in('id', memberIds)
      : { data: [], error: null };
  if (profErr) throw new Error(profErr.message);
  const profileById = new Map(
    (memberProfiles ?? []).map((p) => [p.id as string, p]),
  );

  // Comptes portail : consultant_id → user_id (pour la cloche du portail).
  const consultantUserIds = new Map<string, string>();
  for (const p of memberProfiles ?? []) {
    if (p.consultant_id) consultantUserIds.set(p.consultant_id as string, p.id as string);
  }

  // Locale par consultant : préférence du profil portail si un compte existe,
  // sinon celle de la fiche consultant, sinon 'fr'.
  const consultantLocales = new Map<string, EmailLocale>();
  for (const c of consultants.data ?? []) {
    const portalUserId = consultantUserIds.get(c.id as string);
    const prof = portalUserId ? profileById.get(portalUserId) : undefined;
    const raw =
      (prof?.preferred_locale as string | null | undefined) ??
      ((c as { preferred_locale?: string | null }).preferred_locale ?? null);
    consultantLocales.set(c.id as string, raw === 'en' ? 'en' : 'fr');
  }

  const recipients: MemberRecipient[] = (members.data ?? [])
    .flatMap((m) => {
      const prof = profileById.get(m.user_id as string);
      if (!prof?.email) return [];
      const p = prefsByUser.get(m.user_id as string);
      return [{
        user_id: m.user_id as string,
        email: prof.email as string,
        phone: (prof.phone as string | null) ?? null,
        role: m.role as string,
        first_name: (prof.first_name as string | null) ?? null,
        preferred_locale: (prof.preferred_locale as string | null) ?? null,
        prefs: p
          ? {
              email_enabled: p.email_enabled as boolean,
              sms_enabled: p.sms_enabled as boolean,
              categories: (p.categories ?? {}) as Record<
                string,
                Partial<Record<'in_app' | 'email' | 'sms', boolean>>
              >,
              digest_daily: p.digest_daily as boolean,
              digest_weekly: p.digest_weekly as boolean,
              phone: (p.phone as string | null) ?? null,
            }
          : null,
      }];
    })
    // Les comptes consultants du portail ne reçoivent pas les alertes internes.
    .filter((r) => r.role !== 'consultant');

  return {
    consultants: consultants.data ?? [],
    consultantUserIds,
    consultantLocales,
    documents: (documents.data ?? []) as unknown as Array<{
      id: string; consultant_id: string; kind: string; file_name: string; expires_at: string | null;
    }>,
    missions: (missions.data ?? []).map((m) => ({
      ...m,
      owner_id: missionExtra.get(m.id as string)?.owner_id ?? null,
      renewal_status: missionExtra.get(m.id as string)?.renewal_status ?? null,
    })),
    timesheets: timesheets.data ?? [],
    invoices: invoices.data ?? [],
    contracts: contracts.data ?? [],
    opportunities: (opportunities.data ?? []).map((o) => ({ ...o, owner_id: oppOwner.get(o.id as string) ?? null })),
    quotes: (quotesV2.error ? [] : (quotesV2.data ?? [])) as QuoteRow[],
    invitations: invitations.data ?? [],
    recipients,
    settings: resolveOrgSettings(settingsRow.data?.settings as Record<string, unknown> | null),
    automations: resolveAutomations((settingsRow.data?.settings as { automations?: unknown } | null)?.automations),
    docReqs: docReqs.data ?? [],
  };
}

// ── Décision + journalisation d'envoi ─────────────────────────────────────

async function lastDelivery(
  admin: SupabaseClient,
  orgId: string,
  dedupeKey: string,
  channel: string,
): Promise<Date | null> {
  const { data } = await admin
    .from('notification_deliveries')
    .select('created_at')
    .eq('organization_id', orgId)
    .eq('dedupe_key', dedupeKey)
    .eq('channel', channel)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? new Date(data.created_at as string) : null;
}

type DeliveryLog = {
  organization_id: string;
  dedupe_key: string;
  channel: 'in_app' | 'email' | 'sms';
  user_id?: string | null;
  consultant_id?: string | null;
  recipient?: string | null;
  status: 'sent' | 'failed' | 'skipped';
  provider?: string | null;
  provider_id?: string | null;
  error?: string | null;
};

async function logDeliveries(admin: SupabaseClient, rows: DeliveryLog[]) {
  if (rows.length === 0) return;
  const { error } = await admin.from('notification_deliveries').insert(rows);
  if (error) logger.warn('[alerts-engine] delivery log failed', error.message);
}

// ── Traitement d'une organisation ─────────────────────────────────────────

export async function runOrgAlerts(
  admin: SupabaseClient,
  org: { id: string; name: string },
  now: Date,
): Promise<EngineOrgReport> {
  const report: EngineOrgReport = {
    organization_id: org.id,
    name: org.name,
    detected: 0, created: 0, updated: 0, reopened: 0, auto_resolved: 0,
    notified_email: 0, notified_sms: 0, notified_in_app: 0, skipped: 0,
    digest_sent: false, tasks_created: 0, errors: [],
  };

  const data = await loadOrgData(admin, org.id);
  const settings = data.settings;

  const consultantNames = new Map(
    data.consultants.map((c) => [c.id as string, `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()]),
  );
  const documentsByConsultant = new Map<string, Array<{ kind: string; expires_at: string | null }>>();
  for (const d of data.documents) {
    const list = documentsByConsultant.get(d.consultant_id) ?? [];
    list.push({ kind: d.kind, expires_at: d.expires_at });
    documentsByConsultant.set(d.consultant_id, list);
  }

  // Données de matching (règle « consultant disponible ») : chargées seulement
  // si la règle est active, et sans bloquer le reste du moteur.
  let matchCandidates: AlertCandidate[] = [];
  if (data.automations.consultant_available_matching.enabled) {
    try {
      const [pool, opps] = await Promise.all([
        loadMatchingPool(admin, org.id),
        admin
          .from('opportunities')
          .select('id, organization_id, title, company_id, contact_id, owner_id, daily_rate_eur, duration_months, description, required_skills, start_date, location, status, archived')
          .eq('organization_id', org.id),
      ]);
      if (!opps.error) {
        matchCandidates = detectConsultantMatches(pool.consultants, (opps.data ?? []) as MatchOpportunityRow[], pool.skillsByConsultant, now);
      }
    } catch (e) {
      report.errors.push(`matching: ${(e as Error).message}`);
    }
  }

  // 1. DÉTECTION ------------------------------------------------------------
  const candidates: AlertCandidate[] = [
    ...detectIncompleteProfiles(
      data.consultants as never, documentsByConsultant, data.docReqs as never, now,
    ),
    ...detectExpiringDocuments(data.documents, consultantNames, settings, now),
    ...(data.automations.missing_timesheet_reminders.enabled
      ? detectMissingTimesheets(data.missions as never, data.timesheets as never, consultantNames, now)
      : []),
    ...(data.automations.mission_ending_alerts.enabled ? detectMissionEndings(data.missions as never, consultantNames, now) : []),
    ...(data.automations.timesheet_validation_reminders.enabled ? detectTimesheetsToValidate(data.timesheets as never, consultantNames, now) : []),
    ...matchCandidates,
    ...detectForgottenInvoices(data.timesheets as never, data.invoices as never, consultantNames, settings, now),
    ...detectStaleDraftInvoices(data.invoices as never, settings, now),
    ...detectContractAlerts(data.contracts as never, data.missions as never, consultantNames, settings, now),
    ...detectStaleOpportunities(data.opportunities as never, settings, now),
    ...detectPendingInvitations(data.invitations as never, settings, now),
  ];
  report.detected = candidates.length;

  // 2. SYNCHRONISATION avec la table alerts ----------------------------------
  const { data: existingRows, error: exErr } = await admin
    .from('alerts')
    .select('*')
    .eq('organization_id', org.id)
    .not('dedupe_key', 'is', null);
  if (exErr) throw new Error(exErr.message);
  const existing = new Map((existingRows ?? []).map((a) => [a.dedupe_key as string, a as unknown as Alert]));

  const emittedKeys = new Set(candidates.map((c) => c.dedupe_key));
  const activeAlerts: Array<{ alert: Alert; candidate: AlertCandidate }> = [];

  for (const cand of candidates) {
    const prev = existing.get(cand.dedupe_key);
    const interval = reminderIntervalDays(cand.kind, settings);
    const escalateAfter =
      ALERT_CATEGORY[cand.kind] === 'consultants'
        ? settings.cadences.profile_incomplete.escalate_after_reminders
        : ALERT_CATEGORY[cand.kind] === 'cra'
          ? settings.cadences.cra.escalate_after_reminders
          : 0;

    if (!prev) {
      const { data: inserted, error } = await admin
        .from('alerts')
        .insert({
          organization_id: org.id,
          dedupe_key: cand.dedupe_key,
          kind: cand.kind,
          priority: cand.priority,
          status: 'new',
          title: cand.title,
          description: cand.description,
          link: cand.link,
          entity_kind: cand.entity_kind,
          entity_id: cand.entity_id,
          consultant_id: cand.consultant_id ?? null,
          assignee_id: cand.assignee_id ?? null,
          due_date: cand.due_date ?? null,
          source: 'engine',
          reminder_interval_days: interval,
          next_reminder_at: new Date(now.getTime() + interval * 86_400_000).toISOString(),
        })
        .select()
        .single();
      if (error) {
        report.errors.push(`insert ${cand.dedupe_key}: ${error.message}`);
        continue;
      }
      report.created++;
      activeAlerts.push({ alert: inserted as unknown as Alert, candidate: cand });
      continue;
    }

    // Ignorée par un humain → définitif, on ne rouvre jamais.
    if (prev.status === 'dismissed') { report.skipped++; continue; }

    // Résolue mais la condition persiste → réouverture après grâce.
    if (prev.status === 'resolved' || prev.status === 'expired') {
      const resolvedAt = prev.resolved_at ? new Date(prev.resolved_at) : null;
      const graceOver =
        !resolvedAt || now.getTime() - resolvedAt.getTime() >= REOPEN_GRACE_DAYS * 86_400_000;
      if (!graceOver) { report.skipped++; continue; }
      const { data: reopened, error } = await admin
        .from('alerts')
        .update({
          status: 'new',
          title: cand.title,
          description: cand.description,
          priority: cand.priority,
          due_date: cand.due_date ?? null,
          resolved_at: null,
          resolved_by: null,
          updated_at: now.toISOString(),
          next_reminder_at: new Date(now.getTime() + interval * 86_400_000).toISOString(),
        })
        .eq('id', prev.id)
        .select()
        .single();
      if (error) { report.errors.push(`reopen ${cand.dedupe_key}: ${error.message}`); continue; }
      report.reopened++;
      activeAlerts.push({ alert: reopened as unknown as Alert, candidate: cand });
      continue;
    }

    // Reportée : réveil si l'échéance du report est passée, sinon silence.
    if (prev.status === 'snoozed') {
      const wakeUp = !prev.snoozed_until || new Date(prev.snoozed_until) <= now;
      if (!wakeUp) { report.skipped++; continue; }
    }

    // Active (ou snooze échue) : rafraîchit le contenu + escalade éventuelle.
    const escalated = escalatePriority(cand.priority, prev.reminder_count ?? 0, escalateAfter);
    const { data: updated, error } = await admin
      .from('alerts')
      .update({
        status: prev.status === 'snoozed' ? 'new' : prev.status,
        title: cand.title,
        description: cand.description,
        priority: escalated,
        due_date: cand.due_date ?? null,
        ...(cand.assignee_id !== undefined ? { assignee_id: cand.assignee_id } : {}),
        snoozed_until: prev.status === 'snoozed' ? null : prev.snoozed_until,
        updated_at: now.toISOString(),
      })
      .eq('id', prev.id)
      .select()
      .single();
    if (error) { report.errors.push(`update ${cand.dedupe_key}: ${error.message}`); continue; }
    report.updated++;
    activeAlerts.push({ alert: updated as unknown as Alert, candidate: cand });
  }

  // Auto-résolution : la condition a disparu → l'alerte se ferme seule et
  // les relances s'arrêtent immédiatement.
  for (const [key, prev] of existing) {
    if (emittedKeys.has(key)) continue;
    if (prev.source !== 'engine') continue;
    if (!['new', 'in_progress', 'snoozed'].includes(prev.status)) continue;
    const { error } = await admin
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: now.toISOString(),
        resolved_by: null, // système
        next_reminder_at: null,
        updated_at: now.toISOString(),
      })
      .eq('id', prev.id);
    if (error) report.errors.push(`autoresolve ${key}: ${error.message}`);
    else report.auto_resolved++;
  }

  // 3. NOTIFICATIONS ----------------------------------------------------------
  const emailBudget = new Map<string, number>(); // par destinataire
  const deliveries: DeliveryLog[] = [];

  // Alerte adressée (fin de mission → responsable, consultant compatible →
  // référent) : uniquement son
  // destinataire s'il est membre ; sinon, diffusion par rôle.
  const directTarget = (alert: Alert) =>
    (alert.kind === 'mission_ending' || alert.kind === 'consultant_available') && alert.assignee_id
      ? (data.recipients.find((r) => r.user_id === alert.assignee_id) ?? null)
      : null;

  for (const { alert, candidate } of activeAlerts) {
    const cat = ALERT_CATEGORY[alert.kind];
    const direct = directTarget(alert);
    const interval = alert.reminder_interval_days || reminderIntervalDays(alert.kind, settings);

    // — Canal EMAIL (org) : première notification puis relances à cadence —
    if (settings.channels.email && (candidate.notify === 'org' || candidate.notify === 'both')) {
      const last = await lastDelivery(admin, org.id, alert.dedupe_key!, 'email');
      const decision = shouldNotify(alert.status, last, interval, now);
      if (decision.send) {
        const targets = (direct ? [direct] : data.recipients).filter(
          (r) =>
            (direct !== null || rolesForCategory(cat).includes(r.role) || r.user_id === alert.assignee_id) &&
            channelAllowed(r, cat, alert.kind, 'email'),
        );
        for (const r of targets) {
          const used = emailBudget.get(r.email) ?? 0;
          if (used >= MAX_EMAILS_PER_RECIPIENT_PER_RUN) {
            deliveries.push({
              organization_id: org.id, dedupe_key: alert.dedupe_key!, channel: 'email',
              user_id: r.user_id, recipient: r.email, status: 'skipped', error: 'rate_limited_run',
            });
            report.skipped++;
            continue;
          }
          emailBudget.set(r.email, used + 1);
          const locale: EmailLocale = r.preferred_locale === 'en' ? 'en' : 'fr';
          const res = await sendEmail({
            to: r.email,
            locale,
            subject: `${decision.isReminder ? pick(locale, '[Relance] ', '[Reminder] ') : ''}${alert.title}`,
            paragraphs: [
              alert.description ?? alert.title,
              ...(alert.due_date
                ? [`${pick(locale, 'Échéance :', 'Due date:')} ${alert.due_date.split('-').reverse().join('/')}`]
                : []),
              ...(decision.isReminder
                ? [
                    pick(
                      locale,
                      `Relance n° ${(alert.reminder_count ?? 0) + 1} — cette alerte reste sans action.`,
                      `Reminder #${(alert.reminder_count ?? 0) + 1} — this alert is still unaddressed.`,
                    ),
                  ]
                : []),
            ],
            cta: {
              label: pick(locale, 'Traiter dans Centrium', 'Handle in Centrium'),
              url: `${APP_URL}${alert.link ?? '/alerts'}`,
            },
            footnote: pick(
              locale,
              'Vous recevez cet email selon les réglages de notifications de votre organisation.',
              "You receive this email according to your organization's notification settings.",
            ),
          });
          deliveries.push({
            organization_id: org.id, dedupe_key: alert.dedupe_key!, channel: 'email',
            user_id: r.user_id, recipient: r.email,
            status: res.sent ? 'sent' : 'failed',
            provider: 'resend', error: res.error ?? null,
          });
          if (res.sent) report.notified_email++;
        }
        // Compteur de relances + prochaine échéance (affichés dans l'UI).
        if (targets.length > 0) {
          await admin
            .from('alerts')
            .update({
              reminder_count: (alert.reminder_count ?? 0) + (decision.isReminder ? 1 : 0),
              next_reminder_at: new Date(now.getTime() + interval * 86_400_000).toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', alert.id);
        }
      }
    }

    // — Canal EMAIL/SMS (consultant concerné) —
    if (candidate.notify === 'consultant' || candidate.notify === 'both') {
      const consultant = data.consultants.find((c) => c.id === candidate.consultant_id);
      // Locale du consultant : profil portail > fiche consultant > 'fr'.
      // La cloche du portail utilise la même copy — cohérent pour le destinataire.
      const cLocale: EmailLocale = consultant
        ? (data.consultantLocales.get(consultant.id as string) ?? 'fr')
        : 'fr';
      const copy = consultantFacingCopy(candidate, cLocale);
      if (copy && consultant) {
        const cKey = `${alert.dedupe_key}:consultant`;

        // Cloche du portail : notification in-app si le consultant a un compte
        // (profiles.consultant_id) — à la première occurrence uniquement.
        const portalUserId = data.consultantUserIds.get(consultant.id as string);
        if (portalUserId) {
          const lastPortal = await lastDelivery(admin, org.id, cKey, 'in_app');
          if (lastPortal === null && ['new', 'in_progress'].includes(alert.status)) {
            const { error: notifErr } = await admin.from('notifications').insert({
              organization_id: org.id,
              user_id: portalUserId,
              kind: alert.kind,
              priority: alert.priority,
              title: copy.subject,
              body: copy.paragraphs[0] ?? null,
              link: copy.ctaPath,
            });
            if (!notifErr) {
              report.notified_in_app++;
              deliveries.push({
                organization_id: org.id, dedupe_key: cKey, channel: 'in_app',
                user_id: portalUserId, consultant_id: consultant.id as string,
                status: 'sent', provider: 'centrium',
              });
            }
          }
        }

        // Garde-fou : aucune communication SORTANTE vers un consultant tant
        // que l'organisation n'a pas activé consultant_outreach_auto (réglage
        // Paramètres → Notifications). La cloche portail (ci-dessus) et les
        // alertes internes restent actives dans tous les cas.
        if (!settings.consultant_outreach_auto) {
          const lastSkip = await lastDelivery(admin, org.id, cKey, 'email');
          if (lastSkip === null) {
            deliveries.push({
              organization_id: org.id, dedupe_key: cKey, channel: 'email',
              consultant_id: consultant.id as string, recipient: consultant.email ?? null,
              status: 'skipped', error: 'outreach_disabled',
            });
            report.skipped++;
          }
        } else {
          const last = await lastDelivery(admin, org.id, cKey, 'email');
          const decision = shouldNotify(alert.status, last, interval, now);
          if (decision.send && settings.channels.email && consultant.email) {
            const res = await sendEmail({
              to: consultant.email as string,
              locale: cLocale,
              subject: `${decision.isReminder ? pick(cLocale, '[Rappel] ', '[Reminder] ') : ''}${copy.subject}`,
              paragraphs: copy.paragraphs,
              cta: { label: copy.ctaLabel, url: `${APP_URL}${copy.ctaPath}` },
              footnote: pick(
                cLocale,
                `Message envoyé par ${org.name} via Centrium.`,
                `Message sent by ${org.name} via Centrium.`,
              ),
            });
            deliveries.push({
              organization_id: org.id, dedupe_key: cKey, channel: 'email',
              consultant_id: consultant.id as string, recipient: consultant.email as string,
              status: res.sent ? 'sent' : 'failed', provider: 'resend', error: res.error ?? null,
            });
            if (res.sent) report.notified_email++;
          }
          // SMS : réservé aux priorités hautes, si le canal org est actif.
          if (
            decision.send && settings.channels.sms && consultant.phone &&
            (alert.priority === 'critical' || alert.priority === 'high')
          ) {
            const lastSms = await lastDelivery(admin, org.id, cKey, 'sms');
            const smsDecision = shouldNotify(alert.status, lastSms, interval, now);
            if (smsDecision.send) {
              const sms = await sendSms({
                to: consultant.phone as string,
                body: buildSmsBody(copy.subject, `${APP_URL}${copy.ctaPath}`),
              });
              deliveries.push({
                organization_id: org.id, dedupe_key: cKey, channel: 'sms',
                consultant_id: consultant.id as string, recipient: consultant.phone as string,
                status: sms.sent ? 'sent' : sms.error === 'no_provider' ? 'skipped' : 'failed',
                provider: sms.provider, provider_id: sms.providerId ?? null, error: sms.error ?? null,
              });
              if (sms.sent) report.notified_sms++;
              // Fallback SMS→email : si l'envoi a échoué (hors sandbox) et
              // qu'aucun email n'était parti, l'email de secours part ici.
              if (!sms.sent && sms.error !== 'no_provider' && consultant.email) {
                await sendEmail({
                  to: consultant.email as string,
                  locale: cLocale,
                  subject: copy.subject,
                  paragraphs: copy.paragraphs,
                  cta: { label: copy.ctaLabel, url: `${APP_URL}${copy.ctaPath}` },
                  footnote: pick(
                    cLocale,
                    'SMS non délivré — email de secours.',
                    'SMS not delivered — fallback email.',
                  ),
                });
              }
            }
          }
        }
      }
    }

    // — Canal IN-APP : à la première occurrence uniquement (pas de spam) —
    if (candidate.notify === 'org' || candidate.notify === 'both') {
      const lastInApp = await lastDelivery(admin, org.id, alert.dedupe_key!, 'in_app');
      if (lastInApp === null && ['new', 'in_progress'].includes(alert.status)) {
        const targets = (direct ? [direct] : data.recipients).filter(
          (r) => (direct !== null || rolesForCategory(cat).includes(r.role)) && channelAllowed(r, cat, alert.kind, 'in_app'),
        );
        if (targets.length > 0) {
          const { error } = await admin.from('notifications').insert(
            targets.map((r) => ({
              organization_id: org.id,
              user_id: r.user_id,
              kind: alert.kind,
              priority: alert.priority,
              title: alert.title,
              body: alert.description,
              link: alert.link ?? '/alerts',
            })),
          );
          if (!error) {
            report.notified_in_app += targets.length;
            deliveries.push(
              ...targets.map((r): DeliveryLog => ({
                organization_id: org.id, dedupe_key: alert.dedupe_key!, channel: 'in_app',
                user_id: r.user_id, status: 'sent', provider: 'centrium',
              })),
            );
          }
        }
      }
    }
  }

  await logDeliveries(admin, deliveries);

  // 3 bis. TÂCHES D'AUTOMATISATION -------------------------------------------
  const tasks: AutomationTask[] = [
    ...(data.automations.stale_opportunity_tasks.enabled ? planStaleOpportunityTasks(data.opportunities as never, settings, now) : []),
    ...(data.automations.quote_expiry_alerts.enabled ? planQuoteExpiryTasks(data.quotes, now) : []),
  ];
  if (tasks.length) {
    try {
      report.tasks_created = await createAutomationTasks(admin, org.id, tasks);
    } catch (e) {
      report.errors.push(`tasks: ${(e as Error).message}`);
    }
  }

  // 4. DIGESTS ---------------------------------------------------------------
  try {
    const digest = await maybeSendDigest(admin, org, data.recipients, settings, now);
    report.digest_sent = digest;
  } catch (e) {
    report.errors.push(`digest: ${(e as Error).message}`);
  }

  return report;
}

/**
 * Crée les tâches non encore créées (tous statuts confondus : une tâche
 * terminée n'est jamais recréée pour la même clé).
 */
async function createAutomationTasks(admin: SupabaseClient, orgId: string, tasks: AutomationTask[]): Promise<number> {
  const keys = tasks.map((t) => t.dedupe_key);
  const { data: existing, error } = await admin.from('tasks').select('dedupe_key').eq('organization_id', orgId).in('dedupe_key', keys);
  if (error) throw new Error(error.message);
  const seen = new Set((existing ?? []).map((t) => t.dedupe_key as string));
  const fresh = tasks.filter((t) => !seen.has(t.dedupe_key));
  if (!fresh.length) return 0;
  const { error: insErr } = await admin.from('tasks').insert(
    fresh.map((t) => ({
      organization_id: orgId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_date: t.due_date,
      assignee_id: t.assignee_id,
      entity_type: t.entity_type,
      entity_id: t.entity_id,
      source: 'automation',
      dedupe_key: t.dedupe_key,
    })),
  );
  if (insErr) throw new Error(insErr.message);
  return fresh.length;
}

// ── Digest quotidien / hebdomadaire ───────────────────────────────────────

async function maybeSendDigest(
  admin: SupabaseClient,
  org: { id: string; name: string },
  recipients: MemberRecipient[],
  settings: OrgNotificationSettings,
  now: Date,
): Promise<boolean> {
  const isMonday = now.getUTCDay() === 1;
  const today = now.toISOString().slice(0, 10);

  const wantDaily = settings.digest.daily;
  const wantWeekly = settings.digest.weekly && isMonday;
  if (!wantDaily && !wantWeekly) return false;

  const kindLabel = wantWeekly ? 'weekly' : 'daily';
  const dedupeKey = `digest:${kindLabel}:${today}`;
  const already = await lastDelivery(admin, org.id, dedupeKey, 'email');
  if (already) return false; // idempotence : un digest max par jour

  // Alertes actives via la RPC (service role → traverse RLS proprement).
  const { data: alerts, error } = await admin.rpc('compute_org_alerts', { org_id: org.id });
  if (error) throw new Error(error.message);
  const active = (alerts ?? []) as Array<{
    kind: string; priority: string; title: string; link: string | null; status: string;
  }>;
  const actionable = active.filter((a) => ['new', 'in_progress'].includes(a.status));
  if (actionable.length === 0) return false; // rien à signaler → pas d'email

  const byPriority = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
  for (const a of actionable) byPriority[a.priority] = (byPriority[a.priority] ?? 0) + 1;

  const top = actionable.slice(0, 10).map((a) => `• ${a.title}`);
  const targets = recipients.filter(
    (r) =>
      r.role === 'admin' &&
      (wantWeekly ? (r.prefs?.digest_weekly ?? true) : (r.prefs?.digest_daily ?? false)),
  );
  if (targets.length === 0) return false;

  const deliveries: DeliveryLog[] = [];
  for (const r of targets) {
    const locale: EmailLocale = r.preferred_locale === 'en' ? 'en' : 'fr';
    const res = await sendEmail({
      to: r.email,
      locale,
      subject: pick(
        locale,
        `${wantWeekly ? 'Récap hebdo' : 'Récap du jour'} — ${actionable.length} alerte${actionable.length > 1 ? 's' : ''} à traiter (${org.name})`,
        `${wantWeekly ? 'Weekly digest' : 'Daily digest'} — ${actionable.length} alert${actionable.length > 1 ? 's' : ''} to handle (${org.name})`,
      ),
      paragraphs: [
        pick(
          locale,
          `Situation au ${today.split('-').reverse().join('/')} : ${byPriority.critical} critique(s), ${byPriority.high} importante(s), ${byPriority.medium} modérée(s), ${byPriority.low} info(s).`,
          `As of ${today.split('-').reverse().join('/')}: ${byPriority.critical} critical, ${byPriority.high} important, ${byPriority.medium} moderate, ${byPriority.low} info.`,
        ),
        ...top,
        ...(actionable.length > 10
          ? [
              pick(
                locale,
                `… et ${actionable.length - 10} autres dans le centre d'alertes.`,
                `… and ${actionable.length - 10} more in the alert center.`,
              ),
            ]
          : []),
      ],
      cta: {
        label: pick(locale, "Ouvrir le centre d'alertes", 'Open the alert center'),
        url: `${APP_URL}/alerts`,
      },
      footnote: pick(
        locale,
        'Fréquence réglable dans Paramètres → Notifications.',
        'Frequency adjustable in Settings → Notifications.',
      ),
    });
    deliveries.push({
      organization_id: org.id, dedupe_key: dedupeKey, channel: 'email',
      user_id: r.user_id, recipient: r.email,
      status: res.sent ? 'sent' : 'failed', provider: 'resend', error: res.error ?? null,
    });
  }
  await logDeliveries(admin, deliveries);
  return deliveries.some((d) => d.status === 'sent');
}

// ── Point d'entrée ────────────────────────────────────────────────────────

export async function runAlertsEngine(now: Date = new Date()): Promise<EngineReport> {
  const admin = createAdminClient('system-cron');
  const { data: orgs, error } = await admin.from('organizations').select('id, name');
  if (error) throw new Error(error.message);

  const report: EngineReport = { ran_at: now.toISOString(), orgs: [] };
  for (const org of orgs ?? []) {
    try {
      report.orgs.push(await runOrgAlerts(admin, org as { id: string; name: string }, now));
    } catch (e) {
      logger.error(`[alerts-engine] org ${org.id} failed`, e);
      report.orgs.push({
        organization_id: org.id as string,
        name: (org.name as string) ?? '',
        detected: 0, created: 0, updated: 0, reopened: 0, auto_resolved: 0,
        notified_email: 0, notified_sms: 0, notified_in_app: 0, skipped: 0,
        digest_sent: false,
        tasks_created: 0,
        errors: [(e as Error).message],
      });
    }
  }

  // Battement de cœur : /api/health signalera l'absence de run.
  const hadErrors = report.orgs.some((o) => o.errors.length > 0);
  await recordHeartbeat(admin, 'alerts-engine', hadErrors ? 'error' : 'ok', {
    orgs: report.orgs.length,
    created: report.orgs.reduce((s, o) => s + o.created, 0),
  });

  return report;
}
