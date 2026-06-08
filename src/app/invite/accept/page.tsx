import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Props = {
  searchParams: { token?: string };
};

// =========================================================================
// GET /invite/accept?token=… — Accepte une invitation
// -------------------------------------------------------------------------
// Server Component : tout se joue server-side.
//   - Pas de token → erreur
//   - Token introuvable / expiré → erreur
//   - User non connecté → redirect /signup?invite=<token>
//   - User connecté ≠ email invité → erreur (anti-phishing)
//   - OK → insert organization_members, marque accepted_at, redirect /dashboard
// =========================================================================

export default async function InviteAcceptPage({ searchParams }: Props) {
  const token = searchParams.token?.trim();
  if (!token) {
    return (
      <ErrorCard title="Lien invalide" message="Le token d'invitation est manquant." />
    );
  }

  const admin = createAdminClient('invitation');
  const { data: invite } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at, organizations(name)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return (
      <ErrorCard title="Invitation introuvable" message="Ce lien n'est pas valide." />
    );
  }

  if (invite.accepted_at) {
    return (
      <ErrorCard
        title="Invitation déjà utilisée"
        message="Cette invitation a déjà été acceptée."
        backTo="/login"
      />
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <ErrorCard
        title="Invitation expirée"
        message="Ce lien a expiré. Demande à l'admin de renvoyer une invitation."
      />
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non connecté → redirect signup avec le token
  if (!user) {
    redirect(`/signup?invite=${token}`);
  }

  // Connecté avec le mauvais email → erreur anti-phishing
  if ((user.email ?? '').toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <ErrorCard
        title="Email différent"
        message={`Cette invitation est pour ${invite.email}. Connecte-toi avec cet email.`}
        backTo="/login"
      />
    );
  }

  // Accepte : insert membership + mark accepted + set active org
  const orgName =
    (invite.organizations as unknown as { name: string } | { name: string }[] | null) != null
      ? Array.isArray(invite.organizations)
        ? invite.organizations[0]?.name
        : (invite.organizations as { name: string }).name
      : 'organisation';

  await admin
    .from('organization_members')
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
      invited_by: null,
    })
    .then(({ error }) => {
      // Peut échouer si déjà membre — on ignore silencieusement pour idempotence
      if (error && error.code !== '23505') throw error;
    });

  await admin
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', invite.id);

  await admin
    .from('profiles')
    .update({ organization_id: invite.organization_id, role: invite.role })
    .eq('id', user.id);

  redirect('/dashboard?invited=' + encodeURIComponent(orgName));
}

function ErrorCard({
  title,
  message,
  backTo,
}: {
  title: string;
  message: string;
  backTo?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <CentriumWordmark size="md" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={backTo ?? '/signup'}>
              {backTo === '/login' ? 'Se connecter' : 'Créer un compte'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
