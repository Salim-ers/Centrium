import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/guards';
import { logAudit } from '@/lib/audit/log';
import { callerIp } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/**
 * Demande de suppression de compte — droit à l'effacement (art. 17 RGPD).
 *
 * Politique : la suppression n'est PAS immédiate.
 *   1. L'utilisateur confirme en retapant son email exact.
 *   2. La demande est journalisée (activities) avec horodatage et motif.
 *   3. L'équipe la traite manuellement sous 30 jours (délai RGPD) :
 *      - bascule du compte en "à supprimer"
 *      - purge effective des données personnelles
 *      - rétention obligatoire (facturation 10 ans) gérée séparément
 *
 * Ce différé évite les suppressions accidentelles ou malicieuses (compte
 * compromis), et respecte les obligations comptables.
 */
const bodySchema = z.object({
  confirm_email: z.string().trim().email(),
  reason: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Confirmation en retapant l'email — empêche les soumissions accidentelles.
  if (
    !user.email ||
    parsed.data.confirm_email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: 'email_mismatch',
        message: 'L’email saisi ne correspond pas à celui de votre compte.',
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient('rgpd-deletion');

  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  // Enregistrement DURABLE de la demande, quelle que soit la présence d'org
  // (avant : un compte super_admin sans org recevait « reçu » sans qu'aucune
  // trace ne soit gardée → demande perdue). Ce registre est la source de
  // vérité pour le traitement RGPD (30 j).
  const { error: reqErr } = await admin.from('account_deletion_requests').insert({
    user_id: user.id,
    email: user.email,
    organization_id: profile?.organization_id ?? null,
    reason: parsed.data.reason ?? null,
    ip: callerIp(req),
  });
  if (reqErr) {
    console.error('[me/delete-request] insert failed', reqErr.message);
    return NextResponse.json(
      {
        error: 'internal',
        message:
          'Impossible d’enregistrer votre demande pour le moment. Réessaie, ou écris à contact@centrium-platform.com.',
      },
      { status: 500 },
    );
  }

  // Audit riche additionnel quand il y a une org (activities exige org_id).
  if (profile?.organization_id) {
    await logAudit({
      organizationId: profile.organization_id,
      userId: user.id,
      entityType: 'account_deletion_request',
      entityId: user.id,
      action: 'data.deletion_requested',
      details: {
        email: user.email,
        reason: parsed.data.reason ?? null,
        requested_at: new Date().toISOString(),
        source: 'self-service-settings',
      },
    });
  }

  return NextResponse.json(
    {
      data: {
        status: 'received',
        message:
          'Votre demande de suppression a bien été enregistrée. Notre équipe la traitera sous 30 jours conformément au RGPD. Vous pouvez l’annuler à tout moment avant traitement en écrivant à contact@centrium-platform.com.',
        reference: user.id.slice(0, 8).toUpperCase(),
      },
    },
    { status: 202 },
  );
}
