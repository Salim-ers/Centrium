-- =========================================================================
-- 102_v2_consultant_portal.sql — Portail consultant : fiche en liste blanche
-- -------------------------------------------------------------------------
-- Jusqu'ici, la policy consultants_self_select donnait au consultant la
-- lecture de TOUTE sa ligne `consultants`, y compris des colonnes internes :
--   - internal_notes  (commentaires de l'équipe)
--   - daily_rate_eur  (TJM de vente de référence)
--   - cv_pushed*, is_prospect, owner_id (pilotage commercial)
-- La lecture passe désormais par portal_my_profile(), qui ne renvoie qu'une
-- liste blanche de colonnes. Toute nouvelle colonne ajoutée à `consultants`
-- reste donc invisible du portail tant qu'elle n'est pas ajoutée ici.
--
-- La mise à jour de la fiche par le consultant reste servie par
-- /api/portal/profile (liste blanche côté serveur) ; aucune policy d'écriture
-- n'est ajoutée.
--
-- Idempotente. Aucune donnée modifiée.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.portal_my_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    SELECT jsonb_object_agg(e.key, e.value)
      FROM jsonb_each(to_jsonb(c)) AS e
     WHERE e.key = ANY (ARRAY[
       'id', 'organization_id', 'first_name', 'last_name', 'initials',
       'email', 'phone', 'linkedin_url', 'job_title', 'sub_title',
       'seniority', 'years_experience', 'city', 'country', 'mobility',
       'languages', 'contract_type', 'status', 'available_from',
       'current_client', 'current_mission_end', 'summary', 'certifications',
       'address', 'postal_code', 'legal_status', 'company_name', 'siret',
       'vat_number', 'iban', 'bic', 'created_at', 'updated_at'
     ])
  )
    FROM public.consultants c
   WHERE c.id = public.consultant_id()
     AND public.consultant_id() IS NOT NULL
     AND public.user_role() = 'consultant'::user_role
$$;
REVOKE ALL ON FUNCTION public.portal_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_my_profile() TO authenticated;

-- Plus de lecture directe de la ligne complète par le consultant.
DROP POLICY IF EXISTS consultants_self_select ON public.consultants;
