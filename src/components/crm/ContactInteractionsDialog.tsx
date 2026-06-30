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
import { Select } from '@/components/ui/select';
import { contactInteractionService } from '@/lib/services';
import { notifyError } from '@/lib/notify';
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
  { label: string; Icon: typeof Phone; color: string }
> = {
  call: { label: 'Appel', Icon: Phone, color: 'text-emerald-300' },
  email: { label: 'Email', Icon: Mail, color: 'text-blue-300' },
  meeting: { label: 'Rendez-vous', Icon: Users, color: 'text-violet-300' },
  note: { label: 'Note', Icon: StickyNote, color: 'text-amber-300' },
  linkedin: { label: 'LinkedIn', Icon: Linkedin, color: 'text-sky-300' },
  sms: { label: 'SMS', Icon: MessageSquare, color: 'text-fuchsia-300' },
  other: { label: 'Autre', Icon: StickyNote, color: 'text-slate-300' },
};

export function ContactInteractionsDialog({
  open,
  onOpenChange,
  contact,
  organizationId,
  onChanged,
}: Props) {
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
      notifyError('La note est obligatoire');
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
      notifyError('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    setItems((prev) => [res.data!, ...prev]);
    setNote('');
    onChanged?.();
  }

  async function remove(interaction: ContactInteraction) {
    if (!confirm('Supprimer cette interaction ?')) return;
    const res = await contactInteractionService.remove(interaction.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
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
            <MessageSquare className="h-5 w-5 text-violet-glow" />
            Historique — {contact.first_name} {contact.last_name}
          </DialogTitle>
          <DialogDescription>
            Notes et interactions horodatées. La dernière en date apparaît
            sur la ligne du contact dans la table.
          </DialogDescription>
        </DialogHeader>

        {/* Add new interaction */}
        <div className="rounded-lg border border-violet-glow/20 bg-violet-glow/[0.04] p-3 space-y-2">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider">Type</Label>
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as ContactInteractionKind)}
              >
                {(Object.keys(KIND_META) as ContactInteractionKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_META[k].label}
                  </option>
                ))}
              </Select>
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
                placeholder='ex: "Envoyé les CV", "Rappelé — laissé message", "RDV fixé jeudi 14h"'
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
              Ajouter
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="space-y-2 pt-1">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground italic">
              Aucune interaction enregistrée. Ajoute la première ci-dessus.
            </div>
          ) : (
            items.map((it) => {
              const meta = KIND_META[it.kind];
              const Icon = meta.Icon;
              const d = new Date(it.occurred_at);
              return (
                <div
                  key={it.id}
                  className="rounded-lg border border-hairline bg-white/[0.02] p-3 group hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md bg-white/[0.04] ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className={meta.color}>{meta.label}</span>
                        <span>·</span>
                        <span>
                          {d.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          ·{' '}
                          {d.toLocaleTimeString('fr-FR', {
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
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-400"
                      title="Supprimer"
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
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
