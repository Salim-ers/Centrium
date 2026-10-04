import { NextResponse } from 'next/server';
import { getAuthorization } from '@/lib/auth/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Permissions effectives de l'utilisateur dans son organisation active.
 * Sert uniquement à adapter l'interface : chaque action sensible est
 * re-vérifiée côté serveur par apiPermission() / requirePermission().
 */
export async function GET() {
  // L'interface doit pouvoir se dessiner même abonnement expiré (le
  // middleware redirige déjà vers /billing).
  const auth = await getAuthorization({ skipSubscriptionGate: true });
  return NextResponse.json(
    {
      data: {
        role: auth.role,
        effectiveRole: auth.effectiveRole,
        isOwner: auth.isOwner,
        permissions: [...auth.permissions],
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
