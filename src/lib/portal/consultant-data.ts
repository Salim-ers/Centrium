// =========================================================================
// Données du portail consultant. Le consultant ne lit jamais `missions` ni
// `consultants` en direct (RLS) : tout passe par des fonctions en liste
// blanche (migrations 098 et 102), sans TJM de vente, marge ni notes
// internes.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consultant, PortalMission } from '@/types';

/** Colonnes renvoyées par portal_my_profile() — jamais de données internes. */
export type PortalProfile = Pick<
  Consultant,
  | 'id'
  | 'organization_id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'linkedin_url'
  | 'job_title'
  | 'sub_title'
  | 'seniority'
  | 'years_experience'
  | 'city'
  | 'country'
  | 'mobility'
  | 'languages'
  | 'contract_type'
  | 'status'
  | 'available_from'
  | 'summary'
> & {
  initials: string | null;
  current_client: string | null;
  current_mission_end: string | null;
  certifications?: unknown;
  address: string | null;
  postal_code: string | null;
  legal_status: string | null;
  company_name: string | null;
  siret: string | null;
  vat_number: string | null;
  iban: string | null;
  bic: string | null;
};

/** Même liste blanche que portal_my_profile() (migration 102). */
export const PORTAL_PROFILE_COLUMNS =
  'id, organization_id, first_name, last_name, initials, email, phone, linkedin_url, job_title, sub_title, seniority, years_experience, city, country, mobility, languages, contract_type, status, available_from, current_client, current_mission_end, summary, certifications, address, postal_code, legal_status, company_name, siret, vat_number, iban, bic, created_at, updated_at';

export async function fetchMyProfile(supabase: SupabaseClient): Promise<PortalProfile | null> {
  const { data, error } = await supabase.rpc('portal_my_profile');
  if (error || !data) return null;
  return data as PortalProfile;
}

export async function fetchMyMissions(supabase: SupabaseClient): Promise<PortalMission[]> {
  const { data, error } = await supabase.rpc('portal_my_missions');
  if (error || !data) return [];
  return data as PortalMission[];
}

/** Indépendant / portage / ESN partenaire : facture sa prestation à l'ESN. */
export function isIndependent(contractType: string | null | undefined): boolean {
  return contractType === 'freelance' || contractType === 'portage' || contractType === 'partner_esn';
}
