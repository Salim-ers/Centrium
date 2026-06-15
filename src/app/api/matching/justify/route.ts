import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { generateMatchingJustification } from '@/lib/ai/matching-llm';
import type { Consultant, ConsultantSkill, JobOffer } from '@/types';

/**
 * POST /api/matching/justify
 *
 * Body : { offerId, candidates: Array<{ consultantId, scoreRaw, matchedSkills, missingSkills }> }
 *
 * Renvoie une justification LLM (pitch + confidence + risks) pour chaque
 * candidat. On limite à 5 candidats max pour éviter les tokens explosés
 * — le client est responsable de n'envoyer que son top 5.
 */

const candidateSchema = z.object({
  consultantId: z.string().uuid(),
  scoreRaw: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
});

const bodySchema = z.object({
  offerId: z.string().uuid(),
  candidates: z.array(candidateSchema).min(1).max(5),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { offerId, candidates } = parsed.data;

  const { data: offer, error: offerErr } = await supabase
    .from('job_offers')
    .select('*')
    .eq('id', offerId)
    .single();
  if (offerErr || !offer) {
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
  }

  const consultantIds = candidates.map((c) => c.consultantId);
  const [{ data: consultants }, { data: skills }] = await Promise.all([
    supabase.from('consultants').select('*').in('id', consultantIds),
    supabase.from('consultant_skills').select('*').in('consultant_id', consultantIds),
  ]);

  const skillsByConsultant = new Map<string, ConsultantSkill[]>();
  for (const s of (skills ?? []) as ConsultantSkill[]) {
    const arr = skillsByConsultant.get(s.consultant_id) ?? [];
    arr.push(s);
    skillsByConsultant.set(s.consultant_id, arr);
  }

  const consultantById = new Map<string, Consultant>();
  for (const c of (consultants ?? []) as Consultant[]) {
    consultantById.set(c.id, c);
  }

  const justifications = await Promise.all(
    candidates.map(async (cand) => {
      const consultant = consultantById.get(cand.consultantId);
      if (!consultant) return { consultantId: cand.consultantId, justification: null };

      const justification = await generateMatchingJustification({
        consultant,
        consultantSkills: skillsByConsultant.get(consultant.id) ?? [],
        offer: offer as JobOffer,
        scoreRaw: cand.scoreRaw,
        matchedSkills: cand.matchedSkills,
        missingSkills: cand.missingSkills,
      });

      return { consultantId: cand.consultantId, justification };
    })
  );

  return NextResponse.json({ data: { justifications } });
}
