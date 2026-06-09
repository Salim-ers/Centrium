-- =========================================================================
-- HELPER SQL : promouvoir un user en super_admin
-- =========================================================================
-- À exécuter UNE FOIS dans Supabase Dashboard → SQL Editor.
-- À garder hors Git si tu changes l'email (ce fichier est versionné).
--
-- ⚠️ Le super_admin a accès à TOUTES les orgs et peut créer / modifier
-- les clients depuis /admin/clients et /admin/new-org. C'est le rôle
-- le plus puissant de la plateforme. Limite-le à 1 ou 2 personnes
-- maximum dans ton équipe (fondateurs uniquement).
-- =========================================================================

-- Étape 1 : créer ton compte normalement via /login ou /signup
--           (ou si tu l'as déjà, passe à l'étape 2)

-- Étape 2 : promouvoir ce compte en super_admin
--           Remplace l'email ci-dessous par TON email réel
UPDATE profiles
   SET role = 'super_admin',
       organization_id = NULL  -- super_admin n'est rattaché à AUCUNE org
 WHERE id = (
   SELECT id FROM auth.users WHERE email = 'salim.elrs@gmail.com'  -- ← À CHANGER
 );

-- Étape 3 : vérifier le résultat
SELECT
  u.email,
  p.role,
  p.organization_id,
  p.created_at
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.role = 'super_admin';

-- Étape 4 : t'auto-déconnecter et te reconnecter pour rafraîchir
-- le cookie qc_profile (qui cache le role 5 min).
-- Ensuite tu seras redirigé automatiquement vers /admin/clients
-- au prochain login.

-- =========================================================================
-- ROLLBACK : si tu veux retirer le super_admin
-- =========================================================================
-- UPDATE profiles
--    SET role = 'admin',
--        organization_id = '<uuid_de_ton_org>'  -- besoin d'une org
--  WHERE id = (SELECT id FROM auth.users WHERE email = 'salim.elrs@gmail.com');
