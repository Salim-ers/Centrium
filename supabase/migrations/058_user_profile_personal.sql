-- =============================================================
-- 058_user_profile_personal.sql
--
-- Infos personnelles d'un utilisateur, visibles UNIQUEMENT par lui.
--
-- Pourquoi une table séparée plutôt qu'ajouter des colonnes à `profiles` :
--   La RLS de `profiles` autorise tous les membres d'une même org à
--   lire les colonnes de chacun (politique profiles_select_same_org).
--   Pas question d'y stocker téléphone perso, date de naissance,
--   adresse, contact d'urgence, etc.
--
-- Ici, la RLS est STRICTE : user_id = auth.uid() en lecture comme en
-- écriture. Même un admin de l'org ne voit pas ces champs.
-- =============================================================

CREATE TABLE IF NOT EXISTS user_profile_personal (
  user_id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identité / rôle dans l'entreprise
  job_title                TEXT,
  bio                      TEXT,
  hire_date                DATE,
  -- Contact
  mobile_phone             TEXT,
  linkedin_url             TEXT,
  -- État civil
  birth_date               DATE,
  nationality              TEXT,
  -- Adresse perso
  address                  TEXT,
  city                     TEXT,
  postal_code              TEXT,
  country                  TEXT DEFAULT 'France',
  -- Compétences générales (langues parlées, certifications libres)
  languages                TEXT[],
  -- Contact d'urgence
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  emergency_contact_rel    TEXT,
  -- Métadonnées
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profile_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own personal"
  ON user_profile_personal FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user inserts own personal"
  ON user_profile_personal FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own personal"
  ON user_profile_personal FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Pas de DELETE policy : effacer une info se fait via UPDATE à NULL.
-- Suppression du compte = cascade depuis auth.users → nettoyage automatique.

-- Trigger updated_at — réutilise la fonction touch_updated_at() déjà
-- présente (cf. migration 001).
DROP TRIGGER IF EXISTS trg_user_profile_personal_touch ON user_profile_personal;
CREATE TRIGGER trg_user_profile_personal_touch
  BEFORE UPDATE ON user_profile_personal
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON TABLE user_profile_personal IS
  'Infos personnelles d''un utilisateur, RLS strict user_id=auth.uid(). Invisible aux autres membres de l''organisation (même admin).';
