-- =============================================================
-- 056_enable_realtime_publication.sql
--
-- Active la diffusion temps réel sur les tables métier. Sans ça la
-- publication `supabase_realtime` reste vide et tous les
-- `postgres_changes` subscribés côté client ne firent jamais →
-- d'où l'impression que :
--   - les modifs d'un collègue n'apparaissent pas en direct
--   - le drop d'une carte CRM ne se voit que côté local
--   - le dashboard reste stale jusqu'au F5
--
-- RLS reste appliquée par Realtime : un client ne reçoit un event
-- que s'il a SELECT sur la row → pas de fuite cross-org.
--
-- On utilise IF NOT EXISTS via un DO block parce que
-- `ALTER PUBLICATION … ADD TABLE` plante si la table est déjà dans
-- la publication. Le DO block fait l'add idempotent.
-- =============================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'opportunities',
    'missions',
    'consultants',
    'contacts',
    'invoices',
    'invoice_items',
    'timesheets',
    'timesheet_days',
    'alerts',
    'job_offers',
    'user_todos',
    'companies',
    'contracts',
    'consultant_skills',
    'consultant_documents'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip si déjà membre de la publication.
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMENT ON PUBLICATION supabase_realtime IS
  'Realtime broadcast pour les tables métier. RLS appliquée par Realtime → pas de fuite cross-org.';
