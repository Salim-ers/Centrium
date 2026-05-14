import { redirect } from 'next/navigation';

/**
 * La création de compte self-service a été retirée : on ne crée plus
 * d'organisation côté public. Les prospects passent par /devis (demande
 * de devis), puis l'équipe provisionne manuellement leur espace avec
 * leur branding via /admin/clients.
 *
 * Cette route reste en place pour rediriger gracieusement les bookmarks /
 * liens externes existants.
 */
export default function SignupRedirect() {
  redirect('/devis');
}
