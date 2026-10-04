'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, FileText, Home, Inbox, Sparkles, TrendingUp } from 'lucide-react';

import { MockPill } from './ProductFrame';
import { cn } from '@/lib/utils';

type Lang = 'fr' | 'en';
type Step = { title: { fr: string; en: string }; text: { fr: string; en: string } };

const STEPS: Step[] = [
  { title: { fr: 'Un besoin client arrive', en: 'A client need comes in' }, text: { fr: 'Par email, par téléphone ou directement depuis le portail client.', en: 'By email, by phone or straight from the client portal.' } },
  { title: { fr: 'Centrium crée l’opportunité', en: 'Centrium creates the opportunity' }, text: { fr: 'Client, contact, compétences, TJM cible, date de début : tout est structuré dans le pipeline.', en: 'Client, contact, skills, target rate, start date: all structured in the pipeline.' } },
  { title: { fr: 'Les meilleurs profils ressortent', en: 'The best profiles stand out' }, text: { fr: 'Le matching compare compétences, disponibilité, TJM et localisation, et explique chaque score.', en: 'Matching compares skills, availability, rate and location, and explains every score.' } },
  { title: { fr: 'Le commercial propose un profil', en: 'Sales proposes a profile' }, text: { fr: 'Dossier de compétences généré depuis la fiche, envoyé, suivi dans l’opportunité.', en: 'Skills dossier generated from the profile, sent and tracked on the opportunity.' } },
  { title: { fr: 'La mission démarre', en: 'The mission starts' }, text: { fr: 'Dates, TJM, responsable : la mission alimente le staffing et le prévisionnel.', en: 'Dates, rate, owner: the mission feeds staffing and forecasts.' } },
  { title: { fr: 'Le consultant saisit son CRA', en: 'The consultant fills in their timesheet' }, text: { fr: 'Depuis son téléphone : jours travaillés, télétravail, absences.', en: 'From their phone: days worked, remote work, absences.' } },
  { title: { fr: 'Le CRA est validé', en: 'The timesheet is approved' }, text: { fr: 'Par le manager, et par le client si vous le demandez.', en: 'By the manager, and by the client if you ask for it.' } },
  { title: { fr: 'CA et marge se mettent à jour', en: 'Revenue and margin update' }, text: { fr: 'Jours validés × TJM, moins le coût : le réalisé est calculé, sans ressaisie.', en: 'Approved days × rate, minus cost: actuals are computed, no re-keying.' } },
  { title: { fr: 'La préfacturation est prête', en: 'Pre-invoicing is ready' }, text: { fr: 'Les éléments facturables partent vers votre outil comptable.', en: 'Billable items go to your accounting tool.' } },
  { title: { fr: 'La direction voit la rentabilité', en: 'Leadership sees profitability' }, text: { fr: 'Par client, par consultant, par mois — à jour, sans tableur.', en: 'By client, consultant and month — up to date, no spreadsheet.' } },
];

function Visual({ step, lang }: { step: number; lang: Lang }) {
  const fr = lang === 'fr';
  const card = 'rounded-xl border border-border bg-card p-4 shadow-sm';
  switch (step) {
    case 0:
      return (
        <div className={card}>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Inbox className="h-4 w-4 text-primary" /> {fr ? 'Demande reçue · Banque Lumen' : 'Request received · Lumen Bank'}
          </div>
          <div className="text-[15px] font-semibold">{fr ? 'Lead data engineer' : 'Lead data engineer'}</div>
          <p className="mt-1 text-[13px] text-muted-foreground">{fr ? '6 mois · Lyon, hybride · démarrage février' : '6 months · Lyon, hybrid · starts February'}</p>
        </div>
      );
    case 1:
      return (
        <div className={card}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[15px] font-semibold">{fr ? 'Lead data — Banque Lumen' : 'Data lead — Lumen Bank'}</span>
            <MockPill tone="brand">{fr ? 'Qualifié' : 'Qualified'}</MockPill>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[12px]">
            {[
              [fr ? 'TJM cible' : 'Target rate', '720 €'],
              [fr ? 'Montant' : 'Amount', '95 k€'],
              [fr ? 'Probabilité' : 'Probability', '40 %'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-sand-100/70 p-2">
                <div className="text-muted-foreground">{k}</div>
                <div className="num font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
            {['Python', 'Spark', 'AWS', 'dbt'].map((s) => (
              <span key={s} className="rounded-md border border-border px-1.5 py-0.5">
                {s}
              </span>
            ))}
          </div>
        </div>
      );
    case 2:
      return (
        <div className={card}>
          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> {fr ? 'Consultants recommandés' : 'Recommended consultants'}
          </div>
          {[
            ['Camille M.', 92, fr ? '4/4 compétences · disponible · Lyon' : '4/4 skills · available · Lyon'],
            ['Hugo L.', 81, fr ? '3/4 compétences · libre le 15/02' : '3/4 skills · free on 15 Feb'],
            ['Inès D.', 68, fr ? '2/4 compétences · télétravail' : '2/4 skills · remote'],
          ].map(([n, s, why]) => (
            <div key={n as string} className="flex items-center gap-3 border-t border-border py-2 text-[12px] first:border-0">
              <span className="w-24 font-medium">{n}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${s}%` }} />
              </span>
              <span className="num w-9 text-right font-semibold">{s}</span>
              <span className="hidden w-44 truncate text-muted-foreground lg:block">{why}</span>
            </div>
          ))}
        </div>
      );
    case 3:
      return (
        <div className={card}>
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">Camille Martin</span>
            <MockPill tone="info">{fr ? 'Proposée au client' : 'Proposed to client'}</MockPill>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border p-2 text-[12px]">
            <FileText className="h-4 w-4 text-primary" />
            <span className="flex-1">{fr ? 'Dossier de compétences — version opportunité' : 'Skills dossier — opportunity version'}</span>
            <span className="text-muted-foreground">PDF</span>
          </div>
        </div>
      );
    case 4:
      return (
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold">{fr ? 'Mission Lead data' : 'Data lead mission'}</span>
            <MockPill tone="success">{fr ? 'En cours' : 'Active'}</MockPill>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">Camille Martin · {fr ? '2 févr. → 31 juil.' : '2 Feb → 31 Jul'} · 720 €/j</p>
        </div>
      );
    case 5:
      return (
        <div className={card}>
          <div className="mb-2 text-[13px] font-semibold">{fr ? 'CRA de mars' : 'March timesheet'}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 21 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex aspect-square items-center justify-center rounded-md border border-brand-200 bg-brand-50 text-[10px] text-primary-deep"
              >
                {i % 5 === 1 ? <Home className="h-3 w-3" /> : i + 1}
              </motion.div>
            ))}
          </div>
        </div>
      );
    case 6:
      return (
        <div className={card}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[14px] font-semibold">{fr ? 'CRA validé · 21 jours' : 'Timesheet approved · 21 days'}</div>
              <div className="text-[12px] text-muted-foreground">{fr ? 'Validé par le manager · approuvé par le client' : 'Approved by the manager and the client'}</div>
            </div>
          </div>
        </div>
      );
    case 7:
      return (
        <div className="grid grid-cols-2 gap-3">
          {[
            [fr ? 'CA réalisé' : 'Realised revenue', '+15 120 €'],
            [fr ? 'Marge' : 'Margin', '+4 725 €'],
          ].map(([k, v]) => (
            <div key={k} className={card}>
              <div className="text-[12px] text-muted-foreground">{k}</div>
              <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="num mt-1 text-[22px] font-semibold text-success">
                {v}
              </motion.div>
            </div>
          ))}
        </div>
      );
    case 8:
      return (
        <div className={card}>
          <div className="mb-2 text-[13px] font-semibold">{fr ? 'Préfacturation · mars' : 'Pre-invoicing · March'}</div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-2 text-[12px]">
            <span className="flex-1">Banque Lumen · 21 j × 720 €</span>
            <span className="num font-semibold">15 120 € HT</span>
            <MockPill tone="success">{fr ? 'Validée' : 'Approved'}</MockPill>
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground">{fr ? 'Export vers votre outil comptable' : 'Export to your accounting tool'}</div>
        </div>
      );
    default:
      return (
        <div className={card}>
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> {fr ? 'Rentabilité par client' : 'Profitability by client'}
          </div>
          {[
            ['Banque Lumen', 34],
            ['Énergie Nord', 29],
            ['Assurances Vela', 24],
          ].map(([n, m]) => (
            <div key={n as string} className="flex items-center gap-3 py-1.5 text-[12px]">
              <span className="w-32 truncate">{n}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.span className="block h-1.5 rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(m as number) * 2.5}%` }} transition={{ duration: 0.8 }} />
              </span>
              <span className="num w-10 text-right">{m} %</span>
            </div>
          ))}
        </div>
      );
  }
}

/**
 * Parcours besoin → mission → CRA → pilotage, raconté au scroll : le texte
 * défile, l'illustration (collante sur grand écran) suit l'étape active.
 * Sur mobile ou en mouvement réduit, chaque étape affiche son illustration.
 */
export function JourneyScroll({ lang }: { lang: Lang }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
      <ol className="relative">
        <span className="absolute bottom-0 left-[15px] top-0 w-px bg-border" aria-hidden />
        {STEPS.map((s, i) => (
          <li
            key={i}
            data-step={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="relative pb-10 pl-12 lg:flex lg:min-h-[42vh] lg:flex-col lg:justify-center lg:pb-0"
          >
            <span
              className={cn(
                'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors duration-300 lg:top-1/2 lg:-translate-y-1/2',
                active >= i ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            <h3 className={cn('text-[19px] font-semibold tracking-tight transition-colors duration-300', active === i ? 'text-foreground' : 'lg:text-muted-foreground')}>{s.title[lang]}</h3>
            <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted-foreground">{s.text[lang]}</p>
            <div className="mt-4 lg:hidden">
              <Visual step={i} lang={lang} />
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <div className="mb-3 flex gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= active ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-sand-100/60 p-6" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Visual step={active} lang={lang} />
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{lang === 'fr' ? 'Données d’exemple' : 'Sample data'}</p>
        </div>
      </div>
    </div>
  );
}
