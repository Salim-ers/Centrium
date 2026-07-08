'use client';

// Téléchargement direct en PDF d'un élément DOM rendu visuellement —
// rasterise le DOM via html2canvas puis paginate en A4 dans jsPDF.
// Évite la boîte de dialogue "Imprimer" système.

import { toast } from 'sonner';

export type DownloadOptions = {
  /** Nom du fichier sans extension (".pdf" ajouté automatiquement). */
  fileName: string;
  /** Marge en mm autour du contenu sur chaque page A4 (default 0). */
  marginMm?: number;
  /** Échelle html2canvas (default 2 = retina-like). */
  scale?: number;
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function downloadElementAsPdf(
  element: HTMLElement | null,
  opts: DownloadOptions,
): Promise<void> {
  if (!element) {
    toast.error('Document introuvable.');
    return;
  }

  // On cible la "page A4" elle-même (.qc-print-doc / .cv-print-page) plutôt
  // que le wrapper de prévisualisation, qui inclut le fond gris et un padding
  // qui réduisent visuellement le document dans le PDF final.
  const docPage =
    (element.querySelector('.qc-print-doc, .cv-print-page') as HTMLElement | null) ??
    element;

  const t = toast.loading('Génération du PDF…');
  try {
    // Imports dynamiques : ces deux libs sont lourdes, on ne les charge
    // qu'au moment du téléchargement (pas dans le bundle initial).
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const scale = opts.scale ?? 2;
    const margin = opts.marginMm ?? 0;

    const canvas = await html2canvas(docPage, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      // Ignore les sections cachées à l'impression (`.no-print` etc.)
      ignoreElements: (el) =>
        el.classList?.contains('no-print') ||
        el.getAttribute('data-html2canvas-ignore') === 'true',
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const usableWidth = A4_WIDTH_MM - margin * 2;
    const usableHeight = A4_HEIGHT_MM - margin * 2;
    // Hauteur totale du contenu rendu, en mm, ramené à la largeur A4 utile.
    const contentHeightMm = (canvas.height * usableWidth) / canvas.width;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Cas 1 — tient déjà sur une page A4 → addImage direct.
    if (contentHeightMm <= usableHeight) {
      pdf.addImage(dataUrl, 'JPEG', margin, margin, usableWidth, contentHeightMm);
    }
    // Cas 2 — léger débord (≤ 40% au-delà d'une page). C'est le cas typique
    // des documents A4 (facture, fiche) capturés au pixel près qui débordent
    // d'un peu. On scale-to-fit pour tenir sur 1 page sans page blanche.
    else if (contentHeightMm <= usableHeight * 1.4) {
      const fitWidth = (canvas.width * usableHeight) / canvas.height;
      const offsetX = margin + (usableWidth - fitWidth) / 2;
      pdf.addImage(dataUrl, 'JPEG', offsetX, margin, fitWidth, usableHeight);
    }
    // Cas 3 — vraiment multi-pages (CV à rallonge, contrat de plusieurs
    // articles) → découpe verticale.
    else {
      const pageHeightPx = (canvas.width * usableHeight) / usableWidth;
      let renderedPx = 0;
      let pageIndex = 0;
      while (renderedPx < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) break;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, renderedPx, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight,
        );
        const sliceUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        if (pageIndex > 0) pdf.addPage();
        const sliceMm = (sliceHeight * usableWidth) / canvas.width;
        pdf.addImage(sliceUrl, 'JPEG', margin, margin, usableWidth, sliceMm);
        renderedPx += sliceHeight;
        pageIndex += 1;
      }
    }

    pdf.save(`${opts.fileName.replace(/\.pdf$/i, '')}.pdf`);
    toast.success('PDF téléchargé.', { id: t });
  } catch (e) {
    console.error('[downloadElementAsPdf]', e);
    toast.error(
      `Génération PDF échouée${e instanceof Error ? ` : ${e.message}` : ''}.`,
      { id: t },
    );
  }
}
