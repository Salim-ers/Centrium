import { redirect } from 'next/navigation';

/**
 * L'ancien onglet "Vivier" a été fusionné avec la bibliothèque dans
 * l'onglet unique "Consultants". Cette route reste en place pour les
 * liens / bookmarks existants et redirige côté serveur.
 */
export default function ProspectsRedirect() {
  redirect('/consultants');
}
