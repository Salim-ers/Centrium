-- =============================================================================
-- 078_user_todos_team_delete.sql — Tâches équipe modifiables/supprimables par tous
-- -----------------------------------------------------------------------------
-- La RLS UPDATE autorisait déjà tout membre de l'org à éditer/cocher une
-- tâche partagée (policy « members or pinged toggle todos »), mais le DELETE
-- restait réservé au créateur. Résultat : un collègue ne pouvait pas
-- supprimer une tâche d'équipe partagée par un autre.
--
-- On élargit le DELETE : propriétaire OU membre de l'org sur une tâche
-- partagée (shared=true). L'UI expose désormais éditer/supprimer sur les
-- tâches équipe pour tous les membres.
-- =============================================================================

DROP POLICY IF EXISTS "user deletes own todos" ON public.user_todos;

CREATE POLICY "delete own or shared team todos" ON public.user_todos
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      shared = true
      AND organization_id IS NOT NULL
      AND public.is_member_of(organization_id)
    )
  );
