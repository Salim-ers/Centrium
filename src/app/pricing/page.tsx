'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';

type Plan = {
  id: string;
  name: string;
  price_monthly_eur: number;
  max_consultants: number | null;
  max_users: number | null;
  features: string[];
  sort_order: number;
};

export default function PricingPage() {
  const ctx = useOrganizationSafe();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_public', true)
        .order('sort_order', { ascending: true });
      setPlans((data ?? []) as Plan[]);
      setLoading(false);
    })();
  }, []);

  async function subscribe(planId: string) {
    if (!ctx?.user) {
      window.location.href = `/signup?plan=${planId}`;
      return;
    }
    if (ctx.role !== 'admin') {
      toast.error('Seul un admin de l\'organisation peut gérer le billing.');
      return;
    }
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@quadcore.app?subject=Enterprise plan';
      return;
    }
    setCheckingOut(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle: 'monthly' }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? 'Checkout impossible');
        return;
      }
      window.location.href = body.url;
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <div className="min-h-screen bg-midnight-300">
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <QuadCoreLogo size="sm" variant="dark" />
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Essai gratuit</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold">Tarifs</h1>
          <p className="text-muted-foreground mt-2">
            14 jours d&apos;essai gratuit sur tous les plans payants — aucune CB demandée
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isEnterprise = plan.id === 'enterprise';
              const isPopular = plan.id === 'growth';
              return (
                <Card
                  key={plan.id}
                  className={`relative ${isPopular ? 'border-violet-500/40 shadow-glow' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-qc-gradient px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Le plus populaire
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      {isEnterprise ? (
                        <span className="text-2xl font-bold text-foreground">Sur devis</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-foreground">
                            {plan.price_monthly_eur}€
                          </span>
                          <span className="text-muted-foreground text-sm"> / mois</span>
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                      {plan.max_consultants != null && (
                        <li className="flex items-start gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>Jusqu&apos;à {plan.max_consultants} consultants</span>
                        </li>
                      )}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => subscribe(plan.id)}
                      disabled={checkingOut === plan.id}
                    >
                      {checkingOut === plan.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {isEnterprise ? 'Nous contacter' : 'Souscrire'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
