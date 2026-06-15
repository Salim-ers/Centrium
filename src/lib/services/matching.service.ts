import { createClient } from '@/lib/supabase/client';
import type { Consultant, JobOffer, ConsultantSkill, ServiceResult } from '@/types';
import { computeMatching } from '@/lib/ai/cv-generator';

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

    // Récupérer consultants actifs (disponibles ou bientôt dispo en priorité)
    const { data: consultants, error: cErr } = await supabase
      .from('consultants')
      .select('*')
      .eq('archived', false)
      .in('status', ['available', 'soon_available', 'on_mission']);
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
      const matching = computeMatching(consultantSkills, offer as JobOffer);
      return {
        consultant: c,
        score: matching.score,
        matchedSkills: matching.matchedSkills,
        missingSkills: matching.missingSkills,
        recommendation:
          matching.score >= 80
            ? 'recommend'
            : matching.score >= 60
              ? 'maybe'
              : 'not_recommended',
      };
    });

    // Tri : score desc, puis dispo
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const availRank: Record<string, number> = {
        available: 0,
        soon_available: 1,
        on_mission: 2,
      };
      return (availRank[a.consultant.status] ?? 3) - (availRank[b.consultant.status] ?? 3);
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
