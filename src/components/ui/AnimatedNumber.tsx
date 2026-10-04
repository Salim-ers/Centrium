'use client';

/**
 * Anime un nombre quand sa valeur change : tween ~600 ms entre l'ancienne
 * et la nouvelle valeur, avec un petit "flash" coloré quand la transition
 * démarre pour attirer l'œil ("hey, ça vient de changer").
 *
 * Si la valeur est `null/undefined` on affiche le placeholder (— par défaut).
 * Si format est fourni, on l'applique au nombre tweené (utile pour
 * "1 234 €" ou autres rendus customisés).
 *
 * Pas de dépendance externe — RAF + ease-out cubique pour rester léger.
 */

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: number | null | undefined;
  /** Format custom : nombre entier tweené → string affichée. */
  format?: (n: number) => string;
  /** Texte affiché quand value est null/undefined. Défaut "—". */
  placeholder?: string;
  /** Durée du tween en ms. Défaut 600. */
  durationMs?: number;
  /** Classes du span racine. */
  className?: string;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedNumber({
  value,
  format,
  placeholder = '—',
  durationMs = 600,
  className,
}: Props) {
  const [displayed, setDisplayed] = useState<number | null>(
    typeof value === 'number' ? value : null,
  );
  const [flash, setFlash] = useState(false);
  const startValRef = useRef<number>(typeof value === 'number' ? value : 0);
  const targetValRef = useRef<number>(typeof value === 'number' ? value : 0);
  const startTsRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayed(null);
      return;
    }
    // Première valeur réelle : on l'affiche d'office (pas de tween from 0).
    if (displayed === null) {
      setDisplayed(value);
      startValRef.current = value;
      targetValRef.current = value;
      return;
    }
    if (value === displayed) return;

    startValRef.current = displayed;
    targetValRef.current = value;
    startTsRef.current = performance.now();
    setFlash(true);

    const tick = (now: number) => {
      const elapsed = now - startTsRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      const next =
        startValRef.current + (targetValRef.current - startValRef.current) * eased;
      // Sur les entiers naturels, on arrondit pour éviter le rendu "12.7".
      const isInt = Number.isInteger(startValRef.current) && Number.isInteger(targetValRef.current);
      setDisplayed(isInt ? Math.round(next) : Number(next.toFixed(2)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        // Petit délai avant retrait du flash pour qu'on le voit.
        setTimeout(() => setFlash(false), 300);
      }
    };
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // displayed est ref-like ici, on ne veut pas relancer le tween dessus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  if (displayed === null || displayed === undefined) {
    return <span className={className}>{placeholder}</span>;
  }
  const text = format ? format(displayed) : displayed.toLocaleString('fr-FR');

  return (
    <span
      className={`inline-block transition-colors duration-300 ${flash ? 'text-primary' : ''} ${className ?? ''}`}
    >
      {text}
    </span>
  );
}
