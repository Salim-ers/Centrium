import { redirect } from 'next/navigation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ancienne route « CV Optimizer » : la génération de dossiers vit désormais
 * dans la fiche consultant (Consultants → fiche → Dossier de compétences).
 * Les liens existants sont redirigés.
 */
export default function CvOptimizerRedirect({
  searchParams,
}: {
  searchParams: { consultantId?: string; offerId?: string };
}) {
  const id = searchParams.consultantId;
  if (id && UUID.test(id)) {
    const offer = searchParams.offerId && UUID.test(searchParams.offerId) ? `?offerId=${searchParams.offerId}` : '';
    redirect(`/consultants/${id}/dossier${offer}`);
  }
  redirect('/consultants');
}
