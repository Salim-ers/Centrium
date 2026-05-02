'use client';

import { useOrganizationSafe } from '@/lib/auth/context';

/**
 * Injecte les couleurs de marque de l'org connectée en variables CSS au
 * niveau du document. Tout composant qui consomme `var(--brand-primary)` /
 * `var(--brand-accent)` se rebrand automatiquement à la connexion d'un
 * client différent. Pas de re-render forcé du tree : on pose juste un
 * <style> scoped au :root.
 *
 * Fallback = palette QuadCore (violet / magenta).
 */
export function BrandingStyles() {
  const org = useOrganizationSafe();
  const primary = org?.branding?.primaryColor ?? '#6d28d9';
  const accent = org?.branding?.accentColor ?? '#e11d74';

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{--brand-primary:${primary};--brand-accent:${accent};}`,
      }}
    />
  );
}

/**
 * Hook utilitaire : renvoie le nom de marque visible aux users.
 * Cascade : brand_name (override) → name (raison sociale) → 'QuadCore'.
 */
export function useBrandName(): string {
  const org = useOrganizationSafe();
  return org?.branding?.brandName ?? org?.branding?.name ?? 'QuadCore';
}
