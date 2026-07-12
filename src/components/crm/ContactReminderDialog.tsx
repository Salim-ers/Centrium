'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, X as XIcon, Trash2 } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import { contactService } from '@/lib/services';
import { notifyError } from '@/lib/notify';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Contact } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSaved?: (c: Contact) => void;
};

/** Convertit ISO → input "YYYY-MM-DDTHH:mm" pour <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convertit input "YYYY-MM-DDTHH:mm" en ISO. */
function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const QUICK_OPTIONS: { label: string; labelEn: string; minutesAhead: number }[] = [
  { label: 'Dans 1 h', labelEn: 'In 1 h', minutesAhead: 60 },
  { label: 'Demain 9h', labelEn: 'Tomorrow 9am', minutesAhead: -1 }, // sentinel — calculé dynamiquement
  { label: 'Dans 3 j', labelEn: 'In 3 d', minutesAhead: 60 * 24 * 3 },
  { label: 'Dans 1 sem.', labelEn: 'In 1 wk', minutesAhead: 60 * 24 * 7 },
];

function quickToLocal(opt: { label: string; labelEn: string; minutesAhead: number }): string {
  const d = new Date();
  if (opt.label === 'Demain 9h') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else {
    d.setMinutes(d.getMinutes() + opt.minutesAhead);
  }
  return toLocalInput(d.toISOString());
}

export function ContactReminderDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && contact) {
      setWhen(toLocalInput(contact.next_call_reminder));
      setNote(contact.next_call_reminder_note ?? '');
    }
  }, [open, contact]);

  if (!contact) return null;

  async function save() {
    if (!contact) return;
    if (!when) {
      notifyError(isEn ? 'Pick a date / time' : 'Choisis une date / heure');
      return;
    }
    const iso = toIso(when);
    if (!iso) {
      notifyError(isEn ? 'Invalid date / time' : 'Date / heure invalide');
      return;
    }
    setSaving(true);
    const res = await contactService.setCallReminder(contact.id, iso, note.trim() || null);
    setSaving(false);
    if (res.error || !res.data) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + (res.error?.message ?? (isEn ? 'unknown' : 'inconnue')));
      return;
    }
    onSaved?.(res.data);
    onOpenChange(false);
  }

  async function clearReminder() {
    if (!contact) return;
    setSaving(true);
    const res = await contactService.setCallReminder(contact.id, null, null);
    setSaving(false);
    if (res.error || !res.data) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + (res.error?.message ?? (isEn ? 'unknown' : 'inconnue')));
      return;
    }
    onSaved?.(res.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-300" />
            {isEn ? 'Reminder' : 'Rappel'} — {contact.first_name} {contact.last_name}
          </DialogTitle>
          <DialogDescription>
            {isEn
              ? 'Schedule a call reminder. It will appear in the alert center based on how close it is (critical if overdue, important within 24h, moderate within 7 days).'
              : 'Programme un rappel d’appel. Il apparaîtra dans le centre d’alertes selon sa proximité (critique si dépassé, important si sous 24h, modéré sous 7j).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setWhen(quickToLocal(opt))}
                className="text-[11px] px-2.5 py-1 rounded-md border border-violet-glow/30 bg-violet-glow/[0.06] text-violet-200 hover:bg-violet-glow/[0.12]"
              >
                {isEn ? opt.labelEn : opt.label}
              </button>
            ))}
          </div>

          <div>
            <Label>{isEn ? 'Reminder date / time *' : 'Date / heure du rappel *'}</Label>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div>
            <Label>{isEn ? 'Note (optional)' : 'Note (optionnel)'}</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isEn ? 'e.g. "Follow up on the quote signature", "Send the job description"…' : 'ex: "Relancer pour la signature du devis", "Envoyer la fiche de poste"…'}
            />
          </div>
        </div>

        <DialogFooter className="flex-row sm:justify-between gap-2">
          {contact.next_call_reminder ? (
            <Button
              type="button"
              variant="outline"
              onClick={clearReminder}
              disabled={saving}
              className="border-red-500/40 text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isEn ? 'Delete' : 'Supprimer'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <XIcon className="h-3.5 w-3.5" />
              {isEn ? 'Cancel' : 'Annuler'}
            </Button>
            <Button type="button" onClick={save} disabled={saving || !when}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEn ? 'Schedule' : 'Programmer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
