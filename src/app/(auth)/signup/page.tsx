import { redirect } from 'next/navigation';

import { InviteActivationCard } from './InviteActivationCard';

/**
 * La création de compte self-service a été retirée : on ne crée plus
 * d'organisation côté public. Les prospects passent par /devis (demande
 * de devis), puis l'équipe provisionne manuellement leur espace avec
 * leur branding via /admin/clients.
 *
 * EXCEPTION — ?invite=<token> : un invité d'équipe qui ouvre le lien
 * copié-collé (/invite/accept?token=…) SANS session est renvoyé ici par
 * la page d'acceptation. Avant, ce cas redirigait vers /devis en perdant
 * le token (dead-end). On affiche désormais une page d'activation qui
 * renvoie l'email Supabase Auth (session établie via /auth/callback,
 * puis retour automatique sur /invite/accept avec le même token).
 *
 * Sans token, la route reste une redirection gracieuse vers /devis pour
 * les bookmarks / liens externes existants.
 */
export default function SignupPage({
  searchParams,
}: {
  searchParams?: { invite?: string };
}) {
  const inviteToken = searchParams?.invite?.trim();
  if (!inviteToken) redirect('/devis');
  return <InviteActivationCard token={inviteToken} />;
}
