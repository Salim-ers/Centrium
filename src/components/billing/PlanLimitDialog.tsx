'use client';

import { useEffect, useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';

export type PlanLimitResource =
  | 'consultants'
  | 'members'
  | 'opportunities'
  | 'contacts'
  | 'missions';

export type PlanLimitPayload = {
  resource: PlanLimitResource;
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

// Ladder statique aligné sur le catalogue à 3 tiers publics
// (starter/growth/enterprise). Le plan `scale` legacy est masqué
// (is_public=false, migration 067) et jamais suggéré.
const NEXT_PLAN: Record<string, string> = {
  starter: 'growth',
  growth: 'enterprise',
};

// Label FR de chaque ressource pour le corps du dialog.
const RESOURCE_LABEL: Record<PlanLimitResource, string> = {
  consultants: 'consultants',
  members: 'utilisateurs internes',
  opportunities: 'opportunités CRM ouvertes',
  contacts: 'contacts',
  missions: 'missions actives',
};

// Colonne de plans.* qui matérialise la limite pour chaque ressource.
const RESOURCE_TO_LIMIT_COLUMN: Record<PlanLimitResource, string> = {
  consultants: 'max_consultants',
  members: 'max_users',
  opportunities: 'max_open_opportunities',
  contacts: 'max_contacts',
  missions: 'max_active_missions',
};

type NextPlanInfo = {
  id: string;
  name: string;
  limit: number | null;
};

export function PlanLimitDialog({ payload, onOpenChange }: Props) {
  const [upgrading, setUpgrading] = useState(false);
  const [nextPlan, setNextPlan] = useState<NextPlanInfo | null>(null);

  // Récupère la limite du plan cible depuis la table `plans` (RLS
  // plans_public_select autorise anyone → pas besoin de Route Handler).
  useEffect(() => {
    if (!payload) return;
    const nextPlanId = NEXT_PLAN[payload.planId];
    if (!nextPlanId) {
      // Déjà au top du ladder (enterprise) → contact commercial
      setNextPlan({ id: 'enterprise', name: 'Enterprise', limit: null });
      return;
    }
    const col = RESOURCE_TO_LIMIT_COLUMN[payload.resource];
    const supabase = createClient();
    supabase
      .from('plans')
      .select(`id, name, ${col}`)
      .eq('id', nextPlanId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setNextPlan({ id: nextPlanId, name: nextPlanId, limit: null });
          return;
        }
        setNextPlan({
          id: data.id as string,
          name: data.name as string,
          limit: (data as Record<string, unknown>)[col] as number | null,
        });
      });
  }, [payload]);

  if (!payload) return null;

  const resourceLabel = RESOURCE_LABEL[payload.resource];
  const isTopOfLadder = !NEXT_PLAN[payload.planId];

  async function upgrade() {
    if (!nextPlan) return;
    if (nextPlan.id === 'enterprise') {
      window.location.href =
        'mailto:contact@centrium-platform.com?subject=Upgrade Enterprise';
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: nextPlan.id, cycle: 'monthly' }),
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
          <DialogTitle className="text-center">
            Limite du plan {payload.planName} atteinte
          </DialogTitle>
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
            {isTopOfLadder ? 'Contacter les ventes' : `Passer à ${nextPlan?.name ?? 'Medium'}`}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isTopOfLadder
              ? 'Ton compte est déjà sur Enterprise. Écris-nous pour ajuster les quotas contractuels.'
              : nextPlan?.limit === null
                ? `${resourceLabel[0].toUpperCase()}${resourceLabel.slice(1)} illimités, SSO, SLA contractuel, API + Webhooks.`
                : nextPlan
                  ? `Jusqu'à ${nextPlan.limit} ${resourceLabel} (au lieu de ${payload.limit}). Changement immédiat, prorata appliqué automatiquement.`
                  : 'Chargement des détails…'}
          </p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button onClick={upgrade} disabled={upgrading || !nextPlan}>
            {upgrading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            {isTopOfLadder ? 'Contacter les ventes' : 'Mettre à niveau'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
