-- =========================================================================
-- 081 — Preuve d'acceptation des documents légaux (clickwrap)
-- =========================================================================
-- Au self-signup (/essai), le prospect DOIT accepter CGU + Politique de
-- confidentialité + DPA. On horodate cette acceptation (version + IP + UA)
-- pour avoir une PREUVE opposable (le DPA Art. 28 est incorporé aux CGU →
-- sans acceptation, le contrat de sous-traitance n'est pas conclu).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,                       -- auth.users.id (pas de FK cross-schema)
  documents TEXT[] NOT NULL,          -- ex. {cgu,privacy,dpa}
  version TEXT NOT NULL,              -- version des documents acceptés
  ip TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.legal_acceptances IS
  'Preuve d''acceptation des documents légaux (CGU/Confidentialité/DPA) au signup — horodatée, versionnée, avec IP/UA. Base opposable en cas de litige.';

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_org
  ON public.legal_acceptances (organization_id, accepted_at DESC);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances FORCE ROW LEVEL SECURITY;

-- Lecture : un membre de l'org peut consulter les acceptations de son org
-- (un admin peut prouver le consentement). Écriture uniquement service_role
-- (côté serveur, à l'inscription) → aucune policy INSERT/UPDATE/DELETE cliente.
DROP POLICY IF EXISTS "legal_acceptances_select_member" ON public.legal_acceptances;
CREATE POLICY "legal_acceptances_select_member" ON public.legal_acceptances
  FOR SELECT USING (public.is_member_of(organization_id));
