import { cn } from '@/lib/utils';

/**
 * Entrée en cascade des sections d'une page (fondu + légère translation).
 * Animation CSS : elle démarre dès le premier rendu, sans attendre
 * l'hydratation ni charger de bibliothèque d'animation, et
 * prefers-reduced-motion la neutralise (globals.css). Le remplissage
 * « backwards » ne laisse aucune transformation une fois l'animation
 * terminée (les enfants en position fixe restent ancrés à l'écran).
 *
 *   <Reveal className="grid …">…</Reveal>
 *   <Reveal delay={0.08}>…</Reveal>   // décalage pour l'effet cascade
 */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('animate-fade-up [animation-fill-mode:backwards]', className)} style={delay ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
