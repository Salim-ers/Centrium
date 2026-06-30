'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { contactSchema, type ContactInput } from '@/lib/validators';
import { contactService } from '@/lib/services';
import { CONTACT_TYPE_LABEL } from '@/constants';
import type { Contact, ContactType } from '@/types';
import { broadcastOrgActivity } from '@/lib/realtime/org-activity';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useLocale, useAppT } from '@/lib/i18n/LocaleProvider';

const CONTACT_TYPE_LABEL_EN: Record<ContactType, string> = {
  recruiter: 'Recruiter',
  sales: 'Sales',
  manager: 'Manager',
  client_final: 'End client',
  esn_partner: 'Partner ESN',
  buyer: 'Buyer',
  hr: 'HR',
  consultant: 'Consultant',
  other: 'Other',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSaved?: (c: Contact) => void;
  /** Si fourni, le dialog passe en mode édition */
  contact?: Contact | null;
};

function toFormValues(c: Contact | null | undefined): Partial<ContactInput> {
  if (!c) return { contact_type: 'recruiter' };
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    contact_type: c.contact_type,
    job_title: c.job_title ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    linkedin_url: c.linkedin_url ?? '',
    source: c.source ?? '',
    notes: c.notes ?? '',
  } as Partial<ContactInput>;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  organizationId,
  onSaved,
  contact,
}: Props) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!contact;
  const org = useOrganizationSafe();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const t = useAppT();
  const TYPE_LABELS = isEn ? CONTACT_TYPE_LABEL_EN : CONTACT_TYPE_LABEL;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: toFormValues(contact),
  });

  useEffect(() => {
    if (open) reset(toFormValues(contact));
  }, [open, contact, reset]);

  async function onSubmit(values: ContactInput) {
    setSaving(true);
    try {
      const res = isEdit
        ? await contactService.update(contact!.id, values)
        : await contactService.create(values, organizationId);
      if (res.error) {
        // Cas anti-doublon : on a injecté un message explicite côté service.
        // On le toast en "warning" plutôt qu'en "error" — c'est une saisie à
        // corriger, pas un bug technique.
        const code = (res.error as { code?: string }).code;
        if (
          code === '23505' ||
          /existe déjà dans le carnet/i.test(res.error.message) ||
          /already exists in the book/i.test(res.error.message)
        ) {
          toast.warning(res.error.message, { duration: 6000 });
          return;
        }
        notifyError((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
        return;
      }
      const fullName = `${values.first_name} ${values.last_name}`;
      // Diffuse aux collègues — toast non bloquant chez eux.
      void broadcastOrgActivity(
        org?.activeOrgId,
        org?.user?.id,
        isEdit ? 'contact_updated' : 'contact_created',
        fullName,
        '/contacts',
      );
      onSaved?.(res.data);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? (isEn ? 'Edit contact' : 'Éditer le contact') : (isEn ? 'New contact' : 'Nouveau contact')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? (isEn ? "Edit this contact's information" : 'Modifie les informations de ce contact')
              : (isEn ? 'Add a contact to your book' : 'Ajoute un contact à ton carnet')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'First name' : 'Prénom'} *</Label>
              <Input {...register('first_name')} />
              {errors.first_name && (
                <p className="text-xs text-red-400 mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label>{isEn ? 'Last name' : 'Nom'} *</Label>
              <Input {...register('last_name')} />
            </div>
          </div>

          <div>
            <Label>{isEn ? 'Type' : 'Type'}</Label>
            <Select {...register('contact_type')}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>{isEn ? 'Role' : 'Poste'}</Label>
            <Input {...register('job_title')} placeholder={isEn ? 'e.g. Senior Account Manager' : 'ex: Senior Account Manager'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'Email' : 'Email'}</Label>
              <Input type="email" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <Label>{isEn ? 'Phone' : 'Téléphone'}</Label>
              <Input {...register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>LinkedIn</Label>
              <Input {...register('linkedin_url')} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <Label>{isEn ? 'Source' : 'Source'}</Label>
              <Input {...register('source')} placeholder={isEn ? 'LinkedIn, Trade show, Referral…' : 'LinkedIn, Salon, Référence…'} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t.actions.save : t.actions.create}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
