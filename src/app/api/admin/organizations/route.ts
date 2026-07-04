import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { sendEmail } from '@/lib/email/send';

// =========================================================================
// POST /api/admin/organizations — Provisionne un nouvel espace client.
//
// Workflow (super_admin only) :
//   1. Crée l'organisation avec son branding + ses mentions légales
//   2. Invite le premier admin par email (via auth admin invite)
//   3. Marque la demande de devis comme 'won' + lie l'org créée
// =========================================================================

export const runtime = 'nodejs';

// Check centralisé (rôle super_admin + allowlist FOUNDER_EMAILS) —
// cf. lib/auth/super-admin.ts. Le wrapper local préserve les call-sites.
async function requireSuperAdmin() {
  const ctx = await getSuperAdminContext();
  return ctx?.user ?? null;
}

const schema = z.object({
  // Identité
  name: z.string().min(1, 'Nom requis').max(200),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'kebab-case minuscules uniquement'),
  brand_name: z.string().max(80).optional().nullable(),

  // Branding visuel
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
  signature_url: z.string().url().optional().nullable().or(z.literal('')),
  brand_primary_color: z.string().max(20).optional().nullable(),
  brand_accent_color: z.string().max(20).optional().nullable(),
  footer_tagline: z.string().max(200).optional().nullable(),

  // Coordonnées
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(60).optional().nullable(),

  // Mentions légales
  legal_form: z.string().max(40).optional().nullable(),
  siren: z.string().max(20).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
  vat_number: z.string().max(30).optional().nullable(),
  rcs: z.string().max(100).optional().nullable(),
  capital_eur: z.coerce.number().min(0).optional().nullable(),

  // Signataire
  representative_name: z.string().max(120).optional().nullable(),
  representative_title: z.string().max(120).optional().nullable(),

  // Bancaire
  iban: z.string().max(40).optional().nullable(),
  bic: z.string().max(20).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),

  // Premier admin à inviter
  admin_email: z.string().email('Email invalide'),
  admin_first_name: z.string().max(80).optional().nullable(),
  admin_last_name: z.string().max(80).optional().nullable(),

  // Optionnel : lier au quote_request qu'on convertit
  quote_request_id: z.string().uuid().optional().nullable(),

  // Abonnement choisi lors du provisionnement (suite au devis)
  plan_id: z.enum(['starter', 'growth', 'enterprise']).default('starter'),
  // trial_7d  : accès immédiat, paiement à la fin de l'essai de 7 jours
  // paid_only : accès BLOQUÉ tant que l'abonnement n'est pas payé (défaut
  //             du tunnel devis : confirmation → email avec lien de paiement)
  // exempt    : partenaire/interne — jamais facturé, aucune limite
  // ('trial_14d' accepté en alias legacy → traité comme trial_7d)
  billing_mode: z
    .enum(['trial_7d', 'trial_14d', 'paid_only', 'exempt'])
    .default('trial_7d'),
});

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');

  // Calcule l'URL absolue pour le redirect Supabase Auth.
  //
  // PRIORITÉ :
  //   1. NEXT_PUBLIC_APP_URL si défini (à privilégier en prod)
  //   2. Domaine canonique 'centrium-platform.com' (hardcoded par sécurité —
  //      évite que l'invitation pointe vers quad-core-platform.fr (ancien
  //      domaine) ou un domaine de preview Vercel temporaire).
  //   3. En dernier recours, l'origine de la requête (utile en dev local).
  const reqUrl = new URL(req.url);
  const requestHost = reqUrl.host;
  const isCanonicalRequest = requestHost === 'centrium-platform.com';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    (isCanonicalRequest
      ? 'https://centrium-platform.com'
      : requestHost.endsWith('localhost') || requestHost.endsWith('localhost:3000')
        ? `${reqUrl.protocol}//${requestHost}`
        : 'https://centrium-platform.com'); // force prod canonical sur tout autre domaine (quad-core-platform.fr, preview Vercel, etc.)

  // Normalise '' → null pour les champs nullables.
  const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
  const data = parsed.data;
  const orgPayload = {
    name: data.name,
    slug: data.slug,
    brand_name: blank(data.brand_name) ?? data.name,
    logo_url: blank(data.logo_url),
    signature_url: blank(data.signature_url),
    brand_primary_color: blank(data.brand_primary_color),
    brand_accent_color: blank(data.brand_accent_color),
    footer_tagline: blank(data.footer_tagline),
    address: blank(data.address),
    city: blank(data.city),
    postal_code: blank(data.postal_code),
    country: blank(data.country),
    legal_form: blank(data.legal_form),
    siren: blank(data.siren),
    siret: blank(data.siret),
    vat_number: blank(data.vat_number),
    rcs: blank(data.rcs),
    capital_eur: data.capital_eur ?? null,
    representative_name: blank(data.representative_name),
    representative_title: blank(data.representative_title),
    iban: blank(data.iban),
    bic: blank(data.bic),
    bank_name: blank(data.bank_name),
  };

  // 1) Création de l'organisation
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert(orgPayload)
    .select('id, slug, name')
    .single();
  if (orgErr || !org) {
    return NextResponse.json(
      { error: 'org_create_failed', message: orgErr?.message ?? 'inconnu' },
      { status: 500 },
    );
  }

  // 2) Création du compte admin via generateLink — SANS email Supabase.
  //
  // POURQUOI (bug vécu) : l'ancien flow envoyait DEUX emails (invite
  // Supabase « Active ton compte » + welcome Resend « Payer mon
  // abonnement »), et le bouton de paiement pointait sur /billing qui
  // exige une session → le destinataire, sans mot de passe encore,
  // atterrissait sur /login. Impasse totale.
  //
  // Désormais UN SEUL email (Resend, brandé) dont le bouton porte le
  // token d'activation et ENCHAÎNE tout : /auth/callback (session) →
  // /auth/first-password (mot de passe) → /billing?plan=… (paiement
  // Stripe direct) pour le mode paid_only, ou /dashboard sinon.
  const chainedNext =
    data.billing_mode === 'paid_only' ? `/billing?plan=${data.plan_id}` : '';
  const firstPasswordPath =
    `/auth/first-password?welcome=invited&org=${encodeURIComponent(org.name)}` +
    (chainedNext ? `&next=${encodeURIComponent(chainedNext)}` : '');
  const { data: invite, error: inviteErr } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: data.admin_email,
    options: {
      data: {
        first_name: data.admin_first_name ?? null,
        last_name: data.admin_last_name ?? null,
        organization_id: org.id,
        role: 'admin',
      },
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(firstPasswordPath)}`,
    },
  });
  const hashedToken = invite?.properties?.hashed_token ?? null;
  if (inviteErr || !hashedToken) {
    return NextResponse.json(
      {
        error: 'invite_failed',
        message: inviteErr?.message ?? 'hashed_token manquant',
        organization: org,
        note: "L'organisation a été créée mais l'invite a échoué. Renvoie une invitation manuellement.",
      },
      { status: 207 },
    );
  }
  // Lien d'activation à usage unique (token_hash → verifyOtp serveur,
  // cross-device safe — même mécanique que les templates email).
  const activationUrl = `${appUrl}/auth/callback?token_hash=${hashedToken}&type=invite&next=${encodeURIComponent(firstPasswordPath)}`;

  // 3) Lie l'invité à l'org : profile + organization_members.
  //
  // BUG HISTORIQUE : le code initial faisait un UPDATE sur profiles qui
  // pouvait affecter 0 rows (si le trigger on_auth_user_created n'avait
  // pas encore créé le profile row au moment du call). Et il ne créait
  // JAMAIS de row dans organization_members. Résultat : le nouvel admin
  // se retrouvait sans org côté middleware (profile.organization_id NULL),
  // sans row dans organization_members (RLS bloquait la lecture des
  // subscriptions), et le flow set-password → dashboard se cassait en
  // redirect loop vers /onboarding.
  //
  // Fix : upsert du profile + insert idempotent du membership.
  if (invite?.user?.id) {
    // Upsert profile — gère les 2 cas : profile déjà créé (trigger)
    // ou pas encore. On.conflict(id) DO UPDATE écrase les champs.
    await admin.from('profiles').upsert(
      {
        id: invite.user.id,
        organization_id: org.id,
        role: 'admin',
        first_name: data.admin_first_name ?? null,
        last_name: data.admin_last_name ?? null,
      },
      { onConflict: 'id' },
    );

    // Insert membership (RLS lit ça pour scoper les queries de l'user).
    // ON CONFLICT DO NOTHING pour idempotence si retry.
    await admin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: invite.user.id,
        role: 'admin',
        invited_by: null,
      })
      .then(({ error }) => {
        // 23505 = unique_violation → déjà membre, safe à ignorer
        if (error && error.code !== '23505') {
          console.error(
            '[admin/organizations] failed to insert organization_members',
            { organizationId: org.id, userId: invite.user.id, error: error.message },
          );
        }
      });
  }

  // 4) Configure l'abonnement selon le devis. Le trigger DB
  // on_organization_created a déjà inséré (starter, trialing, +7j) —
  // on ajuste plan + statut selon le mode choisi. Upsert par sécurité
  // (si le trigger manquait, la ligne est créée avec ces valeurs).
  const subConfig: Record<string, unknown> = {
    organization_id: org.id,
    plan_id: data.plan_id,
  };
  if (data.billing_mode === 'exempt') {
    subConfig.is_exempt_from_billing = true;
    subConfig.status = 'active';
  } else if (data.billing_mode === 'paid_only') {
    // 'incomplete' + trial_end null → la matrice d'accès (lib/billing/
    // access.ts) bloque tout jusqu'au paiement (checkout_incomplete).
    subConfig.status = 'incomplete';
    subConfig.trial_end = null;
  } else {
    // trial_7d (ou alias legacy trial_14d) : essai de 7 jours à compter
    // de MAINTENANT — on ne dépend pas du default DB (le trigger a pu
    // poser la ligne quelques ms avant avec l'ancien réglage).
    subConfig.status = 'trialing';
    subConfig.trial_end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  const { error: subErr } = await admin
    .from('subscriptions')
    .upsert(subConfig, { onConflict: 'organization_id' });
  if (subErr) {
    console.error('[admin/organizations] subscription config failed', {
      organizationId: org.id,
      error: subErr.message,
    });
  }

  // 5) L'UNIQUE email (Resend, brandé) : son bouton porte le token
  // d'activation et enchaîne mot de passe → paiement (paid_only) ou
  // découverte de l'espace (essai / exempt). Plus d'email Supabase
  // séparé, plus de CTA /billing qui échouait sur /login sans session.
  const planLabel =
    data.plan_id === 'starter'
      ? 'Starter (74,99 € HT/mois)'
      : data.plan_id === 'growth'
        ? 'Medium (149,99 € HT/mois)'
        : 'Illimité (299,99 € HT/mois)';
  const welcomeParagraphs = [
    `Bonjour${data.admin_first_name ? ` ${data.admin_first_name}` : ''},`,
    `Ta demande a été validée : ton espace ${org.name} est prêt sur Centrium.`,
  ];
  if (data.billing_mode === 'paid_only') {
    welcomeParagraphs.push(
      `Ton abonnement ${planLabel} est réservé. Clique sur le bouton ci-dessous : tu choisis ton mot de passe, puis tu règles ton abonnement en ligne — l'accès s'ouvre immédiatement après le paiement.`,
    );
  } else if (data.billing_mode === 'exempt') {
    welcomeParagraphs.push(
      `Ton compte partenaire est actif sans facturation. Clique sur le bouton ci-dessous pour choisir ton mot de passe et découvrir ton espace.`,
    );
  } else {
    welcomeParagraphs.push(
      `Tu bénéficies de 7 jours d'essai gratuit, sans carte bancaire. Clique sur le bouton ci-dessous pour choisir ton mot de passe et découvrir ton espace. Ton plan recommandé : ${planLabel} — activable à tout moment depuis la page Abonnement.`,
    );
  }
  await sendEmail({
    to: data.admin_email,
    subject:
      data.billing_mode === 'paid_only'
        ? `${org.name} — active ton espace et ton abonnement Centrium`
        : `Bienvenue sur Centrium — ton espace ${org.name} est prêt`,
    paragraphs: welcomeParagraphs,
    cta: {
      label:
        data.billing_mode === 'paid_only'
          ? 'Activer mon compte et payer'
          : 'Activer mon compte',
      url: activationUrl,
    },
    footnote: 'Lien personnel à usage unique, valable 24 heures.',
  });

  // 6) Marque le quote_request d'origine comme converti (si fourni)
  if (data.quote_request_id) {
    await admin
      .from('quote_requests')
      .update({
        status: 'won',
        converted_to_organization_id: org.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.quote_request_id);
  }

  return NextResponse.json(
    {
      data: {
        organization: org,
        invite_email: data.admin_email,
        plan_id: data.plan_id,
        billing_mode: data.billing_mode,
      },
    },
    { status: 201 },
  );
}
