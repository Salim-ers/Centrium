'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CreditCard, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';

type Subscription = {
  plan_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  stripe_customer_id: string | null;
  is_exempt_from_billing: boolean | null;
};

type Plan = {
  id: string;
  name: string;
  price_monthly_eur: number;
  max_consultants: number | null;
  features: string[];
};

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const { activeOrgId, role } = useOrganization();
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_end, cancel_at_period_end, trial_end, stripe_customer_id, is_exempt_from_billing')
      .eq('organization_id', activeOrgId)
      .maybeSingle();
    setSub(data as Subscription | null);

    if (data?.plan_id) {
      const { data: planData } = await supabase
        .from('plans')
        .select('id, name, price_monthly_eur, max_consultants, features')
        .eq('id', data.plan_id)
        .single();
      setPlan(planData as Plan | null);
    }
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => {
    load();
    // Toasts après retour de Stripe Checkout
    if (searchParams.get('success') === '1') {
      toast.success('🎉 Abonnement activé !');
    } else if (searchParams.get('canceled') === '1') {
      toast.info('Checkout annulé.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function openPortal() {
    setOpening(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? 'Portal indisponible');
        return;
      }
      window.location.href = body.url;
    } finally {
      setOpening(false);
    }
  }

  const statusBadge = (() => {
    if (!sub) return null;
    const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      trialing: { label: 'Essai', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30', icon: CheckCircle2 },
      active: { label: 'Actif', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
      past_due: { label: 'Impayé', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: AlertTriangle },
      canceled: { label: 'Annulé', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: AlertTriangle },
      incomplete: { label: 'Incomplet', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: AlertTriangle },
      unpaid: { label: 'Impayé', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertTriangle },
    };
    const m = map[sub.status] ?? { label: sub.status, color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: CheckCircle2 };
    const Icon = m.icon;
    return (
      <Badge variant="outline" className={`${m.color} gap-1`}>
        <Icon className="h-3 w-3" /> {m.label}
      </Badge>
    );
  })();

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-violet-glow" />
          Abonnement & facturation
        </h1>
        <p className="text-muted-foreground mt-1">
          Plan de l&apos;organisation, limites, et gestion du paiement.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sub?.is_exempt_from_billing ? (
        <Card className="border-magenta/30 bg-gradient-to-br from-magenta/10 to-violet-brand/5 shadow-glow-magenta">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-qc-gradient flex items-center justify-center shadow-glow-magenta">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-widest text-magenta">
                  COMPTE FONDATEUR
                </div>
                <h2 className="font-display text-2xl font-bold">Aucune facturation</h2>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xl">
              Cette organisation est exemptée de facturation. Accès illimité à toutes les
              fonctionnalités de la plateforme, sans limite de consultants ni d&apos;utilisateurs,
              sans abonnement Stripe.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Statut actif · permanent
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Plan actuel</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {plan?.name ?? 'Free'}
                    {plan?.price_monthly_eur ? ` — ${plan.price_monthly_eur} € / mois` : ''}
                  </CardDescription>
                </div>
                {statusBadge}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sub?.status === 'trialing' && sub.trial_end && (
                <div className="text-xs text-violet-300">
                  Fin d&apos;essai : {new Date(sub.trial_end).toLocaleDateString('fr-FR')}
                </div>
              )}
              {sub?.current_period_end && sub.status !== 'trialing' && (
                <div className="text-xs text-muted-foreground">
                  {sub.cancel_at_period_end ? 'Résilié — accès jusqu\'au ' : 'Prochaine facture : '}
                  {new Date(sub.current_period_end).toLocaleDateString('fr-FR')}
                </div>
              )}

              {plan && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Ce que tu as
                  </p>
                  <ul className="space-y-1 text-sm">
                    {plan.features.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                    {plan.max_consultants != null && (
                      <li>• Jusqu&apos;à {plan.max_consultants} consultants</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link href="/pricing">Voir les plans</Link>
                </Button>
                {isAdmin && sub?.stripe_customer_id && (
                  <Button onClick={openPortal} disabled={opening}>
                    {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Gérer l&apos;abonnement
                  </Button>
                )}
              </div>

              {!isAdmin && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-hairline">
                  Seul un admin de l&apos;organisation peut changer le plan.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">À propos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Paiement sécurisé</strong> par Stripe.
                Centrium ne stocke jamais tes infos de CB.
              </p>
              <p>
                Pour une facture détaillée, télécharger les factures passées, changer de CB ou
                résilier : passe par le portail Stripe.
              </p>
              <p>
                Besoin d&apos;un plan custom / Enterprise ?{' '}
                <a
                  href="mailto:sales@quadcore.app"
                  className="text-violet-300 hover:text-violet-200"
                >
                  Contacte-nous
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
