'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { clientSchema, type ClientInput } from '@/lib/validators/v2';
import type { Company } from '@/types';

export const CLIENT_KIND_LABEL: Record<string, { fr: string; en: string }> = {
  client: { fr: 'Client', en: 'Client' },
  prospect: { fr: 'Prospect', en: 'Prospect' },
  esn_partner: { fr: 'ESN partenaire', en: 'Partner firm' },
};

function toValues(c?: Company | null): ClientInput {
  return {
    name: c?.name ?? '',
    kind: (c?.kind as ClientInput['kind']) ?? 'client',
    industry: c?.industry ?? '',
    size: c?.size ?? '',
    website: c?.website ?? '',
    linkedin_url: c?.linkedin_url ?? '',
    address: c?.address ?? '',
    city: c?.city ?? '',
    country: c?.country ?? 'France',
    notes: c?.notes ?? '',
  };
}

export function ClientDrawer({
  open,
  onOpenChange,
  organizationId,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  client?: Company | null;
  onSaved?: (c: Company) => void;
}) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { register, handleSubmit, reset, formState } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: toValues(client),
  });

  useEffect(() => {
    if (open) reset(toValues(client));
  }, [open, client, reset]);

  async function onSubmit(values: ClientInput) {
    const parsed = clientSchema.parse(values);
    const supabase = createClient();
    const q = client
      ? supabase.from('companies').update(parsed).eq('id', client.id)
      : supabase.from('companies').insert({ ...parsed, organization_id: organizationId });
    const { data, error } = await q.select().single();
    if (error) {
      toast.error(
        error.code === '23505'
          ? fr
            ? 'Un client porte déjà ce nom.'
            : 'A client with this name already exists.'
          : error.message,
      );
      return;
    }
    toast.success(client ? (fr ? 'Client mis à jour' : 'Client updated') : fr ? 'Client créé' : 'Client created');
    onSaved?.(data as Company);
    onOpenChange(false);
  }

  const err = (k: keyof ClientInput) => formState.errors[k]?.message as string | undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
          <DrawerHeader>
            <DrawerTitle>{client ? (fr ? 'Modifier le client' : 'Edit client') : fr ? 'Nouveau client' : 'New client'}</DrawerTitle>
            <DrawerDescription>{fr ? 'Informations de la société.' : 'Company information.'}</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <Field label={fr ? 'Raison sociale' : 'Company name'} htmlFor="cl-name" required error={err('name')}>
              <Input id="cl-name" autoFocus {...register('name')} aria-invalid={!!err('name')} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? 'Type' : 'Type'} htmlFor="cl-kind">
                <Select id="cl-kind" {...register('kind')}>
                  {Object.entries(CLIENT_KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v[lang]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={fr ? 'Secteur' : 'Industry'} htmlFor="cl-industry">
                <Input id="cl-industry" {...register('industry')} placeholder={fr ? 'ex. Banque, Énergie' : 'e.g. Banking'} />
              </Field>
              <Field label={fr ? 'Taille' : 'Size'} htmlFor="cl-size">
                <Input id="cl-size" {...register('size')} placeholder={fr ? 'ex. 500-1000 salariés' : 'e.g. 500-1000'} />
              </Field>
              <Field label={fr ? 'Site web' : 'Website'} htmlFor="cl-web" error={err('website')}>
                <Input id="cl-web" type="url" {...register('website')} placeholder="https://" />
              </Field>
            </div>
            <Field label="LinkedIn" htmlFor="cl-li" error={err('linkedin_url')}>
              <Input id="cl-li" type="url" {...register('linkedin_url')} placeholder="https://www.linkedin.com/company/…" />
            </Field>
            <Field label={fr ? 'Adresse' : 'Address'} htmlFor="cl-address">
              <Input id="cl-address" {...register('address')} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? 'Ville' : 'City'} htmlFor="cl-city">
                <Input id="cl-city" {...register('city')} />
              </Field>
              <Field label={fr ? 'Pays' : 'Country'} htmlFor="cl-country">
                <Input id="cl-country" {...register('country')} />
              </Field>
            </div>
            <Field label={fr ? 'Notes' : 'Notes'} htmlFor="cl-notes">
              <Textarea id="cl-notes" rows={3} {...register('notes')} />
            </Field>
          </DrawerBody>
          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {client ? (fr ? 'Enregistrer' : 'Save') : fr ? 'Créer le client' : 'Create client'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
