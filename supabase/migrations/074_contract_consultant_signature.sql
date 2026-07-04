-- =========================================================================
-- 074 — Signature électronique du contrat par le CONSULTANT (prestataire)
-- -------------------------------------------------------------------------
-- Tous les consultants sont freelances : le contrat doit être co-signé.
-- L'admin signe via le tampon d'organisation (branding.signatureUrl) ;
-- le consultant signe depuis son portail (canvas → PNG dataURL).
--
-- Écriture UNIQUEMENT via /api/portal/contracts/[id]/sign (service role,
-- après contrôle que le contrat appartient bien au consultant connecté et
-- qu'il est au statut sent/pending_review). Pas de policy UPDATE RLS
-- consultant sur contracts : la route API est le seul chemin.
-- =========================================================================

alter table public.contracts
  add column if not exists consultant_signature_data text,
  add column if not exists consultant_signed_name text,
  add column if not exists consultant_signed_at timestamptz;

comment on column public.contracts.consultant_signature_data is
  'Signature manuscrite du consultant (PNG dataURL, tracée dans le portail)';
comment on column public.contracts.consultant_signed_name is
  'Nom complet saisi par le consultant au moment de la signature';
comment on column public.contracts.consultant_signed_at is
  'Horodatage de la signature consultant (co-signature du contrat)';
