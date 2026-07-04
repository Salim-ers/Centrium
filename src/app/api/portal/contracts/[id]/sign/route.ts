import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';

// =========================================================================
// POST /api/portal/contracts/[id]/sign — signature électronique du contrat
// par le CONSULTANT (prestataire freelance).
// -------------------------------------------------------------------------
// Contrôles serveur STRICTS (le service role n'écrit qu'après) :
//   1. session valide + profil role='consultant' avec consultant_id
//   2. le contrat appartient à CE consultant (consultant_id match)
//   3. statut signable : sent | pending_review (pas draft, pas déjà signé)
//   4. signature = PNG dataURL raisonnable + nom complet saisi
// Effets : consultant_signature_data/name/at + status='signed' +
// signed_at (date de prise d'effet), email aux admins/BM de l'org.
// =========================================================================

export const runtime = 'nodejs';

const SIGNABLE_STATUSES = ['sent', 'pending_review'] as const;

const schema = z.object({
  // Canvas 600×180 ≈ 5-40 Ko ; on borne large mais fini (anti-abus).
  signature_data: z
    .string()
    .startsWith('data:image/png;base64,', 'Format de signature invalide')
    .max(300_000, 'Signature trop lourde'),
  signed_name: z.string().trim().min(3, 'Nom complet requis').max(120),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, consultant_id, organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'consultant' || !profile.consultant_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const admin = createAdminClient('invitation');
  const { data: contract } = await admin
    .from('contracts')
    .select(
      'id, organization_id, consultant_id, status, title, contract_number, archived, consultant_signed_at',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!contract || contract.consultant_id !== profile.consultant_id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (contract.archived) {
    return NextResponse.json(
      { error: 'archived', message: 'Ce contrat est archivé.' },
      { status: 409 },
    );
  }
  if (contract.consultant_signed_at) {
    return NextResponse.json(
      { error: 'already_signed', message: 'Tu as déjà signé ce contrat.' },
      { status: 409 },
    );
  }
  if (!SIGNABLE_STATUSES.includes(contract.status as (typeof SIGNABLE_STATUSES)[number])) {
    return NextResponse.json(
      {
        error: 'not_signable',
        message:
          contract.status === 'signed' || contract.status === 'active'
            ? 'Ce contrat est déjà signé.'
            : 'Ce contrat n’est pas encore ouvert à la signature.',
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await admin
    .from('contracts')
    .update({
      consultant_signature_data: parsed.data.signature_data,
      consultant_signed_name: parsed.data.signed_name,
      consultant_signed_at: now,
      signed_at: now,
      status: 'signed',
    })
    .eq('id', contract.id)
    .select('*')
    .single();
  if (updErr) {
    return NextResponse.json(
      { error: 'update_failed', message: updErr.message },
      { status: 500 },
    );
  }

  // Notifie les admins + BM de l'org — fire-and-forget (sendEmail ne throw pas).
  const { data: recipients } = await admin
    .from('profiles')
    .select('email')
    .eq('organization_id', contract.organization_id)
    .in('role', ['admin', 'business_manager']);
  const emails = (recipients ?? [])
    .map((p) => p.email as string | null)
    .filter((e): e is string => !!e);
  if (emails.length > 0) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    await sendEmail({
      to: emails,
      subject: `Contrat ${updated.contract_number} signé par ${parsed.data.signed_name}`,
      paragraphs: [
        'Bonjour,',
        `${parsed.data.signed_name} vient de signer électroniquement le contrat « ${updated.title} » (${updated.contract_number}) depuis son portail consultant.`,
        'Le document co-signé est disponible dans Centrium.',
      ],
      cta: appUrl
        ? { label: 'Voir le contrat', url: `${appUrl}/contracts/${updated.id}` }
        : undefined,
    });
  }

  return NextResponse.json({ data: updated });
}
