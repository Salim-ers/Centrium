import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { organizationSchema } from '@/lib/validators';

// =========================================================================
// POST /api/orgs/create — Crée une organisation + ajoute le user comme admin
// -------------------------------------------------------------------------
// Appelé depuis /onboarding. Le user est déjà authentifié.
// Pourquoi service_role : on crée organizations (interdit en RLS à un user
// qui n'a pas encore d'org), puis organization_members (idem), puis on met
// profiles.organization_id. Le tout atomique côté serveur.
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Vérifie la session utilisateur
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // Validation input
  const body = await req.json().catch(() => ({}));
  const parsed = organizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('onboarding');

  // Slug déjà pris ?
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', parsed.data.slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'slug_taken', message: 'Cet identifiant est déjà utilisé.' },
      { status: 409 },
    );
  }

  // 1) Crée l'organisation
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      siren: parsed.data.siren ?? null,
      city: parsed.data.city ?? null,
      postal_code: parsed.data.postal_code ?? null,
      plan: 'trial',
    })
    .select('id')
    .single();
  if (orgErr || !org) {
    return NextResponse.json(
      { error: 'create_failed', message: orgErr?.message ?? 'Erreur DB' },
      { status: 500 },
    );
  }

  // 2) Ajoute le user comme admin membre
  const { error: memberErr } = await admin.from('organization_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'admin',
  });
  if (memberErr) {
    // Rollback manuel : on supprime l'org
    await admin.from('organizations').delete().eq('id', org.id);
    return NextResponse.json(
      { error: 'member_failed', message: memberErr.message },
      { status: 500 },
    );
  }

  // 3) Set l'org active dans profiles (pour que l'app pointe dessus)
  //    Le trigger enforce_profile_active_org_is_member vérifiera la membership.
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ organization_id: org.id, role: 'admin' })
    .eq('id', user.id);
  if (profileErr) {
    return NextResponse.json(
      { error: 'profile_failed', message: profileErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: org.id, slug: parsed.data.slug }, { status: 201 });
}
