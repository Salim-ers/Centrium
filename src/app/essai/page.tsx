'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Loader2, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';

type PlanId = 'starter' | 'growth' | 'enterprise';

const PLAN_CARDS: {
  id: PlanId;
  name: string;
  price: string;
  tagline: string;
  popular?: boolean;
}[] = [
  { id: 'starter', name: 'Starter', price: '74,99 €', tagline: '1 à 5 utilisateurs · 30 consultants' },
  { id: 'growth', name: 'Medium', price: '149,99 €', tagline: '15 utilisateurs · 150 consultants', popular: true },
  { id: 'enterprise', name: 'Illimité', price: '299,99 €', tagline: 'Utilisateurs & consultants illimités' },
];

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
      // Redirection vers le paiement Stripe (essai 7 j, carte sur fichier).
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
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/">
            <CentriumWordmark size="md" />
          </Link>
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition">
            Déjà un compte ? Se connecter
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          {/* Colonne gauche : promesse + réassurance */}
          <div>
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta-neon mb-3">
              Essai gratuit 7 jours
            </div>
            <h1 className="font-display font-light tracking-[-0.03em] leading-[1.05] text-[clamp(2rem,4.5vw,3.25rem)]">
              Lancez votre ESN sur{' '}
              <span className="qc-italic-accent font-editorial italic">Centrium.</span>
            </h1>
            <p className="mt-4 text-white/70 text-[15px] leading-relaxed max-w-lg">
              Créez votre espace en 2 minutes. <strong className="text-white">7 jours d&apos;essai
              gratuit</strong>, sans engagement. Votre carte n&apos;est débitée qu&apos;à la fin de
              l&apos;essai — et vous pouvez arrêter à tout moment avant.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                { icon: ShieldCheck, text: '0 € aujourd’hui — 7 jours pour tout tester' },
                { icon: CreditCard, text: 'Paiement sécurisé par Stripe, carte requise pour démarrer l’essai' },
                { icon: Sparkles, text: 'Consultants, CV IA, CRM, CRA, facturation — tout inclus' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/75">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-magenta/15 text-magenta-neon">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {f.text}
                  </li>
                );
              })}
            </ul>

            <p className="mt-8 text-xs text-white/40 max-w-md">
              Après validation de votre carte, votre essai démarre immédiatement. À J+7, l&apos;abonnement
              choisi est prélevé automatiquement, sauf résiliation avant la fin de l&apos;essai depuis
              votre espace.
            </p>
          </div>

          {/* Colonne droite : formulaire */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-7">
            {canceled && (
              <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-200">
                Paiement non finalisé. Ton compte est prêt — connecte-toi pour réessayer, ou renseigne
                ta carte ci-dessous à nouveau.
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label className="text-white/80">Société *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nom de votre ESN"
                  required
                  className="mt-1 bg-white/5 border-white/15 text-white placeholder:text-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/80">Prénom *</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="mt-1 bg-white/5 border-white/15 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Nom *</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="mt-1 bg-white/5 border-white/15 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/80">Email professionnel *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@votre-esn.fr"
                  required
                  className="mt-1 bg-white/5 border-white/15 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/80">Mot de passe *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  minLength={8}
                  required
                  className="mt-1 bg-white/5 border-white/15 text-white placeholder:text-white/30"
                />
              </div>

              {/* Choix du plan */}
              <div>
                <Label className="text-white/80">Votre plan</Label>
                <div className="mt-1.5 grid gap-2">
                  {PLAN_CARDS.map((p) => {
                    const active = planId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlanId(p.id)}
                        className={`relative flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                          active
                            ? 'border-magenta-neon/60 bg-magenta/10 ring-1 ring-magenta-neon/40'
                            : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{p.name}</span>
                            {p.popular && (
                              <span className="text-[9px] uppercase tracking-wider rounded-full bg-magenta/20 text-magenta-neon px-1.5 py-0.5 font-semibold">
                                Populaire
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 truncate">{p.tagline}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold">
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
                Étape suivante : paiement sécurisé Stripe. 0 € débité pendant 7 jours.
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EssaiPage() {
  return (
    <Suspense fallback={null}>
      <EssaiInner />
    </Suspense>
  );
}
