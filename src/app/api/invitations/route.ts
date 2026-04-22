import { NextRequest, NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { invitationSchema } from '@/lib/validators';

// =========================================================================
// POST /api/invitations — Crée une invitation pour l'organisation active
// -------------------------------------------------------------------------
// Seul un admin de l'org peut inviter (RLS via auth.role_in).
// Retourne { url } : le lien à envoyer manuellement (ou par email plus tard).
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { organizationId, role, user } = await requireOrg();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select('token')
    .single();

  if (error) {
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const url = `${appUrl}/invite/accept?token=${data.token}`;

  // TODO : envoyer l'email via Resend. MVP = on retourne l'URL et l'admin copie-colle.
  return NextResponse.json({ url, email: parsed.data.email }, { status: 201 });
}
