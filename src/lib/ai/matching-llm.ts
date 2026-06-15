// NOTE : pas de `import 'server-only'` (cf. cv-llm.ts pour la justification).
// Ce module est uniquement appelé depuis /api/matching/justify (server-side),
// jamais importé par un Client Component. Le SDK Anthropic ne s'initialise
// pas côté client car process.env.ANTHROPIC_API_KEY est server-only.
import Anthropic from '@anthropic-ai/sdk';

import type { Consultant, JobOffer, ConsultantSkill } from '@/types';

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

  const { consultant, consultantSkills, offer, scoreRaw, matchedSkills, missingSkills } =
    args;

  const topSkills = consultantSkills
    .filter((s) => s.is_highlighted)
    .slice(0, 8)
    .map((s) => s.name)
    .join(', ');

  const systemPrompt = `Tu es un Business Manager senior d'ESN française avec 10+ ans d'expérience en staffing technique.

Ta mission : analyser le matching entre un consultant et une offre client, et produire en français :
1. Un PITCH de 2-3 phrases qui explique pourquoi ce profil est pertinent (à destination du BM qui va le présenter au client)
2. Une CONFIANCE globale (high / medium / low) qui synthétise le matching
3. Une liste de RISQUES résiduels à anticiper (compétences manquantes, écart séniorité, etc.)

RÈGLES ABSOLUES :
- INTERDICTION d'inventer une compétence, expérience, certification ou client non présents dans le profil source
- Reste factuel : ne dis pas "expert" si la séniorité est junior, ne dis pas "très expérimenté" si 2 ans d'XP
- Ton mesuré, pas commercial creux : pas de "excellent profil", "candidat exceptionnel"
- Si le matching est faible (< 50), assume-le et explique pourquoi
- Privilégie les faits chiffrés ("8 ans d'XP", "maîtrise 5/6 skills requis") aux adjectifs

FORMAT DE SORTIE : JSON strict, sans markdown, sans explication autour :
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
- Compétences highlighted : ${topSkills || '—'}
- Résumé : ${consultant.summary?.slice(0, 300) ?? '—'}

## MATCHING BRUT CALCULÉ
- Score : ${scoreRaw} / 100
- Compétences matchées (${matchedSkills.length}) : ${matchedSkills.join(', ') || '—'}
- Compétences manquantes (${missingSkills.length}) : ${missingSkills.join(', ') || '—'}

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
    // eslint-disable-next-line no-console
    console.warn('[matching-llm] failed', (e as Error).message);
    return null;
  }
}
