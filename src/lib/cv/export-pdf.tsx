'use client';

// =========================================================================
// Export PDF — @react-pdf/renderer
// -------------------------------------------------------------------------
// Génère un VRAI PDF vectoriel à partir des composants React-PDF dédiés.
// - Textes sélectionnables
// - Sauts de page natifs (attribut `wrap`, `minPresenceAhead`)
// - Aucune coupure de mot en bord de page
// - Indépendant du rendu DOM
//
// Chargement en dynamic import pour ne pas grossir le bundle initial.
// =========================================================================

import type { CVContent } from '@/types';
import type { CVBrand } from './branding';
import { resolveBrand } from './branding';
import type { DossierTemplateId } from './templates';

type ExportOptions = {
  /** Nom du fichier (sans extension) */
  filename: string;
  /** Modèle de dossier */
  templateId: DossierTemplateId;
  /** URL du logo affiché en entête (laisse vide si indisponible) */
  logoSrc?: string;
  /** Mention « Document confidentiel » (défaut true) */
  showConfidential?: boolean;
  /** Branding résolu de l'organisation (fallback neutre). */
  brand?: CVBrand;
  /** Data URL du QR code à afficher à côté du logo (optionnel). */
  qrSrc?: string;
};

export async function exportCVToPdf(
  content: CVContent,
  { filename, templateId, logoSrc, showConfidential = true, brand, qrSrc }: ExportOptions,
): Promise<void> {
  const [{ pdf }, { DossierPDF }] = await Promise.all([import('@react-pdf/renderer'), import('@/components/cv/pdf/DossierPDF')]);

  const resolved = brand ?? resolveBrand(null);
  const effectiveLogo = logoSrc ?? resolved.logoUrl ?? undefined;

  const doc = <DossierPDF content={content} template={templateId} brand={resolved} logoSrc={effectiveLogo} showConfidential={showConfidential} qrSrc={qrSrc} />;

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
