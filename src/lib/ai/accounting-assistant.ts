// =========================================================================
// Accounting Assistant – QuadCore Platform
// -------------------------------------------------------------------------
// Assistant comptable mock pour SAS / ESN. Détecte une intention dans la
// question (FR ou EN), charge les données pertinentes depuis Supabase, et
// retourne une réponse structurée (texte + KPIs + listes + suggestions).
//
// V1 future : remplacer par un appel LLM Claude avec tool use ; les tools
// seront les mêmes queries Supabase utilisées ici.
// =========================================================================

import { createClient } from '@/lib/supabase/client';
import type { Invoice, Timesheet, Opportunity, Mission } from '@/types';

export type Locale = 'fr' | 'en';

export type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
  blocks?: AssistantBlock[];
  timestamp: number;
};

export type AssistantBlock =
  | { type: 'kpi'; label: string; value: string; tone?: 'good' | 'warn' | 'bad' | 'neutral' }
  | {
      type: 'list';
      title: string;
      items: Array<{ label: string; sub?: string; value?: string; href?: string; tone?: 'good' | 'warn' | 'bad' }>;
    }
  | { type: 'suggestion'; text: string; action?: { label: string; href: string } }
  | { type: 'draft'; title: string; body: string };

export type Intent =
  | 'overview'
  | 'overdue'
  | 'cashflow'
  | 'pending_invoices'
  | 'pending_timesheets'
  | 'vat'
  | 'reminder'
  | 'unmatched_cra'
  | 'top_clients'
  | 'top_consultants'
  | 'dso'
  | 'aging'
  | 'forecast_90'
  | 'win_rate'
  | 'pipeline_value'
  | 'unknown';

// ============================================================================
// Intent detection — bilingual keyword matcher (FR + EN patterns)
// ============================================================================

const INTENT_KEYWORDS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  // Order matters — more specific intents BEFORE more general ones.
  // 'reminder' / 'rédige' before 'overdue' so "draft a follow-up" wins.
  { intent: 'reminder', patterns: [/relance|relanc|rappel|rédige.*relance|rédige.*email/i, /follow.?up|reminder|chase|draft.*(email|follow)/i] },
  { intent: 'unmatched_cra', patterns: [/cra.*(non.?facturé|sans.?facture|pas.?facturé|non.?envoy)/i, /timesheet.*(not.?invoiced|without.?invoice|unbilled)|unbilled.*timesheet/i] },
  { intent: 'pending_timesheets', patterns: [/cra.*(valider|attente|en cours|à valider)/i, /timesheet.*(validate|pending|to.?valid|awaiting)/i] },
  { intent: 'aging', patterns: [/aging|aged|ancienneté.*créance|balance.*âgée|aged.*receivable/i] },
  { intent: 'dso', patterns: [/dso|days?.?sales?.?outstanding|délai.*paiement.*moyen|temps.*paiement|payment.*delay/i] },
  { intent: 'forecast_90', patterns: [/forecast|prévi.*(90|3.?mois|trimestre)|expected.*revenue|prévi.*ca|ca.*prévu/i] },
  { intent: 'pipeline_value', patterns: [/pipeline.*(valeur|value|montant|weighted)|valeur.*pipeline|opportunit.*total/i] },
  { intent: 'win_rate', patterns: [/win.?rate|taux.*(gain|conversion|win)|taux.*succès|conversion.*rate/i] },
  { intent: 'top_clients', patterns: [/top.*clients?|meilleurs?.*clients?|principaux?.*clients?|client.*concentration|biggest.*clients?/i] },
  { intent: 'top_consultants', patterns: [/top.*consultants?|meilleurs?.*consultants?|principaux?.*consultants?|best.*consultants?|top.*earners?/i] },
  { intent: 'vat', patterns: [/tva|taxe|déclaration.*tva|ca3/i, /\bvat\b|sales.?tax/i] },
  { intent: 'overdue', patterns: [/retard|impayé|en.?souffrance/i, /overdue|unpaid|late|past.?due/i] },
  { intent: 'pending_invoices', patterns: [/factures?.*(attente|envoyée?s?|non.?pay)/i, /invoices?.*(pending|awaiting|sent.*not.*paid)/i] },
  { intent: 'cashflow', patterns: [/trésor|cash.?flow|liquidit|prévi.*tréso|prévi.*30/i, /cash.?flow|liquidity|treasury|cash.*forecast/i] },
  { intent: 'overview', patterns: [/vue.*ensemble|résumé|situation|état.*comptable|overview/i, /summary|big.?picture|comptable.*status|état.*général/i] },
];

export function detectIntent(question: string): Intent {
  for (const { intent, patterns } of INTENT_KEYWORDS) {
    for (const p of patterns) {
      if (p.test(question)) return intent;
    }
  }
  return 'unknown';
}

// ============================================================================
// Labels — bilingual dict (toutes les chaînes user-facing du moteur)
// ============================================================================

function getLabels(locale: Locale) {
  const isEn = locale === 'en';
  return {
    // KPI labels
    kpiRevenueMonth: isEn ? 'Revenue (month)' : 'CA encaissé (mois)',
    kpiRevenueYear: isEn ? 'Revenue (year)' : 'CA encaissé (année)',
    kpiOutstanding: isEn ? 'Outstanding' : 'En attente',
    kpiOverdue: isEn ? 'Overdue' : 'En retard',
    kpiVatCollected: isEn ? 'VAT collected (paid)' : 'TVA collectée (payée)',
    kpiCraPending: isEn ? 'Timesheets to validate' : 'CRA à valider',
    kpiOverdueCount: isEn ? 'Overdue invoices' : 'Factures en retard',
    kpiAmountHt: isEn ? 'Excl. VAT total' : 'Montant HT total',
    kpiPaid30: isEn ? 'Cashed last 30 days' : 'Encaissé 30 derniers jours',
    kpiExpected30: isEn ? 'Expected within 30 days' : 'Attendu dans les 30 jours',
    kpiPendingCount: isEn ? 'Sent invoices unpaid' : 'Factures envoyées non payées',
    kpiVatQuarterCa: (q: number) => isEn ? `Excl. VAT Q${q} revenue` : `CA HT trimestre T${q}`,
    kpiVatQuarter: (q: number) => isEn ? `VAT collected Q${q}` : `TVA collectée T${q}`,
    kpiCraValidatedNotInvoiced: isEn ? 'Validated timesheets not invoiced' : 'CRA validés non facturés',
    kpiTopClient: isEn ? 'Top client' : 'Premier client',
    kpiClientCount: isEn ? 'Active clients' : 'Clients actifs',
    kpiAvgDso: isEn ? 'Avg DSO (days)' : 'DSO moyen (jours)',
    kpiMedianDso: isEn ? 'Median DSO' : 'DSO médian',
    kpiForecast90: isEn ? 'Expected revenue 90 days' : 'CA prévu 90 jours',
    kpiActiveMissions: isEn ? 'Active missions' : 'Missions actives',
    kpiWinRate: isEn ? 'Win rate' : 'Taux de gain',
    kpiOppsWon: isEn ? 'Won' : 'Gagnées',
    kpiOppsLost: isEn ? 'Lost' : 'Perdues',
    kpiPipelineValue: isEn ? 'Weighted pipeline' : 'Pipeline pondéré',
    kpiPipelineRaw: isEn ? 'Raw pipeline' : 'Pipeline brut',
    kpiOppsOpen: isEn ? 'Open opportunities' : 'Opportunités ouvertes',
    // List titles
    listOverdue: isEn ? 'Overdue invoices' : 'Liste des factures en retard',
    listPendingInvoices: isEn ? 'Invoices awaiting payment' : 'Factures en attente de paiement',
    listPendingCra: isEn ? 'Timesheets pending' : 'CRA en attente',
    listToInvoice: isEn ? 'To invoice' : 'À facturer',
    listTopClients: isEn ? 'Top clients by paid revenue' : 'Top clients par CA encaissé',
    listTopConsultants: isEn ? 'Top consultants by billed revenue' : 'Top consultants par CA facturé',
    listAging: isEn ? 'Aging buckets (overdue invoices)' : 'Ancienneté des créances (factures en retard)',
    listForecastByMission: isEn ? 'Forecast by active mission' : 'Prévi. par mission active',
    // List item formatters
    daysWordShort: isEn ? 'd' : 'j',
    dueWord: isEn ? 'Due' : 'Échéance',
    overdueByWord: (d: number) => isEn ? `overdue by ${d} ${d > 1 ? 'days' : 'day'}` : `retard ${d} j`,
    daysOf: (d: number) => isEn ? `${d} ${d > 1 ? 'days' : 'day'}` : `${d} j`,
    daysValidated: (d: number) => isEn ? `${d} validated days` : `${d} jours validés`,
    daysWorkedStatus: (worked: number, status: string) => isEn ? `${worked} d · status ${status}` : `${worked} j · statut ${status}`,
    percentOfRevenue: (p: number) => isEn ? `${p}% of total revenue` : `${p}% du CA total`,
    invoicesCount: (n: number) => isEn ? `${n} ${n > 1 ? 'invoices' : 'invoice'}` : `${n} facture${n > 1 ? 's' : ''}`,
    // Suggestions / response texts
    txtOverview: isEn
      ? "Here is a snapshot of your accounting state. I check what I can verify from invoices and timesheets."
      : "Voici une vue d'ensemble de l'état comptable de ta SAS. Je regarde ce que je peux vérifier depuis les factures et les CRA actuels.",
    txtOverdue: isEn
      ? 'Looking at overdue invoices (past due date, unpaid, not cancelled).'
      : 'Je regarde les factures en retard (échéance dépassée, non payées, non annulées).',
    txtCashflow: isEn
      ? 'Simplified cash flow analysis based on paid invoices and 30-day due dates.'
      : 'Analyse trésorerie simplifiée basée sur les factures payées et les échéances à 30 jours.',
    txtPendingInvoices: isEn ? 'Invoices sent but not yet paid:' : 'Factures envoyées mais pas encore payées :',
    txtPendingCra: isEn ? 'Timesheets not yet validated by client:' : "Comptes rendus d'activité non encore validés par le client :",
    txtVat: isEn
      ? 'VAT overview for the current quarter (based on paid invoices).'
      : 'Aperçu TVA sur le trimestre en cours (basé sur les factures payées).',
    txtReminder: isEn
      ? "I'm drafting a follow-up email for the most overdue invoice."
      : "Je te prépare un brouillon d'email de relance pour la facture la plus en retard.",
    txtUnmatchedCra: isEn
      ? "Checking client-validated timesheets that don't have an invoice yet."
      : "Je vérifie les CRA validés client qui n'ont pas encore de facture associée.",
    txtTopClients: isEn
      ? 'Top clients by paid revenue. Watch concentration: if top 1 > 30 %, your business depends too much on a single client.'
      : 'Top clients par CA encaissé. Surveille la concentration : si le top 1 > 30 %, ton activité dépend trop d\'un seul client.',
    txtTopConsultants: isEn
      ? "Top consultants ranked by total billed revenue (paid invoices)."
      : 'Top consultants classés par CA total facturé (factures payées).',
    txtDso: isEn
      ? 'Days Sales Outstanding = average days between issue date and payment date. Industry standard: 30-45 days.'
      : 'DSO (Days Sales Outstanding) = délai moyen entre émission et paiement. Norme : 30-45 jours.',
    txtAging: isEn
      ? 'Aging report — overdue invoices grouped by days past due. Anything beyond 90 days is critical.'
      : 'Balance âgée — factures en retard groupées par jours dépassés. Au-delà de 90 j, c\'est critique.',
    txtForecast90: isEn
      ? 'Revenue forecast over the next 90 days, based on active missions and 20 working days/month.'
      : 'Prévi de CA sur les 90 prochains jours, basé sur les missions actives et 20 jours ouvrés/mois.',
    txtWinRate: isEn
      ? 'Win rate on closed opportunities (won / (won + lost)). A healthy ratio is above 25 %.'
      : 'Taux de gain sur les opportunités closes (gagnées / (gagnées + perdues)). Un ratio sain est au-dessus de 25 %.',
    txtPipelineValue: isEn
      ? "Weighted pipeline = sum of (expected revenue × probability). Raw pipeline = sum without weighting."
      : 'Pipeline pondéré = somme de (CA prévu × probabilité). Pipeline brut = somme sans pondération.',
    // Suggestion bodies (empty-state messages)
    sugNoOverdue: isEn ? 'No overdue invoice. Excellent!' : 'Aucune facture en retard. Excellent !',
    sugCanDraftReminder: isEn
      ? 'I can draft a follow-up email if you want — ask me "draft a follow-up".'
      : 'Je peux générer un email de relance type si tu veux — demande-moi « rédige une relance ».',
    sugCashSlowing: isEn
      ? 'Watch out: cash-in is slowing. Check if some invoices need a reminder.'
      : "Attention : le rythme des encaissements ralentit. Vérifie si certaines factures doivent être relancées.",
    sugCashAccelerating: isEn
      ? 'Good news: upcoming cash-in exceeds the past rhythm. Keep an eye on overdues.'
      : 'Bonne nouvelle : les encaissements à venir dépassent le rythme passé. Surveille les retards.',
    sugNoPending: isEn ? 'No invoice awaiting payment.' : 'Aucune facture en attente de paiement.',
    sugNoCraPending: isEn ? 'All timesheets are validated. Bravo!' : 'Tous les CRA sont validés. Bravo !',
    sugVatReminder: isEn
      ? "Reminder: VAT return (CA3) is due before the 24th of the following month. Deductible VAT (purchases) isn't tracked here — add it manually."
      : "Rappel : déclaration TVA CA3 à déposer avant le 24 du mois suivant. Je n'ai pas la TVA déductible (achats) ici, ajoute-la manuellement au CA3.",
    sugNoReminderNeeded: isEn ? 'No invoice to chase today.' : "Aucune facture à relancer aujourd'hui.",
    sugReminderCount: (n: number) => isEn
      ? `Copy this draft. ${n > 0 ? `${n} other invoice(s) are also overdue — ask "overdue invoices" for the full list.` : ''}`
      : `Copie-colle ce brouillon. ${n > 0 ? `${n} autre(s) facture(s) sont aussi en retard — demande « factures en retard » pour la liste complète.` : ''}`,
    sugAllCraInvoiced: isEn ? 'All validated timesheets have been invoiced.' : 'Tous les CRA validés ont bien été facturés.',
    sugInvoiceCra: isEn
      ? 'Open a timesheet and click "Invoice this timesheet" to generate the related invoice.'
      : 'Ouvre un CRA et clique « Facturer ce CRA » pour générer la facture associée.',
    sugNoClients: isEn ? 'No paid invoice yet — no client revenue to analyse.' : 'Aucune facture payée pour le moment — pas de CA client à analyser.',
    sugClientConcentration: (pct: number) => isEn
      ? `⚠ Concentration risk: your top client represents ${pct}% of your paid revenue. Diversify your portfolio.`
      : `⚠ Risque de concentration : ton top client représente ${pct}% du CA encaissé. Diversifie ton portefeuille.`,
    sugClientHealthy: isEn ? 'Your client portfolio is well diversified.' : 'Ton portefeuille client est bien diversifié.',
    sugNoConsultants: isEn ? 'No paid invoice linked to a consultant yet.' : 'Aucune facture payée associée à un consultant pour le moment.',
    sugDsoHealthy: (dso: number) => isEn
      ? `Excellent: average DSO at ${dso} d is well below the 45-day standard.`
      : `Excellent : DSO moyen à ${dso} j, bien en-dessous du seuil de 45 j.`,
    sugDsoWarn: (dso: number) => isEn
      ? `DSO at ${dso} d is borderline. Send earlier reminders to bring it under 45.`
      : `DSO à ${dso} j, à la limite. Envoie des relances plus tôt pour passer sous 45.`,
    sugDsoBad: (dso: number) => isEn
      ? `Critical: DSO at ${dso} d is too high. Tighten payment terms or use factoring.`
      : `Critique : DSO à ${dso} j, trop élevé. Resserre tes conditions de règlement ou affactore.`,
    sugDsoNoData: isEn ? 'Not enough paid invoices with payment date to compute DSO.' : 'Pas assez de factures payées avec date de paiement pour calculer le DSO.',
    sugAgingNoOverdue: isEn ? 'No overdue invoice. Nothing to age.' : 'Aucune facture en retard. Rien à âger.',
    sugAgingCritical: (amount: string) => isEn
      ? `${amount} are overdue by more than 90 days. Consider legal recovery or write-off.`
      : `${amount} sont en retard de plus de 90 jours. Pense au recouvrement contentieux ou à la provision.`,
    sugForecastNoMissions: isEn ? 'No active mission — no forecast to compute.' : 'Aucune mission active — pas de prévi à calculer.',
    sugWinRateNoData: isEn
      ? 'No closed opportunity (won or lost) to compute the win rate.'
      : 'Aucune opportunité close (gagnée ou perdue) pour calculer le taux.',
    sugWinRateHealthy: (r: number) => isEn ? `Healthy win rate at ${r}%.` : `Taux de gain sain à ${r}%.`,
    sugWinRateLow: (r: number) => isEn
      ? `Win rate at ${r}% is low — review qualification of your opportunities.`
      : `Taux de gain à ${r}% — faible. Revois la qualification de tes opportunités.`,
    sugPipelineNoOpps: isEn ? 'No open opportunity in the pipeline.' : 'Aucune opportunité ouverte dans le pipeline.',
    // Aging bucket labels
    bucket0_30: isEn ? '1-30 days' : '1-30 jours',
    bucket31_60: isEn ? '31-60 days' : '31-60 jours',
    bucket61_90: isEn ? '61-90 days' : '61-90 jours',
    bucket90plus: isEn ? '90+ days' : '90+ jours',
    // Unknown fallback
    txtUnknown: isEn
      ? 'I\'m not sure I understand. Try: "overview", "overdue invoices", "cash flow", "VAT", "DSO", "aging", "top clients", "top consultants", "win rate", "pipeline value", "forecast 90 days", "timesheets to validate", or "draft a follow-up".'
      : "Je ne suis pas sûr de comprendre. Essaie : « vue d'ensemble », « factures en retard », « trésorerie », « TVA », « DSO », « balance âgée », « top clients », « top consultants », « taux de gain », « valeur pipeline », « prévi 90 jours », « CRA à valider », ou « rédige une relance ».",
    // Reminder email body
    reminderEmail: (params: {
      invoiceNumber: string;
      period: string | null;
      amountHt: string;
      amountTtc: string;
      daysLate: number;
      orgBrand: string;
    }) => isEn
      ? `Hello,

Unless we missed something, our invoice ${params.invoiceNumber}${
          params.period ? ` related to the ${params.period} period` : ''
        } for ${params.amountHt} excl. VAT (${params.amountTtc} incl. VAT) remains unpaid — past due by ${params.daysLate} day${params.daysLate > 1 ? 's' : ''}.

Could you please process the payment at your earliest convenience? We remain at your disposal for any question.

Best regards,
${params.orgBrand}`
      : `Bonjour,

Sauf erreur de notre part, notre facture ${params.invoiceNumber}${
          params.period ? ` relative à la période ${params.period}` : ''
        } d'un montant de ${params.amountHt} HT (${params.amountTtc} TTC) est restée impayée, avec une échéance dépassée de ${params.daysLate} jour${params.daysLate > 1 ? 's' : ''}.

Nous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais. Nous restons à votre disposition pour toute question.

Cordialement,
${params.orgBrand}`,
    reminderTitle: (invoiceNumber: string) => isEn
      ? `Reminder email — ${invoiceNumber}`
      : `Email de relance — ${invoiceNumber}`,
  };
}

// ============================================================================
// Helpers — formatting + date math
// ============================================================================

function formatMoney(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(m: number, locale: Locale): string {
  return (locale === 'en' ? MONTHS_EN : MONTHS_FR)[m - 1] ?? '';
}

function formatDate(d: string | Date | null, locale: Locale): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR');
}

// ============================================================================
// Data fetch helpers
// ============================================================================

async function fetchInvoices(): Promise<Invoice[]> {
  const supabase = createClient();
  const { data } = await supabase.from('invoices').select('*').order('issue_date', { ascending: false });
  return (data ?? []) as Invoice[];
}

async function fetchTimesheets(): Promise<Timesheet[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('timesheets')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  return (data ?? []) as Timesheet[];
}

async function fetchOpportunities(): Promise<Opportunity[]> {
  const supabase = createClient();
  const { data } = await supabase.from('opportunities').select('*');
  return (data ?? []) as Opportunity[];
}

async function fetchActiveMissions(): Promise<Mission[]> {
  const supabase = createClient();
  const { data } = await supabase.from('missions').select('*').eq('status', 'active');
  return (data ?? []) as Mission[];
}

async function fetchCompanyNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase.from('companies').select('id, name').in('id', ids);
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.id as string, (row.name as string) ?? '—');
  return map;
}

async function fetchConsultantNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase.from('consultants').select('id, first_name, last_name').in('id', ids);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const fn = (row.first_name as string) ?? '';
    const ln = (row.last_name as string) ?? '';
    map.set(row.id as string, `${fn} ${ln}`.trim() || '—');
  }
  return map;
}

// ============================================================================
// Intent handlers
// ============================================================================

async function handleOverview(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const [invoices, timesheets] = await Promise.all([fetchInvoices(), fetchTimesheets()]);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const paid = invoices.filter((i) => i.status === 'paid');
  const pending = invoices.filter((i) => ['sent', 'overdue'].includes(i.status));
  const overdue = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now,
  );
  const caMonth = paid
    .filter((i) => i.issue_date.startsWith(thisMonth))
    .reduce((s, i) => s + Number(i.amount_ht), 0);
  const caYTD = paid
    .filter((i) => i.issue_date.startsWith(String(now.getFullYear())))
    .reduce((s, i) => s + Number(i.amount_ht), 0);
  const outstanding = pending.reduce((s, i) => s + Number(i.amount_ht), 0);
  const vatCollected = paid.reduce((s, i) => s + Number(i.amount_vat), 0);
  const craPending = timesheets.filter((t) => t.status !== 'client_validated').length;

  return [
    { type: 'kpi', label: L.kpiRevenueMonth, value: formatMoney(caMonth, locale), tone: 'good' },
    { type: 'kpi', label: L.kpiRevenueYear, value: formatMoney(caYTD, locale), tone: 'good' },
    { type: 'kpi', label: L.kpiOutstanding, value: formatMoney(outstanding, locale), tone: outstanding > 0 ? 'warn' : 'neutral' },
    {
      type: 'kpi',
      label: L.kpiOverdue,
      value: `${overdue.length} · ${formatMoney(overdue.reduce((s, i) => s + Number(i.amount_ht), 0), locale)}`,
      tone: overdue.length > 0 ? 'bad' : 'good',
    },
    { type: 'kpi', label: L.kpiVatCollected, value: formatMoney(vatCollected, locale), tone: 'neutral' },
    { type: 'kpi', label: L.kpiCraPending, value: String(craPending), tone: craPending > 0 ? 'warn' : 'good' },
  ];
}

async function handleOverdue(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const now = new Date();
  const overdue = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now,
  );
  if (overdue.length === 0) {
    return [{ type: 'suggestion', text: L.sugNoOverdue }];
  }
  const total = overdue.reduce((s, i) => s + Number(i.amount_ht), 0);
  return [
    { type: 'kpi', label: L.kpiOverdueCount, value: String(overdue.length), tone: 'bad' },
    { type: 'kpi', label: L.kpiAmountHt, value: formatMoney(total, locale), tone: 'bad' },
    {
      type: 'list',
      title: L.listOverdue,
      items: overdue.map((i) => ({
        label: i.invoice_number,
        sub: `${L.dueWord} ${formatDate(i.due_date, locale)} · ${L.overdueByWord(daysBetween(now, new Date(i.due_date)))}`,
        value: formatMoney(Number(i.amount_ht), locale),
        href: `/invoices/${i.id}`,
        tone: 'bad',
      })),
    },
    { type: 'suggestion', text: L.sugCanDraftReminder },
  ];
}

async function handleCashflow(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const now = new Date();
  const paid30 = invoices
    .filter((i) => i.status === 'paid' && i.payment_date)
    .filter((i) => daysBetween(now, new Date(i.payment_date as string)) <= 30)
    .reduce((s, i) => s + Number(i.amount_ht), 0);
  const expected30 = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .filter((i) => daysBetween(new Date(i.due_date), now) <= 30)
    .reduce((s, i) => s + Number(i.amount_ht), 0);
  return [
    { type: 'kpi', label: L.kpiPaid30, value: formatMoney(paid30, locale), tone: 'good' },
    { type: 'kpi', label: L.kpiExpected30, value: formatMoney(expected30, locale), tone: expected30 > 0 ? 'warn' : 'neutral' },
    { type: 'suggestion', text: expected30 > paid30 ? L.sugCashAccelerating : L.sugCashSlowing },
  ];
}

async function handlePendingInvoices(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const pending = invoices.filter((i) => i.status === 'sent');
  if (pending.length === 0) return [{ type: 'suggestion', text: L.sugNoPending }];
  const total = pending.reduce((s, i) => s + Number(i.amount_ht), 0);
  return [
    { type: 'kpi', label: L.kpiPendingCount, value: String(pending.length), tone: 'warn' },
    { type: 'kpi', label: L.kpiAmountHt, value: formatMoney(total, locale), tone: 'warn' },
    {
      type: 'list',
      title: L.listPendingInvoices,
      items: pending.map((i) => ({
        label: i.invoice_number,
        sub: `${L.dueWord} ${formatDate(i.due_date, locale)}`,
        value: formatMoney(Number(i.amount_ht), locale),
        href: `/invoices/${i.id}`,
      })),
    },
  ];
}

async function handlePendingTimesheets(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const timesheets = await fetchTimesheets();
  const pending = timesheets.filter((t) => t.status !== 'client_validated');
  if (pending.length === 0) return [{ type: 'suggestion', text: L.sugNoCraPending }];
  return [
    { type: 'kpi', label: L.kpiCraPending, value: String(pending.length), tone: 'warn' },
    {
      type: 'list',
      title: L.listPendingCra,
      items: pending.map((t) => ({
        label: `${monthLabel(t.period_month, locale)} ${t.period_year}`,
        sub: L.daysWorkedStatus(t.days_worked, t.status),
        href: `/timesheets/${t.id}`,
        tone: 'warn',
      })),
    },
  ];
}

async function handleVat(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const now = new Date();
  const startQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const paidThisQuarter = invoices
    .filter((i) => i.status === 'paid')
    .filter((i) => new Date(i.issue_date) >= startQuarter);
  const vatTotal = paidThisQuarter.reduce((s, i) => s + Number(i.amount_vat), 0);
  const htTotal = paidThisQuarter.reduce((s, i) => s + Number(i.amount_ht), 0);
  const q = Math.floor(now.getMonth() / 3) + 1;
  return [
    { type: 'kpi', label: L.kpiVatQuarterCa(q), value: formatMoney(htTotal, locale), tone: 'good' },
    { type: 'kpi', label: L.kpiVatQuarter(q), value: formatMoney(vatTotal, locale), tone: 'neutral' },
    { type: 'suggestion', text: L.sugVatReminder },
  ];
}

async function handleReminder(locale: Locale, orgBrand: string): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const now = new Date();
  const overdue = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now,
  );
  if (overdue.length === 0) return [{ type: 'suggestion', text: L.sugNoReminderNeeded }];
  const first = overdue[0];
  const daysLate = daysBetween(now, new Date(first.due_date));
  const body = L.reminderEmail({
    invoiceNumber: first.invoice_number,
    period: first.period_label ?? null,
    amountHt: formatMoney(Number(first.amount_ht), locale),
    amountTtc: formatMoney(Number(first.amount_ttc), locale),
    daysLate,
    orgBrand,
  });
  return [
    { type: 'draft', title: L.reminderTitle(first.invoice_number), body },
    { type: 'suggestion', text: L.sugReminderCount(overdue.length - 1) },
  ];
}

async function handleUnmatchedCra(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const [timesheets, invoices] = await Promise.all([fetchTimesheets(), fetchInvoices()]);
  const invoicedTsIds = new Set(invoices.map((i) => i.timesheet_id).filter(Boolean));
  const validatedNotInvoiced = timesheets.filter(
    (t) => t.status === 'client_validated' && !invoicedTsIds.has(t.id),
  );
  if (validatedNotInvoiced.length === 0) return [{ type: 'suggestion', text: L.sugAllCraInvoiced }];
  return [
    { type: 'kpi', label: L.kpiCraValidatedNotInvoiced, value: String(validatedNotInvoiced.length), tone: 'warn' },
    {
      type: 'list',
      title: L.listToInvoice,
      items: validatedNotInvoiced.map((t) => ({
        label: `${monthLabel(t.period_month, locale)} ${t.period_year}`,
        sub: L.daysValidated(t.days_validated),
        href: `/timesheets/${t.id}`,
        tone: 'warn',
      })),
    },
    { type: 'suggestion', text: L.sugInvoiceCra },
  ];
}

async function handleTopClients(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const paid = invoices.filter((i) => i.status === 'paid');
  if (paid.length === 0) return [{ type: 'suggestion', text: L.sugNoClients }];
  // Group paid invoices by company_id
  const byClient = new Map<string, number>();
  for (const inv of paid) {
    const cur = byClient.get(inv.company_id) ?? 0;
    byClient.set(inv.company_id, cur + Number(inv.amount_ht));
  }
  const total = Array.from(byClient.values()).reduce((s, v) => s + v, 0);
  const sorted = Array.from(byClient.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const names = await fetchCompanyNames(sorted.map(([id]) => id));
  const top1Pct = total > 0 ? Math.round((sorted[0][1] / total) * 100) : 0;
  const blocks: AssistantBlock[] = [
    { type: 'kpi', label: L.kpiTopClient, value: `${names.get(sorted[0][0]) ?? '—'} · ${top1Pct}%`, tone: top1Pct > 30 ? 'bad' : 'good' },
    { type: 'kpi', label: L.kpiClientCount, value: String(byClient.size), tone: 'neutral' },
    {
      type: 'list',
      title: L.listTopClients,
      items: sorted.map(([id, amount]) => {
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return {
          label: names.get(id) ?? '—',
          sub: L.percentOfRevenue(pct),
          value: formatMoney(amount, locale),
          tone: pct > 30 ? 'bad' : 'good',
        };
      }),
    },
    {
      type: 'suggestion',
      text: top1Pct > 30 ? L.sugClientConcentration(top1Pct) : L.sugClientHealthy,
    },
  ];
  return blocks;
}

async function handleTopConsultants(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const paid = invoices.filter((i) => i.status === 'paid' && i.consultant_id);
  if (paid.length === 0) return [{ type: 'suggestion', text: L.sugNoConsultants }];
  const byConsultant = new Map<string, number>();
  for (const inv of paid) {
    const id = inv.consultant_id as string;
    byConsultant.set(id, (byConsultant.get(id) ?? 0) + Number(inv.amount_ht));
  }
  const sorted = Array.from(byConsultant.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const names = await fetchConsultantNames(sorted.map(([id]) => id));
  return [
    {
      type: 'list',
      title: L.listTopConsultants,
      items: sorted.map(([id, amount]) => ({
        label: names.get(id) ?? '—',
        sub: L.invoicesCount(paid.filter((i) => i.consultant_id === id).length),
        value: formatMoney(amount, locale),
        href: `/consultants/${id}`,
        tone: 'good',
      })),
    },
  ];
}

async function handleDso(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const paidWithDate = invoices.filter((i) => i.status === 'paid' && i.payment_date && i.issue_date);
  if (paidWithDate.length === 0) return [{ type: 'suggestion', text: L.sugDsoNoData }];
  const delays = paidWithDate
    .map((i) => daysBetween(new Date(i.payment_date as string), new Date(i.issue_date)))
    .filter((d) => d >= 0);
  if (delays.length === 0) return [{ type: 'suggestion', text: L.sugDsoNoData }];
  const avg = Math.round(delays.reduce((s, d) => s + d, 0) / delays.length);
  const sorted = [...delays].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const tone: 'good' | 'warn' | 'bad' = avg <= 30 ? 'good' : avg <= 45 ? 'warn' : 'bad';
  const sug = avg <= 30 ? L.sugDsoHealthy(avg) : avg <= 45 ? L.sugDsoWarn(avg) : L.sugDsoBad(avg);
  return [
    { type: 'kpi', label: L.kpiAvgDso, value: `${avg} ${L.daysWordShort}`, tone },
    { type: 'kpi', label: L.kpiMedianDso, value: `${median} ${L.daysWordShort}`, tone: 'neutral' },
    { type: 'suggestion', text: sug },
  ];
}

async function handleAging(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const invoices = await fetchInvoices();
  const now = new Date();
  const overdue = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now,
  );
  if (overdue.length === 0) return [{ type: 'suggestion', text: L.sugAgingNoOverdue }];
  const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0 };
  const counts = { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0 };
  for (const inv of overdue) {
    const d = daysBetween(now, new Date(inv.due_date));
    const amt = Number(inv.amount_ht);
    if (d <= 30) { buckets.b0_30 += amt; counts.b0_30 += 1; }
    else if (d <= 60) { buckets.b31_60 += amt; counts.b31_60 += 1; }
    else if (d <= 90) { buckets.b61_90 += amt; counts.b61_90 += 1; }
    else { buckets.b90plus += amt; counts.b90plus += 1; }
  }
  const blocks: AssistantBlock[] = [
    {
      type: 'list',
      title: L.listAging,
      items: [
        { label: L.bucket0_30, sub: L.invoicesCount(counts.b0_30), value: formatMoney(buckets.b0_30, locale), tone: 'warn' },
        { label: L.bucket31_60, sub: L.invoicesCount(counts.b31_60), value: formatMoney(buckets.b31_60, locale), tone: 'warn' },
        { label: L.bucket61_90, sub: L.invoicesCount(counts.b61_90), value: formatMoney(buckets.b61_90, locale), tone: 'bad' },
        { label: L.bucket90plus, sub: L.invoicesCount(counts.b90plus), value: formatMoney(buckets.b90plus, locale), tone: 'bad' },
      ],
    },
  ];
  if (buckets.b90plus > 0) {
    blocks.push({ type: 'suggestion', text: L.sugAgingCritical(formatMoney(buckets.b90plus, locale)) });
  }
  return blocks;
}

async function handleForecast90(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const missions = await fetchActiveMissions();
  if (missions.length === 0) return [{ type: 'suggestion', text: L.sugForecastNoMissions }];
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 86_400_000);
  const WORKING_DAYS_PER_MONTH = 20;
  // Per mission : days remaining (until end_date or 90 days) × daily_rate
  type Forecast = { id: string; title: string; amount: number };
  const perMission: Forecast[] = missions.map((m) => {
    const endDate = m.end_date ? new Date(m.end_date) : in90;
    const horizon = endDate < in90 ? endDate : in90;
    const daysUntilHorizon = Math.max(0, daysBetween(horizon, now));
    const workingDays = Math.round((daysUntilHorizon / 30) * WORKING_DAYS_PER_MONTH);
    return {
      id: m.id,
      title: m.title ?? '—',
      amount: workingDays * Number(m.daily_rate_eur ?? 0),
    };
  });
  const total = perMission.reduce((s, m) => s + m.amount, 0);
  const sorted = [...perMission].sort((a, b) => b.amount - a.amount).slice(0, 5);
  return [
    { type: 'kpi', label: L.kpiForecast90, value: formatMoney(total, locale), tone: 'good' },
    { type: 'kpi', label: L.kpiActiveMissions, value: String(missions.length), tone: 'neutral' },
    {
      type: 'list',
      title: L.listForecastByMission,
      items: sorted.map((m) => ({
        label: m.title,
        value: formatMoney(m.amount, locale),
        href: `/missions`,
        tone: 'good',
      })),
    },
  ];
}

async function handleWinRate(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const opps = await fetchOpportunities();
  const won = opps.filter((o) => o.status === 'won').length;
  const lost = opps.filter((o) => o.status === 'lost').length;
  const closed = won + lost;
  if (closed === 0) return [{ type: 'suggestion', text: L.sugWinRateNoData }];
  const rate = Math.round((won / closed) * 100);
  const tone: 'good' | 'warn' | 'bad' = rate >= 25 ? 'good' : rate >= 15 ? 'warn' : 'bad';
  return [
    { type: 'kpi', label: L.kpiWinRate, value: `${rate}%`, tone },
    { type: 'kpi', label: L.kpiOppsWon, value: String(won), tone: 'good' },
    { type: 'kpi', label: L.kpiOppsLost, value: String(lost), tone: 'bad' },
    { type: 'suggestion', text: rate >= 25 ? L.sugWinRateHealthy(rate) : L.sugWinRateLow(rate) },
  ];
}

async function handlePipelineValue(locale: Locale): Promise<AssistantBlock[]> {
  const L = getLabels(locale);
  const opps = await fetchOpportunities();
  const open = opps.filter((o) => !['won', 'lost', 'on_hold'].includes(o.status));
  if (open.length === 0) return [{ type: 'suggestion', text: L.sugPipelineNoOpps }];
  const rawTotal = open.reduce((s, o) => s + Number(o.expected_revenue ?? 0), 0);
  const weightedTotal = open.reduce(
    (s, o) => s + Number(o.expected_revenue ?? 0) * (Number(o.probability ?? 50) / 100),
    0,
  );
  return [
    { type: 'kpi', label: L.kpiPipelineValue, value: formatMoney(weightedTotal, locale), tone: 'good' },
    { type: 'kpi', label: L.kpiPipelineRaw, value: formatMoney(rawTotal, locale), tone: 'neutral' },
    { type: 'kpi', label: L.kpiOppsOpen, value: String(open.length), tone: 'neutral' },
  ];
}

// ============================================================================
// Main entry point
// ============================================================================

export async function askAssistant(
  question: string,
  options: { locale?: Locale; orgBrand?: string } = {},
): Promise<{ intent: Intent; text: string; blocks: AssistantBlock[] }> {
  const locale: Locale = options.locale ?? 'fr';
  const orgBrand = options.orgBrand ?? 'Centrium';
  const L = getLabels(locale);
  const intent = detectIntent(question);

  switch (intent) {
    case 'overview':
      return { intent, text: L.txtOverview, blocks: await handleOverview(locale) };
    case 'overdue':
      return { intent, text: L.txtOverdue, blocks: await handleOverdue(locale) };
    case 'cashflow':
      return { intent, text: L.txtCashflow, blocks: await handleCashflow(locale) };
    case 'pending_invoices':
      return { intent, text: L.txtPendingInvoices, blocks: await handlePendingInvoices(locale) };
    case 'pending_timesheets':
      return { intent, text: L.txtPendingCra, blocks: await handlePendingTimesheets(locale) };
    case 'vat':
      return { intent, text: L.txtVat, blocks: await handleVat(locale) };
    case 'reminder':
      return { intent, text: L.txtReminder, blocks: await handleReminder(locale, orgBrand) };
    case 'unmatched_cra':
      return { intent, text: L.txtUnmatchedCra, blocks: await handleUnmatchedCra(locale) };
    case 'top_clients':
      return { intent, text: L.txtTopClients, blocks: await handleTopClients(locale) };
    case 'top_consultants':
      return { intent, text: L.txtTopConsultants, blocks: await handleTopConsultants(locale) };
    case 'dso':
      return { intent, text: L.txtDso, blocks: await handleDso(locale) };
    case 'aging':
      return { intent, text: L.txtAging, blocks: await handleAging(locale) };
    case 'forecast_90':
      return { intent, text: L.txtForecast90, blocks: await handleForecast90(locale) };
    case 'win_rate':
      return { intent, text: L.txtWinRate, blocks: await handleWinRate(locale) };
    case 'pipeline_value':
      return { intent, text: L.txtPipelineValue, blocks: await handlePipelineValue(locale) };
    default:
      return { intent: 'unknown', text: L.txtUnknown, blocks: [] };
  }
}

// ============================================================================
// Quick prompts — bilingual + new intents
// ============================================================================

export type QuickPromptKey =
  | 'overview'
  | 'overdue_invoices'
  | 'treasury_30'
  | 'cra_to_validate'
  | 'cra_not_invoiced'
  | 'vat_quarter'
  | 'draft_followup'
  | 'top_clients'
  | 'top_consultants'
  | 'dso'
  | 'aging'
  | 'forecast_90'
  | 'win_rate'
  | 'pipeline_value';

/** Quick prompt seed. `question` est en FR par défaut — le detectIntent
 * comprend FR ET EN, donc la question FR fonctionne dans les deux modes.
 * Les agents UI peuvent override avec une variante EN si besoin. */
export const QUICK_PROMPTS: Array<{
  key: QuickPromptKey;
  /** Label FR pour le bouton — l'UI utilise i18n keys pour traduire. */
  label: string;
  /** Question envoyée à `askAssistant` (FR — comprise dans les 2 modes). */
  question: string;
}> = [
  { key: 'overview', label: "Vue d'ensemble", question: "Donne-moi une vue d'ensemble comptable" },
  { key: 'overdue_invoices', label: 'Factures en retard', question: 'Quelles factures sont en retard ?' },
  { key: 'treasury_30', label: 'Trésorerie 30j', question: 'Fais-moi une prévi de trésorerie sur 30 jours' },
  { key: 'aging', label: 'Balance âgée', question: 'Montre-moi la balance âgée' },
  { key: 'dso', label: 'DSO', question: 'Calcule mon DSO' },
  { key: 'top_clients', label: 'Top clients', question: 'Qui sont mes top clients ?' },
  { key: 'top_consultants', label: 'Top consultants', question: 'Quels sont mes top consultants ?' },
  { key: 'forecast_90', label: 'Prévi 90j', question: 'Prévi de CA sur les 90 prochains jours' },
  { key: 'win_rate', label: 'Taux de gain', question: 'Quel est mon taux de gain commercial ?' },
  { key: 'pipeline_value', label: 'Valeur pipeline', question: 'Quelle est la valeur de mon pipeline ?' },
  { key: 'cra_to_validate', label: 'CRA à valider', question: 'Quels CRA sont à valider ?' },
  { key: 'cra_not_invoiced', label: 'CRA non facturés', question: 'Quels CRA validés ne sont pas encore facturés ?' },
  { key: 'vat_quarter', label: 'TVA du trimestre', question: 'Calcule la TVA du trimestre' },
  { key: 'draft_followup', label: 'Rédige une relance', question: 'Rédige un email de relance pour la facture la plus en retard' },
];
