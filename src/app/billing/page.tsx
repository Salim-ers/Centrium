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
import { useAppT } from '@/lib/i18n/LocaleProvider';
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

const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  trialing: { label: 'Essai gratuit', tone: 'violet' },
  active: { label: 'Actif', tone: 'success' },
  past_due: { label: 'Paiement en retard', tone: 'warning' },
  canceled: { label: 'Résilié', tone: 'neutral' },
  incomplete: { label: 'Checkout incomplet', tone: 'neutral' },
  incomplete_expired: { label: 'Checkout expiré', tone: 'neutral' },
  unpaid: { label: 'Impayé', tone: 'danger' },
  paused: { label: 'Suspendu', tone: 'warning' },
  no_subscription: { label: 'Aucun abonnement', tone: 'neutral' },
};

const ERROR_MESSAGES: Record<string, string> = {
  trial_expired:
    'Ta période d\'essai est terminée. Choisis un plan pour continuer à utiliser Centrium.',
  subscription_expired:
    'Ton abonnement est terminé. Souscris à nouveau pour retrouver ton accès.',
  payment_failed:
    'Un paiement a échoué. Mets à jour ton moyen de paiement pour retrouver ton accès.',
  checkout_incomplete:
    'Ton dernier checkout n\'a pas abouti. Reprends la souscription pour continuer.',
  paused: 'Ton abonnement est en pause. Reprends-le pour retrouver ton accès.',
  no_subscription: 'Aucun abonnement actif. Choisis un plan pour commencer.',
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
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // 'portal' | 'checkout:X' | 'cancel' | 'reactivate'
  const [cancelOpen, setCancelOpen] = useState(false);
  // Paiement intégré : dialog + instance embedded checkout à détruire au close.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const embeddedRef = useRef<EmbeddedCheckoutInstance | null>(null);

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
      toast.success('Abonnement activé ! Bienvenue.');
    } else if (searchParams.get('canceled') === '1') {
      toast.info('Checkout annulé.');
    }
    // Erreur remontée depuis le middleware (redirect vers /billing?error=…)
    const err = searchParams.get('error');
    if (err && ERROR_MESSAGES[err]) {
      toast.error(ERROR_MESSAGES[err], { duration: 8000 });
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
        toast.error(body.message ?? 'Portail indisponible');
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
        toast.error(body.message ?? `Souscription impossible (HTTP ${res.status})`);
        return;
      }

      if (wantEmbedded && body.client_secret) {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(publishableKey!);
        if (!stripe) {
          toast.error('Stripe indisponible — réessaie.');
          return;
        }
        // Ouvre le dialog d'abord pour que le conteneur existe au mount.
        setCheckoutOpen(true);
        const checkout = await stripe.createEmbeddedCheckoutPage({
          clientSecret: body.client_secret as string,
          onComplete: () => {
            closeCheckout();
            toast.success('Paiement confirmé — activation de ton abonnement…');
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

      if (body.url) {
        window.location.href = body.url;
      } else {
        toast.error('Réponse de paiement invalide — réessaie.');
      }
    } catch (e) {
      // Sans catch, toute exception (réseau, Stripe.js) rendait le clic
      // muet. L'utilisateur DOIT toujours voir pourquoi rien ne s'ouvre.
      toast.error(
        e instanceof Error ? `Paiement indisponible : ${e.message}` : 'Paiement indisponible — réessaie.',
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
        toast.error(body.message ?? 'Annulation impossible');
        return;
      }
      toast.success('Annulation prise en compte. Tu gardes ton accès jusqu\'à la fin de la période.');
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
        toast.error(body.message ?? 'Réactivation impossible');
        return;
      }
      toast.success('Abonnement réactivé. Le renouvellement automatique est repris.');
      await load();
    } finally {
      setBusy(null);
    }
  }

  const statusBadge = (() => {
    if (!sub) return null;
    const m = STATUS_LABEL[sub.status] ?? { label: sub.status, tone: 'neutral' as StatusTone };
    return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
  })();

  const accessLabel = (() => {
    if (!sub) return '—';
    if (sub.accessGrantedUntil === 'permanent') return 'permanent';
    if (sub.accessGrantedUntil)
      return new Date(sub.accessGrantedUntil).toLocaleDateString('fr-FR');
    return 'accès non actif';
  })();

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel={t.pages.settings.back_to_settings}
        eyebrow={t.pages.billing.eyebrow}
        title={
          <>
            {t.pages.billing.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {t.pages.billing.title_b}
            </span>
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

      {loading || orgLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !activeOrgId ? (
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
            </div>
            <CardTitle>Aucune organisation active</CardTitle>
            <CardDescription>
              Ton compte n&apos;est rattaché à aucune organisation. Si tu as reçu une
              invitation, reclique le lien de l&apos;email d&apos;invitation ; sinon
              demande à ton administrateur de t&apos;inviter, ou crée ton organisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/onboarding">Créer mon organisation</a>
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
              label="Plan actuel"
              valueText={sub?.planName ?? '—'}
              tone="magenta"
              hint={
                sub?.priceMonthly != null && sub.priceMonthly > 0
                  ? `${sub.priceMonthly} € HT/mois`
                  : undefined
              }
            />
            <KPICard
              icon={CalendarClock}
              label={
                sub?.cancelAtPeriodEnd
                  ? 'Accès garanti jusqu\'au'
                  : sub?.status === 'trialing'
                    ? 'Fin d\'essai'
                    : sub?.status === 'active'
                      ? 'Prochaine facture'
                      : 'Accès'
              }
              valueText={accessLabel}
              tone="cyan"
              hint={
                sub?.cancelAtPeriodEnd
                  ? 'Résiliation programmée'
                  : sub?.status === 'active'
                    ? 'Renouvellement auto'
                    : undefined
              }
            />
            <KPICard
              icon={Users}
              label="Statut"
              valueText={STATUS_LABEL[sub?.status ?? '']?.label ?? sub?.status ?? '—'}
              tone={
                sub?.needsAction === 'update_payment'
                  ? 'rose'
                  : sub?.needsAction === 'checkout' || sub?.needsAction === 'renew'
                    ? 'amber'
                    : 'violet'
              }
              hint={
                sub?.needsAction === 'update_payment'
                  ? 'Action requise : mettre à jour la CB'
                  : sub?.needsAction === 'renew'
                    ? 'Action requise : reprendre un abonnement'
                    : sub?.needsAction === 'checkout'
                      ? 'Action requise : souscrire'
                      : undefined
              }
            />
          </div>

          {/* Banner selon needsAction */}
          {sub?.needsAction === 'update_payment' && (
            <ActionBanner
              tone="danger"
              icon={AlertTriangle}
              title="Paiement échoué"
              body="Ton dernier renouvellement n'a pas pu être encaissé. Mets à jour ton moyen de paiement pour rétablir ton accès."
              cta={
                <Button onClick={openPortal} disabled={busy === 'portal'}>
                  {busy === 'portal' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Mettre à jour la CB
                </Button>
              }
            />
          )}

          {sub?.cancelAtPeriodEnd && (sub.status === 'active' || sub.status === 'trialing') && (
            <ActionBanner
              tone="warning"
              icon={XCircle}
              title="Abonnement en cours de résiliation"
              body={`Tu gardes ton accès complet jusqu'au ${accessLabel}. Après cette date, ton accès sera coupé sauf si tu réactives l'abonnement.`}
              cta={
                isAdmin && (
                  <Button onClick={reactivate} disabled={busy === 'reactivate'}>
                    {busy === 'reactivate' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Réactiver l'abonnement
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
                  ? 'Changer de plan'
                  : 'Choisir un plan'}
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
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gestion Stripe portal */}
          {isAdmin && sub?.hasStripeCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gestion avancée</CardTitle>
                <CardDescription className="text-xs">
                  Factures passées, CB, mise à jour d'adresse de facturation.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={openPortal} disabled={busy === 'portal'}>
                  {busy === 'portal' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Ouvrir le portail Stripe
                </Button>
                {sub.hasStripeSubscription &&
                  (sub.status === 'active' || sub.status === 'trialing') &&
                  !sub.cancelAtPeriodEnd && (
                    <Button
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setCancelOpen(true)}
                      disabled={busy !== null}
                    >
                      <XCircle className="h-4 w-4" />
                      {sub.status === 'trialing' ? "Arrêter l'essai / résilier" : "Annuler l'abonnement"}
                    </Button>
                  )}
              </CardContent>
            </Card>
          )}

          {!isAdmin && (
            <Card>
              <CardContent className="p-6 text-xs text-muted-foreground">
                Seul un admin de l'organisation peut souscrire, changer de plan ou résilier.
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog confirmation annulation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'annulation</DialogTitle>
            <DialogDescription>
              Ton abonnement sera résilié à la fin de la période en cours (
              {accessLabel}). Tu conserves l'accès complet jusque-là, puis il sera coupé.
              Tu peux réactiver à tout moment avant cette date.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Revenir en arrière
            </Button>
            <Button
              variant="destructive"
              onClick={cancel}
              disabled={busy === 'cancel'}
            >
              {busy === 'cancel' && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer l'annulation
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
            <DialogTitle>Paiement sécurisé</DialogTitle>
            <DialogDescription>
              Règle ton abonnement sans quitter Centrium — paiement traité par Stripe.
            </DialogDescription>
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
            <h2 className="font-display text-2xl font-bold">
              {t.pages.billing.no_billing}
            </h2>
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
  const styles =
    tone === 'danger'
      ? 'border-red-500/40 bg-red-500/10 text-red-100'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  const iconColor = tone === 'danger' ? 'text-red-300' : 'text-amber-300';
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
}: {
  plan: Plan;
  currentPlanId: string | null;
  onSubscribe: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  const isCurrent = plan.id === currentPlanId;
  // 'enterprise' = plan Illimité (display "Illimité"), désormais souscriptible
  // en self-service comme les autres. Le libellé "Sur devis" ne subsiste que
  // pour un éventuel plan legacy sans prix.
  const isUnlimited = plan.id === 'enterprise';
  const hasPrice = plan.price_monthly_eur != null && plan.price_monthly_eur > 0;
  return (
    <Card
      className={`relative ${isCurrent ? 'border-violet-500/60 bg-violet-500/[0.04]' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{plan.name}</CardTitle>
          {isCurrent && <StatusBadge tone="violet">Actuel</StatusBadge>}
        </div>
        <CardDescription>
          {hasPrice ? (
            <>
              <span className="text-lg font-semibold text-foreground">
                {plan.price_monthly_eur} €
              </span>
              <span className="text-xs"> HT / mois</span>
            </>
          ) : (
            <span className="text-lg font-semibold text-foreground">Sur devis</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm">
          {plan.max_users != null && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
              <span>{plan.max_users} utilisateur{plan.max_users > 1 ? 's' : ''} admin</span>
            </li>
          )}
          {plan.max_consultants != null && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
              <span>Jusqu'à {plan.max_consultants} consultants</span>
            </li>
          )}
          {isUnlimited && (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                <span>Utilisateurs & consultants illimités</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                <span>Opportunités, contacts & missions illimités</span>
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
            Plan actuel
          </Button>
        ) : !hasPrice ? (
          <Button variant="outline" className="w-full" asChild>
            <a href="mailto:contact@centrium-platform.com?subject=Devis Centrium">
              Contacter les ventes
            </a>
          </Button>
        ) : (
          <Button className="w-full" onClick={onSubscribe} disabled={disabled || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Souscrire
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
