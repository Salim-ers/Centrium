import { createClient } from '@/lib/supabase/client';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
  Language,
  ServiceResult,
} from '@/types';
import type { ConsultantInput } from '@/lib/validators';

export type SkillInput = {
  category: string;
  name: string;
  level?: number | null;
  years?: number | null;
  is_highlighted?: boolean;
};

export type ExperienceInput = {
  client_name: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  context?: string | null;
  tasks?: string[];
  environment?: string[];
  order_index?: number;
};

export type EducationInput = {
  year: number;
  degree: string;
  institution?: string | null;
};

export type ConsultantOwner = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export type ConsultantMissionRef = {
  id: string;
  title: string;
  status: string;
  job_offer_title: string | null;
};

export type ConsultantListItem = Consultant & {
  owner: ConsultantOwner | null;
  active_missions: ConsultantMissionRef[];
  has_portal: boolean;
};

export const consultantService = {
  async list(
    filters: {
      status?: string;
      seniority?: string;
      search?: string;
      /**
       * - true        → viviers uniquement
       * - false       → consultants actifs uniquement (défaut)
       * - 'all'       → les deux (matching, CV Optimizer…)
       * - undefined   → consultants actifs uniquement
       */
      is_prospect?: boolean | 'all';
      /**
       * - false / undefined → actifs uniquement (défaut)
       * - true              → archivés uniquement
       * - 'all'             → les deux
       */
      archived?: boolean | 'all';
    } = {}
  ): Promise<ServiceResult<ConsultantListItem[]>> {
    const supabase = createClient();
    let query = supabase.from('consultants').select(
      `*,
       owner:profiles!owner_id (id, first_name, last_name, email),
       portal:profiles!consultant_id (id),
       missions!consultant_id (
         id, title, status,
         job_offer:job_offers (title)
       )`,
    );
    if (filters.archived !== 'all') {
      query = query.eq('archived', filters.archived ?? false);
    }
    if (filters.is_prospect !== 'all') {
      query = query.eq('is_prospect', filters.is_prospect ?? false);
    }

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.seniority) query = query.eq('seniority', filters.seniority);
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return { data: null, error };

    const items: ConsultantListItem[] = (data ?? []).map((row: any) => {
      const { owner, missions, portal, ...consultant } = row;
      const activeMissions: ConsultantMissionRef[] = (missions ?? [])
        .filter((m: any) => m.status === 'active' || m.status === 'proposed')
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          job_offer_title: m.job_offer?.title ?? null,
        }));
      // portal est un array (relation 1-to-many implicite côté Supabase) :
      // si au moins un profile est lié, le consultant a un accès portail.
      const portalArr = Array.isArray(portal) ? portal : portal ? [portal] : [];
      return {
        ...(consultant as Consultant),
        owner: owner
          ? {
              id: owner.id,
              first_name: owner.first_name,
              last_name: owner.last_name,
              email: owner.email,
            }
          : null,
        active_missions: activeMissions,
        has_portal: portalArr.length > 0,
      };
    });
    return { data: items, error: null };
  },

  async listOrgOwners(organizationId: string): Promise<ServiceResult<ConsultantOwner[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('organization_id', organizationId)
      .eq('role', 'admin')
      .order('first_name', { ascending: true });
    if (error) return { data: null, error };
    return { data: (data ?? []) as ConsultantOwner[], error: null };
  },

  async updateOwner(
    consultantId: string,
    ownerId: string | null,
  ): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultants')
      .update({ owner_id: ownerId })
      .eq('id', consultantId);
    if (error) return { data: null, error };
    return { data: true, error: null };
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

  /**
   * Bascule is_prospect ↔ false. Utilisé quand on recrute un prospect :
   * il devient un consultant actif de l'organisation.
   */
  async promoteToConsultant(id: string): Promise<ServiceResult<Consultant>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultants')
      .update({ is_prospect: false })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as Consultant, error: null };
  },

  /** Inverse : consultant actif → vivier */
  async demoteToProspect(id: string): Promise<ServiceResult<Consultant>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultants')
      .update({ is_prospect: true })
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

  async unarchive(id: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultants')
      .update({ archived: false, status: 'available' })
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

  // ============ Mise à jour champs simples (résumé, mobilité, langues) ============

  async updateSummary(id: string, summary: string | null): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultants')
      .update({ summary: summary?.trim() || null })
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async updateMobility(id: string, mobility: string | null): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultants')
      .update({ mobility: mobility?.trim() || null })
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async updateLanguages(id: string, languages: Language[]): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultants')
      .update({ languages })
      .eq('id', id);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  // ============ Skills ============

  async createSkill(consultantId: string, input: SkillInput): Promise<ServiceResult<ConsultantSkill>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_skills')
      .insert({ ...input, consultant_id: consultantId })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as ConsultantSkill, error: null };
  },

  async updateSkill(skillId: string, input: Partial<SkillInput>): Promise<ServiceResult<ConsultantSkill>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_skills')
      .update(input)
      .eq('id', skillId)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as ConsultantSkill, error: null };
  },

  async deleteSkill(skillId: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('consultant_skills').delete().eq('id', skillId);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  // ============ Experiences ============

  async createExperience(
    consultantId: string,
    input: ExperienceInput,
  ): Promise<ServiceResult<ConsultantExperience>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_experiences')
      .insert({
        consultant_id: consultantId,
        client_name: input.client_name,
        role: input.role,
        start_date: input.start_date,
        end_date: input.end_date,
        context: input.context ?? null,
        tasks: input.tasks ?? [],
        environment: input.environment ?? [],
        order_index: input.order_index ?? 0,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as ConsultantExperience, error: null };
  },

  async updateExperience(
    expId: string,
    input: Partial<ExperienceInput>,
  ): Promise<ServiceResult<ConsultantExperience>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_experiences')
      .update(input)
      .eq('id', expId)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as ConsultantExperience, error: null };
  },

  async deleteExperience(expId: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('consultant_experiences').delete().eq('id', expId);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  // ============ Educations ============

  async createEducation(
    consultantId: string,
    input: EducationInput,
  ): Promise<ServiceResult<ConsultantEducation>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_educations')
      .insert({ ...input, consultant_id: consultantId })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as ConsultantEducation, error: null };
  },

  async updateEducation(
    eduId: string,
    input: Partial<EducationInput>,
  ): Promise<ServiceResult<ConsultantEducation>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_educations')
      .update(input)
      .eq('id', eduId)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as ConsultantEducation, error: null };
  },

  async deleteEducation(eduId: string): Promise<ServiceResult<boolean>> {
    const supabase = createClient();
    const { error } = await supabase.from('consultant_educations').delete().eq('id', eduId);
    if (error) return { data: null, error };
    return { data: true, error: null };
  },

  async addSkills(
    consultantId: string,
    skills: Array<{ category: string; name: string; is_highlighted?: boolean }>,
  ): Promise<ServiceResult<number>> {
    if (skills.length === 0) return { data: 0, error: null };
    // Passe par la route serveur (service_role) : dédup + RLS-safe
    try {
      const res = await fetch(`/api/consultants/${consultantId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: skills.filter((s) => s.category && s.name) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          data: null,
          error: { message: body.message ?? body.error ?? 'Ajout impossible' } as any,
        };
      }
      return { data: body.added ?? 0, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } as any };
    }
  },

  async removeSkillByName(
    consultantId: string,
    opts: { name: string; category?: string },
  ): Promise<ServiceResult<number>> {
    try {
      const qs = new URLSearchParams({ name: opts.name });
      if (opts.category) qs.set('category', opts.category);
      const res = await fetch(
        `/api/consultants/${consultantId}/skills?${qs.toString()}`,
        { method: 'DELETE' },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          data: null,
          error: { message: body.message ?? body.error ?? 'Suppression impossible' } as any,
        };
      }
      return { data: body.removed ?? 0, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } as any };
    }
  },
};
