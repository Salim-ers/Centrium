import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase admin (service_role).
 *
 * ⚠️ BYPASS TOUTE RLS. À utiliser UNIQUEMENT :
 *   • dans Route Handlers serveur (src/app/api/**\/route.ts)
 *   • dans Edge Functions Supabase
 *   • dans les webhooks (Stripe, etc.)
 *
 * JAMAIS dans un Server Component, jamais côté client, jamais dans une page.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante. Ajoute-la dans .env.local (serveur uniquement).',
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
