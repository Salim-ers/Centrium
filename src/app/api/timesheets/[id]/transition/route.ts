import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireOrg } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';

// =========================================================================
// POST /api/timesheets/[id]/transition — transitions de CRA AVEC emails
// -------------------------------------------------------------------------
// Actions :
//   submit           consultant : draft/rejected → submitted
//                    → email aux admins de l'org ("CRA soumis")
//   reject           admin/BM   : submitted → rejected (+ raison)
//                    → email au consultant ("corrections demandées")
//   notify_validated admin/BM/finance : n'écrit RIEN — envoie l'email
//                    "CRA validé" APRÈS validateAndInvoice (qui reste le
//                    chemin de validation, invoice comprise).
//
// SÉCURITÉ : la mise à jour DB passe par le client SERVEUR de l'appelant
// (session + RLS) — les triggers check_timesheet_transition et
// prevent_consultant_tampering (migration 009) restent pleinement actifs
// (matrice de transitions par rôle, anti-falsification). Le client admin
// n'est utilisé QUE pour lire les destinataires d'email.
// =========================================================================

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['submit', 'reject', 'notify_validated']),
  reason: z.string().max(1000).optional().nullable(),
});

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireOrg();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const { action, reason } = parsed.data;

  const supabase = createClient(); // client RLS de l'appelant
  const admin = createAdminClient('cross-org-query'); // lectures email only

  // Charge le CRA via RLS : si l'appelant n'a pas le droit de le voir
  // (autre org, autre consultant), il n'existe simplement pas pour lui.
  const { data: ts } = await supabase
    .from('timesheets')
    .select('id, status, period_month, period_year, consultant_id, organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!ts) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const period = `${MONTHS[ts.period_month - 1]} ${ts.period_year}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrium-platform.com';

  // Contexte email : nom du consultant + org
  const [{ data: consultant }, { data: org }] = await Promise.all([
    admin
      .from('consultants')
      .select('first_name, last_name, email')
      .eq('id', ts.consultant_id)
      .maybeSingle(),
    admin
      .from('organizations')
      .select('name, brand_name')
      .eq('id', ts.organization_id)
      .maybeSingle(),
  ]);
  const consultantName =
    `${consultant?.first_name ?? ''} ${consultant?.last_name ?? ''}`.trim() || 'Un consultant';
  const orgName = org?.brand_name ?? org?.name ?? 'ton organisation';

  if (action === 'submit') {
    if (ctx.role !== 'consultant') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'submitted',
        submitted_by: ctx.user.id,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', ts.id);
    if (error) {
      // Trigger de transition ou RLS a refusé (mauvais statut de départ…)
      return NextResponse.json(
        { error: 'transition_refused', message: error.message },
        { status: 409 },
      );
    }
    // Notifie les admins + BM de l'org
    const { data: recipients } = await admin
      .from('profiles')
      .select('email')
      .eq('organization_id', ts.organization_id)
      .in('role', ['admin', 'business_manager']);
    const emails = (recipients ?? [])
      .map((p) => p.email as string | null)
      .filter((e): e is string => !!e);
    if (emails.length > 0) {
      await sendEmail({
        to: emails,
        subject: `CRA ${period} soumis par ${consultantName}`,
        paragraphs: [
          `Bonjour,`,
          `${consultantName} vient de soumettre son CRA de ${period}. Il attend votre validation.`,
        ],
        cta: { label: 'Vérifier et valider le CRA', url: `${appUrl}/timesheets/${ts.id}` },
      });
    }
    return NextResponse.json({ data: { status: 'submitted' } });
  }

  if (action === 'reject') {
    if (!['admin', 'business_manager'].includes(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (!reason?.trim()) {
      return NextResponse.json(
        { error: 'reason_required', message: 'Précise la raison du refus (visible par le consultant).' },
        { status: 400 },
      );
    }
    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq('id', ts.id);
    if (error) {
      return NextResponse.json(
        { error: 'transition_refused', message: error.message },
        { status: 409 },
      );
    }
    if (consultant?.email) {
      await sendEmail({
        to: consultant.email,
        subject: `Ton CRA ${period} demande une correction`,
        paragraphs: [
          `Bonjour ${consultant.first_name ?? ''}`.trim() + ',',
          `${orgName} a examiné ton CRA de ${period} et demande une correction :`,
          `« ${reason.trim()} »`,
          `Corrige-le depuis ton portail puis soumets-le à nouveau.`,
        ],
        cta: { label: 'Corriger mon CRA', url: `${appUrl}/portal/cra/${ts.id}` },
      });
    }
    return NextResponse.json({ data: { status: 'rejected' } });
  }

  // notify_validated — email uniquement, aucune écriture.
  if (!['admin', 'business_manager', 'finance'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (ts.status !== 'client_validated') {
    return NextResponse.json(
      { error: 'not_validated', message: 'Le CRA n\'est pas validé.' },
      { status: 409 },
    );
  }
  if (consultant?.email) {
    await sendEmail({
      to: consultant.email,
      subject: `Ton CRA ${period} est validé ✓`,
      paragraphs: [
        `Bonjour ${consultant.first_name ?? ''}`.trim() + ',',
        `Bonne nouvelle : ${orgName} a validé ton CRA de ${period}.`,
      ],
      cta: { label: 'Voir mon CRA', url: `${appUrl}/portal/cra/${ts.id}` },
    });
  }
  return NextResponse.json({ data: { notified: true } });
}
