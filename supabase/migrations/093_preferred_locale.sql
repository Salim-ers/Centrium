-- =========================================================================
-- 093 — Langue préférée par destinataire (emails bilingues FR/EN)
-- -------------------------------------------------------------------------
-- L'interface est bilingue mais les emails transactionnels étaient FR-only :
-- il n'existait AUCUNE source de langue par destinataire. Cette migration
-- ajoute `preferred_locale` :
--
--   - profiles.preferred_locale    → tout utilisateur connecté (admins, BM,
--     recruteurs, finance, consultants avec portail). Synchronisée depuis le
--     toggle FR/EN de l'app (LocaleProvider → update self, RLS
--     profiles_update_self ; le trigger anti-escalade ne gèle que
--     role/is_founder/consultant_id, ce champ reste librement modifiable).
--
--   - consultants.preferred_locale → consultants SANS portail (relances du
--     moteur d'alertes). Défaut 'fr' ; modifiable par l'org plus tard.
--
-- Les senders (alerts engine, webhook Stripe, transitions CRA, signature,
-- provisioning) lisent cette colonne pour choisir la langue de l'email.
-- =========================================================================

alter table public.profiles
  add column if not exists preferred_locale text not null default 'fr'
  constraint profiles_preferred_locale_check check (preferred_locale in ('fr', 'en'));

alter table public.consultants
  add column if not exists preferred_locale text not null default 'fr'
  constraint consultants_preferred_locale_check check (preferred_locale in ('fr', 'en'));

comment on column public.profiles.preferred_locale is
  'Langue des emails/notifications pour cet utilisateur (fr|en). Synchronisée depuis le toggle FR/EN de l''app.';
comment on column public.consultants.preferred_locale is
  'Langue des emails pour ce consultant quand il n''a pas de compte portail (fr|en).';
