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
};

export type ParseOfferImageResult = {
  parsed: ParsedOffer;
  warnings: string[];
};

const CLIENT_TIMEOUT_MS = 75_000;

export async function parseOfferImage(file: File): Promise<ParseOfferImageResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const fd = new FormData();
    fd.append('file', file);

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
      `Lecture de l'image échouée (${res.status}) : ${body.message ?? body.error ?? 'erreur'}`,
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
