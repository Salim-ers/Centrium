'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FilePlus2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { Segmented } from '@/components/app/Segmented';
import { Button } from '@/components/ui/button';
import { CVRenderer } from '@/components/cv/CVRenderer';
import { DOSSIER_TEMPLATES, dossierTemplate, type DossierTemplateId } from '@/lib/cv/templates';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { CVContent } from '@/types';

/**
 * Contenu d'exemple volontairement générique (aucun nom réel) : il ne sert
 * qu'à montrer la mise en page de chaque modèle.
 */
const EXAMPLE: CVContent = {
  header: {
    displayName: 'Prénom Nom',
    jobTitle: 'Intitulé du poste',
    subTitle: 'Spécialité principale',
    yearsExperience: 8,
    location: 'Ville',
    mobility: 'Zone de mobilité',
    availability: 'Date de disponibilité',
  },
  summary:
    'Résumé du profil : quelques lignes sur le parcours, les domaines d’intervention et la valeur apportée aux clients. Le dossier reprend uniquement les éléments réels de la fiche consultant.',
  skillCategories: [
    { name: 'Catégorie A', items: ['Compétence 1', 'Compétence 2', 'Compétence 3'] },
    { name: 'Catégorie B', items: ['Compétence 4', 'Compétence 5'] },
    { name: 'Catégorie C', items: ['Compétence 6', 'Compétence 7', 'Compétence 8'] },
  ],
  experiences: [
    {
      id: 'x1',
      consultant_id: 'example',
      client_name: 'Client A',
      role: 'Rôle occupé',
      start_date: '2023-01-01',
      end_date: null,
      context: 'Contexte de la mission : enjeu, périmètre, équipe.',
      tasks: ['Réalisation principale', 'Deuxième réalisation', 'Troisième réalisation'],
      environment: ['Outil 1', 'Outil 2', 'Outil 3'],
      order_index: 1,
      created_at: '',
    },
    {
      id: 'x2',
      consultant_id: 'example',
      client_name: 'Client B',
      role: 'Rôle occupé',
      start_date: '2020-03-01',
      end_date: '2022-12-01',
      context: 'Contexte de la mission.',
      tasks: ['Réalisation principale', 'Deuxième réalisation'],
      environment: ['Outil 1', 'Outil 4'],
      order_index: 2,
      created_at: '',
    },
  ],
  educations: [{ id: 'e1', consultant_id: 'example', year: 2016, degree: 'Diplôme', institution: 'École', created_at: '' }],
  languages: [
    { code: 'fr', level: 'Natif' },
    { code: 'en', level: 'Professionnel' },
  ],
};

/** Modèles de dossier : les quatre mises en page, aux couleurs de l'organisation. */
export default function TemplatesPage() {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [template, setTemplate] = useState<DossierTemplateId>('standard');
  const t = dossierTemplate(template);

  return (
    <AppShell>
      <PageHeader
        title={fr ? 'Modèles de dossier' : 'Dossier templates'}
        description={
          fr
            ? 'Quatre mises en page neutres, habillées par votre logo et vos couleurs (Paramètres › Branding).'
            : 'Four neutral layouts, dressed with your logo and colors (Settings › Branding).'
        }
        actions={
          <Button asChild>
            <Link href="/cv-optimizer">
              <FilePlus2 />
              {fr ? 'Créer un dossier' : 'Create a dossier'}
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<DossierTemplateId>
          label={fr ? 'Modèle' : 'Template'}
          value={template}
          onChange={setTemplate}
          options={DOSSIER_TEMPLATES.map((d) => ({ value: d.id, label: `${d.number} ${d.name}` }))}
        />
        <p className="text-[13px] text-muted-foreground">{t.description[fr ? 'fr' : 'en']}</p>
      </div>
      <div className="overflow-auto rounded-2xl bg-app-sand/50 p-6">
        <CVRenderer content={EXAMPLE} templateId={template} />
      </div>
    </AppShell>
  );
}
