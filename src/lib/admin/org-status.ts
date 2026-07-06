// =========================================================================
// Dérivation du statut d'abonnement pour la supervision super-console.
// Traduit (status Stripe + trial_end/period_end + exempt) en un libellé
// lisible, une tonalité couleur, et une CATÉGORIE pour le filtrage.
// Module pur — réutilisé par la liste et la fiche d'organisation.
// =========================================================================

export type OrgStatusTone = 'success' | 'warning' | 'danger' | 'violet' | 'neutral';
export type OrgStatusCategory = 'active' | 'trial' | 'risk' | 'exempt';

export type OrgStatusInput = {
  sub_status?: string | null;
  status?: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  is_exempt?: boolean | null;
  is_exempt_from_billing?: boolean | null;
};

export type OrgStatus = {
  label: string;
  tone: OrgStatusTone;
  category: OrgStatusCategory;
  /** Jours restants (essai ou grâce) quand pertinent, sinon null. */
  daysLeft: number | null;
};

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function deriveOrgStatus(input: OrgStatusInput): OrgStatus {
  const status = input.sub_status ?? input.status ?? null;
  const exempt = input.is_exempt ?? input.is_exempt_from_billing ?? false;
  const trialLeft = daysUntil(input.trial_end);
  const periodLeft = daysUntil(input.current_period_end);

  if (exempt) {
    return { label: 'Exempt', tone: 'violet', category: 'exempt', daysLeft: null };
  }
  if (!status) {
    return { label: 'Sans abonnement', tone: 'neutral', category: 'risk', daysLeft: null };
  }

  switch (status) {
    case 'active':
      return { label: 'Actif', tone: 'success', category: 'active', daysLeft: null };
    case 'trialing':
      if (trialLeft !== null && trialLeft < 0) {
        return { label: 'Essai expiré', tone: 'danger', category: 'risk', daysLeft: trialLeft };
      }
      return { label: 'Essai', tone: 'warning', category: 'trial', daysLeft: trialLeft };
    case 'canceled':
      if (periodLeft !== null && periodLeft >= 0) {
        return { label: 'Résiliation programmée', tone: 'warning', category: 'active', daysLeft: periodLeft };
      }
      return { label: 'Expiré', tone: 'danger', category: 'risk', daysLeft: null };
    case 'past_due':
    case 'unpaid':
      return { label: 'Impayé', tone: 'danger', category: 'risk', daysLeft: null };
    case 'incomplete':
    case 'incomplete_expired':
      return { label: 'Paiement incomplet', tone: 'danger', category: 'risk', daysLeft: null };
    case 'paused':
      return { label: 'En pause', tone: 'neutral', category: 'risk', daysLeft: null };
    default:
      return { label: status, tone: 'neutral', category: 'risk', daysLeft: null };
  }
}
