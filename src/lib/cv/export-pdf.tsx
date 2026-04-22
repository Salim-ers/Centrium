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

import type { CVContent, CVTemplateId } from '@/types';

type ExportOptions = {
  /** Nom du fichier (sans extension) */
  filename: string;
  /** Variante de template */
  templateId: CVTemplateId;
  /** URL du logo affiché en entête (laisse vide si indisponible) */
  logoSrc?: string;
  /** Bandeau "Document confidentiel" (défaut true) */
  showConfidential?: boolean;
};

export async function exportCVToPdf(
  content: CVContent,
  { filename, templateId, logoSrc, showConfidential = true }: ExportOptions,
): Promise<void> {
  const [{ pdf }, standard, dense, executive] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/cv/pdf/QuadCoreCVStandardPDF'),
    import('@/components/cv/pdf/QuadCoreCVDensePDF'),
    import('@/components/cv/pdf/QuadCoreCVExecutivePDF'),
  ]);

  const DocForTemplate =
    templateId === 'dense'
      ? dense.QuadCoreCVDensePDF
      : templateId === 'executive'
        ? executive.QuadCoreCVExecutivePDF
        : standard.QuadCoreCVStandardPDF;

  const doc = (
    <DocForTemplate
      content={content}
      logoSrc={logoSrc}
      showConfidential={showConfidential}
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
