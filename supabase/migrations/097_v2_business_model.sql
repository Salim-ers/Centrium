-- =========================================================================
-- 097 — Centrium V2 : modèle métier (CRM, finances, tâches, documents,
--       devis, préfacturation, intégrations)
-- -------------------------------------------------------------------------
-- Additive et idempotente. Les données financières sensibles (CJM, coûts)
-- vivent dans des tables dédiées, protégées par has_permission() : ni un
-- consultant, ni un client, ni un rôle sans « consultants.financials »
-- ne peut les lire, même en interrogeant l'API directement.
-- =========================================================================

-- ── 1. Données financières internes ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.consultant_financials (
  consultant_id     uuid PRIMARY KEY REFERENCES public.consultants(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  daily_cost_eur    numeric(10, 2) CHECK (daily_cost_eur IS NULL OR daily_cost_eur >= 0),
  target_margin_pct numeric(5, 2) CHECK (target_margin_pct IS NULL OR target_margin_pct BETWEEN -100 AND 100),
  updated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mission_financials (
  mission_id        uuid PRIMARY KEY REFERENCES public.missions(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  daily_cost_eur    numeric(10, 2) CHECK (daily_cost_eur IS NULL OR daily_cost_eur >= 0),
  other_costs_eur   numeric(12, 2) NOT NULL DEFAULT 0 CHECK (other_costs_eur >= 0),
  updated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- L'organisation est TOUJOURS celle de l'entité parente : impossible de
-- rattacher des finances à un consultant / une mission d'un autre tenant.
CREATE OR REPLACE FUNCTION public.sync_financials_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'consultant_financials' THEN
    SELECT organization_id INTO NEW.organization_id FROM public.consultants WHERE id = NEW.consultant_id;
  ELSE
    SELECT organization_id INTO NEW.organization_id FROM public.missions WHERE id = NEW.mission_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Entité parente introuvable' USING ERRCODE = '23503';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consultant_financials_org ON public.consultant_financials;
CREATE TRIGGER trg_consultant_financials_org
  BEFORE INSERT OR UPDATE ON public.consultant_financials
  FOR EACH ROW EXECUTE FUNCTION public.sync_financials_org();
DROP TRIGGER IF EXISTS trg_mission_financials_org ON public.mission_financials;
CREATE TRIGGER trg_mission_financials_org
  BEFORE INSERT OR UPDATE ON public.mission_financials
  FOR EACH ROW EXECUTE FUNCTION public.sync_financials_org();

ALTER TABLE public.consultant_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_financials ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['consultant_financials', 'mission_financials'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$I_access ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY %1$I_access ON public.%1$I
        FOR ALL USING (
          organization_id = public.organization_id()
          AND public.has_permission('consultants.financials')
        ) WITH CHECK (
          organization_id = public.organization_id()
          AND public.has_permission('consultants.financials')
        )$f$, t);
  END LOOP;
END $$;

-- ── 2. Consultants : certifications ──────────────────────────────────────
-- [{ "name": "AWS Solutions Architect", "issuer": "AWS", "year": 2024, "expires_at": "2027-03-01" }]
ALTER TABLE public.consultants
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── 3. Missions : pilotage ───────────────────────────────────────────────
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS owner_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_days   numeric(6, 1) CHECK (planned_days IS NULL OR planned_days >= 0),
  ADD COLUMN IF NOT EXISTS renewal_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS location       text,
  ADD COLUMN IF NOT EXISTS remote_policy  text;

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_renewal_status_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_renewal_status_check
  CHECK (renewal_status IN ('unknown', 'likely', 'confirmed', 'not_renewed'));

CREATE INDEX IF NOT EXISTS idx_missions_end_active
  ON public.missions (organization_id, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_missions_owner ON public.missions (owner_id);

-- ── 4. Opportunités : fiche commerciale complète ─────────────────────────
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS description       text,
  ADD COLUMN IF NOT EXISTS budget_eur        numeric(12, 2) CHECK (budget_eur IS NULL OR budget_eur >= 0),
  ADD COLUMN IF NOT EXISTS start_date        date,
  ADD COLUMN IF NOT EXISTS location          text,
  ADD COLUMN IF NOT EXISTS remote_policy     text,
  ADD COLUMN IF NOT EXISTS required_skills   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_action       text,
  ADD COLUMN IF NOT EXISTS source            text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS client_request_id uuid,
  ADD COLUMN IF NOT EXISTS archived          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at       timestamptz;

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_source_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_source_check CHECK (source IN ('manual', 'client_portal', 'import'));

CREATE INDEX IF NOT EXISTS idx_opps_org_status ON public.opportunities (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_opps_company ON public.opportunities (company_id);

-- Contacts multiples par opportunité (le contact principal reste contact_id).
CREATE TABLE IF NOT EXISTS public.opportunity_contacts (
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  contact_id     uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role_label     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, contact_id)
);
ALTER TABLE public.opportunity_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunity_contacts_read ON public.opportunity_contacts;
CREATE POLICY opportunity_contacts_read ON public.opportunity_contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.opportunities o
             WHERE o.id = opportunity_id AND o.organization_id = public.organization_id())
    AND public.has_permission('opportunities.view')
  );
DROP POLICY IF EXISTS opportunity_contacts_write ON public.opportunity_contacts;
CREATE POLICY opportunity_contacts_write ON public.opportunity_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.opportunities o
             WHERE o.id = opportunity_id AND o.organization_id = public.organization_id())
    AND public.has_permission('opportunities.edit')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.opportunities o
             WHERE o.id = opportunity_id AND o.organization_id = public.organization_id())
    AND EXISTS (SELECT 1 FROM public.contacts c
                 WHERE c.id = contact_id AND c.organization_id = public.organization_id())
    AND public.has_permission('opportunities.edit')
  );

-- ── 5. Tâches (commerciales et opérationnelles) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     text CHECK (description IS NULL OR char_length(description) <= 4000),
  status          text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done', 'cancelled')),
  priority        text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date        date,
  assignee_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type     text CHECK (entity_type IN ('opportunity', 'client', 'contact', 'mission', 'consultant', 'timesheet', 'quote', 'client_request')),
  entity_id       uuid,
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'automation')),
  dedupe_key      text,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.tasks (organization_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON public.tasks (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks (assignee_id) WHERE status = 'todo';
-- Une automatisation ne crée jamais deux fois la même tâche ouverte.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_open_dedupe
  ON public.tasks (organization_id, dedupe_key) WHERE dedupe_key IS NOT NULL AND status = 'todo';

CREATE OR REPLACE FUNCTION public.tasks_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tasks_touch ON public.tasks;
CREATE TRIGGER trg_tasks_touch BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_touch();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_read ON public.tasks;
CREATE POLICY tasks_read ON public.tasks
  FOR SELECT USING (
    organization_id = public.organization_id()
    AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
  );
DROP POLICY IF EXISTS tasks_write ON public.tasks;
CREATE POLICY tasks_write ON public.tasks
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role, 'viewer'::user_role)
  ) WITH CHECK (
    organization_id = public.organization_id()
    AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role, 'viewer'::user_role)
  );

-- ── 6. Bibliothèque de documents (versionnée) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN (
                    'quote', 'proposal', 'purchase_order', 'contract', 'mission_document',
                    'skills_dossier', 'client_document', 'consultant_document', 'other')),
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     text,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  consultant_id   uuid REFERENCES public.consultants(id) ON DELETE SET NULL,
  mission_id      uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  opportunity_id  uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  storage_path    text,
  file_name       text,
  mime_type       text,
  size_bytes      bigint CHECK (size_bytes IS NULL OR size_bytes BETWEEN 0 AND 26214400),
  -- Versionnement : root_id = première version (NULL pour elle-même).
  root_id         uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  version         integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  visibility      text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client', 'consultant')),
  archived        boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_org_kind ON public.documents (organization_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_consultant ON public.documents (consultant_id);
CREATE INDEX IF NOT EXISTS idx_documents_mission ON public.documents (mission_id);
CREATE INDEX IF NOT EXISTS idx_documents_root ON public.documents (root_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_read ON public.documents;
CREATE POLICY documents_read ON public.documents
  FOR SELECT USING (organization_id = public.organization_id() AND public.has_permission('documents.view'));
DROP POLICY IF EXISTS documents_write ON public.documents;
CREATE POLICY documents_write ON public.documents
  FOR ALL USING (organization_id = public.organization_id() AND public.has_permission('documents.edit'))
  WITH CHECK (organization_id = public.organization_id() AND public.has_permission('documents.edit'));

-- Bucket privé : accès UNIQUEMENT par URL signée générée côté serveur.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'image/png', 'image/jpeg', 'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS documents_storage_read ON storage.objects;
CREATE POLICY documents_storage_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.has_permission('documents.view')
  );
DROP POLICY IF EXISTS documents_storage_insert ON storage.objects;
CREATE POLICY documents_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.has_permission('documents.edit')
  );
DROP POLICY IF EXISTS documents_storage_delete ON storage.objects;
CREATE POLICY documents_storage_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.has_permission('documents.edit')
  );

-- Modèles personnalisables (devis, propositions, contrats…).
CREATE TABLE IF NOT EXISTS public.document_templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('quote', 'proposal', 'purchase_order', 'contract', 'skills_dossier')),
  name            text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  intro_text      text,
  terms_text      text,
  footer_text     text,
  is_default      boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_templates_default
  ON public.document_templates (organization_id, kind) WHERE is_default;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_templates_read ON public.document_templates;
CREATE POLICY document_templates_read ON public.document_templates
  FOR SELECT USING (organization_id = public.organization_id() AND public.has_permission('documents.view'));
DROP POLICY IF EXISTS document_templates_write ON public.document_templates;
CREATE POLICY document_templates_write ON public.document_templates
  FOR ALL USING (organization_id = public.organization_id() AND public.has_permission('documents.edit'))
  WITH CHECK (organization_id = public.organization_id() AND public.has_permission('documents.edit'));

-- ── 7. Devis ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_number_counters (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year            int NOT NULL,
  last_seq        int NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, year)
);
ALTER TABLE public.quote_number_counters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quotes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number          text,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id  uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  template_id     uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  issue_date      date NOT NULL DEFAULT CURRENT_DATE,
  valid_until     date,
  vat_rate        numeric(5, 2) NOT NULL DEFAULT 20 CHECK (vat_rate BETWEEN 0 AND 100),
  intro_text      text,
  terms_text      text,
  notes           text,
  total_ht        numeric(14, 2) NOT NULL DEFAULT 0,
  total_ttc       numeric(14, 2) NOT NULL DEFAULT 0,
  root_id         uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  version         integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  sent_at         timestamptz,
  decided_at      timestamptz,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_number ON public.quotes (organization_id, number) WHERE number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON public.quotes (organization_id, status, valid_until);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes (company_id);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id      uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  position      integer NOT NULL DEFAULT 0,
  description   text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  consultant_id uuid REFERENCES public.consultants(id) ON DELETE SET NULL,
  quantity      numeric(10, 2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit          text NOT NULL DEFAULT 'jour',
  unit_price    numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items (quote_id, position);

-- Numéro séquentiel DEV-AAAA-NNNN attribué à la création.
CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  yr int := EXTRACT(YEAR FROM COALESCE(NEW.issue_date, CURRENT_DATE))::int;
  seq int;
BEGIN
  IF NEW.number IS NULL OR btrim(NEW.number) = '' THEN
    IF NEW.root_id IS NOT NULL THEN
      -- Nouvelle version d'un devis : même numéro, suffixe de version.
      SELECT regexp_replace(number, '-V\d+$', '') || '-V' || NEW.version INTO NEW.number
        FROM public.quotes WHERE id = NEW.root_id;
    ELSE
      INSERT INTO public.quote_number_counters (organization_id, year, last_seq)
      VALUES (NEW.organization_id, yr, 1)
      ON CONFLICT (organization_id, year)
      DO UPDATE SET last_seq = public.quote_number_counters.last_seq + 1
      RETURNING last_seq INTO seq;
      NEW.number := 'DEV-' || yr || '-' || lpad(seq::text, 4, '0');
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assign_quote_number ON public.quotes;
CREATE TRIGGER trg_assign_quote_number BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();

-- Totaux recalculés à chaque modification des lignes.
CREATE OR REPLACE FUNCTION public.recompute_quote_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  qid uuid := COALESCE(NEW.quote_id, OLD.quote_id);
  ht numeric;
BEGIN
  SELECT COALESCE(SUM(round(quantity * unit_price, 2)), 0) INTO ht FROM public.quote_items WHERE quote_id = qid;
  UPDATE public.quotes
     SET total_ht = ht,
         total_ttc = round(ht * (1 + vat_rate / 100), 2)
   WHERE id = qid;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_quote_items_totals ON public.quote_items;
CREATE TRIGGER trg_quote_items_totals AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.recompute_quote_totals();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotes_read ON public.quotes;
CREATE POLICY quotes_read ON public.quotes
  FOR SELECT USING (organization_id = public.organization_id() AND public.has_permission('documents.view'));
DROP POLICY IF EXISTS quotes_write ON public.quotes;
CREATE POLICY quotes_write ON public.quotes
  FOR ALL USING (organization_id = public.organization_id() AND public.has_permission('documents.edit'))
  WITH CHECK (organization_id = public.organization_id() AND public.has_permission('documents.edit'));
DROP POLICY IF EXISTS quote_items_read ON public.quote_items;
CREATE POLICY quote_items_read ON public.quote_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.organization_id = public.organization_id())
    AND public.has_permission('documents.view')
  );
DROP POLICY IF EXISTS quote_items_write ON public.quote_items;
CREATE POLICY quote_items_write ON public.quote_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.organization_id = public.organization_id())
    AND public.has_permission('documents.edit')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.organization_id = public.organization_id())
    AND public.has_permission('documents.edit')
  );

-- ── 8. Préfacturation : validation + suivi d'export ──────────────────────
-- Centrium n'émet ni ne transmet de facture électronique réglementaire :
-- il prépare les éléments facturables et les exporte vers l'outil
-- comptable ou une plateforme agréée choisie par l'ESN.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS validated_at      timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS export_status     text NOT NULL DEFAULT 'not_exported',
  ADD COLUMN IF NOT EXISTS exported_at       timestamptz,
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_ref      text;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_export_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_export_status_check CHECK (export_status IN ('not_exported', 'exported', 'failed'));

-- ── 9. Intégrations (comptabilité, plateforme agréée, webhooks) ──────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider        text NOT NULL CHECK (provider IN ('pennylane', 'sage', 'sellsy', 'approved_platform', 'webhook')),
  status          text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'requested', 'configured', 'error')),
  -- Paramètres NON secrets uniquement (URL de webhook, événements, libellé).
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_event_at   timestamptz,
  last_error      text,
  updated_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integrations_read ON public.integrations;
CREATE POLICY integrations_read ON public.integrations
  FOR SELECT USING (organization_id = public.organization_id() AND public.has_permission('finance.view'));
DROP POLICY IF EXISTS integrations_write ON public.integrations;
CREATE POLICY integrations_write ON public.integrations
  FOR ALL USING (organization_id = public.organization_id() AND public.has_permission('settings.manage'))
  WITH CHECK (organization_id = public.organization_id() AND public.has_permission('settings.manage'));

-- Secrets de signature : RLS sans aucune policy → lecture/écriture
-- réservées au service_role (routes serveur).
CREATE TABLE IF NOT EXISTS public.integration_secrets (
  integration_id uuid PRIMARY KEY REFERENCES public.integrations(id) ON DELETE CASCADE,
  secret         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

-- ── 10. CRA : télétravail ────────────────────────────────────────────────
ALTER TABLE public.timesheet_days
  ADD COLUMN IF NOT EXISTS is_remote boolean NOT NULL DEFAULT false;

-- ── 11. Realtime pour les nouvelles tables collaboratives ────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks', 'quotes'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_object THEN
  NULL; -- publication absente (environnement local minimal)
END $$;
