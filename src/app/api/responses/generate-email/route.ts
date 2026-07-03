import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { guardLlmRoute } from '@/lib/auth/llm-guard';

// =========================================================================
// /api/responses/generate-email — Pitch commercial IA pour une offre + consultant
// -------------------------------------------------------------------------
// POST { consultantId: string, offerId: string, tone?: 'sobre' | 'direct' | 'chaleureux' }
//   → 200 { subject, body, highlights[], model, usage }
//   → 400/404/503/5xx { error, message }
// -------------------------------------------------------------------------
// Le pitch est ancré sur les faits du profil consultant + l'offre. L'IA
// n'invente AUCUNE compétence, année, client ou certification.
// =========================================================================

export const runtime = 'nodejs';
export const maxDuration = 60;

const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  highlights: z.array(z.string()),
});

const SYSTEM_PROMPT = `Tu es un business manager d'une ESN IT française. Tu rédiges un email commercial pour positionner un consultant sur une offre client.

RÈGLES ABSOLUES :
- N'INVENTE JAMAIS une compétence, une expérience, un client, une certification, un niveau, une durée. Tout ce que tu écris doit être littéralement présent dans le profil fourni.
- Si une compétence demandée par l'offre n'apparaît pas dans le profil, ne prétends JAMAIS que le consultant la possède. Contourne en mentionnant une compétence adjacente réelle ou reste silencieux sur ce point.
- Pas de flatterie creuse, pas d'adjectifs gonflés ("rockstar", "ninja"). Ton sobre et factuel — typique d'une ESN française sérieuse.

STRUCTURE DE L'EMAIL (body) :
1. Accroche (1 phrase) : référence à l'offre (titre / contexte), positionnement du profil.
2. Points forts (3-5 bullets "• " par ligne) : chaque bullet ancre UNE compétence ou UNE expérience du profil qui répond à un besoin explicite de l'offre. Cite le client/contexte réel si utile.
3. Disponibilité + TJM : informations tirées du profil. Si dispo est "on_mission" avec une date de fin, mentionne-la ; sinon "disponible immédiatement" si status = "available".
4. Clôture (1 phrase) : proposition d'un échange ou de l'envoi du CV détaillé.

STRUCTURE DU SUJET (subject) :
- Format : "[Profil proposé] <Titre offre> — <Prénom> <NOM>, <job_title>"
- Ex : "[Profil proposé] QA Automation Sénior — Alex DUPONT, QA Automation Confirmé"

HIGHLIGHTS :
- Array de 3-5 strings, un par point fort clé. Sert d'aperçu visuel côté UI (pas répété dans le body).

FORMAT :
- Body en texte brut avec sauts de ligne \\n (pas de HTML, pas de markdown).
- Français soutenu, vouvoiement, signature non incluse (l'utilisateur ajoute la sienne).

SORTIE : strict JSON selon le schéma. Rien d'autre.`;

export async function POST(req: NextRequest) {
  // Auth + rôle + rate-limit + gating abonnement — appels Claude payants.
  const guard = await guardLlmRoute({ bucket: 'gen-email' });
  if ('response' in guard) return guard.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'api_key_missing', message: 'ANTHROPIC_API_KEY non configurée.' },
      { status: 503 },
    );
  }

  let body: { consultantId?: string; offerId?: string; tone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const consultantId = body.consultantId?.trim();
  const offerId = body.offerId?.trim();

  if (!consultantId || !offerId) {
    return NextResponse.json(
      { error: 'missing_params', message: 'consultantId et offerId requis' },
      { status: 400 },
    );
  }

  const supabase = createClient();

  const [consultantRes, skillsRes, expRes, eduRes, offerRes] = await Promise.all([
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
    supabase.from('job_offers').select('*').eq('id', offerId).single(),
  ]);

  if (consultantRes.error || !consultantRes.data) {
    return NextResponse.json(
      { error: 'consultant_not_found', message: consultantRes.error?.message ?? 'Consultant introuvable' },
      { status: 404 },
    );
  }
  if (offerRes.error || !offerRes.data) {
    return NextResponse.json(
      { error: 'offer_not_found', message: offerRes.error?.message ?? 'Offre introuvable' },
      { status: 404 },
    );
  }

  const profileText = buildProfileText({
    consultant: consultantRes.data,
    skills: skillsRes.data ?? [],
    experiences: expRes.data ?? [],
    educations: eduRes.data ?? [],
  });

  const offerText = buildOfferText(offerRes.data);

  const toneLabel =
    body.tone === 'direct'
      ? 'direct et concis'
      : body.tone === 'chaleureux'
        ? 'chaleureux mais pro'
        : 'sobre et factuel';

  const userPrompt = `OFFRE CLIENT :
---
${offerText}
---

PROFIL DU CONSULTANT :
---
${profileText}
---

Ton demandé : ${toneLabel}.

Rédige le pitch commercial selon le schéma.`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { format: zodOutputFormat(EmailSchema as any) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        {
          error: 'parse_failed',
          message: 'Le modèle n\'a pas produit de JSON valide.',
          stop_reason: response.stop_reason,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      subject: response.parsed_output.subject,
      body: response.parsed_output.body,
      highlights: response.parsed_output.highlights,
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
    console.error('[responses/generate-email] unexpected error', e);
    return NextResponse.json(
      { error: 'unknown', message: e instanceof Error ? e.message : 'Erreur inconnue' },
      { status: 500 },
    );
  }
}

type ProfileInput = {
  consultant: {
    first_name?: string;
    last_name?: string;
    job_title?: string;
    seniority?: string;
    years_experience?: number;
    city?: string;
    daily_rate_eur?: number | null;
    status?: string;
    available_from?: string | null;
    current_client?: string | null;
    current_mission_end?: string | null;
    summary?: string | null;
    languages?: Array<{ code?: string; level?: string }>;
  };
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
  if (consultant.seniority) lines.push(`Séniorité : ${consultant.seniority}`);
  if (consultant.years_experience != null) lines.push(`Années d'expérience : ${consultant.years_experience}`);
  if (consultant.city) lines.push(`Localisation : ${consultant.city}`);
  if (consultant.daily_rate_eur != null) lines.push(`TJM cible : ${consultant.daily_rate_eur} €`);
  if (consultant.status) lines.push(`Statut : ${consultant.status}`);
  if (consultant.available_from) lines.push(`Disponible à partir de : ${consultant.available_from}`);
  if (consultant.current_client) lines.push(`Client actuel : ${consultant.current_client}`);
  if (consultant.current_mission_end) lines.push(`Fin de mission en cours : ${consultant.current_mission_end}`);
  if (consultant.summary) lines.push(`Résumé : ${consultant.summary}`);
  if (consultant.languages && consultant.languages.length > 0) {
    lines.push(
      `Langues : ${consultant.languages
        .map((l) => `${l.code}${l.level ? ` (${l.level})` : ''}`)
        .join(', ')}`,
    );
  }

  if (skills.length > 0) {
    lines.push('\nCompétences :');
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
    for (const e of experiences.slice(0, 6)) {
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
      lines.push(
        `  - ${ed.year ?? '?'} — ${ed.degree ?? '?'}${ed.institution ? ` (${ed.institution})` : ''}`,
      );
    }
  }

  return lines.join('\n');
}

type OfferInput = {
  title?: string;
  description?: string | null;
  required_skills?: string[];
  nice_to_have?: string[];
  seniority?: string | null;
  daily_rate_min?: number | null;
  daily_rate_max?: number | null;
  location?: string | null;
  remote_days?: number | null;
  start_date?: string | null;
  duration_months?: number | null;
  deadline?: string | null;
};

function buildOfferText(offer: OfferInput): string {
  const lines: string[] = [];
  if (offer.title) lines.push(`Titre : ${offer.title}`);
  if (offer.seniority) lines.push(`Séniorité : ${offer.seniority}`);
  if (offer.location) lines.push(`Localisation : ${offer.location}`);
  if (offer.remote_days != null) lines.push(`Télétravail : ${offer.remote_days} j/semaine`);
  if (offer.start_date) lines.push(`Démarrage : ${offer.start_date}`);
  if (offer.duration_months) lines.push(`Durée : ${offer.duration_months} mois`);
  if (offer.deadline) lines.push(`Deadline réponse : ${offer.deadline}`);
  if (offer.daily_rate_min || offer.daily_rate_max) {
    lines.push(
      `TJM : ${offer.daily_rate_min ?? '?'} - ${offer.daily_rate_max ?? '?'} €`,
    );
  }
  if (offer.required_skills && offer.required_skills.length > 0) {
    lines.push(`Compétences requises : ${offer.required_skills.join(', ')}`);
  }
  if (offer.nice_to_have && offer.nice_to_have.length > 0) {
    lines.push(`Nice-to-have : ${offer.nice_to_have.join(', ')}`);
  }
  if (offer.description) {
    lines.push(`\nDescription :\n${offer.description.slice(0, 3000)}`);
  }
  return lines.join('\n');
}
