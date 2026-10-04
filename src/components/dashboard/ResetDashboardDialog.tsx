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
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Scope = 'timesheets' | 'invoices' | 'alerts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset?: () => void;
};

// Les missions (CV poussés + En Mission) sont du pipeline commercial vivant —
// elles ne sont JAMAIS supprimées par un reset. Pour retirer une mission, il
// faut passer par l'action dédiée sur sa fiche (Terminer / Archiver).
function getScopeLabels(isEn: boolean): Record<Scope, { label: string; desc: string }> {
  return {
    timesheets: {
      label: isEn ? 'Timesheets' : 'CRAs',
      desc: isEn
        ? 'All activity timesheets — resets "Timesheets to validate"'
        : 'Tous les comptes rendus d\'activité — réinitialise "CRA à valider"',
    },
    invoices: {
      label: isEn ? 'Invoices' : 'Factures',
      desc: isEn
        ? 'Drafts and cancelled invoices only. Issued invoices (sent, paid, overdue) are KEPT — they are legal accounting documents (10-year retention obligation).'
        : 'Uniquement les brouillons et annulées. Les factures émises (envoyées, payées, en retard) sont CONSERVÉES — ce sont des documents comptables légaux (obligation de conservation 10 ans).',
    },
    alerts: {
      label: isEn ? 'Alerts' : 'Alertes',
      desc: isEn
        ? 'Saved manual alerts (computed alerts rebuild automatically)'
        : 'Alertes manuelles enregistrées (les alertes calculées se reconstruisent automatiquement)',
    },
  };
}

const ORDERED: Scope[] = ['timesheets', 'invoices', 'alerts'];

/**
 * Réinitialise les données transactionnelles d'une organisation pour
 * repartir d'un dashboard propre. Ne touche jamais aux consultants,
 * contacts, offres ouvertes ni à la configuration.
 *
 * Mots-clés visibles : "remettre à zéro", "wipe", "reset démo".
 */
export function ResetDashboardDialog({ open, onOpenChange, onReset }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const SCOPE_LABEL = getScopeLabels(isEn);
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
      notifyError(isEn ? 'Select at least one category' : 'Sélectionne au moins une catégorie');
      return;
    }
    if (confirm.trim() !== 'RESET') {
      notifyError(isEn ? 'Type RESET in uppercase to confirm' : 'Tape RESET en majuscules pour confirmer');
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
        notifyError(body.message ?? (isEn ? 'Reset failed' : 'Réinitialisation impossible'));
        return;
      }
      const counts = body.counts ?? {};
      const parts = ORDERED.filter((k) => counts[k] != null).map(
        (k) => `${counts[k]} ${SCOPE_LABEL[k].label.toLowerCase()}`,
      );
      notifyDestructive(
        parts.length > 0
          ? isEn
            ? `Reset — ${parts.join(', ')} deleted.`
            : `Réinitialisé — ${parts.join(', ')} supprimé(s).`
          : isEn
            ? 'Reset complete'
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
            <RotateCcw className="h-5 w-5 text-warning" />
            {isEn ? 'Reset the dashboard' : 'Réinitialiser le dashboard'}
          </DialogTitle>
          <DialogDescription>
            {isEn ? (
              <>
                Deletes this organization&apos;s transactional data to start over from a
                consistent dashboard. Consultants, offers and contacts are
                <strong> never</strong> affected.
              </>
            ) : (
              <>
                Supprime les données transactionnelles de cette organisation pour repartir
                d&apos;un dashboard cohérent. Les consultants, offres et contacts ne sont
                <strong> jamais</strong> touchés.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="rounded-lg border border-warning/30 bg-warning/[0.05] p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            {isEn ? (
              <div>
                <strong>Irreversible</strong> action. The KPIs &laquo;&nbsp;On mission&nbsp;&raquo;,
                &laquo;&nbsp;Revenue this month&nbsp;&raquo;, &laquo;&nbsp;Available&nbsp;&raquo; and
                &laquo;&nbsp;Timesheets to validate&nbsp;&raquo; are recalculated automatically after
                deletion.
                <span className="block mt-1.5 text-warning">
                  By legal obligation, <strong>issued invoices</strong> (sent/paid) and the
                  <strong> timesheets they reference</strong> are never deleted, even if they are
                  checked below.
                </span>
              </div>
            ) : (
              <div>
                Action <strong>irréversible</strong>. Les KPI « En mission », « CA du mois »,
                « Disponibles » et « CRA à valider » se recalculent automatiquement après
                suppression.
                <span className="block mt-1.5 text-warning">
                  Par obligation légale, les <strong>factures émises</strong> (envoyées/payées)
                  et les <strong>CRA qu&apos;elles référencent</strong> ne sont jamais supprimés,
                  même s&apos;ils sont cochés ci-dessous.
                </span>
              </div>
            )}
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
                      ? 'border-primary/50 bg-primary/[0.06]'
                      : 'border-hairline hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s)}
                    className="mt-1 h-4 w-4 accent-primary shrink-0"
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
            <Label>{isEn ? 'Type « RESET » to confirm' : 'Tape « RESET » pour confirmer'}</Label>
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
            {isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button
            onClick={submit}
            disabled={busy || scopes.size === 0 || confirm.trim() !== 'RESET'}
            className="bg-destructive/90 hover:bg-destructive text-foreground"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Reset' : 'Réinitialiser'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
