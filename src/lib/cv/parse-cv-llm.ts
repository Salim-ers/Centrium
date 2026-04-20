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

  // Essai LLM d'abord
  try {
    const res = await fetch('/api/cv/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
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
    warnings.push(
      `Appel IA échoué : ${e instanceof Error ? e.message : 'erreur réseau'} — bascule en extraction heuristique.`,
    );
  }

  // Fallback : parseur local
  const parsed = parseCVText(text);
  return { parsed, mode: 'heuristic', warnings };
}
