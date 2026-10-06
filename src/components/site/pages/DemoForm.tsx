'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { PLAN_CATALOG, PUBLIC_PLAN_IDS, type PublicPlanId } from '@/lib/billing/plans';
import { cn } from '@/lib/utils';

import { EASE, useReducedMotion } from '../kit';

// Notification email de l'équipe (même canal que le formulaire précédent).
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqenvzve';

const SIZES = ['1-10', '10-30', '30-100', '100+'];
const NEEDS = ['CRM et pipeline', 'Staffing et matching', 'CRA et préfacturation', 'Pilotage et marge', 'Portails client et consultant', 'Tout centraliser'];

type Form = { contact_name: string; company_name: string; contact_email: string; consultants_count: string; need: string; message: string };
const EMPTY: Form = { contact_name: '', company_name: '', contact_email: '', consultants_count: '', need: '', message: '' };

const STEPS = [
  { title: 'Vous', fields: ['contact_name', 'contact_email'] as const },
  { title: 'Votre ESN', fields: ['company_name', 'consultants_count'] as const },
  { title: 'Votre besoin', fields: ['need'] as const },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stepError(step: number, f: Form): string | null {
  if (step === 0) {
    if (!f.contact_name.trim()) return 'Indiquez votre nom.';
    if (!EMAIL.test(f.contact_email.trim())) return 'Indiquez un email professionnel valide.';
  }
  if (step === 1) {
    if (!f.company_name.trim()) return 'Indiquez le nom de votre entreprise.';
    if (!f.consultants_count) return 'Choisissez une taille d’équipe.';
  }
  if (step === 2 && !f.need) return 'Choisissez votre besoin principal.';
  return null;
}

async function notify(f: Form, plan: PublicPlanId | null): Promise<boolean> {
  const body = new FormData();
  body.append('_subject', `[Centrium] Demande de démo — ${f.company_name}`);
  body.append('Société', f.company_name);
  body.append('Contact', f.contact_name);
  body.append('Email', f.contact_email);
  body.append('Consultants', f.consultants_count);
  body.append('Besoin principal', f.need);
  if (plan) body.append('Offre envisagée', PLAN_CATALOG[plan].name);
  if (f.message) body.append('Message', f.message);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, { method: 'POST', body, headers: { Accept: 'application/json' }, signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

const input =
  'w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 text-[clamp(1.3rem,2.4vw,1.9rem)] font-semibold tracking-[-0.02em] text-ink placeholder:text-ink/25 focus:border-terra focus:outline-none focus:ring-0';
const label = 'block text-[11.5px] font-semibold uppercase tracking-[0.2em] text-taupe';

/** Formulaire de démo en trois temps. */
export function DemoForm() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [plan, setPlan] = useState<PublicPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('plan');
    if (p && (PUBLIC_PLAN_IDS as readonly string[]).includes(p)) setPlan(p as PublicPlanId);
  }, []);

  // Focus sur le premier champ quand l'étape change (jamais au premier
  // affichage : la page ne doit pas défiler d'elle-même jusqu'au formulaire).
  // Comparer l'étape précédente résiste au double appel des effets en dev.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    panel.current?.querySelector<HTMLElement>('input, button[role="radio"], textarea')?.focus();
  }, [step]);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    const err = stepError(step, f);
    setError(err);
    if (err) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    const [res] = await Promise.all([
      fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: f.company_name.trim(),
          contact_name: f.contact_name.trim(),
          contact_email: f.contact_email.trim(),
          consultants_count: f.consultants_count,
          wanted_help: [f.need],
          message: f.message.trim() || null,
          plan_id: plan,
          source: 'demo',
        }),
      }).catch(() => null),
      notify(f, plan),
    ]);
    setBusy(false);
    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {};
      setError((body as { message?: string }).message ?? 'Envoi impossible. Réessayez dans un instant.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="py-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terra text-white">
          <Check className="h-6 w-6" />
        </span>
        <h2 className="mt-8 text-[clamp(2rem,4vw,3.4rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.045em]">Demande envoyée.</h2>
        <p className="mt-4 max-w-md text-[17px] leading-[1.55] text-ink-soft/80">
          Merci {f.contact_name.trim().split(' ')[0]}. Nous vous écrivons à {f.contact_email.trim()} pour convenir d’un créneau.
        </p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-terra-deep hover:underline">
          Retour à l’accueil <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={next} noValidate aria-describedby={error ? 'demo-error' : undefined}>
      <ol className="flex gap-2" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('block h-[3px] rounded-full transition-colors duration-500', i <= step ? 'bg-terra' : 'bg-ink/10')} />
            <span className={cn('mt-3 block text-[11.5px] font-semibold uppercase tracking-[0.18em]', i === step ? 'text-ink' : 'text-ink/40')}>{s.title}</span>
          </li>
        ))}
      </ol>

      <div ref={panel} className="relative mt-12 min-h-[300px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.fieldset
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="space-y-10"
          >
            <legend className="sr-only">{STEPS[step]!.title}</legend>
            {step === 0 && (
              <>
                <div>
                  <label htmlFor="d-name" className={label}>
                    Nom
                  </label>
                  <input id="d-name" className={input} value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} maxLength={120} autoComplete="name" placeholder="Prénom Nom" required />
                </div>
                <div>
                  <label htmlFor="d-email" className={label}>
                    Email professionnel
                  </label>
                  <input id="d-email" type="email" className={input} value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} maxLength={200} autoComplete="email" placeholder="vous@entreprise.fr" required />
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div>
                  <label htmlFor="d-company" className={label}>
                    Entreprise
                  </label>
                  <input id="d-company" className={input} value={f.company_name} onChange={(e) => set('company_name', e.target.value)} maxLength={200} autoComplete="organization" placeholder="Votre ESN" required />
                </div>
                <div role="radiogroup" aria-labelledby="d-size-label">
                  <span id="d-size-label" className={label}>
                    Nombre de consultants
                  </span>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={f.consultants_count === s}
                        onClick={() => set('consultants_count', s)}
                        className={cn('h-12 rounded-full border px-5 text-[15px] font-semibold tabular-nums transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra', f.consultants_count === s ? 'border-ink bg-ink text-ivory' : 'border-ink/20 hover:border-ink')}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div role="radiogroup" aria-labelledby="d-need-label">
                  <span id="d-need-label" className={label}>
                    Besoin principal
                  </span>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {NEEDS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={f.need === n}
                        onClick={() => set('need', n)}
                        className={cn('min-h-12 rounded-full border px-5 py-2.5 text-left text-[15px] font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra', f.need === n ? 'border-terra bg-terra text-white' : 'border-ink/20 hover:border-ink')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="d-msg" className={label}>
                    Votre contexte <span className="normal-case tracking-normal">(facultatif)</span>
                  </label>
                  <textarea id="d-msg" rows={3} className={cn(input, 'resize-none text-[18px] font-medium')} value={f.message} onChange={(e) => set('message', e.target.value)} maxLength={5000} placeholder="Outils actuels, échéance, questions…" />
                </div>
              </>
            )}
          </motion.fieldset>
        </AnimatePresence>
      </div>

      {error && (
        <p id="demo-error" role="alert" className="mt-6 text-[14.5px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button type="button" onClick={() => {
              setError(null);
              setStep(step - 1);
            }} className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink/60 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={busy}
          data-cursor="Ouvrir"
          className="group inline-flex h-14 items-center gap-3 rounded-full bg-terra pl-7 pr-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-300 hover:bg-terra-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {step < STEPS.length - 1 ? 'Continuer' : busy ? 'Envoi…' : 'Demander une démo'}
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </div>
      <p className="mt-8 text-[12.5px] leading-relaxed text-taupe">
        Vos informations servent uniquement à vous recontacter.{' '}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          Politique de confidentialité
        </Link>
      </p>
    </form>
  );
}
