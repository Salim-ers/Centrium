import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, pick, type EmailLocale } from '@/lib/email/send';

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
      'id, organization_id, consultant_id, party, status, title, contract_number, archived, consultant_signed_at',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!contract || contract.consultant_id !== profile.consultant_id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // Seuls les contrats de SOUS-TRAITANCE se signent au portail — un contrat
  // client référençant le consultant positionné ne le concerne pas.
  if (contract.party === 'client') {
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

  // Dossier de preuve : contexte de signature + empreinte d'intégrité.
  // Le hash scelle l'ensemble (id + n° + nom + image + horodatage) — toute
  // altération ultérieure du contrat invalide cette empreinte.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 400) ?? null;
  const signatureHash = createHash('sha256')
    .update(
      [
        contract.id,
        contract.contract_number,
        parsed.data.signed_name,
        parsed.data.signature_data,
        now,
      ].join('|'),
    )
    .digest('hex');

  const { data: updated, error: updErr } = await admin
    .from('contracts')
    .update({
      consultant_signature_data: parsed.data.signature_data,
      consultant_signed_name: parsed.data.signed_name,
      consultant_signed_at: now,
      signed_at: now,
      status: 'signed',
      signature_ip: ip,
      signature_user_agent: userAgent,
      signature_hash: signatureHash,
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
  // Un envoi par groupe de locale (préférence de chaque destinataire).
  const { data: recipients } = await admin
    .from('profiles')
    .select('email, preferred_locale')
    .eq('organization_id', contract.organization_id)
    .in('role', ['admin', 'business_manager']);
  const byLocale = new Map<EmailLocale, string[]>();
  for (const p of recipients ?? []) {
    const email = p.email as string | null;
    if (!email) continue;
    const locale: EmailLocale = p.preferred_locale === 'en' ? 'en' : 'fr';
    byLocale.set(locale, [...(byLocale.get(locale) ?? []), email]);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  for (const [locale, emails] of byLocale) {
    await sendEmail({
      to: emails,
      locale,
      subject: pick(
        locale,
        `Contrat ${updated.contract_number} signé par ${parsed.data.signed_name}`,
        `Contract ${updated.contract_number} signed by ${parsed.data.signed_name}`,
      ),
      paragraphs: [
        pick(locale, 'Bonjour,', 'Hello,'),
        pick(
          locale,
          `${parsed.data.signed_name} vient de signer électroniquement le contrat « ${updated.title} » (${updated.contract_number}) depuis son portail consultant.`,
          `${parsed.data.signed_name} has just electronically signed the contract “${updated.title}” (${updated.contract_number}) from their consultant portal.`,
        ),
        pick(
          locale,
          'Le document co-signé est disponible dans Centrium.',
          'The counter-signed document is available in Centrium.',
        ),
      ],
      cta: appUrl
        ? { label: pick(locale, 'Voir le contrat', 'View the contract'), url: `${appUrl}/contracts/${updated.id}` }
        : undefined,
    });
  }

  return NextResponse.json({ data: updated });
}
