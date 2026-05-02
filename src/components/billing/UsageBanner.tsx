'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Usage = {
  planId: string;
  planName: string;
  consultants: { used: number; max: number | null };
  members: { used: number; max: number | null };
};

type Props = {
  /** Quelle ressource est mise en avant sur cette page. */
  resource: 'consultants' | 'members';
  /** Si true, on cache totalement quand il reste de la marge (<60%). */
  hideUntilWarn?: boolean;
};

/**
 * Compteur de quota au-dessus d'une liste. Vert si <60%, jaune à 60-99%,
 * rouge à 100%. Le but : éviter la surprise du blocage à la création.
 *
 * Plans illimités (max=null) → bandeau caché.
 */
export function UsageBanner({ resource, hideUntilWarn = false }: Props) {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/usage', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data: Usage } | null) => {
        if (cancelled) return;
        if (body?.data) setUsage(body.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage) return null;

  const { used, max } = usage[resource];
  if (max === null) return null; // illimité (Enterprise)

  const ratio = max === 0 ? 1 : used / max;
  const pct = Math.min(100, Math.round(ratio * 100));
  const isFull = used >= max;
  const isWarn = ratio >= 0.6;

  if (hideUntilWarn && !isWarn) return null;

  const tone = isFull
    ? {
        border: 'border-red-500/40',
        bg: 'bg-red-500/[0.06]',
        text: 'text-red-300',
        bar: 'bg-red-500',
        Icon: ShieldAlert,
      }
    : isWarn
      ? {
          border: 'border-amber-500/40',
          bg: 'bg-amber-500/[0.06]',
          text: 'text-amber-300',
          bar: 'bg-amber-500',
          Icon: AlertTriangle,
        }
      : {
          border: 'border-violet-500/30',
          bg: 'bg-violet-500/[0.04]',
          text: 'text-violet-300',
          bar: 'bg-violet-500',
          Icon: TrendingUp,
        };

  const label = resource === 'consultants' ? 'consultants' : 'utilisateurs internes';
  const Icon = tone.Icon;

  return (
    <div
      className={`mb-4 rounded-lg border ${tone.border} ${tone.bg} px-4 py-3`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${tone.text}`} />
          <span className={`font-semibold ${tone.text}`}>
            {used} / {max} {label}
          </span>
          <span className="text-muted-foreground text-xs">
            sur le plan {usage.planName}
            {isFull
              ? ' — limite atteinte, upgrade requis'
              : isWarn
                ? ' — bientôt à la limite'
                : ''}
          </span>
        </div>
        {isWarn && (
          <Button size="sm" variant="outline" asChild>
            <Link href="/billing">{isFull ? 'Mettre à niveau' : 'Voir les plans'}</Link>
          </Button>
        )}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
