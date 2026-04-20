import { createClient } from '@/lib/supabase/client';
import type { ParsedCV } from './parse-cv';
import type { Consultant } from '@/types';

export type ApplyResult = {
  skillsAdded: number;
  experiencesAdded: number;
  educationsAdded: number;
  summaryUpdated: boolean;
  languagesUpdated: boolean;
};

/**
 * Merge-insert les données parsées dans la fiche consultant :
 * - skills : insert si la paire (category, name) n'existe pas
 * - experiences : insert si (client_name, start_date) n'existe pas
 * - educations : insert si (year, degree) n'existe pas
 * - summary : écrit uniquement si le consultant n'en a pas
 * - languages : fusionne avec l'existant
 */
export async function applyParsedCV(
  consultantId: string,
  parsed: ParsedCV,
): Promise<ApplyResult> {
  const supabase = createClient();
  const result: ApplyResult = {
    skillsAdded: 0,
    experiencesAdded: 0,
    educationsAdded: 0,
    summaryUpdated: false,
    languagesUpdated: false,
  };

  // Défense : parsed peut contenir des sections manquantes selon le parseur
  const safeSkills = parsed?.skills ?? [];
  const safeExperiences = parsed?.experiences ?? [];
  const safeEducations = parsed?.educations ?? [];
  const safeLanguages = parsed?.languages ?? [];

  // Charger consultant + existant
  const [{ data: consultant }, { data: existingSkills }, { data: existingExp }, { data: existingEdu }] =
    await Promise.all([
      supabase.from('consultants').select('*').eq('id', consultantId).maybeSingle(),
      supabase.from('consultant_skills').select('category, name').eq('consultant_id', consultantId),
      supabase
        .from('consultant_experiences')
        .select('client_name, start_date')
        .eq('consultant_id', consultantId),
      supabase.from('consultant_educations').select('year, degree').eq('consultant_id', consultantId),
    ]);

  if (!consultant) throw new Error(`Consultant ${consultantId} introuvable ou accès refusé (RLS)`);
  const c = consultant as Consultant;

  // --- Skills ---
  const existingSkillKeys = new Set(
    (existingSkills ?? []).map((s) => `${s.category}::${(s.name ?? '').toLowerCase()}`),
  );
  const newSkills = safeSkills
    .filter((s) => s && s.name && s.category)
    .filter(
      (s) => !existingSkillKeys.has(`${s.category}::${s.name.toLowerCase()}`),
    );
  if (newSkills.length > 0) {
    const { error } = await supabase
      .from('consultant_skills')
      .insert(newSkills.map((s) => ({ ...s, consultant_id: consultantId })));
    if (!error) result.skillsAdded = newSkills.length;
  }

  // --- Experiences ---
  const existingExpKeys = new Set(
    (existingExp ?? []).map(
      (e) => `${(e.client_name ?? '').toLowerCase()}::${e.start_date ?? ''}`,
    ),
  );
  const newExps = safeExperiences
    .filter((e) => e && e.client_name)
    .filter(
      (e) =>
        !existingExpKeys.has(`${e.client_name.toLowerCase()}::${e.start_date ?? ''}`),
    );
  if (newExps.length > 0) {
    const { error } = await supabase.from('consultant_experiences').insert(
      newExps.map((e, i) => ({
        consultant_id: consultantId,
        client_name: e.client_name,
        role: e.role ?? 'Consultant',
        start_date: e.start_date,
        end_date: e.end_date,
        context: e.context,
        tasks: e.tasks ?? [],
        environment: e.environment ?? [],
        order_index: i,
      })),
    );
    if (!error) result.experiencesAdded = newExps.length;
  }

  // --- Educations ---
  const existingEduKeys = new Set(
    (existingEdu ?? []).map((ed) => `${ed.year}::${(ed.degree ?? '').toLowerCase()}`),
  );
  const newEdus = safeEducations
    .filter((ed) => ed && ed.year && ed.degree)
    .filter((ed) => !existingEduKeys.has(`${ed.year}::${ed.degree.toLowerCase()}`));
  if (newEdus.length > 0) {
    const { error } = await supabase
      .from('consultant_educations')
      .insert(newEdus.map((ed) => ({ ...ed, consultant_id: consultantId })));
    if (!error) result.educationsAdded = newEdus.length;
  }

  // --- Summary + Languages ---
  const patch: Record<string, unknown> = {};
  if (parsed?.summary && (!c.summary || c.summary.trim().length < 50)) {
    patch.summary = parsed.summary;
    result.summaryUpdated = true;
  }
  if (safeLanguages.length > 0) {
    const existingCodes = new Set((c.languages ?? []).map((l) => l.code));
    const merged = [...(c.languages ?? [])];
    for (const lang of safeLanguages) {
      if (lang?.code && !existingCodes.has(lang.code)) merged.push(lang);
    }
    if (merged.length > (c.languages?.length ?? 0)) {
      patch.languages = merged;
      result.languagesUpdated = true;
    }
  }
  if (Object.keys(patch).length > 0) {
    await supabase.from('consultants').update(patch).eq('id', consultantId);
  }

  return result;
}
