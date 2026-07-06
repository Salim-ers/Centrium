'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, CreditCard } from 'lucide-react';

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
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stripe-status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { data: Status } | null) => setStatus(b?.data ?? null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-hairline bg-card/40 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Vérification de la configuration Stripe…
      </div>
    );
  }
  if (!status) return null;

  const ok = status.isFullyLive;
  const priceBadge = (p: PriceInfo) => {
    if (!p.set) return 'manquant';
    if (p.found === false) return 'introuvable ⚠';
    if (p.livemode === true) return `LIVE · ${p.amount ?? '?'} ${p.currency?.toUpperCase() ?? ''}`;
    if (p.livemode === false) return `TEST · ${p.amount ?? '?'} ${p.currency?.toUpperCase() ?? ''}`;
    return 'ok';
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        ok
          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
          : 'border-amber-500/40 bg-amber-500/[0.08]'
      }`}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              {ok ? 'Paiements Stripe en LIVE' : 'Stripe : configuration incomplète'}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{status.hint}</p>

          <div className="mt-2.5 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
            <Line label="Clé secrète" value={MODE_LABEL[status.secretKeyMode] ?? status.secretKeyMode} good={status.secretKeyMode === 'live'} />
            <Line label="Clé publique" value={MODE_LABEL[status.publishableKeyMode] ?? status.publishableKeyMode} good={status.publishableKeyMode === 'live'} />
            <Line label="Webhook" value={status.webhookSecretSet ? 'configuré' : 'manquant'} good={status.webhookSecretSet} />
            <Line label="Prix Starter" value={priceBadge(status.prices.starter ?? { set: false })} good={status.prices.starter?.livemode === true} />
            <Line label="Prix Medium" value={priceBadge(status.prices.medium ?? { set: false })} good={status.prices.medium?.livemode === true} />
            <Line label="Prix Illimité" value={priceBadge(status.prices.enterprise ?? { set: false })} good={status.prices.enterprise?.livemode === true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={good ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
        {value}
      </span>
    </div>
  );
}
