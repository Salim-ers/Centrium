import { cn } from '@/lib/utils';

/**
 * Symbole Centrium : un point central dans un anneau ouvert — le cockpit
 * qui réunit l'activité de l'ESN. SVG inline (net à toutes les tailles,
 * aucune requête réseau).
 */
export function CentriumLogo({ className, title = 'Centrium' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={title} className={cn('shrink-0', className)}>
      <rect width="200" height="200" rx="48" fill="#C65F46" />
      <path
        d="M143.1 63.8A56 56 0 1 0 143.1 136.2"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="18" fill="#FFFFFF" />
    </svg>
  );
}
