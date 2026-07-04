-- =========================================================================
-- 073 — profiles.password_set : l'utilisateur a-t-il déjà défini un mot de
-- passe ?
-- -------------------------------------------------------------------------
-- POURQUOI : les comptes créés par invitation (inviteUserByEmail) n'ont pas
-- de mot de passe tant que /auth/first-password n'a pas abouti. La détection
-- historique ("last_sign_in_at < 5 s") était une heuristique fragile : au
-- moindre ralentissement l'invité était envoyé au dashboard sans mot de
-- passe — définitivement incapable de se reconnecter.
--
-- Ce flag est posé par /api/auth/update-password (service role) et lu par
-- /auth/callback et /invite/accept pour router : pas de mot de passe →
-- /auth/first-password ; sinon → espace selon le rôle.
--
-- Backfill : PAS de signal exact rétroactif (GoTrue stocke un hash même
-- pour les comptes invités sans mot de passe réel). Biais de sécurité :
-- un faux "déjà défini" enferme l'utilisateur dehors, un faux "pas encore"
-- lui redemande juste un mot de passe. → true par défaut pour les rôles
-- qui se connectent au formulaire (admin/BM/…), false pour les cohortes
-- créées par invitation (consultants, viewers orphelins).
-- =========================================================================

alter table public.profiles
  add column if not exists password_set boolean not null default false;

update public.profiles set password_set = true;

update public.profiles
set password_set = false
where role = 'consultant'
   or (role = 'viewer' and organization_id is null);

comment on column public.profiles.password_set is
  'true dès que l''utilisateur a défini un mot de passe (update-password). Route les invités vers /auth/first-password tant que false.';
