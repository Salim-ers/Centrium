import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// =========================================================================
// GET /api/invitations/pending
// -------------------------------------------------------------------------
// Pour le user connecté : renvoie l'invitation non acceptée + non expirée
// la plus récente correspondant à son email. Utilisé par /onboarding pour
// rediriger automatiquement vers /invite/accept si l'utilisateur a été
// invité dans une org plutôt que de lui faire en créer une nouvelle.
// =========================================================================

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  const admin = createAdminClient('invitation');
  const { data } = await admin
    .from('organization_invitations')
    .select('id, token, organization_id, email, role, expires_at, organizations(name, brand_name)')
    .eq('email', user.email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  const orgs = data.organizations as
    | { name: string; brand_name: string | null }
    | { name: string; brand_name: string | null }[]
    | null;
  const org = Array.isArray(orgs) ? orgs[0] : orgs;

  return NextResponse.json(
    {
      data: {
        token: data.token,
        organization_id: data.organization_id,
        organization_name: org?.brand_name ?? org?.name ?? 'votre organisation',
        role: data.role,
        email: data.email,
      },
    },
    { status: 200 },
  );
}
