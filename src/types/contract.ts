// =========================================================================
// Types Contrats
// =========================================================================

export type ContractStatus =
  | 'draft'
  | 'pending_review'
  | 'sent'
  | 'signed'
  | 'active'
  | 'ended'
  | 'terminated'
  | 'cancelled';

export type ContractKind =
  | 'assistance_technique'
  | 'apport_affaire'
  | 'sous_traitance'
  | 'freelance_mission'
  | 'prestation_client'
  | 'nda'
  | 'amendment';

/** Contrepartie d'un document (contrat / facture) : entreprise cliente ou consultant freelance. */
export type DocumentParty = 'client' | 'consultant';

export type Contract = {
  id: string;
  organization_id: string;
  created_by: string | null;
  contract_number: string;
  kind: ContractKind;
  status: ContractStatus;
  title: string;
  /** Contrepartie : 'client' (contrat de prestation entreprise) ou 'consultant' (sous-traitance freelance). */
  party: DocumentParty;
  /** Entreprise cliente signataire (party='client'). */
  company_id: string | null;
  consultant_id: string | null;
  supplier_company_name: string | null;
  supplier_address: string | null;
  supplier_postal_code: string | null;
  supplier_city: string | null;
  supplier_rcs: string | null;
  supplier_representative: string | null;
  supplier_email: string | null;
  mission_id: string | null;
  mission_title: string | null;
  client_name: string | null;
  client_address: string | null;
  work_location: string | null;
  remote_days_per_week: number;
  start_date: string;
  duration_months: number;
  end_date: string | null;
  daily_rate_eur: number;
  payment_terms_days: number;
  billing_email: string | null;
  non_compete_months: number;
  non_compete_penalty: string | null;
  jurisdiction_city: string;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string | null;
  /** Signature manuscrite du consultant (PNG dataURL, tracée au portail). */
  consultant_signature_data: string | null;
  consultant_signed_name: string | null;
  consultant_signed_at: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
