'use client';

import type { JobOffer } from '@/types';
import type { CVBrand } from '@/lib/cv/branding';
import { resolvePosterBrand } from '@/lib/cv/branding';

type ExportOptions = {
  /** Nom du fichier (sans extension). */
  filename: string;
  brand?: CVBrand;
  logoSrc?: string;
  contactEmail?: string;
  /** Locale d'affichage pour les libellés statiques (FICHE DE POSTE etc.). */
  locale?: 'fr' | 'en';
};

/**
 * Génère et télécharge la "Fiche de poste" PDF pour un AO / mission.
 * Lazy-import de @react-pdf/renderer pour ne pas grossir le bundle des
 * pages qui n'utilisent pas l'export.
 */
export async function exportJobOfferPoster(
  offer: JobOffer,
  { filename, brand, logoSrc, contactEmail, locale }: ExportOptions,
): Promise<void> {
  const [{ pdf }, mod] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/offers/pdf/JobOfferPosterPDF'),
  ]);

  const resolved = brand ?? resolvePosterBrand(null);
  const effectiveLogo = logoSrc ?? resolved.logoUrl ?? undefined;

  const doc = (
    <mod.JobOfferPosterPDF
      offer={offer}
      brand={resolved}
      logoSrc={effectiveLogo}
      contactEmail={contactEmail}
      locale={locale}
    />
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
