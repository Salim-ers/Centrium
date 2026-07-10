import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

// =========================================================================
// Export des données d'une ORGANISATION (portabilité RGPD, art. 20)
// -------------------------------------------------------------------------
// L'export /api/me/export est PERSONNEL et exclut les données métier. Ici on
// assemble l'intégralité des données dont l'ORGANISATION est responsable de
// traitement : consultants, contacts, sociétés, offres, opportunités,
// missions, contrats, CRA et factures. Utilisé par :
//   - l'admin de l'org (self-service, avant de quitter Centrium)
//   - la super-console, AVANT toute suppression définitive d'une org.
//
// Reçoit un client déjà autorisé (service_role côté route admin, ou client
// RLS de l'admin). On scope tout par organization_id explicitement.
// =========================================================================

export type OrgExportBundle = {
  meta: {
    generated_at: string;
    format: 'centrium-org-export-v1';
    organization_id: string;
    notice: string;
    counts: Record<string, number>;
  };
  organization: unknown;
  consultants: unknown[];
  consultant_skills: unknown[];
  consultant_experiences: unknown[];
  companies: unknown[];
  contacts: unknown[];
  job_offers: unknown[];
  opportunities: unknown[];
  missions: unknown[];
  contracts: unknown[];
  timesheets: unknown[];
  invoices: unknown[];
  members: unknown[];
};

async function fetchAll(
  db: SupabaseClient,
  table: string,
  orgId: string,
  select = '*',
): Promise<unknown[]> {
  const { data, error } = await db.from(table).select(select).eq('organization_id', orgId);
  if (error) throw new Error(`export ${table}: ${error.message}`);
  return data ?? [];
}

export async function buildOrgExport(
  db: SupabaseClient,
  orgId: string,
): Promise<OrgExportBundle> {
  const [
    organization,
    consultants,
    companies,
    contacts,
    job_offers,
    opportunities,
    missions,
    contracts,
    timesheets,
    invoices,
    members,
  ] = await Promise.all([
    db.from('organizations').select('*').eq('id', orgId).maybeSingle().then((r) => r.data ?? null),
    fetchAll(db, 'consultants', orgId),
    fetchAll(db, 'companies', orgId),
    fetchAll(db, 'contacts', orgId),
    fetchAll(db, 'job_offers', orgId),
    fetchAll(db, 'opportunities', orgId),
    fetchAll(db, 'missions', orgId),
    fetchAll(db, 'contracts', orgId),
    fetchAll(db, 'timesheets', orgId),
    fetchAll(db, 'invoices', orgId),
    db
      .from('organization_members')
      .select('user_id, role, joined_at')
      .eq('organization_id', orgId)
      .then((r) => r.data ?? []),
  ]);

  // Sous-entités des consultants (skills, expériences) : filtrées via la liste
  // des consultants de l'org (pas de colonne organization_id directe).
  const consultantIds = (consultants as Array<{ id: string }>).map((c) => c.id);
  let consultant_skills: unknown[] = [];
  let consultant_experiences: unknown[] = [];
  if (consultantIds.length > 0) {
    const [sk, ex] = await Promise.all([
      db.from('consultant_skills').select('*').in('consultant_id', consultantIds),
      db.from('consultant_experiences').select('*').in('consultant_id', consultantIds),
    ]);
    consultant_skills = sk.data ?? [];
    consultant_experiences = ex.data ?? [];
  }

  const counts: Record<string, number> = {
    consultants: consultants.length,
    consultant_skills: consultant_skills.length,
    consultant_experiences: consultant_experiences.length,
    companies: companies.length,
    contacts: contacts.length,
    job_offers: job_offers.length,
    opportunities: opportunities.length,
    missions: missions.length,
    contracts: contracts.length,
    timesheets: timesheets.length,
    invoices: invoices.length,
    members: (members as unknown[]).length,
  };

  return {
    meta: {
      generated_at: new Date().toISOString(),
      format: 'centrium-org-export-v1',
      organization_id: orgId,
      notice:
        "Export complet des données de l'organisation (portabilité, art. 20 RGPD). " +
        'Généré par Centrium. Les documents/fichiers stockés (CV, PDF) ne sont pas ' +
        'inclus dans ce JSON — ils restent téléchargeables individuellement.',
      counts,
    },
    organization,
    consultants,
    consultant_skills,
    consultant_experiences,
    companies,
    contacts,
    job_offers,
    opportunities,
    missions,
    contracts,
    timesheets,
    invoices,
    members,
  };
}

/** Aplati une table en CSV (utilisé pour l'export comptable / tabulaire). */
export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(';');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(';')).join('\n');
  return `${header}\n${body}`;
}
