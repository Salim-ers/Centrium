'use client';

// =========================================================================
// Extraction best-effort de l'identité depuis le texte brut d'un CV.
// Utilisé à l'upload (création consultant/prospect) pour pré-remplir
// prénom, nom, intitulé, ville, séniorité, etc.
//
// Non fiable à 100% — l'utilisateur doit pouvoir corriger avant de valider.
// =========================================================================

import type { ParsedCV } from './parse-cv';

type Seniority = NonNullable<NonNullable<ParsedCV['identity']>['seniority']>;

const SENIORITY_KEYWORDS: Array<[RegExp, Seniority]> = [
  [/\barchitect(e|o)\b/i, 'architect'],
  [/\b(tech|team|scrum)\s*lead\b|\blead\s+(developer|dev|engineer|qa|data)\b/i, 'lead'],
  [/\bexpert\b/i, 'expert'],
  [/\bsenior\b/i, 'senior'],
  [/\b(confirm(é|e)|intermediate|medior)\b/i, 'confirmed'],
  [/\b(junior|débutant|graduate|d[ée]butant)\b/i, 'junior'],
];

const CITY_HINTS = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre',
  'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes',
  'Villeurbanne', 'Clermont-Ferrand', 'Saint-Denis', 'Aix-en-Provence',
  'Brest', 'Le Mans', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan',
  'Boulogne-Billancourt', 'Orléans', 'Metz', 'Besançon', 'Rouen', 'Caen',
  'Nogent-sur-Oise', 'Compiègne', 'Creil', 'Beauvais', 'Cergy', 'Versailles',
  'Nanterre', 'Saint-Denis', 'Montreuil', 'Courbevoie', 'Vitry-sur-Seine',
  'Créteil', 'Colombes', 'Asnières-sur-Seine', 'Issy-les-Moulineaux',
  'Bruxelles', 'Genève', 'Lausanne', 'Zurich', 'Luxembourg',
  'Casablanca', 'Rabat', 'Tunis', 'Alger', 'Dakar', 'Abidjan',
  'London', 'Londres', 'Madrid', 'Barcelone', 'Rome', 'Milan', 'Berlin',
];

const JOB_TITLE_KEYWORDS = [
  'Développeur', 'Developer', 'Consultant', 'Ingénieur', 'Engineer',
  'Architecte', 'Architect', 'Chef de projet', 'Project Manager',
  'Product Owner', 'Product Manager', 'Scrum Master', 'Tech Lead',
  'DevOps', 'QA', 'Test', 'Data', 'Analyste', 'Analyst', 'Designer',
  'UI', 'UX', 'Full-Stack', 'Full Stack', 'Frontend', 'Backend',
  'Mobile', 'iOS', 'Android', 'Cloud', 'Sécurité', 'Security', 'SRE',
  'Business Analyst', 'BI', 'Data Scientist', 'ML Engineer', 'Admin',
  'Administrateur', 'Sysops', 'Manager', 'Lead', 'Senior', 'Confirmé',
];

function compactLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Extrait un bloc identité depuis le texte d'un CV — uniquement les
 * 1500 premiers caractères (entête + bloc coordonnées).
 */
export function extractIdentityFromText(text: string): ParsedCV['identity'] {
  if (!text) return null;
  const head = text.slice(0, 1500);

  // --- Email
  const emailMatch = head.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0] : null;

  // --- Téléphone (FR + international raisonnable)
  const phoneMatch = head.match(
    /(?:\+?33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4}|\+\d{1,3}[\s.\-]?\d{1,4}(?:[\s.\-]?\d{2,4}){2,4}/,
  );
  const phone = phoneMatch ? compactLine(phoneMatch[0]) : null;

  // --- LinkedIn
  const linkedinMatch = head.match(
    /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%/]+/i,
  );
  const linkedin_url = linkedinMatch ? linkedinMatch[0] : null;

  // --- Ville
  let city: string | null = null;
  for (const c of CITY_HINTS) {
    const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(head)) {
      city = c;
      break;
    }
  }

  // --- Prénom / Nom (meilleure chance : toute première ligne non vide,
  //     composée de 2-4 mots capitalisés, sans chiffres ni @)
  let first_name: string | null = null;
  let last_name: string | null = null;

  const lines = head
    .split(/\n+/)
    .map(compactLine)
    .filter((l) => l.length > 0 && l.length < 80);

  for (const line of lines.slice(0, 10)) {
    if (/[@0-9]/.test(line)) continue;
    // 2 à 4 mots, chaque mot commence par majuscule ; tolère apostrophes/tirets
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    const allCapish = words.every((w) => /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ'’\-]+$/.test(w));
    if (!allCapish) continue;
    // Exclu les pseudo titres du type "Curriculum Vitae"
    if (/curriculum|vitae|resume|profil|linkedin/i.test(line)) continue;
    first_name = words[0];
    last_name = words.slice(1).join(' ');
    break;
  }

  // --- Intitulé de poste : ligne suivant le nom, contenant un mot-clé métier
  let job_title: string | null = null;
  if (first_name) {
    const nameIdx = lines.findIndex((l) => l.startsWith(first_name ?? ''));
    if (nameIdx >= 0) {
      for (const cand of lines.slice(nameIdx + 1, nameIdx + 5)) {
        if (cand.length < 4 || cand.length > 120) continue;
        if (/[@0-9]{3,}/.test(cand)) continue;
        if (JOB_TITLE_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(cand))) {
          job_title = cand;
          break;
        }
      }
    }
  }

  // --- Séniorité : cherche un mot-clé dans l'entête ET dans le job_title
  let seniority: Seniority | null = null;
  const scopeForSeniority = `${job_title ?? ''}\n${head}`;
  for (const [re, s] of SENIORITY_KEYWORDS) {
    if (re.test(scopeForSeniority)) {
      seniority = s;
      break;
    }
  }

  return {
    first_name,
    last_name,
    job_title,
    sub_title: null,
    city,
    country: city ? 'FR' : null,
    seniority,
    years_experience: null,
    email,
    phone,
    linkedin_url,
  };
}
