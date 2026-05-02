'use client';

import { useState } from 'react';
import { ArrowUpRight, ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type PlanLimitPayload = {
  resource: 'consultants' | 'members';
  limit: number;
  used: number;
  planId: string;
  planName: string;
  message?: string;
};

type Props = {
  payload: PlanLimitPayload | null;
  onOpenChange: (open: boolean) => void;
};

// Mapping plan_id → plan supérieur immédiat suggéré pour l'upgrade.
const NEXT_PLAN: Record<string, string> = {
  starter: 'growth',
  growth: 'scale',
  scale: 'enterprise',
};

const PLAN_LIMITS: Record<
  string,
  { name: string; consultants: number | null; members: number | null }
> = {
  starter: { name: 'Starter', consultants: 10, members: 3 },
  growth: { name: 'Growth', consultants: 30, members: 10 },
  scale: { name: 'Scale', consultants: 100, members: 30 },
  enterprise: { name: 'Enterprise', consultants: null, members: null },
};

const RESOURCE_LABEL: Record<PlanLimitPayload['resource'], string> = {
  consultants: 'consultants',
  members: 'utilisateurs internes',
};

export function PlanLimitDialog({ payload, onOpenChange }: Props) {
  const [upgrading, setUpgrading] = useState(false);

  if (!payload) return null;

  const nextPlanId = NEXT_PLAN[payload.planId] ?? 'enterprise';
  const nextPlan = PLAN_LIMITS[nextPlanId];
  const resourceLabel = RESOURCE_LABEL[payload.resource];
  const newCap =
    payload.resource === 'consultants' ? nextPlan?.consultants : nextPlan?.members;

  async function upgrade() {
    if (!nextPlanId) return;
    if (nextPlanId === 'enterprise') {
      window.location.href = 'mailto:sales@quadcore.app?subject=Upgrade Enterprise';
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: nextPlanId, cycle: 'monthly' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? 'Upgrade impossible');
        return;
      }
      if (body.url) {
        window.location.href = body.url;
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <Dialog open={!!payload} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto rounded-full bg-amber-500/15 p-3 mb-2">
            <ShieldAlert className="h-6 w-6 text-amber-300" />
          </div>
          <DialogTitle className="text-center">Limite du plan {payload.planName} atteinte</DialogTitle>
          <DialogDescription className="text-center pt-1">
            Tu utilises{' '}
            <strong className="text-foreground">
              {payload.used} / {payload.limit} {resourceLabel}
            </strong>{' '}
            disponibles sur ton plan actuel.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-violet-500/30 bg-violet-500/[0.06] p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
            <Sparkles className="h-4 w-4" />
            Passer à {nextPlan?.name ?? 'Enterprise'}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {newCap === null
              ? `Consultants et utilisateurs illimités, SSO, SLA contractuel.`
              : `Jusqu'à ${newCap} ${resourceLabel} (au lieu de ${payload.limit}). Changement immédiat, prorata appliqué automatiquement.`}
          </p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button onClick={upgrade} disabled={upgrading}>
            {upgrading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            Mettre à niveau
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
