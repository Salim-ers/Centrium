import { redirect } from 'next/navigation';

/**
 * /security a été fusionné dans /engagements (vision produit +
 * sécurité/conformité dans une seule page). Cette route reste pour
 * la rétrocompatibilité des liens existants et redirige côté serveur.
 */
export default function SecurityRedirect() {
  redirect('/engagements');
}
