-- =============================================================
-- 049_quote_requests_rls.sql
--
-- Politiques RLS pour quote_requests. Séparée de 048 car PostgreSQL
-- ne permet pas d'utiliser une valeur d'enum ajoutée dans la même
-- transaction (ALTER TYPE ADD VALUE doit committer avant qu'un check
-- l'utilise).
-- =============================================================

-- Tout le monde (anon + auth) peut INSÉRER une demande de devis :
-- formulaire public, pas de login.
CREATE POLICY "anyone can insert quote requests"
  ON quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Seul super_admin peut LIRE / UPDATE / DELETE.
CREATE POLICY "super_admin reads quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin updates quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin deletes quote requests"
  ON quote_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );
