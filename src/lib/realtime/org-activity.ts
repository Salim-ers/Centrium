'use client';

/**
 * "Activity feed" temps réel par organisation : quand un membre fait une
 * action notable (créer un consultant, archiver une mission, marquer une
 * facture payée…), il broadcast un event lisible sur la channel
 * `activity:org:{orgId}`. Les autres membres reçoivent et affichent un
 * petit toast non bloquant — façon "Salim vient d'ajouter Jean Dupont".
 *
 * On ne stocke RIEN en DB : c'est purement de l'information éphémère.
 * Si tu rates l'event (onglet fermé) tu ne le verras pas, et c'est OK :
 * les listes elles-mêmes se synchronisent via postgres_changes.
 */

import { createClient } from '@/lib/supabase/client';

export type ActivityKind =
  | 'consultant_created'
  | 'consultant_updated'
  | 'consultant_archived'
  | 'contact_created'
  | 'contact_updated'
  | 'opportunity_created'
  | 'opportunity_moved'
  | 'opportunity_deleted'
  | 'mission_created'
  | 'mission_activated'
  | 'mission_ended'
  | 'mission_archived'
  | 'invoice_created'
  | 'invoice_paid'
  | 'timesheet_validated'
  | 'offer_created'
  | 'offer_archived'
  | 'todo_shared';

export type ActivityPayload = {
  user_id: string;
  kind: ActivityKind;
  /** Label court affiché dans le toast. Ex: "Jean Dupont" ou "Mission Acme". */
  label: string;
  /** URL optionnelle pour cliquer et atterrir sur l'objet. */
  href?: string;
};

/**
 * Diffuse une activité aux autres membres de l'organisation. À appeler
 * juste après une mutation réussie (insert/update/delete). Best-effort —
 * un échec d'émission ne doit jamais casser le flux utilisateur.
 */
export async function broadcastOrgActivity(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  kind: ActivityKind,
  label: string,
  href?: string,
): Promise<void> {
  if (!orgId || !userId) return;
  try {
    const supabase = createClient();
    const channel = supabase.channel(`activity:org:${orgId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    // Subscribe puis send puis remove : pour un broadcast one-shot c'est
    // plus simple que de réutiliser une channel persistante. Le coût est
    // négligeable (~150 ms).
    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      const payload: ActivityPayload = { user_id: userId, kind, label, href };
      await channel.send({ type: 'broadcast', event: 'activity', payload }).catch(() => {});
      // Cleanup async — ne pas await sinon on retarde le caller.
      setTimeout(() => {
        void supabase.removeChannel(channel);
      }, 500);
    });
  } catch {
    // silent
  }
}

/** Phrase localisée pour le toast. */
export function describeActivity(kind: ActivityKind, actor: string, label: string): string {
  switch (kind) {
    case 'consultant_created':
      return `${actor} a ajouté le consultant ${label}`;
    case 'consultant_updated':
      return `${actor} a édité la fiche de ${label}`;
    case 'consultant_archived':
      return `${actor} a archivé ${label}`;
    case 'contact_created':
      return `${actor} a ajouté le contact ${label}`;
    case 'contact_updated':
      return `${actor} a édité ${label}`;
    case 'opportunity_created':
      return `${actor} a créé l'opportunité ${label}`;
    case 'opportunity_moved':
      return `${actor} a déplacé ${label}`;
    case 'opportunity_deleted':
      return `${actor} a supprimé l'opportunité ${label}`;
    case 'mission_created':
      return `${actor} a positionné ${label}`;
    case 'mission_activated':
      return `${actor} a activé la mission ${label}`;
    case 'mission_ended':
      return `${actor} a terminé la mission ${label}`;
    case 'mission_archived':
      return `${actor} a archivé la mission ${label}`;
    case 'invoice_created':
      return `${actor} a créé la facture ${label}`;
    case 'invoice_paid':
      return `${actor} a marqué payée la facture ${label}`;
    case 'timesheet_validated':
      return `${actor} a validé le CRA ${label}`;
    case 'offer_created':
      return `${actor} a publié l'offre ${label}`;
    case 'offer_archived':
      return `${actor} a archivé l'offre ${label}`;
    case 'todo_shared':
      return `${actor} a partagé une tâche avec l'équipe : ${label}`;
    default:
      return `${actor} a fait une modification (${label})`;
  }
}
