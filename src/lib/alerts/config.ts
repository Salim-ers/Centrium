// =========================================================================
// Système d'alertes — configuration et défauts
// -------------------------------------------------------------------------
// Les réglages effectifs d'une organisation = DEFAULT_ORG_NOTIFICATION_SETTINGS
// fusionnés (deep-merge superficiel par section) avec la ligne
// org_notification_settings.settings (JSONB d'overrides, migration 084).
// Les cadences sont exprimées en JOURS. Tout est configurable par org.
// =========================================================================

import type { AlertType } from '@/types';

/** Catégories de notifications — pilotent les préférences par utilisateur. */
export type NotificationCategory =
  | 'consultants' // profils incomplets, documents, disponibilité
  | 'cra' // timesheets : saisie, validation, retards
  | 'invoices' // facturation, échéances, impayés
  | 'contracts' // signatures, expirations, avenants
  | 'missions' // débuts, fins, prolongations
  | 'crm' // opportunités, relances contacts
  | 'system'; // quotas, techniques, sécurité

/** Rattachement de chaque type d'alerte à sa catégorie de préférences. */
export const ALERT_CATEGORY: Record<AlertType, NotificationCategory> = {
  client_follow_up: 'crm',
  unanswered_message: 'crm',
  mission_ending: 'missions',
  consultant_available: 'consultants',
  timesheet_pending: 'cra',
  invoice_overdue: 'invoices',
  offer_stale: 'crm',
  opportunity_cold: 'crm',
  profile_incomplete: 'consultants',
  document_expiring: 'consultants',
  timesheet_missing: 'cra',
  invoice_forgotten: 'invoices',
  invoice_draft_stale: 'invoices',
  contract_pending_signature: 'contracts',
  contract_expiring: 'contracts',
  mission_no_contract: 'contracts',
  mission_overrun: 'missions',
  invitation_pending: 'system',
  system_issue: 'system',
};

/**
 * Alertes imposées : l'organisation garantit leur réception in-app quel que
 * soit l'opt-out utilisateur (les canaux email/SMS restent débrayables).
 */
export const MANDATORY_ALERT_KINDS: AlertType[] = [
  'invoice_overdue',
  'system_issue',
];

export type OrgNotificationSettings = {
  /** Canaux activés au niveau organisation. */
  channels: { in_app: boolean; email: boolean; sms: boolean };
  /** Cadences de relance par famille (jours). */
  cadences: {
    /** Relance profil incomplet : première alerte immédiate, puis tous les N jours. */
    profile_incomplete: { repeat_days: number; escalate_after_reminders: number };
    /** Fenêtres d'alerte avant expiration d'un document (jours avant échéance). */
    document_expiry_windows: number[];
    /** Relances CRA (retard de soumission) : répétition en jours. */
    cra: { repeat_days: number; escalate_after_reminders: number };
    /** Relances processus factures internes (brouillon dormant, oubli). */
    invoices: { repeat_days: number };
    /** Fenêtres d'alerte avant fin de mission / contrat (jours avant). */
    ending_windows: number[];
    /** Relance des autres alertes matérialisées. */
    default: { repeat_days: number };
  };
  /** Seuils de détection (jours). */
  thresholds: {
    invoice_draft_stale_days: number;
    invoice_forgotten_days: number;
    opportunity_stale_days: number;
    invitation_pending_days: number;
  };
  /** Récapitulatifs email aux admins. */
  digest: { daily: boolean; weekly: boolean };
  /**
   * Relance automatique des CLIENTS pour les impayés (email au contact de
   * facturation). false par défaut : jamais de relance client sans décision
   * explicite de l'organisation — seule une alerte interne est créée.
   */
  client_dunning_auto: boolean;
};

export const DEFAULT_ORG_NOTIFICATION_SETTINGS: OrgNotificationSettings = {
  channels: { in_app: true, email: true, sms: false },
  cadences: {
    profile_incomplete: { repeat_days: 7, escalate_after_reminders: 2 },
    document_expiry_windows: [60, 30, 15, 7, 1, 0],
    cra: { repeat_days: 7, escalate_after_reminders: 2 },
    invoices: { repeat_days: 7 },
    ending_windows: [60, 30, 15, 7, 1, 0],
    default: { repeat_days: 7 },
  },
  thresholds: {
    invoice_draft_stale_days: 5,
    invoice_forgotten_days: 7,
    opportunity_stale_days: 14,
    invitation_pending_days: 7,
  },
  digest: { daily: false, weekly: true },
  client_dunning_auto: false,
};

/**
 * Fusionne les overrides JSONB d'une org avec les défauts. Merge superficiel
 * par section : un override partiel ({"digest": {"daily": true}}) ne perd pas
 * les autres clés de la section.
 */
export function resolveOrgSettings(
  overrides: Partial<Record<string, unknown>> | null | undefined,
): OrgNotificationSettings {
  const d = DEFAULT_ORG_NOTIFICATION_SETTINGS;
  if (!overrides || typeof overrides !== 'object') return d;
  const o = overrides as Partial<OrgNotificationSettings>;
  return {
    channels: { ...d.channels, ...(o.channels ?? {}) },
    cadences: {
      profile_incomplete: { ...d.cadences.profile_incomplete, ...(o.cadences?.profile_incomplete ?? {}) },
      document_expiry_windows:
        o.cadences?.document_expiry_windows ?? d.cadences.document_expiry_windows,
      cra: { ...d.cadences.cra, ...(o.cadences?.cra ?? {}) },
      invoices: { ...d.cadences.invoices, ...(o.cadences?.invoices ?? {}) },
      ending_windows: o.cadences?.ending_windows ?? d.cadences.ending_windows,
      default: { ...d.cadences.default, ...(o.cadences?.default ?? {}) },
    },
    thresholds: { ...d.thresholds, ...(o.thresholds ?? {}) },
    digest: { ...d.digest, ...(o.digest ?? {}) },
    client_dunning_auto: o.client_dunning_auto ?? d.client_dunning_auto,
  };
}

/** Intervalle de relance (jours) applicable à un type d'alerte donné. */
export function reminderIntervalDays(
  kind: AlertType,
  settings: OrgNotificationSettings,
): number {
  switch (ALERT_CATEGORY[kind]) {
    case 'consultants':
      return settings.cadences.profile_incomplete.repeat_days;
    case 'cra':
      return settings.cadences.cra.repeat_days;
    case 'invoices':
      return settings.cadences.invoices.repeat_days;
    default:
      return settings.cadences.default.repeat_days;
  }
}
