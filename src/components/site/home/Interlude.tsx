import { MaskImage, Wide } from '../kit';

/** Respiration photographique pleine largeur entre deux scènes. */
export function Interlude() {
  return (
    <section data-nav="light" aria-label="Moins d’outils, plus de pilotage" className="relative h-[85svh] min-h-[520px] overflow-hidden bg-terra-dark text-ivory">
      <MaskImage src="/photos/it-circuit.webp" alt="Circuit imprimé aux pistes dorées, en gros plan" sizes="100vw" className="absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
      <Wide className="relative flex h-full items-end pb-14 md:pb-20">
        <p className="max-w-[16ch] text-[clamp(2.2rem,5.6vw,6rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em]">
          Moins d’outils.{' '}
          <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra-peach">Plus de pilotage.</em>
        </p>
      </Wide>
    </section>
  );
}
