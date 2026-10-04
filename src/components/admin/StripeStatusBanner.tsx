'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Loader2, CreditCard, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type PriceInfo = {
  set: boolean;
  found?: boolean;
  livemode?: boolean;
  amount?: number | null;
  currency?: string;
  error?: string;
};

type Status = {
  isFullyLive: boolean;
  secretKeyMode: string;
  publishableKeyMode: string;
  webhookSecretSet: boolean;
  prices: Record<string, PriceInfo>;
  hint: string;
};

const MODE_LABEL: Record<string, string> = {
  live: 'LIVE',
  test: 'TEST',
  missing: 'manquante',
  invalid: 'invalide',
};

/**
 * Bandeau de diagnostic Stripe (fondateur) : montre en un coup d'œil si les
 * vrais paiements sont actifs, ou ce qui bloque (clé test, redéploiement…).
 */
export function StripeStatusBanner() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const modeLabel = (m: string) =>
    m === 'missing'
      ? isEn
        ? 'missing'
        : 'manquante'
      : m === 'invalid'
        ? isEn
          ? 'invalid'
          : 'invalide'
        : (MODE_LABEL[m] ?? m);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/stripe-status', { cache: 'no-store' });
      const b = r.ok ? ((await r.json()) as { data: Status }) : null;
      setStatus(b?.data ?? null);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLivePrices() {
    setSetup(true);
    try {
      const res = await fetch('/api/admin/stripe-setup-prices', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          body.message ?? (isEn ? 'Could not create prices' : 'Création des prix impossible'),
        );
        return;
      }
      toast.success(body.data?.message ?? (isEn ? 'Prices created' : 'Prix créés'));
      await load();
    } finally {
      setSetup(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-hairline bg-card/40 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isEn ? 'Checking Stripe configuration…' : 'Vérification de la configuration Stripe…'}
      </div>
    );
  }
  if (!status) return null;

  const ok = status.isFullyLive;
  const priceBadge = (p: PriceInfo) => {
    if (!p.set) return isEn ? 'missing' : 'manquant';
    if (p.found === false) return isEn ? 'not found ⚠' : 'introuvable ⚠';
    if (p.livemode === true) return `LIVE · ${p.amount ?? '?'} ${p.currency?.toUpperCase() ?? ''}`;
    if (p.livemode === false) return `TEST · ${p.amount ?? '?'} ${p.currency?.toUpperCase() ?? ''}`;
    return 'ok';
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        ok
          ? 'border-success/30 bg-success/[0.06]'
          : 'border-warning/40 bg-warning/[0.08]'
      }`}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              {ok
                ? isEn
                  ? 'Stripe payments are LIVE'
                  : 'Paiements Stripe en LIVE'
                : isEn
                  ? 'Stripe: incomplete configuration'
                  : 'Stripe : configuration incomplète'}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{status.hint}</p>

          <div className="mt-2.5 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
            <Line label={isEn ? 'Secret key' : 'Clé secrète'} value={modeLabel(status.secretKeyMode)} good={status.secretKeyMode === 'live'} />
            <Line label={isEn ? 'Publishable key' : 'Clé publique'} value={modeLabel(status.publishableKeyMode)} good={status.publishableKeyMode === 'live'} />
            <Line label="Webhook" value={status.webhookSecretSet ? (isEn ? 'configured' : 'configuré') : (isEn ? 'missing' : 'manquant')} good={status.webhookSecretSet} />
            <Line label={isEn ? 'Starter price' : 'Prix Starter'} value={priceBadge(status.prices.starter ?? { set: false })} good={status.prices.starter?.livemode === true} />
            <Line label={isEn ? 'Medium price' : 'Prix Medium'} value={priceBadge(status.prices.medium ?? { set: false })} good={status.prices.medium?.livemode === true} />
            <Line label={isEn ? 'Unlimited price' : 'Prix Illimité'} value={priceBadge(status.prices.enterprise ?? { set: false })} good={status.prices.enterprise?.livemode === true} />
          </div>

          {/* Clé live mais prix pas encore live → on les crée en 1 clic. */}
          {status.secretKeyMode === 'live' && !ok && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={createLivePrices}
                disabled={setup}
                className="bg-qc-gradient hover:opacity-90 text-white"
              >
                {setup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isEn ? 'Create LIVE prices' : 'Créer les prix en LIVE'}
              </Button>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {isEn
                  ? 'Creates the 3 prices (Starter/Medium/Unlimited) in your live Stripe account and saves them — no Vercel variable to change.'
                  : 'Crée les 3 prix (Starter/Medium/Illimité) dans ton compte Stripe live et les enregistre — aucune variable Vercel à changer.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={good ? 'text-success font-medium' : 'text-warning font-medium'}>
        {value}
      </span>
    </div>
  );
}
