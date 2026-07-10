import { createClient } from '@/lib/supabase/client';
import type {
  Opportunity,
  OpportunityStatus,
  Contact,
  ContactInteraction,
  ContactInteractionKind,
  Invoice,
  InvoiceStatus,
  Alert,
  AlertStatus,
  AlertComment,
  AppNotification,
  NotificationDelivery,
  ServiceResult,
  Company,
  Timesheet,
  Mission,
  Consultant,
  JobOffer,
} from '@/types';
import type {
  OpportunityInput,
  ContactInput,
  InvoiceInput,
  TimesheetInput,
  JobOfferInput,
} from '@/lib/validators';

// =========================================================================
// Helpers anti-doublon
// =========================================================================

/**
 * Détecte un conflit d'unicité sur (org, email) côté contacts (cf. migration
 * 055) et renvoie un Error avec un message explicite que les dialogs CRUD
 * peuvent toaster directement. Les autres erreurs sont passées telles quelles.
 *
 * Postgres renvoie code='23505' pour une violation d'index unique ;
 * Supabase expose ça dans `error.code`. On garde aussi un fallback regex
 * sur le nom de l'index au cas où.
 */
type PgLikeError = Error & { code?: string };

function mapContactDuplicate(error: Error & { code?: string }, email?: string | null): PgLikeError {
  const isDup =
    error.code === '23505' || /contacts_org_email_active_unique/i.test(error.message);
  if (!isDup) return error;
  const target = email?.trim() ? ` (${email.trim()})` : '';
  // On ne mute pas l'erreur d'origine : on retourne une copie qui conserve
  // .code (utile pour discriminer côté UI) et hérite du nom "Error".
  const friendly: PgLikeError = Object.assign(
    new Error(
      `Ce contact${target} existe déjà dans le carnet. Édite la fiche existante au lieu d'en créer une nouvelle.`,
    ),
    { code: error.code },
  );
  return friendly;
}

// =========================================================================
// Opportunities
// =========================================================================

export const opportunityService = {
  async list(): Promise<ServiceResult<Opportunity[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Opportunity[], error: null };
  },

  async create(
    input: OpportunityInput,
    organizationId: string
  ): Promise<ServiceResult<Opportunity>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunities')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();
    if (error) return { data: null, error };

    await supabase.from('activities').insert({
      organization_id: organizationId,
      entity_type: 'opportunity',
      entity_id: data.id,
      action: 'created',
    });

    return { data: data as Opportunity, error: null };
  },

  async updateStatus(id: string, status: OpportunityStatus): Promise<ServiceResult<Opportunity>> {
    const supabase = createClient();
    const patch: Record<string, unknown> = { status, last_interaction: new Date().toISOString() };
    const { data, error } = await supabase
      .from('opportunities')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Opportunity, error: null };
  },

  async update(
    id: string,
    input: Partial<OpportunityInput>
  ): Promise<ServiceResult<Opportunity>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunities')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Opportunity, error: null };
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },
};

// =========================================================================
// Job offers (missions clients — ce qu'on matche avec les consultants)
// =========================================================================

export const jobOfferService = {
  // List reste en lecture directe Supabase (RLS SELECT OK, plus rapide)
  async list(
    statusFilter?: 'open' | 'closed' | 'won' | 'lost' | 'all',
    /**
     * - false (défaut) → uniquement les offres actives
     * - true           → uniquement les offres archivées
     * - 'all'          → les deux
     */
    archived: boolean | 'all' = false,
  ): Promise<ServiceResult<JobOffer[]>> {
    const supabase = createClient();
    let query = supabase.from('job_offers').select('*');
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (archived !== 'all') {
      query = query.eq('archived', archived);
    }
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as JobOffer[], error: null };
  },

  // Mutations via route handlers serveur — plus robuste, messages d'erreurs lisibles
  async create(input: JobOfferInput): Promise<ServiceResult<JobOffer>> {
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: null, error: { message: body.message ?? body.error ?? 'Création impossible' } as any };
      }
      return { data: body.data as JobOffer, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } as any };
    }
  },

  async update(
    id: string,
    input: Partial<JobOfferInput> & { status?: string; archived?: boolean },
  ): Promise<ServiceResult<JobOffer>> {
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: null, error: { message: body.message ?? body.error ?? 'Mise à jour impossible' } as any };
      }
      return { data: body.data as JobOffer, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } as any };
    }
  },

  async remove(id: string): Promise<ServiceResult<boolean>> {
    try {
      const res = await fetch(`/api/offers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { data: null, error: { message: body.message ?? 'Suppression impossible' } as any };
      }
      return { data: true, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } as any };
    }
  },

  // ─── Bulk operations (direct Supabase — RLS applique l'isolation org) ────
  async archiveMany(ids: string[]): Promise<ServiceResult<number>> {
    if (ids.length === 0) return { data: 0, error: null };
    const supabase = createClient();
    const { error, count } = await supabase
      .from('job_offers')
      .update({ archived: true }, { count: 'exact' })
      .in('id', ids);
    if (error) return { data: null, error };
    return { data: count ?? ids.length, error: null };
  },

  async unarchiveMany(ids: string[]): Promise<ServiceResult<number>> {
    if (ids.length === 0) return { data: 0, error: null };
    const supabase = createClient();
    const { error, count } = await supabase
      .from('job_offers')
      .update({ archived: false }, { count: 'exact' })
      .in('id', ids);
    if (error) return { data: null, error };
    return { data: count ?? ids.length, error: null };
  },

  async deleteMany(ids: string[]): Promise<ServiceResult<number>> {
    if (ids.length === 0) return { data: 0, error: null };
    const supabase = createClient();
    const { error, count } = await supabase
      .from('job_offers')
      .delete({ count: 'exact' })
      .in('id', ids);
    if (error) return { data: null, error };
    return { data: count ?? ids.length, error: null };
  },
};

// =========================================================================
// Contacts & Companies
// =========================================================================

export const contactService = {
  async list(search?: string): Promise<ServiceResult<Contact[]>> {
    const supabase = createClient();
    let query = supabase.from('contacts').select('*').eq('archived', false);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    const { data, error } = await query.order('last_interaction', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Contact[], error: null };
  },

  async create(input: ContactInput, organizationId: string): Promise<ServiceResult<Contact>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();
    if (error) return { data: null, error: mapContactDuplicate(error, input.email) };
    return { data: data as Contact, error: null };
  },

  async update(id: string, input: Partial<ContactInput>): Promise<ServiceResult<Contact>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: mapContactDuplicate(error, input.email) };
    return { data: data as Contact, error: null };
  },

  async archive(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('contacts').update({ archived: true }).eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  /**
   * Marque le contact comme "vient d'être contacté" : last_interaction
   * passe à NOW(). Permet de tracer la dernière relation et de tirer
   * des relances cohérentes ("aucune interaction depuis 30 jours…").
   *
   * Si `clear` = true → on vide la date au lieu de la set à NOW().
   */
  async markInteracted(
    id: string,
    options: { clear?: boolean } = {},
  ): Promise<ServiceResult<Contact>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .update({
        last_interaction: options.clear ? null : new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Contact, error: null };
  },

  /**
   * Bascule l'état du démarchage : terminé ↔ pas terminé.
   * Quand on passe à terminé, on stamp `prospecting_done_at` à NOW.
   * Quand on rouvre, on remet le timestamp à null.
   */
  async toggleProspectingDone(
    id: string,
    nextValue: boolean,
  ): Promise<ServiceResult<Contact>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .update({
        prospecting_done: nextValue,
        prospecting_done_at: nextValue ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Contact, error: null };
  },

  /**
   * Définit (ou efface) le prochain rappel d'appel pour ce contact.
   * Une note libre peut être attachée. Le rappel apparaît dans le
   * centre d'alertes via compute_org_alerts (priorité critical/high
   * selon proximité de la date).
   */
  async setCallReminder(
    id: string,
    isoDateTime: string | null,
    note: string | null = null,
  ): Promise<ServiceResult<Contact>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .update({
        next_call_reminder: isoDateTime,
        next_call_reminder_note: isoDateTime ? note : null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Contact, error: null };
  },
};

// =========================================================================
// Contact interactions (notes / historique CRM)
// =========================================================================

export const contactInteractionService = {
  async list(contactId: string): Promise<ServiceResult<ContactInteraction[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data ?? []) as ContactInteraction[], error: null };
  },

  /**
   * Ajoute une note d'interaction (ex: "Envoyé les CV"). Met aussi à
   * jour contact.last_interaction pour que la cellule "Dernière
   * interaction" reflète tout de suite l'activité.
   */
  async add(
    contactId: string,
    organizationId: string,
    input: {
      kind: ContactInteractionKind;
      note: string;
      occurredAt?: string;
    },
  ): Promise<ServiceResult<ContactInteraction>> {
    const supabase = createClient();
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const { data, error } = await supabase
      .from('contact_interactions')
      .insert({
        contact_id: contactId,
        organization_id: organizationId,
        kind: input.kind,
        note: input.note,
        occurred_at: occurredAt,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    // Bump last_interaction sur le contact pour la cohérence visuelle.
    await supabase
      .from('contacts')
      .update({ last_interaction: occurredAt })
      .eq('id', contactId);
    return { data: data as ContactInteraction, error: null };
  },

  async remove(id: string): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('contact_interactions')
      .delete()
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  /**
   * Récupère la dernière interaction pour chaque contact d'une org,
   * en un seul round-trip. On trie côté DB par occurred_at DESC, puis
   * on garde le 1er élément par contact_id côté JS.
   *
   * Utilisé par la table /contacts pour afficher la dernière note
   * inline sans aller-retour par ligne.
   */
  async latestPerContact(
    organizationId: string,
  ): Promise<ServiceResult<Map<string, ContactInteraction>>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contact_interactions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false });
    if (error) return { data: null, error };
    const map = new Map<string, ContactInteraction>();
    for (const row of (data ?? []) as ContactInteraction[]) {
      if (!map.has(row.contact_id)) {
        map.set(row.contact_id, row);
      }
    }
    return { data: map, error: null };
  },
};

export const companyService = {
  async list(): Promise<ServiceResult<Company[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('archived', false)
      .order('name');
    if (error) return { data: null, error };
    return { data: data as Company[], error: null };
  },

  /**
   * Création rapide d'un client/entreprise. Utilisé en inline depuis
   * le formulaire facture (l'utilisateur n'a souvent que le nom à
   * portée de main au moment de facturer).
   *
   * RLS sur la table companies vérifie déjà que le user appartient à
   * organization_id, on peut donc insérer en direct depuis le client.
   */
  async create(input: {
    organization_id: string;
    name: string;
    kind?: 'client' | 'esn_partner' | 'prospect';
    industry?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
  }): Promise<ServiceResult<Company>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .insert({
        organization_id: input.organization_id,
        name: input.name.trim(),
        kind: input.kind ?? 'client',
        industry: input.industry ?? null,
        website: input.website ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Company, error: null };
  },
};

// =========================================================================
// Invoices
// =========================================================================

export type InvoiceListItem = Invoice & {
  mission: { title: string; consultant: { first_name: string; last_name: string } | null } | null;
  // Consultant lié directement à la facture (factures hors mission / sous-traitance).
  consultant: { first_name: string; last_name: string; company_name: string | null } | null;
  // Entreprise cliente facturée (factures de vente).
  company: { name: string } | null;
};

export const invoiceService = {
  async list(opts?: { includeArchived?: boolean }): Promise<ServiceResult<Invoice[]>> {
    const supabase = createClient();
    let q = supabase.from('invoices').select('*');
    if (!opts?.includeArchived) q = q.eq('archived', false);
    const { data, error } = await q.order('issue_date', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Invoice[], error: null };
  },

  /**
   * Liste enrichie avec mission + consultant (pour l'affichage admin).
   * Joint à la fois la mission (pour les CRA → factures auto) ET le
   * consultant lié directement à la facture (pour les factures manuelles).
   */
  async listWithConsultant(
    opts?: { includeArchived?: boolean },
  ): Promise<ServiceResult<InvoiceListItem[]>> {
    const supabase = createClient();
    let q = supabase
      .from('invoices')
      .select(
        '*, mission:missions(title, consultant:consultants(first_name, last_name)), consultant:consultants!consultant_id(first_name, last_name, company_name), company:companies(name)',
      );
    if (!opts?.includeArchived) q = q.eq('archived', false);
    const { data, error } = await q.order('issue_date', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data ?? []) as unknown as InvoiceListItem[], error: null };
  },

  /** Archive une facture (la sort des listes actives, garde la trace compta). */
  async archive(id: string): Promise<ServiceResult<Invoice>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Invoice, error: null };
  },

  async unarchive(id: string): Promise<ServiceResult<Invoice>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({ archived: false, archived_at: null })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Invoice, error: null };
  },

  /**
   * Suppression dure. Réservé aux factures en brouillon (status='draft')
   * pour éviter les pertes de données comptables. Une facture envoyée /
   * payée ne doit JAMAIS être supprimée — on l'archive à la place.
   */
  async remove(id: string): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { data: existing } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return { data: null, error: new Error('Facture introuvable') };
    if (existing.status !== 'draft') {
      return {
        data: null,
        error: new Error(
          'Seules les factures en brouillon peuvent être supprimées. Archive plutôt.',
        ),
      };
    }
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async create(input: InvoiceInput, organizationId: string): Promise<ServiceResult<Invoice>> {
    const supabase = createClient();
    const amount_vat = +(input.amount_ht * (input.vat_rate / 100)).toFixed(2);
    const amount_ttc = +(input.amount_ht + amount_vat).toFixed(2);

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...input,
        organization_id: organizationId,
        amount_vat,
        amount_ttc,
        status: 'draft',
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Invoice, error: null };
  },

  /**
   * Génère la facture de SOUS-TRAITANCE (party='consultant') d'un CRA validé :
   * le pendant « achat » de la facture client auto-générée à la validation.
   * Montant = jours validés × TJM achat (contrat consultant signé > TJM fiche
   * consultant > TJM mission en dernier recours). TVA 20 % si le consultant a
   * un n° de TVA, sinon 0 % avec la mention légale art. 293 B du CGI.
   * Idempotent : renvoie la facture existante si le CRA en a déjà une.
   */
  async generateConsultantInvoice(
    timesheetId: string,
  ): Promise<ServiceResult<{ invoice: Invoice; alreadyExists: boolean }>> {
    const supabase = createClient();

    const { data: ts, error: tsErr } = await supabase
      .from('timesheets')
      .select('id, organization_id, mission_id, consultant_id, period_month, period_year, days_validated, days_worked, status')
      .eq('id', timesheetId)
      .maybeSingle();
    if (tsErr || !ts) return { data: null, error: tsErr ?? new Error('CRA introuvable') };
    if (ts.status !== 'client_validated') {
      return { data: null, error: new Error('Le CRA doit être validé avant de générer la facture consultant') };
    }
    if (!ts.consultant_id) {
      return { data: null, error: new Error('Aucun consultant lié à ce CRA') };
    }

    // Idempotence : une seule facture consultant par CRA.
    const { data: existing } = await supabase
      .from('invoices')
      .select('*')
      .eq('timesheet_id', ts.id)
      .eq('party', 'consultant')
      .maybeSingle();
    if (existing) return { data: { invoice: existing as Invoice, alreadyExists: true }, error: null };

    const [{ data: mission }, { data: consultant }, { data: contract }] = await Promise.all([
      ts.mission_id
        ? supabase.from('missions').select('id, title, daily_rate_eur').eq('id', ts.mission_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('consultants')
        .select('id, first_name, last_name, company_name, daily_rate_eur, vat_number')
        .eq('id', ts.consultant_id)
        .maybeSingle(),
      // Dernier contrat de sous-traitance actif/signé du consultant : source
      // de vérité du TJM ACHAT et du délai de paiement.
      supabase
        .from('contracts')
        .select('daily_rate_eur, payment_terms_days')
        .eq('consultant_id', ts.consultant_id)
        .eq('party', 'consultant')
        .in('status', ['signed', 'active'])
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const days = Number(ts.days_validated ?? ts.days_worked ?? 0);
    if (!days) return { data: null, error: new Error('Aucun jour validé sur ce CRA') };

    const tjmAchat = Number(
      contract?.daily_rate_eur ?? consultant?.daily_rate_eur ?? mission?.daily_rate_eur ?? 0,
    );
    if (!tjmAchat) {
      return {
        data: null,
        error: new Error('Aucun TJM trouvé (contrat consultant, fiche consultant ou mission)'),
      };
    }

    const amount_ht = +(days * tjmAchat).toFixed(2);
    // Franchise en base (art. 293 B du CGI) si le consultant n'a pas de n° TVA.
    const vat_rate = consultant?.vat_number ? 20 : 0;
    const amount_vat = +((amount_ht * vat_rate) / 100).toFixed(2);
    const amount_ttc = +(amount_ht + amount_vat).toFixed(2);

    const MONTHS_FULL = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    const period_label = `${MONTHS_FULL[ts.period_month - 1]} ${ts.period_year}`;

    const issue = new Date();
    const due = new Date();
    due.setDate(due.getDate() + (contract?.payment_terms_days ?? 30));

    // Numéro attribué SÉQUENTIELLEMENT par la DB (trigger assign_invoice_number,
    // migration 088) : on insère vide, le trigger pose FC-AAAA-NNNN continu.
    const invoice_number = '';

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: ts.organization_id,
        party: 'consultant',
        company_id: null,
        consultant_id: ts.consultant_id,
        mission_id: ts.mission_id,
        timesheet_id: ts.id,
        invoice_number,
        issue_date: issue.toISOString().split('T')[0],
        due_date: due.toISOString().split('T')[0],
        period_label,
        unit_price: tjmAchat,
        quantity: days,
        amount_ht,
        vat_rate,
        amount_vat,
        amount_ttc,
        status: 'draft',
        notes: vat_rate === 0 ? 'TVA non applicable — article 293 B du CGI' : null,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: { invoice: data as Invoice, alreadyExists: false }, error: null };
  },

  async getById(id: string): Promise<
    ServiceResult<{
      invoice: Invoice;
      company: Company | null;
      mission: Mission | null;
      consultant: Consultant | null;
      timesheet: Timesheet | null;
    }>
  > {
    const supabase = createClient();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !invoice) return { data: null, error: error ?? new Error('Facture introuvable') };

    const [company, mission, timesheet] = await Promise.all([
      // company_id est nullable depuis 024 (missions libres) et vaut null
      // sur les factures consultant — un .eq(null) ferait un 400 PostgREST.
      invoice.company_id
        ? supabase.from('companies').select('*').eq('id', invoice.company_id).maybeSingle()
        : Promise.resolve({ data: null }),
      invoice.mission_id
        ? supabase.from('missions').select('*').eq('id', invoice.mission_id).maybeSingle()
        : Promise.resolve({ data: null }),
      invoice.timesheet_id
        ? supabase.from('timesheets').select('*').eq('id', invoice.timesheet_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const missionData = (mission as { data: Mission | null }).data;
    // Consultant : on le récupère soit via invoice.consultant_id (facture
    // manuelle hors mission), soit via la mission liée. Le 1er gagne s'il
    // est défini, sinon fallback mission.
    const consultantId = invoice.consultant_id ?? missionData?.consultant_id ?? null;
    const consultant = consultantId
      ? (
          await supabase
            .from('consultants')
            .select('*')
            .eq('id', consultantId)
            .maybeSingle()
        ).data
      : null;

    return {
      data: {
        invoice: invoice as Invoice,
        company: (company.data as Company) ?? null,
        mission: missionData ?? null,
        consultant: (consultant as Consultant) ?? null,
        timesheet: (timesheet as { data: Timesheet | null }).data ?? null,
      },
      error: null,
    };
  },

  async markAsPaid(id: string, paymentDate?: string): Promise<ServiceResult<Invoice>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid' as InvoiceStatus,
        payment_date: paymentDate ?? new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Invoice, error: null };
  },

  async markAsSent(id: string): Promise<ServiceResult<Invoice>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent' as InvoiceStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Invoice, error: null };
  },

  /**
   * Annule le paiement d'une facture payée (passe de 'paid' à 'sent').
   * Utile pour corriger une erreur d'encaissement.
   */
  async markAsUnpaid(id: string): Promise<ServiceResult<Invoice>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'sent' as InvoiceStatus,
        payment_date: null,
        payment_method: null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Invoice, error: null };
  },
};

// =========================================================================
// Timesheets
// =========================================================================

export type TimesheetListItem = Timesheet & {
  consultant: { first_name: string; last_name: string; job_title: string | null } | null;
  mission: { title: string } | null;
};

export const timesheetService = {
  async list(showArchived = false): Promise<ServiceResult<TimesheetListItem[]>> {
    const supabase = createClient();
    // Jointure consultant + mission : le tableau CRA affiche le nom du
    // consultant (indispensable quand l'org en a beaucoup).
    const { data, error } = await supabase
      .from('timesheets')
      .select(
        '*, consultant:consultants(first_name, last_name, job_title), mission:missions(title)',
      )
      .eq('archived', showArchived)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data ?? []) as unknown as TimesheetListItem[], error: null };
  },

  /**
   * Archive / désarchive un CRA. On N'EFFACE PAS (artefact de facturation) :
   * on le sort des listes actives ; il reste restaurable 30 jours avant purge
   * automatique. `archived_at` est posé/effacé par le trigger DB sync_archived_at.
   */
  async archive(id: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('timesheets')
      .update({ archived: true })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Timesheet, error: null };
  },

  async unarchive(id: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('timesheets')
      .update({ archived: false })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Timesheet, error: null };
  },

  async create(input: TimesheetInput, organizationId: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    // Récupérer consultant_id depuis la mission
    const { data: mission } = await supabase
      .from('missions')
      .select('consultant_id')
      .eq('id', input.mission_id)
      .single();
    if (!mission) return { data: null, error: new Error('Mission introuvable') };

    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        ...input,
        organization_id: organizationId,
        consultant_id: mission.consultant_id,
        days_validated: 0,
        status: 'draft',
      })
      .select()
      .single();
    if (error) {
      // Contrainte d'unicité (mission + mois + année) : un CRA existe déjà pour
      // cette période. On renvoie un message clair plutôt que l'erreur Postgres
      // brute (« duplicate key value violates unique constraint… »).
      if ((error as { code?: string }).code === '23505') {
        return {
          data: null,
          error: new Error(
            'Un CRA existe déjà pour cette mission sur ce mois. Ouvre-le, ou choisis un autre mois.',
          ),
        };
      }
      return { data: null, error };
    }
    return { data: data as Timesheet, error: null };
  },

  /**
   * Soumettre un CRA (transition draft → submitted).
   * Utilisé par le consultant depuis son espace.
   */
  async submit(id: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('timesheets')
      .update({
        status: 'submitted',
        submitted_by: userRes.user?.id ?? null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Timesheet, error: null };
  },

  /**
   * Rejeter un CRA (transition submitted → rejected).
   * Utilisé par l'admin avec un motif de rejet.
   */
  async reject(id: string, reason: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('timesheets')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        validated_by: userRes.user?.id ?? null, // qui a statué
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Timesheet, error: null };
  },

  /**
   * Rouvrir un CRA rejeté pour édition (transition rejected → draft).
   * Utilisé par le consultant pour corriger avant re-soumission.
   */
  async reopen(id: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('timesheets')
      .update({ status: 'draft' })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Timesheet, error: null };
  },

  async getById(id: string): Promise<
    ServiceResult<{
      timesheet: Timesheet;
      mission: Mission | null;
      consultant: Consultant | null;
      company: Company | null;
      days: Array<{
        id: string;
        timesheet_id: string;
        day_date: string;
        duration: number;
        note: string | null;
        kind: 'worked' | 'paid_leave' | 'sick_leave' | 'unpaid_leave' | 'holiday';
      }>;
    }>
  > {
    const supabase = createClient();
    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !timesheet) return { data: null, error: error ?? new Error('CRA introuvable') };

    const [missionRes, daysRes] = await Promise.all([
      supabase.from('missions').select('*').eq('id', timesheet.mission_id).maybeSingle(),
      supabase
        .from('timesheet_days')
        .select('*')
        .eq('timesheet_id', id)
        .order('day_date', { ascending: true }),
    ]);

    const mission = (missionRes.data as Mission) ?? null;
    const [consultantRes, companyRes] = await Promise.all([
      mission
        ? supabase.from('consultants').select('*').eq('id', mission.consultant_id).maybeSingle()
        : Promise.resolve({ data: null }),
      mission
        ? supabase.from('companies').select('*').eq('id', mission.company_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      data: {
        timesheet: timesheet as Timesheet,
        mission,
        consultant: (consultantRes as { data: Consultant | null }).data ?? null,
        company: (companyRes as { data: Company | null }).data ?? null,
        days: (daysRes.data ?? []) as Array<{
          id: string;
          timesheet_id: string;
          day_date: string;
          duration: number;
          note: string | null;
          kind: 'worked' | 'paid_leave' | 'sick_leave' | 'unpaid_leave' | 'holiday';
        }>,
      },
      error: null,
    };
  },

  /**
   * Met à jour (ou supprime) un jour du calendrier CRA.
   *
   * - kind = 'worked' / 'paid_leave' / 'sick_leave' / 'unpaid_leave' / 'holiday'
   * - duration appliquée seulement si kind = 'worked' (sinon 0)
   * - kind = null → supprimer la ligne (revient à "vide", weekend par ex.)
   *
   * Le trigger `recompute_timesheet_days_worked` met à jour
   * timesheets.days_worked automatiquement.
   */
  async upsertDay(input: {
    timesheetId: string;
    dayDate: string; // 'YYYY-MM-DD'
    kind: 'worked' | 'paid_leave' | 'sick_leave' | 'unpaid_leave' | 'holiday' | null;
    duration?: number; // 1.0 ou 0.5 pour 'worked' ; ignoré sinon
    note?: string | null;
  }): Promise<ServiceResult<true>> {
    const supabase = createClient();
    if (input.kind === null) {
      const { error } = await supabase
        .from('timesheet_days')
        .delete()
        .eq('timesheet_id', input.timesheetId)
        .eq('day_date', input.dayDate);
      if (error) return { data: null, error };
      return { data: true, error: null };
    }
    const duration = input.kind === 'worked' ? (input.duration ?? 1) : 0;
    const { error } = await supabase
      .from('timesheet_days')
      .upsert(
        {
          timesheet_id: input.timesheetId,
          day_date: input.dayDate,
          kind: input.kind,
          duration,
          note: input.note ?? null,
        },
        { onConflict: 'timesheet_id,day_date' },
      );
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async validate(id: string): Promise<ServiceResult<Timesheet>> {
    const supabase = createClient();
    const { data: ts } = await supabase.from('timesheets').select('*').eq('id', id).single();
    if (!ts) return { data: null, error: new Error('CRA introuvable') };

    const { data, error } = await supabase
      .from('timesheets')
      .update({
        status: 'client_validated',
        days_validated: ts.days_worked,
        validated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Timesheet, error: null };
  },

  /**
   * Valide le CRA (transitions draft→submitted→client_validated si besoin),
   * génère la facture associée et la marque comme payée.
   *
   * Respecte les transitions strictes imposées par le trigger
   * `enforce_timesheet_transition` :
   *   - draft → submitted (admin soumet pour le compte du consultant)
   *   - submitted → client_validated (admin valide)
   */
  async validateAndInvoice(
    id: string,
    organizationId: string,
  ): Promise<
    ServiceResult<{
      timesheet: Timesheet;
      invoice: Invoice;
      alreadyInvoiced: boolean;
    }>
  > {
    const supabase = createClient();

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id ?? null;

    // 1. Charger le CRA et la mission
    const { data: ts } = await supabase.from('timesheets').select('*').eq('id', id).single();
    if (!ts) return { data: null, error: new Error('CRA introuvable') };

    const { data: mission } = await supabase
      .from('missions')
      .select('*')
      .eq('id', ts.mission_id)
      .single();
    if (!mission) return { data: null, error: new Error('Mission introuvable') };

    let timesheet = ts as Timesheet;

    // 2a. draft → submitted (transition obligatoire avant validation)
    if (timesheet.status === 'draft') {
      const { data: submitted, error: sErr } = await supabase
        .from('timesheets')
        .update({
          status: 'submitted',
          submitted_by: userId,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (sErr) return { data: null, error: sErr };
      timesheet = submitted as Timesheet;
    }

    // 2b. submitted → client_validated
    if (timesheet.status === 'submitted' || timesheet.status === 'rejected') {
      // 'rejected' ne devrait pas arriver ici, mais on permet la re-validation
      // via soumission implicite si l'admin force. On passe d'abord en draft→submitted.
      if (timesheet.status === 'rejected') {
        await supabase.from('timesheets').update({ status: 'draft' }).eq('id', id);
        await supabase
          .from('timesheets')
          .update({
            status: 'submitted',
            submitted_by: userId,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', id);
      }
      const { data: validated, error: vErr } = await supabase
        .from('timesheets')
        .update({
          status: 'client_validated',
          days_validated: timesheet.days_worked,
          validated_by: userId,
          validated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (vErr) return { data: null, error: vErr };
      timesheet = validated as Timesheet;
    }

    // 3. Vérifier si une facture CLIENT existe déjà pour ce CRA (un CRA peut
    // maintenant porter deux factures : vente client + sous-traitance
    // consultant — sans le filtre party, maybeSingle() planterait).
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('timesheet_id', id)
      .eq('party', 'client')
      .maybeSingle();

    if (existingInvoice) {
      return {
        data: { timesheet, invoice: existingInvoice as Invoice, alreadyInvoiced: true },
        error: null,
      };
    }

    // 4. Générer la facture
    const MONTHS_FR = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    const periodLabel = `${MONTHS_FR[timesheet.period_month - 1]} ${timesheet.period_year}`;
    const days = Number(timesheet.days_validated);
    const amountHt = +(days * Number(mission.daily_rate_eur)).toFixed(2);
    const vatRate = 20;
    const amountVat = +(amountHt * (vatRate / 100)).toFixed(2);
    const amountTtc = +(amountHt + amountVat).toFixed(2);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const due = new Date(today);
    due.setDate(due.getDate() + 30);
    const dueStr = due.toISOString().slice(0, 10);

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        party: 'client',
        company_id: mission.company_id,
        mission_id: mission.id,
        timesheet_id: timesheet.id,
        // Numéro séquentiel attribué par la DB (trigger, migration 088).
        invoice_number: '',
        issue_date: todayStr,
        // Échéance réelle à 30 j : la facture n'est PAS encaissée d'office.
        // Elle est créée en brouillon — l'utilisateur la relit, l'envoie,
        // puis marque le paiement quand le client règle réellement.
        // (avant : status='paid' + payment_date=aujourd'hui → CA encaissé
        //  fictif, non fidèle.)
        due_date: dueStr,
        period_label: periodLabel,
        amount_ht: amountHt,
        vat_rate: vatRate,
        amount_vat: amountVat,
        amount_ttc: amountTtc,
        status: 'draft',
        notes: `Générée automatiquement à la validation du CRA ${periodLabel}. À vérifier puis envoyer au client.`,
      })
      .select()
      .single();

    if (invErr) return { data: null, error: invErr };

    return {
      data: { timesheet, invoice: invoice as Invoice, alreadyInvoiced: false },
      error: null,
    };
  },

  /**
   * Supprime un CRA (hard delete). Échoue côté API si une facture est
   * encore liée — le caller doit d'abord la supprimer/détacher.
   */
  async remove(id: string): Promise<ServiceResult<true>> {
    try {
      const res = await fetch(`/api/timesheets/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          data: null,
          error: { message: body.message ?? body.error ?? 'Suppression impossible' } as any,
        };
      }
      return { data: true, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } as any };
    }
  },
};

// =========================================================================
// Alerts
// =========================================================================

/** Forme renvoyée par la RPC `compute_org_alerts` (v2 — migration 085). */
export type ComputedAlert = {
  id: string;
  kind: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  due_date: string | null;
  link: string | null;
  entity_kind: string | null;
  entity_id: string | null;
  created_at: string;
  /** 'new' | 'in_progress' | 'snoozed' — cycle de vie (v2). */
  status: string;
  /** 'computed' = calculée en live (dismiss only) ; 'engine'/'manual' = table alerts. */
  source: 'computed' | 'engine' | 'manual';
  assignee_id: string | null;
  read_at: string | null;
  snoozed_until: string | null;
  reminder_count: number;
  next_reminder_at: string | null;
  consultant_id: string | null;
};

export const alertService = {
  /**
   * Renvoie les alertes calculées en temps réel (factures en retard,
   * CRA en attente, missions qui se terminent…) via la RPC
   * `compute_org_alerts`. Ne lit plus la table `alerts` directement
   * sauf pour les alertes manuelles, déjà UNIONées dans la fonction.
   *
   * Le paramètre `status` est ignoré pour l'instant (les alertes
   * calculées ne sont pas dismissibles individuellement — l'action
   * corrective sur l'entité fait disparaître l'alerte).
   */
  async listComputed(orgId?: string): Promise<ServiceResult<ComputedAlert[]>> {
    const supabase = createClient();
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      resolvedOrgId = (prof?.organization_id as string | undefined) ?? undefined;
    }
    if (!resolvedOrgId) return { data: [], error: null };
    // Depuis la migration 039, la RPC exclut elle-même les alertes dismissed
    // via un NOT EXISTS interne — plus besoin de 2 round-trips + filter JS.
    const { data, error } = await supabase.rpc('compute_org_alerts', {
      org_id: resolvedOrgId,
    });
    if (error) return { data: null, error };
    return { data: (data ?? []) as ComputedAlert[], error: null };
  },

  /**
   * Masque définitivement une alerte calculée. Si l'entité sous-jacente
   * change (ex: facture payée), une nouvelle alerte avec un ID différent
   * pourra apparaître — le dismiss ne bloque que cette occurrence précise.
   */
  async dismissComputed(alertId: string, orgId: string): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('dismissed_alerts')
      .upsert(
        { organization_id: orgId, alert_id: alertId },
        { onConflict: 'organization_id,alert_id' },
      );
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  /** Réactive une alerte précédemment dismissée. */
  async undismissComputed(alertId: string, orgId: string): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('dismissed_alerts')
      .delete()
      .eq('organization_id', orgId)
      .eq('alert_id', alertId);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async list(status?: AlertStatus): Promise<ServiceResult<Alert[]>> {
    const supabase = createClient();
    let query = supabase.from('alerts').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false });
    if (error) return { data: null, error };
    return { data: data as Alert[], error: null };
  },

  async markResolved(id: string): Promise<ServiceResult<Alert>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Alert, error: null };
  },

  async dismiss(id: string): Promise<ServiceResult<Alert>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'dismissed' })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Alert, error: null };
  },

  /**
   * Compteurs par priorité (RPC count_org_alerts) — badge de navigation.
   * Ne rapatrie pas les lignes : une seule agrégation SQL.
   */
  async counts(orgId: string): Promise<ServiceResult<Record<string, number>>> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('count_org_alerts', { org_id: orgId });
    if (error) return { data: null, error };
    const out: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ priority: string; total: number }>) {
      out[row.priority] = Number(row.total);
    }
    return { data: out, error: null };
  },

  /**
   * Change le statut d'une alerte MATÉRIALISÉE (table alerts).
   * `snoozed` exige `snoozedUntil` ; `resolved` fige resolved_at/by.
   */
  async setStatus(
    id: string,
    status: 'new' | 'in_progress' | 'snoozed' | 'resolved' | 'dismissed',
    opts: { snoozedUntil?: string; userId?: string } = {},
  ): Promise<ServiceResult<Alert>> {
    const supabase = createClient();
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'snoozed') {
      patch.snoozed_until = opts.snoozedUntil ?? new Date(Date.now() + 7 * 86_400_000).toISOString();
    } else {
      patch.snoozed_until = null;
    }
    if (status === 'resolved') {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = opts.userId ?? null;
      patch.next_reminder_at = null;
    } else if (status === 'new' || status === 'in_progress') {
      patch.resolved_at = null;
      patch.resolved_by = null;
    }
    const { data, error } = await supabase
      .from('alerts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Alert, error: null };
  },

  /** Assigne (ou désassigne) une alerte matérialisée à un membre de l'org. */
  async assign(id: string, assigneeId: string | null): Promise<ServiceResult<Alert>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alerts')
      .update({ assignee_id: assigneeId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Alert, error: null };
  },

  /** Marque une alerte matérialisée comme lue (première ouverture). */
  async markRead(id: string): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  /** Commentaires internes d'une alerte (clé = alerts.id ou id calculé). */
  async listComments(orgId: string, alertKey: string): Promise<ServiceResult<AlertComment[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alert_comments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('alert_key', alertKey)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error };
    return { data: (data ?? []) as AlertComment[], error: null };
  },

  async addComment(
    orgId: string,
    alertKey: string,
    authorId: string,
    body: string,
  ): Promise<ServiceResult<AlertComment>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alert_comments')
      .insert({ organization_id: orgId, alert_key: alertKey, author_id: authorId, body })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as AlertComment, error: null };
  },

  /** Historique des envois (relances) pour une alerte. */
  async listDeliveries(
    orgId: string,
    dedupeKey: string,
  ): Promise<ServiceResult<NotificationDelivery[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('organization_id', orgId)
      .like('dedupe_key', `${dedupeKey}%`)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) return { data: null, error };
    return { data: (data ?? []) as NotificationDelivery[], error: null };
  },
};

// =========================================================================
// Notifications personnelles (cloche) + préférences
// =========================================================================

export const notificationService = {
  async list(limit = 30): Promise<ServiceResult<AppNotification[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error };
    return { data: (data ?? []) as AppNotification[], error: null };
  },

  async unreadCount(): Promise<ServiceResult<number>> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);
    if (error) return { data: null, error };
    return { data: count ?? 0, error: null };
  },

  async markRead(id: string): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async markAllRead(): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },
};

export type NotificationPreferencesRow = {
  user_id: string;
  organization_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  categories: Record<string, Partial<Record<'in_app' | 'email' | 'sms', boolean>>>;
  digest_daily: boolean;
  digest_weekly: boolean;
  phone: string | null;
};

export const notificationPreferencesService = {
  async get(orgId: string): Promise<ServiceResult<NotificationPreferencesRow | null>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();
    if (error) return { data: null, error };
    return { data: (data as NotificationPreferencesRow) ?? null, error: null };
  },

  async upsert(
    row: Omit<NotificationPreferencesRow, 'user_id'> & { user_id: string },
  ): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id,organization_id' });
    if (error) return { data: null, error };
    return { data: true, error: null };
  },
};

export const orgNotificationSettingsService = {
  async get(orgId: string): Promise<ServiceResult<Record<string, unknown>>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('org_notification_settings')
      .select('settings')
      .eq('organization_id', orgId)
      .maybeSingle();
    if (error) return { data: null, error };
    return { data: (data?.settings as Record<string, unknown>) ?? {}, error: null };
  },

  async update(
    orgId: string,
    settings: Record<string, unknown>,
    userId: string,
  ): Promise<ServiceResult<true>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('org_notification_settings')
      .upsert(
        {
          organization_id: orgId,
          settings,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' },
      );
    if (error) return { data: null, error };
    return { data: true, error: null };
  },
};

// =========================================================================
// Dashboard KPIs (agrégation)
// =========================================================================

export type DashboardKPIs = {
  consultantsOnMission: number;
  consultantsAvailable: number;
  openOpportunities: number;
  openJobOffers: number;
  opportunitiesWonThisMonth: number;
  /** CA "produit" = TJM × jours ouvrés écoulés ce mois-ci sur les missions actives.
   *  C'est du prévisionnel (ce qui SERA facturé, pas ce qui l'est déjà). */
  revenueThisMonth: number;
  /** CA réellement facturé ce mois-ci (somme des invoices émises, hors draft/cancelled).
   *  Cohérent avec la courbe "CA cumulé 12 derniers mois" du graphe. */
  revenueThisMonthInvoiced: number;
  /** CA réellement encaissé ce mois-ci (factures status='paid'). */
  revenueThisMonthPaid: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingTimesheets: number;
  criticalAlerts: number;
};

/**
 * Nombre de jours ouvrés (lundi-vendredi) entre deux dates incluses.
 * Très simple : ne tient pas compte des jours fériés FR — on accepte
 * une approximation ~10 jours/an d'écart pour rester concis.
 */
function businessDaysBetween(from: Date, to: Date): number {
  if (to < from) return 0;
  let count = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export const dashboardService = {
  /**
   * Charge les KPIs du dashboard via la RPC `dashboard_kpis(org_id)` qui
   * agrège les 10 sous-requêtes côté Postgres et renvoie un seul JSON.
   * Évite 10 round-trips parallèles depuis le navigateur.
   *
   * Pré-requis : le user doit être membre de l'org (vérifié par la RPC).
   * Si la RPC échoue (pas applied yet, ou edge case), on retombe sur
   * l'agrégation client-side historique pour ne pas casser l'UI.
   */
  async getKPIs(orgId?: string): Promise<ServiceResult<DashboardKPIs>> {
    const supabase = createClient();

    // Tenter d'abord la RPC : 1 seul appel pour tout.
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      resolvedOrgId = (prof?.organization_id as string | undefined) ?? undefined;
    }
    if (resolvedOrgId) {
      const { data, error } = await supabase.rpc('dashboard_kpis', {
        org_id: resolvedOrgId,
      });
      if (!error && data) {
        return {
          data: data as DashboardKPIs,
          error: null,
        };
      }
      // si error → fallback ci-dessous
    }

    // === Fallback historique (multi-requêtes) si la RPC n'est pas dispo ===
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      activeMissions,
      available,
      openOps,
      openJobOffers,
      wonOps,
      invoicesPaid,
      invoicesIssuedThisMonth,
      invoicesPending,
      invoicesOverdue,
      timesheetsPending,
      criticalAlerts,
    ] = await Promise.all([
      // Source de vérité = la table missions. On ramène aussi TJM + dates
      // pour calculer le CA "produit" du mois sans requête supplémentaire.
      // ⚠️ status='active' UNIQUEMENT — les missions 'proposed' (CV poussés)
      // sont des propositions qui peuvent échouer, elles ne doivent PAS
      // compter dans "Consultants en mission" ni dans le CA produit du mois.
      // Bug user du 16/06/2026 : 8400€ affiché alors que toutes les missions
      // étaient en proposed (vraies invoices = 0€).
      supabase
        .from('missions')
        .select('consultant_id, daily_rate_eur, start_date, end_date')
        .eq('status', 'active')
        .eq('archived', false),
      supabase
        .from('consultants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available')
        .eq('archived', false)
        .eq('is_prospect', false),
      supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        // Pipeline actif uniquement : exclut les statuts terminaux
        // (won, lost, on_hold). Cohérent avec le Kanban CRM qui ne
        // montre que les 6 colonnes actives.
        .not('status', 'in', '("won","lost","on_hold")'),
      supabase
        .from('job_offers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'won')
        .gte('updated_at', firstDayMonth),
      supabase
        .from('invoices')
        .select('amount_ht')
        .eq('party', 'client')
        .eq('status', 'paid')
        .gte('issue_date', firstDayMonth.split('T')[0]),
      // Factures CLIENT émises ce mois (status sent/overdue/paid, hors
      // draft/cancelled) — base de calcul du CA "facturé" du mois, cohérente
      // avec la courbe dashboard 12 mois. Les factures consultant (achat de
      // sous-traitance) ne comptent jamais dans le CA.
      supabase
        .from('invoices')
        .select('amount_ht')
        .eq('party', 'client')
        .in('status', ['sent', 'overdue', 'paid'])
        .gte('issue_date', firstDayMonth.split('T')[0]),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('party', 'client')
        .eq('status', 'sent'),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('party', 'client')
        .eq('status', 'overdue'),
      supabase
        .from('timesheets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'submitted']),
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('priority', 'critical')
        .eq('status', 'new'),
    ]);

    type ActiveMission = {
      consultant_id: string;
      daily_rate_eur: number | string | null;
      start_date: string | null;
      end_date: string | null;
    };
    const missionRows = (activeMissions.data ?? []) as ActiveMission[];
    const onMissionIds = new Set(missionRows.map((m) => m.consultant_id));
    const consultantsOnMission = onMissionIds.size;

    // CA "produit" du mois en cours : TJM × jours ouvrés effectivement
    // travaillés ce mois-ci sur chaque mission active. Évolue tout seul
    // jour après jour sans dépendre du cycle facturation.
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const today = now;
    let revenueThisMonth = 0;
    for (const m of missionRows) {
      if (!m.start_date) continue;
      const tjm = Number(m.daily_rate_eur ?? 0);
      if (!tjm) continue;
      const start = new Date(m.start_date);
      const end = m.end_date ? new Date(m.end_date) : monthEnd;
      const from = start > monthStart ? start : monthStart;
      const to = [end, today, monthEnd].sort((a, b) => a.getTime() - b.getTime())[0];
      if (to < from) continue;
      revenueThisMonth += businessDaysBetween(from, to) * tjm;
    }

    // "Disponibles" exclut ceux qui ont déjà une mission active : sinon un
    // consultant avec une mission proposée mais status='available' (drift)
    // serait compté dans les deux KPIs.
    let consultantsAvailable = available.count ?? 0;
    if (onMissionIds.size > 0 && (available.count ?? 0) > 0) {
      const { data: availableIds } = await supabase
        .from('consultants')
        .select('id')
        .eq('status', 'available')
        .eq('archived', false)
        .eq('is_prospect', false);
      consultantsAvailable = (availableIds ?? []).filter(
        (c) => !onMissionIds.has((c as { id: string }).id),
      ).length;
    }

    const revenueThisMonthPaid = (invoicesPaid.data ?? []).reduce(
      (sum, inv) => sum + Number(inv.amount_ht ?? 0),
      0
    );
    // CA "facturé" du mois = somme des invoices émises (sent + overdue + paid)
    // depuis le 1er du mois. Cohérent avec la courbe CA cumulé du graphe.
    const revenueThisMonthInvoiced = (invoicesIssuedThisMonth.data ?? []).reduce(
      (sum, inv) => sum + Number(inv.amount_ht ?? 0),
      0
    );

    // Wrapper defensive : tout KPI doit être un nombre fini.
    // Évite NaN/undefined qui ferait flash "—" ou crasher AnimatedNumber.
    const safeNum = (v: unknown, fallback = 0): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    return {
      data: {
        consultantsOnMission: safeNum(consultantsOnMission),
        consultantsAvailable: safeNum(consultantsAvailable),
        // "Opportunités ouvertes" = STRICTEMENT les opportunités du CRM
        // dans une colonne active (new → negotiation). On NE cumule PLUS
        // avec les job_offers ouverts (les AO ont leur propre KPI sur
        // la page /offers) — ça créait un total trompeur sur le dashboard.
        openOpportunities: safeNum(openOps.count),
        openJobOffers: safeNum(openJobOffers.count),
        opportunitiesWonThisMonth: safeNum(wonOps.count),
        revenueThisMonth: safeNum(revenueThisMonth),
        revenueThisMonthInvoiced: safeNum(revenueThisMonthInvoiced),
        revenueThisMonthPaid: safeNum(revenueThisMonthPaid),
        pendingInvoices: safeNum(invoicesPending.count),
        overdueInvoices: safeNum(invoicesOverdue.count),
        pendingTimesheets: safeNum(timesheetsPending.count),
        criticalAlerts: safeNum(criticalAlerts.count),
      },
      error: null,
    };
  },
};
