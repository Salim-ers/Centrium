// Classification heuristique d'un job_title vers un "corps de métier".
// Pas de colonne en DB : on dérive à la volée depuis l'intitulé existant.
// L'utilisateur s'en sert pour filtrer rapidement les listes consultants /
// prospects. Les regex sont volontairement larges (français + anglais).

export type JobFamilyId =
  | 'qa'
  | 'dev'
  | 'data'
  | 'devops'
  | 'cyber'
  | 'pm'
  | 'ba'
  | 'architect'
  | 'support'
  | 'design'
  | 'other';

export type JobFamily = {
  id: JobFamilyId;
  label: string;
  /** Tested against job_title in priority order — first match wins. */
  pattern: RegExp;
};

// Ordre = priorité. "architect" passe avant "dev" pour qu'un "Architecte
// logiciel" ne soit pas catalogué Dev. "qa" avant "dev" pareil.
export const JOB_FAMILIES: JobFamily[] = [
  {
    id: 'qa',
    label: 'QA',
    pattern: /\b(qa|test|testing|recette|validation|quality|qualité)\b/i,
  },
  {
    id: 'cyber',
    label: 'Cyber',
    pattern: /\b(cyber|security|sécurité|rssi|pentest|soc|grc|ebios)\b/i,
  },
  {
    id: 'devops',
    label: 'DevOps / Cloud',
    pattern: /\b(devops|sre|cloud|infra|ops|kubernetes|docker|aws|gcp|azure|terraform|sysadmin|admin sys)\b/i,
  },
  {
    id: 'data',
    label: 'Data',
    pattern: /\b(data|bi|analytics|scientist|analyst|engineer data|ingénieur data|big data|etl|datawarehouse)\b/i,
  },
  {
    id: 'architect',
    label: 'Architecte',
    pattern: /\b(architecte|architect)\b/i,
  },
  {
    id: 'pm',
    label: 'Chef de projet',
    pattern: /\b(chef de projet|cdp|project manager|pmo|scrum master|delivery manager|program manager)\b/i,
  },
  {
    id: 'ba',
    label: 'BA / PO',
    pattern: /\b(business analyst|ba\b|product owner|\bpo\b|moa|maitrise d'ouvrage)\b/i,
  },
  {
    id: 'design',
    label: 'Design / UX',
    pattern: /\b(ux|ui|designer|design)\b/i,
  },
  {
    id: 'dev',
    label: 'Dev',
    pattern: /\b(dev|développeur|developer|développeuse|software engineer|full-?stack|front-?end|back-?end|mobile|ios|android|fullstack)\b/i,
  },
  {
    id: 'support',
    label: 'Support / Tech',
    pattern: /\b(support|technicien|helpdesk|help desk|n1|n2|hotline|téléassistance)\b/i,
  },
];

export function classifyJobFamily(jobTitle: string | null | undefined): JobFamilyId {
  if (!jobTitle) return 'other';
  for (const fam of JOB_FAMILIES) {
    if (fam.pattern.test(jobTitle)) return fam.id;
  }
  return 'other';
}
