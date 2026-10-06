// =========================================================================
// Espace de démonstration « Atlas Conseil (démo) » : génère le seed SQL.
// -------------------------------------------------------------------------
// Données fictives mais cohérentes (clients, consultants, missions,
// pipeline, CRA, préfactures), datées par rapport au jour où le seed est
// joué : la démo reste à jour à chaque réinitialisation. Les noms de
// sociétés et de personnes sont inventés ; les e-mails utilisent le
// domaine réservé .example (jamais délivrables).
//
// Aucun compte utilisateur ni secret ici : scripts/demo/create-demo-users.ts
// crée les deux comptes (mots de passe en variables d'environnement).
//
// Usage : npx tsx scripts/demo/demo-seed.ts > supabase/seed/demo.sql
// =========================================================================

import { DEMO_CONSULTANT_ID, DEMO_ORG_ID } from '../../src/lib/demo/config';

const ORG = DEMO_ORG_ID;
const out: string[] = [];
const sql = (s: string) => out.push(s);
const q = (v: string | null | undefined) => (v == null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
const num = (v: number | null | undefined) => (v == null ? 'NULL' : String(v));
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
/** Date relative au jour du seed : CURRENT_DATE ± n jours. */
const day = (n: number | null) => (n == null ? 'NULL' : n === 0 ? 'CURRENT_DATE' : `CURRENT_DATE ${n > 0 ? '+' : '-'} ${Math.abs(n)}`);
const uid = (kind: string, n: number) => `de30${kind}-0000-4000-8000-${String(n).padStart(12, '0')}`;

// ── Clients et prospects ─────────────────────────────────────────────────
type Company = { key: string; name: string; kind: 'client' | 'prospect'; industry: string; size: string; city: string; slug: string };
const COMPANIES: Company[] = [
  { key: 'nordal', name: 'Nordal Assurances', kind: 'client', industry: 'Assurance', size: 'ETI', city: 'Paris', slug: 'nordal' },
  { key: 'helio', name: 'Helio Retail', kind: 'client', industry: 'Distribution', size: 'Grand groupe', city: 'Lyon', slug: 'helio' },
  { key: 'varenne', name: 'Varenne Énergie', kind: 'client', industry: 'Énergie', size: 'Grand groupe', city: 'Nantes', slug: 'varenne' },
  { key: 'opaline', name: 'Opaline Banque', kind: 'client', industry: 'Banque', size: 'Grand groupe', city: 'Paris', slug: 'opaline' },
  { key: 'kestrel', name: 'Kestrel Mobilités', kind: 'client', industry: 'Transport', size: 'ETI', city: 'Lille', slug: 'kestrel' },
  { key: 'brise', name: 'Brise Santé', kind: 'client', industry: 'Santé', size: 'ETI', city: 'Bordeaux', slug: 'brise' },
  { key: 'cobalt', name: 'Cobalt Logistique', kind: 'client', industry: 'Logistique', size: 'ETI', city: 'Marseille', slug: 'cobalt' },
  { key: 'mirabelle', name: 'Mirabelle Média', kind: 'client', industry: 'Médias', size: 'PME', city: 'Paris', slug: 'mirabelle' },
  { key: 'sorel', name: 'Sorel Industrie', kind: 'prospect', industry: 'Industrie', size: 'ETI', city: 'Grenoble', slug: 'sorel' },
  { key: 'altair', name: 'Altaïr Télécom', kind: 'prospect', industry: 'Télécoms', size: 'Grand groupe', city: 'Rennes', slug: 'altair' },
];
const companyId = (key: string) => uid('a001', COMPANIES.findIndex((c) => c.key === key) + 1);

type Contact = { company: string; first: string; last: string; title: string; type: string; lastInteraction: number | null };
const CONTACTS: Contact[] = [
  { company: 'nordal', first: 'Claire', last: 'Vidal', title: 'DSI adjointe', type: 'client_final', lastInteraction: -3 },
  { company: 'nordal', first: 'Paul', last: 'Arnaud', title: 'Acheteur prestations IT', type: 'buyer', lastInteraction: -12 },
  { company: 'helio', first: 'Marc', last: 'Petit', title: 'Responsable delivery e-commerce', type: 'client_final', lastInteraction: -5 },
  { company: 'varenne', first: 'Sophie', last: 'Leroy', title: 'Directrice de programme', type: 'manager', lastInteraction: -9 },
  { company: 'opaline', first: 'Julien', last: 'Masson', title: 'Head of Data', type: 'client_final', lastInteraction: -2 },
  { company: 'opaline', first: 'Nadia', last: 'Benali', title: 'Responsable achats IT', type: 'buyer', lastInteraction: -20 },
  { company: 'kestrel', first: 'Éric', last: 'Fontaine', title: 'CTO', type: 'client_final', lastInteraction: -7 },
  { company: 'brise', first: 'Hélène', last: 'Caron', title: 'Responsable PMO', type: 'manager', lastInteraction: -16 },
  { company: 'cobalt', first: 'Antoine', last: 'Mercier', title: 'DSI', type: 'client_final', lastInteraction: -4 },
  { company: 'mirabelle', first: 'Laura', last: 'Gauthier', title: 'Directrice produit', type: 'client_final', lastInteraction: -25 },
  { company: 'sorel', first: 'Vincent', last: 'Barbier', title: 'RSSI', type: 'client_final', lastInteraction: -1 },
  { company: 'altair', first: 'Céline', last: 'Royer', title: 'Directrice data & IA', type: 'client_final', lastInteraction: -6 },
];

// ── Consultants ──────────────────────────────────────────────────────────
type Consultant = {
  first: string;
  last: string;
  title: string;
  seniority: 'junior' | 'confirmed' | 'senior' | 'expert' | 'lead' | 'architect';
  years: number;
  city: string;
  contract: 'cdi' | 'freelance' | 'portage';
  rate: number;
  cost: number;
  skills: string[];
  category: string;
  english: string;
  certifications?: Array<{ name: string; issuer: string; year: number }>;
  summary: string;
  past: Array<{ client: string; role: string; from: number; to: number; context: string; env: string[] }>;
};
const CONSULTANTS: Consultant[] = [
  {
    first: 'Inès', last: 'Morel', title: 'Data engineer', seniority: 'confirmed', years: 5, city: 'Paris', contract: 'cdi', rate: 650, cost: 420,
    skills: ['Python', 'Spark', 'Airflow', 'SQL', 'AWS', 'dbt'], category: 'Data', english: 'Courant',
    certifications: [{ name: 'AWS Certified Data Engineer – Associate', issuer: 'Amazon Web Services', year: 2025 }],
    summary: 'Data engineer orientée qualité de données : pipelines Spark et Airflow, modélisation dbt, mise en production sur AWS.',
    past: [
      { client: 'Groupe Lumen', role: 'Data engineer', from: -1300, to: -720, context: 'Industrialisation des flux de données marketing.', env: ['Python', 'Airflow', 'PostgreSQL'] },
    ],
  },
  {
    first: 'Yanis', last: 'Benali', title: 'Développeur React', seniority: 'senior', years: 8, city: 'Paris', contract: 'freelance', rate: 620, cost: 520,
    skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'], category: 'Front-end', english: 'Courant',
    summary: 'Développeur front senior : applications React et Next.js à fort trafic, design system et performance.',
    past: [{ client: 'Banque Sirius', role: 'Développeur React', from: -1100, to: -400, context: 'Refonte de l’espace client web.', env: ['React', 'TypeScript', 'Redux'] }],
  },
  {
    first: 'Léa', last: 'Dubois', title: 'Product owner', seniority: 'senior', years: 9, city: 'Lyon', contract: 'cdi', rate: 700, cost: 450,
    skills: ['Scrum', 'Jira', 'User stories', 'SAFe', 'Figma'], category: 'Produit', english: 'Courant',
    certifications: [{ name: 'Professional Scrum Product Owner I', issuer: 'Scrum.org', year: 2022 }],
    summary: 'Product owner sur des produits B2C : priorisation par la valeur, ateliers utilisateurs, pilotage par les indicateurs.',
    past: [{ client: 'Enseigne Calypso', role: 'Product owner', from: -1500, to: -320, context: 'Programme de fidélité omnicanal.', env: ['Jira', 'Confluence', 'Figma'] }],
  },
  {
    first: 'Hugo', last: 'Lambert', title: 'Chef de projet', seniority: 'expert', years: 14, city: 'Nantes', contract: 'cdi', rate: 780, cost: 500,
    skills: ['Pilotage de projet', 'PRINCE2', 'MS Project', 'Gestion budgétaire', 'Gestion des risques'], category: 'Pilotage', english: 'Professionnel',
    certifications: [{ name: 'PRINCE2 Practitioner', issuer: 'AXELOS', year: 2019 }],
    summary: 'Chef de projet confirmé sur des programmes industriels : planning, budget, risques et comités de pilotage.',
    past: [{ client: 'Réseau Ouest Énergies', role: 'Chef de projet', from: -1800, to: -280, context: 'Déploiement d’un SI de facturation.', env: ['MS Project', 'Jira'] }],
  },
  {
    first: 'Sarah', last: 'Petit', title: 'Analyste BI', seniority: 'confirmed', years: 4, city: 'Nantes', contract: 'cdi', rate: 560, cost: 360,
    skills: ['Power BI', 'SQL', 'DAX', 'Azure', 'Excel'], category: 'Data', english: 'Professionnel',
    certifications: [{ name: 'Microsoft Certified: Power BI Data Analyst Associate', issuer: 'Microsoft', year: 2024 }],
    summary: 'Analyste BI : tableaux de bord Power BI, modélisation DAX et recueil des besoins métier.',
    past: [{ client: 'Coopérative Armor', role: 'Analyste BI', from: -900, to: -130, context: 'Reporting commercial et logistique.', env: ['Power BI', 'SQL Server'] }],
  },
  {
    first: 'Tom', last: 'Girard', title: 'Data engineer', seniority: 'senior', years: 9, city: 'Paris', contract: 'freelance', rate: 720, cost: 600,
    skills: ['Scala', 'Spark', 'Kafka', 'GCP', 'BigQuery', 'SQL'], category: 'Data', english: 'Courant',
    summary: 'Data engineer senior : traitements temps réel Kafka et Spark, plateformes GCP pour la banque et l’assurance.',
    past: [{ client: 'Assureur Hélios', role: 'Data engineer', from: -1000, to: -200, context: 'Plateforme de données sinistres.', env: ['Spark', 'Kafka', 'GCP'] }],
  },
  {
    first: 'Jade', last: 'Moreau', title: 'Développeuse React', seniority: 'confirmed', years: 4, city: 'Paris', contract: 'cdi', rate: 560, cost: 380,
    skills: ['React', 'TypeScript', 'Jest', 'CSS', 'Storybook'], category: 'Front-end', english: 'Courant',
    summary: 'Développeuse front-end : composants React accessibles, tests et documentation Storybook.',
    past: [{ client: 'Mutuelle Ardoise', role: 'Développeuse React', from: -700, to: -100, context: 'Parcours de souscription en ligne.', env: ['React', 'TypeScript'] }],
  },
  {
    first: 'Chloé', last: 'Lambert', title: 'Architecte cloud', seniority: 'architect', years: 15, city: 'Paris', contract: 'portage', rate: 950, cost: 820,
    skills: ['AWS', 'Terraform', 'Kubernetes', 'Architecture', 'Sécurité cloud'], category: 'Cloud', english: 'Bilingue',
    certifications: [{ name: 'AWS Certified Solutions Architect – Professional', issuer: 'Amazon Web Services', year: 2024 }],
    summary: 'Architecte cloud : migrations vers AWS, infrastructure as code et gouvernance de la sécurité.',
    past: [{ client: 'Transports Azur', role: 'Architecte cloud', from: -1200, to: -250, context: 'Migration d’un SI de billetterie vers AWS.', env: ['AWS', 'Terraform'] }],
  },
  {
    first: 'Sami', last: 'Dubois', title: 'Tech lead Java', seniority: 'lead', years: 12, city: 'Lyon', contract: 'cdi', rate: 800, cost: 520,
    skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'PostgreSQL'], category: 'Back-end', english: 'Professionnel',
    summary: 'Tech lead Java : architecture microservices, revue de code et accompagnement des équipes.',
    past: [{ client: 'Banque Sirius', role: 'Développeur Java senior', from: -2000, to: -420, context: 'Moteur de paiements.', env: ['Java', 'Spring', 'Oracle'] }],
  },
  {
    first: 'Noah', last: 'Haddad', title: 'Data engineer', seniority: 'junior', years: 2, city: 'Paris', contract: 'cdi', rate: 480, cost: 320,
    skills: ['Python', 'SQL', 'Airflow', 'Docker'], category: 'Data', english: 'Courant',
    summary: 'Data engineer junior : pipelines Python et Airflow, conteneurisation Docker.',
    past: [{ client: 'Start-up Pollen', role: 'Data engineer (alternance)', from: -730, to: -40, context: 'Collecte et nettoyage de données capteurs.', env: ['Python', 'Airflow'] }],
  },
  {
    first: 'Ilyes', last: 'Girard', title: 'DevOps', seniority: 'senior', years: 8, city: 'Lille', contract: 'freelance', rate: 700, cost: 590,
    skills: ['Kubernetes', 'Terraform', 'GitLab CI', 'AWS', 'Ansible'], category: 'DevOps', english: 'Courant',
    certifications: [{ name: 'Certified Kubernetes Administrator', issuer: 'CNCF', year: 2023 }],
    summary: 'Ingénieur DevOps : chaînes CI/CD, Kubernetes et automatisation de l’infrastructure.',
    past: [{ client: 'Éditeur Quartz', role: 'DevOps', from: -1100, to: -110, context: 'Industrialisation des déploiements SaaS.', env: ['GitLab CI', 'Kubernetes'] }],
  },
  {
    first: 'Camille', last: 'Roux', title: 'Scrum master', seniority: 'senior', years: 10, city: 'Bordeaux', contract: 'cdi', rate: 650, cost: 430,
    skills: ['Scrum', 'Kanban', 'Coaching agile', 'Jira', 'Facilitation'], category: 'Agilité', english: 'Professionnel',
    certifications: [{ name: 'Professional Scrum Master II', issuer: 'Scrum.org', year: 2021 }],
    summary: 'Scrum master et coach : accompagnement d’équipes produit, rituels et amélioration continue.',
    past: [{ client: 'Clinique Horizon', role: 'Scrum master', from: -900, to: -220, context: 'Transformation agile de la DSI.', env: ['Jira', 'Miro'] }],
  },
  {
    first: 'Manon', last: 'Moreau', title: 'Développeuse .NET', seniority: 'confirmed', years: 6, city: 'Lille', contract: 'cdi', rate: 580, cost: 390,
    skills: ['C#', '.NET', 'Azure', 'SQL Server', 'Angular'], category: 'Back-end', english: 'Professionnel',
    summary: 'Développeuse .NET full stack : API C#, Angular et déploiement sur Azure.',
    past: [{ client: 'Négoce Atlantique', role: 'Développeuse .NET', from: -1000, to: -170, context: 'Application de gestion des commandes.', env: ['.NET', 'Angular'] }],
  },
  {
    first: 'Rayan', last: 'Morel', title: 'DevOps', seniority: 'confirmed', years: 5, city: 'Marseille', contract: 'cdi', rate: 600, cost: 400,
    skills: ['Docker', 'Kubernetes', 'Azure DevOps', 'Linux', 'Terraform'], category: 'DevOps', english: 'Professionnel',
    summary: 'DevOps : conteneurisation, pipelines Azure DevOps et exploitation Linux.',
    past: [{ client: 'Port Méditerranée', role: 'Administrateur systèmes', from: -1500, to: -320, context: 'Supervision et automatisation.', env: ['Linux', 'Ansible'] }],
  },
  {
    first: 'Nora', last: 'Faure', title: 'Développeuse React', seniority: 'senior', years: 7, city: 'Paris', contract: 'freelance', rate: 640, cost: 540,
    skills: ['React', 'React Native', 'TypeScript', 'Redux', 'Accessibilité'], category: 'Front-end', english: 'Courant',
    summary: 'Développeuse React et React Native : applications mobiles et web, accessibilité et performance.',
    past: [{ client: 'Réseau Ciné+', role: 'Développeuse mobile', from: -900, to: -280, context: 'Application de billetterie mobile.', env: ['React Native', 'TypeScript'] }],
  },
  {
    first: 'Lucas', last: 'Bernard', title: 'Ingénieur sécurité', seniority: 'senior', years: 9, city: 'Paris', contract: 'cdi', rate: 760, cost: 490,
    skills: ['IAM', 'ISO 27001', 'Azure AD', 'SOC', 'Gestion des vulnérabilités'], category: 'Sécurité', english: 'Courant',
    certifications: [{ name: 'ISO/IEC 27001 Lead Implementer', issuer: 'PECB', year: 2023 }],
    summary: 'Ingénieur sécurité : gestion des identités, conformité ISO 27001 et pilotage du traitement des vulnérabilités.',
    past: [{ client: 'Assureur Hélios', role: 'Ingénieur IAM', from: -1300, to: -70, context: 'Refonte des habilitations.', env: ['Azure AD', 'SailPoint'] }],
  },
  {
    first: 'Emma', last: 'Lefèvre', title: 'QA engineer', seniority: 'confirmed', years: 5, city: 'Lyon', contract: 'cdi', rate: 520, cost: 350,
    skills: ['Cypress', 'Selenium', 'Tests automatisés', 'Jira', 'API testing'], category: 'Qualité', english: 'Professionnel',
    certifications: [{ name: 'ISTQB Certified Tester Foundation Level', issuer: 'ISTQB', year: 2021 }],
    summary: 'QA engineer : stratégies de test, automatisation Cypress et tests d’API.',
    past: [{ client: 'Mutuelle Ardoise', role: 'Testeuse', from: -1000, to: -210, context: 'Recette d’un extranet assurés.', env: ['Selenium', 'Jira'] }],
  },
  {
    first: 'Adam', last: 'Rousseau', title: 'Architecte data', seniority: 'architect', years: 13, city: 'Paris', contract: 'freelance', rate: 900, cost: 760,
    skills: ['Data mesh', 'Snowflake', 'dbt', 'Architecture', 'GCP'], category: 'Data', english: 'Bilingue',
    summary: 'Architecte data : plateformes modernes Snowflake et dbt, gouvernance et data mesh.',
    past: [{ client: 'Groupe Lumen', role: 'Architecte data', from: -1400, to: -140, context: 'Plateforme de données groupe.', env: ['Snowflake', 'dbt'] }],
  },
  {
    first: 'Louise', last: 'Garnier', title: 'Business analyst', seniority: 'confirmed', years: 6, city: 'Nantes', contract: 'cdi', rate: 590, cost: 400,
    skills: ['Recueil du besoin', 'BPMN', 'SQL', 'Assurance', 'Recette'], category: 'Produit', english: 'Professionnel',
    summary: 'Business analyst en assurance : recueil du besoin, modélisation des processus et recette.',
    past: [{ client: 'Mutuelle Ardoise', role: 'Business analyst', from: -1200, to: -90, context: 'Gestion des contrats santé.', env: ['BPMN', 'SQL'] }],
  },
  {
    first: 'Mehdi', last: 'Chevalier', title: 'Développeur Python', seniority: 'junior', years: 2, city: 'Bordeaux', contract: 'cdi', rate: 470, cost: 310,
    skills: ['Python', 'Django', 'PostgreSQL', 'Docker'], category: 'Back-end', english: 'Courant',
    summary: 'Développeur Python : API Django, PostgreSQL et conteneurisation.',
    past: [{ client: 'Start-up Pollen', role: 'Développeur Python', from: -600, to: -160, context: 'Back-office de suivi de capteurs.', env: ['Django', 'PostgreSQL'] }],
  },
  {
    first: 'Zoé', last: 'Perrin', title: 'UX designer', seniority: 'senior', years: 8, city: 'Paris', contract: 'freelance', rate: 650, cost: 550,
    skills: ['Figma', 'Recherche utilisateur', 'Design system', 'Accessibilité', 'Prototypage'], category: 'Design', english: 'Courant',
    summary: 'UX designer : recherche utilisateur, design system et prototypes testés.',
    past: [{ client: 'Enseigne Calypso', role: 'UX designer', from: -900, to: -190, context: 'Refonte de l’application mobile.', env: ['Figma', 'Maze'] }],
  },
  {
    first: 'Karim', last: 'Nasri', title: 'SRE', seniority: 'senior', years: 9, city: 'Lille', contract: 'cdi', rate: 720, cost: 470,
    skills: ['Prometheus', 'Grafana', 'Kubernetes', 'GCP', 'Go'], category: 'DevOps', english: 'Courant',
    summary: 'SRE : observabilité, fiabilité et automatisation des opérations sur Kubernetes.',
    past: [{ client: 'Éditeur Quartz', role: 'SRE', from: -1300, to: -30, context: 'Fiabilisation d’une plateforme SaaS.', env: ['Kubernetes', 'Prometheus'] }],
  },
];
const consultantId = (last: string, first: string) => {
  const i = CONSULTANTS.findIndex((c) => c.last === last && c.first === first);
  if (i < 0) throw new Error(`consultant inconnu : ${first} ${last}`);
  return i === 0 ? DEMO_CONSULTANT_ID : uid('a003', i + 1);
};

// ── Missions ─────────────────────────────────────────────────────────────
type Mission = {
  key: string;
  who: [string, string];
  company: string;
  title: string;
  rate: number;
  start: number;
  end: number | null;
  status: 'active' | 'ended';
  location: string;
  remote: 'onsite' | 'hybrid' | 'remote';
  renewal: 'unknown' | 'likely' | 'confirmed' | 'not_renewed';
  plannedDays?: number;
};
const MISSIONS: Mission[] = [
  { key: 'm1', who: ['Inès', 'Morel'], company: 'nordal', title: 'Data engineer · plateforme sinistres', rate: 650, start: -200, end: 150, status: 'active', location: 'Paris', remote: 'hybrid', renewal: 'likely', plannedDays: 220 },
  { key: 'm2', who: ['Yanis', 'Benali'], company: 'helio', title: 'Refonte e-commerce React', rate: 620, start: -150, end: 40, status: 'active', location: 'Lyon', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm3', who: ['Léa', 'Dubois'], company: 'helio', title: 'Product owner programme fidélité', rate: 700, start: -300, end: 90, status: 'active', location: 'Lyon', remote: 'hybrid', renewal: 'likely' },
  { key: 'm4', who: ['Hugo', 'Lambert'], company: 'varenne', title: 'Pilotage programme compteurs', rate: 780, start: -260, end: 12, status: 'active', location: 'Nantes', remote: 'onsite', renewal: 'unknown' },
  { key: 'm5', who: ['Sarah', 'Petit'], company: 'varenne', title: 'Reporting Power BI', rate: 560, start: -120, end: 120, status: 'active', location: 'Nantes', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm6', who: ['Tom', 'Girard'], company: 'opaline', title: 'Data engineer risque crédit', rate: 720, start: -180, end: 180, status: 'active', location: 'Paris', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm7', who: ['Jade', 'Moreau'], company: 'opaline', title: 'Front React espace client', rate: 560, start: -90, end: 200, status: 'active', location: 'Paris', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm8', who: ['Chloé', 'Lambert'], company: 'kestrel', title: 'Architecture cloud AWS', rate: 950, start: -240, end: 60, status: 'active', location: 'Lille', remote: 'remote', renewal: 'confirmed' },
  { key: 'm9', who: ['Sami', 'Dubois'], company: 'nordal', title: 'Tech lead plateforme contrats', rate: 800, start: -400, end: null, status: 'active', location: 'Paris', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm10', who: ['Ilyes', 'Girard'], company: 'kestrel', title: 'DevOps · chaîne CI/CD', rate: 700, start: -100, end: 80, status: 'active', location: 'Lille', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm11', who: ['Camille', 'Roux'], company: 'brise', title: 'Scrum master dossier patient', rate: 650, start: -210, end: 25, status: 'active', location: 'Bordeaux', remote: 'hybrid', renewal: 'not_renewed' },
  { key: 'm12', who: ['Manon', 'Moreau'], company: 'cobalt', title: 'Développement .NET · WMS', rate: 580, start: -160, end: 140, status: 'active', location: 'Marseille', remote: 'remote', renewal: 'unknown' },
  { key: 'm13', who: ['Lucas', 'Bernard'], company: 'opaline', title: 'Sécurité · gestion des identités', rate: 760, start: -60, end: 240, status: 'active', location: 'Paris', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm14', who: ['Adam', 'Rousseau'], company: 'mirabelle', title: 'Architecture data', rate: 900, start: -130, end: 110, status: 'active', location: 'Paris', remote: 'remote', renewal: 'unknown' },
  { key: 'm15', who: ['Louise', 'Garnier'], company: 'nordal', title: 'Business analyst sinistres', rate: 590, start: -75, end: 105, status: 'active', location: 'Paris', remote: 'hybrid', renewal: 'unknown' },
  { key: 'm16', who: ['Karim', 'Nasri'], company: 'cobalt', title: 'SRE · observabilité', rate: 720, start: 18, end: 200, status: 'active', location: 'Marseille', remote: 'hybrid', renewal: 'unknown' },
  { key: 'e1', who: ['Inès', 'Morel'], company: 'helio', title: 'Data engineer · supply chain', rate: 620, start: -520, end: -205, status: 'ended', location: 'Lyon', remote: 'hybrid', renewal: 'not_renewed' },
  { key: 'e2', who: ['Rayan', 'Morel'], company: 'varenne', title: 'DevOps · supervision', rate: 600, start: -300, end: -20, status: 'ended', location: 'Nantes', remote: 'hybrid', renewal: 'not_renewed' },
  { key: 'e3', who: ['Nora', 'Faure'], company: 'mirabelle', title: 'Application React Native', rate: 640, start: -260, end: -35, status: 'ended', location: 'Paris', remote: 'remote', renewal: 'not_renewed' },
  { key: 'e4', who: ['Emma', 'Lefèvre'], company: 'brise', title: 'Automatisation des tests', rate: 520, start: -200, end: -10, status: 'ended', location: 'Bordeaux', remote: 'hybrid', renewal: 'not_renewed' },
  { key: 'e5', who: ['Zoé', 'Perrin'], company: 'helio', title: 'UX · refonte du parcours d’achat', rate: 650, start: -180, end: -60, status: 'ended', location: 'Lyon', remote: 'remote', renewal: 'not_renewed' },
  { key: 'e6', who: ['Mehdi', 'Chevalier'], company: 'cobalt', title: 'Développement Python', rate: 470, start: -150, end: -45, status: 'ended', location: 'Marseille', remote: 'onsite', renewal: 'not_renewed' },
];
const missionId = (key: string) => uid('a004', MISSIONS.findIndex((m) => m.key === key) + 1);

// ── CRA : pour chaque mission, le statut des mois M-4…M-1 et du mois en cours ─
// v : validé, s : soumis (à valider), r : renvoyé, d : brouillon, - : absent.
const CRA_PLAN: Record<string, string> = {
  // M-4 M-3 M-2 M-1 M
  m1: 'vvvr-', // CRA renvoyé à corriger, mois en cours à remplir (démo consultant)
  m2: 'vvvs-',
  m3: 'vvvs-',
  m4: 'vvvv-',
  m5: 'vvvs-',
  m6: 'vvvsd',
  m7: 'vvvv-',
  m8: 'vvvs-',
  m9: 'vvvvd',
  m10: 'vvvv-',
  m11: 'vvv--', // CRA du mois écoulé manquant
  m12: 'vvvs-',
  m13: 'vvvv-',
  m14: 'vvvs-',
  m15: 'vvv--', // CRA du mois écoulé manquant
  m16: '-----',
  e1: 'vvvv-',
  e2: 'vvvv-',
  e3: 'vvvv-',
  e4: 'vvvv-',
  e5: 'vvvv-',
  e6: 'vvvv-',
};
const CODE: Record<string, string> = { v: 'client_validated', s: 'submitted', r: 'rejected', d: 'draft' };

// ── Opportunités ─────────────────────────────────────────────────────────
type Opportunity = {
  company: string;
  title: string;
  status: string;
  probability: number;
  rate: number;
  months: number;
  heads?: number;
  followUp: number | null;
  nextAction: string | null;
  skills: string[];
  start: number;
  remote: 'onsite' | 'hybrid' | 'remote';
  description: string;
  lostReason?: string;
  mission?: string;
  created: number;
};
const OPPORTUNITIES: Opportunity[] = [
  { company: 'opaline', title: 'Data engineer senior · risque de marché', status: 'discussion', probability: 25, rate: 720, months: 9, followUp: -2, nextAction: 'Relancer la DSI sur l’arbitrage budgétaire', skills: ['Spark', 'Kafka', 'Scala', 'SQL'], start: 30, remote: 'hybrid', description: 'Renfort de l’équipe data risque : traitements Spark, flux Kafka, 2 jours de télétravail.', created: -21 },
  { company: 'nordal', title: 'Product owner · assurance vie', status: 'cv_sent', probability: 55, rate: 690, months: 6, followUp: 2, nextAction: 'Débrief des entretiens avec Claire Vidal', skills: ['Scrum', 'User stories', 'Assurance'], start: 21, remote: 'hybrid', description: 'Product owner pour le nouveau parcours de souscription assurance vie.', created: -30 },
  { company: 'helio', title: '2 développeurs React · marketplace', status: 'client_interview', probability: 40, rate: 600, months: 8, heads: 2, followUp: 1, nextAction: 'Préparer les entretiens techniques', skills: ['React', 'TypeScript', 'Next.js'], start: 35, remote: 'hybrid', description: 'Deux développeurs React pour lancer la marketplace partenaires.', created: -18 },
  { company: 'kestrel', title: 'SRE · plateforme temps réel', status: 'negotiation', probability: 75, rate: 730, months: 12, followUp: 3, nextAction: 'Envoyer la proposition révisée (TJM 730 €)', skills: ['Kubernetes', 'Prometheus', 'GCP'], start: 25, remote: 'hybrid', description: 'Fiabilité et observabilité de la plateforme de suivi des véhicules.', created: -40 },
  { company: 'brise', title: 'Chef de projet · dossier patient informatisé', status: 'new', probability: 10, rate: 750, months: 10, followUp: 5, nextAction: 'Qualifier le périmètre avec Hélène Caron', skills: ['Pilotage de projet', 'Santé'], start: 60, remote: 'onsite', description: 'Pilotage du déploiement du DPI sur trois établissements.', created: -4 },
  { company: 'varenne', title: 'Architecte data · plateforme compteurs', status: 'contacted', probability: 10, rate: 880, months: 12, followUp: -6, nextAction: 'Rappeler Sophie Leroy', skills: ['Snowflake', 'Architecture', 'dbt'], start: 45, remote: 'remote', description: 'Conception de la plateforme de données des compteurs communicants.', created: -26 },
  { company: 'cobalt', title: 'Développeur .NET confirmé', status: 'cv_sent', probability: 55, rate: 590, months: 6, followUp: 0, nextAction: 'Relancer Antoine Mercier sur les CV envoyés', skills: ['C#', '.NET', 'Azure'], start: 14, remote: 'remote', description: 'Renfort de l’équipe WMS sur les évolutions entrepôts.', created: -15 },
  { company: 'mirabelle', title: 'Data analyst · audiences', status: 'discussion', probability: 25, rate: 560, months: 6, followUp: null, nextAction: null, skills: ['SQL', 'Power BI', 'Python'], start: 40, remote: 'hybrid', description: 'Analyse des audiences numériques et tableaux de bord éditoriaux.', created: -33 },
  { company: 'sorel', title: 'Audit de sécurité · usines connectées', status: 'new', probability: 10, rate: 820, months: 3, followUp: 7, nextAction: 'Envoyer une proposition d’audit', skills: ['ISO 27001', 'Gestion des vulnérabilités'], start: 50, remote: 'onsite', description: 'Audit de la sécurité des systèmes industriels connectés.', created: -2 },
  { company: 'altair', title: 'Squad data · 3 profils', status: 'contacted', probability: 15, rate: 700, months: 12, heads: 3, followUp: 4, nextAction: 'Organiser un atelier de cadrage', skills: ['Spark', 'Airflow', 'GCP', 'dbt'], start: 75, remote: 'hybrid', description: 'Constitution d’une squad data pour la refonte du référentiel clients.', created: -9 },
  { company: 'opaline', title: 'Scrum master · transformation agile', status: 'client_interview', probability: 40, rate: 660, months: 9, followUp: 2, nextAction: 'Confirmer la date d’entretien', skills: ['Scrum', 'Coaching agile'], start: 30, remote: 'hybrid', description: 'Accompagnement de quatre équipes dans la transformation agile.', created: -12 },
  { company: 'nordal', title: 'QA automatisation · contrats', status: 'negotiation', probability: 70, rate: 540, months: 6, followUp: 1, nextAction: 'Valider la date de démarrage', skills: ['Cypress', 'Tests automatisés'], start: 10, remote: 'hybrid', description: 'Automatisation des tests de non-régression de la plateforme contrats.', created: -24 },
  { company: 'kestrel', title: 'DevOps · chaîne CI/CD', status: 'won', probability: 100, rate: 700, months: 6, followUp: null, nextAction: null, skills: ['GitLab CI', 'Kubernetes'], start: -100, remote: 'hybrid', description: 'Industrialisation des déploiements.', mission: 'm10', created: -130 },
  { company: 'opaline', title: 'Sécurité · gestion des identités', status: 'won', probability: 100, rate: 760, months: 10, followUp: null, nextAction: null, skills: ['IAM', 'Azure AD'], start: -60, remote: 'hybrid', description: 'Refonte des habilitations.', mission: 'm13', created: -95 },
  { company: 'cobalt', title: 'SRE · observabilité', status: 'won', probability: 100, rate: 720, months: 6, followUp: null, nextAction: null, skills: ['Prometheus', 'Grafana'], start: 18, remote: 'hybrid', description: 'Mise en place de l’observabilité des entrepôts.', mission: 'm16', created: -45 },
  { company: 'helio', title: 'Data engineer · prévisions de ventes', status: 'lost', probability: 0, rate: 640, months: 6, followUp: null, nextAction: null, skills: ['Python', 'Spark'], start: -20, remote: 'hybrid', description: 'Modèles de prévision des ventes magasins.', lostReason: 'price', created: -70 },
  { company: 'brise', title: 'Développeur Java · interopérabilité', status: 'lost', probability: 0, rate: 600, months: 8, followUp: null, nextAction: null, skills: ['Java', 'HL7'], start: -15, remote: 'onsite', description: 'Flux d’interopérabilité entre logiciels de soins.', lostReason: 'competitor', created: -60 },
];
const POSITIONINGS: Array<{ opp: number; who: [string, string]; sent: number | null; feedback?: string }> = [
  { opp: 3, who: ['Nora', 'Faure'], sent: -6 },
  { opp: 12, who: ['Emma', 'Lefèvre'], sent: -8, feedback: 'Profil retenu pour un second entretien.' },
  { opp: 4, who: ['Rayan', 'Morel'], sent: -10 },
  { opp: 1, who: ['Noah', 'Haddad'], sent: null },
  { opp: 7, who: ['Mehdi', 'Chevalier'], sent: -3 },
];

// =========================================================================
sql(`-- =========================================================================
-- Espace de démonstration « Atlas Conseil (démo) » — GÉNÉRÉ, ne pas éditer.
-- Source : scripts/demo/demo-seed.ts (npx tsx scripts/demo/demo-seed.ts > supabase/seed/demo.sql)
-- Données fictives, datées par rapport au jour du seed. Rejouable : le
-- seed détache les comptes de démo, supprime l'organisation de démo (et
-- tout ce qu'elle contient, en cascade) puis la recrée. Aucune autre
-- organisation n'est touchée. Les comptes se (re)lient ensuite avec
-- scripts/demo/create-demo-users.ts.
-- ⚠ Staging d'abord ; en production, uniquement sur validation explicite.
-- =========================================================================
BEGIN;

-- Comptes de démo : détachés avant la suppression (ils sont reliés à nouveau ensuite).
UPDATE profiles SET organization_id = NULL, consultant_id = NULL, role = 'viewer'
 WHERE organization_id = ${q(ORG)} OR consultant_id = ${q(DEMO_CONSULTANT_ID)};
DELETE FROM organizations WHERE id = ${q(ORG)};

INSERT INTO organizations (id, name, slug, brand_name, city, country, plan, payment_terms_days, footer_tagline)
VALUES (${q(ORG)}, 'Atlas Conseil (démo)', 'atlas-conseil-demo', 'Atlas Conseil · démo', 'Paris', 'FR', 'v2_growth', 30,
        'Espace de démonstration Centrium — données fictives');

-- Abonnement exempté : pas de limite de plan ni de paiement pour la démo.
INSERT INTO subscriptions (organization_id, plan_id, status, is_exempt_from_billing, trial_end, current_period_end)
VALUES (${q(ORG)}, 'v2_growth', 'active', true, NULL, now() + interval '1 year')
ON CONFLICT (organization_id) DO UPDATE
  SET plan_id = 'v2_growth', status = 'active', is_exempt_from_billing = true, trial_end = NULL, current_period_end = now() + interval '1 year';
`);

sql('-- Clients et prospects');
sql(
  `INSERT INTO companies (id, organization_id, name, kind, industry, size, city, country, website) VALUES\n` +
    COMPANIES.map((c, i) => `  (${q(uid('a001', i + 1))}, ${q(ORG)}, ${q(c.name)}, ${q(c.kind)}, ${q(c.industry)}, ${q(c.size)}, ${q(c.city)}, 'FR', ${q(`https://www.${c.slug}.example`)})`).join(',\n') +
    ';\n',
);

sql('-- Interlocuteurs');
sql(
  `INSERT INTO contacts (id, organization_id, company_id, first_name, last_name, contact_type, job_title, email, city, source, last_interaction) VALUES\n` +
    CONTACTS.map((c, i) => {
      const co = COMPANIES.find((x) => x.key === c.company)!;
      const email = `${c.first}.${c.last}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + `@${co.slug}.example`;
      return `  (${q(uid('a002', i + 1))}, ${q(ORG)}, ${q(companyId(c.company))}, ${q(c.first)}, ${q(c.last)}, ${q(c.type)}, ${q(c.title)}, ${q(email)}, ${q(co.city)}, 'Réseau', ${c.lastInteraction == null ? 'NULL' : `now() - interval '${-c.lastInteraction} days'`})`;
    }).join(',\n') +
    ';\n',
);

sql('-- Consultants (la disponibilité suit les missions, trigger sync_consultant_status_from_missions)');
sql(
  `INSERT INTO consultants (id, organization_id, first_name, last_name, initials, email, job_title, seniority, years_experience, city, country, mobility, languages, daily_rate_eur, contract_type, status, summary, certifications) VALUES\n` +
    CONSULTANTS.map((c, i) => {
      const id = i === 0 ? DEMO_CONSULTANT_ID : uid('a003', i + 1);
      const email = `${c.first}.${c.last}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@consultants.example';
      const langs = [{ code: 'FR', level: 'Natif' }, { code: 'EN', level: c.english }];
      return `  (${q(id)}, ${q(ORG)}, ${q(c.first)}, ${q(c.last)}, ${q(`${c.first[0]}. ${c.last[0]}.`)}, ${q(email)}, ${q(c.title)}, ${q(c.seniority)}, ${c.years}, ${q(c.city)}, 'FR', ${q(c.city === 'Paris' ? 'Île-de-France' : `${c.city} et alentours`)}, ${json(langs)}, ${c.rate}, ${q(c.contract)}, 'available', ${q(c.summary)}, ${json(c.certifications ?? [])})`;
    }).join(',\n') +
    ';\n',
);
sql(
  `INSERT INTO consultant_financials (consultant_id, organization_id, daily_cost_eur, target_margin_pct) VALUES\n` +
    CONSULTANTS.map((c, i) => `  (${q(i === 0 ? DEMO_CONSULTANT_ID : uid('a003', i + 1))}, ${q(ORG)}, ${c.cost}, 25)`).join(',\n') +
    ';\n',
);
sql(
  `INSERT INTO consultant_skills (consultant_id, category, name, level, years, is_highlighted) VALUES\n` +
    CONSULTANTS.flatMap((c, i) =>
      c.skills.map((s, k) => `  (${q(i === 0 ? DEMO_CONSULTANT_ID : uid('a003', i + 1))}, ${q(c.category)}, ${q(s)}, ${Math.max(2, 5 - Math.floor(k / 2))}, ${Math.max(1, c.years - k)}, ${k < 3})`),
    ).join(',\n') +
    ';\n',
);
sql(
  `INSERT INTO consultant_experiences (consultant_id, client_name, role, start_date, end_date, context, tasks, environment, order_index) VALUES\n` +
    CONSULTANTS.flatMap((c, i) =>
      c.past.map(
        (p, k) =>
          `  (${q(i === 0 ? DEMO_CONSULTANT_ID : uid('a003', i + 1))}, ${q(p.client)}, ${q(p.role)}, ${day(p.from)}, ${day(p.to)}, ${q(p.context)}, ${json([])}, ${json(p.env)}, ${k + 1})`,
      ),
    ).join(',\n') +
    ';\n',
);

sql('-- Missions et coûts');
sql(
  `INSERT INTO missions (id, organization_id, consultant_id, company_id, title, daily_rate_eur, start_date, end_date, status, location, remote_policy, renewal_status, planned_days, contract_number) VALUES\n` +
    MISSIONS.map(
      (m, i) =>
        `  (${q(missionId(m.key))}, ${q(ORG)}, ${q(consultantId(m.who[1], m.who[0]))}, ${q(companyId(m.company))}, ${q(m.title)}, ${m.rate}, ${day(m.start)}, ${day(m.end)}, ${q(m.status)}, ${q(m.location)}, ${q(m.remote)}, ${q(m.renewal)}, ${num(m.plannedDays ?? null)}, ${q(`CM-DEMO-${String(i + 1).padStart(3, '0')}`)})`,
    ).join(',\n') +
    ';\n',
);
sql(
  `INSERT INTO mission_financials (mission_id, organization_id, daily_cost_eur, other_costs_eur) VALUES\n` +
    MISSIONS.map((m) => {
      const c = CONSULTANTS.find((x) => x.first === m.who[0] && x.last === m.who[1])!;
      return `  (${q(missionId(m.key))}, ${q(ORG)}, ${c.cost}, 0)`;
    }).join(',\n') +
    ';\n',
);

sql('-- Pipeline commercial');
sql(
  `INSERT INTO opportunities (id, organization_id, company_id, contact_id, title, status, probability, expected_revenue, daily_rate_eur, duration_months, expected_close, next_follow_up, next_action, last_interaction, required_skills, start_date, location, remote_policy, description, lost_reason, priority, created_at) VALUES\n` +
    OPPORTUNITIES.map((o, i) => {
      const heads = o.heads ?? 1;
      const revenue = Math.round(o.rate * 20 * o.months * heads);
      const contactIndex = CONTACTS.findIndex((c) => c.company === o.company);
      const contact = contactIndex >= 0 ? q(uid('a002', contactIndex + 1)) : 'NULL';
      const co = COMPANIES.find((c) => c.key === o.company)!;
      const closed = o.status === 'won' || o.status === 'lost';
      const priority = revenue > 150000 && !closed ? 'high' : 'medium';
      return `  (${q(uid('a005', i + 1))}, ${q(ORG)}, ${q(companyId(o.company))}, ${contact}, ${q(o.title)}, ${q(o.status)}, ${o.probability}, ${revenue}, ${o.rate}, ${o.months}, ${day(closed ? o.created + 30 : o.start - 7)}, ${day(o.followUp)}, ${q(o.nextAction)}, now() - interval '${Math.max(1, -o.created - 3)} days', ${json(o.skills)}, ${day(o.start)}, ${q(co.city)}, ${q(o.remote)}, ${q(o.description)}, ${q(o.lostReason ?? null)}, ${q(priority)}, now() - interval '${-o.created} days')`;
    }).join(',\n') +
    ';\n',
);
sql(
  OPPORTUNITIES.map((o, i) => (o.mission ? `UPDATE missions SET opportunity_id = ${q(uid('a005', i + 1))} WHERE id = ${q(missionId(o.mission))};` : null))
    .filter(Boolean)
    .join('\n') + '\n',
);
sql(
  `INSERT INTO opportunity_consultants (opportunity_id, consultant_id, pitch, sent_at, client_feedback) VALUES\n` +
    POSITIONINGS.map(
      (p) =>
        `  (${q(uid('a005', p.opp))}, ${q(consultantId(p.who[1], p.who[0]))}, NULL, ${p.sent == null ? 'NULL' : `now() - interval '${-p.sent} days'`}, ${q(p.feedback ?? null)})`,
    ).join(',\n') +
    ';\n',
);

sql(`-- CRA : plan (mission, décalage en mois, statut visé). Insérés « soumis » ou
-- « brouillon », jours ajustés, puis validés : la préfacture se calcule alors
-- sur les jours réels (trigger auto_invoice_from_validated_cra).
CREATE TEMP TABLE demo_cra_plan (mission_id uuid, k int, target text) ON COMMIT DROP;`);
const planRows: string[] = [];
for (const m of MISSIONS) {
  const plan = CRA_PLAN[m.key] ?? '-----';
  for (let i = 0; i < 5; i++) {
    const code = plan[i];
    if (!code || code === '-') continue;
    planRows.push(`  (${q(missionId(m.key))}, ${4 - i}, ${q(CODE[code]!)})`);
  }
}
sql(`INSERT INTO demo_cra_plan (mission_id, k, target) VALUES\n${planRows.join(',\n')};\n`);
sql(`INSERT INTO timesheets (organization_id, mission_id, consultant_id, period_month, period_year, status, submitted_at)
SELECT m.organization_id, m.id, m.consultant_id, EXTRACT(MONTH FROM x.p)::int, EXTRACT(YEAR FROM x.p)::int,
       CASE WHEN dp.target = 'draft' THEN 'draft' ELSE 'submitted' END::timesheet_status,
       CASE WHEN dp.target = 'draft' THEN NULL ELSE x.p + interval '1 month' + make_interval(days => 1 + (dp.k % 3)) END
  FROM demo_cra_plan dp
  JOIN missions m ON m.id = dp.mission_id
  CROSS JOIN LATERAL (SELECT (date_trunc('month', CURRENT_DATE) - make_interval(months => dp.k))::date AS p) x
 WHERE m.start_date <= (x.p + interval '1 month' - interval '1 day')::date
   AND (m.end_date IS NULL OR m.end_date >= x.p);

-- Jours hors période de mission : retirés (comme à la création depuis l'application).
DELETE FROM timesheet_days d USING timesheets t, missions m
 WHERE d.timesheet_id = t.id AND t.mission_id = m.id AND t.organization_id = ${q(ORG)}
   AND (d.day_date < m.start_date OR (m.end_date IS NOT NULL AND d.day_date > m.end_date));
-- Jours fériés à date fixe : marqués fériés.
UPDATE timesheet_days d SET kind = 'holiday', duration = 0
  FROM timesheets t
 WHERE d.timesheet_id = t.id AND t.organization_id = ${q(ORG)}
   AND to_char(d.day_date, 'MM-DD') IN ('01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25');
-- Télétravail le mercredi sur les missions hybrides, toute la semaine en télétravail complet.
UPDATE timesheet_days d SET is_remote = true
  FROM timesheets t, missions m
 WHERE d.timesheet_id = t.id AND t.mission_id = m.id AND t.organization_id = ${q(ORG)} AND d.kind = 'worked'
   AND (m.remote_policy = 'remote' OR (m.remote_policy = 'hybrid' AND EXTRACT(ISODOW FROM d.day_date) = 3));
-- Quelques congés : le deuxième vendredi du mois, pour un consultant sur trois.
UPDATE timesheet_days d SET kind = 'paid_leave', duration = 0, is_remote = false
  FROM timesheets t
 WHERE d.timesheet_id = t.id AND t.organization_id = ${q(ORG)} AND d.kind = 'worked'
   AND EXTRACT(ISODOW FROM d.day_date) = 5 AND EXTRACT(DAY FROM d.day_date) BETWEEN 8 AND 14
   AND abs(hashtext(t.consultant_id::text)) % 3 = 0;
-- Brouillons du mois en cours : seuls les jours déjà passés sont saisis.
DELETE FROM timesheet_days d USING timesheets t
 WHERE d.timesheet_id = t.id AND t.organization_id = ${q(ORG)} AND t.status = 'draft' AND d.day_date >= CURRENT_DATE;
-- CRA renvoyé (consultant de démo) : il manque une journée, le 14.
DELETE FROM timesheet_days d USING timesheets t, demo_cra_plan dp
 WHERE d.timesheet_id = t.id AND dp.mission_id = t.mission_id AND dp.target = 'rejected'
   AND make_date(t.period_year, t.period_month, 1) = (date_trunc('month', CURRENT_DATE) - make_interval(months => dp.k))::date
   AND EXTRACT(DAY FROM d.day_date) = 14;

-- Validation (déclenche la préfacture) et renvoi.
UPDATE timesheets t
   SET days_validated = t.days_worked,
       validated_at = make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '3 days 10 hours',
       status = 'client_validated'
  FROM demo_cra_plan dp
 WHERE t.organization_id = ${q(ORG)} AND dp.mission_id = t.mission_id AND dp.target = 'client_validated'
   AND make_date(t.period_year, t.period_month, 1) = (date_trunc('month', CURRENT_DATE) - make_interval(months => dp.k))::date;
UPDATE timesheets t
   SET status = 'rejected',
       rejected_at = make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '3 days 11 hours',
       rejection_reason = 'Il manque la journée du 14 : merci de compléter.'
  FROM demo_cra_plan dp
 WHERE t.organization_id = ${q(ORG)} AND dp.mission_id = t.mission_id AND dp.target = 'rejected'
   AND make_date(t.period_year, t.period_month, 1) = (date_trunc('month', CURRENT_DATE) - make_interval(months => dp.k))::date;

-- Préfactures : émises au début du mois suivant, payables à 30 jours ;
-- payées si l'échéance est passée, sauf une en retard chez Varenne Énergie.
UPDATE invoices i
   SET issue_date = (make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '3 days')::date,
       due_date = (make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '33 days')::date
  FROM timesheets t
 WHERE i.timesheet_id = t.id AND i.organization_id = ${q(ORG)};
UPDATE invoices i
   SET status = CASE WHEN i.due_date >= CURRENT_DATE THEN 'sent' ELSE 'paid' END::invoice_status,
       payment_date = CASE WHEN i.due_date >= CURRENT_DATE THEN NULL ELSE i.due_date - 2 END,
       export_status = CASE WHEN i.due_date >= CURRENT_DATE THEN 'not_exported' ELSE 'exported' END,
       exported_at = CASE WHEN i.due_date >= CURRENT_DATE THEN NULL ELSE i.issue_date + 1 END,
       notes = 'Préfacture issue du CRA validé (' || i.period_label || ').'
 WHERE i.organization_id = ${q(ORG)};
UPDATE invoices i
   SET status = 'overdue', payment_date = NULL
 WHERE i.id = (
   SELECT i2.id FROM invoices i2 JOIN missions m ON m.id = i2.mission_id
    WHERE i2.organization_id = ${q(ORG)} AND m.company_id = ${q(companyId('varenne'))} AND i2.due_date < CURRENT_DATE
    ORDER BY i2.due_date DESC LIMIT 1);
`);

sql('-- Relances et notes internes');
sql(`INSERT INTO tasks (organization_id, title, description, status, priority, due_date, entity_type, entity_id, source, dedupe_key) VALUES
  (${q(ORG)}, 'Débriefer les entretiens PO assurance vie', 'Appeler Claire Vidal après les entretiens.', 'todo', 'high', ${day(2)}, 'opportunity', ${q(uid('a005', 2))}, 'manual', ${q(`follow-up:${uid('a005', 2)}`)}),
  (${q(ORG)}, 'Statuer sur le renouvellement Varenne Énergie', 'La mission de Hugo Lambert se termine dans 12 jours.', 'todo', 'high', ${day(3)}, 'mission', ${q(missionId('m4'))}, 'manual', NULL),
  (${q(ORG)}, 'Relancer la DSI d’Opaline sur le budget data', NULL, 'todo', 'medium', ${day(-2)}, 'opportunity', ${q(uid('a005', 1))}, 'manual', ${q(`follow-up:${uid('a005', 1)}`)}),
  (${q(ORG)}, 'Positionner Nora Faure sur la marketplace Helio', 'Entretiens prévus la semaine prochaine.', 'todo', 'medium', ${day(1)}, 'consultant', ${q(consultantId('Faure', 'Nora'))}, 'manual', NULL),
  (${q(ORG)}, 'Point de mi-mission avec Opaline Banque', NULL, 'todo', 'low', ${day(6)}, 'client', ${q(companyId('opaline'))}, 'manual', NULL),
  (${q(ORG)}, 'Envoyer la proposition SRE révisée à Kestrel', NULL, 'done', 'medium', ${day(-1)}, 'opportunity', ${q(uid('a005', 4))}, 'manual', NULL);
INSERT INTO notes (organization_id, entity_type, entity_id, body, created_at) VALUES
  (${q(ORG)}, 'opportunity', ${q(uid('a005', 1))}, 'Budget validé côté métier, arbitrage de la DSI attendu en fin de mois. Interlocuteur achats : Nadia Benali.', now() - interval '5 days'),
  (${q(ORG)}, 'company', ${q(companyId('nordal'))}, 'Compte stratégique : trois consultants en mission, référencement renouvelé pour deux ans.', now() - interval '18 days'),
  (${q(ORG)}, 'opportunity', ${q(uid('a005', 4))}, 'Le client accepte 730 € si le démarrage a lieu sous trois semaines.', now() - interval '2 days');

COMMIT;
`);

process.stdout.write(out.join('\n'));
