import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

// =========================================================================
// Battement de cœur des tâches planifiées (table cron_heartbeats, mig. 092).
// Chaque cron appelle recordHeartbeat() à la fin de son exécution. Un cron
// qui ne s'exécute plus (mauvaise config, non déclenché) devient « périmé »
// et est signalé par /api/health.
// =========================================================================

export type CronName = 'alerts-engine' | 'purge-archives';

/** Enregistre l'exécution d'un cron. Ne throw jamais (best-effort). */
export async function recordHeartbeat(
  admin: SupabaseClient,
  name: CronName,
  status: 'ok' | 'error',
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await admin.from('cron_heartbeats').upsert(
      { name, last_run_at: now, last_status: status, detail: detail ?? null, updated_at: now },
      { onConflict: 'name' },
    );
  } catch (e) {
    logger.warn('[heartbeat] record failed', (e as Error).message);
  }
}

/** Seuils de fraîcheur (heures) au-delà desquels un cron est « périmé ». */
const STALE_AFTER_HOURS: Record<CronName, number> = {
  'alerts-engine': 36, // quotidien → toléré 1,5 j
  'purge-archives': 24 * 40, // mensuel → toléré ~40 j
};

export type CronHealth = {
  name: string;
  last_run_at: string | null;
  last_status: string | null;
  stale: boolean;
};

/** État de fraîcheur de tous les crons connus (pour /api/health). */
export async function getCronHealth(admin: SupabaseClient): Promise<CronHealth[]> {
  const { data } = await admin
    .from('cron_heartbeats')
    .select('name, last_run_at, last_status');
  const byName = new Map(
    (data ?? []).map((r) => [r.name as string, r as { last_run_at: string; last_status: string }]),
  );
  const now = Date.now();
  return (Object.keys(STALE_AFTER_HOURS) as CronName[]).map((name) => {
    const row = byName.get(name);
    const lastRun = row?.last_run_at ? new Date(row.last_run_at).getTime() : null;
    const stale =
      lastRun === null || now - lastRun > STALE_AFTER_HOURS[name] * 3_600_000;
    return {
      name,
      last_run_at: row?.last_run_at ?? null,
      last_status: row?.last_status ?? null,
      stale,
    };
  });
}
