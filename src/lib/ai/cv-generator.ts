// =========================================================================
// CV Generator – QuadCore Platform
// -------------------------------------------------------------------------
// Ce module est l'interface entre l'UI et le moteur de génération CV.
//
// STRATÉGIE :
// - En mode MVP : mock déterministe ; aucune invention ; reformulation
//   basée sur des templates et un scoring de matching local.
// - En V1      : remplacer `generateCVContent` par un appel Claude API
//                en gardant STRICTEMENT les mêmes garde-fous.
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
};

// ---------- Matching local ----------

export function computeMatching(
  consultantSkills: ConsultantSkill[],
  offer: JobOffer | null | undefined
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

  const normalize = (s: string) => s.toLowerCase().trim();
  const skillNames = new Set(consultantSkills.map((s) => normalize(s.name)));

  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of required) {
    if (skillNames.has(normalize(req))) matched.push(req);
    else missing.push(req);
  }

  const matchedNice = niceToHave.filter((s) => skillNames.has(normalize(s)));

  const coverage = required.length === 0 ? 0.5 : matched.length / required.length;
  const bonus = niceToHave.length === 0 ? 0 : (matchedNice.length / niceToHave.length) * 0.15;

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

  const matching = computeMatching(skills, jobOffer);

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
    summary:
      consultant.summary && consultant.summary.trim().length > 0
        ? consultant.summary
        : buildExecutiveSummary(consultant, skills, experiences),
    skillCategories: groupSkillsByCategory(skills, jobOffer?.required_skills ?? []),
    experiences: experiences
      .slice()
      .sort((a, b) => (new Date(b.start_date).getTime()) - new Date(a.start_date).getTime())
      .map((exp) => ({
        ...exp,
        tasks: (exp.tasks ?? []).map(reformulateBullet),
      })),
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

  // templateId peut influencer le rendu (densité, sections visibles) côté React
  void templateId;

  return {
    content,
    matching: { ...matching, recommendation },
    warnings,
    guardrails,
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
