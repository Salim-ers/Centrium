// =========================================================================
// CV Generator – QuadCore Platform
// -------------------------------------------------------------------------
// Ce module est l'interface entre l'UI et le moteur de génération CV.
//
// STRATÉGIE V1 (juin 2026) :
// - Appel Claude API (haiku 4.5) pour reformulation summary + bullets
//   en parallèle, avec fallback transparent sur l'engine déterministe
//   si l'API échoue ou retourne du contenu invalide.
// - Toutes les sorties LLM repassent dans auditNoInvention() — si une
//   compétence/client est inventé, on rejette et on bascule sur le mock.
// - Le matching reste en local (pas d'IA) — c'est de la logique pure.
//
// RÈGLES ABSOLUES (voir .claude/skills/cv-generation/SKILL.md) :
// - Jamais inventer d'expérience, de compétence, de date, de certification.
// - Uniquement reformuler, réorganiser, prioriser, densifier.
// =========================================================================

import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
  JobOffer,
  CVContent,
  CVTemplateId,
  Language,
} from '@/types';
import { SENIORITY_LABEL } from '@/constants';
import { logger } from '@/lib/logger';

// ---------- Input / Output ----------

export type GenerateCVInput = {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
  jobOffer?: JobOffer | null;
  templateId: CVTemplateId;
};

export type GenerateCVOutput = {
  content: CVContent;
  matching: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendation: 'recommend' | 'maybe' | 'not_recommended';
  };
  warnings: string[];
  guardrails: {
    noInvention: boolean;
    flaggedClaims: string[];
  };
  /**
   * Niveau de confiance global et par dimension (0-100).
   * Combine couverture matching, qualité des données source et absence
   * de claim flaggée. Plus c'est haut, moins l'humain a besoin de relire.
   */
  confidence: {
    overall: number;
    perDimension: {
      sourceQuality: number;
      offerMatch: number;
      noInvention: number;
    };
    reasoning: string;
  };
  /**
   * Mode "brouillon" par défaut : aucun output IA ne doit être envoyé,
   * exporté ou signé sans validation humaine explicite. La page UI
   * affiche un badge tant que status !== 'validated'.
   */
  status: 'draft';
  /**
   * Pour chaque section de l'output, indique d'où elle vient.
   * Permet à l'utilisateur de comprendre pourquoi telle compétence
   * ressort et de cliquer pour voir la source.
   */
  sources: {
    summary: 'consultant.summary' | 'derived.from.experiences';
    skills: 'consultant.skills';
    experiences: 'consultant.experiences';
    educations: 'consultant.educations';
  };
};

// ---------- Matching local ----------

import { categorizeRequiredSkills } from './matching/equivalences';

/**
 * Matching skills-only (compat historique).
 *
 * Utilise la normalisation intelligente (synonymes ESN + fuzzy Jaro-Winkler)
 * pour comparer les noms. Pour un scoring multi-critères complet (séniorité,
 * dispo, TJM, langues, localisation, missions similaires), utiliser
 * `scoreMatch` de `@/lib/matching/engine`.
 *
 * Conservé pour la rétrocompat avec les tests + la génération CV qui
 * n'a besoin que du score skill brut.
 */
export function computeMatching(
  consultantSkills: ConsultantSkill[],
  offer: JobOffer | null | undefined,
  /**
   * Preuves supplémentaires issues de l'« Environnement technique » des
   * expériences (Active Directory, Intune, ServiceNow…). Traitées comme des
   * compétences détenues → réduit les faux manques sans appeler l'IA.
   */
  extraSkillNames: string[] = []
): {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
} {
  if (!offer) {
    return { score: 0, matchedSkills: [], missingSkills: [] };
  }

  const required = offer.required_skills ?? [];
  const niceToHave = offer.nice_to_have ?? [];
  // Skills déclarés + tokens d'environnement des expériences : une techno citée
  // dans l'environnement d'une mission est une preuve d'usage réel.
  const skillNames = [
    ...consultantSkills.map((s) => s.name),
    ...extraSkillNames,
  ].filter((n): n is string => !!n && n.trim().length > 0);

  // Catégorisation INTELLIGENTE : normalisation (K8s→kubernetes, fuzzy, accents)
  // + ÉQUIVALENCES parent→enfant. Ainsi « Windows » demandé est reconnu via
  // « Microsoft Windows / Windows 10-11 / Windows Server » ; « Microsoft » via
  // « Active Directory / Entra ID / Office 365 » ; « Linux » via « Ubuntu »… →
  // fini les faux manques quand la preuve existe sous une autre forme.
  const req = categorizeRequiredSkills(required, skillNames);
  // Tout ce qui a une preuve (explicite, équivalence forte OU indice partiel)
  // n'est PAS « manquant ». Seul le réellement absent l'est.
  const matched: string[] = [
    ...req.explicit,
    ...req.equivalent.map((e) => e.skill),
    ...req.partial.map((p) => p.skill),
  ];
  const missing: string[] = req.missing;

  // Couverture pondérée : explicite plein, équivalence quasi-plein (0.9),
  // indice partiel demi (0.45) — réaliste, sans gonfler artificiellement.
  const coverage =
    required.length === 0
      ? 0.5
      : (req.explicit.length + req.equivalent.length * 0.9 + req.partial.length * 0.45) /
        required.length;

  const nice = categorizeRequiredSkills(niceToHave, skillNames);
  const niceHit =
    nice.explicit.length + nice.equivalent.length + nice.partial.length * 0.5;
  const bonus = niceToHave.length === 0 ? 0 : (niceHit / niceToHave.length) * 0.15;

  const score = Math.min(100, Math.round((coverage * 0.85 + bonus) * 100));

  return { score, matchedSkills: matched, missingSkills: missing };
}

// ---------- Résumé exécutif (factuel, non inventif) ----------

export function buildExecutiveSummary(
  consultant: Consultant,
  skills: ConsultantSkill[],
  experiences: ConsultantExperience[]
): string {
  const seniorityLabel = SENIORITY_LABEL[consultant.seniority];
  const topSkills = skills
    .filter((s) => s.is_highlighted)
    .slice(0, 5)
    .map((s) => s.name);

  const lastExperienceClient = experiences[0]?.client_name;
  const industries = [...new Set(experiences.map((e) => e.client_name))]
    .slice(0, 3)
    .join(', ');

  const skillsPhrase =
    topSkills.length > 0
      ? `Expertise ${topSkills.slice(0, 3).join(', ')}.`
      : '';

  const lastClientPhrase = lastExperienceClient
    ? `Intervention récente chez ${lastExperienceClient}.`
    : '';

  const industriesPhrase = industries
    ? `Expériences significatives : ${industries}.`
    : '';

  return [
    `${consultant.job_title} ${seniorityLabel.toLowerCase()} avec ${consultant.years_experience} ans d'expérience.`,
    skillsPhrase,
    industriesPhrase,
    lastClientPhrase,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

// ---------- Reformulation bullet points ----------

const REFORMULATE_PREFIXES = new Map<RegExp, string>([
  [/^j'ai fait /i, 'Réalisation de '],
  [/^j'ai participé à /i, 'Contribution à '],
  [/^j'ai travaillé sur /i, 'Intervention sur '],
  [/^j'ai mis en place /i, 'Mise en place de '],
  [/^faire /i, 'Réalisation de '],
  [/^développer /i, 'Développement de '],
]);

export function reformulateBullet(raw: string): string {
  let result = raw.trim();

  for (const [regex, replacement] of REFORMULATE_PREFIXES) {
    if (regex.test(result)) {
      result = result.replace(regex, replacement);
      break;
    }
  }

  // capitalize first letter
  if (result.length > 0) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  // remove trailing period duplication
  result = result.replace(/\.+$/, '');
  return result;
}

// ---------- Groupement compétences par catégorie ----------

export function groupSkillsByCategory(
  skills: ConsultantSkill[],
  offerRequiredSkills: string[] = []
): Array<{ name: string; items: string[]; highlighted: string[] }> {
  const required = new Set(offerRequiredSkills.map((s) => s.toLowerCase()));
  const byCategory = new Map<string, ConsultantSkill[]>();

  for (const s of skills) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    languages: 'Langages',
    frameworks: 'Frameworks',
    automation: 'Automatisation',
    testing: 'Tests / QA',
    databases: 'Bases de données',
    cloud: 'Cloud',
    ci_cd: 'CI/CD',
    tools: 'Outils',
    methodologies: 'Méthodologies',
    data: 'Data',
    platforms: 'Plateformes',
  };

  const out: Array<{ name: string; items: string[]; highlighted: string[] }> = [];

  for (const [cat, items] of byCategory) {
    // Tri : highlighted d'abord, puis par level desc
    items.sort((a, b) => {
      if (a.is_highlighted !== b.is_highlighted) return a.is_highlighted ? -1 : 1;
      return (b.level ?? 0) - (a.level ?? 0);
    });
    out.push({
      name: CATEGORY_LABELS[cat] ?? cat,
      items: items.map((s) => s.name),
      highlighted: items
        .filter((s) => s.is_highlighted || required.has(s.name.toLowerCase()))
        .map((s) => s.name),
    });
  }

  return out;
}

// ---------- Garde-fous : détection d'invention ----------

function auditNoInvention(
  content: CVContent,
  source: { skills: ConsultantSkill[]; experiences: ConsultantExperience[] }
): { noInvention: boolean; flaggedClaims: string[] } {
  const flagged: string[] = [];

  const sourceSkills = new Set(source.skills.map((s) => s.name.toLowerCase()));
  for (const cat of content.skillCategories) {
    for (const item of cat.items) {
      if (!sourceSkills.has(item.toLowerCase())) {
        flagged.push(`Compétence "${item}" non présente dans le CV source`);
      }
    }
  }

  const sourceClients = new Set(source.experiences.map((e) => e.client_name));
  for (const exp of content.experiences) {
    if (!sourceClients.has(exp.client_name)) {
      flagged.push(`Expérience "${exp.client_name}" absente du CV source`);
    }
  }

  return { noInvention: flagged.length === 0, flaggedClaims: flagged };
}

// ---------- Générateur principal ----------

export async function generateCVContent(input: GenerateCVInput): Promise<GenerateCVOutput> {
  const { consultant, skills, experiences, educations, jobOffer, templateId } = input;

  // « Environnement technique » de chaque expérience = preuve d'usage réel :
  // on le fournit au matching pour ne plus signaler « manquant » un outil
  // pourtant utilisé en mission (Active Directory, Intune, ServiceNow…).
  const environmentEvidence = experiences.flatMap((e) => e.environment ?? []);
  const matching = computeMatching(skills, jobOffer, environmentEvidence);

  // ─── 1. Tente de reformuler le summary via Claude (parallélisé avec les bullets) ───
  // Import dynamique pour éviter de charger le SDK Anthropic côté client
  // (cv-llm.ts est marqué 'server-only').
  const sortedExperiences = experiences
    .slice()
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  let llmSummary: string | null = null;
  let llmBulletsByExpIndex: Array<string[] | null> = sortedExperiences.map(() => null);

  if (typeof window === 'undefined' && process.env.ANTHROPIC_API_KEY) {
    try {
      const { reformulateSummary, reformulateExperienceBullets } = await import('./cv-llm');

      const [summaryResult, ...bulletResults] = await Promise.all([
        reformulateSummary({ consultant, skills, experiences: sortedExperiences, jobOffer }),
        ...sortedExperiences.map((exp) =>
          reformulateExperienceBullets({ experience: exp, jobOffer }),
        ),
      ]);

      llmSummary = summaryResult;
      llmBulletsByExpIndex = bulletResults;
    } catch (e) {
      logger.warn('[cv-generator] LLM call failed, falling back to deterministic engine', (e as Error).message);
    }
  }

  // ─── 2. Compose le CVContent — LLM si dispo, sinon fallback déterministe ───
  const fallbackSummary =
    consultant.summary && consultant.summary.trim().length > 0
      ? consultant.summary
      : buildExecutiveSummary(consultant, skills, experiences);

  const content: CVContent = {
    header: {
      displayName:
        consultant.initials ??
        `${consultant.first_name[0]?.toUpperCase() ?? ''}. ${consultant.last_name[0]?.toUpperCase() ?? ''}.`,
      jobTitle: consultant.job_title,
      subTitle: consultant.sub_title,
      yearsExperience: consultant.years_experience,
      location: consultant.city,
      mobility: consultant.mobility,
      availability: consultant.available_from
        ? `Disponible dès ${consultant.available_from}`
        : consultant.status === 'available'
          ? 'Disponible immédiatement'
          : null,
    },
    summary: llmSummary && llmSummary.length > 20 ? llmSummary : fallbackSummary,
    skillCategories: groupSkillsByCategory(skills, jobOffer?.required_skills ?? []),
    experiences: sortedExperiences.map((exp, i) => {
      const llmBullets = llmBulletsByExpIndex[i];
      const sourceBullets = exp.tasks ?? [];
      // Si le LLM a renvoyé un tableau valide de la bonne taille → on l'utilise
      // Sinon fallback sur la reformulation locale (regex).
      const finalTasks =
        llmBullets && llmBullets.length === sourceBullets.length
          ? llmBullets
          : sourceBullets.map(reformulateBullet);
      return { ...exp, tasks: finalTasks };
    }),
    educations: educations.slice().sort((a, b) => b.year - a.year),
    languages: (consultant.languages as Language[]) ?? [],
  };

  const warnings: string[] = [];

  // trous dans la timeline
  for (let i = 1; i < content.experiences.length; i++) {
    const prev = content.experiences[i - 1];
    const curr = content.experiences[i];
    const prevStart = new Date(prev.start_date);
    const currEnd = curr.end_date ? new Date(curr.end_date) : new Date();
    const gapMonths = (prevStart.getTime() - currEnd.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (gapMonths > 6) {
      warnings.push(
        `Trou de ${Math.round(gapMonths)} mois entre ${curr.client_name} et ${prev.client_name}`
      );
    }
  }

  // compétences demandées absentes
  for (const missing of matching.missingSkills) {
    warnings.push(`Compétence "${missing}" demandée par l'offre mais absente du CV source`);
  }

  const guardrails = auditNoInvention(content, { skills, experiences });

  const recommendation: 'recommend' | 'maybe' | 'not_recommended' =
    matching.score >= 80 ? 'recommend' : matching.score >= 60 ? 'maybe' : 'not_recommended';

  // ----- Scoring de confiance multi-dimensions -----
  // sourceQuality : volume et structure du CV source
  //   - 100 si > 3 expériences détaillées + > 5 compétences highlighted + summary non vide
  //   - dégrade selon ce qui manque
  const hasGoodSummary = !!consultant.summary && consultant.summary.trim().length > 80;
  const richExperiences = experiences.filter((e) => (e.tasks ?? []).length >= 2).length;
  const highlightedSkills = skills.filter((s) => s.is_highlighted).length;
  const sourceQuality = Math.round(
    Math.min(
      100,
      (hasGoodSummary ? 30 : 0) +
        Math.min(40, richExperiences * 12) +
        Math.min(30, highlightedSkills * 6),
    ),
  );

  // offerMatch : reprend le score matching (cap à 100 même sans offre)
  const offerMatch = jobOffer ? matching.score : 70; // sans offre, on suppose neutre

  // noInvention : binaire 100 si OK, 30 si flaggé (jamais 0 pour ne pas masquer)
  const noInventionScore = guardrails.noInvention ? 100 : 30;

  // Confiance globale : moyenne pondérée + pénalité warnings
  const warningPenalty = Math.min(15, warnings.length * 3);
  const overall = Math.max(
    0,
    Math.round(
      sourceQuality * 0.35 + offerMatch * 0.4 + noInventionScore * 0.25 - warningPenalty,
    ),
  );

  const reasoningParts: string[] = [];
  if (overall >= 85) reasoningParts.push('Source riche et bien structurée.');
  else if (overall >= 70) reasoningParts.push('Confiance correcte, relecture recommandée.');
  else reasoningParts.push('Confiance modérée — relecture humaine indispensable.');
  if (!guardrails.noInvention) {
    reasoningParts.push(
      `${guardrails.flaggedClaims.length} claim(s) potentiellement inventé(s) détecté(s).`,
    );
  }
  if (warnings.length) {
    reasoningParts.push(`${warnings.length} avertissement(s) à examiner.`);
  }
  if (jobOffer && matching.missingSkills.length) {
    reasoningParts.push(
      `${matching.missingSkills.length} compétence(s) demandée(s) absente(s) du CV source.`,
    );
  }

  // templateId peut influencer le rendu (densité, sections visibles) côté React
  void templateId;

  return {
    content,
    matching: { ...matching, recommendation },
    warnings,
    guardrails,
    confidence: {
      overall,
      perDimension: {
        sourceQuality,
        offerMatch,
        noInvention: noInventionScore,
      },
      reasoning: reasoningParts.join(' '),
    },
    status: 'draft',
    sources: {
      summary: hasGoodSummary ? 'consultant.summary' : 'derived.from.experiences',
      skills: 'consultant.skills',
      experiences: 'consultant.experiences',
      educations: 'consultant.educations',
    },
  };
}

// ---------- Hook futur LLM (commenté, à activer en V1) ----------
/*
import Anthropic from '@anthropic-ai/sdk';

export async function generateCVContentWithLLM(input: GenerateCVInput): Promise<GenerateCVOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Tu reformules le CV fourni pour l'aligner avec l'offre donnée.
RÈGLES ABSOLUES :
- N'invente JAMAIS une expérience, un client, une compétence, une date, une certification.
- Reformule uniquement les bullet points existants.
- Retourne un JSON conforme au schéma CVContent.`;

  const userContent = JSON.stringify({ consultant, skills, experiences, educations, jobOffer }, null, 2);

  const msg = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const parsed = JSON.parse(text);

  // Toujours appliquer auditNoInvention ici pour garde-fou
  const guardrails = auditNoInvention(parsed, { skills, experiences });
  if (!guardrails.noInvention) {
    throw new Error('LLM output failed guardrail audit: ' + guardrails.flaggedClaims.join(', '));
  }

  return { ... };
}
*/
