'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifyDestructive, notifyError } from '@/lib/notify';

type Scope = 'timesheets' | 'invoices' | 'alerts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset?: () => void;
};

// Les missions (CV poussés + En Mission) sont du pipeline commercial vivant —
// elles ne sont JAMAIS supprimées par un reset. Pour retirer une mission, il
// faut passer par l'action dédiée sur sa fiche (Terminer / Archiver).
const SCOPE_LABEL: Record<Scope, { label: string; desc: string }> = {
  timesheets: {
    label: 'CRAs',
    desc: 'Tous les comptes rendus d\'activité — réinitialise "CRA à valider"',
  },
  invoices: {
    label: 'Factures',
    desc: 'Uniquement les brouillons et annulées. Les factures émises (envoyées, payées, en retard) sont CONSERVÉES — ce sont des documents comptables légaux (obligation de conservation 10 ans).',
  },
  alerts: {
    label: 'Alertes',
    desc: 'Alertes manuelles enregistrées (les alertes calculées se reconstruisent automatiquement)',
  },
};

const ORDERED: Scope[] = ['timesheets', 'invoices', 'alerts'];

/**
 * Réinitialise les données transactionnelles d'une organisation pour
 * repartir d'un dashboard propre. Ne touche jamais aux consultants,
 * contacts, offres ouvertes ni à la configuration.
 *
 * Mots-clés visibles : "remettre à zéro", "wipe", "reset démo".
 */
export function ResetDashboardDialog({ open, onOpenChange, onReset }: Props) {
  const [scopes, setScopes] = useState<Set<Scope>>(
    new Set<Scope>(['timesheets', 'invoices', 'alerts']),
  );
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(s: Scope) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  async function submit() {
    if (scopes.size === 0) {
      notifyError('Sélectionne au moins une catégorie');
      return;
    }
    if (confirm.trim() !== 'RESET') {
      notifyError('Tape RESET en majuscules pour confirmer');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/dashboard/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes: Array.from(scopes), confirm: 'RESET' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Réinitialisation impossible');
        return;
      }
      const counts = body.counts ?? {};
      const parts = ORDERED.filter((k) => counts[k] != null).map(
        (k) => `${counts[k]} ${SCOPE_LABEL[k].label.toLowerCase()}`,
      );
      notifyDestructive(
        parts.length > 0
          ? `Réinitialisé — ${parts.join(', ')} supprimé(s).`
          : 'Réinitialisation terminée',
      );
      onReset?.();
      onOpenChange(false);
      setConfirm('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-300" />
            Réinitialiser le dashboard
          </DialogTitle>
          <DialogDescription>
            Supprime les données transactionnelles de cette organisation pour repartir
            d&apos;un dashboard cohérent. Les consultants, offres et contacts ne sont
            <strong> jamais</strong> touchés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
            <div>
              Action <strong>irréversible</strong>. Les KPI « En mission », « CA du mois »,
              « Disponibles » et « CRA à valider » se recalculent automatiquement après
              suppression.
              <span className="block mt-1.5 text-amber-200/80">
                Par obligation légale, les <strong>factures émises</strong> (envoyées/payées)
                et les <strong>CRA qu&apos;elles référencent</strong> ne sont jamais supprimés,
                même s&apos;ils sont cochés ci-dessous.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {ORDERED.map((s) => {
              const checked = scopes.has(s);
              const meta = SCOPE_LABEL[s];
              return (
                <label
                  key={s}
                  className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition ${
                    checked
                      ? 'border-magenta/50 bg-magenta/[0.06]'
                      : 'border-hairline hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s)}
                    className="mt-1 h-4 w-4 accent-magenta-neon shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {meta.desc}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div>
            <Label>Tape « RESET » pour confirmer</Label>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={busy || scopes.size === 0 || confirm.trim() !== 'RESET'}
            className="bg-red-500/90 hover:bg-red-500 text-white"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Réinitialiser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
