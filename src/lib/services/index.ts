import { createClient } from '@/lib/supabase/client';
import type {
  Opportunity,
  OpportunityStatus,
  Contact,
  Invoice,
  InvoiceStatus,
  Alert,
  AlertStatus,
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
  async list(statusFilter?: 'open' | 'closed' | 'won' | 'lost' | 'all'): Promise<ServiceResult<JobOffer[]>> {
    const supabase = createClient();
    let query = supabase.from('job_offers').select('*');
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
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

  async update(id: string, input: Partial<JobOfferInput> & { status?: string }): Promise<ServiceResult<JobOffer>> {
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
    if (error) return { data: null, error };
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
    if (error) return { data: null, error };
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
  // Consultant lié directement à la facture (factures hors mission).
  consultant: { first_name: string; last_name: string } | null;
};

export const invoiceService = {
  async list(): Promise<ServiceResult<Invoice[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('issue_date', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Invoice[], error: null };
  },

  /**
   * Liste enrichie avec mission + consultant (pour l'affichage admin).
   * Joint à la fois la mission (pour les CRA → factures auto) ET le
   * consultant lié directement à la facture (pour les factures manuelles).
   */
  async listWithConsultant(): Promise<ServiceResult<InvoiceListItem[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select(
        '*, mission:missions(title, consultant:consultants(first_name, last_name)), consultant:consultants!consultant_id(first_name, last_name)',
      )
      .order('issue_date', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data ?? []) as unknown as InvoiceListItem[], error: null };
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
      supabase.from('companies').select('*').eq('id', invoice.company_id).maybeSingle(),
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

export const timesheetService = {
  async list(): Promise<ServiceResult<Timesheet[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Timesheet[], error: null };
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
    if (error) return { data: null, error };
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

    // 3. Vérifier si une facture existe déjà pour ce CRA
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('timesheet_id', id)
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

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        company_id: mission.company_id,
        mission_id: mission.id,
        timesheet_id: timesheet.id,
        invoice_number: `FAC-${today.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        issue_date: todayStr,
        due_date: todayStr, // échéance = aujourd'hui puisque payée immédiatement
        period_label: periodLabel,
        amount_ht: amountHt,
        vat_rate: vatRate,
        amount_vat: amountVat,
        amount_ttc: amountTtc,
        status: 'paid',
        payment_date: todayStr,
        notes: `Générée automatiquement à la validation du CRA ${periodLabel}.`,
      })
      .select()
      .single();

    if (invErr) return { data: null, error: invErr };

    return {
      data: { timesheet, invoice: invoice as Invoice, alreadyInvoiced: false },
      error: null,
    };
  },
};

// =========================================================================
// Alerts
// =========================================================================

/** Forme renvoyée par la RPC `compute_org_alerts` côté client. */
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
    const { data, error } = await supabase.rpc('compute_org_alerts', {
      org_id: resolvedOrgId,
    });
    if (error) return { data: null, error };
    return { data: (data ?? []) as ComputedAlert[], error: null };
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
};

// =========================================================================
// Dashboard KPIs (agrégation)
// =========================================================================

export type DashboardKPIs = {
  consultantsOnMission: number;
  consultantsAvailable: number;
  openOpportunities: number;
  opportunitiesWonThisMonth: number;
  /** CA "produit" = TJM × jours ouvrés écoulés ce mois-ci sur les missions actives. */
  revenueThisMonth: number;
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
      invoicesPending,
      invoicesOverdue,
      timesheetsPending,
      criticalAlerts,
    ] = await Promise.all([
      // Source de vérité = la table missions. On ramène aussi TJM + dates
      // pour calculer le CA "produit" du mois sans requête supplémentaire.
      supabase
        .from('missions')
        .select('consultant_id, daily_rate_eur, start_date, end_date')
        .in('status', ['proposed', 'active']),
      supabase
        .from('consultants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available')
        .eq('archived', false)
        .eq('is_prospect', false),
      supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("won","lost")'),
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
        .eq('status', 'paid')
        .gte('issue_date', firstDayMonth.split('T')[0]),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent'),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
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

    return {
      data: {
        consultantsOnMission,
        consultantsAvailable,
        // "Ouvertes" = AO en cours (job_offers.open) + opportunités CRM
        // non clôturées. La plupart des ESN n'utilisent qu'un des deux.
        openOpportunities: (openOps.count ?? 0) + (openJobOffers.count ?? 0),
        opportunitiesWonThisMonth: wonOps.count ?? 0,
        revenueThisMonth,
        revenueThisMonthPaid,
        pendingInvoices: invoicesPending.count ?? 0,
        overdueInvoices: invoicesOverdue.count ?? 0,
        pendingTimesheets: timesheetsPending.count ?? 0,
        criticalAlerts: criticalAlerts.count ?? 0,
      },
      error: null,
    };
  },
};
