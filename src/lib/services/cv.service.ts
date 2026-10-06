import { createClient } from '@/lib/supabase/client';
import type { CVVersion, CVContent, CVTemplateId, ServiceResult } from '@/types';
import { generateCVContent, type GenerateCVInput } from '@/lib/ai/cv-generator';
import { consultantService } from './consultant.service';

export const cvService = {
  async generateAndSave(params: {
    consultantId: string;
    jobOfferId?: string | null;
    templateId: CVTemplateId;
    organizationId: string;
    versionLabel?: string;
  }): Promise<
    ServiceResult<{ cv: CVVersion; matching: { score: number; matchedSkills: string[]; missingSkills: string[] } }>
  > {
    const supabase = createClient();

    // 1. Récupérer consultant complet
    const { data: consultantData, error: cErr } = await consultantService.getById(params.consultantId);
    if (cErr || !consultantData) {
      return { data: null, error: cErr ?? new Error('Consultant introuvable') };
    }

    // 2. Récupérer l'offre si fournie
    let jobOffer = null;
    if (params.jobOfferId) {
      const { data } = await supabase
        .from('job_offers')
        .select('*')
        .eq('id', params.jobOfferId)
        .single();
      jobOffer = data;
    }

    // 3. Générer le contenu (mock AI ou futur LLM)
    const input: GenerateCVInput = {
      consultant: consultantData.consultant,
      skills: consultantData.skills,
      experiences: consultantData.experiences,
      educations: consultantData.educations,
      jobOffer,
      templateId: params.templateId,
    };

    const result = await generateCVContent(input);

    // 4. Enregistrer la version en base
    const { data: savedCV, error: saveErr } = await supabase
      .from('cv_versions')
      .insert({
        organization_id: params.organizationId,
        consultant_id: params.consultantId,
        template_id: params.templateId,
        job_offer_id: params.jobOfferId ?? null,
        version_label: params.versionLabel ?? `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        content: result.content,
        matching_score: result.matching.score,
        matched_skills: result.matching.matchedSkills,
        missing_skills: result.matching.missingSkills,
        warnings: result.warnings,
      })
      .select()
      .single();

    if (saveErr) return { data: null, error: saveErr };

    // 5. Log activité
    await supabase.from('activities').insert({
      organization_id: params.organizationId,
      entity_type: 'cv_version',
      entity_id: savedCV.id,
      action: 'cv_generated',
      metadata: { template: params.templateId, matching_score: result.matching.score },
    });

    return {
      data: { cv: savedCV as CVVersion, matching: result.matching },
      error: null,
    };
  },

  /**
   * Enregistre le dossier tel qu'il a été préparé (mise en page et retouches
   * comprises) : c'est la version envoyée au client. Le modèle réel est gardé
   * dans le contenu (`template`), la colonne n'acceptant que les modèles
   * historiques.
   */
  async saveVersion(params: {
    organizationId: string;
    consultantId: string;
    templateId: string;
    jobOfferId?: string | null;
    label: string;
    content: CVContent;
    score?: number | null;
    matchedSkills?: string[];
    missingSkills?: string[];
    warnings?: string[];
  }): Promise<ServiceResult<CVVersion>> {
    const label = params.label.trim().slice(0, 200);
    if (!label) return { data: null, error: new Error('Donnez un nom à la version') };
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const column: CVTemplateId = params.templateId === 'dense' || params.templateId === 'executive' ? params.templateId : 'standard';
    const { data, error } = await supabase
      .from('cv_versions')
      .insert({
        organization_id: params.organizationId,
        consultant_id: params.consultantId,
        template_id: column,
        job_offer_id: params.jobOfferId ?? null,
        version_label: label,
        content: { ...params.content, template: params.templateId },
        matching_score: params.score ?? null,
        matched_skills: params.matchedSkills ?? [],
        missing_skills: params.missingSkills ?? [],
        warnings: params.warnings ?? [],
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    await supabase.from('activities').insert({
      organization_id: params.organizationId,
      entity_type: 'consultant',
      entity_id: params.consultantId,
      action: 'dossier_saved',
      user_id: user?.id ?? null,
      actor_id: user?.id ?? null,
      details: { label, template: params.templateId, score: params.score ?? null },
    });
    return { data: data as CVVersion, error: null };
  },

  async listByConsultant(consultantId: string): Promise<ServiceResult<CVVersion[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cv_versions')
      .select('*')
      .eq('consultant_id', consultantId)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: data as CVVersion[], error: null };
  },

  async getById(id: string): Promise<ServiceResult<CVVersion>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cv_versions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error };
    return { data: data as CVVersion, error: null };
  },
};

// Preview sans enregistrement (pour la preview live)
export async function previewCV(input: GenerateCVInput): Promise<CVContent> {
  const result = await generateCVContent(input);
  return result.content;
}
