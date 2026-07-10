-- =========================================================================
-- 091 — Écriture des tables commerciales réservée aux rôles internes
-- -------------------------------------------------------------------------
-- Les policies de 087 fençaient le consultant (lecture ET écriture) mais
-- laissaient TOUS les autres rôles écrire, y compris `viewer` — or `viewer`
-- est un rôle LECTURE SEULE par définition. On sépare donc :
--   · SELECT : tous les rôles internes (user_role() <> 'consultant')
--   · INSERT/UPDATE/DELETE : rôles opérationnels uniquement
--     (user_role() NOT IN ('consultant','viewer'))
-- Non-régressif pour admin / business_manager / recruiter / finance qui
-- continuent d'écrire ; seul `viewer` passe en lecture seule (comportement
-- attendu). Modèle identique à la table `consultants`.
-- =========================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies', 'contacts', 'job_offers', 'opportunities', 'tags']
  LOOP
    -- Retire la policy FOR ALL existante (nommée différemment selon la table).
    EXECUTE format('DROP POLICY IF EXISTS %I_org ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS offers_org ON job_offers');
    EXECUTE format('DROP POLICY IF EXISTS opps_org ON opportunities');

    EXECUTE format($f$
      CREATE POLICY %1$I_read ON %1$I
        FOR SELECT USING (
          organization_id = organization_id()
          AND user_role() <> 'consultant'::user_role
        )$f$, t);

    EXECUTE format($f$
      CREATE POLICY %1$I_insert ON %1$I
        FOR INSERT WITH CHECK (
          organization_id = organization_id()
          AND user_role() NOT IN ('consultant'::user_role, 'viewer'::user_role)
        )$f$, t);

    EXECUTE format($f$
      CREATE POLICY %1$I_update ON %1$I
        FOR UPDATE USING (
          organization_id = organization_id()
          AND user_role() NOT IN ('consultant'::user_role, 'viewer'::user_role)
        ) WITH CHECK (
          organization_id = organization_id()
          AND user_role() NOT IN ('consultant'::user_role, 'viewer'::user_role)
        )$f$, t);

    EXECUTE format($f$
      CREATE POLICY %1$I_delete ON %1$I
        FOR DELETE USING (
          organization_id = organization_id()
          AND user_role() NOT IN ('consultant'::user_role, 'viewer'::user_role)
        )$f$, t);
  END LOOP;
END $$;
