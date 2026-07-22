import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { guardLlmRoute } from '@/lib/auth/llm-guard';
import { logger } from '@/lib/logger';

// =========================================================================
// /api/offers/parse-image — Extraction structurée d'une offre / mission
// -------------------------------------------------------------------------
// Accepte :
//   - multipart/form-data avec `file` (PNG | JPEG | WebP)   → mode image
//   - multipart/form-data avec `text` (texte brut de l'AO)  → mode texte
//   - les deux ensemble (texte = contexte additionnel)      → mixte
//
// Réponses :
//   → 200 { parsed: ParsedOffer, mode: 'llm', model, usage }
//   → 503 { error: 'api_key_missing' } si ANTHROPIC_API_KEY absente
//   → 4xx/5xx { error: string }
//
// Note : on extrait à la fois les champs "AO" (skills, TJM, dates) ET les
// champs "fiche de poste" (contexte, finalité, missions, tech stack, profil,
// conditions d'exercice). Un seul aller-retour LLM = pas de double facturation.
// =========================================================================

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 30_000;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

const ParsedOfferSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  required_skills: z.array(z.string()),
  nice_to_have: z.array(z.string()),
  seniority: z
    .enum(['junior', 'confirmed', 'senior', 'expert', 'lead', 'architect'])
    .nullable(),
  daily_rate_min: z.number().min(0).nullable(),
  daily_rate_max: z.number().min(0).nullable(),
  location: z.string().nullable(),
  remote_days: z.number().int().min(0).max(5).nullable(),
  start_date: z.string().nullable(),
  duration_months: z.number().int().min(0).max(60).nullable(),
  deadline: z.string().nullable(),
  // === Fiche de poste — champs reformulés pour le PDF ===
  context: z.string().nullable(),
  mission_purpose: z.string().nullable(),
  tasks: z.array(z.string()),
  tech_stack: z.array(z.string()),
  profile_requirements: z.array(z.string()),
  working_conditions: z.array(z.string()),
  contract_kind: z.string().nullable(),
  // === Fiche de poste v2 — mode de travail / démarrage / expérience ===
  work_mode: z.enum(['onsite', 'hybrid', 'remote', 'custom']).nullable(),
  start_type: z.enum(['date', 'asap', 'immediate', 'tbd', 'custom']).nullable(),
  experience_label: z.string().nullable(),
});

const SYSTEM_PROMPT = `Tu es un expert RH chargé d'extraire des données structurées depuis une annonce IT (capture d'écran OU texte brut, français ou anglais) pour une ESN. Ces données alimentent à la fois la fiche de l'AO en base et la fiche de poste PDF envoyée aux consultants.

RÈGLES ABSOLUES :
- N'invente RIEN. Si l'information n'est pas dans l'annonce, mets le champ à null (ou liste vide pour les arrays).
- Tu peux reformuler très légèrement pour la clarté (ponctuation, casse, prose lisible) mais ne fabrique aucun fait.
- Pas de doublons inter-listes (une compétence n'apparaît qu'une seule fois).
- Pas de phrases entières dans les listes — items courts et activables.

FORMAT DES CHAMPS :

1. title (string | null) : intitulé de la mission tel qu'il apparaît en titre principal de l'annonce.
   Exemples : "Consultant Cloud Operations", "Lead Dev Backend Java", "Business Analyst Finance".

2. description (string | null) : descriptif complet de la mission tel qu'écrit. Préserve les sauts de ligne et les puces avec "- ". Max 6000 caractères.

3. required_skills (array de strings) : compétences techniques REQUISES (langages, frameworks, outils, plateformes).
   - Une compétence par item, nom court et exact (ex: "Java", "Spring Boot", "Kubernetes", "Terraform", "AWS", "PostgreSQL").
   - Pas de phrases. Max 30 items.

4. nice_to_have (array de strings) : compétences BONUS / nice-to-have si la rubrique existe explicitement.

5. seniority : niveau d'expérience demandé :
   - "junior" : 0-2 ans OU "Junior"
   - "confirmed" : 3-5 ans OU "Confirmé"
   - "senior" : 6-9 ans OU "Senior"
   - "expert" : 10+ ans OU "Expert"
   - "lead" : "Lead", "Tech Lead", "Team Lead"
   - "architect" : "Architecte" / "Architect"
   Si rien d'explicite → null.

6. daily_rate_min / daily_rate_max (number | null) : TJM en euros.
   - Fourchette → min et max remplis. Valeur seule → daily_rate_min, max = null. Rien → les deux à null.
   - NE DEVINE PAS depuis la séniorité.

7. location (string | null) : ville/département. "Full remote" si dit. Sinon null.

8. remote_days (integer 0-5 | null) : jours de TT/sem. "Full remote"/100% → 5. "Sur site" → 0. Rien → null.

9. start_date (string ISO "YYYY-MM-DD" | null). "ASAP" → null. "mai 2026" → "2026-05-01".

10. duration_months (integer | null) : durée en mois. "1 an" → 12. "120 jours" → 6. "indéterminée" → null.

11. deadline (string ISO | null) : date limite de candidature si mentionnée. Sinon null.

=== FICHE DE POSTE — champs reformulés pour le PDF envoyé au consultant ===

12. context (string | null) : 3-4 phrases synthétiques décrivant le client/projet, ton pro et clair, pour un consultant freelance. Reformule depuis le corps de l'annonce sans inventer. Max 800 caractères.

13. mission_purpose (string | null) : 1-2 phrases sur le but/objectif de la mission ("Garantir la haute disponibilité du SI…", "Conduire la refonte du back-office…"). Reformule à partir du texte. Max 400 caractères.

14. tasks (array de strings) : 5-8 missions principales reformulées en puces COURTES (max 100 caractères chacune), verbe d'action à l'infinitif au début.
   Exemple : "Implémenter les pipelines CI/CD GitLab", "Piloter la migration vers Kubernetes", "Animer les cérémonies SCRUM".

15. tech_stack (array de strings) : 5-8 technos clés à afficher en BADGES dans la fiche (noms courts uniquement, ex: "Kubernetes", "Terraform", "AWS", "PostgreSQL"). Souvent un sous-ensemble de required_skills, sélectionné pour communiquer.

16. profile_requirements (array de strings) : 4-8 exigences du profil recherché, DISTINCTES des technos. Couvre :
    - séniorité / années d'expérience ("8+ ans d'expérience en infrastructure cloud")
    - certifications ("AWS Certified Solutions Architect")
    - langues ("Anglais courant (écrit + oral)")
    - secteur ("Expérience banque/assurance impérative")
    - soft skills ("Autonomie et capacité à challenger les choix techniques")
    - contraintes ("Habilitation Confidentiel Défense")
   N'inclus PAS les technos pures (qui vont dans tech_stack / required_skills).
   Liste vide si rien d'extractible. Max 100 caractères par item.

17. working_conditions (array de strings) : 3-5 conditions d'exercice — lieu, télétravail, TJM, durée, contrat, contraintes spécifiques (astreintes, HNO, déplacements).
   Exemples : "Poste basé à Paris 9e — hybride 3j TT/sem.", "Mission 12 mois renouvelable — démarrage ASAP", "TJM 550-650 € HT / jour selon profil", "Astreintes 1 weekend / mois rémunérées".

18. contract_kind (string | null) : nature de la mission telle qu'écrite. Valeurs typiques : "Mission Freelance", "CDI", "Portage", "Pré-embauche", "Régie". Null si non spécifié.

19. work_mode ("onsite" | "hybrid" | "remote" | "custom" | null) : mode de travail.
    - "remote" si full remote / 100% télétravail.
    - "onsite" si présentiel/sur site strict.
    - "hybrid" si télétravail partiel (ex. "3j TT/sem", "hybride").
    - "custom" seulement si une modalité inhabituelle est décrite en toutes lettres.
    - null si rien d'explicite (NE DEVINE PAS un nombre de jours).

20. start_type ("date" | "asap" | "immediate" | "tbd" | "custom" | null) : nature du démarrage.
    - "asap" si "ASAP"/"dès que possible". "immediate" si "immédiat".
    - "tbd" si "à convenir"/"à définir". "date" si une date précise est donnée (remplis aussi start_date).
    - null si rien d'explicite. NE DEVINE PAS une date.

21. experience_label (string | null) : l'expérience EN CLAIR telle qu'écrite ("6-9 ans", "Senior", "5 ans minimum", "10+ ans"). Reformule fidèlement, n'invente pas de fourchette. Null si rien.

SORTIE : un objet JSON conforme au schéma. Rien d'autre.`;

export async function POST(req: NextRequest) {
  // Auth + rôle + rate-limit + gating abonnement — appels Claude payants.
  const guard = await guardLlmRoute({ bucket: 'offer-parse' });
  if ('response' in guard) return guard.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'api_key_missing',
        message:
          'ANTHROPIC_API_KEY non configurée. Ajoute la clé dans .env.local puis redémarre le serveur.',
      },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const textRaw = form?.get('text');
  const text = typeof textRaw === 'string' ? textRaw.trim() : '';

  const hasFile = file instanceof File && file.size > 0;
  const hasText = text.length > 0;

  if (!hasFile && !hasText) {
    return NextResponse.json(
      { error: 'missing_input', message: 'Fournir une image OU du texte.' },
      { status: 400 },
    );
  }

  // Validation image (si fournie)
  type ImagePart = Anthropic.ImageBlockParam;
  let imagePart: ImagePart | null = null;
  if (hasFile) {
    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(f.type)) {
      return NextResponse.json(
        { error: 'invalid_type', message: 'PNG, JPEG ou WebP uniquement.' },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await f.arrayBuffer());
    imagePart = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: f.type as 'image/png' | 'image/jpeg' | 'image/webp',
        data: buf.toString('base64'),
      },
    };
  }

  // Validation texte (si fourni)
  if (hasText && text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      {
        error: 'text_too_long',
        message: `Texte trop long (${text.length} car., max ${MAX_TEXT_CHARS}).`,
      },
      { status: 400 },
    );
  }

  // Construction des content blocks
  const userContent: Anthropic.ContentBlockParam[] = [];
  if (imagePart) userContent.push(imagePart);

  const textInstruction = hasText
    ? `Annonce (texte) :\n\n${text}\n\n${
        imagePart ? 'Une capture est également jointe — utilise les deux sources.' : ''
      }Analyse l'annonce et produis le JSON conforme au schéma.`
    : "Capture d'écran d'une offre IT. Extrais les données structurées selon le schéma.";

  userContent.push({ type: 'text', text: textInstruction });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { format: zodOutputFormat(ParsedOfferSchema as any) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        {
          error: 'parse_failed',
          message: "Le modèle n'a pas produit de JSON valide.",
          stop_reason: response.stop_reason,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      parsed: response.parsed_output,
      mode: 'llm',
      model: response.model,
      input_mode: hasFile && hasText ? 'mixed' : hasFile ? 'image' : 'text',
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read_input_tokens: response.usage.cache_read_input_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: 'anthropic_api_error', status: e.status, message: e.message },
        { status: e.status ?? 500 },
      );
    }
    logger.error('[offers/parse-image] unexpected error', e);
    return NextResponse.json(
      { error: 'unknown', message: e instanceof Error ? e.message : 'Erreur inconnue' },
      { status: 500 },
    );
  }
}
