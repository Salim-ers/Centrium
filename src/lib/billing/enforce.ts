import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// Enforcement des limites de plan Centrium
// -------------------------------------------------------------------------
// 5 ressources gatées par plan :
//   - consultants          (soft cap ; extras facturés à l'usage — voir
//                          plans.consultants_included + price_per_extra_...)
//   - members              (hard cap ; users internes + invites pending)
//   - opportunities        (hard cap ; opportunités non won/lost/on_hold)
//   - contacts             (hard cap ; carnet CRM)
//   - missions             (hard cap ; missions status='active')
//
// Chaque enforce*Limit throw PlanLimitError si le prochain create dépasserait
// le plafond. Les Route Handlers attrapent et retournent 402 via
// planLimitResponse(err). Client → PlanLimitDialog upsell.
//
// Trial expiration :
//   ensureTrialNotExpired throw TrialExpiredError si le trial 14j est
//   dépassé sans checkout. Middleware l'utilise pour bloquer l'app (sauf
//   /billing et /auth) et pousser l'user vers l'upgrade.
//
// Bypass total : is_exempt_from_billing=true (fondateurs, partenaires,
// internes) → aucune enforcement, jamais.
// =========================================================================

export type QuotaResource =
  | 'consultants'
  | 'members'
  | 'opportunities'
  | 'contacts'
  | 'missions';

export class PlanLimitError extends Error {
  constructor(
    public readonly resource: QuotaResource,
    public readonly limit: number,
    public readonly used: number,
    public readonly planId: string,
    public readonly planName: string,
  ) {
    super(
      `Limite atteinte : ${limit} ${resource} max sur le plan ${planName} (${used} utilisés). Upgrade pour continuer.`,
    );
    this.name = 'PlanLimitError';
  }
}

export class TrialExpiredError extends Error {
  constructor(
    public readonly planId: string,
    public readonly planName: string,
    public readonly trialEnd: string,
  ) {
    super(
      `Période d'essai terminée depuis ${trialEnd}. Choisis un plan pour continuer à utiliser Centrium.`,
    );
    this.name = 'TrialExpiredError';
  }
}

type SubWithPlan = {
  plan_id: string;
  status: string | null;
  trial_end: string | null;
  is_exempt_from_billing: boolean | null;
  plans: {
    id: string;
    name: string;
    max_consultants: number | null;
    max_users: number | null;
    max_open_opportunities: number | null;
    max_contacts: number | null;
    max_active_missions: number | null;
  } | null;
};

async function fetchSub(organizationId: string): Promise<SubWithPlan | null> {
  const admin = createAdminClient('cross-org-query');
  const { data } = (await admin
    .from('subscriptions')
    .select(
      'plan_id, status, trial_end, is_exempt_from_billing, plans(id, name, max_consultants, max_users, max_open_opportunities, max_contacts, max_active_missions)',
    )
    .eq('organization_id', organizationId)
    .maybeSingle()) as { data: SubWithPlan | null };
  return data;
}

// -------- Counters --------------------------------------------------------

async function countConsultants(organizationId: string): Promise<number> {
  const admin = createAdminClient('cross-org-query');
  const { count } = await admin
    .from('consultants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('archived', false);
  return count ?? 0;
}

async function countInternalMembers(organizationId: string): Promise<number> {
  const admin = createAdminClient('cross-org-query');
  const { count } = await admin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('role', 'consultant');
  return count ?? 0;
}

async function countPendingInvites(organizationId: string): Promise<number> {
  const admin = createAdminClient('cross-org-query');
  const { count } = await admin
    .from('organization_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('role', 'consultant')
    .is('accepted_at', null);
  return count ?? 0;
}

async function countOpenOpportunities(organizationId: string): Promise<number> {
  const admin = createAdminClient('cross-org-query');
  const { count } = await admin
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .not('status', 'in', '(won,lost,on_hold)');
  return count ?? 0;
}

async function countContacts(organizationId: string): Promise<number> {
  const admin = createAdminClient('cross-org-query');
  const { count } = await admin
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  return count ?? 0;
}

async function countActiveMissions(organizationId: string): Promise<number> {
  const admin = createAdminClient('cross-org-query');
  const { count } = await admin
    .from('missions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  return count ?? 0;
}

// -------- Enforce helpers -------------------------------------------------

function raiseIfOver(
  resource: QuotaResource,
  used: number,
  extra: number,
  max: number | null | undefined,
  sub: SubWithPlan | null,
): void {
  if (max === null || max === undefined) return; // unlimited
  if (used + extra > max) {
    throw new PlanLimitError(
      resource,
      max,
      used,
      sub?.plans?.id ?? sub?.plan_id ?? 'starter',
      sub?.plans?.name ?? 'current',
    );
  }
}

export async function enforceConsultantLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (sub?.is_exempt_from_billing) return;
  const used = await countConsultants(organizationId);
  raiseIfOver('consultants', used, extra, sub?.plans?.max_consultants, sub);
}

export async function enforceMemberLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (sub?.is_exempt_from_billing) return;
  const [members, invites] = await Promise.all([
    countInternalMembers(organizationId),
    countPendingInvites(organizationId),
  ]);
  raiseIfOver('members', members + invites, extra, sub?.plans?.max_users, sub);
}

export async function enforceOpportunityLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (sub?.is_exempt_from_billing) return;
  const used = await countOpenOpportunities(organizationId);
  raiseIfOver('opportunities', used, extra, sub?.plans?.max_open_opportunities, sub);
}

export async function enforceContactLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (sub?.is_exempt_from_billing) return;
  const used = await countContacts(organizationId);
  raiseIfOver('contacts', used, extra, sub?.plans?.max_contacts, sub);
}

export async function enforceMissionLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (sub?.is_exempt_from_billing) return;
  const used = await countActiveMissions(organizationId);
  raiseIfOver('missions', used, extra, sub?.plans?.max_active_missions, sub);
}

// -------- Trial expiration ------------------------------------------------

/**
 * Check idempotent : le trial 14j est-il dépassé ?
 * Throw TrialExpiredError si oui. Middleware attrape et redirige.
 *
 * Règles :
 *   - is_exempt_from_billing → jamais expiré (fondateurs / partenaires)
 *   - status ≠ 'trialing' → n'a plus rien à voir avec le trial (active,
 *     canceled, past_due, etc.) → pass-through
 *   - trial_end NULL → pas de deadline → pass-through (sécurité fail-open)
 *   - trial_end < NOW() → THROW
 */
export async function ensureTrialNotExpired(
  organizationId: string,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (!sub) return;
  if (sub.is_exempt_from_billing) return;
  if (sub.status !== 'trialing') return;
  if (!sub.trial_end) return;
  if (new Date(sub.trial_end) < new Date()) {
    throw new TrialExpiredError(
      sub.plans?.id ?? sub.plan_id,
      sub.plans?.name ?? 'Starter',
      sub.trial_end,
    );
  }
}

/**
 * Non-throwing version pour le middleware. Retourne true si le trial est
 * expiré et l'user doit être redirigé vers /billing.
 */
export async function isTrialExpired(organizationId: string): Promise<boolean> {
  try {
    await ensureTrialNotExpired(organizationId);
    return false;
  } catch (e) {
    return e instanceof TrialExpiredError;
  }
}

// -------- Snapshot pour l'UI ----------------------------------------------

export type QuotaUsage = {
  planId: string;
  planName: string;
  status: string | null;
  trialEnd: string | null;
  trialExpired: boolean;
  exempt: boolean;
  consultants: { used: number; max: number | null };
  members: { used: number; max: number | null };
  opportunities: { used: number; max: number | null };
  contacts: { used: number; max: number | null };
  missions: { used: number; max: number | null };
};

export async function getQuotaUsage(organizationId: string): Promise<QuotaUsage> {
  const sub = await fetchSub(organizationId);
  const exempt = !!sub?.is_exempt_from_billing;
  const [consultants, members, invites, opportunities, contacts, missions] =
    await Promise.all([
      countConsultants(organizationId),
      countInternalMembers(organizationId),
      countPendingInvites(organizationId),
      countOpenOpportunities(organizationId),
      countContacts(organizationId),
      countActiveMissions(organizationId),
    ]);
  const trialEnd = sub?.trial_end ?? null;
  const trialExpired =
    !exempt &&
    sub?.status === 'trialing' &&
    !!trialEnd &&
    new Date(trialEnd) < new Date();
  return {
    planId: sub?.plan_id ?? 'starter',
    planName: sub?.plans?.name ?? 'Starter',
    status: sub?.status ?? null,
    trialEnd,
    trialExpired,
    exempt,
    consultants: {
      used: consultants,
      max: exempt ? null : (sub?.plans?.max_consultants ?? null),
    },
    members: {
      used: members + invites,
      max: exempt ? null : (sub?.plans?.max_users ?? null),
    },
    opportunities: {
      used: opportunities,
      max: exempt ? null : (sub?.plans?.max_open_opportunities ?? null),
    },
    contacts: {
      used: contacts,
      max: exempt ? null : (sub?.plans?.max_contacts ?? null),
    },
    missions: {
      used: missions,
      max: exempt ? null : (sub?.plans?.max_active_missions ?? null),
    },
  };
}

// -------- Réponses HTTP standardisées -------------------------------------

export function planLimitResponse(err: PlanLimitError) {
  return {
    error: 'plan_limit_reached',
    resource: err.resource,
    limit: err.limit,
    used: err.used,
    planId: err.planId,
    planName: err.planName,
    message: err.message,
  };
}

export function trialExpiredResponse(err: TrialExpiredError) {
  return {
    error: 'trial_expired',
    planId: err.planId,
    planName: err.planName,
    trialEnd: err.trialEnd,
    message: err.message,
  };
}
