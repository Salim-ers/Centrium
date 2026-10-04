import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientPortalContext } from '@/lib/portal/client-context';
import { ClientShell } from '@/components/portal/ClientShell';

export const dynamic = 'force-dynamic';

/**
 * Portail client. Double contrôle : le middleware confine le rôle `client`
 * à /client, et chaque rendu vérifie ici l'accès actif (non révoqué).
 */
export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getClientPortalContext();
  if (!ctx) {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) redirect('/login');
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">Accès indisponible</h1>
          <p className="text-[14px] text-muted-foreground">
            Votre accès à l’espace client a été désactivé par votre prestataire. Contactez votre interlocuteur habituel pour le rétablir.
          </p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-[14px] font-medium text-primary-deep hover:underline">
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Dernière connexion (affichée côté ESN), au plus une écriture par heure.
  const admin = createAdminClient('client-portal');
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  await admin
    .from('client_portal_users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', ctx.me.userId)
    .or(`last_seen_at.is.null,last_seen_at.lt.${hourAgo}`);

  const b = ctx.branding;
  return (
    <ClientShell brand={b ? { name: b.brandName || b.name, logoUrl: b.logoUrl } : null} companyName={ctx.companyName}>
      <Suspense>{children}</Suspense>
    </ClientShell>
  );
}
