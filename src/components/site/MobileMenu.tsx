'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';

import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';

import { EASE, useReducedMotion } from './kit';

const ITEMS = [
  { href: '/plateforme', label: 'Fonctionnalités' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/securite', label: 'Sécurité' },
];

/** Menu mobile plein écran, terracotta profond. */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  // Référence stable : le parent peut passer une fonction recréée à chaque rendu.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab' || !panel.current) return;
      // Le focus reste dans le menu tant qu'il est ouvert.
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a, button'));
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z?.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-terra-deep text-ivory lg:hidden"
          initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
          animate={reduce ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
          exit={reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: reduce ? 0.15 : 0.6, ease: EASE }}
        >
          <div className="flex h-16 items-center justify-between px-5 sm:px-8">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              <CentriumLogo className="h-8 w-8" color="currentColor" />
              <CentriumType className="h-[13px]" />
            </Link>
            <button type="button" onClick={onClose} className="-mr-2 inline-flex h-11 items-center gap-2 rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory">
              Fermer <X className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Navigation principale" className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-8">
            <ul className="space-y-1">
              {ITEMS.map((it, i) => (
                <li key={it.href} className="overflow-hidden border-b border-ivory/15">
                  <motion.div initial={reduce ? false : { y: '100%' }} animate={{ y: '0%' }} transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: EASE }}>
                    <Link href={it.href} onClick={onClose} className="flex items-baseline py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory">
                      <span className="text-[clamp(2.4rem,11vw,4.5rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]">{it.label}</span>
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-3 px-5 pb-8 sm:grid-cols-2 sm:px-8">
            <Link href="/login" onClick={onClose} className="flex h-14 items-center justify-center rounded-full border border-ivory/30 text-[13px] font-semibold uppercase tracking-[0.14em]">
              Se connecter
            </Link>
            <Link href="/demo" onClick={onClose} className="flex h-14 items-center justify-center gap-2 rounded-full bg-ivory text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">
              Demander une démo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
