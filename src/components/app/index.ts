/**
 * Primitives partagées pour l'app interne Centrium (post-login).
 *
 * Toutes ces primitives reprennent le langage de design de la vitrine :
 *   - couleurs magenta + violet (avec halos radiaux)
 *   - typographie display + serif éditorial (qc-italic-accent)
 *   - glass cards (bg-card/60 + backdrop-blur)
 *   - hover micro-interactions (translate + shadow)
 *   - tokens muted-foreground / hairline / magenta-neon / violet-glow
 *
 * À utiliser SYSTÉMATIQUEMENT dans toutes les pages de `src/app/(app)/`
 * pour cohérence visuelle.
 */
export { PageHeader } from './PageHeader';
export { SectionHeader } from './SectionHeader';
export { KPICard } from './KPICard';
export { AppCard, AppCardBody } from './AppCard';
export { StatusBadge, type StatusTone } from './StatusBadge';
export { EmptyState } from './EmptyState';
export { DataRow } from './DataRow';
export { BulkActionBar } from './BulkActionBar';
