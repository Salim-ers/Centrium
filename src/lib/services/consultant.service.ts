import { createClient } from '@/lib/supabase/client';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
  ServiceResult,
} from '@/types';
import type { ConsultantInput } from '@/lib/validators';

export const consultantService = {
  async list(
    filters: {
      status?: string;
      seniority?: string;
      search?: string;
    } = {}
  ): Promise<ServiceResult<Consultant[]>> {
    const supabase = createClient();
    let query = supabase.from('consultants').select('*').eq('archived', false);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.seniority) query = query.eq('seniority', filters.seniority);
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Consultant[], error: null };
  },

  async getById(id: string): Promise<
    ServiceResult<{
      consultant: Consultant;
      skills: ConsultantSkill[];
      experiences: ConsultantExperience[];
      educations: ConsultantEducation[];
    }>
  > {
    const supabase = createClient();
    const [c, s, e, ed] = await Promise.all([
      supabase.from('consultants').select('*').eq('id', id).single(),
      supabase.from('consultant_skills').select('*').eq('consultant_id', id),
      supabase
        .from('consultant_experiences')
        .select('*')
        .eq('consultant_id', id)
        .order('start_date', { ascending: false }),
      supabase
        .from('consultant_educations')
        .select('*')
        .eq('consultant_id', id)
        .order('year', { ascending: false }),
    ]);

    if (c.error) return { data: null, error: c.error };

    return {
      data: {
        consultant: c.data as Consultant,
        skills: (s.data ?? []) as ConsultantSkill[],
        experiences: (e.data ?? []) as ConsultantExperience[],
        educations: (ed.data ?? []) as ConsultantEducation[],
      },
      error: null,
    };
  },

  async create(
    input: ConsultantInput,
    organizationId: string
  ): Promise<ServiceResult<Consultant>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultants')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Consultant, error: null };
  },

  async update(
    id: string,
    input: Partial<ConsultantInput>
  ): Promise<ServiceResult<Consultant>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultants')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Consultant, error: null };
  },

  async archive(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultants')
      .update({ archived: true, status: 'archived' })
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('consultants').delete().eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async addSkills(
    consultantId: string,
    skills: Array<{ category: string; name: string; is_highlighted?: boolean }>,
  ): Promise<ServiceResult<number>> {
    if (skills.length === 0) return { data: 0, error: null };
    const supabase = createClient();

    // Dédup contre l'existant (category+name, case-insensitive)
    const { data: existing } = await supabase
      .from('consultant_skills')
      .select('category, name')
      .eq('consultant_id', consultantId);
    const keys = new Set(
      (existing ?? []).map((s) => `${s.category}::${(s.name ?? '').toLowerCase()}`),
    );
    const toInsert = skills
      .filter((s) => s.category && s.name)
      .filter((s) => !keys.has(`${s.category}::${s.name.toLowerCase()}`))
      .map((s) => ({
        consultant_id: consultantId,
        category: s.category,
        name: s.name,
        is_highlighted: s.is_highlighted ?? false,
      }));

    if (toInsert.length === 0) return { data: 0, error: null };

    const { error } = await supabase.from('consultant_skills').insert(toInsert);
    if (error) return { data: null, error };
    return { data: toInsert.length, error: null };
  },
};
