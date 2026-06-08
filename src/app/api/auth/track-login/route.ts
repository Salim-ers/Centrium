import { NextRequest, NextResponse } from 'next/server';

import { requireUser } from '@/lib/auth/guards';
import {
  deviceFingerprint,
  trackLoginEvent,
  notifyNewDevice,
} from '@/lib/security/device-tracking';
import { callerIp } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * À appeler par le front IMMÉDIATEMENT après un signIn Supabase réussi.
 *
 * Trace la connexion (table login_events), détecte si c'est une nouvelle
 * device, et envoie un email d'alerte le cas échéant (si la policy org
 * `notify_new_device` est activée).
 *
 * Idempotent côté insertion : Supabase peut rappeler ce endpoint à la
 * première navigation post-login, c'est OK — on a un index sur (user_id, device_fp)
 * pour la détection mais pas de contrainte UNIQUE (chaque login fait une
 * nouvelle ligne pour l'audit).
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();

  const ip = callerIp(req);
  const fp = await deviceFingerprint(req.headers);
  const ua = req.headers.get('user-agent') ?? 'unknown';

  const { isNewDevice, eventId } = await trackLoginEvent({
    userId: user.id,
    ip,
    userAgent: ua,
    deviceFp: fp,
  });

  if (isNewDevice) {
    // Vérifie la policy org avant d'envoyer le mail
    const admin = createAdminClient('audit-log-write');
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    let shouldNotify = true;
    if (profile?.organization_id) {
      const { data: settings } = await admin
        .from('org_security_settings')
        .select('notify_new_device')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();
      shouldNotify = settings?.notify_new_device ?? true;
    }

    if (shouldNotify && user.email) {
      await notifyNewDevice({
        userId: user.id,
        email: user.email,
        ip,
        userAgent: ua,
        occurredAt: new Date(),
        eventId,
      });
    }
  }

  return NextResponse.json(
    {
      data: { tracked: true, new_device: isNewDevice },
    },
    { status: 200 },
  );
}
