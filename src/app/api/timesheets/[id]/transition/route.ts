import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthorization } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, pick, type EmailLocale } from '@/lib/email/send';
import { monthsLong } from '@/lib/i18n/months';

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
  action: z.enum(['submit', 'reject', 'notify_validated', 'request_client_approval']),
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
  const ctx = await getAuthorization();
  const can = (p: Parameters<typeof ctx.permissions.has>[0]) => ctx.permissions.has(p);
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
    .select('id, status, period_month, period_year, consultant_id, organization_id, mission_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!ts) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const period = `${MONTHS[ts.period_month - 1]} ${ts.period_year}`;
  // Libellé EN régénéré par locale (le FR ci-dessus reste la source inchangée).
  const periodEn = `${monthsLong(true)[ts.period_month - 1]} ${ts.period_year}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrium-platform.com';

  // Contexte email : nom du consultant + org + locale du consultant
  // (profil portail prioritaire, sinon fiche consultant, fallback 'fr').
  const [{ data: consultant }, { data: org }, { data: consultantProfile }] = await Promise.all([
    admin
      .from('consultants')
      .select('first_name, last_name, email, preferred_locale')
      .eq('id', ts.consultant_id)
      .maybeSingle(),
    admin
      .from('organizations')
      .select('name, brand_name')
      .eq('id', ts.organization_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('preferred_locale')
      .eq('consultant_id', ts.consultant_id)
      .limit(1)
      .maybeSingle(),
  ]);
  const consultantName =
    `${consultant?.first_name ?? ''} ${consultant?.last_name ?? ''}`.trim() || 'Un consultant';
  const consultantLocale: EmailLocale =
    (consultantProfile?.preferred_locale ?? consultant?.preferred_locale) === 'en' ? 'en' : 'fr';
  const orgNameFor = (locale: EmailLocale) =>
    org?.brand_name ?? org?.name ?? pick(locale, 'ton organisation', 'your organization');

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
    // Notifie les admins + BM de l'org — un envoi par groupe de locale
    const { data: recipients } = await admin
      .from('profiles')
      .select('email, preferred_locale')
      .eq('organization_id', ts.organization_id)
      .in('role', ['admin', 'direction', 'business_manager']);
    const byLocale = new Map<EmailLocale, string[]>();
    for (const p of recipients ?? []) {
      const email = p.email as string | null;
      if (!email) continue;
      const locale: EmailLocale = p.preferred_locale === 'en' ? 'en' : 'fr';
      byLocale.set(locale, [...(byLocale.get(locale) ?? []), email]);
    }
    for (const [locale, emails] of byLocale) {
      await sendEmail({
        to: emails,
        locale,
        subject: pick(
          locale,
          `CRA ${period} soumis par ${consultantName}`,
          `Timesheet ${periodEn} submitted by ${consultantName}`,
        ),
        paragraphs: [
          pick(locale, `Bonjour,`, `Hello,`),
          pick(
            locale,
            `${consultantName} vient de soumettre son CRA de ${period}. Il attend votre validation.`,
            `${consultantName} has just submitted their ${periodEn} timesheet. It is awaiting your validation.`,
          ),
        ],
        cta: {
          label: pick(locale, 'Vérifier et valider le CRA', 'Review and validate the timesheet'),
          url: `${appUrl}/timesheets/${ts.id}`,
        },
      });
    }
    return NextResponse.json({ data: { status: 'submitted' } });
  }

  if (action === 'request_client_approval') {
    if (!can('timesheets.validate')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (ts.status !== 'submitted') {
      return NextResponse.json(
        { error: 'not_submitted', message: 'Seul un CRA soumis peut être envoyé au client pour approbation.' },
        { status: 409 },
      );
    }
    const { data: mission } = await admin
      .from('missions')
      .select('company_id, title')
      .eq('id', ts.mission_id)
      .maybeSingle();
    if (!mission?.company_id) {
      return NextResponse.json({ error: 'no_client', message: 'La mission n\'est rattachée à aucun client.' }, { status: 409 });
    }
    const { data: clientUsers } = await admin
      .from('client_portal_users')
      .select('user_id, email')
      .eq('organization_id', ts.organization_id)
      .eq('company_id', mission.company_id)
      .is('revoked_at', null);
    if (!clientUsers?.length) {
      return NextResponse.json(
        { error: 'no_portal_access', message: 'Aucun accès au portail client pour ce client. Ouvrez un accès depuis Portails.' },
        { status: 409 },
      );
    }
    const { error } = await admin
      .from('timesheets')
      .update({ client_approval_status: 'pending', client_approval_requested_at: new Date().toISOString() })
      .eq('id', ts.id);
    if (error) {
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }
    await admin.from('notifications').insert(
      clientUsers.map((u) => ({
        organization_id: ts.organization_id,
        user_id: u.user_id,
        kind: 'timesheet_pending',
        priority: 'medium',
        title: `CRA ${period} — ${consultantName}`,
        body: 'Un compte rendu d\'activité attend votre approbation.',
        link: `/client/timesheets/${ts.id}`,
      })),
    );
    for (const u of clientUsers) {
      await sendEmail({
        to: u.email as string,
        locale: 'fr',
        subject: `CRA ${period} de ${consultantName} à approuver`,
        paragraphs: [
          'Bonjour,',
          `${orgNameFor('fr')} vous transmet le compte rendu d'activité de ${consultantName} pour ${period} (mission « ${mission.title} »).`,
          'Vous pouvez l\'approuver ou demander une correction depuis votre espace client.',
        ],
        cta: { label: 'Voir le CRA', url: `${appUrl}/client/timesheets/${ts.id}` },
      });
    }
    return NextResponse.json({ data: { client_approval_status: 'pending', notified: clientUsers.length } });
  }

  if (action === 'reject') {
    if (!can('timesheets.validate')) {
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
      const locale = consultantLocale;
      await sendEmail({
        to: consultant.email,
        locale,
        subject: pick(
          locale,
          `Ton CRA ${period} demande une correction`,
          `Your ${periodEn} timesheet needs a correction`,
        ),
        paragraphs: [
          `${pick(locale, 'Bonjour', 'Hello')} ${consultant.first_name ?? ''}`.trim() + ',',
          pick(
            locale,
            `${orgNameFor(locale)} a examiné ton CRA de ${period} et demande une correction :`,
            `${orgNameFor(locale)} has reviewed your ${periodEn} timesheet and requested a correction:`,
          ),
          pick(locale, `« ${reason.trim()} »`, `“${reason.trim()}”`),
          pick(
            locale,
            `Corrige-le depuis ton portail puis soumets-le à nouveau.`,
            `Fix it from your portal, then submit it again.`,
          ),
        ],
        cta: {
          label: pick(locale, 'Corriger mon CRA', 'Fix my timesheet'),
          url: `${appUrl}/portal/cra/${ts.id}`,
        },
      });
    }
    return NextResponse.json({ data: { status: 'rejected' } });
  }

  // notify_validated — email uniquement, aucune écriture.
  if (!can('timesheets.validate') && !can('finance.edit')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (ts.status !== 'client_validated') {
    return NextResponse.json(
      { error: 'not_validated', message: 'Le CRA n\'est pas validé.' },
      { status: 409 },
    );
  }
  if (consultant?.email) {
    const locale = consultantLocale;
    await sendEmail({
      to: consultant.email,
      locale,
      subject: pick(
        locale,
        `Ton CRA ${period} est validé ✓`,
        `Your ${periodEn} timesheet is validated ✓`,
      ),
      paragraphs: [
        `${pick(locale, 'Bonjour', 'Hello')} ${consultant.first_name ?? ''}`.trim() + ',',
        pick(
          locale,
          `Bonne nouvelle : ${orgNameFor(locale)} a validé ton CRA de ${period}.`,
          `Good news: ${orgNameFor(locale)} has validated your ${periodEn} timesheet.`,
        ),
      ],
      cta: {
        label: pick(locale, 'Voir mon CRA', 'View my timesheet'),
        url: `${appUrl}/portal/cra/${ts.id}`,
      },
    });
  }
  return NextResponse.json({ data: { notified: true } });
}
