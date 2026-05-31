import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

import { AuditTable } from './AuditTable';

export const dynamic = 'force-dynamic';

/**
 * Page /admin/audit — accessible UNIQUEMENT au super_admin (gate
 * middleware + double check ici). Affiche les 200 dernières activités
 * journalisées, toutes organisations confondues.
 */
export default async function AdminAuditPage() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const { data: rows } = await admin
    .from('activities')
    .select('id, organization_id, user_id, entity_type, entity_id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="min-h-screen bg-background text-white">
      <header className="border-b border-hairline bg-card/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-violet-glow" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">
                Audit &amp; conformité
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Journal des actions sensibles · multi-tenant
              </p>
            </div>
          </div>
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Console admin
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-2xl border border-hairline bg-card/40 backdrop-blur-xl p-6">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">
                {rows?.length ?? 0} dernières activités
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Source : table <code className="text-violet-300">activities</code>.
                À étendre via <code className="text-violet-300">logAudit()</code>{' '}
                dans les services métier.
              </p>
            </div>
          </div>
          <AuditTable rows={rows ?? []} />
        </div>
      </main>
    </div>
  );
}
