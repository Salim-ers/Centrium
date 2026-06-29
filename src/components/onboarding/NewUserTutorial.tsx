'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Users,
  Briefcase,
  Target,
  ClipboardCheck,
  Palette,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  FileText,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { cn } from '@/lib/utils';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';

// v2 — contenu repensé, on force la ré-ouverture pour les users existants.
const STORAGE_KEY = 'centrium_tutorial_seen_v2';

type Bilingual = { fr: string; en: string };

type Step = {
  /** Petit label en haut, ex: "ÉTAPE 3 · TALENTS". */
  category: Bilingual;
  icon: LucideIcon;
  /** Gradient Tailwind pour le fond de l'icône — touche identitaire. */
  iconBg: string;
  /** Couleur accent pour le bullet point + ring autour de l'icône. */
  accent: string;
  title: Bilingual;
  subtitle: Bilingual;
  body: Bilingual;
  bullets: { emoji: string; text: Bilingual }[];
  /** CTA principale en bas de la carte — navigue vers la page. */
  cta: Bilingual & { href: string };
};

const STEPS: Step[] = [
  // ───────────────────────────────────────────────────────────────
  // STEP 1 — Welcome
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'BIENVENUE', en: 'WELCOME' },
    icon: Sparkles,
    iconBg: 'from-violet-glow to-magenta',
    accent: 'text-violet-glow',
    title: { fr: 'Bienvenue sur Centrium', en: 'Welcome to Centrium' },
    subtitle: {
      fr: 'La plateforme tout-en-un pour ton ESN',
      en: 'The all-in-one platform for your IT services firm',
    },
    body: {
      fr: "De l'ajout d'un consultant à la facturation client, Centrium centralise tout ton métier dans un seul outil — avec l'IA pour booster les CV, le matching et la comptabilité.",
      en: 'From onboarding a consultant to billing a client, Centrium puts your entire business in one tool — with AI to power CVs, matching and accounting.',
    },
    bullets: [
      {
        emoji: '📚',
        text: {
          fr: 'Bibliothèque consultants + CV Optimizer IA',
          en: 'Consultant library + AI CV Optimizer',
        },
      },
      {
        emoji: '🎯',
        text: { fr: 'Matching IA multi-critères', en: 'Multi-criteria AI matching' },
      },
      {
        emoji: '📊',
        text: {
          fr: 'Pipeline commercial + facturation auto',
          en: 'Sales pipeline + auto-invoicing',
        },
      },
      {
        emoji: '🌍',
        text: { fr: 'FR/EN · €/$ · clair/sombre', en: 'FR/EN · €/$ · light/dark' },
      },
    ],
    cta: {
      fr: 'Commencer le tour',
      en: 'Start the tour',
      href: '/dashboard',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 2 — Branding (Settings)
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 1 · IDENTITÉ', en: 'STEP 1 · BRANDING' },
    icon: Palette,
    iconBg: 'from-rose-500 to-orange-400',
    accent: 'text-rose-300',
    title: { fr: 'Personnalise ton identité', en: 'Make it yours' },
    subtitle: {
      fr: 'Logo, couleurs et mentions légales — réutilisés partout',
      en: 'Logo, colors and legal info — reused everywhere',
    },
    body: {
      fr: "Tout ce que tu configures ici apparaît sur tes CV, contrats et factures générés. Premier réflexe : prends 5 minutes pour le faire avant d'inviter ton équipe.",
      en: 'Everything you set up here appears on your generated CVs, contracts and invoices. First step: take 5 minutes before inviting your team.',
    },
    bullets: [
      {
        emoji: '🎨',
        text: {
          fr: 'Logo + couleur primaire (PNG transparent recommandé)',
          en: 'Logo + primary color (transparent PNG recommended)',
        },
      },
      {
        emoji: '📜',
        text: {
          fr: 'Mentions légales (SIREN, adresse) — obligatoire contrats',
          en: 'Legal info (SIREN, address) — required for contracts',
        },
      },
      {
        emoji: '🌗',
        text: {
          fr: 'Thème clair ou sombre selon ton goût',
          en: 'Light or dark theme as you wish',
        },
      },
    ],
    cta: {
      fr: 'Configurer mon identité',
      en: 'Configure branding',
      href: '/settings/branding',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 3 — Consultants
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 2 · TALENTS', en: 'STEP 2 · TALENTS' },
    icon: Users,
    iconBg: 'from-magenta to-violet-glow',
    accent: 'text-magenta-neon',
    title: { fr: 'Ta bibliothèque de consultants', en: 'Your talent library' },
    subtitle: {
      fr: 'Un par un, en masse, ou en mode prospection',
      en: 'One by one, in bulk, or as prospects',
    },
    body: {
      fr: "Trois manières de remplir ta bibliothèque selon où tu en es : création manuelle pour les profils confirmés, import CSV pour migrer depuis un autre outil, ou mode « vivier » pour les profils que tu prospectes sans les compter dans ton effectif.",
      en: "Three ways to fill your library: manual creation for confirmed profiles, CSV import to migrate from another tool, or 'pool' mode for profiles you're sourcing without counting them in headcount.",
    },
    bullets: [
      {
        emoji: '📁',
        text: {
          fr: 'Import CSV (mapping auto des colonnes)',
          en: 'CSV import (auto column mapping)',
        },
      },
      {
        emoji: '🎯',
        text: {
          fr: 'Statut : Disponible · En mission · Bientôt dispo',
          en: 'Status: Available · On mission · Soon available',
        },
      },
      {
        emoji: '🏷️',
        text: {
          fr: 'Compétences taggées + recherche full-text',
          en: 'Tagged skills + full-text search',
        },
      },
    ],
    cta: {
      fr: 'Voir mes consultants',
      en: 'Go to Consultants',
      href: '/consultants',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 4 — CV Optimizer
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 3 · CV OPTIMIZER', en: 'STEP 3 · CV OPTIMIZER' },
    icon: FileText,
    iconBg: 'from-cyan-400 to-violet-glow',
    accent: 'text-cyan-300',
    title: {
      fr: 'Génère des CV parfaits en 5 secondes',
      en: 'Generate perfect CVs in seconds',
    },
    subtitle: {
      fr: "L'IA polit la mise en forme, JAMAIS le contenu",
      en: 'AI polishes layout, NEVER the content',
    },
    body: {
      fr: "Sélectionne un consultant, choisis un template, et exporte en PDF ou Word avec ton branding appliqué. Colle une offre client en plus → l'IA aligne le wording et calcule un score de matching skill par skill.",
      en: 'Pick a consultant, choose a template, export as PDF or Word with your branding applied. Paste a client offer too → AI aligns wording and computes a skill-by-skill match score.',
    },
    bullets: [
      {
        emoji: '🎨',
        text: {
          fr: '3 templates (Standard · Dense · Executive)',
          en: '3 templates (Standard · Dense · Executive)',
        },
      },
      {
        emoji: '✍️',
        text: { fr: 'Édition inline (comme Canva)', en: 'Inline editing (like Canva)' },
      },
      {
        emoji: '🛡️',
        text: {
          fr: 'Règle absolue : aucune invention de skill/date',
          en: 'Absolute rule: never invents skills or dates',
        },
      },
    ],
    cta: {
      fr: 'Essayer le CV Optimizer',
      en: 'Try the CV Optimizer',
      href: '/cv-optimizer',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 5 — Offers (Missions)
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 4 · OFFRES CLIENT', en: 'STEP 4 · CLIENT OFFERS' },
    icon: Briefcase,
    iconBg: 'from-amber-400 to-rose-500',
    accent: 'text-amber-300',
    title: { fr: "Capture chaque appel d'offres", en: 'Capture every RFP' },
    subtitle: {
      fr: "Capture d'écran, texte collé, ou saisie manuelle",
      en: 'Screenshot, pasted text, or manual entry',
    },
    body: {
      fr: "L'IA extrait automatiquement intitulé, compétences, TJM, lieu et dates depuis n'importe quel format. Plus besoin de retaper l'AO ligne par ligne — gain de temps massif.",
      en: 'AI auto-extracts title, skills, day rate, location and dates from any format. No more retyping the RFP line by line — massive time save.',
    },
    bullets: [
      {
        emoji: '📸',
        text: {
          fr: "Capture d'écran → extraction IA",
          en: 'Screenshot → AI extraction',
        },
      },
      {
        emoji: '📋',
        text: {
          fr: 'Texte collé → parsing intelligent',
          en: 'Pasted text → smart parsing',
        },
      },
      {
        emoji: '🏷️',
        text: {
          fr: 'Auto-catégorisation par famille métier',
          en: 'Auto-categorize by job family',
        },
      },
    ],
    cta: {
      fr: 'Nouvelle offre',
      en: 'New offer',
      href: '/offers',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 6 — AI Matching
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 5 · MATCHING IA', en: 'STEP 5 · AI MATCHING' },
    icon: Target,
    iconBg: 'from-violet-glow to-cyan-400',
    accent: 'text-violet-300',
    title: {
      fr: 'Trouve les meilleurs profils automatiquement',
      en: 'Find the best profiles automatically',
    },
    subtitle: {
      fr: 'Scoring multi-critères + pitch IA pour le top 5',
      en: 'Multi-criteria scoring + AI pitch for top 5',
    },
    body: {
      fr: "Pour chaque offre, Centrium scanne ta bibliothèque et classe tes consultants par compatibilité. Le top 5 est enrichi d'un pitch IA et d'une analyse de risques.",
      en: 'For every offer, Centrium scans your library and ranks consultants by fit. The top 5 gets an AI pitch and risk analysis.',
    },
    bullets: [
      {
        emoji: '🎯',
        text: {
          fr: '7 critères pondérés (skills, séniorité, TJM, dispo, langues, lieu, bonus)',
          en: '7 weighted criteria (skills, seniority, day rate, availability, languages, location, bonus)',
        },
      },
      {
        emoji: '🤖',
        text: { fr: 'Pitch IA + risques sur le top 5', en: 'AI pitch + risks on the top 5' },
      },
      {
        emoji: '⚡',
        text: {
          fr: '1 clic pour pousser le CV depuis le résultat',
          en: '1-click push CV from the result',
        },
      },
    ],
    cta: {
      fr: 'Lancer un matching',
      en: 'Run a matching',
      href: '/matching',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 7 — CRM Pipeline
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 6 · PIPELINE COMMERCIAL', en: 'STEP 6 · SALES PIPELINE' },
    icon: TrendingUp,
    iconBg: 'from-emerald-400 to-cyan-400',
    accent: 'text-emerald-300',
    title: {
      fr: 'Suis chaque opportunité commerciale',
      en: 'Track every sales opportunity',
    },
    subtitle: {
      fr: 'Kanban drag & drop + présence équipe en direct',
      en: 'Drag & drop Kanban + live team presence',
    },
    body: {
      fr: 'Glisse tes opportunités à travers les colonnes (Nouveau → Contacté → CV envoyé → Entretien → Négo → Gagné). Les déplacements sont visibles par toute ton équipe en temps réel.',
      en: 'Drag opportunities through stages (New → Contacted → CV sent → Interview → Negotiation → Won). Moves are visible to your whole team in real time.',
    },
    bullets: [
      {
        emoji: '🎴',
        text: {
          fr: 'Drag & drop avec présence temps réel',
          en: 'Drag & drop with real-time presence',
        },
      },
      {
        emoji: '💰',
        text: {
          fr: 'Pipeline prévisionnel calculé automatiquement',
          en: 'Forecast pipeline auto-computed',
        },
      },
      {
        emoji: '🚨',
        text: {
          fr: "Alertes « relance en retard » sur le dashboard",
          en: '"Overdue follow-up" alerts on the dashboard',
        },
      },
    ],
    cta: {
      fr: 'Ouvrir le pipeline',
      en: 'Open the pipeline',
      href: '/crm',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 8 — Billing flow (Contracts + Timesheets + Invoices)
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 7 · FACTURATION', en: 'STEP 7 · BILLING' },
    icon: ClipboardCheck,
    iconBg: 'from-emerald-500 to-violet-glow',
    accent: 'text-emerald-300',
    title: {
      fr: 'Du contrat à la facture en 3 clics',
      en: 'From contract to invoice in 3 clicks',
    },
    subtitle: {
      fr: 'Contrats AT → CRA mensuels → factures auto',
      en: 'Service contracts → monthly timesheets → auto invoices',
    },
    body: {
      fr: "Quand une affaire est gagnée, génère le contrat avec ton branding. Le consultant dépose son CRA chaque mois — tu valides en 1 clic et la facture est générée automatiquement, prête à envoyer.",
      en: 'When a deal is won, generate the contract with your branding. Your consultant submits their timesheet each month — you validate in 1 click and the invoice is auto-generated, ready to send.',
    },
    bullets: [
      {
        emoji: '📝',
        text: {
          fr: 'Contrats personnalisés (assistance technique, sous-traitance)',
          en: 'Custom contracts (service, subcontracting)',
        },
      },
      {
        emoji: '📅',
        text: {
          fr: 'CRA avec calendrier visuel + jours fériés auto',
          en: 'Timesheets with visual calendar + auto holidays',
        },
      },
      {
        emoji: '🧾',
        text: {
          fr: 'Factures générées sur validation du CRA',
          en: 'Invoices generated on timesheet validation',
        },
      },
    ],
    cta: {
      fr: 'Voir les CRA',
      en: 'Go to Timesheets',
      href: '/timesheets',
    },
  },

  // ───────────────────────────────────────────────────────────────
  // STEP 9 — Dashboard + Done
  // ───────────────────────────────────────────────────────────────
  {
    category: { fr: 'ÉTAPE 8 · PILOTAGE QUOTIDIEN', en: 'STEP 8 · DAILY OVERVIEW' },
    icon: Sparkles,
    iconBg: 'from-violet-glow to-magenta',
    accent: 'text-violet-glow',
    title: { fr: 'Ton tableau de bord quotidien', en: 'Your daily command center' },
    subtitle: {
      fr: "Tout ce qui compte, en un coup d'œil",
      en: 'Everything that matters, at a glance',
    },
    body: {
      fr: "Démarre ta journée ici : CA encaissé, missions qui se terminent, consultants sur le banc, relances en retard. Et n'oublie pas — l'assistant comptable IA répond à tes questions en langage naturel.",
      en: "Start your day here: revenue, ending missions, bench, overdue follow-ups. And don't forget — the AI accounting assistant answers your questions in plain language.",
    },
    bullets: [
      {
        emoji: '📈',
        text: {
          fr: 'Graphique CA + missions sur 12 mois',
          en: 'Revenue + missions chart over 12 months',
        },
      },
      {
        emoji: '🚨',
        text: {
          fr: 'Alertes priorisées (Critique · Important · Modéré · Info)',
          en: 'Priority alerts (Critical · Important · Moderate · Info)',
        },
      },
      {
        emoji: '🤖',
        text: {
          fr: 'Assistant comptable IA en langage naturel',
          en: 'AI accounting assistant in plain language',
        },
      },
      {
        emoji: '💡',
        text: {
          fr: 'FR/EN et €/$ se changent dans le header',
          en: 'FR/EN and €/$ toggles in the header',
        },
      },
    ],
    cta: {
      fr: "C'est parti 🚀",
      en: "Let's go 🚀",
      href: '/dashboard',
    },
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
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const lang: 'fr' | 'en' = isEn ? 'en' : 'fr';

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

  // Auto-open la première fois si pas controlé.
  // On stamp "seen" dès l'ouverture (pas seulement à la fermeture) pour qu'un
  // refresh ou changement d'onglet ne fasse pas ré-apparaître la modale.
  useEffect(() => {
    if (isControlled) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const t = setTimeout(() => {
          setInternalOpen(true);
          try {
            window.localStorage.setItem(STORAGE_KEY, '1');
          } catch {
            // ignore
          }
        }, 600);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [isControlled]);

  // Reset step quand la modale ré-ouvre (si l'user a fini puis ré-ouvre le tuto).
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const labels = {
    skip: isEn ? 'Skip tour' : 'Passer le tour',
    back: isEn ? 'Back' : 'Précédent',
    next: isEn ? 'Next' : 'Suivant',
    finish: isEn ? 'Finish' : 'Terminer',
    stepOf: isEn ? `Step ${step + 1} of ${STEPS.length}` : `Étape ${step + 1} sur ${STEPS.length}`,
    welcomeSubtitle: isEn
      ? '9 steps to master Centrium — about 3 minutes.'
      : '9 étapes pour maîtriser Centrium — environ 3 minutes.',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Header bar : wordmark + step counter */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <CentriumWordmark size="sm" showEditor={false} />
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
            {labels.stepOf}
          </div>
        </div>

        {/* Body — la "carte" qui contient l'étape */}
        <div className="p-6 sm:p-8">
          {/* Eyebrow + title block */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={cn(
                'shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br shadow-lg flex items-center justify-center',
                current.iconBg,
              )}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('text-[10px] font-semibold tracking-[0.22em] mb-1', current.accent)}>
                {current.category[lang]}
              </div>
              {/* DialogTitle for a11y — visually-only via the h2 below. */}
              <DialogTitle className="sr-only">{current.title[lang]}</DialogTitle>
              <h2 className="font-display text-2xl leading-tight font-semibold text-foreground">
                {current.title[lang]}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">
                {current.subtitle[lang]}
              </p>
            </div>
          </div>

          {/* Body paragraph */}
          <p className="text-sm leading-relaxed text-foreground/85 mb-5">
            {current.body[lang]}
          </p>

          {/* Bullets card */}
          <ul className="rounded-xl border border-hairline bg-foreground/[0.03] p-4 space-y-2.5 mb-5">
            {current.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-snug">
                <span className="text-base leading-none mt-0.5">{b.emoji}</span>
                <span className="flex-1 text-foreground/90">{b.text[lang]}</span>
              </li>
            ))}
          </ul>

          {/* Primary CTA — navigate to the page */}
          <div className="flex justify-end">
            <Button
              asChild
              className="bg-gradient-to-r from-violet-glow to-magenta text-white shadow-[0_0_24px_-6px_rgba(225,29,116,0.55)] hover:brightness-110"
            >
              <a href={current.cta.href} onClick={() => setOpen(false)}>
                {current.cta[lang]}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Progress dots — cliquables pour sauter à une étape */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={isEn ? `Go to step ${i + 1}` : `Aller à l'étape ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step
                  ? 'w-8 bg-violet-glow'
                  : i < step
                    ? 'w-1.5 bg-violet-glow/50 hover:bg-violet-glow/70'
                    : 'w-1.5 bg-foreground/15 hover:bg-foreground/30',
              )}
            />
          ))}
        </div>

        {/* Footer : Skip | Back | Next/Finish */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-hairline bg-foreground/[0.02]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            {labels.skip}
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {labels.back}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => setOpen(false)}>
                {labels.finish}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                {labels.next}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bouton CTA « Tuto » — ré-ouvre le tutoriel à la demande. Style proéminent
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
  const t = useAppT();
  const [open, setOpen] = useState(false);
  const cls =
    variant === 'cta'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-glow to-magenta px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(225,29,116,0.55)] hover:brightness-110 hover:shadow-[0_0_28px_-4px_rgba(225,29,116,0.7)] transition'
      : 'inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-white/25 transition';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(cls, className)}>
        <HelpCircle className={variant === 'cta' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {variant === 'cta' ? t.header.show_tuto : t.header.tuto_short}
      </button>
      <NewUserTutorial open={open} onOpenChange={setOpen} />
    </>
  );
}
