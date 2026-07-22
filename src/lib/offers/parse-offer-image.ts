'use client';

export type ParsedOffer = {
  title: string | null;
  description: string | null;
  required_skills: string[];
  nice_to_have: string[];
  seniority: 'junior' | 'confirmed' | 'senior' | 'expert' | 'lead' | 'architect' | null;
  daily_rate_min: number | null;
  daily_rate_max: number | null;
  location: string | null;
  remote_days: number | null;
  start_date: string | null;
  duration_months: number | null;
  deadline: string | null;
  // Fiche de poste — reformulé pour le PDF
  context: string | null;
  mission_purpose: string | null;
  tasks: string[];
  tech_stack: string[];
  profile_requirements: string[];
  working_conditions: string[];
  contract_kind: string | null;
  // Fiche de poste v2 (optionnels — anciens payloads IA ne les ont pas)
  work_mode?: 'onsite' | 'hybrid' | 'remote' | 'custom' | null;
  start_type?: 'date' | 'asap' | 'immediate' | 'tbd' | 'custom' | null;
  experience_label?: string | null;
};

export type ParseOfferImageResult = {
  parsed: ParsedOffer;
  warnings: string[];
};

export type ParseOfferInput = { file?: File; text?: string };

const CLIENT_TIMEOUT_MS = 75_000;

/**
 * Envoie une annonce d'AO/mission à Claude pour extraction + reformulation.
 * Accepte une image (screenshot), du texte brut collé, ou les deux à la fois.
 * Un des deux est requis — sinon throw.
 */
export async function parseOfferImage(
  input: ParseOfferInput | File,
): Promise<ParseOfferImageResult> {
  // Backwards-compat : un File seul = mode image, comme avant.
  const normalized: ParseOfferInput =
    input instanceof File ? { file: input } : input;

  if (!normalized.file && !normalized.text?.trim()) {
    throw new Error('Fournir une image OU du texte.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const fd = new FormData();
    if (normalized.file) fd.append('file', normalized.file);
    if (normalized.text) fd.append('text', normalized.text);

    const res = await fetch('/api/offers/parse-image', {
      method: 'POST',
      body: fd,
      signal: controller.signal,
    });

    if (res.ok) {
      const data = (await res.json()) as { parsed: ParsedOffer };
      return { parsed: data.parsed, warnings: [] };
    }

    const body = await res.json().catch(() => ({}));
    if (res.status === 503) {
      throw new Error(
        "IA non configurée — la lecture automatique des offres nécessite ANTHROPIC_API_KEY côté serveur.",
      );
    }
    throw new Error(
      `Lecture de l'annonce échouée (${res.status}) : ${body.message ?? body.error ?? 'erreur'}`,
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`IA trop lente (> ${Math.round(CLIENT_TIMEOUT_MS / 1000)}s).`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
