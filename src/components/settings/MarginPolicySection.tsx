'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { AppCard, AppCardBody, SectionHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showBrandToast } from '@/components/ui/BrandToast';
import { useMarginPolicy } from '@/hooks/useMarginPolicy';
import { marginPolicySchema } from '@/lib/finance/margin-policy';

/**
 * Objectifs de marge de l'organisation : l'objectif (sous lequel une marge
 * est signalée) et le seuil de bonne marge, repris par le simulateur des
 * opportunités, le cockpit des missions et le pilotage financier.
 */
export function MarginPolicySection({ canEdit, isEn }: { canEdit: boolean; isEn: boolean }) {
  const { policy, ready, reload } = useMarginPolicy();
  const [target, setTarget] = useState('');
  const [good, setGood] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setTarget(String(policy.target));
    setGood(String(policy.good));
  }, [ready, policy.target, policy.good]);

  async function save() {
    const parsed = marginPolicySchema.safeParse({ target: Number(target.replace(',', '.')), good: Number(good.replace(',', '.')) });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? (isEn ? 'Invalid values' : 'Valeurs invalides'));
      return;
    }
    setSaving(true);
    const res = await fetch('/api/organizations/margin-policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      toast.error(isEn ? 'Could not save the margin targets' : 'Enregistrement des objectifs impossible');
      return;
    }
    await reload();
    showBrandToast('success', isEn ? 'Margin targets saved' : 'Objectifs de marge enregistrés');
  }

  return (
    <section className="mt-8">
      <SectionHeader
        eyebrow={isEn ? 'Steering' : 'Pilotage'}
        title={
          <>
            {isEn ? 'Margin' : 'Objectifs'} <span className="font-display text-primary">{isEn ? 'targets.' : 'de marge.'}</span>
          </>
        }
        description={
          isEn
            ? 'Used by the margin simulator, mission cockpits and finance signals. A consultant’s own target takes precedence. Nothing is ever blocked.'
            : 'Repris par le simulateur de marge, le cockpit des missions et les signaux financiers. L’objectif propre d’un consultant prime. Rien n’est jamais bloqué.'
        }
        actions={<TrendingUp className="h-4 w-4 text-primary" />}
      />
      <AppCard>
        <AppCardBody className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="margin-target">{isEn ? 'Target margin (%)' : 'Objectif de marge (%)'}</Label>
            <Input id="margin-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canEdit || !ready} />
            <p className="text-xs text-muted-foreground">{isEn ? 'Below: margin flagged as low.' : 'En dessous : marge signalée comme faible.'}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin-good">{isEn ? 'Good margin from (%)' : 'Bonne marge à partir de (%)'}</Label>
            <Input id="margin-good" inputMode="decimal" value={good} onChange={(e) => setGood(e.target.value)} disabled={!canEdit || !ready} />
            <p className="text-xs text-muted-foreground">{isEn ? 'In between: correct margin.' : 'Entre les deux : marge correcte.'}</p>
          </div>
          <Button type="button" onClick={() => void save()} disabled={!canEdit || !ready || saving} className="sm:mb-6">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Save' : 'Enregistrer'}
          </Button>
        </AppCardBody>
      </AppCard>
    </section>
  );
}
