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
} from '@/types';
import type {
  OpportunityInput,
  ContactInput,
  InvoiceInput,
  TimesheetInput,
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
};

// =========================================================================
// Invoices
// =========================================================================

export type InvoiceListItem = Invoice & {
  mission: { title: string; consultant: { first_name: string; last_name: string } | null } | null;
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
   */
  async listWithConsultant(): Promise<ServiceResult<InvoiceListItem[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select(
        '*, mission:missions(title, consultant:consultants(first_name, last_name))',
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
    const consultant = missionData
      ? (
          await supabase
            .from('consultants')
            .select('*')
            .eq('id', missionData.consultant_id)
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
        }>,
      },
      error: null,
    };
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

export const alertService = {
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
  revenueThisMonth: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingTimesheets: number;
  criticalAlerts: number;
};

export const dashboardService = {
  async getKPIs(): Promise<ServiceResult<DashboardKPIs>> {
    const supabase = createClient();
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      onMission,
      available,
      openOps,
      wonOps,
      invoicesPaid,
      invoicesPending,
      invoicesOverdue,
      timesheetsPending,
      criticalAlerts,
    ] = await Promise.all([
      supabase
        .from('consultants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'on_mission'),
      supabase
        .from('consultants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available'),
      supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("won","lost")'),
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

    const revenueThisMonth = (invoicesPaid.data ?? []).reduce(
      (sum, inv) => sum + Number(inv.amount_ht ?? 0),
      0
    );

    return {
      data: {
        consultantsOnMission: onMission.count ?? 0,
        consultantsAvailable: available.count ?? 0,
        openOpportunities: openOps.count ?? 0,
        opportunitiesWonThisMonth: wonOps.count ?? 0,
        revenueThisMonth,
        pendingInvoices: invoicesPending.count ?? 0,
        overdueInvoices: invoicesOverdue.count ?? 0,
        pendingTimesheets: timesheetsPending.count ?? 0,
        criticalAlerts: criticalAlerts.count ?? 0,
      },
      error: null,
    };
  },
};
