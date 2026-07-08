// NOTE : pas de `import 'server-only'` (cf. cv-llm.ts pour la justification).
// Ce module est uniquement appelé depuis /api/matching/justify (server-side),
// jamais importé par un Client Component. Le SDK Anthropic ne s'initialise
// pas côté client car process.env.ANTHROPIC_API_KEY est server-only.
import Anthropic from '@anthropic-ai/sdk';

import type { Consultant, JobOffer, ConsultantSkill } from '@/types';
import { logger } from '@/lib/logger';
import { categorizeRequiredSkills } from './matching/equivalences';

/**
 * Module LLM pour la JUSTIFICATION du matching consultant ↔ mission.
 *
 * Le score brut (set intersection skills) ne dit pas POURQUOI ce consultant
 * est pertinent. Le LLM ajoute une justification textuelle de 2-3 phrases
 * qui explique :
 *   - Quelles compétences clés du consultant matchent les besoins
 *   - Quel angle de pitch commercial mettre en avant
 *   - Quels risques résiduels (compétences manquantes, etc.)
 *
 * Garde-fou : la justification ne peut citer QUE des éléments PRÉSENTS
 * dans le profil source (skills, expériences, titre poste). Jamais
 * d'invention de mission ou de certification.
 *
 * Modèle : claude-haiku-4-5 (rapide, peu coûteux, suffisant pour 2-3 phrases)
 */

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MATCHING_MODEL ?? 'claude-haiku-4-5';

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export type MatchingJustification = {
  /** 2-3 phrases en français qui justifient pourquoi ce profil est pertinent. */
  pitch: string;
  /** Niveau de confiance global du matching (rebascule du score brut + qualité profil). */
  confidence: 'high' | 'medium' | 'low';
  /** Risques résiduels identifiés (compétences manquantes, expérience junior, etc.). */
  risks: string[];
};

export async function generateMatchingJustification(args: {
  consultant: Consultant;
  consultantSkills: ConsultantSkill[];
  offer: JobOffer;
  scoreRaw: number; // score 0-100 du computeMatching local
  matchedSkills: string[];
  missingSkills: string[];
}): Promise<MatchingJustification | null> {
  const client = getClient();
  if (!client) return null;

  // matchedSkills/missingSkills restent dans le contrat d'entrée (la route les
  // envoie) mais on ne s'en sert plus directement : la catégorisation ci-dessous
  // (synonymes + équivalences) est plus fiable que le brut du client.
  const { consultant, consultantSkills, offer, scoreRaw } = args;

  const allSkillNames = consultantSkills.map((s) => s.name);
  const topSkills = consultantSkills
    .filter((s) => s.is_highlighted)
    .slice(0, 10)
    .map((s) => s.name)
    .join(', ');
  const allSkillsStr = allSkillNames.slice(0, 40).join(', ');

  // Catégorisation FIABLE (synonymes + équivalences parent→enfant) des skills
  // requis vs le profil → on la donne au LLM pour qu'il ne signale pas de faux
  // manques (« Microsoft » couvert par Active Directory, etc.).
  const cat = categorizeRequiredSkills(offer.required_skills ?? [], allSkillNames);
  const fmtEvid = (list: Array<{ skill: string; evidence: string[] }>) =>
    list.map((e) => `${e.skill} ⇐ ${e.evidence.join(', ') || '—'}`).join(' | ');
  const analyseSkills = [
    `- EXPLICITES (${cat.explicit.length}) : ${cat.explicit.join(', ') || '—'}`,
    `- ÉQUIVALENTES, preuve forte (${cat.equivalent.length}) : ${fmtEvid(cat.equivalent) || '—'}`,
    `- PARTIELLES, à renforcer (${cat.partial.length}) : ${fmtEvid(cat.partial) || '—'}`,
    `- ABSENTES (${cat.missing.length}) : ${cat.missing.join(', ') || '—'}`,
  ].join('\n');

  const systemPrompt = `Tu es un Business Manager senior d'ESN française (10+ ans en staffing IT). Tu analyses le matching consultant ↔ offre avec une LOGIQUE MÉTIER, jamais une comparaison mot-à-mot.

RAISONNEMENT PAR ÉQUIVALENCE (une catégorisation fiable t'est fournie plus bas — appuie-toi dessus) :
- Une compétence requise est EXPLICITE (écrite telle quelle), ÉQUIVALENTE (prouvée par une techno/produit du même écosystème : Microsoft ⇐ Active Directory/Entra ID/Windows/O365 ; Linux ⇐ Ubuntu/Debian/RHEL ; Réseaux ⇐ routage/switching/VPN/Fortinet), PARTIELLE (indice à renforcer : Windows Server avec seulement Windows 10/11), ou ABSENTE.
- Ne signale JAMAIS comme manquante une compétence classée EXPLICITE ou ÉQUIVALENTE.
- N'assimile pas un produit proche à une équivalence complète (MongoDB ≠ SQL Server ; Windows 10 ≠ Windows Server) : ceux-là restent ABSENTS ou PARTIELS.

RÈGLES ABSOLUES :
- INTERDICTION d'inventer une compétence, expérience, certification ou client non présents dans le profil.
- Factuel : pas d'« expert » si séniorité junior, pas de superlatifs creux (« excellent profil », « candidat exceptionnel »).
- Chiffre quand tu peux (« 8 ans d'XP », « 5/6 skills requis couverts explicitement ou par équivalence »).
- Si le matching est faible, assume-le et explique pourquoi.

CE QUE TU PRODUIS (en français) :
1. PITCH : 2-3 phrases utiles au BM qui présentera le profil — points forts RÉELS + angle commercial, en valorisant les équivalences pertinentes.
2. RISQUES : uniquement les vrais manques — compétences ABSENTES critiques, compétences seulement PARTIELLES à sécuriser, écart de séniorité, ou disponibilité. N'invente pas de risque et NE liste PAS comme risque une compétence déjà couverte (explicite/équivalente).
3. CONFIANCE : "high" = beaucoup de preuves explicites ; "medium" = beaucoup d'équivalences/partiels ou profil peu détaillé ; "low" = peu de preuves ou score bas.

FORMAT DE SORTIE : JSON strict, sans markdown, sans texte autour :
{
  "pitch": "texte 2-3 phrases en français",
  "confidence": "high" | "medium" | "low",
  "risks": ["risque 1", "risque 2", ...]
}`;

  const userMessage = `## OFFRE CLIENT
- Titre : ${offer.title ?? '—'}
- Source : ${offer.source ?? '—'}
- Compétences requises : ${(offer.required_skills ?? []).join(', ') || '—'}
- Nice to have : ${(offer.nice_to_have ?? []).join(', ') || '—'}
- Contexte : ${offer.description?.slice(0, 600) ?? '—'}
- Séniorité demandée : ${offer.seniority ?? '—'}

## PROFIL CONSULTANT
- Intitulé poste : ${consultant.job_title}
- Séniorité : ${consultant.seniority}
- Années d'XP : ${consultant.years_experience}
- Disponibilité : ${consultant.status}
- Compétences mises en avant : ${topSkills || '—'}
- Toutes les compétences déclarées : ${allSkillsStr || '—'}
- Résumé : ${consultant.summary?.slice(0, 400) ?? '—'}

## ANALYSE DES COMPÉTENCES REQUISES (pré-calculée, fiable — respecte-la)
${analyseSkills}

## MATCHING BRUT CALCULÉ
- Score : ${scoreRaw} / 100

Produis le JSON maintenant.`;

  try {
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(jsonText) as Partial<MatchingJustification>;
    if (
      typeof parsed.pitch !== 'string' ||
      parsed.pitch.length < 20 ||
      !['high', 'medium', 'low'].includes(parsed.confidence as string)
    ) {
      return null;
    }

    return {
      pitch: parsed.pitch.trim(),
      confidence: parsed.confidence as 'high' | 'medium' | 'low',
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.filter((r): r is string => typeof r === 'string').slice(0, 5)
        : [],
    };
  } catch (e) {
    logger.warn('[matching-llm] failed', (e as Error).message);
    return null;
  }
}
