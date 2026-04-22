'use client';

// Parser LLM : appelle /api/cv/parse (Claude API côté serveur).
// Fallback automatique vers le parseur heuristique si l'API n'est pas
// configurée (ANTHROPIC_API_KEY absente) ou échoue.

import type { ParsedCV } from './parse-cv';
import { parseCVText } from './parse-cv';

export type ParseResult = {
  parsed: ParsedCV;
  mode: 'llm' | 'heuristic';
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  warnings?: string[];
};

export async function parseCVSmart(text: string): Promise<ParseResult> {
  const warnings: string[] = [];

  // Essai LLM d'abord — avec timeout client pour éviter de geler l'UI
  // si l'API Anthropic ou le réseau est lent. Fallback heuristique au-delà.
  const CLIENT_TIMEOUT_MS = 75_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch('/api/cv/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        parsed: data.parsed as ParsedCV,
        mode: 'llm',
        model: data.model,
        usage: data.usage,
      };
    }

    // 503 = clé API manquante → fallback silencieux vers heuristique
    if (res.status === 503) {
      warnings.push(
        'Clé API Anthropic non configurée — extraction heuristique (moins précise). Ajoute ANTHROPIC_API_KEY dans .env.local pour activer l\'IA.',
      );
    } else {
      const body = await res.json().catch(() => ({}));
      warnings.push(
        `IA indisponible (${res.status}) : ${body.message ?? 'erreur'} — bascule en extraction heuristique.`,
      );
    }
  } catch (e) {
    const isAbort = e instanceof Error && e.name === 'AbortError';
    warnings.push(
      isAbort
        ? `IA trop lente (> ${Math.round(CLIENT_TIMEOUT_MS / 1000)}s) — bascule en extraction heuristique.`
        : `Appel IA échoué : ${e instanceof Error ? e.message : 'erreur réseau'} — bascule en extraction heuristique.`,
    );
  } finally {
    clearTimeout(timer);
  }

  // Fallback : parseur local
  const parsed = parseCVText(text);
  return { parsed, mode: 'heuristic', warnings };
}
