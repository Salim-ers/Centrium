import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { getQuotaUsage } from '@/lib/billing/enforce';

// =========================================================================
// GET /api/admin/organizations/:id — fiche complète de supervision d'une org
// -------------------------------------------------------------------------
// Assemble : identité + branding, abonnement (+ plan), usage vs limites
// (réutilise getQuotaUsage), membres internes, effectifs métier, et le flux
// d'activité récent (« ce qu'ils font dans l'outil »). Super_admin only.
// =========================================================================

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSuperAdminContext();
  if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const orgId = params.id;
  const admin = createAdminClient('cross-org-query');

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  if (orgErr || !org) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Abonnement + plan, usage (via l'enforcer partagé), membres, activité et
  // compteurs métier — en parallèle.
  const [
    { data: subscription },
    usage,
    { data: membersRaw },
    { data: activities },
    counts,
  ] = await Promise.all([
    admin
      .from('subscriptions')
      .select(
        'plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, trial_end, is_exempt_from_billing, created_at, plans(name, price_monthly_eur)',
      )
      .eq('organization_id', orgId)
      .maybeSingle(),
    getQuotaUsage(orgId),
    admin
      .from('organization_members')
      .select('user_id, role, joined_at, profiles(email, first_name, last_name, is_founder)')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true }),
    admin
      .from('activities')
      .select('id, actor_id, entity_type, entity_id, action, metadata, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(40),
    (async () => {
      const c = (t: string) => buildCount(admin, t, orgId);
      const [invoices, paidRevenue, consultants, missions, contracts, opportunities, contacts, timesheets, jobOffers] =
        await Promise.all([
          c('invoices'),
          admin
            .from('invoices')
            .select('amount_ht')
            .eq('organization_id', orgId)
            .eq('status', 'paid'),
          c('consultants'),
          c('missions'),
          c('contracts'),
          c('opportunities'),
          c('contacts'),
          c('timesheets'),
          c('job_offers'),
        ]);
      const revenue = ((paidRevenue.data ?? []) as { amount_ht: number | null }[]).reduce(
        (s, r) => s + Number(r.amount_ht ?? 0),
        0,
      );
      return {
        invoices: invoices.count ?? 0,
        paidRevenue: revenue,
        consultants: consultants.count ?? 0,
        missions: missions.count ?? 0,
        contracts: contracts.count ?? 0,
        opportunities: opportunities.count ?? 0,
        contacts: contacts.count ?? 0,
        timesheets: timesheets.count ?? 0,
        jobOffers: jobOffers.count ?? 0,
      };
    })(),
  ]);

  const members = (membersRaw ?? []).map((m) => {
    const p = m.profiles as unknown as {
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      is_founder: boolean | null;
    } | null;
    return {
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      email: p?.email ?? null,
      first_name: p?.first_name ?? null,
      last_name: p?.last_name ?? null,
      is_founder: !!p?.is_founder,
    };
  });

  // Noms des acteurs pour le flux d'activité (map user_id → nom/email).
  const actorIds = Array.from(
    new Set((activities ?? []).map((a) => a.actor_id).filter(Boolean) as string[]),
  );
  let actorMap: Record<string, { name: string | null; email: string | null }> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', actorIds);
    actorMap = Object.fromEntries(
      (actors ?? []).map((a) => [
        a.id,
        {
          name: [a.first_name, a.last_name].filter(Boolean).join(' ') || null,
          email: a.email,
        },
      ]),
    );
  }

  return NextResponse.json({
    data: {
      org,
      subscription: subscription ?? null,
      usage,
      members,
      counts,
      activities: (activities ?? []).map((a) => ({
        ...a,
        actor: a.actor_id ? (actorMap[a.actor_id] ?? null) : null,
      })),
    },
  });
}

function buildCount(admin: ReturnType<typeof createAdminClient>, table: string, orgId: string) {
  return admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);
}
