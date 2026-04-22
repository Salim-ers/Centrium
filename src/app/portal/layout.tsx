import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalShell } from '@/components/layout/PortalShell';
import { PortalProvider } from './portal-context';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, consultant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'consultant' || !profile.consultant_id) {
    // Sécurité double même si le middleware bloque déjà
    redirect('/dashboard');
  }

  return (
    <PortalProvider consultantId={profile.consultant_id} userId={user.id}>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  );
}
