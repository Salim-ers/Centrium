-- =========================================================================
-- 086 — CORRECTIF SÉCURITÉ P0 : escalade de privilèges via profiles
-- -------------------------------------------------------------------------
-- FAILLE : la policy `profiles_update_self` (migration 002) autorise
--   UPDATE USING (id = auth.uid())  SANS WITH CHECK ni trigger de garde.
-- Aucun trigger ne protégeait la colonne `role`. Conséquence : n'importe
-- quel utilisateur authentifié pouvait, via PostgREST (clé anon + son JWT) :
--   UPDATE profiles SET role='admin' WHERE id = auth.uid();
-- → un viewer/finance/recruiter/consultant devenait admin de son ESN
--   (accès à tous les consultants, factures, contrats, contacts), voire
--   super_admin (accès god-mode cross-org si FOUNDER_EMAILS mal configuré).
--
-- CORRECTIF (défense en profondeur, 3 couches) :
--   1. WITH CHECK sur la policy self-update (id ne peut pas changer).
--   2. Trigger BEFORE UPDATE qui GÈLE les colonnes sensibles (role,
--      is_founder, consultant_id) pour tout appelant NON privilégié —
--      quel que soit le chemin d'update. Les admins/super_admins (gestion
--      d'équipe) et le service_role (provisionnement serveur, auth.uid()
--      NULL) restent autorisés.
--   3. Fail-safe : un appelant sans profil connu est traité comme non
--      privilégié (colonnes gelées).
--
-- Non-régressif : l'édition self-service du profil (settings/profile) ne
-- touche que first_name/last_name/phone/avatar/timezone → jamais gelées.
-- =========================================================================

-- 1. WITH CHECK explicite : l'utilisateur ne peut écrire que SA ligne.
DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Trigger anti-escalade sur les colonnes sensibles.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_role user_role;
BEGIN
  -- Appel serveur (service_role) : pas de JWT → auth.uid() NULL. Confiance
  -- totale : c'est le provisionnement / l'API admin qui posent les rôles.
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role FROM profiles WHERE id = caller;

  -- Un admin ou super_admin gère légitimement les rôles de son équipe.
  IF caller_role IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Appelant non privilégié : on gèle les colonnes sensibles à leur valeur
  -- d'origine. Impossible de s'attribuer (ou d'attribuer) un rôle, le flag
  -- fondateur, ou de re-router un lien consultant.
  NEW.role := OLD.role;
  NEW.is_founder := OLD.is_founder;
  NEW.consultant_id := OLD.consultant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- La fonction ne doit pas être appelable directement.
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon, authenticated, public;
