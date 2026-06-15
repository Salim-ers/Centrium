// NOTE : pas de `import 'server-only'` ici — cv-generator.ts importe ce module
// via dynamic import() gardé par `typeof window === 'undefined'`, et le SDK
// Anthropic n'est jamais initialisé côté client car process.env.ANTHROPIC_API_KEY
// est server-only (pas NEXT_PUBLIC_*) — getClient() retourne null sinon.
// Le `import 'server-only'` faisait throw Webpack à l'analyse du graph même
// pour les imports dynamiques, cassant le build du Client Component qui
// transite par cv-generator.
import Anthropic from '@anthropic-ai/sdk';

import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  JobOffer,
} from '@/types';

/**
 * Module LLM pour la génération de CV — appel réel à Claude API.
 *
 * RÈGLES ABSOLUES (cohérentes avec .claude/skills/cv-generation/SKILL.md) :
 *   1. Le LLM ne fait QUE REFORMULER le contenu existant
 *   2. AUCUNE invention de compétence, client, date, certification
 *   3. Chaque output est repassé dans l'auditeur `auditNoInvention()`
 *      avant d'être renvoyé à l'UI
 *
 * Le LLM travaille en 2 appels parallèles :
 *   - reformulateSummary : reformule le résumé exécutif (objet RH-friendly)
 *   - reformulateBullets : reformule les bullets de chaque expérience
 *
 * Si l'un échoue ou produit du contenu invalide → fallback transparent
 * sur le mock déterministe (jamais d'erreur visible utilisateur).
 *
 * Coût estimé : ~3-5k tokens input + ~1-2k tokens output par CV
 * Modèle : claude-haiku-4-5 (rapide, économique, suffisant pour reformulation)
 */

const ANTHROPIC_MODEL = process.env.ANTHROPIC_CV_MODEL ?? 'claude-haiku-4-5';

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// ────────────────────────────────────────────────────────────────────────
// 1. Reformulation du résumé exécutif
// ────────────────────────────────────────────────────────────────────────

export async function reformulateSummary(args: {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  jobOffer?: JobOffer | null;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const { consultant, skills, experiences, jobOffer } = args;

  const topSkills = skills
    .filter((s) => s.is_highlighted)
    .slice(0, 8)
    .map((s) => s.name)
    .join(', ');

  const recentClients = experiences
    .slice(0, 5)
    .map((e) => e.client_name)
    .join(', ');

  const offerContext = jobOffer
    ? `\n\nL'offre client cible :
- Titre : ${jobOffer.title ?? '—'}
- Compétences requises : ${(jobOffer.required_skills ?? []).join(', ') || '—'}
- Contexte : ${jobOffer.description?.slice(0, 500) ?? '—'}`
    : '';

  const systemPrompt = `Tu es un rédacteur expert spécialisé dans les CV de consultants pour ESN françaises.

Ta mission : produire un résumé exécutif de 3-4 phrases percutant, en français, pour le CV d'un consultant.

RÈGLES ABSOLUES — VIOLATIONS = RÉPONSE REJETÉE :
1. INTERDICTION ABSOLUE d'inventer une expérience, un client, une compétence ou une certification non listée
2. Tu peux uniquement réorganiser, prioriser, reformuler avec un wording professionnel
3. Tu peux densifier en regroupant des informations existantes
4. Pas d'adjectifs flatteurs vides ("excellent", "remarquable", "exceptionnel")
5. Pas de "passionné par", "à la pointe de", "innovant" — ton mesuré et factuel
6. Si l'offre client est fournie, oriente discrètement le wording vers les compétences attendues — SANS jamais inventer une compétence absente du profil source

FORMAT DE SORTIE : uniquement le texte du résumé (3-4 phrases max, ~50-80 mots), sans introduction, sans guillemets, sans markdown.`;

  const userMessage = `PROFIL CONSULTANT SOURCE :
- Intitulé poste : ${consultant.job_title}
- Séniorité : ${consultant.seniority}
- Années d'expérience : ${consultant.years_experience}
- Localisation : ${consultant.city ?? '—'}
- Mobilité : ${consultant.mobility ?? '—'}
- Compétences mises en avant : ${topSkills || '—'}
- Clients récents : ${recentClients || '—'}
- Résumé brut existant (peut être vide) : ${consultant.summary?.trim() || '—'}
${offerContext}

Produis le résumé exécutif maintenant.`;

  try {
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    return text.trim() || null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[cv-llm] reformulateSummary failed', (e as Error).message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2. Reformulation des bullets d'une expérience
// ────────────────────────────────────────────────────────────────────────

export async function reformulateExperienceBullets(args: {
  experience: ConsultantExperience;
  jobOffer?: JobOffer | null;
}): Promise<string[] | null> {
  const client = getClient();
  if (!client) return null;

  const { experience, jobOffer } = args;
  const sourceBullets = (experience.tasks ?? []).filter(Boolean);
  if (sourceBullets.length === 0) return null;

  const offerHint = jobOffer
    ? `\n\nContexte offre cible (à orienter le wording, SANS inventer) :
- Compétences requises : ${(jobOffer.required_skills ?? []).slice(0, 5).join(', ') || '—'}`
    : '';

  const systemPrompt = `Tu reformules des bullet points d'expérience pour un CV consultant ESN.

RÈGLES ABSOLUES :
1. Tu retournes EXACTEMENT le même nombre de bullet points que ce qu'on te fournit (UN POUR UN)
2. INTERDICTION d'inventer un fait, une technologie, un résultat chiffré qui n'est pas dans le bullet source
3. Tu réorganises pour le verbe d'action en début (Conception de... / Mise en place de... / Pilotage de...)
4. Pas de superlatifs creux ("optimisation majeure", "amélioration significative")
5. Si un bullet contient un chiffre, tu le gardes EXACT
6. Si un bullet est trop court (< 5 mots), tu le condenses sans inventer
7. Maximum 1 ligne par bullet (~15-25 mots)

FORMAT DE SORTIE : JSON array de strings, sans explication, sans markdown.
Exemple : ["Bullet 1 reformulé", "Bullet 2 reformulé"]`;

  const userMessage = `EXPÉRIENCE SOURCE :
- Client : ${experience.client_name}
- Rôle : ${experience.role}
- Contexte : ${experience.context?.slice(0, 300) ?? '—'}

BULLETS À REFORMULER (${sourceBullets.length} bullets, retourne EXACTEMENT ${sourceBullets.length} bullets dans le tableau JSON) :
${sourceBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}
${offerHint}

Retourne le JSON array maintenant.`;

  try {
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    // Le LLM peut wrapper en ```json ... ``` parfois — on strip
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return null;
    if (parsed.length !== sourceBullets.length) return null;

    const cleaned = parsed
      .map((b: unknown) => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean);

    return cleaned.length === sourceBullets.length ? cleaned : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[cv-llm] reformulateExperienceBullets failed', (e as Error).message);
    return null;
  }
}
