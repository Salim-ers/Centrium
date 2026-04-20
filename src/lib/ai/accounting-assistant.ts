// =========================================================================
// Accounting Assistant – QuadCore Platform
// -------------------------------------------------------------------------
// Assistant comptable mock pour SAS. Détecte une intention dans la question
// utilisateur, charge les données pertinentes depuis Supabase, et retourne
// une réponse structurée (texte + données + suggestions d'action).
//
// En V1 : remplacer par un appel LLM Claude avec tool use (les tools étant
// les mêmes queries Supabase utilisées ici).
// =========================================================================

import { createClient } from '@/lib/supabase/client';
import type { Invoice, Timesheet } from '@/types';

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
  | 'unknown';

// ---- Intent detection (simple keyword matcher, good enough for MVP) ----

const INTENT_KEYWORDS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  { intent: 'overview', patterns: [/vue.*ensemble|résumé|situation|état/i] },
  { intent: 'overdue', patterns: [/retard|impayé|en souffrance|overdue/i] },
  { intent: 'cashflow', patterns: [/trésor|cash\s?flow|liquidit|prévi/i] },
  { intent: 'pending_invoices', patterns: [/en attente|facture.*envoyée|non.*pay/i] },
  { intent: 'pending_timesheets', patterns: [/cra.*(valider|attente|en cours)/i] },
  { intent: 'vat', patterns: [/tva|taxe|déclaration/i] },
  { intent: 'reminder', patterns: [/relance|relanc|rappel/i] },
  { intent: 'unmatched_cra', patterns: [/cra.*(non facturé|sans facture|pas.*facturé)/i] },
];

export function detectIntent(question: string): Intent {
  for (const { intent, patterns } of INTENT_KEYWORDS) {
    for (const p of patterns) {
      if (p.test(question)) return intent;
    }
  }
  return 'unknown';
}

// ---- Helpers ----

function euros(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// ---- Data fetch helpers ----

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

// ---- Intent handlers ----

async function handleOverview(): Promise<AssistantBlock[]> {
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
    { type: 'kpi', label: 'CA encaissé (mois)', value: euros(caMonth), tone: 'good' },
    { type: 'kpi', label: 'CA encaissé (année)', value: euros(caYTD), tone: 'good' },
    {
      type: 'kpi',
      label: 'En attente',
      value: euros(outstanding),
      tone: outstanding > 0 ? 'warn' : 'neutral',
    },
    {
      type: 'kpi',
      label: 'En retard',
      value: `${overdue.length} · ${euros(overdue.reduce((s, i) => s + Number(i.amount_ht), 0))}`,
      tone: overdue.length > 0 ? 'bad' : 'good',
    },
    { type: 'kpi', label: 'TVA collectée (payée)', value: euros(vatCollected), tone: 'neutral' },
    {
      type: 'kpi',
      label: 'CRA à valider',
      value: String(craPending),
      tone: craPending > 0 ? 'warn' : 'good',
    },
  ];
}

async function handleOverdue(): Promise<AssistantBlock[]> {
  const invoices = await fetchInvoices();
  const now = new Date();
  const overdue = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now,
  );

  if (overdue.length === 0) {
    return [{ type: 'suggestion', text: 'Aucune facture en retard. Excellent !' }];
  }

  const total = overdue.reduce((s, i) => s + Number(i.amount_ht), 0);

  return [
    { type: 'kpi', label: 'Factures en retard', value: String(overdue.length), tone: 'bad' },
    { type: 'kpi', label: 'Montant HT total', value: euros(total), tone: 'bad' },
    {
      type: 'list',
      title: 'Liste des factures en retard',
      items: overdue.map((i) => ({
        label: i.invoice_number,
        sub: `Échéance : ${new Date(i.due_date).toLocaleDateString('fr-FR')} · retard ${daysBetween(now, new Date(i.due_date))} j`,
        value: euros(Number(i.amount_ht)),
        href: `/invoices/${i.id}`,
        tone: 'bad',
      })),
    },
    {
      type: 'suggestion',
      text: 'Je peux générer un email de relance type si tu veux — demande-moi « rédige une relance ».',
    },
  ];
}

async function handleCashflow(): Promise<AssistantBlock[]> {
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
    { type: 'kpi', label: 'Encaissé 30 derniers jours', value: euros(paid30), tone: 'good' },
    {
      type: 'kpi',
      label: 'Attendu dans les 30 jours',
      value: euros(expected30),
      tone: expected30 > 0 ? 'warn' : 'neutral',
    },
    {
      type: 'suggestion',
      text: expected30 > paid30
        ? 'Bonne nouvelle : les encaissements à venir dépassent le rythme passé. Surveille les retards.'
        : "Attention : le rythme des encaissements ralentit. Vérifie si certaines factures doivent être relancées.",
    },
  ];
}

async function handlePendingInvoices(): Promise<AssistantBlock[]> {
  const invoices = await fetchInvoices();
  const pending = invoices.filter((i) => i.status === 'sent');
  const total = pending.reduce((s, i) => s + Number(i.amount_ht), 0);

  if (pending.length === 0) {
    return [{ type: 'suggestion', text: 'Aucune facture en attente de paiement.' }];
  }

  return [
    { type: 'kpi', label: 'Factures envoyées non payées', value: String(pending.length), tone: 'warn' },
    { type: 'kpi', label: 'Montant HT', value: euros(total), tone: 'warn' },
    {
      type: 'list',
      title: 'Factures en attente de paiement',
      items: pending.map((i) => ({
        label: i.invoice_number,
        sub: `Échéance ${new Date(i.due_date).toLocaleDateString('fr-FR')}`,
        value: euros(Number(i.amount_ht)),
        href: `/invoices/${i.id}`,
      })),
    },
  ];
}

async function handlePendingTimesheets(): Promise<AssistantBlock[]> {
  const timesheets = await fetchTimesheets();
  const pending = timesheets.filter((t) => t.status !== 'client_validated');

  if (pending.length === 0) {
    return [{ type: 'suggestion', text: 'Tous les CRA sont validés. Bravo !' }];
  }

  const MONTHS = [
    'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
  ];

  return [
    { type: 'kpi', label: 'CRA à valider', value: String(pending.length), tone: 'warn' },
    {
      type: 'list',
      title: 'CRA en attente',
      items: pending.map((t) => ({
        label: `${MONTHS[t.period_month - 1]} ${t.period_year}`,
        sub: `${t.days_worked} j · statut ${t.status}`,
        href: `/timesheets/${t.id}`,
        tone: 'warn',
      })),
    },
  ];
}

async function handleVat(): Promise<AssistantBlock[]> {
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
    { type: 'kpi', label: `CA HT trimestre T${q}`, value: euros(htTotal), tone: 'good' },
    { type: 'kpi', label: `TVA collectée T${q}`, value: euros(vatTotal), tone: 'neutral' },
    {
      type: 'suggestion',
      text:
        "Rappel : déclaration TVA CA3 à déposer avant le 24 du mois suivant. Je n'ai pas la TVA déductible (achats) ici, ajoute-la manuellement au CA3.",
    },
  ];
}

async function handleReminder(): Promise<AssistantBlock[]> {
  const invoices = await fetchInvoices();
  const now = new Date();
  const overdue = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now,
  );

  if (overdue.length === 0) {
    return [
      { type: 'suggestion', text: 'Aucune facture à relancer aujourd\'hui.' },
    ];
  }

  const first = overdue[0];
  const retard = daysBetween(now, new Date(first.due_date));

  const body = `Bonjour,

Sauf erreur de notre part, notre facture ${first.invoice_number}${
    first.period_label ? ` relative à la période ${first.period_label}` : ''
  } d'un montant de ${euros(Number(first.amount_ht))} HT (${euros(
    Number(first.amount_ttc),
  )} TTC) est restée impayée, avec une échéance dépassée de ${retard} jour${retard > 1 ? 's' : ''}.

Nous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais. Nous restons à votre disposition pour toute question.

Cordialement,
QuadCore SAS`;

  return [
    { type: 'draft', title: `Email de relance — ${first.invoice_number}`, body },
    {
      type: 'suggestion',
      text: `Copie-colle ce brouillon. ${overdue.length - 1 > 0 ? `${overdue.length - 1} autre(s) facture(s) sont aussi en retard — demande « factures en retard » pour la liste complète.` : ''}`,
    },
  ];
}

async function handleUnmatchedCra(): Promise<AssistantBlock[]> {
  const [timesheets, invoices] = await Promise.all([fetchTimesheets(), fetchInvoices()]);
  const invoicedTsIds = new Set(invoices.map((i) => i.timesheet_id).filter(Boolean));
  const validatedNotInvoiced = timesheets.filter(
    (t) => t.status === 'client_validated' && !invoicedTsIds.has(t.id),
  );

  if (validatedNotInvoiced.length === 0) {
    return [{ type: 'suggestion', text: 'Tous les CRA validés ont bien été facturés.' }];
  }

  const MONTHS = [
    'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
  ];

  return [
    { type: 'kpi', label: 'CRA validés non facturés', value: String(validatedNotInvoiced.length), tone: 'warn' },
    {
      type: 'list',
      title: 'À facturer',
      items: validatedNotInvoiced.map((t) => ({
        label: `${MONTHS[t.period_month - 1]} ${t.period_year}`,
        sub: `${t.days_validated} jours validés`,
        href: `/timesheets/${t.id}`,
        tone: 'warn',
      })),
    },
    {
      type: 'suggestion',
      text: 'Ouvre un CRA et clique « Facturer ce CRA » pour générer la facture associée.',
    },
  ];
}

// ---- Main entry point ----

export async function askAssistant(
  question: string,
): Promise<{ intent: Intent; text: string; blocks: AssistantBlock[] }> {
  const intent = detectIntent(question);

  switch (intent) {
    case 'overview': {
      const blocks = await handleOverview();
      return {
        intent,
        text:
          "Voici une vue d'ensemble de l'état comptable de ta SAS. Je regarde ce que je peux vérifier depuis les factures et les CRA actuels.",
        blocks,
      };
    }
    case 'overdue': {
      const blocks = await handleOverdue();
      return {
        intent,
        text: 'Je regarde les factures en retard (échéance dépassée, non payées, non annulées).',
        blocks,
      };
    }
    case 'cashflow': {
      const blocks = await handleCashflow();
      return {
        intent,
        text: 'Analyse trésorerie simplifiée basée sur les factures payées et les échéances à 30 jours.',
        blocks,
      };
    }
    case 'pending_invoices': {
      const blocks = await handlePendingInvoices();
      return { intent, text: 'Factures envoyées mais pas encore payées :', blocks };
    }
    case 'pending_timesheets': {
      const blocks = await handlePendingTimesheets();
      return { intent, text: 'Comptes rendus d\'activité non encore validés par le client :', blocks };
    }
    case 'vat': {
      const blocks = await handleVat();
      return { intent, text: 'Aperçu TVA sur le trimestre en cours (basé sur les factures payées).', blocks };
    }
    case 'reminder': {
      const blocks = await handleReminder();
      return {
        intent,
        text: 'Je te prépare un brouillon d\'email de relance pour la facture la plus en retard.',
        blocks,
      };
    }
    case 'unmatched_cra': {
      const blocks = await handleUnmatchedCra();
      return {
        intent,
        text: 'Je vérifie les CRA validés client qui n\'ont pas encore de facture associée.',
        blocks,
      };
    }
    default:
      return {
        intent: 'unknown',
        text:
          "Je ne suis pas sûr de comprendre. Essaie : « vue d'ensemble », « factures en retard », « trésorerie », « TVA », « CRA à valider », « CRA non facturés », ou « rédige une relance ».",
        blocks: [],
      };
  }
}

export const QUICK_PROMPTS: Array<{ label: string; question: string }> = [
  { label: "Vue d'ensemble", question: "Donne-moi une vue d'ensemble comptable" },
  { label: 'Factures en retard', question: 'Quelles factures sont en retard ?' },
  { label: 'Trésorerie 30j', question: 'Fais-moi une prévi de trésorerie sur 30 jours' },
  { label: 'CRA à valider', question: 'Quels CRA sont à valider ?' },
  { label: 'CRA non facturés', question: 'Quels CRA validés ne sont pas encore facturés ?' },
  { label: 'TVA du trimestre', question: 'Calcule la TVA du trimestre' },
  { label: 'Rédige une relance', question: 'Rédige un email de relance pour la facture la plus en retard' },
];
