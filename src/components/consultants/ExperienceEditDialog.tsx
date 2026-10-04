'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { consultantService } from '@/lib/services/consultant.service';
import type { ConsultantExperience } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultantId: string;
  experience?: ConsultantExperience | null;
  onSaved?: () => void;
};

export function ExperienceEditDialog({
  open,
  onOpenChange,
  consultantId,
  experience,
  onSaved,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const isEdit = !!experience;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [clientName, setClientName] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [context, setContext] = useState('');
  const [tasks, setTasks] = useState('');
  const [environment, setEnvironment] = useState('');

  useEffect(() => {
    if (!open) return;
    setClientName(experience?.client_name ?? '');
    setRole(experience?.role ?? '');
    setStartDate(experience?.start_date ?? '');
    setEndDate(experience?.end_date ?? '');
    setContext(experience?.context ?? '');
    setTasks((experience?.tasks ?? []).join('\n'));
    setEnvironment((experience?.environment ?? []).join(', '));
  }, [open, experience]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !role.trim()) {
      toast.error(isEn ? 'Client and role are required' : 'Client et rôle requis');
      return;
    }
    setSaving(true);
    const payload = {
      client_name: clientName.trim(),
      role: role.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      context: context.trim() || null,
      tasks: tasks.split('\n').map((t) => t.trim()).filter(Boolean),
      environment: environment.split(',').map((e) => e.trim()).filter(Boolean),
    };
    const res = isEdit
      ? await consultantService.updateExperience(experience!.id, payload)
      : await consultantService.createExperience(consultantId, payload);
    setSaving(false);
    if (res.error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    toast.success(
      isEdit
        ? isEn ? 'Experience updated' : 'Expérience mise à jour'
        : isEn ? 'Experience added' : 'Expérience ajoutée',
    );
    onSaved?.();
    onOpenChange(false);
  }

  async function onDelete() {
    if (!experience) return;
    if (
      !confirm(
        isEn
          ? `Delete the experience at ${experience.client_name}?`
          : `Supprimer l'expérience chez ${experience.client_name} ?`,
      )
    )
      return;
    setDeleting(true);
    const res = await consultantService.deleteExperience(experience.id);
    setDeleting(false);
    if (res.error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    toast.success(isEn ? 'Experience deleted' : 'Expérience supprimée');
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? isEn ? 'Edit experience' : 'Éditer l\'expérience'
              : isEn ? 'New experience' : 'Nouvelle expérience'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'Client / Employer' : 'Client / Employeur'} *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="LVMH – Dior" />
            </div>
            <div>
              <Label>{isEn ? 'Role' : 'Rôle'} *</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="QA Automation Confirmé" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'Start' : 'Début'}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{isEn ? 'End (empty = ongoing)' : 'Fin (vide = en cours)'}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{isEn ? 'Context' : 'Contexte'}</Label>
            <Textarea
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={isEn ? 'Project / team / sector context' : 'Contexte du projet / équipe / secteur'}
            />
          </div>

          <div>
            <Label>{isEn ? 'Tasks (one per line)' : 'Tâches (une par ligne)'}</Label>
            <Textarea
              rows={5}
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder={
                isEn
                  ? 'End-to-end test automation\nQA strategy definition\n…'
                  : 'Automatisation des tests E2E\nRédaction de la stratégie QA\n…'
              }
            />
          </div>

          <div>
            <Label>{isEn ? 'Environment (comma-separated)' : 'Environnement (séparé par des virgules)'}</Label>
            <Input
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="Playwright, TypeScript, GitHub Actions"
            />
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4">
            {isEdit ? (
              <Button type="button" variant="ghost" onClick={onDelete} disabled={deleting} className="text-destructive hover:text-destructive">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isEn ? 'Delete' : 'Supprimer'}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {isEn ? 'Cancel' : 'Annuler'}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit
                  ? isEn ? 'Save' : 'Enregistrer'
                  : isEn ? 'Add' : 'Ajouter'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
