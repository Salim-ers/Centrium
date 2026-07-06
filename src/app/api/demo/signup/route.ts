import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/billing/stripe';
import {
  requireStripePriceId,
  StripeConfigError,
  type StripePlanId,
} from '@/lib/billing/config';
import { slugify } from '@/lib/utils';

// =========================================================================
// POST /api/demo/signup — Self-signup « Demander une démo » (public).
// -------------------------------------------------------------------------
// Parcours (carte à l'inscription) :
//   1. Le prospect crée son compte + son organisation.
//   2. La sub démarre en 'incomplete' → PAS d'accès tant que la carte
//      n'est pas saisie (anti-abus : pas d'essai gratuit sans carte).
//   3. On ouvre un Stripe Checkout en mode subscription avec un ESSAI de
//      7 jours (trial_period_days) et collecte de carte OBLIGATOIRE
//      (payment_method_collection: 'always') → 0 € débité maintenant.
//   4. À la fin de l'essai, Stripe débite automatiquement la carte. Le
//      webhook (billing/webhook) synchronise trialing → active.
//
// Les fondateurs supervisent/valident/suspendent depuis la super console.
// =========================================================================

export const runtime = 'nodejs';

const TRIAL_DAYS = 7;
const CHECKOUTABLE = new Set<StripePlanId>(['starter', 'growth', 'enterprise']);

const schema = z.object({
  company_name: z.string().min(2, 'Nom de société requis').max(120),
  first_name: z.string().min(1, 'Prénom requis').max(80),
  last_name: z.string().min(1, 'Nom requis').max(80),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum').max(256),
  plan_id: z.enum(['starter', 'growth', 'enterprise']).default('starter'),
});

/** Slug unique : slugify + suffixe incrémental si collision. */
async function uniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string> {
  const root = slugify(base).slice(0, 48) || 'org';
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', message: parsed.error.issues[0]?.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const email = data.email.trim().toLowerCase();

  // Vérifie le plan AVANT de créer quoi que ce soit (fail fast si Stripe
  // n'est pas configuré).
  if (!CHECKOUTABLE.has(data.plan_id)) {
    return NextResponse.json({ error: 'unknown_plan' }, { status: 400 });
  }
  let priceId: string;
  try {
    priceId = requireStripePriceId(data.plan_id);
  } catch (e) {
    if (e instanceof StripeConfigError) {
      console.error(`[demo/signup] ${e.envVar} ${e.kind} — plan=${data.plan_id}`);
      return NextResponse.json(
        {
          error: 'stripe_not_configured',
          message:
            "L'inscription en ligne est momentanément indisponible. Écris à contact@centrium-platform.com — on te crée ton accès en quelques minutes.",
        },
        { status: 503 },
      );
    }
    throw e;
  }

  const admin = createAdminClient('onboarding');

  // Email déjà connu → on n'écrase rien, on invite à se connecter.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json(
      {
        error: 'email_taken',
        message: 'Un compte existe déjà avec cet email. Connecte-toi ou utilise « mot de passe oublié ».',
      },
      { status: 409 },
    );
  }

  // 1) Organisation
  const slug = await uniqueSlug(admin, data.company_name);
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: data.company_name.trim(), slug, brand_name: data.company_name.trim() })
    .select('id, name, slug')
    .single();
  if (orgErr || !org) {
    return NextResponse.json(
      { error: 'org_create_failed', message: orgErr?.message ?? 'inconnu' },
      { status: 500 },
    );
  }

  // 2) Compte admin (mot de passe choisi par le prospect, email confirmé
  //    pour pouvoir se connecter tout de suite).
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      first_name: data.first_name,
      last_name: data.last_name,
      organization_id: org.id,
      role: 'admin',
    },
  });
  if (userErr || !created?.user) {
    // Rollback best-effort de l'org pour ne pas laisser d'orpheline.
    await admin.from('organizations').delete().eq('id', org.id);
    const already = /already been registered|already exists/i.test(userErr?.message ?? '');
    return NextResponse.json(
      {
        error: already ? 'email_taken' : 'user_create_failed',
        message: already
          ? 'Un compte existe déjà avec cet email. Connecte-toi.'
          : (userErr?.message ?? 'Création du compte impossible'),
      },
      { status: already ? 409 : 500 },
    );
  }
  const userId = created.user.id;

  // 3) Profil (admin, rattaché à l'org) + membership. Upsert/insert
  //    idempotents (le trigger on_auth_user_created a pu créer le profil).
  await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      organization_id: org.id,
      role: 'admin',
      first_name: data.first_name,
      last_name: data.last_name,
      password_set: true,
    },
    { onConflict: 'id' },
  );
  await admin
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: userId, role: 'admin', invited_by: null })
    .then(({ error }) => {
      if (error && error.code !== '23505') {
        console.error('[demo/signup] membership insert failed', error.message);
      }
    });

  // 4) Client Stripe + abonnement en 'incomplete' (pas d'accès tant que la
  //    carte n'est pas saisie). Le trigger on_organization_created a pu
  //    poser une ligne 'trialing' — on la FORCE en 'incomplete' ici.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://centrium-platform.com';

  try {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email,
      name: data.company_name.trim(),
      metadata: { organization_id: org.id },
    });

    await admin.from('subscriptions').upsert(
      {
        organization_id: org.id,
        plan_id: data.plan_id,
        stripe_customer_id: customer.id,
        status: 'incomplete',
        trial_end: null,
        is_exempt_from_billing: false,
      },
      { onConflict: 'organization_id' },
    );

    // 5) Checkout : essai 7 j, carte OBLIGATOIRE, 0 € maintenant, débit
    //    auto à la fin de l'essai. metadata.organization_id → le webhook
    //    saura relier la sub à l'org.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { organization_id: org.id, plan_id: data.plan_id },
      },
      payment_method_collection: 'always',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${appUrl}/login?welcome=trial&email=${encodeURIComponent(email)}`,
      cancel_url: `${appUrl}/essai?canceled=1&email=${encodeURIComponent(email)}`,
    });

    return NextResponse.json({ data: { url: session.url, organization: org.name } }, { status: 201 });
  } catch (e) {
    if (e instanceof StripeConfigError) {
      console.error(`[demo/signup] ${e.envVar} ${e.kind}`);
      return NextResponse.json(
        {
          error: 'stripe_not_configured',
          message:
            "Le paiement n'est pas encore configuré. Ton compte est créé — écris à contact@centrium-platform.com pour l'activer.",
        },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : 'Erreur Stripe';
    console.error('[demo/signup] stripe error', message);
    // Le compte existe déjà : on renvoie une erreur claire, le prospect
    // pourra relancer le paiement depuis /billing après connexion.
    return NextResponse.json(
      {
        error: 'stripe_error',
        message: `Ton compte est créé mais l'ouverture du paiement a échoué (${message}). Connecte-toi : on te proposera de finaliser.`,
      },
      { status: 502 },
    );
  }
}
