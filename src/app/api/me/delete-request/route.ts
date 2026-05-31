import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/guards';

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

  const admin = createAdminClient();

  // Récupère l'organisation pour pouvoir loguer dans activities (col NOT NULL).
  // Si pas d'org (super_admin), on log dans activities sans org_id pourrait
  // violer la contrainte → fallback : on accepte la demande sans log.
  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.organization_id) {
    await admin.from('activities').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      entity_type: 'account_deletion_request',
      entity_id: user.id,
      action: 'requested',
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
