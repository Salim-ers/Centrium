import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Erreur levée quand une limite de plan est atteinte.
 * À attraper dans les Route Handlers pour retourner un 402 user-friendly.
 */
export class PlanLimitError extends Error {
  constructor(
    public readonly resource: 'consultants' | 'members',
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

type SubWithPlan = {
  plan_id: string;
  is_exempt_from_billing: boolean | null;
  plans: {
    id: string;
    name: string;
    max_consultants: number | null;
    max_users: number | null;
  } | null;
};

async function fetchSub(organizationId: string) {
  const admin = createAdminClient();
  const { data } = (await admin
    .from('subscriptions')
    .select('plan_id, is_exempt_from_billing, plans(id, name, max_consultants, max_users)')
    .eq('organization_id', organizationId)
    .maybeSingle()) as { data: SubWithPlan | null };
  return data;
}

async function countConsultants(organizationId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('consultants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('archived', false);
  return count ?? 0;
}

async function countInternalMembers(organizationId: string): Promise<number> {
  // Les "utilisateurs internes" = admin, business_manager, recruiter,
  // finance, viewer. Les consultants ont leur propre quota séparé via
  // max_consultants, on ne les compte donc pas ici.
  const admin = createAdminClient();
  const { count } = await admin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('role', 'consultant');
  return count ?? 0;
}

async function countPendingInvites(organizationId: string): Promise<number> {
  // Les invitations en attente comptent dans le quota — sinon un admin
  // pourrait spammer N invites au-delà de la limite et toutes les voir
  // acceptées d'un coup.
  const admin = createAdminClient();
  const { count } = await admin
    .from('organization_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('role', 'consultant')
    .is('accepted_at', null);
  return count ?? 0;
}

/**
 * Vérifie qu'on peut créer un consultant supplémentaire.
 * Si la limite est atteinte → throw PlanLimitError.
 * Si plan enterprise / illimité (max_consultants=NULL) → pass-through.
 *
 * @param extra Nombre de consultants qu'on s'apprête à créer (défaut 1).
 *              Utilisé par l'import CSV pour pré-checker un lot.
 */
export async function enforceConsultantLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  // Orgs exemptes de facturation (fondateurs, partenaires, internes) :
  // jamais bloquées, peu importe le plan technique attaché.
  if (sub?.is_exempt_from_billing) return;
  const max = sub?.plans?.max_consultants;
  if (max === null || max === undefined) return;
  const used = await countConsultants(organizationId);
  if (used + extra > max) {
    throw new PlanLimitError(
      'consultants',
      max,
      used,
      sub?.plans?.id ?? sub?.plan_id ?? 'starter',
      sub?.plans?.name ?? 'current',
    );
  }
}

/**
 * Vérifie qu'on peut ajouter un utilisateur interne supplémentaire
 * (membre admin/BM/recruteur/finance/viewer ou invitation pending).
 */
export async function enforceMemberLimit(
  organizationId: string,
  extra: number = 1,
): Promise<void> {
  const sub = await fetchSub(organizationId);
  if (sub?.is_exempt_from_billing) return;
  const max = sub?.plans?.max_users;
  if (max === null || max === undefined) return;
  const [members, invites] = await Promise.all([
    countInternalMembers(organizationId),
    countPendingInvites(organizationId),
  ]);
  const used = members + invites;
  if (used + extra > max) {
    throw new PlanLimitError(
      'members',
      max,
      used,
      sub?.plans?.id ?? sub?.plan_id ?? 'starter',
      sub?.plans?.name ?? 'current',
    );
  }
}

/**
 * Renvoie l'usage actuel + les limites pour l'UI (compteurs, bandeaux,
 * dialog "Limite atteinte"). Pas de throw, jamais d'erreur fatale.
 */
export async function getQuotaUsage(organizationId: string): Promise<{
  planId: string;
  planName: string;
  exempt: boolean;
  consultants: { used: number; max: number | null };
  members: { used: number; max: number | null };
}> {
  const sub = await fetchSub(organizationId);
  const exempt = !!sub?.is_exempt_from_billing;
  const [consultants, members, invites] = await Promise.all([
    countConsultants(organizationId),
    countInternalMembers(organizationId),
    countPendingInvites(organizationId),
  ]);
  return {
    planId: sub?.plan_id ?? 'starter',
    planName: sub?.plans?.name ?? 'Starter',
    exempt,
    consultants: {
      used: consultants,
      // Orgs exemptes : pas de plafond. UI affichera "X / illimité".
      max: exempt ? null : (sub?.plans?.max_consultants ?? null),
    },
    members: {
      used: members + invites,
      max: exempt ? null : (sub?.plans?.max_users ?? null),
    },
  };
}

/**
 * Sérialise une PlanLimitError en payload JSON pour la réponse 402.
 * Le client utilise ces champs pour afficher la dialog d'upgrade.
 */
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
