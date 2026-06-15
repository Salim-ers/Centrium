-- =========================================================================
-- 062 — Purge automatique des entités archivées (rétention 1 mois)
-- =========================================================================
-- Politique : tout consultant, mission, offre, contact, opportunité, facture
-- ou contrat ARCHIVÉ depuis plus de 30 jours est supprimé définitivement.
--
-- Avant suppression, un récap (nombre + détails) est envoyé par email à
-- l'admin de chaque organisation concernée (via Edge Function ou cron).
--
-- À déclencher MENSUELLEMENT via :
--   - Supabase Scheduled Function (recommandé)
--   - OU un cron Vercel qui appelle /api/admin/purge-archives
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Vue : entités à purger (archived_at < NOW() - 30 jours)
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

SELECT 'opportunities', id, organization_id, archived_at, COALESCE(title, 'Opportunité ' || id::text)
FROM opportunities
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

SELECT 'contracts', id, organization_id, archived_at, COALESCE(reference, 'Contrat ' || id::text)
FROM contracts
WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';

COMMENT ON VIEW public._archives_to_purge IS
  'Liste des entités archivées depuis > 30 jours, candidates à la purge automatique. Source pour la notification email et la suppression effective.';

-- -------------------------------------------------------------------------
-- 2) Fonction de purge : supprime les entités archivées > 30j
--    Retourne un récap par organisation pour les notifications.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_archives_older_than_30_days()
RETURNS TABLE (
  organization_id UUID,
  consultants_purged INT,
  missions_purged INT,
  offers_purged INT,
  opportunities_purged INT,
  contacts_purged INT,
  invoices_purged INT,
  contracts_purged INT,
  total_purged INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  counts_by_org JSONB := '{}'::JSONB;
BEGIN
  -- Pré-comptage par org (pour la notification)
  CREATE TEMP TABLE _purge_counts ON COMMIT DROP AS
  SELECT
    p.organization_id,
    SUM(CASE WHEN p.entity_type = 'consultants' THEN 1 ELSE 0 END)::INT AS consultants_purged,
    SUM(CASE WHEN p.entity_type = 'missions' THEN 1 ELSE 0 END)::INT AS missions_purged,
    SUM(CASE WHEN p.entity_type = 'job_offers' THEN 1 ELSE 0 END)::INT AS offers_purged,
    SUM(CASE WHEN p.entity_type = 'opportunities' THEN 1 ELSE 0 END)::INT AS opportunities_purged,
    SUM(CASE WHEN p.entity_type = 'contacts' THEN 1 ELSE 0 END)::INT AS contacts_purged,
    SUM(CASE WHEN p.entity_type = 'invoices' THEN 1 ELSE 0 END)::INT AS invoices_purged,
    SUM(CASE WHEN p.entity_type = 'contracts' THEN 1 ELSE 0 END)::INT AS contracts_purged,
    COUNT(*)::INT AS total_purged
  FROM public._archives_to_purge p
  GROUP BY p.organization_id;

  -- Suppression effective (cascade gère les FK)
  DELETE FROM consultants WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM missions WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM job_offers WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM opportunities WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM contacts WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM invoices WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';
  DELETE FROM contracts WHERE archived_at IS NOT NULL AND archived_at < NOW() - INTERVAL '30 days';

  -- Log dans activities pour audit
  FOR rec IN SELECT * FROM _purge_counts LOOP
    INSERT INTO activities (organization_id, action, entity_type, details)
    VALUES (
      rec.organization_id,
      'archive.purged',
      'cron',
      jsonb_build_object(
        'consultants', rec.consultants_purged,
        'missions', rec.missions_purged,
        'offers', rec.offers_purged,
        'opportunities', rec.opportunities_purged,
        'contacts', rec.contacts_purged,
        'invoices', rec.invoices_purged,
        'contracts', rec.contracts_purged,
        'total', rec.total_purged,
        'cutoff_days', 30
      )
    );
  END LOOP;

  RETURN QUERY SELECT * FROM _purge_counts;
END $$;

COMMENT ON FUNCTION public.purge_archives_older_than_30_days IS
  'Supprime définitivement les entités archivées depuis > 30 jours. Retourne un récap par organisation. À appeler une fois par mois via cron.';

-- -------------------------------------------------------------------------
-- 3) RPC pour la fonction (appelable depuis le code côté serveur)
-- -------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.purge_archives_older_than_30_days() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_archives_older_than_30_days() TO service_role;

-- -------------------------------------------------------------------------
-- 4) Tâche scheduled (pg_cron) — optionnel
--    Active uniquement si l'extension pg_cron est activée sur le projet.
--    Sinon, déclencher via Vercel cron ou Supabase Edge Function.
-- -------------------------------------------------------------------------

-- Exemple (à activer manuellement dans Supabase Dashboard → Database → Extensions → pg_cron) :
--
-- SELECT cron.schedule(
--   'purge-archives-monthly',
--   '0 3 1 * *',                              -- 03:00 le 1er de chaque mois
--   $$SELECT public.purge_archives_older_than_30_days();$$
-- );
