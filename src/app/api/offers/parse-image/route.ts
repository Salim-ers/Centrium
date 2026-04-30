import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

// =========================================================================
// /api/offers/parse-image — Extraction structurée d'une offre depuis screenshot
// -------------------------------------------------------------------------
// POST multipart/form-data { file: PNG | JPEG | WebP }
//   → 200 { parsed: ParsedOffer, mode: 'llm', model, usage }
//   → 503 { error: 'api_key_missing' } si ANTHROPIC_API_KEY absente
//   → 4xx/5xx { error: string }
// =========================================================================

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
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
});

const SYSTEM_PROMPT = `Tu es un expert RH chargé d'extraire des données structurées depuis une capture d'écran d'appel d'offres / mission IT (français ou anglais) pour une ESN.

RÈGLES ABSOLUES :
- N'invente RIEN. Si l'information n'est pas explicitement visible sur l'image, mets le champ à null (ou liste vide pour les arrays).
- Ne déduis pas, ne suppose pas. Tu peux uniquement reformuler très légèrement (ponctuation, casse) ce qui est écrit.
- Si une date est ambiguë (ex: "dès que possible", "ASAP"), mets-la à null.

FORMAT DES CHAMPS :

1. title (string | null) : intitulé de la mission tel qu'il apparaît en titre principal de l'offre.
   Exemples : "Consultant Cloud Operations", "Lead Dev Backend Java", "Business Analyst Finance".

2. description (string | null) : descriptif complet de la mission tel qu'écrit. Inclut le contexte, les missions/activités à réaliser, les compétences requises listées en prose, l'environnement technique mentionné dans le corps. Préserve les sauts de ligne et les listes à puces avec "- " en début de ligne. Max 6000 caractères.

3. required_skills (array de strings) : compétences techniques REQUISES extraites de l'offre (langages, frameworks, outils, plateformes).
   - Une compétence par item, nom court et exact tel qu'écrit (ex: "Java", "Spring Boot", "Kubernetes", "Terraform", "AWS", "PostgreSQL", "Playwright").
   - Pas de doublons. Pas de phrases entières. Max 30 items.
   - Inclure tout ce qui est listé dans une rubrique "compétences requises", "stack", "environnement technique", "must-have".

4. nice_to_have (array de strings) : compétences BONUS / nice-to-have / souhaitées si la rubrique existe explicitement (ex: "Plus", "Nice to have", "Bonus", "Atouts"). Sinon liste vide. Mêmes règles de format que required_skills.

5. seniority : niveau d'expérience demandé, déduit STRICTEMENT du texte :
   - "junior" : 0-2 ans OU mention explicite "Junior"
   - "confirmed" : 3-5 ans OU mention "Confirmé"
   - "senior" : 6-9 ans OU mention "Senior"
   - "expert" : 10+ ans OU mention "Expert"
   - "lead" : mention "Lead", "Tech Lead", "Team Lead"
   - "architect" : mention "Architecte" / "Architect"
   Si rien d'explicite → null.

6. daily_rate_min / daily_rate_max (number | null) : TJM en euros.
   - Si l'offre indique une fourchette ("400-500€", "entre 450 et 550€/j") → renseigne min et max.
   - Si une seule valeur → mets-la dans daily_rate_min, et daily_rate_max = null.
   - Si aucune valeur explicite → les deux à null. NE DEVINE PAS depuis la séniorité.

7. location (string | null) : ville ou département de la mission. Reprend ce qui est écrit (ex: "Paris", "92", "La Défense", "Lyon"). Si l'offre dit "Full remote" → "Full remote". Si rien → null.

8. remote_days (integer 0-5 | null) : nombre de jours de télétravail par semaine.
   - "3 jours TT/sem" → 3
   - "2j TT" → 2
   - "Full remote" / "100% remote" → 5
   - "Sur site" / "100% présentiel" → 0
   - Pas d'indication → null

9. start_date (string ISO "YYYY-MM-DD" | null) : date de début souhaitée.
   - Si l'offre indique une date précise → format ISO.
   - Si "ASAP", "dès que possible", "immédiat" → null (on ne devine pas).
   - Si juste un mois ("mai 2026") → "2026-05-01".

10. duration_months (integer | null) : durée de la mission en mois.
    - "6 mois" → 6, "1 an" → 12, "2 ans" → 24, "120 jours" → 6 (arrondi).
    - "Long terme" / "indéterminée" → null.

11. deadline (string ISO "YYYY-MM-DD" | null) : date limite de candidature / réponse si mentionnée. Sinon null.

SORTIE : un objet JSON conforme au schéma. Rien d'autre.`;

export async function POST(req: NextRequest) {
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'invalid_type', message: 'PNG, JPEG ou WebP uniquement.' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  const mediaType = file.type as 'image/png' | 'image/jpeg' | 'image/webp';

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
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: "Capture d'écran d'une offre / appel d'offres IT. Extrais les données structurées selon le schéma.",
            },
          ],
        },
      ],
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
    console.error('[offers/parse-image] unexpected error', e);
    return NextResponse.json(
      { error: 'unknown', message: e instanceof Error ? e.message : 'Erreur inconnue' },
      { status: 500 },
    );
  }
}
