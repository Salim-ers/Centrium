import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Erreur levée quand une limite de plan est atteinte.
 * À attraper dans les Route Handlers pour retourner un 402 user-friendly.
 */
export class PlanLimitError extends Error {
  constructor(
    public readonly resource: string,
    public readonly limit: number,
    public readonly planName: string,
  ) {
    super(
      `Limite atteinte : ${limit} ${resource} max sur le plan ${planName}. Upgrade pour continuer.`,
    );
    this.name = 'PlanLimitError';
  }
}

type SubWithPlan = {
  plan_id: string;
  plans: { name: string; max_consultants: number | null } | null;
};

/**
 * Vérifie que l'organisation peut créer un consultant de plus selon son plan.
 * À appeler dans les services/API qui créent un consultant.
 *
 * Si la limite est atteinte → throw PlanLimitError.
 * Si plan enterprise ou custom (max_consultants=NULL) → pass-through.
 */
export async function enforceConsultantLimit(organizationId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: sub } = (await admin
    .from('subscriptions')
    .select('plan_id, plans(name, max_consultants)')
    .eq('organization_id', organizationId)
    .single()) as { data: SubWithPlan | null };

  const max = sub?.plans?.max_consultants;
  if (max === null || max === undefined) return; // illimité

  const { count } = await admin
    .from('consultants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('archived', false);

  if ((count ?? 0) >= max) {
    throw new PlanLimitError('consultants', max, sub?.plans?.name ?? 'current');
  }
}

/**
 * Vérifie que l'organisation peut ajouter un membre de plus selon son plan.
 */
export async function enforceMemberLimit(organizationId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: sub } = (await admin
    .from('subscriptions')
    .select('plan_id, plans(name, max_users)')
    .eq('organization_id', organizationId)
    .single()) as unknown as {
    data: { plan_id: string; plans: { name: string; max_users: number | null } | null } | null;
  };

  const max = sub?.plans?.max_users;
  if (max === null || max === undefined) return;

  const { count } = await admin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if ((count ?? 0) >= max) {
    throw new PlanLimitError('membres', max, sub?.plans?.name ?? 'current');
  }
}
