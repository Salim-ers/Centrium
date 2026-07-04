'use client';

import { toast } from 'sonner';

import { showBrandToast } from '@/components/ui/BrandToast';

// =========================================================================
// Pont global sonner → BrandToast.
// -------------------------------------------------------------------------
// PROBLÈME résolu : le Toaster est monté en `unstyled` (BrandToast fournit
// sa propre carte), mais des dizaines de call-sites appellent directement
// toast.error / toast.warning / toast.info de sonner → rendu NU (icône +
// texte flottants, « horrible » — feedback utilisateur, juillet 2026).
//
// `toast` est un singleton module partagé par tous les imports de
// 'sonner' : re-assigner ses méthodes ici redirige TOUS les appels vers la
// carte BrandToast (glass sombre, filet coloré, pastille icône), sans
// toucher aux ~50 call-sites. toast.custom (utilisé par BrandToast
// lui-même) n'est PAS patché — pas de récursion.
//
//   - toast.success  → SILENCIEUX (décision produit : la fermeture du
//                      dialog / la liste qui bouge suffisent)
//   - toast.error    → BrandToast error   (rouge, 5 s)
//   - toast.warning  → BrandToast warning (ambre, 4 s)
//   - toast.info     → BrandToast info    (cyan, 2 s)
//   - toast.message  → BrandToast info
//   - toast.loading  → BrandToast loading (spinner, dismiss manuel)
// =========================================================================

let patched = false;

type SonnerData = { description?: React.ReactNode; duration?: number } | undefined;

function bridge() {
  if (patched) return;
  patched = true;

  toast.success = (() => '') as typeof toast.success;

  toast.error = ((message: React.ReactNode, data?: SonnerData) =>
    showBrandToast('error', message, {
      description: data?.description,
      duration: data?.duration,
    })) as typeof toast.error;

  toast.warning = ((message: React.ReactNode, data?: SonnerData) =>
    showBrandToast('warning', message, {
      description: data?.description,
      duration: data?.duration,
    })) as typeof toast.warning;

  toast.info = ((message: React.ReactNode, data?: SonnerData) =>
    showBrandToast('info', message, {
      description: data?.description,
      duration: data?.duration,
    })) as typeof toast.info;

  toast.message = ((message: React.ReactNode, data?: SonnerData) =>
    showBrandToast('info', message, {
      description: data?.description,
      duration: data?.duration,
    })) as typeof toast.message;

  toast.loading = ((message: React.ReactNode, data?: SonnerData) =>
    showBrandToast('loading', message, {
      description: data?.description,
      duration: data?.duration,
    })) as typeof toast.loading;
}

export function GlobalToastBridge() {
  bridge();
  return null;
}
