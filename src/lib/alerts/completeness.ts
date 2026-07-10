// =========================================================================
// Complétude du profil consultant — logique pure (testable sans DB)
// -------------------------------------------------------------------------
// Les exigences dépendent du STATUT CONTRACTUEL (consultants.contract_type) :
// on ne demande jamais un Kbis à un salarié (cdi/cdd), ni une attestation de
// portage à un freelance. Les organisations peuvent surcharger la liste des
// documents via la table document_requirements (migration 084) ; les champs
// d'identité/facturation restent portés par les défauts ci-dessous.
// =========================================================================

import type { ContractType } from '@/types';

export type CompletenessDocRequirement = {
  kind: string;
  label: string;
  required: boolean;
};

export type ConsultantForCompleteness = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  daily_rate_eur: number | null;
  contract_type: ContractType | null;
  status: string | null;
  city: string | null;
  address: string | null;
  legal_status: string | null;
  company_name: string | null;
  siret: string | null;
  iban: string | null;
  bic: string | null;
};

export type ConsultantDocForCompleteness = {
  kind: string;
  expires_at: string | null; // date ISO ou null (pas d'échéance)
};

export type MissingField = { key: string; label: string };

export type CompletenessResult = {
  /** 0-100 : proportion des exigences satisfaites (champs + docs requis). */
  percent: number;
  missingFields: MissingField[];
  missingDocuments: CompletenessDocRequirement[];
  expiredDocuments: Array<{ kind: string; label: string; expires_at: string }>;
  /** Documents expirant sous 30 jours (présents mais bientôt invalides). */
  expiringSoonDocuments: Array<{ kind: string; label: string; expires_at: string; days_left: number }>;
  complete: boolean;
};

// ── Champs de base exigés pour TOUT consultant actif ─────────────────────
const BASE_FIELDS: Array<{ key: keyof ConsultantForCompleteness; label: string }> = [
  { key: 'first_name', label: 'Prénom' },
  { key: 'last_name', label: 'Nom' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'job_title', label: 'Intitulé de poste' },
  { key: 'daily_rate_eur', label: 'TJM / coût' },
];

// ── Champs supplémentaires par statut (facturation/légal) ────────────────
const FIELDS_BY_TYPE: Partial<
  Record<ContractType, Array<{ key: keyof ConsultantForCompleteness; label: string }>>
> = {
  freelance: [
    { key: 'company_name', label: 'Raison sociale' },
    { key: 'siret', label: 'SIRET' },
    { key: 'address', label: 'Adresse du siège' },
    { key: 'iban', label: 'IBAN' },
  ],
  portage: [
    { key: 'company_name', label: 'Société de portage' },
    { key: 'address', label: 'Adresse' },
  ],
  cdi: [{ key: 'address', label: 'Adresse' }],
  cdd: [{ key: 'address', label: 'Adresse' }],
  partner_esn: [
    { key: 'company_name', label: 'ESN partenaire' },
    { key: 'siret', label: 'SIRET de l’ESN' },
  ],
};

// ── Documents requis par défaut, par statut ───────────────────────────────
// Vocabulaire aligné sur KycDocuments (kbis, id_card, rc_pro, rib) + slots
// additionnels gérés par document_requirements côté org.
export const DEFAULT_DOC_REQUIREMENTS: Partial<
  Record<ContractType, CompletenessDocRequirement[]>
> & { fallback: CompletenessDocRequirement[] } = {
  freelance: [
    { kind: 'id_card', label: 'Pièce d’identité', required: true },
    { kind: 'kbis', label: 'Kbis / justificatif d’immatriculation', required: true },
    { kind: 'urssaf_vigilance', label: 'Attestation de vigilance URSSAF', required: true },
    { kind: 'rc_pro', label: 'Assurance RC Pro', required: true },
    { kind: 'rib', label: 'RIB', required: true },
  ],
  portage: [
    { kind: 'id_card', label: 'Pièce d’identité', required: true },
    { kind: 'portage_attestation', label: 'Attestation de portage', required: true },
    { kind: 'rib', label: 'RIB (société de portage)', required: false },
  ],
  cdi: [
    { kind: 'id_card', label: 'Pièce d’identité', required: true },
    { kind: 'rib', label: 'RIB', required: true },
  ],
  cdd: [
    { kind: 'id_card', label: 'Pièce d’identité', required: true },
    { kind: 'rib', label: 'RIB', required: true },
  ],
  partner_esn: [
    { kind: 'kbis', label: 'Kbis de l’ESN partenaire', required: true },
    { kind: 'urssaf_vigilance', label: 'Attestation de vigilance URSSAF', required: true },
  ],
  // Statut inconnu / non renseigné : minimum vital, sans documents société.
  fallback: [{ kind: 'id_card', label: 'Pièce d’identité', required: true }],
};

/** Exigences documentaires effectives : overrides org sinon défauts statut. */
export function resolveDocRequirements(
  contractType: ContractType | null,
  orgOverrides: Array<{
    contract_type: string | null;
    kind: string;
    label: string;
    required: boolean;
    active: boolean;
  }> | null,
): CompletenessDocRequirement[] {
  // Overrides org : lignes actives dont contract_type correspond (NULL = tous).
  const matching = (orgOverrides ?? []).filter(
    (r) => r.active && (r.contract_type === null || r.contract_type === contractType),
  );
  if (matching.length > 0) {
    return matching.map((r) => ({ kind: r.kind, label: r.label, required: r.required }));
  }
  if (contractType && DEFAULT_DOC_REQUIREMENTS[contractType]) {
    return DEFAULT_DOC_REQUIREMENTS[contractType]!;
  }
  return DEFAULT_DOC_REQUIREMENTS.fallback;
}

function daysUntil(dateIso: string, today: Date): number {
  const d = new Date(dateIso + 'T00:00:00Z');
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((d.getTime() - t) / 86_400_000);
}

/**
 * Calcule la complétude d'un profil consultant.
 * Un document expiré compte comme MANQUANT (il ne protège plus l'org).
 */
export function computeCompleteness(
  consultant: ConsultantForCompleteness,
  documents: ConsultantDocForCompleteness[],
  docRequirements: CompletenessDocRequirement[],
  today: Date = new Date(),
): CompletenessResult {
  const fields = [
    ...BASE_FIELDS,
    ...(consultant.contract_type ? (FIELDS_BY_TYPE[consultant.contract_type] ?? []) : []),
  ];

  const missingFields: MissingField[] = fields
    .filter((f) => {
      const v = consultant[f.key];
      return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
    })
    .map((f) => ({ key: String(f.key), label: f.label }));

  const requiredDocs = docRequirements.filter((r) => r.required);
  const missingDocuments: CompletenessDocRequirement[] = [];
  const expiredDocuments: CompletenessResult['expiredDocuments'] = [];
  const expiringSoonDocuments: CompletenessResult['expiringSoonDocuments'] = [];

  for (const req of requiredDocs) {
    const docs = documents.filter((d) => d.kind === req.kind);
    if (docs.length === 0) {
      missingDocuments.push(req);
      continue;
    }
    // On retient le document le plus « longtemps valable » de ce type.
    const best = docs.reduce((a, b) => {
      if (a.expires_at === null) return a;
      if (b.expires_at === null) return b;
      return a.expires_at >= b.expires_at ? a : b;
    });
    if (best.expires_at !== null) {
      const left = daysUntil(best.expires_at, today);
      if (left < 0) {
        expiredDocuments.push({ kind: req.kind, label: req.label, expires_at: best.expires_at });
        missingDocuments.push(req); // expiré = ne couvre plus l'exigence
      } else if (left <= 30) {
        expiringSoonDocuments.push({
          kind: req.kind,
          label: req.label,
          expires_at: best.expires_at,
          days_left: left,
        });
      }
    }
  }

  const totalChecks = fields.length + requiredDocs.length;
  const failed = missingFields.length + missingDocuments.length;
  const percent =
    totalChecks === 0 ? 100 : Math.round(((totalChecks - failed) / totalChecks) * 100);

  return {
    percent,
    missingFields,
    missingDocuments,
    expiredDocuments,
    expiringSoonDocuments,
    complete: failed === 0,
  };
}
