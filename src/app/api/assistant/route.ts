import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthorization } from '@/lib/auth/rbac';
import { rateLimit } from '@/lib/security/rate-limit';
import { parseIntent, type Intent } from '@/lib/assistant/intents';
import { businessDaysOverlap } from '@/lib/utils/business-days';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  question: z.string().trim().min(3).max(300),
  locale: z.enum(['fr', 'en']).default('fr'),
});

export type AssistantItem = { label: string; sublabel?: string; value?: string; href?: string };
export type AssistantResponse = {
  intent: Intent['kind'];
  answer: string;
  items: AssistantItem[];
  /** Précision sur la méthode de calcul (transparence). */
  note?: string;
};

const fmtEur = (n: number, locale: 'fr' | 'en') =>
  new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string | null, locale: 'fr' | 'en') =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/**
 * Assistant Centrium : répond à des questions de pilotage à partir des
 * données de l'organisation. Toutes les lectures passent par la session
 * de l'utilisateur (RLS) et sont filtrées par ses permissions.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthorization();
  const limited = await rateLimit(`assistant:${auth.user.id}`, { limit: 30, windowSec: 60 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Trop de questions, réessayez dans une minute.' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Question invalide', details: parsed.error.flatten() }, { status: 400 });
  }
  const { question, locale } = parsed.data;
  const fr = locale === 'fr';
  const intent = parseIntent(question);
  const supabase = createClient();
  const can = (p: Parameters<typeof auth.permissions.has>[0]) => auth.permissions.has(p);
  const denied = (): NextResponse =>
    NextResponse.json<{ data: AssistantResponse }>({
      data: {
        intent: intent.kind,
        answer: fr
          ? "Votre rôle ne donne pas accès aux données nécessaires pour répondre à cette question."
          : 'Your role does not give access to the data needed to answer this question.',
        items: [],
      },
    });

  let result: AssistantResponse;

  switch (intent.kind) {
    case 'consultants_available': {
      if (!can('consultants.view')) return denied();
      let consultantIds: string[] | null = null;
      if (intent.skill) {
        const { data: skills } = await supabase
          .from('consultant_skills')
          .select('consultant_id')
          .ilike('name', `%${intent.skill.replace(/[%_]/g, '')}%`)
          .limit(500);
        consultantIds = [...new Set((skills ?? []).map((s) => s.consultant_id as string))];
      }
      let query = supabase
        .from('consultants')
        .select('id, first_name, last_name, job_title, status, available_from, current_mission_end, city')
        .eq('organization_id', auth.organizationId)
        .eq('archived', false)
        .eq('is_prospect', false)
        .limit(200);
      if (consultantIds) {
        if (consultantIds.length === 0) {
          result = {
            intent: intent.kind,
            answer: fr
              ? `Aucun consultant n'a la compétence « ${intent.skill} » dans son profil.`
              : `No consultant lists “${intent.skill}” as a skill.`,
            items: [],
          };
          break;
        }
        query = query.in('id', consultantIds);
      }
      const { data } = await query;
      const { from, to } = intent;
      // « Deviennent disponibles en <mois> » : seulement ceux qui se libèrent
      // dans la fenêtre. Sinon : disponibles maintenant ou d'ici `to`.
      const windowOnly = intent.periodLabel === 'next_month' || intent.periodLabel === 'month';
      const rows = (data ?? []).filter((c) => {
        if (c.status === 'unavailable' || c.status === 'archived') return false;
        const freeOn = (c.available_from ?? c.current_mission_end) as string | null;
        if (windowOnly) return !!freeOn && freeOn >= from && freeOn <= to;
        if (c.status === 'available') return !freeOn || freeOn <= to;
        return !!freeOn && freeOn <= to;
      });
      rows.sort((a, b) => (a.available_from ?? '0000').localeCompare(b.available_from ?? '0000'));
      const skillTxt = intent.skill ? ` ${fr ? 'avec' : 'with'} « ${intent.skill} »` : '';
      result = {
        intent: intent.kind,
        answer:
          rows.length === 0
            ? fr
              ? `Aucun consultant${skillTxt} disponible sur la période (${fmtDate(intent.from, locale)} → ${fmtDate(intent.to, locale)}).`
              : `No consultant${skillTxt} available for the period (${fmtDate(intent.from, locale)} → ${fmtDate(intent.to, locale)}).`
            : fr
              ? `${rows.length} consultant${rows.length > 1 ? 's' : ''}${skillTxt} disponible${rows.length > 1 ? 's' : ''} d'ici le ${fmtDate(intent.to, locale)}.`
              : `${rows.length} consultant${rows.length > 1 ? 's' : ''}${skillTxt} available by ${fmtDate(intent.to, locale)}.`,
        items: rows.slice(0, 12).map((c) => ({
          label: `${c.first_name} ${c.last_name}`,
          sublabel: [c.job_title, c.city].filter(Boolean).join(' · '),
          value:
            c.status === 'available' && !c.available_from
              ? fr
                ? 'Disponible'
                : 'Available'
              : fmtDate(c.available_from ?? c.current_mission_end, locale),
          href: `/consultants/${c.id}`,
        })),
        note: fr
          ? 'Basé sur le statut, la date de disponibilité et la fin de mission renseignés sur chaque fiche.'
          : 'Based on each profile’s status, availability date and mission end date.',
      };
      break;
    }

    case 'revenue_forecast': {
      if (!can('finance.view') && !can('analytics.view')) return denied();
      const monthStart = `${intent.year}-${String(intent.month).padStart(2, '0')}-01`;
      const monthEndDate = new Date(intent.year, intent.month, 0);
      const monthEnd = `${intent.year}-${String(intent.month).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;
      const { data } = await supabase
        .from('missions')
        .select('id, title, daily_rate_eur, start_date, end_date, status, companies(name)')
        .eq('organization_id', auth.organizationId)
        .eq('status', 'active')
        .lte('start_date', monthEnd)
        .or(`end_date.is.null,end_date.gte.${monthStart}`);
      const lines = (data ?? []).map((m) => {
        const days = businessDaysOverlap(m.start_date as string, (m.end_date as string | null) ?? null, intent.year, intent.month);
        return {
          id: m.id as string,
          title: m.title as string,
          client: (m as { companies?: { name?: string } | null }).companies?.name ?? '',
          days,
          amount: days * Number(m.daily_rate_eur ?? 0),
        };
      });
      const total = lines.reduce((s, l) => s + l.amount, 0);
      const monthLabel = new Date(intent.year, intent.month - 1, 1).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', {
        month: 'long',
        year: 'numeric',
      });
      result = {
        intent: intent.kind,
        answer: fr
          ? `CA prévisionnel de ${monthLabel} : ${fmtEur(total, locale)} HT, sur ${lines.length} mission${lines.length > 1 ? 's' : ''} active${lines.length > 1 ? 's' : ''}.`
          : `Forecast revenue for ${monthLabel}: ${fmtEur(total, locale)} excl. VAT, across ${lines.length} active mission${lines.length > 1 ? 's' : ''}.`,
        items: lines
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
          .map((l) => ({
            label: l.title,
            sublabel: `${l.client}${l.client ? ' · ' : ''}${l.days} ${fr ? 'j ouvrés' : 'business days'}`,
            value: fmtEur(l.amount, locale),
            href: `/missions/${l.id}`,
          })),
        note: fr
          ? 'TJM × jours ouvrés (fériés français exclus) des missions actives sur le mois. Les congés ne sont pas déduits.'
          : 'Day rate × business days (French public holidays excluded) for missions active that month. Leave is not deducted.',
      };
      break;
    }

    case 'missions_ending': {
      if (!can('missions.view')) return denied();
      const today = new Date();
      const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate() + intent.days);
      const toIso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const { data } = await supabase
        .from('missions')
        .select('id, title, end_date, consultants(first_name, last_name), companies(name)')
        .eq('organization_id', auth.organizationId)
        .eq('status', 'active')
        .gte('end_date', toIso(today))
        .lte('end_date', toIso(limit))
        .order('end_date', { ascending: true });
      const rows = data ?? [];
      result = {
        intent: intent.kind,
        answer:
          rows.length === 0
            ? fr
              ? `Aucune mission active ne se termine dans les ${intent.days} prochains jours.`
              : `No active mission ends in the next ${intent.days} days.`
            : fr
              ? `${rows.length} mission${rows.length > 1 ? 's' : ''} se termine${rows.length > 1 ? 'nt' : ''} dans les ${intent.days} prochains jours.`
              : `${rows.length} mission${rows.length > 1 ? 's' : ''} end${rows.length > 1 ? '' : 's'} in the next ${intent.days} days.`,
        items: rows.map((m) => {
          const c = (m as { consultants?: { first_name?: string; last_name?: string } | null }).consultants;
          return {
            label: m.title as string,
            sublabel: [c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : null, (m as { companies?: { name?: string } | null }).companies?.name]
              .filter(Boolean)
              .join(' · '),
            value: fmtDate(m.end_date as string, locale),
            href: `/missions/${m.id}`,
          };
        }),
      };
      break;
    }

    case 'intercontract': {
      if (!can('staffing.view')) return denied();
      const { data } = await supabase
        .from('consultants')
        .select('id, first_name, last_name, job_title, available_from, contract_type')
        .eq('organization_id', auth.organizationId)
        .eq('archived', false)
        .eq('is_prospect', false)
        .eq('status', 'available');
      const rows = data ?? [];
      result = {
        intent: intent.kind,
        answer: fr
          ? `${rows.length} consultant${rows.length > 1 ? 's' : ''} sans mission actuellement.`
          : `${rows.length} consultant${rows.length > 1 ? 's' : ''} currently without a mission.`,
        items: rows.slice(0, 15).map((c) => ({
          label: `${c.first_name} ${c.last_name}`,
          sublabel: c.job_title ?? undefined,
          href: `/consultants/${c.id}`,
        })),
      };
      break;
    }

    case 'pending_timesheets': {
      if (!can('timesheets.view')) return denied();
      const { data } = await supabase
        .from('timesheets')
        .select('id, period_month, period_year, days_worked, consultants(first_name, last_name)')
        .eq('organization_id', auth.organizationId)
        .eq('status', 'submitted')
        .eq('archived', false)
        .order('submitted_at', { ascending: true });
      const rows = data ?? [];
      result = {
        intent: intent.kind,
        answer: fr
          ? `${rows.length} CRA attend${rows.length > 1 ? 'ent' : ''} une validation.`
          : `${rows.length} timesheet${rows.length > 1 ? 's' : ''} awaiting approval.`,
        items: rows.map((t) => {
          const c = (t as { consultants?: { first_name?: string; last_name?: string } | null }).consultants;
          return {
            label: c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : '—',
            sublabel: `${String(t.period_month).padStart(2, '0')}/${t.period_year}`,
            value: `${t.days_worked} j`,
            href: `/timesheets/${t.id}`,
          };
        }),
      };
      break;
    }

    case 'client_summary': {
      if (!can('clients.view')) return denied();
      const name = intent.clientName.replace(/[%_]/g, '');
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, city')
        .eq('organization_id', auth.organizationId)
        .eq('archived', false)
        .ilike('name', `%${name}%`)
        .limit(3);
      const company = companies?.[0];
      if (!company) {
        result = {
          intent: intent.kind,
          answer: fr ? `Aucun client ne correspond à « ${intent.clientName} ».` : `No client matches “${intent.clientName}”.`,
          items: [],
        };
        break;
      }
      const [opps, missions, contacts] = await Promise.all([
        supabase
          .from('opportunities')
          .select('id, title, status, expected_revenue, probability')
          .eq('company_id', company.id)
          .not('status', 'in', '(won,lost)'),
        supabase
          .from('missions')
          .select('id, title, status, daily_rate_eur, end_date, consultants(first_name, last_name)')
          .eq('company_id', company.id)
          .in('status', ['active', 'proposed']),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('archived', false),
      ]);
      const openOpps = opps.data ?? [];
      const activeMissions = (missions.data ?? []).filter((m) => m.status === 'active');
      const pipeline = openOpps.reduce(
        (s, o) => s + Number(o.expected_revenue ?? 0) * (Number(o.probability ?? 0) / 100),
        0,
      );
      const parts = fr
        ? [
            `${activeMissions.length} mission${activeMissions.length > 1 ? 's' : ''} en cours`,
            `${openOpps.length} opportunité${openOpps.length > 1 ? 's' : ''} ouverte${openOpps.length > 1 ? 's' : ''}`,
            `${contacts.count ?? 0} contact${(contacts.count ?? 0) > 1 ? 's' : ''}`,
          ]
        : [
            `${activeMissions.length} active mission${activeMissions.length > 1 ? 's' : ''}`,
            `${openOpps.length} open opportunit${openOpps.length > 1 ? 'ies' : 'y'}`,
            `${contacts.count ?? 0} contact${(contacts.count ?? 0) > 1 ? 's' : ''}`,
          ];
      if (can('finance.view') || can('analytics.view')) {
        parts.push(fr ? `pipeline pondéré ${fmtEur(pipeline, locale)}` : `weighted pipeline ${fmtEur(pipeline, locale)}`);
      }
      result = {
        intent: intent.kind,
        answer: `${company.name} : ${parts.join(', ')}.`,
        items: [
          ...activeMissions.slice(0, 6).map((m) => {
            const c = (m as { consultants?: { first_name?: string; last_name?: string } | null }).consultants;
            return {
              label: m.title as string,
              sublabel: c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : undefined,
              value: m.end_date ? `${fr ? 'fin' : 'ends'} ${fmtDate(m.end_date as string, locale)}` : undefined,
              href: `/missions/${m.id}`,
            };
          }),
          ...openOpps.slice(0, 6).map((o) => ({
            label: o.title as string,
            sublabel: fr ? 'Opportunité' : 'Opportunity',
            href: `/opportunities/${o.id}`,
          })),
          { label: fr ? `Ouvrir la fiche ${company.name}` : `Open ${company.name}`, href: `/clients/${company.id}` },
        ],
      };
      break;
    }

    default:
      result = {
        intent: 'unknown',
        answer: fr
          ? "Je ne sais pas encore répondre à cette question. Essayez par exemple : « Quels consultants deviennent disponibles le mois prochain ? », « Quel est mon CA prévisionnel pour décembre ? », « Quelles missions terminent dans moins de 30 jours ? », « Trouve les consultants AWS disponibles », « Résume l'activité du client Orange »."
          : 'I can’t answer that yet. Try: “Which consultants become available next month?”, “What is my forecast revenue for December?”, “Which missions end in less than 30 days?”, “Find available AWS consultants”, “Summarise activity for client Orange”.',
        items: [],
      };
  }

  return NextResponse.json<{ data: AssistantResponse }>({ data: result });
}
