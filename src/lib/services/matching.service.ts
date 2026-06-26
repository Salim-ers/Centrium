import { createClient } from '@/lib/supabase/client';
import type { Consultant, JobOffer, ConsultantSkill, ServiceResult } from '@/types';
import { computeMatchingV2, type ScoreBreakdown } from '@/lib/ai/matching/score';

export type MatchJustification = {
  pitch: string;
  confidence: 'high' | 'medium' | 'low';
  risks: string[];
};

export type MatchResult = {
  consultant: Consultant;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: 'recommend' | 'maybe' | 'not_recommended';
  /** Confiance locale calculée par le moteur (avant LLM). */
  confidence: 'high' | 'medium' | 'low';
  /** Breakdown détaillé des 7 composants (skills, séniorité, dispo, TJM, langues, location, nice-to-have). */
  breakdown: ScoreBreakdown['components'];
  /** Hard-gates déclenchés (ex: 'unavailable', 'seniority-mismatch', 'skills-too-low'). */
  gates: string[];
  /** Justification IA — peuplée à la demande pour le top N via /api/matching/justify. */
  justification?: MatchJustification | null;
};

export const matchingService = {
  async matchConsultantsToOffer(
    offerId: string
  ): Promise<ServiceResult<MatchResult[]>> {
    const supabase = createClient();

    const { data: offer, error: offerErr } = await supabase
      .from('job_offers')
      .select('*')
      .eq('id', offerId)
      .single();
    if (offerErr || !offer) {
      return { data: null, error: offerErr ?? new Error('Offre introuvable') };
    }

    // On charge AUSSI les consultants 'unavailable' : le moteur les classera
    // tout en bas via les hard-gates, mais on garde la visibilité (le BM peut
    // vouloir voir qui pourrait être pertinent même si pas libre tout de suite).
    const { data: consultants, error: cErr } = await supabase
      .from('consultants')
      .select('*')
      .eq('archived', false)
      .in('status', ['available', 'soon_available', 'on_mission', 'unavailable']);
    if (cErr) return { data: null, error: cErr };

    const consultantIds = (consultants ?? []).map((c) => c.id);
    // Pas de consultants → on évite l'IN clause vide qui plante côté
    // PostgREST et on renvoie une liste vide directement.
    if (consultantIds.length === 0) {
      return { data: [], error: null };
    }
    const { data: skills } = await supabase
      .from('consultant_skills')
      .select('*')
      .in('consultant_id', consultantIds);

    const skillsByConsultant = new Map<string, ConsultantSkill[]>();
    for (const s of (skills ?? []) as ConsultantSkill[]) {
      const arr = skillsByConsultant.get(s.consultant_id) ?? [];
      arr.push(s);
      skillsByConsultant.set(s.consultant_id, arr);
    }

    const results: MatchResult[] = (consultants as Consultant[]).map((c) => {
      const consultantSkills = skillsByConsultant.get(c.id) ?? [];
      const m = computeMatchingV2(c, consultantSkills, offer as JobOffer);
      return {
        consultant: c,
        score: m.score,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
        recommendation: m.recommendation,
        confidence: m.confidence,
        breakdown: m.components,
        gates: m.gates,
      };
    });

    // Tri principal : score desc.
    // Tri secondaire si égalité : (1) dispo (factor desc), (2) skills matchés desc,
    // (3) années d'XP desc. `?? 0` pour éviter NaN sur résultats legacy.
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const af = a.breakdown?.availability?.factor ?? 0;
      const bf = b.breakdown?.availability?.factor ?? 0;
      if (bf !== af) return bf - af;
      if (b.matchedSkills.length !== a.matchedSkills.length) {
        return b.matchedSkills.length - a.matchedSkills.length;
      }
      return (b.consultant.years_experience ?? 0) - (a.consultant.years_experience ?? 0);
    });

    return { data: results, error: null };
  },

  /**
   * Enrichit les N premiers résultats avec une justification LLM (Claude haiku).
   * Échec silencieux → les résultats restent affichables sans pitch IA.
   * Limité à 5 candidats max pour économiser les tokens.
   */
  async enrichTopWithJustification(
    offerId: string,
    results: MatchResult[],
    topN = 5
  ): Promise<MatchResult[]> {
    const top = results.slice(0, topN);
    if (top.length === 0) return results;

    try {
      const res = await fetch('/api/matching/justify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          candidates: top.map((r) => ({
            consultantId: r.consultant.id,
            scoreRaw: r.score,
            matchedSkills: r.matchedSkills,
            missingSkills: r.missingSkills,
          })),
        }),
      });
      if (!res.ok) return results;

      const json = (await res.json()) as {
        data?: { justifications?: Array<{ consultantId: string; justification: MatchJustification | null }> };
      };
      const byId = new Map<string, MatchJustification | null>();
      for (const item of json.data?.justifications ?? []) {
        byId.set(item.consultantId, item.justification ?? null);
      }

      return results.map((r) =>
        byId.has(r.consultant.id) ? { ...r, justification: byId.get(r.consultant.id) } : r
      );
    } catch {
      return results;
    }
  },
};
