import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { getQuotaUsage } from '@/lib/billing/enforce';
import { getStripe } from '@/lib/billing/stripe';

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

// =========================================================================
// DELETE /api/admin/organizations/:id — suppression DÉFINITIVE d'une org.
// -------------------------------------------------------------------------
// Super_admin only. Garde-fous :
//   - refus si l'org est exemptée (protège l'org fondateur QuadCore)
//   - annule l'abonnement Stripe (immédiat) pour ne pas continuer à facturer
//   - supprime la ligne organizations → CASCADE sur toutes les données
//     org-scopées (profils, consultants, missions, factures, contrats…)
//   - nettoie les comptes auth.users devenus orphelins (membres + consultants
//     portail), en épargnant le fondateur / super_admin et l'appelant
// La demande de devis liée (quote_requests) est dé-liée (SET NULL) → elle
// réapparaît comme convertible.
// =========================================================================
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSuperAdminContext();
  if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const orgId = params.id;
  const admin = createAdminClient('org-deletion');

  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Garde-fou RGPD / réversibilité : on ne supprime JAMAIS une org sans qu'un
  // export de ses données ait été réalisé au préalable (portabilité art. 20 +
  // filet anti-erreur irréversible). La preuve = une entrée d'audit
  // data.exported. Le body peut forcer le contrôle après un export récent.
  const { data: exportProof } = await admin
    .from('activities')
    .select('id, created_at')
    .eq('organization_id', orgId)
    .eq('action', 'data.exported')
    .eq('entity_type', 'organization_data')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const body = await req.json().catch(() => ({}));
  if (!exportProof && body?.exported !== true) {
    return NextResponse.json(
      {
        error: 'export_required',
        message:
          "Exporte d'abord les données de cette organisation (bouton « Exporter ») avant de la supprimer. La suppression est définitive.",
      },
      { status: 409 },
    );
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, is_exempt_from_billing')
    .eq('organization_id', orgId)
    .maybeSingle();

  // Garde-fou : on ne supprime jamais une org exemptée (fondateurs / interne).
  if (sub?.is_exempt_from_billing) {
    return NextResponse.json(
      {
        error: 'exempt_protected',
        message:
          'Cette organisation est exemptée de facturation (compte fondateur/interne) et ne peut pas être supprimée depuis la console.',
      },
      { status: 400 },
    );
  }

  // Comptes auth à nettoyer APRÈS la cascade : on capture avant suppression.
  // On épargne les fondateurs, les super_admin et l'appelant lui-même.
  const { data: orgProfiles } = await admin
    .from('profiles')
    .select('id, role, is_founder')
    .eq('organization_id', orgId);
  const authUserIds = (orgProfiles ?? [])
    .filter((p) => !p.is_founder && p.role !== 'super_admin' && p.id !== ctx.user.id)
    .map((p) => p.id as string);

  // Annulation Stripe immédiate (best-effort — ne bloque jamais la suppression).
  if (sub?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch {
      /* subscription test/déjà annulée/inexistante — on continue */
    }
  }

  // Suppression de l'org → CASCADE sur toutes les tables org-scopées.
  const { error: delErr } = await admin.from('organizations').delete().eq('id', orgId);
  if (delErr) {
    return NextResponse.json({ error: 'delete_failed', message: delErr.message }, { status: 500 });
  }

  // Nettoyage des comptes auth orphelins (best-effort, en parallèle).
  const cleanup = await Promise.allSettled(
    authUserIds.map((uid) => admin.auth.admin.deleteUser(uid)),
  );
  const authDeleted = cleanup.filter((r) => r.status === 'fulfilled').length;

  return NextResponse.json({
    data: { deleted: true, name: org.name, authAccountsDeleted: authDeleted },
  });
}
