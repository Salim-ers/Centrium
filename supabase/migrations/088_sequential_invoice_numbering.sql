-- =========================================================================
-- 088 — CONFORMITÉ : numérotation séquentielle des factures
-- -------------------------------------------------------------------------
-- FAILLE : le numéro de facture était tiré au hasard
--   (Math.random()*9000+1000) dans le formulaire, la facture consultant,
--   la facture auto-CRA ET le trigger DB. Conséquences :
--   · NON CONFORME art. 242 nonies A / L441-9 (numérotation continue, sans
--     trou, chronologique OBLIGATOIRE) ;
--   · ~50 % de collision au-delà de ~110 factures (9000 valeurs, paradoxe
--     des anniversaires) → violation UNIQUE(org, invoice_number) = 23505
--     brut renvoyé à l'utilisateur.
--
-- CORRECTIF (au niveau DB, donc valable pour TOUS les chemins d'insertion
-- sans toucher au code applicatif fragile) :
--   · compteur atomique par (organisation, préfixe FAC/FC, année) ;
--   · fonction next_invoice_number() (INSERT ... ON CONFLICT DO UPDATE
--     RETURNING = atomique, aucune course) ;
--   · trigger BEFORE INSERT qui attribue un numéro séquentiel
--     (FAC-2026-0001, FAC-2026-0002…) quand le numéro est vide OU encore au
--     format aléatoire hérité. Un numéro manuel réellement personnalisé
--     (autre format) est conservé.
--
-- Les factures existantes gardent leur numéro (pas de renumérotation
-- rétroactive — casserait les références). Le compteur démarre au-dessus du
-- plus grand séquentiel déjà présent par (org, préfixe, année).
-- =========================================================================

-- ── 1. Table de compteurs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_number_counters (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prefix text NOT NULL,     -- 'FAC' (vente client) | 'FC' (sous-traitance)
  year int NOT NULL,
  last_seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, prefix, year)
);
-- Écrit uniquement par la fonction SECURITY DEFINER ci-dessous : aucun accès
-- direct pour les clients (RLS active, aucune policy = deny par défaut).
ALTER TABLE invoice_number_counters ENABLE ROW LEVEL SECURITY;

-- ── 2. Attribution atomique du prochain numéro ───────────────────────────
CREATE OR REPLACE FUNCTION public.next_invoice_number(
  p_org uuid, p_prefix text, p_year int
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq int;
BEGIN
  INSERT INTO invoice_number_counters (organization_id, prefix, year, last_seq)
  VALUES (p_org, p_prefix, p_year, 1)
  ON CONFLICT (organization_id, prefix, year)
  DO UPDATE SET last_seq = invoice_number_counters.last_seq + 1
  RETURNING last_seq INTO seq;
  RETURN p_prefix || '-' || p_year || '-' || lpad(seq::text, 4, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid, text, int) FROM anon, authenticated, public;

-- ── 3. Trigger BEFORE INSERT : numérotation séquentielle garantie ────────
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pfx text;
  yr int;
BEGIN
  pfx := CASE WHEN NEW.party = 'consultant' THEN 'FC' ELSE 'FAC' END;
  yr := EXTRACT(YEAR FROM COALESCE(NEW.issue_date, CURRENT_DATE))::int;
  -- Numéro vide OU au format aléatoire hérité (FAC/FC-AAAA-NNN[N…]) → on
  -- attribue le prochain séquentiel. Un vrai numéro manuel (autre format)
  -- est laissé intact.
  IF NEW.invoice_number IS NULL
     OR btrim(NEW.invoice_number) = ''
     OR NEW.invoice_number ~ '^(FAC|FC)-\d{4}-\d{3,}$' THEN
    NEW.invoice_number := public.next_invoice_number(NEW.organization_id, pfx, yr);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_invoice_number() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON invoices;
CREATE TRIGGER trg_assign_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_invoice_number();

-- ── 4. Amorçage des compteurs au-dessus de l'existant ────────────────────
-- Récupère le plus grand séquentiel déjà utilisé par (org, préfixe, année)
-- pour les numéros au format standard, afin d'éviter toute collision avec
-- l'historique.
INSERT INTO invoice_number_counters (organization_id, prefix, year, last_seq)
SELECT
  i.organization_id,
  CASE WHEN i.party = 'consultant' THEN 'FC' ELSE 'FAC' END AS prefix,
  EXTRACT(YEAR FROM i.issue_date)::int AS year,
  MAX(
    CASE
      WHEN i.invoice_number ~ '^(FAC|FC)-\d{4}-\d+$'
        THEN split_part(i.invoice_number, '-', 3)::int
      ELSE 0
    END
  ) AS last_seq
FROM invoices i
WHERE i.issue_date IS NOT NULL
GROUP BY i.organization_id, CASE WHEN i.party = 'consultant' THEN 'FC' ELSE 'FAC' END, EXTRACT(YEAR FROM i.issue_date)::int
ON CONFLICT (organization_id, prefix, year)
DO UPDATE SET last_seq = GREATEST(invoice_number_counters.last_seq, EXCLUDED.last_seq);
