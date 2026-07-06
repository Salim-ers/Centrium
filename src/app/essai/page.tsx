'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Loader2, Building2, Mail, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';

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

const LABEL = 'text-xs font-semibold tracking-wider uppercase text-white/60';

function EssaiInner() {
  const searchParams = useSearchParams();
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
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === 'email_taken') setEmailTaken(true);
        setError(body?.message ?? "L'inscription a échoué. Réessaie.");
        return;
      }
      if (body?.data?.url) {
        window.location.href = body.data.url as string;
        return;
      }
      setError('Réponse inattendue. Réessaie ou écris-nous.');
    } catch {
      setError('Réseau indisponible. Vérifie ta connexion et réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Essai gratuit 7 jours"
      subtitle="Créez votre espace en 2 minutes — 0 € aujourd'hui, débit automatique seulement à la fin de l'essai."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/login" className="text-magenta hover:text-magenta-neon transition font-medium">
            Se connecter
          </Link>
        </>
      }
    >
      {canceled && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-200">
          Paiement non finalisé. Renseigne à nouveau tes infos pour redémarrer, ou connecte-toi.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company" className={LABEL}>Société</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom de votre ESN"
              required
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first" className={LABEL}>Prénom</Label>
            <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last" className={LABEL}>Nom</Label>
            <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={LABEL}>Email professionnel</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@votre-esn.fr"
              required
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={LABEL}>Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              minLength={8}
              required
              className="pl-9"
            />
          </div>
        </div>

        {/* Choix du plan */}
        <div className="space-y-2">
          <Label className={LABEL}>Votre plan</Label>
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
                      ? 'border-magenta-neon/60 bg-magenta/10 ring-1 ring-magenta-neon/40'
                      : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{p.name}</span>
                    {p.popular && (
                      <span className="text-[9px] uppercase tracking-wider rounded-full bg-magenta/20 text-magenta-neon px-1.5 py-0.5 font-semibold">
                        Populaire
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {p.price}
                      <span className="text-white/40 text-[11px] font-normal"> HT/mois</span>
                    </span>
                    {active && <Check className="h-4 w-4 text-magenta-neon" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-200">
            {error}
            {emailTaken && (
              <>
                {' '}
                <Link href="/login" className="underline font-medium">
                  Se connecter
                </Link>
              </>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95 text-white"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Démarrer mon essai gratuit
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-[11px] text-white/40 text-center">
          Paiement sécurisé Stripe · 0 € débité pendant 7 jours · résiliable à tout moment avant la fin.
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
