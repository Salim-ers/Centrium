import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { reportError } from '@/lib/observability/report-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Purge mensuelle des entités archivées depuis > 30 jours.
 *
 * Politique de rétention :
 *   - Une entité archivée reste visible/restaurable pendant 30 jours
 *   - Au-delà, elle est définitivement supprimée
 *   - Chaque admin d'org reçoit un récap par email AVANT la purge effective
 *
 * Déclenchement :
 *   1. Cron Vercel (recommandé) — vercel.json :
 *        { "crons": [{ "path": "/api/admin/purge-archives", "schedule": "0 3 1 * *" }] }
 *      → 1er de chaque mois à 3h du matin UTC
 *   2. Manuel via curl avec le header `Authorization: Bearer CRON_SECRET`
 *
 * Sécurité : protégé par CRON_SECRET (variable Vercel env).
 * Aucune authentification user — c'est un endpoint cron.
 */
export async function POST(req: NextRequest) {
  // 1. Vérification du secret cron
  const auth = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient('system-cron');

  // 2. Pré-vue : récupère ce qui va être purgé (pour envoi mail avant suppression)
  const { data: toPurge, error: previewErr } = await admin
    .from('_archives_to_purge')
    .select('entity_type, organization_id, label, archived_at');

  if (previewErr) {
    await reportError(previewErr, {
      route: '/api/admin/purge-archives',
      extra: { phase: 'preview' },
    });
    return NextResponse.json(
      { error: 'preview_failed', message: previewErr.message },
      { status: 500 },
    );
  }

  if (!toPurge || toPurge.length === 0) {
    return NextResponse.json(
      { data: { purged: 0, message: 'Aucune archive à purger ce mois-ci.' } },
      { status: 200 },
    );
  }

  // 3. Récap par organisation
  const byOrg = new Map<string, Array<{ entity_type: string; label: string }>>();
  for (const row of toPurge) {
    const list = byOrg.get(row.organization_id) ?? [];
    list.push({ entity_type: row.entity_type, label: row.label });
    byOrg.set(row.organization_id, list);
  }

  // 4. Notification email à chaque admin de chaque org concernée
  await notifyAdminsBeforePurge(byOrg);

  // 5. Exécution de la purge
  const { data: purged, error: purgeErr } = await admin.rpc(
    'purge_archives_older_than_30_days',
  );

  if (purgeErr) {
    await reportError(purgeErr, {
      route: '/api/admin/purge-archives',
      extra: { phase: 'purge' },
    });
    return NextResponse.json(
      { error: 'purge_failed', message: purgeErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: {
        purged_total: toPurge.length,
        organizations_notified: byOrg.size,
        details: purged ?? [],
      },
    },
    { status: 200 },
  );
}

/**
 * Pour chaque organisation, envoie un récap email à TOUS ses admins.
 */
async function notifyAdminsBeforePurge(
  byOrg: Map<string, Array<{ entity_type: string; label: string }>>,
): Promise<void> {
  const admin = createAdminClient('system-cron');
  const resendKey = process.env.RESEND_API_KEY;

  for (const [orgId, items] of byOrg.entries()) {
    // Récupère le nom de l'org + ses admins
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();

    const { data: adminMembers } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin');

    if (!adminMembers || adminMembers.length === 0) continue;

    const userIds = adminMembers.map((m) => m.user_id);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    // Récupère les emails auth.users
    const emails: { email: string; firstName: string | null }[] = [];
    for (const uid of userIds) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) {
        const p = profiles?.find((x) => x.id === uid);
        emails.push({ email: u.user.email, firstName: p?.first_name ?? null });
      }
    }

    // Compose et envoie l'email
    const subject = `Centrium · Purge mensuelle — ${items.length} archive${
      items.length > 1 ? 's' : ''
    } supprimée${items.length > 1 ? 's' : ''}`;

    const counts = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.entity_type] = (acc[it.entity_type] ?? 0) + 1;
      return acc;
    }, {});

    const body = renderPurgeEmail({
      orgName: org?.name ?? 'votre organisation',
      counts,
      items,
    });

    for (const { email, firstName } of emails) {
      if (!resendKey) {
        // eslint-disable-next-line no-console
        console.log(
          '[purge-archives] (dry-run, RESEND_API_KEY missing) would email a recipient',
        );
        continue;
      }
      const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Centrium <noreply@centrium-platform.com>',
            to: email,
            subject,
            text: `${greeting}\n\n${body}`,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[purge-archives] email failed', (e as Error).message);
      }
    }
  }
}

function renderPurgeEmail(args: {
  orgName: string;
  counts: Record<string, number>;
  items: Array<{ entity_type: string; label: string }>;
}): string {
  const labelMap: Record<string, string> = {
    consultants: 'consultant(s)',
    missions: 'mission(s)',
    job_offers: 'offre(s)',
    opportunities: 'opportunité(s)',
    contacts: 'contact(s)',
    invoices: 'facture(s)',
    contracts: 'contrat(s)',
    timesheets: 'CRA',
  };

  const summary = Object.entries(args.counts)
    .map(([k, n]) => `  • ${n} ${labelMap[k] ?? k}`)
    .join('\n');

  const sampleItems = args.items
    .slice(0, 20)
    .map((it) => `  - [${it.entity_type}] ${it.label}`)
    .join('\n');

  const truncated = args.items.length > 20 ? `\n... et ${args.items.length - 20} autres.` : '';

  return `Conformément à la politique de rétention Centrium, les éléments
archivés depuis plus de 30 jours dans l'espace "${args.orgName}" ont été
définitivement supprimés ce ${new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}.

Récap :
${summary}

Total : ${args.items.length} élément(s) supprimé(s).

Détail :
${sampleItems}${truncated}

Cette suppression est définitive et irréversible. Aucune action n'est
requise de ta part.

Si tu pensais qu'une de ces archives ne devait pas être supprimée,
contacte-nous immédiatement : security@centrium-platform.com
(les sauvegardes Supabase peuvent permettre une récupération sous 7 jours).

— L'équipe Centrium`;
}

// Support GET pour les crons qui ne savent pas faire de POST (Vercel utilise GET)
export async function GET(req: NextRequest) {
  return POST(req);
}
