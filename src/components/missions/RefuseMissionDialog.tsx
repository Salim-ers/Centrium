'use client';

import { useEffect, useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contexte affiché dans le header pour confirmer le bon enregistrement. */
  consultantName: string;
  missionTitle: string;
  /** Appelé avec la raison (peut être vide string si l'admin ne renseigne rien). */
  onConfirm: (reason: string) => Promise<void>;
};

const QUICK_REASONS_FR = [
  'Profil pas assez senior',
  'TJM trop élevé',
  'Stack technique différente',
  'Disponibilité incompatible',
  'Client a choisi un autre profil',
  'Compétences manquantes',
];

const QUICK_REASONS_EN = [
  'Profile not senior enough',
  'Day rate too high',
  'Different tech stack',
  'Incompatible availability',
  'Client chose another profile',
  'Missing skills',
];

/**
 * Dialog dédié au refus d'un CV poussé : saisie obligatoire d'une raison
 * (avec chips de raccourcis pour les motifs récurrents). Stocke la raison
 * dans `missions.rejection_reason` via l'API PATCH /api/missions/:id.
 */
export function RefuseMissionDialog({
  open,
  onOpenChange,
  consultantName,
  missionTitle,
  onConfirm,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const QUICK_REASONS = isEn ? QUICK_REASONS_EN : QUICK_REASONS_FR;
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setBusy(false);
    }
  }, [open]);

  async function submit() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <XCircle className="h-5 w-5 text-amber-300" />
            {isEn ? 'Reject the proposal' : 'Refuser la proposition'}
          </DialogTitle>
          <DialogDescription>
            <strong>{consultantName}</strong> {isEn ? 'on' : 'sur'} <em>{missionTitle}</em>.
            {isEn
              ? ' State why the client declined — the record stays accessible in “View rejected” and feeds the reporting.'
              : ' Indique pourquoi le client a refusé — la trace reste accessible dans « Voir les refusés » et alimente le reporting.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                disabled={busy}
                className={`text-[11px] px-2 py-1 rounded-md border transition ${
                  reason === r
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                    : 'border-hairline bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/20'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div>
            <Label>{isEn ? 'Reason for rejection *' : 'Motif du refus *'}</Label>
            <Textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isEn
                  ? 'E.g.: The client wanted someone with 10+ years of GCP cloud experience, whereas our consultant is more AWS-focused.'
                  : "Ex: Le client cherchait quelqu'un avec 10+ ans d'expérience en cloud GCP, alors que notre consultant est plus orienté AWS."
              }
              disabled={busy}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {isEn
                ? 'Kept on the mission. Will be visible in the pipeline to understand why a positioning did not succeed.'
                : "Conservé sur la mission. Sera visible côté pipeline pour comprendre pourquoi un positionnement n'a pas abouti."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !reason.trim()}
            className="bg-amber-500/90 hover:bg-amber-500 text-white"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Confirm rejection' : 'Confirmer le refus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
