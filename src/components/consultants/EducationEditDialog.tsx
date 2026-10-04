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
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { consultantService } from '@/lib/services/consultant.service';
import type { ConsultantEducation } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultantId: string;
  education?: ConsultantEducation | null;
  onSaved?: () => void;
};

export function EducationEditDialog({
  open,
  onOpenChange,
  consultantId,
  education,
  onSaved,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const isEdit = !!education;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [year, setYear] = useState<string>('');
  const [degree, setDegree] = useState('');
  const [institution, setInstitution] = useState('');

  useEffect(() => {
    if (!open) return;
    setYear(education?.year?.toString() ?? '');
    setDegree(education?.degree ?? '');
    setInstitution(education?.institution ?? '');
  }, [open, education]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const yearNum = parseInt(year, 10);
    if (!yearNum || yearNum < 1970 || yearNum > new Date().getFullYear() + 1) {
      toast.error(isEn ? 'Invalid year' : 'Année invalide');
      return;
    }
    if (!degree.trim()) {
      toast.error(isEn ? 'Degree title is required' : 'Intitulé du diplôme requis');
      return;
    }
    setSaving(true);
    const payload = {
      year: yearNum,
      degree: degree.trim(),
      institution: institution.trim() || null,
    };
    const res = isEdit
      ? await consultantService.updateEducation(education!.id, payload)
      : await consultantService.createEducation(consultantId, payload);
    setSaving(false);
    if (res.error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    toast.success(
      isEdit
        ? isEn ? 'Education updated' : 'Formation mise à jour'
        : isEn ? 'Education added' : 'Formation ajoutée',
    );
    onSaved?.();
    onOpenChange(false);
  }

  async function onDelete() {
    if (!education) return;
    if (
      !confirm(
        isEn
          ? `Delete the education « ${education.degree} »?`
          : `Supprimer la formation « ${education.degree} » ?`,
      )
    )
      return;
    setDeleting(true);
    const res = await consultantService.deleteEducation(education.id);
    setDeleting(false);
    if (res.error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    toast.success(isEn ? 'Education deleted' : 'Formation supprimée');
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? isEn ? 'Edit education' : 'Éditer la formation'
              : isEn ? 'New education' : 'Nouvelle formation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div>
            <Label>{isEn ? 'Year' : 'Année'} *</Label>
            <Input
              type="number"
              min="1970"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2020"
            />
          </div>
          <div>
            <Label>{isEn ? 'Title' : 'Intitulé'} *</Label>
            <Input
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder={isEn ? 'MSc Information Systems Management' : 'Mastère Management et Conseil en SI'}
            />
          </div>
          <div>
            <Label>{isEn ? 'School / university' : 'École / université'}</Label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={isEn ? 'École polytechnique…' : 'École polytechnique…'}
            />
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
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
