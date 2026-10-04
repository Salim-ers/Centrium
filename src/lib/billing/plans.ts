// =========================================================================
// Catalogue des plans (partagé navigateur / serveur). Les montants et
// limites reflètent la migration 099 ; la base reste la source pour les
// limites appliquées (plans.max_users / max_consultants).
// =========================================================================

/** Offres historiques : conservées pour les abonnés existants, plus proposées. */
export const LEGACY_PLAN_IDS = ['starter', 'growth', 'enterprise'] as const;
/** Offres V2 souscriptibles en ligne (Stripe Checkout). */
export const SELF_SERVICE_PLAN_IDS = ['v2_starter', 'v2_team', 'v2_growth'] as const;
/** Offres V2 affichées publiquement (Scale : sur devis). */
export const PUBLIC_PLAN_IDS = ['v2_starter', 'v2_team', 'v2_growth', 'v2_scale'] as const;

export type LegacyPlanId = (typeof LEGACY_PLAN_IDS)[number];
export type SelfServicePlanId = (typeof SELF_SERVICE_PLAN_IDS)[number];
export type PublicPlanId = (typeof PUBLIC_PLAN_IDS)[number];
export type KnownPlanId = LegacyPlanId | PublicPlanId;
export type BillingInterval = 'month' | 'year';

export type PlanInfo = {
  id: PublicPlanId;
  name: string;
  monthlyEur: number;
  /** Prix annuel (10 mois facturés pour 12). null : sur devis. */
  yearlyEur: number | null;
  managers: number | null;
  consultants: number | null;
  selfService: boolean;
  highlighted: boolean;
};

export const PLAN_CATALOG: Record<PublicPlanId, PlanInfo> = {
  v2_starter: { id: 'v2_starter', name: 'Starter', monthlyEur: 49, yearlyEur: 490, managers: 2, consultants: 10, selfService: true, highlighted: false },
  v2_team: { id: 'v2_team', name: 'Team', monthlyEur: 99, yearlyEur: 990, managers: 5, consultants: 30, selfService: true, highlighted: true },
  v2_growth: { id: 'v2_growth', name: 'Growth', monthlyEur: 179, yearlyEur: 1790, managers: 10, consultants: 100, selfService: true, highlighted: false },
  v2_scale: { id: 'v2_scale', name: 'Scale', monthlyEur: 299, yearlyEur: null, managers: null, consultants: null, selfService: false, highlighted: false },
};

const LEGACY_LABEL: Record<LegacyPlanId, { fr: string; en: string }> = {
  starter: { fr: 'Starter (offre historique)', en: 'Starter (legacy)' },
  growth: { fr: 'Medium (offre historique)', en: 'Medium (legacy)' },
  enterprise: { fr: 'Illimité (offre historique)', en: 'Unlimited (legacy)' },
};

export function isSelfServicePlan(id: string | null | undefined): id is SelfServicePlanId {
  return !!id && (SELF_SERVICE_PLAN_IDS as readonly string[]).includes(id);
}

export function isKnownPlan(id: string | null | undefined): id is KnownPlanId {
  return !!id && ((LEGACY_PLAN_IDS as readonly string[]).includes(id) || (PUBLIC_PLAN_IDS as readonly string[]).includes(id));
}

/** Libellé lisible d'un plan, offres historiques comprises. */
export function planLabel(id: string | null | undefined, lang: 'fr' | 'en' = 'fr'): string {
  if (!id) return '—';
  if ((LEGACY_PLAN_IDS as readonly string[]).includes(id)) return LEGACY_LABEL[id as LegacyPlanId][lang];
  const p = PLAN_CATALOG[id as PublicPlanId];
  if (!p) return id;
  if (lang === 'en') return p.selfService ? `${p.name} — €${p.monthlyEur} excl. VAT/month` : `${p.name} — from €${p.monthlyEur} excl. VAT/month`;
  return p.selfService ? `${p.name} — ${p.monthlyEur} € HT/mois` : `${p.name} — dès ${p.monthlyEur} € HT/mois`;
}

/** Plan supérieur suggéré quand une limite est atteinte. */
export function nextPlan(id: string | null | undefined): PublicPlanId | null {
  switch (id) {
    case 'v2_starter':
    case 'starter':
      return 'v2_team';
    case 'v2_team':
    case 'growth':
      return 'v2_growth';
    case 'v2_growth':
    case 'enterprise':
      return 'v2_scale';
    default:
      return null;
  }
}
