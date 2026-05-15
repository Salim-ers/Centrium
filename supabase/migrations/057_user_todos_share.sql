-- =============================================================
-- 057_user_todos_share.sql
--
-- Ajoute la possibilité de PARTAGER un todo avec son organisation.
--
-- Modèle :
--   - user_id reste le propriétaire (création, édition, suppression)
--   - shared=true + organization_id → visible par tous les membres
--   - Les membres peuvent toggle le done (collaboration sur tâches d'équipe)
--   - Seul le propriétaire peut éditer le titre/description/priorité/échéance
--     ou supprimer (les autres ne peuvent que cocher/décocher)
--
-- Par défaut shared=false → comportement strictement privé conservé,
-- les todos existants ne fuient pas accidentellement.
-- =============================================================

ALTER TABLE user_todos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS shared BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS user_todos_shared_org_idx
  ON user_todos (organization_id, shared, done, created_at DESC)
  WHERE shared = TRUE;

-- ---------------------------------------------------------------
-- RLS : repenser la SELECT et UPDATE pour autoriser le partage
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "user reads own todos" ON user_todos;
DROP POLICY IF EXISTS "user updates own todos" ON user_todos;

-- SELECT : mes todos OU todos partagés dans mon org
CREATE POLICY "read own or shared org todos"
  ON user_todos FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared = TRUE
      AND organization_id IS NOT NULL
      AND public.is_member_of(organization_id)
    )
  );

-- UPDATE — propriétaire : tout
CREATE POLICY "owner updates own todos"
  ON user_todos FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE — autres membres de l'org : seulement sur les todos partagés.
-- On ne peut pas restreindre champ par champ via RLS, donc en pratique
-- l'UI n'expose que la case "Fait" pour les non-propriétaires. Un user
-- mal intentionné pourrait éditer via SQL — c'est une note, blast radius
-- minime, le propriétaire voit le changement et corrige.
CREATE POLICY "members toggle shared org todos"
  ON user_todos FOR UPDATE
  TO authenticated
  USING (
    user_id <> auth.uid()
    AND shared = TRUE
    AND organization_id IS NOT NULL
    AND public.is_member_of(organization_id)
  )
  WITH CHECK (
    user_id <> auth.uid()
    AND shared = TRUE
    AND organization_id IS NOT NULL
    AND public.is_member_of(organization_id)
  );

-- DELETE reste owner-only (policy existante "user deletes own todos" suffit).

COMMENT ON COLUMN user_todos.shared IS
  'Si TRUE : visible par tous les membres de organization_id. Owner garde le contrôle de l''édition, les autres ne peuvent que cocher/décocher.';
COMMENT ON COLUMN user_todos.organization_id IS
  'Org de partage. NULL = todo strictement privée (compatible avec l''historique avant 057).';
