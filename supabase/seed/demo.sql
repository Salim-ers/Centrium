-- =========================================================================
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
 WHERE organization_id = '0000de30-0000-4000-8000-000000000000' OR consultant_id = 'de30a003-0000-4000-8000-000000000001';
DELETE FROM organizations WHERE id = '0000de30-0000-4000-8000-000000000000';

INSERT INTO organizations (id, name, slug, brand_name, city, country, plan, payment_terms_days, footer_tagline)
VALUES ('0000de30-0000-4000-8000-000000000000', 'Atlas Conseil (démo)', 'atlas-conseil-demo', 'Atlas Conseil · démo', 'Paris', 'FR', 'v2_growth', 30,
        'Espace de démonstration Centrium — données fictives');

-- Abonnement exempté : pas de limite de plan ni de paiement pour la démo.
INSERT INTO subscriptions (organization_id, plan_id, status, is_exempt_from_billing, trial_end, current_period_end)
VALUES ('0000de30-0000-4000-8000-000000000000', 'v2_growth', 'active', true, NULL, now() + interval '1 year')
ON CONFLICT (organization_id) DO UPDATE
  SET plan_id = 'v2_growth', status = 'active', is_exempt_from_billing = true, trial_end = NULL, current_period_end = now() + interval '1 year';

-- Clients et prospects
INSERT INTO companies (id, organization_id, name, kind, industry, size, city, country, website) VALUES
  ('de30a001-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 'Nordal Assurances', 'client', 'Assurance', 'ETI', 'Paris', 'FR', 'https://www.nordal.example'),
  ('de30a001-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 'Helio Retail', 'client', 'Distribution', 'Grand groupe', 'Lyon', 'FR', 'https://www.helio.example'),
  ('de30a001-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 'Varenne Énergie', 'client', 'Énergie', 'Grand groupe', 'Nantes', 'FR', 'https://www.varenne.example'),
  ('de30a001-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 'Opaline Banque', 'client', 'Banque', 'Grand groupe', 'Paris', 'FR', 'https://www.opaline.example'),
  ('de30a001-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 'Kestrel Mobilités', 'client', 'Transport', 'ETI', 'Lille', 'FR', 'https://www.kestrel.example'),
  ('de30a001-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 'Brise Santé', 'client', 'Santé', 'ETI', 'Bordeaux', 'FR', 'https://www.brise.example'),
  ('de30a001-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 'Cobalt Logistique', 'client', 'Logistique', 'ETI', 'Marseille', 'FR', 'https://www.cobalt.example'),
  ('de30a001-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 'Mirabelle Média', 'client', 'Médias', 'PME', 'Paris', 'FR', 'https://www.mirabelle.example'),
  ('de30a001-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 'Sorel Industrie', 'prospect', 'Industrie', 'ETI', 'Grenoble', 'FR', 'https://www.sorel.example'),
  ('de30a001-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 'Altaïr Télécom', 'prospect', 'Télécoms', 'Grand groupe', 'Rennes', 'FR', 'https://www.altair.example');

-- Interlocuteurs
INSERT INTO contacts (id, organization_id, company_id, first_name, last_name, contact_type, job_title, email, city, source, last_interaction) VALUES
  ('de30a002-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000001', 'Claire', 'Vidal', 'client_final', 'DSI adjointe', 'claire.vidal@nordal.example', 'Paris', 'Réseau', now() - interval '3 days'),
  ('de30a002-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000001', 'Paul', 'Arnaud', 'buyer', 'Acheteur prestations IT', 'paul.arnaud@nordal.example', 'Paris', 'Réseau', now() - interval '12 days'),
  ('de30a002-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000002', 'Marc', 'Petit', 'client_final', 'Responsable delivery e-commerce', 'marc.petit@helio.example', 'Lyon', 'Réseau', now() - interval '5 days'),
  ('de30a002-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000003', 'Sophie', 'Leroy', 'manager', 'Directrice de programme', 'sophie.leroy@varenne.example', 'Nantes', 'Réseau', now() - interval '9 days'),
  ('de30a002-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000004', 'Julien', 'Masson', 'client_final', 'Head of Data', 'julien.masson@opaline.example', 'Paris', 'Réseau', now() - interval '2 days'),
  ('de30a002-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000004', 'Nadia', 'Benali', 'buyer', 'Responsable achats IT', 'nadia.benali@opaline.example', 'Paris', 'Réseau', now() - interval '20 days'),
  ('de30a002-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000005', 'Éric', 'Fontaine', 'client_final', 'CTO', 'eric.fontaine@kestrel.example', 'Lille', 'Réseau', now() - interval '7 days'),
  ('de30a002-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000006', 'Hélène', 'Caron', 'manager', 'Responsable PMO', 'helene.caron@brise.example', 'Bordeaux', 'Réseau', now() - interval '16 days'),
  ('de30a002-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000007', 'Antoine', 'Mercier', 'client_final', 'DSI', 'antoine.mercier@cobalt.example', 'Marseille', 'Réseau', now() - interval '4 days'),
  ('de30a002-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000008', 'Laura', 'Gauthier', 'client_final', 'Directrice produit', 'laura.gauthier@mirabelle.example', 'Paris', 'Réseau', now() - interval '25 days'),
  ('de30a002-0000-4000-8000-000000000011', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000009', 'Vincent', 'Barbier', 'client_final', 'RSSI', 'vincent.barbier@sorel.example', 'Grenoble', 'Réseau', now() - interval '1 days'),
  ('de30a002-0000-4000-8000-000000000012', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000010', 'Céline', 'Royer', 'client_final', 'Directrice data & IA', 'celine.royer@altair.example', 'Rennes', 'Réseau', now() - interval '6 days');

-- Consultants (la disponibilité suit les missions, trigger sync_consultant_status_from_missions)
INSERT INTO consultants (id, organization_id, first_name, last_name, initials, email, job_title, seniority, years_experience, city, country, mobility, languages, daily_rate_eur, contract_type, status, summary, certifications) VALUES
  ('de30a003-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 'Inès', 'Morel', 'I. M.', 'ines.morel@consultants.example', 'Data engineer', 'confirmed', 5, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 650, 'cdi', 'available', 'Data engineer orientée qualité de données : pipelines Spark et Airflow, modélisation dbt, mise en production sur AWS.', '[{"name":"AWS Certified Data Engineer – Associate","issuer":"Amazon Web Services","year":2025}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 'Yanis', 'Benali', 'Y. B.', 'yanis.benali@consultants.example', 'Développeur React', 'senior', 8, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 620, 'freelance', 'available', 'Développeur front senior : applications React et Next.js à fort trafic, design system et performance.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 'Léa', 'Dubois', 'L. D.', 'lea.dubois@consultants.example', 'Product owner', 'senior', 9, 'Lyon', 'FR', 'Lyon et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 700, 'cdi', 'available', 'Product owner sur des produits B2C : priorisation par la valeur, ateliers utilisateurs, pilotage par les indicateurs.', '[{"name":"Professional Scrum Product Owner I","issuer":"Scrum.org","year":2022}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 'Hugo', 'Lambert', 'H. L.', 'hugo.lambert@consultants.example', 'Chef de projet', 'expert', 14, 'Nantes', 'FR', 'Nantes et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 780, 'cdi', 'available', 'Chef de projet confirmé sur des programmes industriels : planning, budget, risques et comités de pilotage.', '[{"name":"PRINCE2 Practitioner","issuer":"AXELOS","year":2019}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 'Sarah', 'Petit', 'S. P.', 'sarah.petit@consultants.example', 'Analyste BI', 'confirmed', 4, 'Nantes', 'FR', 'Nantes et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 560, 'cdi', 'available', 'Analyste BI : tableaux de bord Power BI, modélisation DAX et recueil des besoins métier.', '[{"name":"Microsoft Certified: Power BI Data Analyst Associate","issuer":"Microsoft","year":2024}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 'Tom', 'Girard', 'T. G.', 'tom.girard@consultants.example', 'Data engineer', 'senior', 9, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 720, 'freelance', 'available', 'Data engineer senior : traitements temps réel Kafka et Spark, plateformes GCP pour la banque et l’assurance.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 'Jade', 'Moreau', 'J. M.', 'jade.moreau@consultants.example', 'Développeuse React', 'confirmed', 4, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 560, 'cdi', 'available', 'Développeuse front-end : composants React accessibles, tests et documentation Storybook.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 'Chloé', 'Lambert', 'C. L.', 'chloe.lambert@consultants.example', 'Architecte cloud', 'architect', 15, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Bilingue"}]'::jsonb, 950, 'portage', 'available', 'Architecte cloud : migrations vers AWS, infrastructure as code et gouvernance de la sécurité.', '[{"name":"AWS Certified Solutions Architect – Professional","issuer":"Amazon Web Services","year":2024}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 'Sami', 'Dubois', 'S. D.', 'sami.dubois@consultants.example', 'Tech lead Java', 'lead', 12, 'Lyon', 'FR', 'Lyon et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 800, 'cdi', 'available', 'Tech lead Java : architecture microservices, revue de code et accompagnement des équipes.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 'Noah', 'Haddad', 'N. H.', 'noah.haddad@consultants.example', 'Data engineer', 'junior', 2, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 480, 'cdi', 'available', 'Data engineer junior : pipelines Python et Airflow, conteneurisation Docker.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000011', '0000de30-0000-4000-8000-000000000000', 'Ilyes', 'Girard', 'I. G.', 'ilyes.girard@consultants.example', 'DevOps', 'senior', 8, 'Lille', 'FR', 'Lille et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 700, 'freelance', 'available', 'Ingénieur DevOps : chaînes CI/CD, Kubernetes et automatisation de l’infrastructure.', '[{"name":"Certified Kubernetes Administrator","issuer":"CNCF","year":2023}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000012', '0000de30-0000-4000-8000-000000000000', 'Camille', 'Roux', 'C. R.', 'camille.roux@consultants.example', 'Scrum master', 'senior', 10, 'Bordeaux', 'FR', 'Bordeaux et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 650, 'cdi', 'available', 'Scrum master et coach : accompagnement d’équipes produit, rituels et amélioration continue.', '[{"name":"Professional Scrum Master II","issuer":"Scrum.org","year":2021}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000013', '0000de30-0000-4000-8000-000000000000', 'Manon', 'Moreau', 'M. M.', 'manon.moreau@consultants.example', 'Développeuse .NET', 'confirmed', 6, 'Lille', 'FR', 'Lille et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 580, 'cdi', 'available', 'Développeuse .NET full stack : API C#, Angular et déploiement sur Azure.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000014', '0000de30-0000-4000-8000-000000000000', 'Rayan', 'Morel', 'R. M.', 'rayan.morel@consultants.example', 'DevOps', 'confirmed', 5, 'Marseille', 'FR', 'Marseille et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 600, 'cdi', 'available', 'DevOps : conteneurisation, pipelines Azure DevOps et exploitation Linux.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000015', '0000de30-0000-4000-8000-000000000000', 'Nora', 'Faure', 'N. F.', 'nora.faure@consultants.example', 'Développeuse React', 'senior', 7, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 640, 'freelance', 'available', 'Développeuse React et React Native : applications mobiles et web, accessibilité et performance.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000016', '0000de30-0000-4000-8000-000000000000', 'Lucas', 'Bernard', 'L. B.', 'lucas.bernard@consultants.example', 'Ingénieur sécurité', 'senior', 9, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 760, 'cdi', 'available', 'Ingénieur sécurité : gestion des identités, conformité ISO 27001 et pilotage du traitement des vulnérabilités.', '[{"name":"ISO/IEC 27001 Lead Implementer","issuer":"PECB","year":2023}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000017', '0000de30-0000-4000-8000-000000000000', 'Emma', 'Lefèvre', 'E. L.', 'emma.lefevre@consultants.example', 'QA engineer', 'confirmed', 5, 'Lyon', 'FR', 'Lyon et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 520, 'cdi', 'available', 'QA engineer : stratégies de test, automatisation Cypress et tests d’API.', '[{"name":"ISTQB Certified Tester Foundation Level","issuer":"ISTQB","year":2021}]'::jsonb),
  ('de30a003-0000-4000-8000-000000000018', '0000de30-0000-4000-8000-000000000000', 'Adam', 'Rousseau', 'A. R.', 'adam.rousseau@consultants.example', 'Architecte data', 'architect', 13, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Bilingue"}]'::jsonb, 900, 'freelance', 'available', 'Architecte data : plateformes modernes Snowflake et dbt, gouvernance et data mesh.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000019', '0000de30-0000-4000-8000-000000000000', 'Louise', 'Garnier', 'L. G.', 'louise.garnier@consultants.example', 'Business analyst', 'confirmed', 6, 'Nantes', 'FR', 'Nantes et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Professionnel"}]'::jsonb, 590, 'cdi', 'available', 'Business analyst en assurance : recueil du besoin, modélisation des processus et recette.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000020', '0000de30-0000-4000-8000-000000000000', 'Mehdi', 'Chevalier', 'M. C.', 'mehdi.chevalier@consultants.example', 'Développeur Python', 'junior', 2, 'Bordeaux', 'FR', 'Bordeaux et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 470, 'cdi', 'available', 'Développeur Python : API Django, PostgreSQL et conteneurisation.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000021', '0000de30-0000-4000-8000-000000000000', 'Zoé', 'Perrin', 'Z. P.', 'zoe.perrin@consultants.example', 'UX designer', 'senior', 8, 'Paris', 'FR', 'Île-de-France', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 650, 'freelance', 'available', 'UX designer : recherche utilisateur, design system et prototypes testés.', '[]'::jsonb),
  ('de30a003-0000-4000-8000-000000000022', '0000de30-0000-4000-8000-000000000000', 'Karim', 'Nasri', 'K. N.', 'karim.nasri@consultants.example', 'SRE', 'senior', 9, 'Lille', 'FR', 'Lille et alentours', '[{"code":"FR","level":"Natif"},{"code":"EN","level":"Courant"}]'::jsonb, 720, 'cdi', 'available', 'SRE : observabilité, fiabilité et automatisation des opérations sur Kubernetes.', '[]'::jsonb);

INSERT INTO consultant_financials (consultant_id, organization_id, daily_cost_eur, target_margin_pct) VALUES
  ('de30a003-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 420, 25),
  ('de30a003-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 520, 25),
  ('de30a003-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 450, 25),
  ('de30a003-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 500, 25),
  ('de30a003-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 360, 25),
  ('de30a003-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 600, 25),
  ('de30a003-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 380, 25),
  ('de30a003-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 820, 25),
  ('de30a003-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 520, 25),
  ('de30a003-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 320, 25),
  ('de30a003-0000-4000-8000-000000000011', '0000de30-0000-4000-8000-000000000000', 590, 25),
  ('de30a003-0000-4000-8000-000000000012', '0000de30-0000-4000-8000-000000000000', 430, 25),
  ('de30a003-0000-4000-8000-000000000013', '0000de30-0000-4000-8000-000000000000', 390, 25),
  ('de30a003-0000-4000-8000-000000000014', '0000de30-0000-4000-8000-000000000000', 400, 25),
  ('de30a003-0000-4000-8000-000000000015', '0000de30-0000-4000-8000-000000000000', 540, 25),
  ('de30a003-0000-4000-8000-000000000016', '0000de30-0000-4000-8000-000000000000', 490, 25),
  ('de30a003-0000-4000-8000-000000000017', '0000de30-0000-4000-8000-000000000000', 350, 25),
  ('de30a003-0000-4000-8000-000000000018', '0000de30-0000-4000-8000-000000000000', 760, 25),
  ('de30a003-0000-4000-8000-000000000019', '0000de30-0000-4000-8000-000000000000', 400, 25),
  ('de30a003-0000-4000-8000-000000000020', '0000de30-0000-4000-8000-000000000000', 310, 25),
  ('de30a003-0000-4000-8000-000000000021', '0000de30-0000-4000-8000-000000000000', 550, 25),
  ('de30a003-0000-4000-8000-000000000022', '0000de30-0000-4000-8000-000000000000', 470, 25);

INSERT INTO consultant_skills (consultant_id, category, name, level, years, is_highlighted) VALUES
  ('de30a003-0000-4000-8000-000000000001', 'Data', 'Python', 5, 5, true),
  ('de30a003-0000-4000-8000-000000000001', 'Data', 'Spark', 5, 4, true),
  ('de30a003-0000-4000-8000-000000000001', 'Data', 'Airflow', 4, 3, true),
  ('de30a003-0000-4000-8000-000000000001', 'Data', 'SQL', 4, 2, false),
  ('de30a003-0000-4000-8000-000000000001', 'Data', 'AWS', 3, 1, false),
  ('de30a003-0000-4000-8000-000000000001', 'Data', 'dbt', 3, 1, false),
  ('de30a003-0000-4000-8000-000000000002', 'Front-end', 'React', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000002', 'Front-end', 'TypeScript', 5, 7, true),
  ('de30a003-0000-4000-8000-000000000002', 'Front-end', 'Next.js', 4, 6, true),
  ('de30a003-0000-4000-8000-000000000002', 'Front-end', 'Node.js', 4, 5, false),
  ('de30a003-0000-4000-8000-000000000002', 'Front-end', 'GraphQL', 3, 4, false),
  ('de30a003-0000-4000-8000-000000000003', 'Produit', 'Scrum', 5, 9, true),
  ('de30a003-0000-4000-8000-000000000003', 'Produit', 'Jira', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000003', 'Produit', 'User stories', 4, 7, true),
  ('de30a003-0000-4000-8000-000000000003', 'Produit', 'SAFe', 4, 6, false),
  ('de30a003-0000-4000-8000-000000000003', 'Produit', 'Figma', 3, 5, false),
  ('de30a003-0000-4000-8000-000000000004', 'Pilotage', 'Pilotage de projet', 5, 14, true),
  ('de30a003-0000-4000-8000-000000000004', 'Pilotage', 'PRINCE2', 5, 13, true),
  ('de30a003-0000-4000-8000-000000000004', 'Pilotage', 'MS Project', 4, 12, true),
  ('de30a003-0000-4000-8000-000000000004', 'Pilotage', 'Gestion budgétaire', 4, 11, false),
  ('de30a003-0000-4000-8000-000000000004', 'Pilotage', 'Gestion des risques', 3, 10, false),
  ('de30a003-0000-4000-8000-000000000005', 'Data', 'Power BI', 5, 4, true),
  ('de30a003-0000-4000-8000-000000000005', 'Data', 'SQL', 5, 3, true),
  ('de30a003-0000-4000-8000-000000000005', 'Data', 'DAX', 4, 2, true),
  ('de30a003-0000-4000-8000-000000000005', 'Data', 'Azure', 4, 1, false),
  ('de30a003-0000-4000-8000-000000000005', 'Data', 'Excel', 3, 1, false),
  ('de30a003-0000-4000-8000-000000000006', 'Data', 'Scala', 5, 9, true),
  ('de30a003-0000-4000-8000-000000000006', 'Data', 'Spark', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000006', 'Data', 'Kafka', 4, 7, true),
  ('de30a003-0000-4000-8000-000000000006', 'Data', 'GCP', 4, 6, false),
  ('de30a003-0000-4000-8000-000000000006', 'Data', 'BigQuery', 3, 5, false),
  ('de30a003-0000-4000-8000-000000000006', 'Data', 'SQL', 3, 4, false),
  ('de30a003-0000-4000-8000-000000000007', 'Front-end', 'React', 5, 4, true),
  ('de30a003-0000-4000-8000-000000000007', 'Front-end', 'TypeScript', 5, 3, true),
  ('de30a003-0000-4000-8000-000000000007', 'Front-end', 'Jest', 4, 2, true),
  ('de30a003-0000-4000-8000-000000000007', 'Front-end', 'CSS', 4, 1, false),
  ('de30a003-0000-4000-8000-000000000007', 'Front-end', 'Storybook', 3, 1, false),
  ('de30a003-0000-4000-8000-000000000008', 'Cloud', 'AWS', 5, 15, true),
  ('de30a003-0000-4000-8000-000000000008', 'Cloud', 'Terraform', 5, 14, true),
  ('de30a003-0000-4000-8000-000000000008', 'Cloud', 'Kubernetes', 4, 13, true),
  ('de30a003-0000-4000-8000-000000000008', 'Cloud', 'Architecture', 4, 12, false),
  ('de30a003-0000-4000-8000-000000000008', 'Cloud', 'Sécurité cloud', 3, 11, false),
  ('de30a003-0000-4000-8000-000000000009', 'Back-end', 'Java', 5, 12, true),
  ('de30a003-0000-4000-8000-000000000009', 'Back-end', 'Spring Boot', 5, 11, true),
  ('de30a003-0000-4000-8000-000000000009', 'Back-end', 'Microservices', 4, 10, true),
  ('de30a003-0000-4000-8000-000000000009', 'Back-end', 'Kafka', 4, 9, false),
  ('de30a003-0000-4000-8000-000000000009', 'Back-end', 'PostgreSQL', 3, 8, false),
  ('de30a003-0000-4000-8000-000000000010', 'Data', 'Python', 5, 2, true),
  ('de30a003-0000-4000-8000-000000000010', 'Data', 'SQL', 5, 1, true),
  ('de30a003-0000-4000-8000-000000000010', 'Data', 'Airflow', 4, 1, true),
  ('de30a003-0000-4000-8000-000000000010', 'Data', 'Docker', 4, 1, false),
  ('de30a003-0000-4000-8000-000000000011', 'DevOps', 'Kubernetes', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000011', 'DevOps', 'Terraform', 5, 7, true),
  ('de30a003-0000-4000-8000-000000000011', 'DevOps', 'GitLab CI', 4, 6, true),
  ('de30a003-0000-4000-8000-000000000011', 'DevOps', 'AWS', 4, 5, false),
  ('de30a003-0000-4000-8000-000000000011', 'DevOps', 'Ansible', 3, 4, false),
  ('de30a003-0000-4000-8000-000000000012', 'Agilité', 'Scrum', 5, 10, true),
  ('de30a003-0000-4000-8000-000000000012', 'Agilité', 'Kanban', 5, 9, true),
  ('de30a003-0000-4000-8000-000000000012', 'Agilité', 'Coaching agile', 4, 8, true),
  ('de30a003-0000-4000-8000-000000000012', 'Agilité', 'Jira', 4, 7, false),
  ('de30a003-0000-4000-8000-000000000012', 'Agilité', 'Facilitation', 3, 6, false),
  ('de30a003-0000-4000-8000-000000000013', 'Back-end', 'C#', 5, 6, true),
  ('de30a003-0000-4000-8000-000000000013', 'Back-end', '.NET', 5, 5, true),
  ('de30a003-0000-4000-8000-000000000013', 'Back-end', 'Azure', 4, 4, true),
  ('de30a003-0000-4000-8000-000000000013', 'Back-end', 'SQL Server', 4, 3, false),
  ('de30a003-0000-4000-8000-000000000013', 'Back-end', 'Angular', 3, 2, false),
  ('de30a003-0000-4000-8000-000000000014', 'DevOps', 'Docker', 5, 5, true),
  ('de30a003-0000-4000-8000-000000000014', 'DevOps', 'Kubernetes', 5, 4, true),
  ('de30a003-0000-4000-8000-000000000014', 'DevOps', 'Azure DevOps', 4, 3, true),
  ('de30a003-0000-4000-8000-000000000014', 'DevOps', 'Linux', 4, 2, false),
  ('de30a003-0000-4000-8000-000000000014', 'DevOps', 'Terraform', 3, 1, false),
  ('de30a003-0000-4000-8000-000000000015', 'Front-end', 'React', 5, 7, true),
  ('de30a003-0000-4000-8000-000000000015', 'Front-end', 'React Native', 5, 6, true),
  ('de30a003-0000-4000-8000-000000000015', 'Front-end', 'TypeScript', 4, 5, true),
  ('de30a003-0000-4000-8000-000000000015', 'Front-end', 'Redux', 4, 4, false),
  ('de30a003-0000-4000-8000-000000000015', 'Front-end', 'Accessibilité', 3, 3, false),
  ('de30a003-0000-4000-8000-000000000016', 'Sécurité', 'IAM', 5, 9, true),
  ('de30a003-0000-4000-8000-000000000016', 'Sécurité', 'ISO 27001', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000016', 'Sécurité', 'Azure AD', 4, 7, true),
  ('de30a003-0000-4000-8000-000000000016', 'Sécurité', 'SOC', 4, 6, false),
  ('de30a003-0000-4000-8000-000000000016', 'Sécurité', 'Gestion des vulnérabilités', 3, 5, false),
  ('de30a003-0000-4000-8000-000000000017', 'Qualité', 'Cypress', 5, 5, true),
  ('de30a003-0000-4000-8000-000000000017', 'Qualité', 'Selenium', 5, 4, true),
  ('de30a003-0000-4000-8000-000000000017', 'Qualité', 'Tests automatisés', 4, 3, true),
  ('de30a003-0000-4000-8000-000000000017', 'Qualité', 'Jira', 4, 2, false),
  ('de30a003-0000-4000-8000-000000000017', 'Qualité', 'API testing', 3, 1, false),
  ('de30a003-0000-4000-8000-000000000018', 'Data', 'Data mesh', 5, 13, true),
  ('de30a003-0000-4000-8000-000000000018', 'Data', 'Snowflake', 5, 12, true),
  ('de30a003-0000-4000-8000-000000000018', 'Data', 'dbt', 4, 11, true),
  ('de30a003-0000-4000-8000-000000000018', 'Data', 'Architecture', 4, 10, false),
  ('de30a003-0000-4000-8000-000000000018', 'Data', 'GCP', 3, 9, false),
  ('de30a003-0000-4000-8000-000000000019', 'Produit', 'Recueil du besoin', 5, 6, true),
  ('de30a003-0000-4000-8000-000000000019', 'Produit', 'BPMN', 5, 5, true),
  ('de30a003-0000-4000-8000-000000000019', 'Produit', 'SQL', 4, 4, true),
  ('de30a003-0000-4000-8000-000000000019', 'Produit', 'Assurance', 4, 3, false),
  ('de30a003-0000-4000-8000-000000000019', 'Produit', 'Recette', 3, 2, false),
  ('de30a003-0000-4000-8000-000000000020', 'Back-end', 'Python', 5, 2, true),
  ('de30a003-0000-4000-8000-000000000020', 'Back-end', 'Django', 5, 1, true),
  ('de30a003-0000-4000-8000-000000000020', 'Back-end', 'PostgreSQL', 4, 1, true),
  ('de30a003-0000-4000-8000-000000000020', 'Back-end', 'Docker', 4, 1, false),
  ('de30a003-0000-4000-8000-000000000021', 'Design', 'Figma', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000021', 'Design', 'Recherche utilisateur', 5, 7, true),
  ('de30a003-0000-4000-8000-000000000021', 'Design', 'Design system', 4, 6, true),
  ('de30a003-0000-4000-8000-000000000021', 'Design', 'Accessibilité', 4, 5, false),
  ('de30a003-0000-4000-8000-000000000021', 'Design', 'Prototypage', 3, 4, false),
  ('de30a003-0000-4000-8000-000000000022', 'DevOps', 'Prometheus', 5, 9, true),
  ('de30a003-0000-4000-8000-000000000022', 'DevOps', 'Grafana', 5, 8, true),
  ('de30a003-0000-4000-8000-000000000022', 'DevOps', 'Kubernetes', 4, 7, true),
  ('de30a003-0000-4000-8000-000000000022', 'DevOps', 'GCP', 4, 6, false),
  ('de30a003-0000-4000-8000-000000000022', 'DevOps', 'Go', 3, 5, false);

INSERT INTO consultant_experiences (consultant_id, client_name, role, start_date, end_date, context, tasks, environment, order_index) VALUES
  ('de30a003-0000-4000-8000-000000000001', 'Groupe Lumen', 'Data engineer', CURRENT_DATE - 1300, CURRENT_DATE - 720, 'Industrialisation des flux de données marketing.', '[]'::jsonb, '["Python","Airflow","PostgreSQL"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000002', 'Banque Sirius', 'Développeur React', CURRENT_DATE - 1100, CURRENT_DATE - 400, 'Refonte de l’espace client web.', '[]'::jsonb, '["React","TypeScript","Redux"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000003', 'Enseigne Calypso', 'Product owner', CURRENT_DATE - 1500, CURRENT_DATE - 320, 'Programme de fidélité omnicanal.', '[]'::jsonb, '["Jira","Confluence","Figma"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000004', 'Réseau Ouest Énergies', 'Chef de projet', CURRENT_DATE - 1800, CURRENT_DATE - 280, 'Déploiement d’un SI de facturation.', '[]'::jsonb, '["MS Project","Jira"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000005', 'Coopérative Armor', 'Analyste BI', CURRENT_DATE - 900, CURRENT_DATE - 130, 'Reporting commercial et logistique.', '[]'::jsonb, '["Power BI","SQL Server"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000006', 'Assureur Hélios', 'Data engineer', CURRENT_DATE - 1000, CURRENT_DATE - 200, 'Plateforme de données sinistres.', '[]'::jsonb, '["Spark","Kafka","GCP"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000007', 'Mutuelle Ardoise', 'Développeuse React', CURRENT_DATE - 700, CURRENT_DATE - 100, 'Parcours de souscription en ligne.', '[]'::jsonb, '["React","TypeScript"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000008', 'Transports Azur', 'Architecte cloud', CURRENT_DATE - 1200, CURRENT_DATE - 250, 'Migration d’un SI de billetterie vers AWS.', '[]'::jsonb, '["AWS","Terraform"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000009', 'Banque Sirius', 'Développeur Java senior', CURRENT_DATE - 2000, CURRENT_DATE - 420, 'Moteur de paiements.', '[]'::jsonb, '["Java","Spring","Oracle"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000010', 'Start-up Pollen', 'Data engineer (alternance)', CURRENT_DATE - 730, CURRENT_DATE - 40, 'Collecte et nettoyage de données capteurs.', '[]'::jsonb, '["Python","Airflow"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000011', 'Éditeur Quartz', 'DevOps', CURRENT_DATE - 1100, CURRENT_DATE - 110, 'Industrialisation des déploiements SaaS.', '[]'::jsonb, '["GitLab CI","Kubernetes"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000012', 'Clinique Horizon', 'Scrum master', CURRENT_DATE - 900, CURRENT_DATE - 220, 'Transformation agile de la DSI.', '[]'::jsonb, '["Jira","Miro"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000013', 'Négoce Atlantique', 'Développeuse .NET', CURRENT_DATE - 1000, CURRENT_DATE - 170, 'Application de gestion des commandes.', '[]'::jsonb, '[".NET","Angular"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000014', 'Port Méditerranée', 'Administrateur systèmes', CURRENT_DATE - 1500, CURRENT_DATE - 320, 'Supervision et automatisation.', '[]'::jsonb, '["Linux","Ansible"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000015', 'Réseau Ciné+', 'Développeuse mobile', CURRENT_DATE - 900, CURRENT_DATE - 280, 'Application de billetterie mobile.', '[]'::jsonb, '["React Native","TypeScript"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000016', 'Assureur Hélios', 'Ingénieur IAM', CURRENT_DATE - 1300, CURRENT_DATE - 70, 'Refonte des habilitations.', '[]'::jsonb, '["Azure AD","SailPoint"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000017', 'Mutuelle Ardoise', 'Testeuse', CURRENT_DATE - 1000, CURRENT_DATE - 210, 'Recette d’un extranet assurés.', '[]'::jsonb, '["Selenium","Jira"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000018', 'Groupe Lumen', 'Architecte data', CURRENT_DATE - 1400, CURRENT_DATE - 140, 'Plateforme de données groupe.', '[]'::jsonb, '["Snowflake","dbt"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000019', 'Mutuelle Ardoise', 'Business analyst', CURRENT_DATE - 1200, CURRENT_DATE - 90, 'Gestion des contrats santé.', '[]'::jsonb, '["BPMN","SQL"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000020', 'Start-up Pollen', 'Développeur Python', CURRENT_DATE - 600, CURRENT_DATE - 160, 'Back-office de suivi de capteurs.', '[]'::jsonb, '["Django","PostgreSQL"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000021', 'Enseigne Calypso', 'UX designer', CURRENT_DATE - 900, CURRENT_DATE - 190, 'Refonte de l’application mobile.', '[]'::jsonb, '["Figma","Maze"]'::jsonb, 1),
  ('de30a003-0000-4000-8000-000000000022', 'Éditeur Quartz', 'SRE', CURRENT_DATE - 1300, CURRENT_DATE - 30, 'Fiabilisation d’une plateforme SaaS.', '[]'::jsonb, '["Kubernetes","Prometheus"]'::jsonb, 1);

-- Missions et coûts
INSERT INTO missions (id, organization_id, consultant_id, company_id, title, daily_rate_eur, start_date, end_date, status, location, remote_policy, renewal_status, planned_days, contract_number) VALUES
  ('de30a004-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000001', 'de30a001-0000-4000-8000-000000000001', 'Data engineer · plateforme sinistres', 650, CURRENT_DATE - 200, CURRENT_DATE + 150, 'active', 'Paris', 'hybrid', 'likely', 220, 'CM-DEMO-001'),
  ('de30a004-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000002', 'de30a001-0000-4000-8000-000000000002', 'Refonte e-commerce React', 620, CURRENT_DATE - 150, CURRENT_DATE + 40, 'active', 'Lyon', 'hybrid', 'unknown', NULL, 'CM-DEMO-002'),
  ('de30a004-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000003', 'de30a001-0000-4000-8000-000000000002', 'Product owner programme fidélité', 700, CURRENT_DATE - 300, CURRENT_DATE + 90, 'active', 'Lyon', 'hybrid', 'likely', NULL, 'CM-DEMO-003'),
  ('de30a004-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000004', 'de30a001-0000-4000-8000-000000000003', 'Pilotage programme compteurs', 780, CURRENT_DATE - 260, CURRENT_DATE + 12, 'active', 'Nantes', 'onsite', 'unknown', NULL, 'CM-DEMO-004'),
  ('de30a004-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000005', 'de30a001-0000-4000-8000-000000000003', 'Reporting Power BI', 560, CURRENT_DATE - 120, CURRENT_DATE + 120, 'active', 'Nantes', 'hybrid', 'unknown', NULL, 'CM-DEMO-005'),
  ('de30a004-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000006', 'de30a001-0000-4000-8000-000000000004', 'Data engineer risque crédit', 720, CURRENT_DATE - 180, CURRENT_DATE + 180, 'active', 'Paris', 'hybrid', 'unknown', NULL, 'CM-DEMO-006'),
  ('de30a004-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000007', 'de30a001-0000-4000-8000-000000000004', 'Front React espace client', 560, CURRENT_DATE - 90, CURRENT_DATE + 200, 'active', 'Paris', 'hybrid', 'unknown', NULL, 'CM-DEMO-007'),
  ('de30a004-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000008', 'de30a001-0000-4000-8000-000000000005', 'Architecture cloud AWS', 950, CURRENT_DATE - 240, CURRENT_DATE + 60, 'active', 'Lille', 'remote', 'confirmed', NULL, 'CM-DEMO-008'),
  ('de30a004-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000009', 'de30a001-0000-4000-8000-000000000001', 'Tech lead plateforme contrats', 800, CURRENT_DATE - 400, NULL, 'active', 'Paris', 'hybrid', 'unknown', NULL, 'CM-DEMO-009'),
  ('de30a004-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000011', 'de30a001-0000-4000-8000-000000000005', 'DevOps · chaîne CI/CD', 700, CURRENT_DATE - 100, CURRENT_DATE + 80, 'active', 'Lille', 'hybrid', 'unknown', NULL, 'CM-DEMO-010'),
  ('de30a004-0000-4000-8000-000000000011', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000012', 'de30a001-0000-4000-8000-000000000006', 'Scrum master dossier patient', 650, CURRENT_DATE - 210, CURRENT_DATE + 25, 'active', 'Bordeaux', 'hybrid', 'not_renewed', NULL, 'CM-DEMO-011'),
  ('de30a004-0000-4000-8000-000000000012', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000013', 'de30a001-0000-4000-8000-000000000007', 'Développement .NET · WMS', 580, CURRENT_DATE - 160, CURRENT_DATE + 140, 'active', 'Marseille', 'remote', 'unknown', NULL, 'CM-DEMO-012'),
  ('de30a004-0000-4000-8000-000000000013', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000016', 'de30a001-0000-4000-8000-000000000004', 'Sécurité · gestion des identités', 760, CURRENT_DATE - 60, CURRENT_DATE + 240, 'active', 'Paris', 'hybrid', 'unknown', NULL, 'CM-DEMO-013'),
  ('de30a004-0000-4000-8000-000000000014', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000018', 'de30a001-0000-4000-8000-000000000008', 'Architecture data', 900, CURRENT_DATE - 130, CURRENT_DATE + 110, 'active', 'Paris', 'remote', 'unknown', NULL, 'CM-DEMO-014'),
  ('de30a004-0000-4000-8000-000000000015', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000019', 'de30a001-0000-4000-8000-000000000001', 'Business analyst sinistres', 590, CURRENT_DATE - 75, CURRENT_DATE + 105, 'active', 'Paris', 'hybrid', 'unknown', NULL, 'CM-DEMO-015'),
  ('de30a004-0000-4000-8000-000000000016', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000022', 'de30a001-0000-4000-8000-000000000007', 'SRE · observabilité', 720, CURRENT_DATE + 18, CURRENT_DATE + 200, 'active', 'Marseille', 'hybrid', 'unknown', NULL, 'CM-DEMO-016'),
  ('de30a004-0000-4000-8000-000000000017', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000001', 'de30a001-0000-4000-8000-000000000002', 'Data engineer · supply chain', 620, CURRENT_DATE - 520, CURRENT_DATE - 205, 'ended', 'Lyon', 'hybrid', 'not_renewed', NULL, 'CM-DEMO-017'),
  ('de30a004-0000-4000-8000-000000000018', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000014', 'de30a001-0000-4000-8000-000000000003', 'DevOps · supervision', 600, CURRENT_DATE - 300, CURRENT_DATE - 20, 'ended', 'Nantes', 'hybrid', 'not_renewed', NULL, 'CM-DEMO-018'),
  ('de30a004-0000-4000-8000-000000000019', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000015', 'de30a001-0000-4000-8000-000000000008', 'Application React Native', 640, CURRENT_DATE - 260, CURRENT_DATE - 35, 'ended', 'Paris', 'remote', 'not_renewed', NULL, 'CM-DEMO-019'),
  ('de30a004-0000-4000-8000-000000000020', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000017', 'de30a001-0000-4000-8000-000000000006', 'Automatisation des tests', 520, CURRENT_DATE - 200, CURRENT_DATE - 10, 'ended', 'Bordeaux', 'hybrid', 'not_renewed', NULL, 'CM-DEMO-020'),
  ('de30a004-0000-4000-8000-000000000021', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000021', 'de30a001-0000-4000-8000-000000000002', 'UX · refonte du parcours d’achat', 650, CURRENT_DATE - 180, CURRENT_DATE - 60, 'ended', 'Lyon', 'remote', 'not_renewed', NULL, 'CM-DEMO-021'),
  ('de30a004-0000-4000-8000-000000000022', '0000de30-0000-4000-8000-000000000000', 'de30a003-0000-4000-8000-000000000020', 'de30a001-0000-4000-8000-000000000007', 'Développement Python', 470, CURRENT_DATE - 150, CURRENT_DATE - 45, 'ended', 'Marseille', 'onsite', 'not_renewed', NULL, 'CM-DEMO-022');

INSERT INTO mission_financials (mission_id, organization_id, daily_cost_eur, other_costs_eur) VALUES
  ('de30a004-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 420, 0),
  ('de30a004-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 520, 0),
  ('de30a004-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 450, 0),
  ('de30a004-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 500, 0),
  ('de30a004-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 360, 0),
  ('de30a004-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 600, 0),
  ('de30a004-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 380, 0),
  ('de30a004-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 820, 0),
  ('de30a004-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 520, 0),
  ('de30a004-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 590, 0),
  ('de30a004-0000-4000-8000-000000000011', '0000de30-0000-4000-8000-000000000000', 430, 0),
  ('de30a004-0000-4000-8000-000000000012', '0000de30-0000-4000-8000-000000000000', 390, 0),
  ('de30a004-0000-4000-8000-000000000013', '0000de30-0000-4000-8000-000000000000', 490, 0),
  ('de30a004-0000-4000-8000-000000000014', '0000de30-0000-4000-8000-000000000000', 760, 0),
  ('de30a004-0000-4000-8000-000000000015', '0000de30-0000-4000-8000-000000000000', 400, 0),
  ('de30a004-0000-4000-8000-000000000016', '0000de30-0000-4000-8000-000000000000', 470, 0),
  ('de30a004-0000-4000-8000-000000000017', '0000de30-0000-4000-8000-000000000000', 420, 0),
  ('de30a004-0000-4000-8000-000000000018', '0000de30-0000-4000-8000-000000000000', 400, 0),
  ('de30a004-0000-4000-8000-000000000019', '0000de30-0000-4000-8000-000000000000', 540, 0),
  ('de30a004-0000-4000-8000-000000000020', '0000de30-0000-4000-8000-000000000000', 350, 0),
  ('de30a004-0000-4000-8000-000000000021', '0000de30-0000-4000-8000-000000000000', 550, 0),
  ('de30a004-0000-4000-8000-000000000022', '0000de30-0000-4000-8000-000000000000', 310, 0);

-- Pipeline commercial
INSERT INTO opportunities (id, organization_id, company_id, contact_id, title, status, probability, expected_revenue, daily_rate_eur, duration_months, expected_close, next_follow_up, next_action, last_interaction, required_skills, start_date, location, remote_policy, description, lost_reason, priority, created_at) VALUES
  ('de30a005-0000-4000-8000-000000000001', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000004', 'de30a002-0000-4000-8000-000000000005', 'Data engineer senior · risque de marché', 'discussion', 25, 129600, 720, 9, CURRENT_DATE + 23, CURRENT_DATE - 2, 'Relancer la DSI sur l’arbitrage budgétaire', now() - interval '18 days', '["Spark","Kafka","Scala","SQL"]'::jsonb, CURRENT_DATE + 30, 'Paris', 'hybrid', 'Renfort de l’équipe data risque : traitements Spark, flux Kafka, 2 jours de télétravail.', NULL, 'medium', now() - interval '21 days'),
  ('de30a005-0000-4000-8000-000000000002', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000001', 'de30a002-0000-4000-8000-000000000001', 'Product owner · assurance vie', 'cv_sent', 55, 82800, 690, 6, CURRENT_DATE + 14, CURRENT_DATE + 2, 'Débrief des entretiens avec Claire Vidal', now() - interval '27 days', '["Scrum","User stories","Assurance"]'::jsonb, CURRENT_DATE + 21, 'Paris', 'hybrid', 'Product owner pour le nouveau parcours de souscription assurance vie.', NULL, 'medium', now() - interval '30 days'),
  ('de30a005-0000-4000-8000-000000000003', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000002', 'de30a002-0000-4000-8000-000000000003', '2 développeurs React · marketplace', 'client_interview', 40, 192000, 600, 8, CURRENT_DATE + 28, CURRENT_DATE + 1, 'Préparer les entretiens techniques', now() - interval '15 days', '["React","TypeScript","Next.js"]'::jsonb, CURRENT_DATE + 35, 'Lyon', 'hybrid', 'Deux développeurs React pour lancer la marketplace partenaires.', NULL, 'high', now() - interval '18 days'),
  ('de30a005-0000-4000-8000-000000000004', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000005', 'de30a002-0000-4000-8000-000000000007', 'SRE · plateforme temps réel', 'negotiation', 75, 175200, 730, 12, CURRENT_DATE + 18, CURRENT_DATE + 3, 'Envoyer la proposition révisée (TJM 730 €)', now() - interval '37 days', '["Kubernetes","Prometheus","GCP"]'::jsonb, CURRENT_DATE + 25, 'Lille', 'hybrid', 'Fiabilité et observabilité de la plateforme de suivi des véhicules.', NULL, 'high', now() - interval '40 days'),
  ('de30a005-0000-4000-8000-000000000005', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000006', 'de30a002-0000-4000-8000-000000000008', 'Chef de projet · dossier patient informatisé', 'new', 10, 150000, 750, 10, CURRENT_DATE + 53, CURRENT_DATE + 5, 'Qualifier le périmètre avec Hélène Caron', now() - interval '1 days', '["Pilotage de projet","Santé"]'::jsonb, CURRENT_DATE + 60, 'Bordeaux', 'onsite', 'Pilotage du déploiement du DPI sur trois établissements.', NULL, 'medium', now() - interval '4 days'),
  ('de30a005-0000-4000-8000-000000000006', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000003', 'de30a002-0000-4000-8000-000000000004', 'Architecte data · plateforme compteurs', 'contacted', 10, 211200, 880, 12, CURRENT_DATE + 38, CURRENT_DATE - 6, 'Rappeler Sophie Leroy', now() - interval '23 days', '["Snowflake","Architecture","dbt"]'::jsonb, CURRENT_DATE + 45, 'Nantes', 'remote', 'Conception de la plateforme de données des compteurs communicants.', NULL, 'high', now() - interval '26 days'),
  ('de30a005-0000-4000-8000-000000000007', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000007', 'de30a002-0000-4000-8000-000000000009', 'Développeur .NET confirmé', 'cv_sent', 55, 70800, 590, 6, CURRENT_DATE + 7, CURRENT_DATE, 'Relancer Antoine Mercier sur les CV envoyés', now() - interval '12 days', '["C#",".NET","Azure"]'::jsonb, CURRENT_DATE + 14, 'Marseille', 'remote', 'Renfort de l’équipe WMS sur les évolutions entrepôts.', NULL, 'medium', now() - interval '15 days'),
  ('de30a005-0000-4000-8000-000000000008', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000008', 'de30a002-0000-4000-8000-000000000010', 'Data analyst · audiences', 'discussion', 25, 67200, 560, 6, CURRENT_DATE + 33, NULL, NULL, now() - interval '30 days', '["SQL","Power BI","Python"]'::jsonb, CURRENT_DATE + 40, 'Paris', 'hybrid', 'Analyse des audiences numériques et tableaux de bord éditoriaux.', NULL, 'medium', now() - interval '33 days'),
  ('de30a005-0000-4000-8000-000000000009', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000009', 'de30a002-0000-4000-8000-000000000011', 'Audit de sécurité · usines connectées', 'new', 10, 49200, 820, 3, CURRENT_DATE + 43, CURRENT_DATE + 7, 'Envoyer une proposition d’audit', now() - interval '1 days', '["ISO 27001","Gestion des vulnérabilités"]'::jsonb, CURRENT_DATE + 50, 'Grenoble', 'onsite', 'Audit de la sécurité des systèmes industriels connectés.', NULL, 'medium', now() - interval '2 days'),
  ('de30a005-0000-4000-8000-000000000010', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000010', 'de30a002-0000-4000-8000-000000000012', 'Squad data · 3 profils', 'contacted', 15, 504000, 700, 12, CURRENT_DATE + 68, CURRENT_DATE + 4, 'Organiser un atelier de cadrage', now() - interval '6 days', '["Spark","Airflow","GCP","dbt"]'::jsonb, CURRENT_DATE + 75, 'Rennes', 'hybrid', 'Constitution d’une squad data pour la refonte du référentiel clients.', NULL, 'high', now() - interval '9 days'),
  ('de30a005-0000-4000-8000-000000000011', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000004', 'de30a002-0000-4000-8000-000000000005', 'Scrum master · transformation agile', 'client_interview', 40, 118800, 660, 9, CURRENT_DATE + 23, CURRENT_DATE + 2, 'Confirmer la date d’entretien', now() - interval '9 days', '["Scrum","Coaching agile"]'::jsonb, CURRENT_DATE + 30, 'Paris', 'hybrid', 'Accompagnement de quatre équipes dans la transformation agile.', NULL, 'medium', now() - interval '12 days'),
  ('de30a005-0000-4000-8000-000000000012', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000001', 'de30a002-0000-4000-8000-000000000001', 'QA automatisation · contrats', 'negotiation', 70, 64800, 540, 6, CURRENT_DATE + 3, CURRENT_DATE + 1, 'Valider la date de démarrage', now() - interval '21 days', '["Cypress","Tests automatisés"]'::jsonb, CURRENT_DATE + 10, 'Paris', 'hybrid', 'Automatisation des tests de non-régression de la plateforme contrats.', NULL, 'medium', now() - interval '24 days'),
  ('de30a005-0000-4000-8000-000000000013', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000005', 'de30a002-0000-4000-8000-000000000007', 'DevOps · chaîne CI/CD', 'won', 100, 84000, 700, 6, CURRENT_DATE - 100, NULL, NULL, now() - interval '127 days', '["GitLab CI","Kubernetes"]'::jsonb, CURRENT_DATE - 100, 'Lille', 'hybrid', 'Industrialisation des déploiements.', NULL, 'medium', now() - interval '130 days'),
  ('de30a005-0000-4000-8000-000000000014', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000004', 'de30a002-0000-4000-8000-000000000005', 'Sécurité · gestion des identités', 'won', 100, 152000, 760, 10, CURRENT_DATE - 65, NULL, NULL, now() - interval '92 days', '["IAM","Azure AD"]'::jsonb, CURRENT_DATE - 60, 'Paris', 'hybrid', 'Refonte des habilitations.', NULL, 'medium', now() - interval '95 days'),
  ('de30a005-0000-4000-8000-000000000015', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000007', 'de30a002-0000-4000-8000-000000000009', 'SRE · observabilité', 'won', 100, 86400, 720, 6, CURRENT_DATE - 15, NULL, NULL, now() - interval '42 days', '["Prometheus","Grafana"]'::jsonb, CURRENT_DATE + 18, 'Marseille', 'hybrid', 'Mise en place de l’observabilité des entrepôts.', NULL, 'medium', now() - interval '45 days'),
  ('de30a005-0000-4000-8000-000000000016', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000002', 'de30a002-0000-4000-8000-000000000003', 'Data engineer · prévisions de ventes', 'lost', 0, 76800, 640, 6, CURRENT_DATE - 40, NULL, NULL, now() - interval '67 days', '["Python","Spark"]'::jsonb, CURRENT_DATE - 20, 'Lyon', 'hybrid', 'Modèles de prévision des ventes magasins.', 'price', 'medium', now() - interval '70 days'),
  ('de30a005-0000-4000-8000-000000000017', '0000de30-0000-4000-8000-000000000000', 'de30a001-0000-4000-8000-000000000006', 'de30a002-0000-4000-8000-000000000008', 'Développeur Java · interopérabilité', 'lost', 0, 96000, 600, 8, CURRENT_DATE - 30, NULL, NULL, now() - interval '57 days', '["Java","HL7"]'::jsonb, CURRENT_DATE - 15, 'Bordeaux', 'onsite', 'Flux d’interopérabilité entre logiciels de soins.', 'competitor', 'medium', now() - interval '60 days');

UPDATE missions SET opportunity_id = 'de30a005-0000-4000-8000-000000000013' WHERE id = 'de30a004-0000-4000-8000-000000000010';
UPDATE missions SET opportunity_id = 'de30a005-0000-4000-8000-000000000014' WHERE id = 'de30a004-0000-4000-8000-000000000013';
UPDATE missions SET opportunity_id = 'de30a005-0000-4000-8000-000000000015' WHERE id = 'de30a004-0000-4000-8000-000000000016';

INSERT INTO opportunity_consultants (opportunity_id, consultant_id, pitch, sent_at, client_feedback) VALUES
  ('de30a005-0000-4000-8000-000000000003', 'de30a003-0000-4000-8000-000000000015', NULL, now() - interval '6 days', NULL),
  ('de30a005-0000-4000-8000-000000000012', 'de30a003-0000-4000-8000-000000000017', NULL, now() - interval '8 days', 'Profil retenu pour un second entretien.'),
  ('de30a005-0000-4000-8000-000000000004', 'de30a003-0000-4000-8000-000000000014', NULL, now() - interval '10 days', NULL),
  ('de30a005-0000-4000-8000-000000000001', 'de30a003-0000-4000-8000-000000000010', NULL, NULL, NULL),
  ('de30a005-0000-4000-8000-000000000007', 'de30a003-0000-4000-8000-000000000020', NULL, now() - interval '3 days', NULL);

-- CRA : plan (mission, décalage en mois, statut visé). Insérés « soumis » ou
-- « brouillon », jours ajustés, puis validés : la préfacture se calcule alors
-- sur les jours réels (trigger auto_invoice_from_validated_cra).
CREATE TEMP TABLE demo_cra_plan (mission_id uuid, k int, target text) ON COMMIT DROP;
INSERT INTO demo_cra_plan (mission_id, k, target) VALUES
  ('de30a004-0000-4000-8000-000000000001', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000001', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000001', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000001', 1, 'rejected'),
  ('de30a004-0000-4000-8000-000000000002', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000002', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000002', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000002', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000003', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000003', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000003', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000003', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000004', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000004', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000004', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000004', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000005', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000005', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000005', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000005', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000006', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000006', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000006', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000006', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000006', 0, 'draft'),
  ('de30a004-0000-4000-8000-000000000007', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000007', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000007', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000007', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000008', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000008', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000008', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000008', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000009', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000009', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000009', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000009', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000009', 0, 'draft'),
  ('de30a004-0000-4000-8000-000000000010', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000010', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000010', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000010', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000011', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000011', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000011', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000012', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000012', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000012', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000012', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000013', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000013', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000013', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000013', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000014', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000014', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000014', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000014', 1, 'submitted'),
  ('de30a004-0000-4000-8000-000000000015', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000015', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000015', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000017', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000017', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000017', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000017', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000018', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000018', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000018', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000018', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000019', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000019', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000019', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000019', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000020', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000020', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000020', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000020', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000021', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000021', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000021', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000021', 1, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000022', 4, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000022', 3, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000022', 2, 'client_validated'),
  ('de30a004-0000-4000-8000-000000000022', 1, 'client_validated');

INSERT INTO timesheets (organization_id, mission_id, consultant_id, period_month, period_year, status, submitted_at)
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
 WHERE d.timesheet_id = t.id AND t.mission_id = m.id AND t.organization_id = '0000de30-0000-4000-8000-000000000000'
   AND (d.day_date < m.start_date OR (m.end_date IS NOT NULL AND d.day_date > m.end_date));
-- Jours fériés à date fixe : marqués fériés.
UPDATE timesheet_days d SET kind = 'holiday', duration = 0
  FROM timesheets t
 WHERE d.timesheet_id = t.id AND t.organization_id = '0000de30-0000-4000-8000-000000000000'
   AND to_char(d.day_date, 'MM-DD') IN ('01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25');
-- Télétravail le mercredi sur les missions hybrides, toute la semaine en télétravail complet.
UPDATE timesheet_days d SET is_remote = true
  FROM timesheets t, missions m
 WHERE d.timesheet_id = t.id AND t.mission_id = m.id AND t.organization_id = '0000de30-0000-4000-8000-000000000000' AND d.kind = 'worked'
   AND (m.remote_policy = 'remote' OR (m.remote_policy = 'hybrid' AND EXTRACT(ISODOW FROM d.day_date) = 3));
-- Quelques congés : le deuxième vendredi du mois, pour un consultant sur trois.
UPDATE timesheet_days d SET kind = 'paid_leave', duration = 0, is_remote = false
  FROM timesheets t
 WHERE d.timesheet_id = t.id AND t.organization_id = '0000de30-0000-4000-8000-000000000000' AND d.kind = 'worked'
   AND EXTRACT(ISODOW FROM d.day_date) = 5 AND EXTRACT(DAY FROM d.day_date) BETWEEN 8 AND 14
   AND abs(hashtext(t.consultant_id::text)) % 3 = 0;
-- Brouillons du mois en cours : seuls les jours déjà passés sont saisis.
DELETE FROM timesheet_days d USING timesheets t
 WHERE d.timesheet_id = t.id AND t.organization_id = '0000de30-0000-4000-8000-000000000000' AND t.status = 'draft' AND d.day_date >= CURRENT_DATE;
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
 WHERE t.organization_id = '0000de30-0000-4000-8000-000000000000' AND dp.mission_id = t.mission_id AND dp.target = 'client_validated'
   AND make_date(t.period_year, t.period_month, 1) = (date_trunc('month', CURRENT_DATE) - make_interval(months => dp.k))::date;
UPDATE timesheets t
   SET status = 'rejected',
       rejected_at = make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '3 days 11 hours',
       rejection_reason = 'Il manque la journée du 14 : merci de compléter.'
  FROM demo_cra_plan dp
 WHERE t.organization_id = '0000de30-0000-4000-8000-000000000000' AND dp.mission_id = t.mission_id AND dp.target = 'rejected'
   AND make_date(t.period_year, t.period_month, 1) = (date_trunc('month', CURRENT_DATE) - make_interval(months => dp.k))::date;

-- Préfactures : émises au début du mois suivant, payables à 30 jours ;
-- payées si l'échéance est passée, sauf une en retard chez Varenne Énergie.
UPDATE invoices i
   SET issue_date = (make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '3 days')::date,
       due_date = (make_date(t.period_year, t.period_month, 1) + interval '1 month' + interval '33 days')::date
  FROM timesheets t
 WHERE i.timesheet_id = t.id AND i.organization_id = '0000de30-0000-4000-8000-000000000000';
UPDATE invoices i
   SET status = CASE WHEN i.due_date >= CURRENT_DATE THEN 'sent' ELSE 'paid' END::invoice_status,
       payment_date = CASE WHEN i.due_date >= CURRENT_DATE THEN NULL ELSE i.due_date - 2 END,
       export_status = CASE WHEN i.due_date >= CURRENT_DATE THEN 'not_exported' ELSE 'exported' END,
       exported_at = CASE WHEN i.due_date >= CURRENT_DATE THEN NULL ELSE i.issue_date + 1 END,
       notes = 'Préfacture issue du CRA validé (' || i.period_label || ').'
 WHERE i.organization_id = '0000de30-0000-4000-8000-000000000000';
UPDATE invoices i
   SET status = 'overdue', payment_date = NULL
 WHERE i.id = (
   SELECT i2.id FROM invoices i2 JOIN missions m ON m.id = i2.mission_id
    WHERE i2.organization_id = '0000de30-0000-4000-8000-000000000000' AND m.company_id = 'de30a001-0000-4000-8000-000000000003' AND i2.due_date < CURRENT_DATE
    ORDER BY i2.due_date DESC LIMIT 1);

-- Relances et notes internes
INSERT INTO tasks (organization_id, title, description, status, priority, due_date, entity_type, entity_id, source, dedupe_key) VALUES
  ('0000de30-0000-4000-8000-000000000000', 'Débriefer les entretiens PO assurance vie', 'Appeler Claire Vidal après les entretiens.', 'todo', 'high', CURRENT_DATE + 2, 'opportunity', 'de30a005-0000-4000-8000-000000000002', 'manual', 'follow-up:de30a005-0000-4000-8000-000000000002'),
  ('0000de30-0000-4000-8000-000000000000', 'Statuer sur le renouvellement Varenne Énergie', 'La mission de Hugo Lambert se termine dans 12 jours.', 'todo', 'high', CURRENT_DATE + 3, 'mission', 'de30a004-0000-4000-8000-000000000004', 'manual', NULL),
  ('0000de30-0000-4000-8000-000000000000', 'Relancer la DSI d’Opaline sur le budget data', NULL, 'todo', 'medium', CURRENT_DATE - 2, 'opportunity', 'de30a005-0000-4000-8000-000000000001', 'manual', 'follow-up:de30a005-0000-4000-8000-000000000001'),
  ('0000de30-0000-4000-8000-000000000000', 'Positionner Nora Faure sur la marketplace Helio', 'Entretiens prévus la semaine prochaine.', 'todo', 'medium', CURRENT_DATE + 1, 'consultant', 'de30a003-0000-4000-8000-000000000015', 'manual', NULL),
  ('0000de30-0000-4000-8000-000000000000', 'Point de mi-mission avec Opaline Banque', NULL, 'todo', 'low', CURRENT_DATE + 6, 'client', 'de30a001-0000-4000-8000-000000000004', 'manual', NULL),
  ('0000de30-0000-4000-8000-000000000000', 'Envoyer la proposition SRE révisée à Kestrel', NULL, 'done', 'medium', CURRENT_DATE - 1, 'opportunity', 'de30a005-0000-4000-8000-000000000004', 'manual', NULL);
INSERT INTO notes (organization_id, entity_type, entity_id, body, created_at) VALUES
  ('0000de30-0000-4000-8000-000000000000', 'opportunity', 'de30a005-0000-4000-8000-000000000001', 'Budget validé côté métier, arbitrage de la DSI attendu en fin de mois. Interlocuteur achats : Nadia Benali.', now() - interval '5 days'),
  ('0000de30-0000-4000-8000-000000000000', 'company', 'de30a001-0000-4000-8000-000000000001', 'Compte stratégique : trois consultants en mission, référencement renouvelé pour deux ans.', now() - interval '18 days'),
  ('0000de30-0000-4000-8000-000000000000', 'opportunity', 'de30a005-0000-4000-8000-000000000004', 'Le client accepte 730 € si le démarrage a lieu sous trois semaines.', now() - interval '2 days');

COMMIT;
