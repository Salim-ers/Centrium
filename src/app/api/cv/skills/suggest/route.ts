import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { guardLlmRoute } from '@/lib/auth/llm-guard';

// =========================================================================
// /api/cv/skills/suggest — Analyse de plausibilité des compétences manquantes
// -------------------------------------------------------------------------
// POST { consultantId: string, missingSkills: string[], offerContext?: string }
//   → 200 { suggestions: Array<{ skill, verdict, reasoning, evidence, suggested_category }> }
//   → 400/401/404/503/5xx { error, message }
// -------------------------------------------------------------------------
// L'IA juge si une compétence manquante est plausiblement détenue par le
// consultant au vu de son profil (skills + expériences). Elle n'INVENTE PAS :
// si aucun élément du profil ne l'étaye, verdict = "unsupported".
// =========================================================================

export const runtime = 'nodejs';
export const maxDuration = 60;

const Verdict = z.enum(['strong', 'plausible', 'unsupported']);

const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      skill: z.string(),
      verdict: Verdict,
      reasoning: z.string(),
      evidence: z.array(z.string()),
      suggested_category: z.enum([
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
    }),
  ),
});

const SYSTEM_PROMPT = `Tu es un expert RH pour une ESN IT. Ton rôle : évaluer, pour chaque compétence demandée par une mission mais absente du profil d'un consultant, si elle est plausiblement détenue par le consultant au vu de son expérience et de ses compétences déjà listées.

RÈGLES ABSOLUES :
- Tu N'INVENTES JAMAIS. Tu juges uniquement sur la base de ce qui est écrit dans le profil.
- Si le profil n'étaye en rien la compétence demandée → verdict "unsupported". Pas de "peut-être", pas de "probablement par défaut".
- Une compétence prérequis très classique (ex: Windows 10/11 quand le consultant administre Active Directory, GPO et Windows Server) peut être "strong" si l'expérience l'implique clairement.
- Une compétence plausible mais non prouvée (ex: SharePoint quand il fait du M365) → "plausible".
- Cite toujours 1-3 évidences EXACTES tirées du profil (nom de client, tâche, compétence existante…). Si zéro évidence, verdict = "unsupported".

VERDICTS :
- "strong" : le profil prouve la compétence au-delà du doute raisonnable (expérience directe, technologie prérequis évidente, compétence parente présente).
- "plausible" : le profil rend la compétence probable sans la prouver. Nécessite confirmation du consultant.
- "unsupported" : rien dans le profil ne l'étaye. Ne pas ajouter au profil sans confirmation directe.

FORMAT :
- reasoning : 1-2 phrases sobres, en français, ton factuel.
- evidence : liste courte (1-3 items) de citations concrètes du profil.
- suggested_category : catégorie la plus logique parmi les 11 options fournies par le schéma.

SORTIE : strict JSON conforme au schéma. Rien d'autre.`;

export async function POST(req: NextRequest) {
  // Auth + rôle + rate-limit + gating abonnement — appels Claude payants.
  const guard = await guardLlmRoute({ bucket: 'cv-skills' });
  if ('response' in guard) return guard.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'api_key_missing',
        message: 'ANTHROPIC_API_KEY non configurée.',
      },
      { status: 503 },
    );
  }

  let body: { consultantId?: string; missingSkills?: string[]; offerContext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const consultantId = body.consultantId?.trim();
  const missingSkills = (body.missingSkills ?? [])
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);

  if (!consultantId) {
    return NextResponse.json(
      { error: 'missing_consultant', message: 'consultantId requis' },
      { status: 400 },
    );
  }
  if (missingSkills.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = createClient();

  const [consultantRes, skillsRes, expRes, eduRes] = await Promise.all([
    supabase.from('consultants').select('*').eq('id', consultantId).single(),
    supabase.from('consultant_skills').select('category, name').eq('consultant_id', consultantId),
    supabase
      .from('consultant_experiences')
      .select('client_name, role, start_date, end_date, context, tasks, environment')
      .eq('consultant_id', consultantId)
      .order('start_date', { ascending: false }),
    supabase
      .from('consultant_educations')
      .select('year, degree, institution')
      .eq('consultant_id', consultantId),
  ]);

  if (consultantRes.error || !consultantRes.data) {
    return NextResponse.json(
      {
        error: 'consultant_not_found',
        message: consultantRes.error?.message ?? 'Consultant introuvable',
      },
      { status: 404 },
    );
  }

  const profileText = buildProfileText({
    consultant: consultantRes.data,
    skills: skillsRes.data ?? [],
    experiences: expRes.data ?? [],
    educations: eduRes.data ?? [],
  });

  const userPrompt = `PROFIL DU CONSULTANT :
---
${profileText}
---

${body.offerContext ? `CONTEXTE DE LA MISSION :\n---\n${body.offerContext.slice(0, 2000)}\n---\n\n` : ''}COMPÉTENCES MANQUANTES À ÉVALUER :
${missingSkills.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Pour chacune des ${missingSkills.length} compétences ci-dessus, rends un verdict structuré selon le schéma.`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 3072,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { format: zodOutputFormat(SuggestionSchema as any) },
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

    return NextResponse.json({
      suggestions: response.parsed_output.suggestions,
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
    console.error('[cv/skills/suggest] unexpected error', e);
    return NextResponse.json(
      {
        error: 'unknown',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
      },
      { status: 500 },
    );
  }
}

type ProfileInput = {
  consultant: { first_name?: string; last_name?: string; job_title?: string; summary?: string };
  skills: Array<{ category?: string; name?: string }>;
  experiences: Array<{
    client_name?: string;
    role?: string;
    start_date?: string;
    end_date?: string | null;
    context?: string | null;
    tasks?: string[] | null;
    environment?: string[] | null;
  }>;
  educations: Array<{ year?: number; degree?: string; institution?: string | null }>;
};

function buildProfileText({ consultant, skills, experiences, educations }: ProfileInput): string {
  const lines: string[] = [];
  const name = [consultant.first_name, consultant.last_name].filter(Boolean).join(' ') || 'Consultant';
  lines.push(`Nom : ${name}`);
  if (consultant.job_title) lines.push(`Poste : ${consultant.job_title}`);
  if (consultant.summary) lines.push(`Résumé : ${consultant.summary}`);

  if (skills.length > 0) {
    lines.push('\nCompétences déclarées :');
    const byCat: Record<string, string[]> = {};
    for (const s of skills) {
      const c = s.category ?? 'tools';
      if (!byCat[c]) byCat[c] = [];
      if (s.name) byCat[c].push(s.name);
    }
    for (const [cat, names] of Object.entries(byCat)) {
      lines.push(`  - ${cat}: ${names.join(', ')}`);
    }
  }

  if (experiences.length > 0) {
    lines.push('\nExpériences :');
    for (const e of experiences.slice(0, 8)) {
      const period = `${e.start_date ?? '?'} → ${e.end_date ?? 'en cours'}`;
      lines.push(`  • ${e.client_name ?? '?'} — ${e.role ?? '?'} (${period})`);
      if (e.context) lines.push(`    Contexte : ${e.context}`);
      if (e.tasks && e.tasks.length > 0) {
        lines.push(`    Tâches : ${e.tasks.slice(0, 5).join(' ; ')}`);
      }
      if (e.environment && e.environment.length > 0) {
        lines.push(`    Environnement : ${e.environment.join(', ')}`);
      }
    }
  }

  if (educations.length > 0) {
    lines.push('\nFormation :');
    for (const ed of educations) {
      lines.push(`  - ${ed.year ?? '?'} — ${ed.degree ?? '?'}${ed.institution ? ` (${ed.institution})` : ''}`);
    }
  }

  return lines.join('\n');
}
