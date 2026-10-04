'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, LayoutDashboard, MessagesSquare } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { FadeIn } from '@/components/site/Motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { PLAN_CATALOG, PUBLIC_PLAN_IDS } from '@/lib/billing/plans';

// Notification email de l'équipe (même canal que l'ancien formulaire devis).
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqenvzve';

type Form = {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_role: string;
  consultants_count: string;
  plan_id: string;
  message: string;
};
const EMPTY: Form = { company_name: '', contact_name: '', contact_email: '', contact_phone: '', contact_role: '', consultants_count: '', plan_id: '', message: '' };
const RANGES = ['1-10', '10-30', '30-100', '100+'];

async function notify(f: Form): Promise<boolean> {
  const body = new FormData();
  body.append('_subject', `[Centrium] Demande de démo — ${f.company_name}`);
  body.append('Société', f.company_name);
  body.append('Contact', f.contact_name);
  body.append('Email', f.contact_email);
  if (f.contact_phone) body.append('Téléphone', f.contact_phone);
  if (f.contact_role) body.append('Fonction', f.contact_role);
  if (f.consultants_count) body.append('Consultants', f.consultants_count);
  if (f.plan_id) body.append('Offre envisagée', PLAN_CATALOG[f.plan_id as keyof typeof PLAN_CATALOG]?.name ?? f.plan_id);
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

export function DemoContent() {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [f, setF] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan');
    if (plan && (PUBLIC_PLAN_IDS as readonly string[]).includes(plan)) set('plan_id', plan);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.company_name.trim() || !f.contact_name.trim() || !/^\S+@\S+\.\S+$/.test(f.contact_email)) {
      setError(fr ? 'Société, nom et email professionnel sont requis.' : 'Company, name and work email are required.');
      return;
    }
    setBusy(true);
    const [res] = await Promise.all([
      fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, plan_id: f.plan_id || null, source: 'demo' }),
      }).catch(() => null),
      notify(f),
    ]);
    setBusy(false);
    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {};
      setError((body as { message?: string }).message ?? (fr ? 'Envoi impossible. Réessayez dans un instant.' : 'Could not send. Please try again.'));
      return;
    }
    setDone(true);
  }

  const points = fr
    ? [
        { icon: LayoutDashboard, t: 'Une démonstration sur vos cas : pipeline, staffing, CRA, rentabilité.' },
        { icon: MessagesSquare, t: 'Vos questions sur la reprise de vos données et l’organisation des rôles.' },
        { icon: CalendarCheck, t: 'Pour Scale : un tarif établi selon vos volumes.' },
      ]
    : [
        { icon: LayoutDashboard, t: 'A demo on your use cases: pipeline, staffing, timesheets, profitability.' },
        { icon: MessagesSquare, t: 'Your questions on migrating your data and setting up roles.' },
        { icon: CalendarCheck, t: 'For Scale: pricing based on your volumes.' },
      ];

  return (
    <MarketingShell>
      <main className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_1.1fr]">
        <FadeIn>
          <div className="text-[13px] font-medium text-primary-deep">{fr ? 'Démo' : 'Demo'}</div>
          <h1 className="mt-2 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.05] tracking-tight">{fr ? 'Voyons Centrium sur votre ESN.' : 'Let’s see Centrium on your firm.'}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
            {fr ? 'Laissez-nous vos coordonnées : nous revenons vers vous pour convenir d’un créneau.' : 'Leave your details: we’ll get back to you to schedule a slot.'}
          </p>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.t} className="flex gap-3 text-[15px]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-primary-deep">
                  <p.icon className="h-4 w-4" />
                </span>
                <span className="pt-1.5">{p.t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[14px] text-muted-foreground">
            {fr ? 'Vous préférez essayer tout de suite ? ' : 'Prefer to try right away? '}
            <Link href="/essai" className="font-medium text-primary-deep hover:underline">
              {fr ? 'Démarrer l’essai de 7 jours' : 'Start the 7-day trial'}
            </Link>
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          {done ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h2 className="mt-4 text-[20px] font-semibold">{fr ? 'Demande envoyée' : 'Request sent'}</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {fr ? `Merci ${f.contact_name.split(' ')[0]}. Nous vous écrivons à ${f.contact_email}.` : `Thank you ${f.contact_name.split(' ')[0]}. We’ll write to ${f.contact_email}.`}
              </p>
              <Link href="/" className="mt-6 inline-block text-[15px] font-medium text-primary-deep hover:underline">
                {fr ? 'Retour à l’accueil' : 'Back to home'}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={fr ? 'Société' : 'Company'} htmlFor="d-company" required>
                  <Input id="d-company" value={f.company_name} onChange={(e) => set('company_name', e.target.value)} maxLength={200} autoComplete="organization" />
                </Field>
                <Field label={fr ? 'Nom' : 'Name'} htmlFor="d-name" required>
                  <Input id="d-name" value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} maxLength={120} autoComplete="name" />
                </Field>
                <Field label={fr ? 'Email professionnel' : 'Work email'} htmlFor="d-email" required>
                  <Input id="d-email" type="email" value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} maxLength={200} autoComplete="email" />
                </Field>
                <Field label={fr ? 'Téléphone' : 'Phone'} htmlFor="d-phone">
                  <Input id="d-phone" type="tel" value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} maxLength={50} autoComplete="tel" />
                </Field>
                <Field label={fr ? 'Fonction' : 'Role'} htmlFor="d-role">
                  <Input id="d-role" value={f.contact_role} onChange={(e) => set('contact_role', e.target.value)} maxLength={120} autoComplete="organization-title" />
                </Field>
                <Field label={fr ? 'Nombre de consultants' : 'Number of consultants'} htmlFor="d-count">
                  <Select id="d-count" value={f.consultants_count} onChange={(e) => set('consultants_count', e.target.value)}>
                    <option value="">—</option>
                    {RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={fr ? 'Offre envisagée' : 'Plan considered'} htmlFor="d-plan">
                <Select id="d-plan" value={f.plan_id} onChange={(e) => set('plan_id', e.target.value)}>
                  <option value="">{fr ? 'Je ne sais pas encore' : 'Not sure yet'}</option>
                  {PUBLIC_PLAN_IDS.map((id) => (
                    <option key={id} value={id}>
                      {PLAN_CATALOG[id].name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={fr ? 'Votre contexte (facultatif)' : 'Your context (optional)'} htmlFor="d-msg">
                <Textarea id="d-msg" rows={4} value={f.message} onChange={(e) => set('message', e.target.value)} maxLength={5000} showCounter={false} />
              </Field>
              {error && (
                <p role="alert" className="text-[14px] text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" loading={busy}>
                {fr ? 'Demander une démo' : 'Book a demo'}
              </Button>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {fr ? 'Vos informations servent uniquement à vous recontacter. ' : 'Your details are only used to get back to you. '}
                <Link href="/legal/privacy" className="underline">
                  {fr ? 'Politique de confidentialité' : 'Privacy policy'}
                </Link>
              </p>
            </form>
          )}
        </FadeIn>
      </main>
    </MarketingShell>
  );
}
