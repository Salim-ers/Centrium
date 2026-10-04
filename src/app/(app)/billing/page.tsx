'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
  CalendarClock,
  XCircle,
  RotateCcw,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader, KPICard, StatusBadge, type StatusTone } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';

// =========================================================================
// /billing — Self-service de l'abonnement Centrium
// -------------------------------------------------------------------------
// Souscription, upgrade/downgrade, annulation (in-app), réactivation, accès
// portail Stripe pour les moyens de paiement / factures. Tout en local, un
// seul écran.
//
// i18n : TOUT le contenu passe par t.pages.billing.* (FR/EN via le toggle du
// header). Les PRIX passent par useCurrency().format() : montants stockés en
// EUR en DB, convertis à l'affichage (€/$) selon la préférence utilisateur.
// Seuls restent en langue-DB : le nom du plan (plans.name) et les puces de
// features (plans.features) — contenu éditable en base, pas des libellés UI.
//
// SOURCES DE DONNÉES
//   - GET /api/billing/subscription : état enrichi (status, dates,
//     needsAction, accessGrantedUntil, etc.). Source de vérité UI.
//   - Table `plans` (RLS public) : catalogue des plans publics pour la
//     grille de souscription / upgrade.
//
// ACTIONS
//   - POST /api/billing/checkout   : ouvre Stripe Checkout pour souscrire
//                                    à un plan (ou changer de plan)
//   - POST /api/billing/cancel     : cancel_at_period_end=true
//   - POST /api/billing/reactivate : cancel_at_period_end=false
//   - POST /api/billing/portal     : ouvre le Stripe Customer Portal
//                                    (CB, factures, historique)
// =========================================================================

type Subscription = {
  planId: string | null;
  planName: string | null;
  priceMonthly: number | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  trialExpired: boolean;
  isExempt: boolean;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  accessGrantedUntil: string | null; // ISO ou "permanent" ou null
  needsAction: 'none' | 'checkout' | 'update_payment' | 'renew';
};

type Plan = {
  id: string;
  name: string;
  price_monthly_eur: number;
  price_yearly_eur: number | null;
  max_users: number | null;
  max_consultants: number | null;
  features: string[];
  sort_order: number;
};

// Les TONES (couleurs) ne se traduisent pas ; les libellés viennent de l'i18n
// (billing.status_*). Voir statusLabel() dans le composant.
const STATUS_TONE: Record<string, StatusTone> = {
  trialing: 'violet',
  active: 'success',
  past_due: 'warning',
  canceled: 'neutral',
  incomplete: 'neutral',
  incomplete_expired: 'neutral',
  unpaid: 'danger',
  paused: 'warning',
  no_subscription: 'neutral',
};

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}

/** Instance Embedded Checkout Stripe montée (pour destroy au close). */
type EmbeddedCheckoutInstance = { mount: (sel: string | HTMLElement) => void; destroy: () => void };

function BillingPageInner() {
  const { activeOrgId, role, loading: orgLoading } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const { format } = useCurrency();
  const tb = t.pages.billing;
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR';
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // 'portal' | 'checkout:X' | 'cancel' | 'reactivate'
  const [cancelOpen, setCancelOpen] = useState(false);
  // Paiement intégré : dialog + instance embedded checkout à détruire au close.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const embeddedRef = useRef<EmbeddedCheckoutInstance | null>(null);

  // Libellé de statut traduit (fallback : la clé brute).
  const statusLabel = (s: string): string =>
    (
      {
        trialing: tb.status_trialing,
        active: tb.status_active,
        past_due: tb.status_past_due,
        canceled: tb.status_canceled,
        incomplete: tb.status_incomplete,
        incomplete_expired: tb.status_incomplete_expired,
        unpaid: tb.status_unpaid,
        paused: tb.status_paused,
        no_subscription: tb.status_no_subscription,
      } as Record<string, string>
    )[s] ?? s;

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    try {
      embeddedRef.current?.destroy();
    } catch {
      /* déjà détruit */
    }
    embeddedRef.current = null;
  }, []);

  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    // Pas d'organisation active (compte orphelin, onboarding inachevé…) :
    // on coupe le spinner et on laisse le rendu afficher l'état dédié —
    // avant, `return` sec laissait loading=true → spinner INFINI.
    if (!activeOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [subRes, plansRes] = await Promise.all([
      fetch('/api/billing/subscription', { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : { data: null },
      ),
      createClient()
        .from('plans')
        .select(
          'id, name, price_monthly_eur, price_yearly_eur, max_users, max_consultants, features, sort_order',
        )
        .eq('is_public', true)
        .order('sort_order'),
    ]);
    setSub(subRes.data);
    setPlans((plansRes.data as Plan[]) ?? []);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => {
    load();
    // Toasts après retour de Stripe Checkout
    if (searchParams.get('success') === '1') {
      toast.success(tb.toast_sub_activated);
    } else if (searchParams.get('canceled') === '1') {
      toast.info(tb.toast_checkout_canceled);
    }
    // Erreur remontée depuis le middleware (redirect vers /billing?error=…)
    const err = searchParams.get('error');
    const errMap: Record<string, string> = {
      trial_expired: tb.err_trial_expired,
      subscription_expired: tb.err_subscription_expired,
      payment_failed: tb.err_payment_failed,
      checkout_incomplete: tb.err_checkout_incomplete,
      paused: tb.err_paused,
      no_subscription: tb.err_no_subscription,
    };
    if (err && errMap[err]) {
      toast.error(errMap[err], { duration: 8000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // ?plan=starter|growth|enterprise — arrivée depuis l'email de bienvenue
  // ("Payer mon abonnement") : on lance directement le Stripe Checkout du
  // plan réservé, sans re-choisir dans la grille. Admin only ; ignoré si
  // l'org est exempte ou déjà active sur ce plan.
  const [autoCheckoutDone, setAutoCheckoutDone] = useState(false);
  useEffect(() => {
    if (autoCheckoutDone || loading || !sub) return;
    const planParam = searchParams.get('plan');
    if (!planParam || !['starter', 'growth', 'enterprise'].includes(planParam)) return;
    setAutoCheckoutDone(true);
    // Nettoie l'URL pour ne pas relancer le checkout au retour/refresh.
    window.history.replaceState(null, '', '/billing');
    if (role !== 'admin' || sub.isExempt) return;
    if (sub.status === 'active' && sub.planId === planParam) return;
    void subscribe(planParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sub, autoCheckoutDone]);

  async function openPortal() {
    setBusy('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? tb.toast_portal_unavailable);
        return;
      }
      window.location.href = body.url;
    } finally {
      setBusy(null);
    }
  }

  async function subscribe(planId: string) {
    setBusy(`checkout:${planId}`);
    try {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      // Paiement INTÉGRÉ (Stripe Embedded Checkout dans un dialog) quand la
      // clé publique est dispo ; sinon fallback redirection hosted.
      const wantEmbedded = !!publishableKey;
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          cycle: 'monthly',
          ...(wantEmbedded ? { ui: 'embedded' } : {}),
        }),
      });
      // .catch : un 500 HTML (crash serveur) faisait lever res.json() et
      // le clic semblait mort. On veut TOUJOURS un feedback.
      const body = await res.json().catch(() => ({}) as Record<string, string>);
      if (!res.ok) {
        toast.error(body.message ?? tb.toast_sub_failed.replace('{status}', String(res.status)));
        return;
      }

      if (wantEmbedded && body.client_secret) {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(publishableKey!);
        if (!stripe) {
          toast.error(tb.toast_stripe_unavailable);
          return;
        }
        // Ouvre le dialog d'abord pour que le conteneur existe au mount.
        setCheckoutOpen(true);
        const checkout = await stripe.createEmbeddedCheckoutPage({
          clientSecret: body.client_secret as string,
          onComplete: () => {
            closeCheckout();
            toast.success(tb.toast_payment_confirmed);
            // Le webhook Stripe met la DB à jour ; petit délai puis refresh.
            setTimeout(() => {
              void load();
            }, 2000);
          },
        });
        embeddedRef.current = checkout as unknown as EmbeddedCheckoutInstance;
        // Le conteneur vit dans le dialog (portal Radix) — il peut mettre
        // quelques frames à exister. Retry court avant de monter l'iframe.
        const tryMount = (attempt = 0) => {
          const el = document.getElementById('embedded-checkout-container');
          if (el) {
            checkout.mount('#embedded-checkout-container');
            return;
          }
          if (attempt < 20) setTimeout(() => tryMount(attempt + 1), 50);
        };
        tryMount();
        return;
      }

      // Changement de plan appliqué en place (prorata) — pas de checkout.
      if (body.updated) {
        toast.success(tb.toast_payment_confirmed);
        await load();
        return;
      }

      if (body.url) {
        window.location.href = body.url;
      } else {
        toast.error(tb.toast_payment_invalid);
      }
    } catch (e) {
      // Sans catch, toute exception (réseau, Stripe.js) rendait le clic
      // muet. L'utilisateur DOIT toujours voir pourquoi rien ne s'ouvre.
      toast.error(
        e instanceof Error ? `${tb.toast_payment_unavailable} (${e.message})` : tb.toast_payment_unavailable,
      );
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy('cancel');
    setCancelOpen(false);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? tb.toast_cancel_failed);
        return;
      }
      toast.success(tb.toast_cancel_done);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function reactivate() {
    setBusy('reactivate');
    try {
      const res = await fetch('/api/billing/reactivate', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? tb.toast_reactivate_failed);
        return;
      }
      toast.success(tb.toast_reactivate_done);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const statusBadge = (() => {
    if (!sub) return null;
    const tone = STATUS_TONE[sub.status] ?? ('neutral' as StatusTone);
    return <StatusBadge tone={tone}>{statusLabel(sub.status)}</StatusBadge>;
  })();

  const accessLabel = (() => {
    if (!sub) return '—';
    if (sub.accessGrantedUntil === 'permanent') return tb.access_permanent;
    if (sub.accessGrantedUntil)
      return new Date(sub.accessGrantedUntil).toLocaleDateString(dateLocale);
    return tb.access_inactive;
  })();

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel={t.pages.settings.back_to_settings}
        eyebrow={tb.eyebrow}
        title={
          <>
            {tb.title_a}{' '}
            <span className="text-primary font-display ">{tb.title_b}</span>
          </>
        }
        description={tb.description}
        actions={
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            {statusBadge}
          </div>
        }
      />

      {loading || orgLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !activeOrgId ? (
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-warning/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
            <CardTitle>{tb.no_org_title}</CardTitle>
            <CardDescription>{tb.no_org_desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/onboarding">{tb.create_org}</a>
            </Button>
          </CardContent>
        </Card>
      ) : sub?.isExempt ? (
        <ExemptCard t={t} />
      ) : (
        <>
          {/* KPIs récap */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KPICard
              icon={Sparkles}
              label={tb.kpi_current_plan}
              valueText={sub?.planName ?? '—'}
              tone="magenta"
              hint={
                sub?.priceMonthly != null && sub.priceMonthly > 0
                  ? `${format(sub.priceMonthly, { maximumFractionDigits: 2 })} ${tb.per_month_ht}`
                  : undefined
              }
            />
            <KPICard
              icon={CalendarClock}
              label={
                sub?.cancelAtPeriodEnd
                  ? tb.kpi_access_until
                  : sub?.status === 'trialing'
                    ? tb.kpi_trial_end
                    : sub?.status === 'active'
                      ? tb.kpi_next_invoice
                      : tb.kpi_access
              }
              valueText={accessLabel}
              tone="cyan"
              hint={
                sub?.cancelAtPeriodEnd
                  ? tb.cancel_scheduled
                  : sub?.status === 'active'
                    ? tb.auto_renew
                    : undefined
              }
            />
            <KPICard
              icon={Users}
              label={tb.kpi_status}
              valueText={sub ? statusLabel(sub.status) : '—'}
              tone={
                sub?.needsAction === 'update_payment'
                  ? 'rose'
                  : sub?.needsAction === 'checkout' || sub?.needsAction === 'renew'
                    ? 'amber'
                    : 'violet'
              }
              hint={
                sub?.needsAction === 'update_payment'
                  ? tb.hint_update_cb
                  : sub?.needsAction === 'renew'
                    ? tb.hint_resume
                    : sub?.needsAction === 'checkout'
                      ? tb.hint_subscribe
                      : undefined
              }
            />
          </div>

          {/* Banner selon needsAction */}
          {sub?.needsAction === 'update_payment' && (
            <ActionBanner
              tone="danger"
              icon={AlertTriangle}
              title={tb.banner_payment_failed_title}
              body={tb.banner_payment_failed_body}
              cta={
                <Button onClick={openPortal} disabled={busy === 'portal'}>
                  {busy === 'portal' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {tb.cta_update_cb}
                </Button>
              }
            />
          )}

          {sub?.cancelAtPeriodEnd && (sub.status === 'active' || sub.status === 'trialing') && (
            <ActionBanner
              tone="warning"
              icon={XCircle}
              title={tb.banner_canceling_title}
              body={tb.banner_canceling_body.replace('{date}', accessLabel)}
              cta={
                isAdmin && (
                  <Button onClick={reactivate} disabled={busy === 'reactivate'}>
                    {busy === 'reactivate' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    {tb.cta_reactivate}
                  </Button>
                )
              }
            />
          )}

          {/* Grille de plans publics */}
          {isAdmin && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">
                {sub?.hasStripeSubscription && sub.status === 'active'
                  ? tb.plans_change_title
                  : tb.plans_choose_title}
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    currentPlanId={sub?.planId ?? null}
                    onSubscribe={() => subscribe(p.id)}
                    busy={busy === `checkout:${p.id}`}
                    disabled={busy !== null}
                    t={t}
                    format={format}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Résiliation — TOUJOURS accessible à l'admin quand l'abo est actif
              ou en essai, indépendamment d'un client Stripe. Les essais
              provisionnés (super console) n'ont pas de client Stripe : avant,
              ce bouton vivait dans la carte "Gestion avancée" conditionnée à
              hasStripeCustomer → elle n'apparaissait jamais et on ne pouvait
              PAS résilier. La route /api/billing/cancel gère aussi le cas sans
              subscription Stripe (résiliation en base). */}
          {isAdmin &&
            sub &&
            !sub.isExempt &&
            !sub.cancelAtPeriodEnd &&
            (sub.status === 'active' || sub.status === 'trialing') && (
              <Card className="mb-8 border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-base">
                    {sub.status === 'trialing'
                      ? tb.cancel_card_title_trial
                      : tb.cancel_card_title_paid}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sub.status === 'trialing'
                      ? tb.cancel_card_desc_trial
                      : tb.cancel_card_desc_paid}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                    onClick={() => setCancelOpen(true)}
                    disabled={busy !== null}
                  >
                    <XCircle className="h-4 w-4" />
                    {sub.status === 'trialing' ? tb.cancel_btn_trial : tb.cancel_btn_paid}
                  </Button>
                </CardContent>
              </Card>
            )}

          {/* Gestion Stripe portal */}
          {isAdmin && sub?.hasStripeCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tb.advanced_title}</CardTitle>
                <CardDescription className="text-xs">{tb.advanced_desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={openPortal} disabled={busy === 'portal'}>
                  {busy === 'portal' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {tb.open_portal}
                </Button>
              </CardContent>
            </Card>
          )}

          {!isAdmin && (
            <Card>
              <CardContent className="p-6 text-xs text-muted-foreground">
                {tb.non_admin_note}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog confirmation annulation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sub?.status === 'trialing'
                ? tb.dialog_cancel_title_trial
                : tb.dialog_cancel_title_paid}
            </DialogTitle>
            <DialogDescription>
              {(sub?.status === 'trialing'
                ? tb.dialog_cancel_desc_trial
                : tb.dialog_cancel_desc_paid
              ).replace('{date}', accessLabel)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              {tb.dialog_go_back}
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={busy === 'cancel'}>
              {busy === 'cancel' && <Loader2 className="h-4 w-4 animate-spin" />}
              {sub?.status === 'trialing' ? tb.dialog_confirm_trial : tb.dialog_confirm_paid}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paiement Stripe INTÉGRÉ — le checkout s'affiche dans l'app,
          aucune redirection. Fermer le dialog détruit l'iframe proprement
          (le paiement peut être repris en recliquant Souscrire). */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={(v) => {
          if (!v) closeCheckout();
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle>{tb.checkout_title}</DialogTitle>
            <DialogDescription>{tb.checkout_desc}</DialogDescription>
          </DialogHeader>
          <div
            id="embedded-checkout-container"
            className="min-h-[520px] max-h-[75vh] overflow-y-auto bg-white rounded-b-lg"
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// =========================================================================
// Sub-components
// =========================================================================

function ExemptCard({ t }: { t: ReturnType<typeof useAppT> }) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 ">
      <CardContent className="p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-qc-gradient flex items-center justify-center ">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-widest text-primary">
              {t.pages.billing.founder_account_title}
            </div>
            <h2 className="font-display text-2xl font-bold">{t.pages.billing.no_billing}</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          {t.pages.billing.founder_description}
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-success bg-success/10 border border-success/30 rounded-full px-3 py-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t.pages.billing.permanent_active_status}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionBanner({
  tone,
  icon: Icon,
  title,
  body,
  cta,
}: {
  tone: 'danger' | 'warning';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  // Texte SOMBRE en thème clair (text-*-900) / clair en thème sombre
  // (dark:text-*-100). Avant : text-*-100 fixe -> jaune/rouge pâle illisible
  // sur le fond clair de la page (thème light).
  const styles =
    tone === 'danger'
      ? 'border-destructive/50 bg-destructive/10 text-destructive '
      : 'border-warning/50 bg-warning/15 text-warning ';
  const iconColor =
    tone === 'danger'
      ? 'text-destructive '
      : 'text-warning ';
  return (
    <div className={`mb-8 rounded-xl border ${styles} p-5`}>
      <div className="flex items-start gap-4 flex-wrap">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-[240px] space-y-2">
          <div className="font-semibold">{title}</div>
          <p className="text-sm opacity-90 leading-relaxed">{body}</p>
        </div>
        {cta && <div className="shrink-0">{cta}</div>}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  currentPlanId,
  onSubscribe,
  busy,
  disabled,
  t,
  format,
}: {
  plan: Plan;
  currentPlanId: string | null;
  onSubscribe: () => void;
  busy: boolean;
  disabled: boolean;
  t: ReturnType<typeof useAppT>;
  format: (amountInEur: number | null, opts?: { maximumFractionDigits?: number }) => string;
}) {
  const tb = t.pages.billing;
  const isCurrent = plan.id === currentPlanId;
  // 'enterprise' = plan Illimité (display "Illimité"), désormais souscriptible
  // en self-service comme les autres. Le libellé "Sur devis" ne subsiste que
  // pour un éventuel plan legacy sans prix.
  const isUnlimited = plan.id === 'enterprise';
  const hasPrice = plan.price_monthly_eur != null && plan.price_monthly_eur > 0;
  return (
    <Card
      className={`relative ${isCurrent ? 'border-primary/60 bg-primary/[0.04]' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{plan.name}</CardTitle>
          {isCurrent && <StatusBadge tone="violet">{tb.plan_current_badge}</StatusBadge>}
        </div>
        <CardDescription>
          {hasPrice ? (
            <>
              <span className="text-lg font-semibold text-foreground">
                {format(plan.price_monthly_eur, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs"> {tb.plan_per_month}</span>
            </>
          ) : (
            <span className="text-lg font-semibold text-foreground">{tb.plan_on_quote}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm">
          {plan.max_users != null && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
              <span>{tb.plan_users_admin.replace('{n}', String(plan.max_users))}</span>
            </li>
          )}
          {plan.max_consultants != null && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
              <span>{tb.plan_up_to_consultants.replace('{n}', String(plan.max_consultants))}</span>
            </li>
          )}
          {isUnlimited && (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                <span>{tb.plan_unlimited_users}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                <span>{tb.plan_unlimited_crm}</span>
              </li>
            </>
          )}
          {(plan.features ?? []).slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            {tb.plan_current_btn}
          </Button>
        ) : !hasPrice ? (
          <Button variant="outline" className="w-full" asChild>
            <a href="mailto:contact@centrium-platform.com?subject=Devis Centrium">
              {tb.plan_contact_sales}
            </a>
          </Button>
        ) : (
          <Button className="w-full" onClick={onSubscribe} disabled={disabled || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {tb.plan_subscribe}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
