-- =========================================================================
-- 079 — Archivage des CRA + purge mensuelle des archives (RÉELLEMENT active)
-- =========================================================================
-- Constat : la migration 062 (purge) n'a jamais été appliquée en prod, et les
-- colonnes d'archivage étaient incohérentes :
--   - archived + archived_at : invoices, job_offers, missions
--   - archived seul (pas de timestamp) : consultants, contacts, contracts
--   - ni l'un ni l'autre : opportunities (non archivable → hors purge)
--
-- Ce fichier :
--   1) Ajoute l'archivage aux CRA (timesheets) — tâche produit.
--   2) Ajoute archived_at là où il manque (consultants, contacts, contracts).
--   3) Pose un TRIGGER qui garde archived_at synchro avec le flag `archived`,
--      quelle que soit la façon dont la ligne est archivée (service, bulk,
--      SQL direct). Plus besoin de toucher chaque service.
--   4) (Re)crée la vue _archives_to_purge et la fonction de purge mensuelle
--      basées sur archived_at (> 30 jours), CRA inclus, opportunities exclues.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Colonnes manquantes
-- -------------------------------------------------------------------------
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.contacts    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.contracts   ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.timesheets.archived IS
  'CRA archivé — exclu des listes actives. Pas une suppression (donnée de facturation). Purge auto 30 j après archivage (archived_at).';

CREATE INDEX IF NOT EXISTS idx_timesheets_org_archived
  ON public.timesheets (organization_id, archived);

-- -------------------------------------------------------------------------
-- 2) Trigger : archived_at suit toujours le flag `archived`
--    archived=true & archived_at NULL  → archived_at = NOW()
--    archived=false                    → archived_at = NULL
--    (n'écrase PAS un archived_at déjà posé → ne réarme pas le compteur)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_archived_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.archived IS TRUE AND NEW.archived_at IS NULL THEN
    NEW.archived_at := NOW();
  ELSIF NEW.archived IS NOT TRUE THEN
    NEW.archived_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'consultants','contacts','contracts','invoices','job_offers','missions','timesheets'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_archived_at ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_sync_archived_at BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.sync_archived_at()', tbl);
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 3) Backfill : les lignes déjà archivées sans timestamp repartent sur une
--    fenêtre de 30 jours À PARTIR DE MAINTENANT (rien n'est purgé dans la
--    foulée — sécurité).
-- -------------------------------------------------------------------------
UPDATE public.consultants SET archived_at = NOW() WHERE archived IS TRUE AND archived_at IS NULL;
UPDATE public.contacts    SET archived_at = NOW() WHERE archived IS TRUE AND archived_at IS NULL;
UPDATE public.contracts   SET archived_at = NOW() WHERE archived IS TRUE AND archived_at IS NULL;
UPDATE public.invoices    SET archived_at = NOW() WHERE archived IS TRUE AND archived_at IS NULL;
UPDATE public.job_offers  SET archived_at = NOW() WHERE archived IS TRUE AND archived_at IS NULL;
UPDATE public.missions    SET archived_at = NOW() WHERE archived IS TRUE AND archived_at IS NULL;

-- -------------------------------------------------------------------------
-- 4) Vue des entités à purger (archivées depuis > 30 jours)
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW public._archives_to_purge AS
SELECT 'consultants' AS entity_type, id, organization_id, archived_at, first_name || ' ' || last_name AS label
FROM consultants
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'missions', id, organization_id, archived_at, COALESCE(title, 'Mission ' || id::text)
FROM missions
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'job_offers', id, organization_id, archived_at, COALESCE(title, 'Offre ' || id::text)
FROM job_offers
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'contacts', id, organization_id, archived_at, first_name || ' ' || last_name
FROM contacts
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'invoices', id, organization_id, archived_at, invoice_number
FROM invoices
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'contracts', id, organization_id, archived_at, COALESCE(title, contract_number, 'Contrat ' || id::text)
FROM contracts
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'timesheets', id, organization_id, archived_at,
       'CRA ' || period_month::text || '/' || period_year::text
FROM timesheets
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';

COMMENT ON VIEW public._archives_to_purge IS
  'Entités archivées depuis > 30 jours, candidates à la purge mensuelle. Source de la notification email et de la suppression.';

-- -------------------------------------------------------------------------
-- 5) Fonction de purge mensuelle
-- -------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.purge_archives_older_than_30_days();

CREATE FUNCTION public.purge_archives_older_than_30_days()
RETURNS TABLE (
  organization_id UUID,
  consultants_purged INT,
  missions_purged INT,
  offers_purged INT,
  contacts_purged INT,
  invoices_purged INT,
  contracts_purged INT,
  timesheets_purged INT,
  total_purged INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  CREATE TEMP TABLE _purge_counts ON COMMIT DROP AS
  SELECT
    p.organization_id,
    SUM(CASE WHEN p.entity_type = 'consultants' THEN 1 ELSE 0 END)::INT AS consultants_purged,
    SUM(CASE WHEN p.entity_type = 'missions' THEN 1 ELSE 0 END)::INT AS missions_purged,
    SUM(CASE WHEN p.entity_type = 'job_offers' THEN 1 ELSE 0 END)::INT AS offers_purged,
    SUM(CASE WHEN p.entity_type = 'contacts' THEN 1 ELSE 0 END)::INT AS contacts_purged,
    SUM(CASE WHEN p.entity_type = 'invoices' THEN 1 ELSE 0 END)::INT AS invoices_purged,
    SUM(CASE WHEN p.entity_type = 'contracts' THEN 1 ELSE 0 END)::INT AS contracts_purged,
    SUM(CASE WHEN p.entity_type = 'timesheets' THEN 1 ELSE 0 END)::INT AS timesheets_purged,
    COUNT(*)::INT AS total_purged
  FROM public._archives_to_purge p
  GROUP BY p.organization_id;

  DELETE FROM consultants WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM missions    WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM job_offers  WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM contacts    WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM invoices    WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM contracts   WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM timesheets  WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';

  FOR rec IN SELECT * FROM _purge_counts LOOP
    INSERT INTO activities (organization_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (
      rec.organization_id,
      NULL,
      'organization',
      rec.organization_id,
      'archive.purged',
      jsonb_build_object(
        'consultants', rec.consultants_purged,
        'missions', rec.missions_purged,
        'offers', rec.offers_purged,
        'contacts', rec.contacts_purged,
        'invoices', rec.invoices_purged,
        'contracts', rec.contracts_purged,
        'timesheets', rec.timesheets_purged,
        'total', rec.total_purged,
        'cutoff_days', 30
      )
    );
  END LOOP;

  RETURN QUERY SELECT * FROM _purge_counts;
END $$;

COMMENT ON FUNCTION public.purge_archives_older_than_30_days IS
  'Supprime définitivement les entités archivées depuis > 30 jours (CRA inclus, opportunities exclues). Récap par org. Appel mensuel via cron Vercel /api/admin/purge-archives.';

REVOKE ALL ON FUNCTION public.purge_archives_older_than_30_days() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_archives_older_than_30_days() TO service_role;
