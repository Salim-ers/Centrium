'use client';

import { motion } from 'framer-motion';

/**
 * Entrée en cascade des sections d'une page (fondu + translation 12px).
 * Version PARTAGÉE du helper dupliqué dans les pages admin — à utiliser
 * pour tout nouveau bloc (KPIs, sections, cartes) :
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
