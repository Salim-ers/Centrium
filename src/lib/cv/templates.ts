// =========================================================================
// Modèles de dossier de compétences : quatre mises en page neutres,
// utilisables par n'importe quelle ESN. La structure reste la même ; le
// logo, les couleurs et les mentions de l'organisation l'habillent.
//
// Identifiants : `standard`, `dense` et `executive` sont ceux enregistrés en
// base (défaut de l'organisation). `minimal` se choisit dossier par dossier.
// =========================================================================

import type { CVTemplateId } from '@/types';

export type DossierTemplateId = CVTemplateId | 'minimal';

export type DossierTemplate = {
  id: DossierTemplateId;
  number: string;
  name: string;
  description: { fr: string; en: string };
  /** Peut être enregistré comme modèle par défaut de l'organisation. */
  persistable: boolean;
};

export const DOSSIER_TEMPLATES: DossierTemplate[] = [
  {
    id: 'minimal',
    number: '01',
    name: 'Minimal',
    description: { fr: 'Une colonne, beaucoup d’air, typographie sobre.', en: 'Single column, generous spacing, quiet typography.' },
    persistable: false,
  },
  {
    id: 'standard',
    number: '02',
    name: 'Consulting',
    description: { fr: 'Colonne d’identité et de compétences, expériences à droite.', en: 'Identity and skills column, experience on the right.' },
    persistable: true,
  },
  {
    id: 'executive',
    number: '03',
    name: 'Executive',
    description: { fr: 'Titres à empattements, résumé mis en avant. Profils seniors.', en: 'Serif headings, prominent summary. Senior profiles.' },
    persistable: true,
  },
  {
    id: 'dense',
    number: '04',
    name: 'Compact',
    description: { fr: 'Dense et lisible : le maximum d’expériences par page.', en: 'Dense yet readable: the most experience per page.' },
    persistable: true,
  },
];

export function dossierTemplate(id: string | null | undefined): DossierTemplate {
  return DOSSIER_TEMPLATES.find((t) => t.id === id) ?? DOSSIER_TEMPLATES[1];
}

export function isDossierTemplateId(v: unknown): v is DossierTemplateId {
  return typeof v === 'string' && DOSSIER_TEMPLATES.some((t) => t.id === v);
}
