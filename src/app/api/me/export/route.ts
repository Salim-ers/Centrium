import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/guards';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

/**
 * Export RGPD — droit à la portabilité (art. 20 RGPD).
 *
 * Renvoie un JSON contenant toutes les données personnelles dont l'utilisateur
 * est le titulaire :
 *   - identifiants Auth (id, email, créé le)
 *   - profil (first_name, last_name, role, organization_id)
 *   - infos personnelles privées (user_profile_personal)
 *   - todos personnelles (visibility = 'personal')
 *
 * Les données métier (consultants, contacts, missions) appartiennent à
 * l'ORGANISATION et ne sont pas incluses ici — le responsable de traitement
 * pour ces données est l'organisation cliente, pas l'utilisateur.
 *
 * Content-Disposition: attachment force le téléchargement.
 */
export async function POST() {
  const user = await requireUser();

  // Lecture via le client utilisateur (RLS) — c'est volontaire :
  // l'utilisateur ne doit pouvoir exporter QUE ses propres données.
  const supabase = createClient();

  const [profileRes, personalRes, todosRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, organization_id, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('user_profile_personal')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('user_todos')
      .select('id, title, done, due_date, visibility, created_at, updated_at')
      .eq('user_id', user.id),
  ]);

  // Activité personnelle — via admin client pour traverser RLS (legitime ici :
  // on filtre strictement par user_id authentifié).
  const admin = createAdminClient();
  const { data: activities } = await admin
    .from('activities')
    .select('id, action, entity_type, entity_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);

  const payload = {
    meta: {
      generated_at: new Date().toISOString(),
      format: 'centrium-user-export-v1',
      notice:
        'Export généré conformément à l’article 20 du RGPD (droit à la portabilité). Données métier d’organisation non incluses.',
    },
    account: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: profileRes.data ?? null,
    personal: personalRes.data ?? null,
    todos: todosRes.data ?? [],
    recent_activity: activities ?? [],
  };

  const body = JSON.stringify(payload, null, 2);
  const filename = `centrium-export-${user.id}-${new Date().toISOString().slice(0, 10)}.json`;

  if (profileRes.data?.organization_id) {
    await logAudit({
      organizationId: profileRes.data.organization_id,
      userId: user.id,
      entityType: 'user_data',
      entityId: user.id,
      action: 'data.exported',
      details: { format: 'json', size_bytes: body.length },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
