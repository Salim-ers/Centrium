import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

/**
 * Étape 1 du MFA TOTP : génère un facteur (QR code + secret) que l'utilisateur
 * va scanner avec son app TOTP (Google Authenticator, 1Password, Bitwarden…).
 *
 * Renvoie { id, qr_code (data:image/svg), secret } — le front affiche le QR
 * et appelle ensuite /api/auth/mfa/verify avec le code à 6 chiffres + le id
 * du facteur pour finaliser l'enrôlement.
 */
export async function POST() {
  const user = await requireUser();
  const supabase = createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Centrium TOTP',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Récupère l'org pour le log d'audit
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.organization_id) {
    await logAudit({
      organizationId: profile.organization_id,
      userId: user.id,
      entityType: 'mfa_factor',
      entityId: data.id,
      action: 'mfa.enroll_started',
    });
  }

  return NextResponse.json(
    {
      data: {
        factor_id: data.id,
        qr_code: data.totp.qr_code, // data:image/svg+xml;utf-8,<svg>...
        secret: data.totp.secret, // pour saisie manuelle si QR illisible
        uri: data.totp.uri,
      },
    },
    { status: 201 },
  );
}
