import { NextRequest, NextResponse } from 'next/server';

import { runAlertsEngine } from '@/lib/alerts/engine';
import { reportError } from '@/lib/observability/report-error';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Moteur d'alertes / notifications / relances — cron quotidien.
 *
 * Déclenchement :
 *   1. Cron Vercel (vercel.json) : { "path": "/api/cron/alerts-engine",
 *      "schedule": "0 6 * * *" } → tous les jours à 6h UTC (Vercel appelle
 *      en GET, d'où l'export GET ci-dessous).
 *   2. Manuel : curl -X POST -H "Authorization: Bearer $CRON_SECRET" …
 *
 * Idempotent : rejouer le même jour ne renvoie aucune notification en
 * double (journal notification_deliveries) et n'insère aucune alerte en
 * double (dedupe_key unique par organisation).
 *
 * Sécurité : CRON_SECRET obligatoire — aucun autre principe d'auth.
 */
async function handle(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const report = await runAlertsEngine();
    const totals = report.orgs.reduce(
      (acc, o) => ({
        detected: acc.detected + o.detected,
        created: acc.created + o.created,
        reopened: acc.reopened + o.reopened,
        auto_resolved: acc.auto_resolved + o.auto_resolved,
        emails: acc.emails + o.notified_email,
        sms: acc.sms + o.notified_sms,
        in_app: acc.in_app + o.notified_in_app,
        errors: acc.errors + o.errors.length,
      }),
      { detected: 0, created: 0, reopened: 0, auto_resolved: 0, emails: 0, sms: 0, in_app: 0, errors: 0 },
    );
    logger.info('[alerts-engine] run complete', totals);
    return NextResponse.json({ data: { totals, report } }, { status: 200 });
  } catch (e) {
    await reportError(e, { route: '/api/cron/alerts-engine' });
    return NextResponse.json(
      { error: 'engine_failed', message: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
