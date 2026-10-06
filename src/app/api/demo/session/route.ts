import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { DEMO_CONSULTANT_ID, DEMO_ORG_ID, demoCredentials, demoEnabled } from '@/lib/demo/config';
import { callerIp, rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ as: z.enum(['esn', 'consultant']) });

/**
 * POST /api/demo/session — ouvre l'espace de démonstration, côté ESN
 * (direction) ou côté consultant. Fermé tant que DEMO_ACCESS=on et les
 * identifiants ne sont pas configurés. Garde-fou : le compte doit
 * appartenir à l'organisation de démo (et, côté consultant, être relié à
 * la fiche de démo) ; sinon la session est refermée aussitôt.
 */
export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: 'demo_unavailable' }, { status: 404 });
  const rl = await rateLimit(`demo-session:${callerIp(req)}`, { limit: 20, windowSec: 600 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'too_many_requests', message: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const kind = parsed.data.as;
  const creds = demoCredentials(kind);
  if (!creds) return NextResponse.json({ error: 'demo_unavailable' }, { status: 404 });

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(creds);
  if (error || !data.user) {
    logger.error('[demo] connexion du compte de démo impossible', { kind });
    return NextResponse.json({ error: 'demo_unavailable', message: 'La démo est momentanément indisponible.' }, { status: 503 });
  }
  const { data: profile } = await supabase.from('profiles').select('organization_id, role, consultant_id').eq('id', data.user.id).maybeSingle();
  const linked =
    profile?.organization_id === DEMO_ORG_ID &&
    (kind === 'esn'
      ? profile.role !== 'consultant' && profile.role !== 'admin' && profile.role !== 'super_admin'
      : profile.role === 'consultant' && profile.consultant_id === DEMO_CONSULTANT_ID);
  if (!linked) {
    await supabase.auth.signOut();
    logger.error('[demo] compte de démo mal relié : session refermée', { kind });
    return NextResponse.json({ error: 'demo_unavailable', message: 'La démo est momentanément indisponible.' }, { status: 503 });
  }
  return NextResponse.json({ data: { redirect: kind === 'esn' ? '/dashboard' : '/portal/dashboard' } });
}
