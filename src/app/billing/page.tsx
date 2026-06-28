'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  Layers,
  CalendarClock,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PageHeader,
  KPICard,
  StatusBadge,
  type StatusTone,
} from '@/components/app';
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
  const t = useAppT();
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
    const map: Record<string, { label: string; tone: StatusTone }> = {
      trialing: { label: t.pages.billing.status_active, tone: 'violet' },
      active: { label: t.pages.billing.status_active, tone: 'success' },
      past_due: { label: t.pages.invoices.kpi_overdue, tone: 'warning' },
      canceled: { label: t.actions.cancel, tone: 'neutral' },
      incomplete: { label: t.actions.cancel, tone: 'neutral' },
      unpaid: { label: t.pages.invoices.kpi_overdue, tone: 'danger' },
    };
    const m = map[sub.status] ?? { label: sub.status, tone: 'neutral' as StatusTone };
    return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
  })();

  // KPIs simples — fournit un repère "usage" sans nouvelle requête.
  const nextBillingDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('fr-FR')
    : '—';
  const planFeatureCount = plan?.features?.length ?? 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.billing.eyebrow}
        title={
          <>
            {t.pages.billing.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.billing.title_b}</span>
          </>
        }
        description={t.pages.billing.description}
        actions={
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-violet-glow" />
            {statusBadge}
          </div>
        }
      />

      {!loading && !sub?.is_exempt_from_billing && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <KPICard
            icon={Users}
            label="Plafond consultants"
            valueText={plan?.max_consultants != null ? String(plan.max_consultants) : '∞'}
            tone="magenta"
            hint={plan?.name ? `Plan ${plan.name}` : undefined}
          />
          <KPICard
            icon={Layers}
            label="Modules inclus"
            value={planFeatureCount}
            tone="violet"
          />
          <KPICard
            icon={CalendarClock}
            label="Prochaine facture"
            valueText={nextBillingDate}
            tone="cyan"
            hint={
              sub?.cancel_at_period_end
                ? 'Abonnement résilié'
                : sub?.status === 'trialing'
                  ? 'Fin d\'essai'
                  : undefined
            }
          />
        </div>
      )}

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
                  {t.pages.billing.founder_account_title}
                </div>
                <h2 className="font-display text-2xl font-bold">{t.pages.billing.no_billing}</h2>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xl">
              {t.pages.billing.founder_description}
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t.pages.billing.permanent_active_status}
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
                  href="mailto:contact@centrium-platform.com"
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
