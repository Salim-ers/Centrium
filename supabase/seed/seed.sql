-- =========================================================================
-- QuadCore Platform – Seed data de démonstration
-- =========================================================================
-- À exécuter après les migrations. Populate une org "QuadCore Demo"
-- avec des consultants, clients, opportunités, CRA et factures réalistes.
-- =========================================================================

-- CV Templates
INSERT INTO cv_templates (id, name, description) VALUES
  ('standard',  'QuadCore Standard',  'Template équilibré pour profils confirmés (2-7 ans)'),
  ('dense',     'QuadCore Dense',     'Template compact pour profils seniors avec >4 expériences'),
  ('executive', 'QuadCore Executive', 'Template premium pour directeurs, leads et architectes')
ON CONFLICT (id) DO NOTHING;

-- Organisation de démo
INSERT INTO organizations (id, name, slug, address, city, postal_code, country, siren, capital_eur)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'QuadCore',
  'quadcore',
  '5 Rue du Docteur Roux',
  'Nogent Sur Oise',
  '60180',
  'FR',
  '101694016',
  1000.00
)
ON CONFLICT (id) DO NOTHING;

-- Note : les profiles sont créés automatiquement à l'inscription via le trigger.
-- Pour la démo on assume qu'un admin a été créé ; remplace l'UUID ci-dessous si besoin.

-- =========================================================================
-- CONSULTANTS (3 profils réalistes)
-- =========================================================================

-- Consultant 1 : A. S. – QA Automation Confirmé (basé sur le CV Byron fourni)
INSERT INTO consultants (id, organization_id, first_name, last_name, initials, job_title, sub_title, seniority, years_experience, city, country, mobility, languages, daily_rate_eur, contract_type, status, available_from, summary) VALUES (
  'c0000001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Alex', 'S.', 'A. S.',
  'QA Automation Confirmé',
  'Playwright / TypeScript / SQL – Web & Mobile',
  'confirmed', 7,
  'Paris', 'FR',
  'IDF, remote 2-3j/semaine',
  '[{"code":"fr","level":"Natif"},{"code":"en","level":"Professionnel"}]'::jsonb,
  550.00, 'freelance', 'on_mission',
  '2026-07-01',
  'QA Automation avec 7 ans d''expérience sur projets e-commerce internationaux (LVMH/Dior), SaaS (Agorapulse) et Supply Chain (FuturMaster). Pilotage de stratégies QA transverses, automatisation E2E Playwright/TypeScript, tests API Postman, intégration CI/CD GitHub Actions.'
),
-- Consultant 2 : M. D. – Développeur Full-Stack
(
  'c0000002-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Marc', 'D.', 'M. D.',
  'Développeur Full-Stack Senior',
  'Next.js / Node.js / PostgreSQL',
  'senior', 9,
  'Lyon', 'FR',
  'National, remote préféré',
  '[{"code":"fr","level":"Natif"},{"code":"en","level":"Bilingue"}]'::jsonb,
  680.00, 'freelance', 'available',
  '2026-04-15',
  'Développeur Full-Stack senior spécialisé dans la conception d''applications web performantes. Expertise Next.js, React, Node.js, PostgreSQL. Interventions sur projets complexes dans les secteurs fintech et retail.'
),
-- Consultant 3 : S. L. – Data Engineer
(
  'c0000003-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'Sarah', 'L.', 'S. L.',
  'Data Engineer',
  'Python / Spark / Snowflake / dbt',
  'confirmed', 5,
  'Nantes', 'FR',
  'Remote intégral, déplacements ponctuels',
  '[{"code":"fr","level":"Natif"},{"code":"en","level":"Professionnel"}]'::jsonb,
  620.00, 'freelance', 'soon_available',
  '2026-06-01',
  'Data Engineer avec 5 ans d''expérience dans la conception de pipelines data à grande échelle. Maîtrise de l''écosystème Python/Spark, modélisation dbt, orchestration Airflow, cloud Snowflake et AWS.'
);

-- Compétences
INSERT INTO consultant_skills (consultant_id, category, name, level, years, is_highlighted) VALUES
-- Alex S. (QA)
('c0000001-0000-0000-0000-000000000001', 'automation', 'Playwright', 5, 3.0, TRUE),
('c0000001-0000-0000-0000-000000000001', 'automation', 'Cypress', 4, 2.0, FALSE),
('c0000001-0000-0000-0000-000000000001', 'automation', 'Selenium', 4, 3.5, FALSE),
('c0000001-0000-0000-0000-000000000001', 'languages', 'TypeScript', 5, 4.0, TRUE),
('c0000001-0000-0000-0000-000000000001', 'languages', 'Python', 3, 2.0, FALSE),
('c0000001-0000-0000-0000-000000000001', 'languages', 'SQL', 4, 5.0, TRUE),
('c0000001-0000-0000-0000-000000000001', 'testing', 'Postman (API)', 5, 5.0, TRUE),
('c0000001-0000-0000-0000-000000000001', 'testing', 'Gherkin / BDD', 5, 4.0, TRUE),
('c0000001-0000-0000-0000-000000000001', 'tools', 'Jira / Xray', 5, 5.0, FALSE),
('c0000001-0000-0000-0000-000000000001', 'ci_cd', 'GitHub Actions', 4, 3.0, FALSE),
('c0000001-0000-0000-0000-000000000001', 'methodologies', 'Agile (Scrum, SAFe)', 5, 5.0, FALSE),
('c0000001-0000-0000-0000-000000000001', 'platforms', 'Salesforce Commerce Cloud (SFCC/SFRA)', 4, 3.0, TRUE),
('c0000001-0000-0000-0000-000000000001', 'platforms', 'SAP SD', 3, 2.0, FALSE),

-- Marc D. (Full-Stack)
('c0000002-0000-0000-0000-000000000002', 'frameworks', 'Next.js', 5, 4.0, TRUE),
('c0000002-0000-0000-0000-000000000002', 'frameworks', 'React', 5, 7.0, TRUE),
('c0000002-0000-0000-0000-000000000002', 'languages', 'TypeScript', 5, 5.0, TRUE),
('c0000002-0000-0000-0000-000000000002', 'languages', 'Node.js', 5, 8.0, TRUE),
('c0000002-0000-0000-0000-000000000002', 'databases', 'PostgreSQL', 5, 6.0, TRUE),
('c0000002-0000-0000-0000-000000000002', 'cloud', 'AWS', 4, 5.0, FALSE),
('c0000002-0000-0000-0000-000000000002', 'cloud', 'Vercel', 5, 3.0, FALSE),

-- Sarah L. (Data)
('c0000003-0000-0000-0000-000000000003', 'languages', 'Python', 5, 5.0, TRUE),
('c0000003-0000-0000-0000-000000000003', 'languages', 'SQL', 5, 5.0, TRUE),
('c0000003-0000-0000-0000-000000000003', 'data', 'Apache Spark', 4, 3.0, TRUE),
('c0000003-0000-0000-0000-000000000003', 'data', 'Snowflake', 4, 2.5, TRUE),
('c0000003-0000-0000-0000-000000000003', 'data', 'dbt', 5, 3.0, TRUE),
('c0000003-0000-0000-0000-000000000003', 'data', 'Airflow', 4, 3.0, FALSE),
('c0000003-0000-0000-0000-000000000003', 'cloud', 'AWS', 4, 4.0, FALSE);

-- Formations
INSERT INTO consultant_educations (consultant_id, year, degree, institution) VALUES
('c0000001-0000-0000-0000-000000000001', 2020, 'Mastère Management et Conseil en Systèmes d''Information', 'École Supérieure d''Ingénieurs'),
('c0000001-0000-0000-0000-000000000001', 2018, 'Licence Ingénierie du Web', 'Université'),
('c0000002-0000-0000-0000-000000000002', 2016, 'Master Informatique', 'EPITA'),
('c0000003-0000-0000-0000-000000000003', 2020, 'Master Data Science', 'Université de Nantes');

-- Expériences (Alex S.)
INSERT INTO consultant_experiences (consultant_id, client_name, role, start_date, end_date, context, tasks, environment, order_index) VALUES
('c0000001-0000-0000-0000-000000000001',
  'LVMH – Dior', 'QA Automation Confirmé Playwright',
  '2023-01-01', NULL,
  'Projet e-Commerce Dior. Migration de l''architecture Salesforce Commerce Cloud (SFCC headless → SFRA). Refonte complète des sites des marchés internationaux (JP, US, TW, AU).',
  '["Pilotage des releases côté QA : planning, gestion des charges, gestion des risques, alertes et reporting", "Rédaction de la stratégie de test transverse", "Challenge des Products Owners sur les user stories et critères d''acceptation", "Conception et exécution de tests fonctionnels (E2E, TNR, Sanity check) sur desktop et mobile", "Tests transverses couvrant l''ensemble des squads (checkout, loyalty, etc.)", "Validation des moyens de paiement et intégration PSP", "Automatisation des tests E2E critiques (Playwright/TypeScript) sur SAP SD (ECC6)", "Tests API via Postman et analyse des logs d''erreurs", "Collaboration avec équipes internationales (PO, designers, dev front/back, QA offshore, SM)", "Suivi qualité multi-marchés (JP, KR, US, TW, EU) et conformité desktop/mobile", "Reporting PowerBI et proposition d''améliorations process QA"]'::jsonb,
  '["Salesforce Commerce Cloud", "Jira", "Xray", "Playwright", "TypeScript", "Postman", "SAP SD", "Browserstack", "PowerBI"]'::jsonb,
  1
),
('c0000001-0000-0000-0000-000000000001',
  'Agorapulse', 'QA Automatisation',
  '2022-01-01', '2023-01-01',
  'Éditeur SaaS spécialisé dans la gestion centralisée des réseaux sociaux (publication, planification, analytics). Périmètre : gestion d''utilisateurs et abonnements. Équipe agile (5 devs, 1 PO, 1 SM).',
  '["Contribution aux cérémonies scrum (daily, sprint planning, review, rétrospective)", "Planification et exécution des campagnes de tests liées aux sprints et releases", "Rédaction des critères d''acceptation en Gherkin (BDD) et ateliers 3 Amigos", "Conception, rédaction et exécution des cas de tests", "Tests API sur Postman", "Automatisation des TNR avec Cypress (JavaScript)", "Mise en place CI/CD via GitHub Actions", "Analyse des anomalies à partir des logs Sentry et suivi des corrections", "Mise en place du reporting des tests automatisés", "Formation des QA aux tests d''automatisation", "Validation des PR review"]'::jsonb,
  '["Jira", "Postman", "Swagger", "Sentry", "Shortcut", "GitHub Actions", "Angular", "Confluence"]'::jsonb,
  2
),
('c0000001-0000-0000-0000-000000000001',
  'FuturMaster', 'QA Automaticien',
  '2020-09-01', '2022-01-01',
  'Éditeur de solutions Supply Chain. Mise en place from scratch de la stratégie fonctionnelle et automatisation QA dans un environnement sans QA.',
  '["Définition de la stratégie de test complète", "Rédaction et exécution des plans de tests, cas de test et critères d''acceptation", "Introduction de la pratique des 3 Amigos (PO, Dev, QA)", "Conception et maintenance de tests automatisés avec Selenium (Python + Gherkin)", "Tests API via Postman, analyse des logs via Kibana", "Requêtes SQL pour vérification de l''intégrité des données", "Campagnes de TNR à chaque release", "Tests exploratoires et sanity checks", "Documentation QA sur Confluence"]'::jsonb,
  '["Selenium", "Python", "Postman", "Azure DevOps", "Kibana", "Confluence", "Gherkin"]'::jsonb,
  3
),
('c0000001-0000-0000-0000-000000000001',
  'Louis Vuitton', 'QA Analyst',
  '2018-09-01', '2020-09-01',
  'Projet Xstore (Oracle), logiciel de gestion des produits (stock, prix) et utilisateurs, déployé dans toutes les boutiques Louis Vuitton à l''international.',
  '["Conception, rédaction et exécution des cas de tests fonctionnels", "Vérification de la cohérence des données critiques (stocks, prix, informations client)", "Tests API via Postman et requêtes SQL pour l''intégrité des bases", "Contribution au TNR pour chaque release", "Tests de recette utilisateur (UAT) et rédaction des PV de recette", "Collaboration avec les QA offshore"]'::jsonb,
  '["Xstore (Oracle)", "Jira", "Postman", "SQL", "Confluence"]'::jsonb,
  4
);

-- =========================================================================
-- COMPANIES (clients & partenaires)
-- =========================================================================

INSERT INTO companies (id, organization_id, name, kind, industry, city, country) VALUES
('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'LVMH – Dior', 'client', 'Luxury / Retail', 'Paris', 'FR'),
('cc000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'BNP Paribas', 'client', 'Banque', 'Paris', 'FR'),
('cc000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Carrefour', 'client', 'Retail', 'Massy', 'FR'),
('cc000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Byron Group', 'esn_partner', 'ESN', 'Neuilly-sur-Seine', 'FR'),
('cc000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Capgemini', 'esn_partner', 'ESN', 'Paris', 'FR');

-- =========================================================================
-- CONTACTS
-- =========================================================================

INSERT INTO contacts (id, organization_id, company_id, first_name, last_name, contact_type, job_title, email, phone, city, source, last_interaction) VALUES
('f0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cc000001-0000-0000-0000-000000000001', 'Claire', 'Rousseau', 'manager', 'QA Manager e-Commerce', 'c.rousseau@dior.example', '+33 1 40 73 00 00', 'Paris', 'LinkedIn', NOW() - INTERVAL '3 days'),
('f0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cc000002-0000-0000-0000-000000000002', 'Thomas', 'Morel', 'buyer', 'Acheteur IT', 't.morel@bnpparibas.example', '+33 1 42 98 00 00', 'Paris', 'Référence', NOW() - INTERVAL '10 days'),
('f0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cc000004-0000-0000-0000-000000000004', 'Élodie', 'Bernard', 'recruiter', 'Senior Account Manager', 'e.bernard@byrongroup.example', '+33 1 46 37 99 99', 'Neuilly-sur-Seine', 'Salon', NOW() - INTERVAL '1 day'),
('f0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cc000003-0000-0000-0000-000000000003', 'Julien', 'Petit', 'manager', 'Lead Data Platform', 'j.petit@carrefour.example', '+33 1 58 47 00 00', 'Massy', 'Inbound', NOW() - INTERVAL '5 days');

-- =========================================================================
-- JOB OFFERS
-- =========================================================================

INSERT INTO job_offers (id, organization_id, company_id, contact_id, title, description, required_skills, nice_to_have, seniority, daily_rate_min, daily_rate_max, location, remote_days, start_date, duration_months, deadline, status) VALUES
(
  'a0000001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'cc000002-0000-0000-0000-000000000002',
  'f0000002-0000-0000-0000-000000000002',
  'QA Automation Senior – Plateforme Digitale Banque',
  'Projet de refonte de la plateforme e-banking. Recherche QA Automation Senior pour mise en place de la stratégie de test et automatisation E2E. Environnement Playwright/TypeScript requis. Tests API critiques sur moyens de paiement.',
  '["Playwright", "TypeScript", "Postman", "SQL", "Jira", "Agile"]'::jsonb,
  '["Cypress", "SAP", "CI/CD GitHub Actions"]'::jsonb,
  'senior', 550.00, 650.00,
  'Paris', 3,
  '2026-06-01', 6, '2026-05-15',
  'open'
),
(
  'a0000002-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'cc000003-0000-0000-0000-000000000003',
  'f0000004-0000-0000-0000-000000000004',
  'Data Engineer – Plateforme Analytics Retail',
  'Construction d''un data lake Snowflake pour consolider les données omnicanales. Besoin Data Engineer confirmé maîtrisant dbt et Python.',
  '["Python", "Snowflake", "dbt", "SQL", "Airflow"]'::jsonb,
  '["Spark", "AWS", "Kafka"]'::jsonb,
  'confirmed', 580.00, 650.00,
  'Massy', 2,
  '2026-06-15', 8, '2026-05-20',
  'open'
);

-- =========================================================================
-- OPPORTUNITIES
-- =========================================================================

INSERT INTO opportunities (id, organization_id, company_id, contact_id, job_offer_id, title, status, priority, expected_revenue, probability, expected_close, next_follow_up, last_interaction, notes) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'cc000002-0000-0000-0000-000000000002',
  'f0000002-0000-0000-0000-000000000002',
  'a0000001-0000-0000-0000-000000000001',
  'BNP Paribas – QA Automation',
  'cv_sent', 'high',
  84000.00, 60, '2026-05-30', '2026-04-22', NOW() - INTERVAL '2 days',
  'CV de Alex S. envoyé le 17/04. En attente de retour pour entretien technique.'
),
(
  'b0000002-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'cc000003-0000-0000-0000-000000000003',
  'f0000004-0000-0000-0000-000000000004',
  'a0000002-0000-0000-0000-000000000002',
  'Carrefour – Data Engineer',
  'discussion', 'medium',
  98000.00, 40, '2026-06-10', '2026-04-25', NOW() - INTERVAL '5 days',
  'Échange initial positif. Brief complémentaire attendu la semaine prochaine.'
),
(
  'b0000003-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'cc000004-0000-0000-0000-000000000004',
  'f0000003-0000-0000-0000-000000000003',
  NULL,
  'Byron Group – Demande récurrente QA',
  'new', 'medium',
  0, 20, '2026-07-15', '2026-04-21', NOW() - INTERVAL '1 day',
  'Élodie a évoqué plusieurs besoins QA récurrents. Proposer notre CVthèque.'
);

INSERT INTO opportunity_consultants (opportunity_id, consultant_id, pitch, sent_at) VALUES
('b0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Profil QA Confirmé avec expérience LVMH/Dior sur projet e-commerce international similaire. 7 ans d''expérience, maîtrise complète Playwright/TS/Postman/SQL.', NOW() - INTERVAL '2 days'),
('b0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003', 'Data Engineer 5 ans. Maîtrise Python/Spark/Snowflake/dbt/Airflow. Disponible à partir du 01/06.', NOW() - INTERVAL '1 day');

-- =========================================================================
-- MISSION ACTIVE + CRA + FACTURE (pour Alex S. chez Dior)
-- =========================================================================

INSERT INTO missions (id, organization_id, consultant_id, company_id, title, daily_rate_eur, start_date, end_date, status) VALUES
('d0000001-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111',
 'c0000001-0000-0000-0000-000000000001',
 'cc000001-0000-0000-0000-000000000001',
 'QA Automation – Projet Dior e-Commerce',
 550.00, '2023-01-01', '2026-06-30', 'active');

INSERT INTO timesheets (id, organization_id, mission_id, consultant_id, period_month, period_year, days_worked, days_validated, status, submitted_at) VALUES
('e0000001-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111',
 'd0000001-0000-0000-0000-000000000001',
 'c0000001-0000-0000-0000-000000000001',
 3, 2026, 21.0, 21.0, 'client_validated', NOW() - INTERVAL '15 days');

INSERT INTO invoices (id, organization_id, company_id, mission_id, timesheet_id, invoice_number, issue_date, due_date, period_label, amount_ht, vat_rate, amount_vat, amount_ttc, status) VALUES
('f1000001-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111',
 'cc000001-0000-0000-0000-000000000001',
 'd0000001-0000-0000-0000-000000000001',
 'e0000001-0000-0000-0000-000000000001',
 'FAC-2026-0001', '2026-04-01', '2026-05-01', 'Mars 2026',
 11550.00, 20.00, 2310.00, 13860.00, 'sent');

INSERT INTO invoice_items (invoice_id, description, quantity, unit, unit_price, amount_ht, order_index) VALUES
('f1000001-0000-0000-0000-000000000001', 'Prestation QA Automation – Mars 2026', 21.0, 'jour', 550.00, 11550.00, 0);

-- =========================================================================
-- ALERTES de démonstration
-- =========================================================================

INSERT INTO alerts (organization_id, kind, priority, status, title, description, due_date, opportunity_id, invoice_id, consultant_id) VALUES
('11111111-1111-1111-1111-111111111111', 'client_follow_up', 'high', 'new',
 'Relancer BNP Paribas sur CV Alex S.',
 'CV envoyé il y a 2 jours, pas de retour. Relance à prévoir.',
 '2026-04-22', 'b0000001-0000-0000-0000-000000000001', NULL, 'c0000001-0000-0000-0000-000000000001'),

('11111111-1111-1111-1111-111111111111', 'mission_ending', 'medium', 'new',
 'Mission Dior Alex S. se termine le 30/06',
 'Préparer la recherche de prochaine mission ou la prolongation.',
 '2026-05-30', NULL, NULL, 'c0000001-0000-0000-0000-000000000001'),

('11111111-1111-1111-1111-111111111111', 'consultant_available', 'medium', 'new',
 'Marc D. disponible dès le 15/04',
 'Profil Full-Stack senior à placer rapidement.',
 '2026-04-15', NULL, NULL, 'c0000002-0000-0000-0000-000000000002'),

('11111111-1111-1111-1111-111111111111', 'invoice_overdue', 'critical', 'new',
 'Facture FAC-2026-0001 à suivre',
 'Facture Dior envoyée le 01/04, échéance le 01/05.',
 '2026-05-01', NULL, 'f1000001-0000-0000-0000-000000000001', NULL),

('11111111-1111-1111-1111-111111111111', 'opportunity_cold', 'low', 'new',
 'Opportunité Byron Group froide',
 'Pas d''interaction depuis plusieurs jours. Réactiver avec une CVthèque.',
 '2026-04-25', 'b0000003-0000-0000-0000-000000000003', NULL, NULL);

-- =========================================================================
-- ACTIVITIES (historique)
-- =========================================================================

INSERT INTO activities (organization_id, entity_type, entity_id, action, metadata) VALUES
('11111111-1111-1111-1111-111111111111', 'consultant', 'c0000001-0000-0000-0000-000000000001', 'created', '{}'::jsonb),
('11111111-1111-1111-1111-111111111111', 'cv_version', 'c0000001-0000-0000-0000-000000000001', 'cv_generated', '{"template": "standard", "matching_score": 92}'::jsonb),
('11111111-1111-1111-1111-111111111111', 'opportunity', 'b0000001-0000-0000-0000-000000000001', 'created', '{}'::jsonb),
('11111111-1111-1111-1111-111111111111', 'opportunity', 'b0000001-0000-0000-0000-000000000001', 'cv_sent', '{"consultant": "Alex S."}'::jsonb),
('11111111-1111-1111-1111-111111111111', 'invoice', 'f1000001-0000-0000-0000-000000000001', 'sent', '{"amount_ttc": 13860.00}'::jsonb);
