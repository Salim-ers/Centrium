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
import { nextPlan as suggestNextPlan } from '@/lib/billing/plans';
import { useLocale } from '@/lib/i18n/LocaleProvider';

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

// Montée en gamme : Starter → Team → Growth → Scale (sur devis). Les
// offres historiques sont orientées vers l'offre V2 supérieure.
const SCALE_ID = 'v2_scale';

// Label FR de chaque ressource pour le corps du dialog.
const RESOURCE_LABEL: Record<PlanLimitResource, string> = {
  consultants: 'consultants',
  members: 'utilisateurs internes',
  opportunities: 'opportunités CRM ouvertes',
  contacts: 'contacts',
  missions: 'missions actives',
};

// Label EN de chaque ressource (branche anglaise du dialog).
const RESOURCE_LABEL_EN: Record<PlanLimitResource, string> = {
  consultants: 'consultants',
  members: 'internal users',
  opportunities: 'open CRM opportunities',
  contacts: 'contacts',
  missions: 'active missions',
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
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [upgrading, setUpgrading] = useState(false);
  const [nextPlan, setNextPlan] = useState<NextPlanInfo | null>(null);

  // Récupère la limite du plan cible depuis la table `plans` (RLS
  // plans_public_select autorise anyone → pas besoin de Route Handler).
  useEffect(() => {
    if (!payload) return;
    const nextPlanId = suggestNextPlan(payload.planId);
    if (!nextPlanId || nextPlanId === SCALE_ID) {
      // Au-delà de Growth : offre Scale, sur devis.
      setNextPlan({ id: SCALE_ID, name: 'Scale', limit: null });
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

  const resourceLabel = (isEn ? RESOURCE_LABEL_EN : RESOURCE_LABEL)[payload.resource];
  const isTopOfLadder = nextPlan?.id === SCALE_ID;

  async function upgrade() {
    if (!nextPlan) return;
    // Déjà sur Illimité (top du ladder) : rien à vendre en self-service,
    // on bascule sur le contact commercial. Sinon TOUS les plans — y
    // compris Illimité — passent par le Checkout Stripe standard.
    if (isTopOfLadder) {
      window.location.href = '/devis?plan=v2_scale';
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: nextPlan.id, interval: 'month' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Upgrade failed' : 'Upgrade impossible'));
        return;
      }
      if (body.updated) {
        // Abonnement existant modifié en place (prorata).
        toast.success(isEn ? 'Plan upgraded' : 'Plan mis à niveau');
        onOpenChange(false);
        window.location.reload();
        return;
      }
      if (body.url) {
        window.location.href = body.url;
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'Erreur réseau');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <Dialog open={!!payload} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto rounded-full bg-warning/15 p-3 mb-2">
            <ShieldAlert className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">
            {isEn
              ? `Plan ${payload.planName} limit reached`
              : `Limite du plan ${payload.planName} atteinte`}
          </DialogTitle>
          <DialogDescription className="text-center pt-1">
            {isEn ? 'You are using' : 'Tu utilises'}{' '}
            <strong className="text-foreground">
              {payload.used} / {payload.limit} {resourceLabel}
            </strong>{' '}
            {isEn ? 'available on your current plan.' : 'disponibles sur ton plan actuel.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            {isTopOfLadder
              ? isEn ? 'Contact sales' : 'Contacter les ventes'
              : isEn ? `Upgrade to ${nextPlan?.name ?? 'Medium'}` : `Passer à ${nextPlan?.name ?? 'Medium'}`}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isTopOfLadder
              ? isEn
                ? 'Your account is already on Unlimited — the plan with no limits. Reach out to us if you hit a blocker.'
                : 'Ton compte est déjà sur Illimité — le plan sans aucune limite. Écris-nous si tu constates un blocage.'
              : nextPlan?.limit === null
                ? isEn
                  ? `Unlimited ${resourceLabel}, SSO, API + Webhooks — €299.99 excl. VAT/month.`
                  : `${resourceLabel[0].toUpperCase()}${resourceLabel.slice(1)} illimités, SSO, API + Webhooks — 299,99 € HT/mois.`
                : nextPlan
                  ? isEn
                    ? `Up to ${nextPlan.limit} ${resourceLabel} (instead of ${payload.limit}). Immediate change, proration applied automatically.`
                    : `Jusqu'à ${nextPlan.limit} ${resourceLabel} (au lieu de ${payload.limit}). Changement immédiat, prorata appliqué automatiquement.`
                  : isEn ? 'Loading details…' : 'Chargement des détails…'}
          </p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {isEn ? 'Later' : 'Plus tard'}
          </Button>
          <Button onClick={upgrade} disabled={upgrading || !nextPlan}>
            {upgrading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            {isTopOfLadder
              ? isEn ? 'Contact sales' : 'Contacter les ventes'
              : isEn ? 'Upgrade' : 'Mettre à niveau'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
