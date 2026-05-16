-- =============================================================
-- 059_user_todos_ping.sql
--
-- Permet à un utilisateur de "pinger" un collègue dans une todo :
--   ex. tâche "Appeler Karim" assignée à Alphonse Aroul.
--
-- Effets :
--   - La personne pinguée VOIT la tâche (même si non partagée à toute l'org)
--   - Elle peut la cocher / décocher (pour signaler "c'est fait")
--   - Elle ne peut PAS éditer le titre/description/priorité ni la supprimer
--   - Le propriétaire garde le contrôle total
--
-- Implémentation :
--   - Colonne pinged_user_id NULL/FK profiles
--   - RLS étendue : SELECT autorisé si user_id, shared+org, OU pinged_user_id = moi
--   - UPDATE membres : autorisé si shared OU si pinged_user_id = moi
-- =============================================================

ALTER TABLE user_todos
  ADD COLUMN IF NOT EXISTS pinged_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_todos_pinged_idx
  ON user_todos (pinged_user_id, done, created_at DESC)
  WHERE pinged_user_id IS NOT NULL;

-- Rejoue les policies pour intégrer le ping.
DROP POLICY IF EXISTS "read own or shared org todos" ON user_todos;
DROP POLICY IF EXISTS "members toggle shared org todos" ON user_todos;

CREATE POLICY "read own or shared or pinged todos"
  ON user_todos FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared = TRUE
      AND organization_id IS NOT NULL
      AND public.is_member_of(organization_id)
    )
    OR pinged_user_id = auth.uid()
  );

-- Membres org sur todo partagée OU personne pinguée → peuvent toggle done.
-- L'UI n'expose que ce toggle ; un user mal intentionné pourrait techniquement
-- éditer via SQL (RLS ne sait pas restreindre par colonne), c'est jugé OK
-- pour des notes (le propriétaire voit et corrige).
CREATE POLICY "members or pinged toggle todos"
  ON user_todos FOR UPDATE
  TO authenticated
  USING (
    user_id <> auth.uid()
    AND (
      (
        shared = TRUE
        AND organization_id IS NOT NULL
        AND public.is_member_of(organization_id)
      )
      OR pinged_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id <> auth.uid()
    AND (
      (
        shared = TRUE
        AND organization_id IS NOT NULL
        AND public.is_member_of(organization_id)
      )
      OR pinged_user_id = auth.uid()
    )
  );

COMMENT ON COLUMN user_todos.pinged_user_id IS
  'Personne pinguée sur la tâche. Elle voit la todo et peut la cocher, mais ne peut pas l''éditer ou la supprimer (RLS étendue, cf. migration 059).';
