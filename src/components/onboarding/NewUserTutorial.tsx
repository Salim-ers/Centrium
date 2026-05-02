'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Users,
  Briefcase,
  Target,
  ClipboardCheck,
  Receipt,
  Palette,
  ArrowRight,
  X,
  HelpCircle,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CentriumMark } from '@/components/brand/CentriumMark';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'centrium_tutorial_seen_v1';

type Step = {
  icon: typeof Users;
  title: string;
  body: string;
  cta: { label: string; href: string };
};

const STEPS: Step[] = [
  {
    icon: Palette,
    title: 'Personnalise ton identité visuelle',
    body:
      'Logo, couleurs, signature, mentions légales — tout passe par Paramètres → Identité visuelle. C\'est ce que verront tes consultants et tes clients sur tes CV, contrats et factures.',
    cta: { label: 'Configurer maintenant', href: '/settings/branding' },
  },
  {
    icon: Users,
    title: 'Ajoute tes consultants',
    body:
      'Crée tes fiches consultants un par un, importe en masse via CSV, ou ajoute-les en mode "vivier" pour les profils que tu prospectes sans les compter dans ton effectif.',
    cta: { label: 'Voir les consultants', href: '/consultants' },
  },
  {
    icon: Briefcase,
    title: 'Crée tes offres / appels d\'offres',
    body:
      'Saisis manuellement ou importe une capture d\'écran d\'AO — l\'IA Centrium extrait automatiquement intitulé, compétences, TJM, lieu et durée.',
    cta: { label: 'Nouvelle offre', href: '/offers' },
  },
  {
    icon: Target,
    title: 'Matche consultants ↔ offres',
    body:
      'Centrium scanne automatiquement tes consultants disponibles pour chaque AO, classe par compatibilité (compétences + séniorité + TJM) et te propose les meilleurs profils.',
    cta: { label: 'Lancer un matching', href: '/matching' },
  },
  {
    icon: ClipboardCheck,
    title: 'Suis les CRA et factures',
    body:
      'Le consultant dépose son CRA mensuel, tu le valides en 1 clic et la facture est générée automatiquement. Le CA "produit" du mois remonte sur ton dashboard sans intervention.',
    cta: { label: 'Voir les CRA', href: '/timesheets' },
  },
];

type Props = {
  /** Affiche le bouton ouvert/fermé contrôlé. Sinon : auto-open au 1er montage si pas vu. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function NewUserTutorial({ open: controlledOpen, onOpenChange }: Props = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(0);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(v: boolean) {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
    if (!v) {
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    }
  }

  // Auto-open la première fois si pas controlé
  useEffect(() => {
    if (isControlled) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Petit délai pour laisser la page se peindre
        const t = setTimeout(() => setInternalOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [isControlled]);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 mb-2">
            <CentriumMark size="md" showWordmark={false} />
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.05]"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-violet-glow" />
            Bienvenue sur Centrium
          </DialogTitle>
          <DialogDescription>
            5 étapes pour démarrer en 5 minutes.
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step
                  ? 'w-6 bg-violet-glow'
                  : i < step
                    ? 'w-1.5 bg-violet-glow/50'
                    : 'w-1.5 bg-white/10 hover:bg-white/25',
              )}
              aria-label={`Étape ${i + 1}`}
            />
          ))}
        </div>

        <div className="rounded-xl border border-violet-glow/20 bg-violet-glow/[0.04] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-violet-glow/15 p-2 shrink-0">
              <Icon className="h-5 w-5 text-violet-glow" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base">{current.title}</div>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {current.body}
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" asChild>
              <a href={current.cta.href} onClick={() => setOpen(false)}>
                {current.cta.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2">
          <div className="text-xs text-muted-foreground">
            Étape {step + 1} sur {STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                Précédent
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => setOpen(false)}>
                Terminer
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Suivant
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bouton CTA "Tuto" — ré-ouvre le tutoriel à la demande. Style proéminent
 * pour qu'il soit immédiatement repéré.
 */
export function TutorialButton({
  className,
  variant = 'cta',
}: {
  className?: string;
  /** cta = bouton coloré gradient, ghost = petit pill discret. */
  variant?: 'cta' | 'ghost';
}) {
  const [open, setOpen] = useState(false);
  const cls =
    variant === 'cta'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-glow to-magenta px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(225,29,116,0.55)] hover:brightness-110 hover:shadow-[0_0_28px_-4px_rgba(225,29,116,0.7)] transition'
      : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-white/25 transition';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(cls, className)}>
        <HelpCircle className={variant === 'cta' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {variant === 'cta' ? 'Voir le tuto' : 'Tuto'}
      </button>
      <NewUserTutorial open={open} onOpenChange={setOpen} />
    </>
  );
}
