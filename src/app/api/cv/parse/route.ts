import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

// =========================================================================
// /api/cv/parse — Extraction structurée de CV via Claude API
// -------------------------------------------------------------------------
// POST { text: string }
//   → 200 { parsed: ParsedCV, mode: 'llm' }
//   → 503 { error: 'api_key_missing' } si ANTHROPIC_API_KEY absente
//   → 5xx { error: string }
// =========================================================================

export const runtime = 'nodejs';
export const maxDuration = 60;

// Schéma de sortie — aligné avec ParsedCV côté client (heuristique).
// Note : identity est un objet requis (non nullable) ; seuls ses champs
// internes sont nullables, ce qui produit un JSON-Schema simple que
// l'Anthropic SDK convertit sans crasher.
const ParsedCVSchema = z.object({
  identity: z.object({
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    job_title: z.string().nullable(),
    sub_title: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    seniority: z
      .enum(['junior', 'confirmed', 'senior', 'expert', 'lead', 'architect'])
      .nullable(),
    years_experience: z.number().int().min(0).max(60).nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    linkedin_url: z.string().nullable(),
  }),
  summary: z.string().nullable(),
  skills: z.array(
    z.object({
      category: z.enum([
        'languages',
        'frameworks',
        'automation',
        'testing',
        'databases',
        'cloud',
        'ci_cd',
        'tools',
        'methodologies',
        'data',
        'platforms',
      ]),
      name: z.string(),
      is_highlighted: z.boolean(),
    }),
  ),
  experiences: z.array(
    z.object({
      client_name: z.string(),
      role: z.string(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      context: z.string().nullable(),
      tasks: z.array(z.string()),
      environment: z.array(z.string()),
    }),
  ),
  educations: z.array(
    z.object({
      year: z.number().int(),
      degree: z.string(),
      institution: z.string().nullable(),
    }),
  ),
  languages: z.array(
    z.object({
      code: z.string(),
      // Le LLM renvoie parfois "Courant", "Fluent", "B2", "C1"… On accepte
      // une chaîne libre ici et on normalise côté serveur après parse.
      level: z.string(),
    }),
  ),
});

type LanguageLevel = 'Natif' | 'Bilingue' | 'Professionnel' | 'Intermédiaire' | 'Notions';

function normalizeLanguageLevel(raw: string): LanguageLevel {
  const v = raw.trim().toLowerCase();
  if (!v) return 'Professionnel';
  if (/(^|\b)(natif|native|maternelle|mother tongue|c2)(\b|$)/i.test(v)) return 'Natif';
  if (/(^|\b)(bilingue|bilingual|fluent|courant|fluently)(\b|$)/i.test(v)) return 'Bilingue';
  if (/(^|\b)(professionnel|professional|business|avancé|advanced|c1|b2)(\b|$)/i.test(v))
    return 'Professionnel';
  if (/(^|\b)(intermédiaire|intermediate|moyen|b1|a2)(\b|$)/i.test(v)) return 'Intermédiaire';
  if (/(^|\b)(notions|basic|débutant|beginner|elementary|a1)(\b|$)/i.test(v)) return 'Notions';
  return 'Professionnel';
}

// Prompt système stable → candidat idéal pour prompt caching
const SYSTEM_PROMPT = `Tu es un expert RH chargé d'extraire des données structurées depuis un CV en français (ou anglais) pour une ESN spécialisée en consulting IT.

RÈGLES ABSOLUES (garde-fous) :
- N'INVENTE JAMAIS une compétence, un client, une date, un diplôme, une certification, une langue, un rôle. Si l'information n'est pas explicite dans le CV, omets-la.
- Ne déduis pas. Ne suppose pas. Extrais uniquement ce qui est écrit.
- Si une date est ambiguë, mets-la à null plutôt que de deviner.

FORMAT DES CHAMPS :

0. identity (objet requis, chaque champ nullable) — carte d'identité du candidat, lue principalement dans l'entête et le bloc coordonnées :
   - first_name / last_name : prénom / nom du candidat. Cherche en tête de CV, puis dans les coordonnées. Si le CV n'affiche que des initiales, retourne null.
   - job_title : intitulé de poste principal (ex: "QA Automation Confirmé", "Ingénieure QA & Test Manager", "Tech Lead DevOps"). Regarde le titre du CV, le sous-titre, et la plus récente expérience.
   - sub_title : sous-titre bref (3-6 mots) résumant la stack / le domaine (ex: "Playwright · TypeScript · CI/CD").
   - city : ville de résidence ou ville principale de mission actuelle.
   - country : code ISO 2 lettres ("FR", "BE", "CH", "LU", "MA", "DE", "UK"…). Déduis-le de la ville ou de la mention du pays. Par défaut "FR" si le CV est en français et que la ville est française.
   - seniority : déduction combinée du nombre d'années d'expérience ET des mots-clés du titre :
       • "junior"   : 0-2 ans OU titre contient "Junior"
       • "confirmed": 3-5 ans OU titre contient "Confirmé"
       • "senior"   : 6-9 ans OU titre contient "Senior"
       • "expert"   : 10+ ans OU titre contient "Expert"
       • "lead"     : titre contient "Lead" / "Tech Lead" / "Team Lead" (prioritaire sur l'ancienneté)
       • "architect": titre contient "Architecte" / "Architect"
     Si aucun signal clair → null.
   - years_experience : nombre d'années d'expérience professionnelle. Priorité absolue :
       1) phrase explicite "X ans d'expérience" / "X years of experience" / "avec plus de X ans" → X
       2) sinon, calcule la somme des durées des expériences listées (arrondi entier)
       3) sinon null.
   - email : email professionnel du candidat.
   - phone : numéro de téléphone (format libre).
   - linkedin_url : URL LinkedIn complète.
   Tous ces champs sont INDIVIDUELLEMENT nullables. Ne jamais inventer.

1. summary (string | null)
   - Résumé exécutif : reprends le paragraphe "profil" / "à propos" / "résumé" du CV s'il existe.
   - Max 500 caractères, sur une seule ligne.
   - Si absent du CV, null.

2. skills (array) — compétences classées par catégorie :
   - category : "languages" (langages de programmation), "frameworks", "automation" (outils QA/auto), "testing" (assurance qualité), "databases", "cloud", "ci_cd" (devops/ci/cd), "tools" (éditeurs, Jira, Git...), "methodologies" (Agile/Scrum/SAFe...), "data" (BI, ETL, data science), "platforms" (Salesforce, SAP, Shopify...).
   - name : nom exact de la techno tel qu'écrit dans le CV (respect casse : "Playwright", "TypeScript", "SQL", "AWS"...). Entre 2 et 40 caractères.
   - is_highlighted : true pour les 3-5 compétences les plus mises en avant (mentionnées en début de CV, titre, sous-titre ou soulignées). false sinon.
   - Pas de doublons (même nom × même catégorie = une seule entrée).

3. experiences (array) — expériences professionnelles, triées de la plus récente à la plus ancienne :
   - client_name : nom du client final OU de l'entreprise employeur (ex: "LVMH – Dior", "BNP Paribas"). Max 200 caractères.
   - role : intitulé du poste (ex: "QA Automation Confirmé", "Développeur Full-Stack Senior"). Max 200 caractères.
   - start_date, end_date : format ISO "YYYY-MM-DD". Mois inconnu → "YYYY-01-01". "en cours" / "actuel" / "aujourd'hui" → end_date = null.
   - context : 1-2 phrases décrivant le projet / l'équipe / le secteur. Max 500 caractères. null si absent.
   - tasks : liste des bullet points / responsabilités, reformulés sobrement au mode nominal ou à l'infinitif ("Automatisation des tests E2E", "Rédaction de la stratégie QA"). Pas de "j'ai fait" ni "je suis responsable de". Max 15 items, chacun 10-200 chars.
   - environment : liste des technos/outils utilisés sur cette mission spécifique (ex: ["Playwright", "TypeScript", "GitHub Actions"]). Max 20 items.

4. educations (array) — formations, triées de la plus récente à la plus ancienne :
   - year : année d'obtention (ex: 2020). Entier entre 1970 et l'année actuelle + 1.
   - degree : intitulé du diplôme (ex: "Mastère Management et Conseil en SI"). Max 200 caractères.
   - institution : école / université. null si absent du CV.

5. languages (array) — langues parlées :
   - code : ISO 639-1 ("fr", "en", "es", "de", "it", "pt", "ar", "zh", "ja", "ru"...).
   - level : niveau d'après ce qui est écrit dans le CV :
     • "Natif" / "Native" / "Maternelle" / "C2" → "Natif"
     • "Bilingue" / "Bilingual" / "Fluent" / "Courant" → "Bilingue"
     • "Professionnel" / "Professional" / "Business" / "C1" / "B2" → "Professionnel"
     • "Intermédiaire" / "Intermediate" / "B1" / "A2" → "Intermédiaire"
     • "Notions" / "Basic" / "Débutant" / "A1" → "Notions"
     • Par défaut si ambigu → "Professionnel"

SORTIE : un objet JSON conforme au schéma fourni. Rien d'autre.`;

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

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text || text.length < 100) {
    return NextResponse.json(
      { error: 'text_too_short', message: 'Le texte du CV doit faire au moins 100 caractères.' },
      { status: 400 },
    );
  }

  // Coupe à 50 000 caractères (~12 500 tokens) pour limiter le coût
  const truncated = text.length > 50000 ? text.slice(0, 50000) : text;

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
          content: `CV à analyser (texte brut extrait d'un PDF ou DOCX) :\n\n---\n${truncated}\n---\n\nExtrais les données structurées selon le schéma.`,
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { format: zodOutputFormat(ParsedCVSchema as any) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        {
          error: 'parse_failed',
          message: 'Le modèle n\'a pas pu produire de JSON valide.',
          stop_reason: response.stop_reason,
        },
        { status: 502 },
      );
    }

    // Normalise les niveaux de langue : le LLM peut renvoyer "Courant",
    // "Fluent", "B2"… qui ne sont pas dans notre enum applicatif final.
    const parsed = response.parsed_output as {
      languages?: Array<{ code: string; level: string }>;
      [k: string]: unknown;
    };
    if (Array.isArray(parsed.languages)) {
      parsed.languages = parsed.languages.map((l) => ({
        code: l.code,
        level: normalizeLanguageLevel(l.level),
      }));
    }

    return NextResponse.json({
      parsed,
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
        {
          error: 'anthropic_api_error',
          status: e.status,
          message: e.message,
        },
        { status: e.status ?? 500 },
      );
    }
    console.error('[cv/parse] unexpected error', e);
    return NextResponse.json(
      {
        error: 'unknown',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
      },
      { status: 500 },
    );
  }
}
