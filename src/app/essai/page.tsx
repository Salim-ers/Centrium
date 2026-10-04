'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Loader2, Building2, Mail, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type PlanId = 'starter' | 'growth' | 'enterprise';

const PLAN_CARDS: {
  id: PlanId;
  name: string;
  price: string;
  popular?: boolean;
}[] = [
  { id: 'starter', name: 'Starter', price: '74,99 €' },
  { id: 'growth', name: 'Medium', price: '149,99 €', popular: true },
  { id: 'enterprise', name: 'Illimité', price: '299,99 €' },
];

const LABEL = 'text-xs font-semibold tracking-wider uppercase text-muted-foreground';

function EssaiInner() {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const canceled = searchParams?.get('canceled') === '1';

  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(searchParams?.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [planId, setPlanId] = useState<PlanId>('growth');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailTaken(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/demo/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          plan_id: planId,
          accept_terms: acceptTerms,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === 'email_taken') setEmailTaken(true);
        setError(body?.message ?? (isEn ? 'Sign-up failed. Please try again.' : "L'inscription a échoué. Réessaie."));
        return;
      }
      if (body?.data?.url) {
        window.location.href = body.data.url as string;
        return;
      }
      setError(isEn ? 'Unexpected response. Try again or write to us.' : 'Réponse inattendue. Réessaie ou écris-nous.');
    } catch {
      setError(
        isEn
          ? 'Network unavailable. Check your connection and try again.'
          : 'Réseau indisponible. Vérifie ta connexion et réessaie.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={isEn ? '7-day free trial' : 'Essai gratuit 7 jours'}
      subtitle={
        isEn
          ? 'Create your workspace in 2 minutes — €0 today, automatic charge only at the end of the trial.'
          : "Créez votre espace en 2 minutes — 0 € aujourd'hui, débit automatique seulement à la fin de l'essai."
      }
      footer={
        <>
          {isEn ? 'Already have an account?' : 'Déjà un compte ?'}{' '}
          <Link href="/login" className="text-primary hover:text-primary transition font-medium">
            {isEn ? 'Sign in' : 'Se connecter'}
          </Link>
        </>
      }
    >
      {canceled && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] text-warning">
          {isEn
            ? 'Payment not completed. Enter your details again to restart, or sign in.'
            : 'Paiement non finalisé. Renseigne à nouveau tes infos pour redémarrer, ou connecte-toi.'}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company" className={LABEL}>{isEn ? 'Company' : 'Société'}</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={isEn ? 'Your IT-services company name' : 'Nom de votre ESN'}
              required
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first" className={LABEL}>{isEn ? 'First name' : 'Prénom'}</Label>
            <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last" className={LABEL}>{isEn ? 'Last name' : 'Nom'}</Label>
            <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={LABEL}>{isEn ? 'Work email' : 'Email professionnel'}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isEn ? 'you@your-company.com' : 'vous@votre-esn.fr'}
              required
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={LABEL}>{isEn ? 'Password' : 'Mot de passe'}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEn ? '12 characters minimum' : '12 caractères minimum'}
              minLength={12}
              required
              className="pl-9"
            />
          </div>
        </div>

        {/* Choix du plan */}
        <div className="space-y-2">
          <Label className={LABEL}>{isEn ? 'Your plan' : 'Votre plan'}</Label>
          <div className="grid gap-2">
            {PLAN_CARDS.map((p) => {
              const active = planId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                    active
                      ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/40'
                      : 'border-border hover:border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{p.name}</span>
                    {p.popular && (
                      <span className="text-[9px] uppercase tracking-wider rounded-full bg-primary/20 text-primary px-1.5 py-0.5 font-semibold">
                        {isEn ? 'Popular' : 'Populaire'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {p.price}
                      <span className="text-muted-foreground text-[11px] font-normal">
                        {isEn ? ' excl. VAT/mo' : ' HT/mois'}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
            {error}
            {emailTaken && (
              <>
                {' '}
                <Link href="/login" className="underline font-medium">
                  {isEn ? 'Sign in' : 'Se connecter'}
                </Link>
              </>
            )}
          </div>
        )}

        {/* Clickwrap RGPD obligatoire : acceptation CGU + Confidentialité + DPA */}
        <label className="flex items-start gap-2.5 text-[12px] text-muted-foreground leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          {isEn ? (
            <span>
              I accept the{' '}
              <Link href="/legal/cgu" target="_blank" className="text-primary hover:text-primary underline">
                Terms
              </Link>
              , the{' '}
              <Link href="/legal/privacy" target="_blank" className="text-primary hover:text-primary underline">
                Privacy Policy
              </Link>{' '}
              and the{' '}
              <Link href="/legal/dpa" target="_blank" className="text-primary hover:text-primary underline">
                Data Processing Agreement (DPA)
              </Link>
              .
            </span>
          ) : (
            <span>
              J&apos;accepte les{' '}
              <Link href="/legal/cgu" target="_blank" className="text-primary hover:text-primary underline">
                CGU
              </Link>
              , la{' '}
              <Link href="/legal/privacy" target="_blank" className="text-primary hover:text-primary underline">
                Politique de confidentialité
              </Link>{' '}
              et l&apos;
              <Link href="/legal/dpa" target="_blank" className="text-primary hover:text-primary underline">
                Accord de traitement des données (DPA)
              </Link>
              .
            </span>
          )}
        </label>

        <Button
          type="submit"
          disabled={submitting || !acceptTerms}
          className="w-full h-11 bg-qc-gradient hover:opacity-90 text-white disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {isEn ? 'Start my free trial' : 'Démarrer mon essai gratuit'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          {isEn
            ? 'Secure Stripe payment · €0 charged for 7 days · cancel anytime before the end.'
            : 'Paiement sécurisé Stripe · 0 € débité pendant 7 jours · résiliable à tout moment avant la fin.'}
        </p>
      </form>
    </AuthShell>
  );
}

export default function EssaiPage() {
  return (
    <Suspense fallback={null}>
      <EssaiInner />
    </Suspense>
  );
}
