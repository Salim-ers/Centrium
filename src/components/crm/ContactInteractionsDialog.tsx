'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Loader2,
  Plus,
  Trash2,
  Phone,
  Mail,
  Users,
  StickyNote,
  Linkedin,
  Send,
} from 'lucide-react';

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
import { Combobox } from '@/components/ui/Combobox';
import { contactInteractionService } from '@/lib/services';
import { notifyError } from '@/lib/notify';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Contact, ContactInteraction, ContactInteractionKind } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  organizationId: string;
  /** Appelé quand l'historique change (ajout / suppression) → on
   *  rafraîchit la liste contact pour montrer la dernière note. */
  onChanged?: () => void;
};

const KIND_META: Record<
  ContactInteractionKind,
  { label: string; labelEn: string; Icon: typeof Phone; color: string }
> = {
  call: { label: 'Appel', labelEn: 'Call', Icon: Phone, color: 'text-success' },
  email: { label: 'Email', labelEn: 'Email', Icon: Mail, color: 'text-info' },
  meeting: { label: 'Rendez-vous', labelEn: 'Meeting', Icon: Users, color: 'text-primary' },
  note: { label: 'Note', labelEn: 'Note', Icon: StickyNote, color: 'text-warning' },
  linkedin: { label: 'LinkedIn', labelEn: 'LinkedIn', Icon: Linkedin, color: 'text-info' },
  sms: { label: 'SMS', labelEn: 'SMS', Icon: MessageSquare, color: 'text-primary' },
  other: { label: 'Autre', labelEn: 'Other', Icon: StickyNote, color: 'text-muted-foreground' },
};

export function ContactInteractionsDialog({
  open,
  onOpenChange,
  contact,
  organizationId,
  onChanged,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [items, setItems] = useState<ContactInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ContactInteractionKind>('note');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !contact) {
      setItems([]);
      setNote('');
      setKind('note');
      return;
    }
    let cancelled = false;
    setLoading(true);
    contactInteractionService.list(contact.id).then((res) => {
      if (cancelled) return;
      setItems(res.data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, contact]);

  if (!contact) return null;

  async function add() {
    if (!contact || !note.trim()) {
      notifyError(isEn ? 'A note is required' : 'La note est obligatoire');
      return;
    }
    setAdding(true);
    const res = await contactInteractionService.add(
      contact.id,
      organizationId,
      { kind, note: note.trim() },
    );
    setAdding(false);
    if (res.error || !res.data) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + (res.error?.message ?? (isEn ? 'unknown' : 'inconnue')));
      return;
    }
    setItems((prev) => [res.data!, ...prev]);
    setNote('');
    onChanged?.();
  }

  async function remove(interaction: ContactInteraction) {
    if (!confirm(isEn ? 'Delete this interaction?' : 'Supprimer cette interaction ?')) return;
    const res = await contactInteractionService.remove(interaction.id);
    if (res.error) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== interaction.id));
    onChanged?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {isEn ? 'History' : 'Historique'} — {contact.first_name} {contact.last_name}
          </DialogTitle>
          <DialogDescription>
            {isEn
              ? 'Timestamped notes and interactions. The most recent one appears on the contact row in the table.'
              : 'Notes et interactions horodatées. La dernière en date apparaît sur la ligne du contact dans la table.'}
          </DialogDescription>
        </DialogHeader>

        {/* Add new interaction */}
        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 space-y-2">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider">{isEn ? 'Type' : 'Type'}</Label>
              <Combobox
                value={kind}
                onChange={(v) => setKind(v as ContactInteractionKind)}
                options={(Object.keys(KIND_META) as ContactInteractionKind[]).map((k) => ({
                  value: k,
                  label: isEn ? KIND_META[k].labelEn : KIND_META[k].label,
                }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider">Note *</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void add();
                  }
                }}
                placeholder={isEn ? 'e.g. "Sent the CVs", "Called back — left a message", "Meeting set Thursday 2pm"' : 'ex: "Envoyé les CV", "Rappelé — laissé message", "RDV fixé jeudi 14h"'}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={add} disabled={adding || !note.trim()}>
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {isEn ? 'Add' : 'Ajouter'}
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="space-y-2 pt-1">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-card animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground italic">
              {isEn ? 'No interaction recorded yet. Add the first one above.' : 'Aucune interaction enregistrée. Ajoute la première ci-dessus.'}
            </div>
          ) : (
            items.map((it) => {
              const meta = KIND_META[it.kind];
              const Icon = meta.Icon;
              const d = new Date(it.occurred_at);
              return (
                <div
                  key={it.id}
                  className="rounded-lg border border-hairline bg-card p-3 group hover:bg-muted"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md bg-card ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className={meta.color}>{isEn ? meta.labelEn : meta.label}</span>
                        <span>·</span>
                        <span>
                          {d.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          ·{' '}
                          {d.toLocaleTimeString(isEn ? 'en-GB' : 'fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1 leading-snug whitespace-pre-line">
                        {it.note}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(it)}
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                      title={isEn ? 'Delete' : 'Supprimer'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <Send className="h-3.5 w-3.5 rotate-90" />
            {isEn ? 'Close' : 'Fermer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
