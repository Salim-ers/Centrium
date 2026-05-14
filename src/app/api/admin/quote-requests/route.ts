import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

// =========================================================================
// GET /api/admin/quote-requests — Liste des demandes de devis.
// Réservé au super_admin.
// =========================================================================

export const runtime = 'nodejs';

async function requireSuperAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'super_admin') return null;
  return user;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quote_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: 'list_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ data: data ?? [] });
}
