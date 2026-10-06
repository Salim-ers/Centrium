// =========================================================================
// RBAC Centrium — matrice de permissions par rôle
// -------------------------------------------------------------------------
// Source unique des droits fonctionnels. Utilisée :
//   - côté serveur par requirePermission() (route handlers, Server Components)
//     → c'est LÀ que l'accès est décidé ;
//   - côté client pour masquer ce que l'utilisateur ne peut pas faire
//     (confort d'interface uniquement, jamais une barrière).
// La RLS Postgres reste la dernière ligne de défense (isolation par
// organisation, clôture consultant / client).
//
// Chaque organisation peut surcharger la matrice par défaut (table
// role_permissions). Le rôle `owner` et les permissions marquées
// `locked` ne sont pas surchargeables.
// =========================================================================

import type { UserRole } from '@/types';

export const PERMISSIONS = [
  'dashboard.view',
  'crm.view',
  'crm.edit',
  'clients.view',
  'clients.edit',
  'opportunities.view',
  'opportunities.edit',
  'consultants.view',
  'consultants.edit',
  'consultants.financials',
  'staffing.view',
  'staffing.edit',
  'missions.view',
  'missions.edit',
  'timesheets.view',
  'timesheets.validate',
  'documents.view',
  'documents.edit',
  'finance.view',
  'finance.edit',
  'portals.manage',
  'automations.manage',
  'analytics.view',
  'settings.manage',
  'team.manage',
  'billing.manage',
  'org.delete',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Rôle effectif : `owner` est un admin portant le drapeau is_owner. */
export type EffectiveRole = UserRole | 'owner' | 'direction' | 'client';

/** Permissions que seule la matrice par défaut peut accorder. */
export const LOCKED_PERMISSIONS: Permission[] = ['org.delete', 'billing.manage', 'team.manage'];

/** Rôles internes (comptent comme licences, accès à l'application). */
export const INTERNAL_ROLES: EffectiveRole[] = [
  'owner',
  'admin',
  'direction',
  'business_manager',
  'commercial',
  'recruiter',
  'operations',
  'finance',
  'viewer',
];

/** Rôles assignables depuis Paramètres → Équipe. */
export const ASSIGNABLE_ROLES = [
  'admin',
  'direction',
  'business_manager',
  'recruiter',
  'finance',
  'viewer',
] as const;
/**
 * Rôles qui n'existent en base qu'après les migrations 105-106 (valeurs
 * d'enum et matrice SQL). Le serveur ne les propose que si la matrice SQL
 * les connaît (voir lib/auth/role-support).
 */
export const EXTENDED_ROLES = ['commercial', 'operations'] as const;
export type ExtendedRole = (typeof EXTENDED_ROLES)[number];

/** Tous les rôles internes qu'une organisation peut attribuer, base à jour. */
export const ALL_ASSIGNABLE_ROLES = ['admin', 'direction', 'business_manager', 'commercial', 'recruiter', 'operations', 'finance', 'viewer'] as const;
export type AssignableRole = (typeof ALL_ASSIGNABLE_ROLES)[number];

const ALL_VIEW: Permission[] = PERMISSIONS.filter((p) => p.endsWith('.view'));

const DEFAULTS: Record<EffectiveRole, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((p) => p !== 'org.delete'),
  direction: [
    ...ALL_VIEW,
    'crm.edit',
    'clients.edit',
    'opportunities.edit',
    'consultants.edit',
    'consultants.financials',
    'staffing.edit',
    'missions.edit',
    'timesheets.validate',
    'documents.edit',
    'automations.manage',
  ],
  business_manager: [
    'dashboard.view',
    'crm.view',
    'crm.edit',
    'clients.view',
    'clients.edit',
    'opportunities.view',
    'opportunities.edit',
    'consultants.view',
    'consultants.edit',
    'consultants.financials',
    'staffing.view',
    'staffing.edit',
    'missions.view',
    'missions.edit',
    'timesheets.view',
    'timesheets.validate',
    'documents.view',
    'documents.edit',
    'finance.view',
    'portals.manage',
    'analytics.view',
  ],
  // Commercial (ingénieur d'affaires) : pipeline, clients, positionnement et
  // propositions, avec les TJM et marges pour chiffrer ; ni validation de
  // CRA ni pilotage financier.
  commercial: [
    'dashboard.view',
    'crm.view',
    'crm.edit',
    'clients.view',
    'clients.edit',
    'opportunities.view',
    'opportunities.edit',
    'consultants.view',
    'consultants.financials',
    'staffing.view',
    'staffing.edit',
    'missions.view',
    'documents.view',
    'documents.edit',
    'analytics.view',
  ],
  // Opérations (ADV, delivery) : missions, CRA, contrats et documents,
  // accès portail ; voit la préfacturation sans la valider ni l'exporter.
  operations: [
    'dashboard.view',
    'clients.view',
    'opportunities.view',
    'consultants.view',
    'consultants.edit',
    'staffing.view',
    'missions.view',
    'missions.edit',
    'timesheets.view',
    'timesheets.validate',
    'documents.view',
    'documents.edit',
    'finance.view',
    'portals.manage',
  ],
  recruiter: [
    'dashboard.view',
    'crm.view',
    'clients.view',
    'opportunities.view',
    'consultants.view',
    'consultants.edit',
    'staffing.view',
    'staffing.edit',
    'missions.view',
    'timesheets.view',
    'documents.view',
    'documents.edit',
  ],
  finance: [
    'dashboard.view',
    'clients.view',
    'opportunities.view',
    'consultants.view',
    'consultants.financials',
    'missions.view',
    'timesheets.view',
    'documents.view',
    'documents.edit',
    'finance.view',
    'finance.edit',
    'analytics.view',
  ],
  // Lecture seule historique : tout voir sauf les données financières.
  viewer: ALL_VIEW.filter((p) => p !== 'finance.view'),
  consultant: [],
  client: [],
  super_admin: [],
};

export type PermissionOverride = { role: string; permission: string; allowed: boolean };

/**
 * Résout l'ensemble des permissions d'un rôle, surcharges d'organisation
 * comprises. Une surcharge ne peut ni toucher `owner`, ni accorder une
 * permission verrouillée, ni concerner un rôle externe (consultant, client).
 */
export function resolvePermissions(
  role: EffectiveRole | null | undefined,
  overrides: PermissionOverride[] = [],
): Set<Permission> {
  if (!role) return new Set();
  const base = new Set<Permission>(DEFAULTS[role] ?? []);
  if (role === 'owner' || !INTERNAL_ROLES.includes(role)) return base;
  for (const o of overrides) {
    if (o.role !== role) continue;
    if (!(PERMISSIONS as readonly string[]).includes(o.permission)) continue;
    const perm = o.permission as Permission;
    if (o.allowed) {
      if (!LOCKED_PERMISSIONS.includes(perm)) base.add(perm);
    } else {
      base.delete(perm);
    }
  }
  return base;
}

export function can(
  role: EffectiveRole | null | undefined,
  permission: Permission,
  overrides: PermissionOverride[] = [],
): boolean {
  return resolvePermissions(role, overrides).has(permission);
}

export function defaultPermissions(role: EffectiveRole): Permission[] {
  return [...(DEFAULTS[role] ?? [])];
}

/** Rôle effectif à partir du rôle DB et du drapeau propriétaire. */
export function effectiveRole(role: UserRole | null | undefined, isOwner: boolean): EffectiveRole | null {
  if (!role) return null;
  if (isOwner && role === 'admin') return 'owner';
  return role as EffectiveRole;
}

export const ROLE_LABEL: Record<EffectiveRole, { fr: string; en: string }> = {
  owner: { fr: 'Propriétaire', en: 'Owner' },
  admin: { fr: 'Administrateur', en: 'Administrator' },
  direction: { fr: 'Direction', en: 'Leadership' },
  business_manager: { fr: 'Business Manager', en: 'Business Manager' },
  commercial: { fr: 'Commercial', en: 'Sales' },
  recruiter: { fr: 'Recruteur', en: 'Recruiter' },
  operations: { fr: 'Opérations', en: 'Operations' },
  finance: { fr: 'Finance / ADV', en: 'Finance / Sales admin' },
  viewer: { fr: 'Lecture seule', en: 'Read-only' },
  consultant: { fr: 'Consultant', en: 'Consultant' },
  client: { fr: 'Client', en: 'Client' },
  super_admin: { fr: 'Super admin', en: 'Super admin' },
};

/** Ce que chaque rôle voit et fait, en une phrase (équipe, permissions). */
export const ROLE_DESCRIPTION: Partial<Record<EffectiveRole, { fr: string; en: string }>> = {
  owner: { fr: 'Tous les droits, abonnement et suppression de l’organisation compris.', en: 'Every right, including subscription and organisation deletion.' },
  admin: { fr: 'Tous les droits sauf la suppression de l’organisation : équipe, paramètres, abonnement.', en: 'Every right except deleting the organisation: team, settings, subscription.' },
  direction: { fr: 'Pilotage complet : tout voir, décider, valider les CRA, sans administrer l’équipe.', en: 'Full oversight: sees everything, decides, approves timesheets, without managing the team.' },
  business_manager: { fr: 'Commercial et delivery : pipeline, clients, staffing, missions et validation des CRA.', en: 'Sales and delivery: pipeline, clients, staffing, missions and timesheet approval.' },
  commercial: { fr: 'Pipeline, clients, positionnement des consultants et propositions ; ni CRA ni finance.', en: 'Pipeline, clients, staffing proposals and quotes; no timesheets or finance.' },
  recruiter: { fr: 'Talents, CV, matching et staffing ; sans les TJM, coûts ni marges.', en: 'Talent, CVs, matching and staffing; no rates, costs or margins.' },
  operations: { fr: 'Missions, CRA, contrats, documents et accès portail ; préfacturation en lecture.', en: 'Missions, timesheets, contracts, documents and portal access; pre-invoicing read-only.' },
  finance: { fr: 'Préfacturation, encaissements et exports ; consultants et missions en lecture.', en: 'Pre-invoicing, collections and exports; consultants and missions read-only.' },
  viewer: { fr: 'Tout consulter sauf les données financières, sans rien modifier.', en: 'Read everything except financial data, without editing.' },
};

export const PERMISSION_LABEL: Record<Permission, { fr: string; en: string; group: string }> = {
  'dashboard.view': { fr: 'Voir le dashboard', en: 'View dashboard', group: 'Pilotage' },
  'crm.view': { fr: 'Voir le CRM', en: 'View CRM', group: 'Commercial' },
  'crm.edit': { fr: 'Modifier le CRM', en: 'Edit CRM', group: 'Commercial' },
  'clients.view': { fr: 'Voir les clients', en: 'View clients', group: 'Commercial' },
  'clients.edit': { fr: 'Modifier les clients', en: 'Edit clients', group: 'Commercial' },
  'opportunities.view': { fr: 'Voir les opportunités', en: 'View opportunities', group: 'Commercial' },
  'opportunities.edit': { fr: 'Modifier les opportunités', en: 'Edit opportunities', group: 'Commercial' },
  'consultants.view': { fr: 'Voir les consultants', en: 'View consultants', group: 'Ressources' },
  'consultants.edit': { fr: 'Modifier les consultants', en: 'Edit consultants', group: 'Ressources' },
  'consultants.financials': { fr: 'Voir TJM, CJM et marges', en: 'View rates, costs and margins', group: 'Ressources' },
  'staffing.view': { fr: 'Voir le staffing', en: 'View staffing', group: 'Ressources' },
  'staffing.edit': { fr: 'Positionner des consultants', en: 'Staff consultants', group: 'Ressources' },
  'missions.view': { fr: 'Voir les missions', en: 'View missions', group: 'Ressources' },
  'missions.edit': { fr: 'Modifier les missions', en: 'Edit missions', group: 'Ressources' },
  'timesheets.view': { fr: 'Voir les CRA', en: 'View timesheets', group: 'Opérations' },
  'timesheets.validate': { fr: 'Valider les CRA', en: 'Approve timesheets', group: 'Opérations' },
  'documents.view': { fr: 'Voir les documents', en: 'View documents', group: 'Opérations' },
  'documents.edit': { fr: 'Créer et modifier les documents', en: 'Create and edit documents', group: 'Opérations' },
  'finance.view': { fr: 'Voir la finance', en: 'View finance', group: 'Opérations' },
  'finance.edit': { fr: 'Valider et exporter la préfacturation', en: 'Approve and export pre-invoicing', group: 'Opérations' },
  'portals.manage': { fr: 'Gérer les accès portail', en: 'Manage portal access', group: 'Collaboration' },
  'automations.manage': { fr: 'Gérer les automatisations', en: 'Manage automations', group: 'Collaboration' },
  'analytics.view': { fr: 'Voir les analytics', en: 'View analytics', group: 'Analyse' },
  'settings.manage': { fr: "Paramétrer l'organisation", en: 'Manage organisation settings', group: 'Administration' },
  'team.manage': { fr: "Gérer l'équipe et les rôles", en: 'Manage team and roles', group: 'Administration' },
  'billing.manage': { fr: "Gérer l'abonnement", en: 'Manage subscription', group: 'Administration' },
  'org.delete': { fr: "Supprimer l'organisation", en: 'Delete organisation', group: 'Administration' },
};
