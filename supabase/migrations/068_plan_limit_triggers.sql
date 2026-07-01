-- =============================================================================
-- Migration 068 — DB-level enforcement des limites de plan
-- =============================================================================
-- POURQUOI
--   Les entités opportunities/contacts/missions sont créées via des services
--   client (browser Supabase client), pas via des Route Handlers. Le module
--   enforce.ts (server-only) ne peut donc pas les gater côté API.
--
--   Solution : BEFORE INSERT triggers Postgres qui vérifient le quota via
--   la fonction enforce_plan_limit(). Impossibles à bypasser (RLS ou pas),
--   s'appliquent à tout canal d'insertion (browser client, admin client,
--   psql, MCP, etc.).
--
--   Le code JS/TS peut catch l'erreur SQLSTATE P0001 avec HINT parsable
--   ("resource=X;limit=N;used=M;plan_id=Y;plan_name=Z") pour afficher le
--   PlanLimitDialog.
--
-- Consultants : trigger ajouté en safety net (enforce.ts existant reste,
-- car il permet un message d'erreur plus riche côté Route Handler).
-- Members : pas de trigger (l'insert passe déjà par /api/invitations
-- avec enforcement, et le pattern member=invite complique le count).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_plan_limit(
  p_org_id     UUID,
  p_resource   TEXT,
  p_limit_col  TEXT,
  p_where      TEXT DEFAULT ''
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max        INTEGER;
  v_used       INTEGER;
  v_plan_name  TEXT;
  v_plan_id    TEXT;
  v_exempt     BOOLEAN;
  v_sql        TEXT;
BEGIN
  EXECUTE format(
    'SELECT p.name, p.id, s.is_exempt_from_billing, p.%I
       FROM public.subscriptions s
       JOIN public.plans p ON p.id = s.plan_id
      WHERE s.organization_id = $1',
    p_limit_col
  ) INTO v_plan_name, v_plan_id, v_exempt, v_max USING p_org_id;

  IF v_max IS NULL OR COALESCE(v_exempt, false) THEN
    RETURN;
  END IF;

  v_sql := format(
    'SELECT COUNT(*)::INTEGER FROM public.%I WHERE organization_id = $1',
    p_resource
  );
  IF p_where <> '' THEN
    v_sql := v_sql || ' AND ' || p_where;
  END IF;
  EXECUTE v_sql INTO v_used USING p_org_id;

  IF v_used >= v_max THEN
    RAISE EXCEPTION 'plan_limit_reached: % (% / %)', p_resource, v_used, v_max
      USING ERRCODE = 'P0001',
            HINT    = format('resource=%s;limit=%s;used=%s;plan_id=%s;plan_name=%s',
                             p_resource, v_max, v_used, v_plan_id, v_plan_name);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.enforce_plan_limit(UUID,TEXT,TEXT,TEXT) IS
  'Raise plan_limit_reached (P0001) si la ressource dépasse la limite du plan actif. HINT parsable côté client.';

-- Opportunities
CREATE OR REPLACE FUNCTION public.tg_opportunities_enforce_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('won','lost','on_hold') THEN
    PERFORM public.enforce_plan_limit(
      NEW.organization_id, 'opportunities', 'max_open_opportunities',
      'status NOT IN (''won'',''lost'',''on_hold'')'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opportunities_enforce_limit ON public.opportunities;
CREATE TRIGGER opportunities_enforce_limit
  BEFORE INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_opportunities_enforce_limit();

-- Contacts
CREATE OR REPLACE FUNCTION public.tg_contacts_enforce_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enforce_plan_limit(NEW.organization_id, 'contacts', 'max_contacts', '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_enforce_limit ON public.contacts;
CREATE TRIGGER contacts_enforce_limit
  BEFORE INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_contacts_enforce_limit();

-- Missions
CREATE OR REPLACE FUNCTION public.tg_missions_enforce_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.enforce_plan_limit(
      NEW.organization_id, 'missions', 'max_active_missions',
      'status = ''active'''
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS missions_enforce_limit ON public.missions;
CREATE TRIGGER missions_enforce_limit
  BEFORE INSERT ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.tg_missions_enforce_limit();

-- Consultants (safety net)
CREATE OR REPLACE FUNCTION public.tg_consultants_enforce_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.archived = false OR NEW.archived IS NULL THEN
    PERFORM public.enforce_plan_limit(
      NEW.organization_id, 'consultants', 'max_consultants',
      'archived = false'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultants_enforce_limit ON public.consultants;
CREATE TRIGGER consultants_enforce_limit
  BEFORE INSERT ON public.consultants
  FOR EACH ROW EXECUTE FUNCTION public.tg_consultants_enforce_limit();
