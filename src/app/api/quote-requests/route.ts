import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/quote-requests — Formulaire public "Demande de devis".
//
// 1) Insert dans quote_requests (DB) via service_role
// 2) Notification email via Formspree → contact@centrium-platform.com
//
// L'envoi email est best-effort : si Formspree timeout/échoue, on
// renvoie quand même OK au prospect (la trace en DB suffit). Pas
// d'auth requise.
// =========================================================================

export const runtime = 'nodejs';

// Endpoint Formspree dédié aux demandes de devis (distinct du
// formulaire de contact landing). Configuré côté Formspree pour
// forwarder à contact@centrium-platform.com.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqenvzve';
const NOTIFICATION_EMAIL = 'contact@centrium-platform.com';

const schema = z.object({
  company_name: z.string().min(1, 'Nom de société requis').max(200),
  industry: z.string().max(100).optional().nullable(),
  team_size: z.string().max(50).optional().nullable(),
  consultants_count: z.string().max(50).optional().nullable(),
  contact_name: z.string().min(1, 'Nom du contact requis').max(120),
  contact_email: z.string().email('Email invalide').max(200),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_role: z.string().max(120).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  wanted_help: z.array(z.string().max(60)).max(10).optional().nullable(),
});

/** Tag lisible pour l'email. Tableau → chips lisibles. */
const HELP_LABELS: Record<string, string> = {
  cv_template: 'Template CV à notre image',
  contract_template: 'Template de contrat à notre image',
  logo: 'Création / refonte de logo',
  brand_colors: 'Charte graphique (couleurs)',
  mentions_legales: 'Aide à la rédaction des mentions légales',
  signature: 'Signature numérique',
  fiche_poste: 'Template fiche de poste',
  autre: 'Autre (détails dans le message)',
};

async function notifyByEmail(payload: z.infer<typeof schema>): Promise<void> {
  const help = (payload.wanted_help ?? [])
    .map((k) => HELP_LABELS[k] ?? k)
    .join(', ');

  const body = new FormData();
  body.append('_subject', `Nouvelle demande de devis — ${payload.company_name}`);
  body.append('_replyto', payload.contact_email);
  body.append('Société', payload.company_name);
  if (payload.industry) body.append('Secteur', payload.industry);
  if (payload.team_size) body.append('Taille équipe', payload.team_size);
  if (payload.consultants_count)
    body.append('Consultants gérés', payload.consultants_count);
  body.append('Contact', payload.contact_name);
  body.append('Email contact', payload.contact_email);
  if (payload.contact_phone) body.append('Téléphone', payload.contact_phone);
  if (payload.contact_role) body.append('Fonction', payload.contact_role);
  if (help) body.append("Besoins d'accompagnement", help);
  if (payload.message) body.append('Message', payload.message);
  body.append('Notification destinée à', NOTIFICATION_EMAIL);

  // Timeout doux : on attend max 4s puis on lâche pour ne pas
  // bloquer la réponse au prospect.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
  } catch {
    // best-effort, on ignore
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quote_requests')
    .insert({
      ...parsed.data,
      industry: parsed.data.industry || null,
      team_size: parsed.data.team_size || null,
      consultants_count: parsed.data.consultants_count || null,
      contact_phone: parsed.data.contact_phone || null,
      contact_role: parsed.data.contact_role || null,
      message: parsed.data.message || null,
      source: parsed.data.source || null,
      wanted_help:
        parsed.data.wanted_help && parsed.data.wanted_help.length > 0
          ? parsed.data.wanted_help
          : null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'insert_failed', message: error.message },
      { status: 500 },
    );
  }

  // Notification email — best-effort, ne fait pas échouer la requête.
  void notifyByEmail(parsed.data);

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}
