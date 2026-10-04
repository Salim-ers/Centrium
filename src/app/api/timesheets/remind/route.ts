import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { sendEmail, pick, type EmailLocale } from '@/lib/email/send';
import { logAudit } from '@/lib/audit/log';
import { monthsLong } from '@/lib/i18n/months';

export const runtime = 'nodejs';

const schema = z.object({
  mission_id: z.string().uuid(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2000).max(2100),
});

/**
 * POST /api/timesheets/remind — relance manuelle d'un consultant pour un
 * CRA non transmis : email + notification dans son portail.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('timesheets.validate');
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { mission_id, period_month, period_year } = parsed.data;

  const rl = await rateLimit(`cra-remind:${mission_id}:${period_year}-${period_month}`, { limit: 1, windowSec: 12 * 3600 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'already_reminded', message: 'Une relance a déjà été envoyée pour ce CRA dans les 12 dernières heures.' },
      { status: 429 },
    );
  }

  const admin = createAdminClient('cross-org-query');
  const { data: mission } = await admin
    .from('missions')
    .select('id, organization_id, title, consultant_id, consultants(first_name, email)')
    .eq('id', mission_id)
    .maybeSingle();
  if (!mission || mission.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const consultant = mission.consultants as unknown as { first_name: string | null; email: string | null } | null;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, preferred_locale')
    .eq('consultant_id', mission.consultant_id)
    .maybeSingle();
  const email = profile?.email ?? consultant?.email ?? null;
  if (!email && !profile) {
    return NextResponse.json(
      { error: 'no_contact', message: 'Ce consultant n’a ni email ni accès au portail.' },
      { status: 409 },
    );
  }
  const locale: EmailLocale = profile?.preferred_locale === 'en' ? 'en' : 'fr';
  const periodFr = new Date(period_year, period_month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const periodEn = `${monthsLong(true)[period_month - 1]} ${period_year}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.centrium-platform.com';

  if (profile) {
    await admin.from('notifications').insert({
      organization_id: auth.organizationId,
      user_id: profile.id,
      kind: 'timesheet_missing',
      priority: 'high',
      title: pick(locale, `CRA de ${periodFr} à transmettre`, `${periodEn} timesheet to submit`),
      body: pick(locale, `Mission « ${mission.title} »`, `Mission “${mission.title}”`),
      link: '/portal/cra',
    });
  }
  if (email) {
    await sendEmail({
      to: email,
      locale,
      subject: pick(locale, `Ton CRA de ${periodFr} est attendu`, `Your ${periodEn} timesheet is expected`),
      paragraphs: [
        `${pick(locale, 'Bonjour', 'Hello')} ${consultant?.first_name ?? ''}`.trim() + ',',
        pick(
          locale,
          `Ton compte rendu d'activité de ${periodFr} pour la mission « ${mission.title} » n'a pas encore été transmis.`,
          `Your ${periodEn} timesheet for the “${mission.title}” mission has not been submitted yet.`,
        ),
        pick(locale, 'Il ne prend qu’une minute depuis ton portail.', 'It only takes a minute from your portal.'),
      ],
      cta: { label: pick(locale, 'Remplir mon CRA', 'Fill in my timesheet'), url: `${appUrl}/portal/cra` },
    });
  }

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'mission',
    entityId: mission_id,
    action: 'timesheet_reminder_sent',
    details: { period_month, period_year },
  });

  return NextResponse.json({ data: { notified: true } });
}
