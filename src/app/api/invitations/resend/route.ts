import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/ratelimit/in-memory';

// =========================================================================
// POST /api/invitations/resend — Renvoie l'email d'activation d'une
// invitation d'équipe, à partir de son token.
// -------------------------------------------------------------------------
// PUBLIC (pas de session requise) : c'est précisément le cas d'usage —
// l'invité a reçu un lien copié-collé (/invite/accept?token=…) mais n'a
// pas de session, donc il ne peut pas accepter. Cette route lui renvoie
// l'email Supabase Auth qui établit la session PUIS revient sur
// /invite/accept avec le même token.
//
// Sécurité :
//   - le token (32 bytes aléatoires) est le secret : sans lui, rien.
//   - l'email de destination vient DE L'INVITATION en DB — l'appelant ne
//     choisit jamais l'adresse (pas d'oracle, pas de détournement).
//   - la réponse ne révèle que l'email MASQUÉ (s•••@d…).
//   - rate-limit par IP (5/10 min) ET par token (3/15 min) contre le spam.
//   - token expiré / déjà utilisé → 410 avec message explicite.
// =========================================================================

export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().min(16).max(128),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  const maskedLocal = `${local.slice(0, 1)}${'•'.repeat(Math.max(2, local.length - 1))}`;
  const [domName, ...tld] = domain.split('.');
  const maskedDomain = `${domName.slice(0, 1)}${'•'.repeat(Math.max(2, domName.length - 1))}`;
  return `${maskedLocal}@${maskedDomain}${tld.length ? '.' + tld.join('.') : ''}`;
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const token = parsed.data.token;

  const ipRl = rateLimit({
    key: `invite-resend:ip:${clientIp(req)}`,
    limit: 5,
    windowMs: 600_000,
  });
  const tokenRl = rateLimit({
    key: `invite-resend:token:${token}`,
    limit: 3,
    windowMs: 900_000,
  });
  if (!ipRl.ok || !tokenRl.ok) {
    return NextResponse.json(
      {
        error: 'too_many_requests',
        message: 'Email déjà renvoyé récemment — vérifie ta boîte (et tes spams).',
      },
      { status: 429 },
    );
  }

  const admin = createAdminClient('invitation');
  const { data: invite } = await admin
    .from('organization_invitations')
    .select('token, email, role, accepted_at, expires_at, organization_id, organizations(name, brand_name)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json(
      { error: 'invalid_token', message: 'Invitation introuvable. Vérifie le lien reçu.' },
      { status: 404 },
    );
  }
  if (invite.accepted_at) {
    return NextResponse.json(
      {
        error: 'already_used',
        message: 'Cette invitation a déjà été acceptée. Connecte-toi simplement.',
      },
      { status: 410 },
    );
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      {
        error: 'expired',
        message:
          'Cette invitation a expiré. Demande à l\'administrateur de t\'en renvoyer une nouvelle.',
      },
      { status: 410 },
    );
  }

  const org = Array.isArray(invite.organizations)
    ? invite.organizations[0]
    : invite.organizations;
  const orgDisplayName =
    (org?.brand_name as string | null) ?? (org?.name as string | null) ?? 'votre organisation';

  const reqUrl = new URL(req.url);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `${reqUrl.protocol}//${reqUrl.host}`;
  const acceptPath = `/invite/accept?token=${invite.token}`;
  const callbackUrl = `${appUrl}/auth/callback?next=${encodeURIComponent(acceptPath)}`;

  // Même cascade que POST /api/invitations : invite Supabase pour un compte
  // neuf, magic link (signInWithOtp, qui ENVOIE l'email) pour un compte
  // existant.
  const supabase = createClient();
  let emailSent = false;

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo: callbackUrl,
    data: {
      invitation_token: invite.token,
      organization_name: orgDisplayName,
      role: invite.role,
    },
  });
  if (!inviteErr) {
    emailSent = true;
  } else if (
    /already (been )?registered|already exists|user already/i.test(inviteErr.message)
  ) {
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: invite.email,
      options: { emailRedirectTo: callbackUrl, shouldCreateUser: false },
    });
    emailSent = !otpErr;
  }

  if (!emailSent) {
    return NextResponse.json(
      {
        error: 'email_failed',
        message:
          'Impossible d\'envoyer l\'email pour le moment. Réessaie dans quelques minutes ou contacte l\'administrateur.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      data: {
        masked_email: maskEmail(invite.email),
        organization_name: orgDisplayName,
      },
    },
    { status: 200 },
  );
}
