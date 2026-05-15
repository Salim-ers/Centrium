-- =============================================================
-- 054_user_todos.sql
--
-- Table todos personnelle : chaque utilisateur (y compris super_admin)
-- a sa propre liste de tâches privée, invisible aux autres membres de
-- l'organisation. Pas de organization_id : la scope est par user.
-- =============================================================

CREATE TABLE IF NOT EXISTS user_todos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  done          BOOLEAN NOT NULL DEFAULT FALSE,
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_todos_user_idx
  ON user_todos (user_id, done, created_at DESC);

ALTER TABLE user_todos ENABLE ROW LEVEL SECURITY;

-- Chaque user voit + édite UNIQUEMENT ses propres todos.
-- Pas de partage avec l'organisation, pas de partage entre admins.
CREATE POLICY "user reads own todos"
  ON user_todos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user inserts own todos"
  ON user_todos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own todos"
  ON user_todos FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user deletes own todos"
  ON user_todos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-stamp completed_at quand done passe à TRUE (et reset si false).
CREATE OR REPLACE FUNCTION user_todos_stamp_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.done IS DISTINCT FROM OLD.done THEN
    NEW.completed_at := CASE WHEN NEW.done THEN NOW() ELSE NULL END;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_todos_stamp_completed ON user_todos;
CREATE TRIGGER trg_user_todos_stamp_completed
  BEFORE UPDATE ON user_todos
  FOR EACH ROW EXECUTE FUNCTION user_todos_stamp_completed();

COMMENT ON TABLE user_todos IS
  'Liste de tâches personnelle par utilisateur. RLS stricte : un user ne voit jamais les todos d''un autre, même dans la même organisation.';
