/**
 * Base de connaissances d'ÉQUIVALENCES TECHNIQUES pour le matching IT.
 *
 * Complète `normalize.ts` (synonymes SYMÉTRIQUES : K8s = Kubernetes) avec une
 * relation ASYMÉTRIQUE « parent → preuves » : une compétence-parapluie demandée
 * par l'offre (ex. « Microsoft ») peut être satisfaite — totalement ou
 * partiellement — par des technologies enfants présentes dans le CV
 * (Active Directory, Entra ID, Office 365, Windows…).
 *
 * Deux forces :
 *   - `full`    : preuve FORTE → la compétence demandée est considérée acquise
 *                 par équivalence (ex. Ubuntu prouve « Linux »).
 *   - `partial` : INDICE partiel → à renforcer / confirmer, pas un match complet
 *                 (ex. Windows 10/11 est un indice partiel de « Windows Server »).
 *
 * RÈGLE D'OR : on ne mappe QUE des équivalences techniquement défendables.
 * Ce qui n'est pas ici reste « absent » (ex. MongoDB n'est PAS une preuve de
 * SQL Server → SQL Server absent si seul MongoDB est présent).
 *
 * Les clés sont normalisées via `normalizeSkill` au chargement pour matcher
 * exactement les canoniques produits côté offre ET côté consultant.
 */

import { normalizeSkill } from './normalize';

type RawEquiv = {
  /** Compétence-parapluie telle que demandée dans une offre. */
  parent: string;
  /** Enfants qui PROUVENT la compétence (équivalence forte). */
  full: string[];
  /** Enfants qui en sont un INDICE partiel (à renforcer / confirmer). */
  partial?: string[];
};

// =========================================================================
// Base de connaissances — domaines IT courants d'une ESN.
// (parent, [preuves fortes], [indices partiels])
// =========================================================================
const RAW: RawEquiv[] = [
  // ── Écosystème Microsoft ────────────────────────────────────────────
  {
    parent: 'Microsoft',
    full: [
      'Active Directory', 'ADDS', 'AD DS', 'GPO', 'Microsoft Entra ID', 'Entra ID',
      'Azure AD', 'Office 365', 'O365', 'Microsoft 365', 'M365', 'Exchange',
      'Exchange Online', 'SharePoint', 'Teams', 'Intune', 'SCCM', 'MDT', 'Autopilot',
      'Windows Server', 'Windows', 'PowerShell', 'Azure', 'Hyper-V', 'WSUS',
    ],
    partial: ['Windows 10', 'Windows 11', 'Windows 10/11', 'Microsoft 365 Apps'],
  },
  {
    parent: 'Windows Server',
    full: ['Windows Server', 'Active Directory', 'ADDS', 'AD DS', 'GPO', 'WSUS', 'DFS', 'IIS'],
    // Windows 10/11 seul = indice d'environnement Microsoft, PAS un serveur.
    partial: ['Windows', 'Windows 10', 'Windows 11', 'Windows 10/11'],
  },
  {
    parent: 'Active Directory',
    full: ['ADDS', 'AD DS', 'Active Directory', 'GPO', 'Microsoft Entra ID', 'Azure AD'],
    partial: ['LDAP', 'Kerberos'],
  },
  {
    parent: 'Microsoft Entra ID',
    full: ['Azure AD', 'Entra ID', 'Microsoft Entra ID', 'AAD'],
    partial: ['Active Directory', 'SSO', 'Conditional Access'],
  },
  {
    parent: 'Office 365',
    full: ['Microsoft 365', 'M365', 'O365', 'Exchange Online', 'SharePoint Online', 'Teams'],
  },

  // ── Linux / Unix ────────────────────────────────────────────────────
  {
    parent: 'Linux',
    full: [
      'Ubuntu', 'Debian', 'CentOS', 'Red Hat', 'RHEL', 'Fedora', 'SUSE', 'openSUSE',
      'Rocky Linux', 'AlmaLinux', 'Kali', 'Kali Linux', 'Arch Linux', 'Unix',
    ],
    partial: ['Bash', 'Shell', 'Shell scripting'],
  },
  { parent: 'Red Hat', full: ['RHEL', 'CentOS', 'Rocky Linux', 'AlmaLinux', 'Fedora'] },
  { parent: 'Unix', full: ['Linux', 'AIX', 'Solaris', 'HP-UX', 'BSD', 'FreeBSD'] },

  // ── Réseaux ─────────────────────────────────────────────────────────
  {
    parent: 'Réseaux',
    full: ['Routage', 'Routing', 'Switching', 'Cisco', 'TCP/IP', 'BGP', 'OSPF', 'VLAN', 'MPLS'],
    partial: [
      'Fortinet', 'Firewall', 'Pare-feu', 'VPN', 'LAN', 'WAN', 'LAN/WAN', 'DNS', 'DHCP',
      'Load Balancing', 'Wi-Fi', 'WiFi', 'Ubiquiti', 'UniFi', 'pfSense', 'Supervision réseau',
      'Palo Alto', 'Checkpoint', 'Stormshield',
    ],
  },
  { parent: 'Network', full: ['Routing', 'Switching', 'Cisco', 'TCP/IP', 'BGP', 'OSPF', 'VLAN'], partial: ['Firewall', 'VPN', 'LAN', 'WAN', 'DNS', 'DHCP', 'Fortinet'] },
  { parent: 'Cisco', full: ['CCNA', 'CCNP', 'IOS', 'Catalyst', 'Nexus'], partial: ['Routing', 'Switching'] },
  { parent: 'Sécurité réseau', full: ['Fortinet', 'Palo Alto', 'Checkpoint', 'Stormshield', 'Firewall', 'Pare-feu', 'IDS', 'IPS'], partial: ['VPN', 'DMZ'] },

  // ── Virtualisation ──────────────────────────────────────────────────
  {
    parent: 'Virtualisation',
    full: ['VMware', 'vSphere', 'ESXi', 'Hyper-V', 'Proxmox', 'KVM', 'VirtualBox', 'Xen', 'Citrix', 'Nutanix'],
  },
  { parent: 'VMware', full: ['vSphere', 'ESXi', 'vCenter', 'NSX', 'vSAN'] },

  // ── Cloud ───────────────────────────────────────────────────────────
  { parent: 'Cloud', full: ['AWS', 'Azure', 'GCP', 'Google Cloud', 'OVH Cloud', 'Scaleway'], partial: ['Office 365', 'Microsoft 365'] },
  { parent: 'AWS', full: ['EC2', 'S3', 'Lambda', 'RDS', 'EKS', 'CloudFormation', 'IAM'], partial: ['Cloud', 'Terraform'] },
  { parent: 'Azure', full: ['Azure DevOps', 'AKS', 'Azure Functions', 'Azure AD', 'Microsoft Entra ID', 'Blob Storage'], partial: ['Cloud', 'Office 365'] },

  // ── Conteneurs / orchestration ──────────────────────────────────────
  { parent: 'Conteneurisation', full: ['Docker', 'Kubernetes', 'K8s', 'OpenShift', 'Podman', 'containerd', 'Docker Compose'] },
  { parent: 'Container', full: ['Docker', 'Kubernetes', 'K8s', 'OpenShift', 'Podman'] },
  { parent: 'Kubernetes', full: ['K8s', 'OpenShift', 'EKS', 'AKS', 'GKE', 'Helm'], partial: ['Docker'] },

  // ── CI/CD & IaC / DevOps ────────────────────────────────────────────
  { parent: 'CI/CD', full: ['Jenkins', 'GitLab CI', 'GitHub Actions', 'Azure DevOps', 'CircleCI', 'TeamCity', 'ArgoCD', 'Travis CI'] },
  { parent: 'Infrastructure as Code', full: ['Terraform', 'Ansible', 'Puppet', 'Chef', 'CloudFormation', 'Pulumi'] },
  { parent: 'IaC', full: ['Terraform', 'Ansible', 'Puppet', 'Chef', 'CloudFormation', 'Pulumi'] },
  { parent: 'DevOps', full: ['Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'Terraform', 'Ansible', 'CI/CD'], partial: ['Git', 'Linux', 'Cloud'] },
  { parent: 'Automatisation', full: ['Ansible', 'Terraform', 'PowerShell', 'Python', 'Bash', 'Puppet', 'Chef'] },

  // ── Bases de données ────────────────────────────────────────────────
  { parent: 'SQL', full: ['SQL Server', 'MySQL', 'PostgreSQL', 'Oracle', 'MariaDB', 'T-SQL', 'PL/SQL', 'SQLite', 'DB2'] },
  { parent: 'Base de données', full: ['SQL Server', 'MySQL', 'PostgreSQL', 'Oracle', 'MongoDB', 'MariaDB', 'Redis', 'Cassandra', 'SQLite'] },
  { parent: 'SGBD', full: ['SQL Server', 'MySQL', 'PostgreSQL', 'Oracle', 'MongoDB', 'MariaDB'] },
  { parent: 'NoSQL', full: ['MongoDB', 'Cassandra', 'Redis', 'DynamoDB', 'CouchDB', 'Elasticsearch'] },
  // NB : SQL Server, PostgreSQL, MongoDB, etc. n'ont PAS d'équivalence entre eux
  //      (ce sont des produits distincts) → absence si non présents.

  // ── Supervision / monitoring ────────────────────────────────────────
  { parent: 'Supervision', full: ['Zabbix', 'Nagios', 'Grafana', 'Prometheus', 'Datadog', 'Centreon', 'PRTG', 'Splunk'], partial: ['ELK', 'Rsyslog'] },
  { parent: 'Monitoring', full: ['Zabbix', 'Nagios', 'Grafana', 'Prometheus', 'Datadog', 'Centreon', 'PRTG', 'Splunk'], partial: ['ELK'] },

  // ── ITSM / support ──────────────────────────────────────────────────
  { parent: 'ITSM', full: ['ServiceNow', 'GLPI', 'Jira Service Management', 'Zendesk', 'Ivanti', 'BMC Remedy', 'EasyVista'] },
  { parent: 'Ticketing', full: ['ServiceNow', 'GLPI', 'Jira', 'Zendesk', 'Ivanti', 'OTRS'] },
  { parent: 'Support N1/N2', full: ['ServiceNow', 'GLPI', 'Support technique', 'Helpdesk'], partial: ['Active Directory', 'Windows'] },

  // ── Scripting / langages ────────────────────────────────────────────
  { parent: 'Scripting', full: ['PowerShell', 'Bash', 'Python', 'Shell', 'Perl', 'VBScript'] },

  // ── Dev / frameworks (couvertures courantes) ────────────────────────
  { parent: 'JavaScript', full: ['TypeScript', 'Node.js', 'React', 'Vue', 'Angular', 'Next.js'], partial: ['ES6'] },
  { parent: 'Frontend', full: ['React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'HTML', 'CSS'], partial: ['JavaScript', 'TypeScript'] },
  { parent: '.NET', full: ['C#', 'ASP.NET', '.NET Core', '.NET 6', '.NET 8', 'Entity Framework', 'Blazor'] },
  { parent: 'Java', full: ['Spring', 'Spring Boot', 'Hibernate', 'JEE', 'J2EE', 'Maven', 'Quarkus'] },

  // ── Tests / QA ──────────────────────────────────────────────────────
  { parent: 'Tests automatisés', full: ['Playwright', 'Cypress', 'Selenium', 'Jest', 'Vitest', 'JUnit', 'TestNG', 'Robot Framework'] },
  { parent: 'QA', full: ['Playwright', 'Cypress', 'Selenium', 'JUnit', 'Postman', 'Jira', 'TestRail'], partial: ['CI/CD'] },

  // ── Cybersécurité ───────────────────────────────────────────────────
  {
    parent: 'Cybersécurité',
    full: ['SOC', 'SIEM', 'EDR', 'XDR', 'Pentest', "Test d'intrusion", 'IAM', 'DLP', 'WAF', 'ISO 27001', 'SOAR', 'PKI', 'Vulnerability Management'],
    partial: ['Firewall', 'Pare-feu', 'Antivirus', 'Sécurité réseau', 'RGPD'],
  },
  { parent: 'Sécurité', full: ['SOC', 'SIEM', 'EDR', 'Pentest', 'IAM', 'Firewall', 'WAF', 'ISO 27001'], partial: ['Antivirus', 'VPN', 'RGPD'] },
  { parent: 'SIEM', full: ['Splunk', 'QRadar', 'ArcSight', 'Microsoft Sentinel', 'Sentinel', 'Elastic Security', 'LogRhythm', 'Wazuh'] },
  { parent: 'SOC', full: ['SIEM', 'EDR', 'SOAR', 'Threat Hunting', 'Incident Response', 'Splunk', 'Microsoft Sentinel'] },
  { parent: 'Pentest', full: ['Kali', 'Metasploit', 'Burp Suite', 'Nmap', 'Nessus', 'OWASP', 'Cobalt Strike', 'BloodHound'] },
  { parent: "Test d'intrusion", full: ['Kali', 'Metasploit', 'Burp Suite', 'Nmap', 'Nessus', 'OWASP'] },
  { parent: 'IAM', full: ['Active Directory', 'Microsoft Entra ID', 'Okta', 'SailPoint', 'CyberArk', 'Keycloak', 'Ping Identity', 'ForgeRock'], partial: ['SSO', 'LDAP'] },
  { parent: 'EDR', full: ['CrowdStrike', 'SentinelOne', 'Microsoft Defender', 'Cortex XDR', 'Carbon Black', 'Cybereason'] },
  { parent: 'GRC', full: ['ISO 27001', 'NIST', 'RGPD', 'Risk Management', 'Compliance', 'Audit sécurité'] },

  // ── Data Engineering / Big Data / BI ────────────────────────────────
  {
    parent: 'Data Engineering',
    full: ['Spark', 'Apache Spark', 'Hadoop', 'Kafka', 'Airflow', 'dbt', 'Snowflake', 'Databricks', 'ETL', 'PySpark'],
    partial: ['SQL', 'Python', 'Scala'],
  },
  { parent: 'Big Data', full: ['Hadoop', 'Spark', 'Hive', 'HBase', 'Kafka', 'Databricks', 'Cloudera', 'MapReduce'], partial: ['Scala', 'Python'] },
  { parent: 'BI', full: ['Power BI', 'Tableau', 'Qlik', 'QlikView', 'Qlik Sense', 'Looker', 'SSRS', 'SSAS', 'SSIS', 'Cognos', 'MicroStrategy'], partial: ['Excel', 'SQL'] },
  { parent: 'Business Intelligence', full: ['Power BI', 'Tableau', 'Qlik', 'Looker', 'SSRS', 'SSAS', 'SSIS', 'Cognos'], partial: ['Excel', 'SQL'] },
  { parent: 'ETL', full: ['Talend', 'Informatica', 'SSIS', 'dbt', 'Airflow', 'DataStage', 'Pentaho', 'Matillion'] },
  { parent: 'Data Warehouse', full: ['Snowflake', 'BigQuery', 'Redshift', 'Synapse', 'Azure Synapse', 'Teradata', 'Databricks'] },
  { parent: 'Dataviz', full: ['Power BI', 'Tableau', 'Qlik', 'Looker', 'Grafana', 'D3.js'] },

  // ── Data Science / ML / IA ──────────────────────────────────────────
  { parent: 'Machine Learning', full: ['TensorFlow', 'PyTorch', 'scikit-learn', 'Keras', 'XGBoost', 'MLflow'], partial: ['Python', 'Data Science', 'R'] },
  { parent: 'Data Science', full: ['Python', 'R', 'Pandas', 'NumPy', 'scikit-learn', 'Jupyter', 'Machine Learning'], partial: ['SQL', 'Spark'] },
  { parent: 'MLOps', full: ['MLflow', 'Kubeflow', 'SageMaker', 'Vertex AI', 'BentoML'], partial: ['Docker', 'Kubernetes', 'CI/CD'] },
  { parent: 'Intelligence artificielle', full: ['Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'TensorFlow', 'PyTorch', 'Computer Vision'] },
  { parent: 'IA', full: ['Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'TensorFlow', 'PyTorch'] },

  // ── Langages / backend ──────────────────────────────────────────────
  { parent: 'Python', full: ['Django', 'Flask', 'FastAPI', 'Pandas', 'NumPy', 'PySpark'] },
  { parent: 'Go', full: ['Golang'] },
  { parent: 'Golang', full: ['Go'] },
  { parent: 'PHP', full: ['Symfony', 'Laravel', 'WordPress', 'Drupal', 'Magento'] },
  { parent: 'Ruby', full: ['Ruby on Rails', 'Rails'] },
  { parent: 'Node.js', full: ['Express', 'NestJS', 'Express.js'], partial: ['JavaScript', 'TypeScript'] },
  { parent: 'Backend', full: ['Java', 'Python', 'Node.js', 'PHP', 'C#', 'Go', 'Ruby', 'Spring', 'Django', '.NET'], partial: ['SQL', 'API'] },

  // ── Mobile ──────────────────────────────────────────────────────────
  { parent: 'Mobile', full: ['iOS', 'Android', 'Swift', 'Kotlin', 'React Native', 'Flutter', 'Objective-C', 'SwiftUI'] },
  { parent: 'iOS', full: ['Swift', 'Objective-C', 'SwiftUI', 'Xcode'] },
  { parent: 'Android', full: ['Kotlin', 'Android SDK', 'Jetpack Compose'], partial: ['Java'] },

  // ── API / Intégration / Middleware / Messaging ──────────────────────
  { parent: 'API', full: ['REST', 'RESTful', 'REST API', 'GraphQL', 'SOAP', 'OpenAPI', 'Swagger', 'gRPC'] },
  { parent: 'Intégration', full: ['MuleSoft', 'Talend', 'Apache Camel', 'ESB', 'Kafka', 'RabbitMQ', 'Boomi', 'Dell Boomi'] },
  { parent: 'Middleware', full: ['WebLogic', 'JBoss', 'WildFly', 'Tomcat', 'IIS', 'WebSphere', 'Apache'] },
  { parent: 'Messaging', full: ['Kafka', 'RabbitMQ', 'ActiveMQ', 'IBM MQ', 'Azure Service Bus', 'SQS', 'Pub/Sub'] },

  // ── ERP / CRM / SAP ─────────────────────────────────────────────────
  { parent: 'SAP', full: ['SAP HANA', 'ABAP', 'SAP FICO', 'SAP MM', 'SAP SD', 'SAP S/4HANA', 'S/4HANA', 'SAP BW', 'SAP Fiori'] },
  { parent: 'ERP', full: ['SAP', 'Oracle ERP', 'Microsoft Dynamics', 'Dynamics 365', 'Sage', 'Odoo', 'SAP S/4HANA'] },
  { parent: 'CRM', full: ['Salesforce', 'Microsoft Dynamics', 'Dynamics 365', 'HubSpot', 'SugarCRM', 'Pega'] },
  { parent: 'Salesforce', full: ['Apex', 'Visualforce', 'Lightning', 'SOQL', 'Salesforce CRM'] },

  // ── Méthodologies / gestion de projet ───────────────────────────────
  { parent: 'Agile', full: ['Scrum', 'Kanban', 'SAFe', 'XP', 'Extreme Programming'], partial: ['Jira'] },
  { parent: 'Scrum', full: ['Scrum Master', 'Product Owner', 'Sprint'], partial: ['Agile', 'Jira'] },
  { parent: 'ITIL', full: ['ITSM', 'Change Management', 'Incident Management', 'Problem Management', 'CMDB'] },
  { parent: 'Gestion de projet', full: ['PMP', 'Prince2', 'MS Project', 'Scrum', 'SAFe', 'Planning', 'PMO'] },

  // ── Version control ─────────────────────────────────────────────────
  { parent: 'Git', full: ['GitHub', 'GitLab', 'Bitbucket', 'GitFlow'] },
  { parent: 'Contrôle de version', full: ['Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Subversion', 'Mercurial', 'TFS'] },

  // ── Stockage / sauvegarde ───────────────────────────────────────────
  { parent: 'Stockage', full: ['SAN', 'NAS', 'NetApp', 'EMC', 'Pure Storage', 'Ceph', 'Dell EMC'], partial: ['RAID', 'iSCSI'] },
  { parent: 'Sauvegarde', full: ['Veeam', 'Commvault', 'NetBackup', 'Rubrik', 'Acronis', 'Networker'] },
  { parent: 'Backup', full: ['Veeam', 'Commvault', 'NetBackup', 'Rubrik', 'Acronis'] },

  // ── RPA / Low-code ──────────────────────────────────────────────────
  { parent: 'RPA', full: ['UiPath', 'Blue Prism', 'Automation Anywhere', 'Power Automate'] },
  { parent: 'Low-code', full: ['Power Platform', 'PowerApps', 'Power Automate', 'OutSystems', 'Mendix', 'Appian'] },
  { parent: 'Power Platform', full: ['PowerApps', 'Power Automate', 'Power BI', 'Power Virtual Agents'] },

  // ── Web / CMS / e-commerce ──────────────────────────────────────────
  { parent: 'CMS', full: ['WordPress', 'Drupal', 'Joomla', 'TYPO3', 'AEM', 'Adobe Experience Manager', 'Contentful'] },
  { parent: 'E-commerce', full: ['Magento', 'PrestaShop', 'Shopify', 'WooCommerce', 'SAP Commerce', 'Hybris', 'Salesforce Commerce'] },

  // ── CSS / frontend ──────────────────────────────────────────────────
  { parent: 'CSS', full: ['Sass', 'SCSS', 'Tailwind', 'Tailwind CSS', 'Bootstrap', 'Less'] },

  // ── Poste de travail / MDM ──────────────────────────────────────────
  { parent: 'Poste de travail', full: ['Windows 10', 'Windows 11', 'Intune', 'SCCM', 'MDT', 'Autopilot', 'macOS', 'Jamf'], partial: ['Active Directory'] },
  { parent: 'MDM', full: ['Intune', 'Jamf', 'Workspace ONE', 'MobileIron', 'SCCM'] },

  // ── Téléphonie / communications unifiées ────────────────────────────
  { parent: 'Téléphonie', full: ['VoIP', 'SIP', 'Asterisk', 'Avaya', 'Cisco CallManager', 'Teams Voice', '3CX'] },

  // ── Observabilité ───────────────────────────────────────────────────
  { parent: 'Observabilité', full: ['Prometheus', 'Grafana', 'Datadog', 'ELK', 'Splunk', 'Jaeger', 'OpenTelemetry', 'Dynatrace', 'New Relic'] },

  // ── Embarqué / IoT ──────────────────────────────────────────────────
  { parent: 'Embarqué', full: ['C', 'C++', 'RTOS', 'FreeRTOS', 'STM32', 'Yocto', 'Embedded Linux', 'Microcontrôleur'] },
  { parent: 'IoT', full: ['MQTT', 'Arduino', 'Raspberry Pi', 'LoRa', 'LoRaWAN', 'Zigbee', 'Embedded Linux'] },

  // ── Télécom ─────────────────────────────────────────────────────────
  { parent: 'Télécom', full: ['5G', '4G', 'LTE', 'VoLTE', 'Core Network', 'RAN', 'GSM'] },
];

type EquivEntry = { full: Set<string>; partial: Set<string> };

/** Index normalisé : canonique-parent → { full: Set<canoniques>, partial: Set }. */
const MAP: Map<string, EquivEntry> = (() => {
  const m = new Map<string, EquivEntry>();
  const canon = (s: string) => normalizeSkill(s).canonical;
  for (const e of RAW) {
    const pc = canon(e.parent);
    if (!pc) continue;
    const entry = m.get(pc) ?? { full: new Set<string>(), partial: new Set<string>() };
    for (const f of e.full) {
      const c = canon(f);
      if (c) entry.full.add(c);
    }
    for (const p of e.partial ?? []) {
      const c = canon(p);
      // Un enfant "full" prime sur "partial" si listé aux deux.
      if (c && !entry.full.has(c)) entry.partial.add(c);
    }
    m.set(pc, entry);
  }
  return m;
})();

export type EquivalenceResult = {
  strength: 'full' | 'partial' | 'none';
  /** Compétences du consultant (forme brute) qui apportent la preuve. */
  evidence: string[];
};

/**
 * Cherche si une compétence requise (déjà canonicalisée) est couverte par
 * équivalence dans les compétences du consultant.
 */
export function findEquivalence(
  requiredCanonical: string,
  consultant: Array<{ canonical: string; raw: string }>,
): EquivalenceResult {
  const entry = MAP.get(requiredCanonical);
  if (!entry) return { strength: 'none', evidence: [] };
  const full = consultant.filter((c) => entry.full.has(c.canonical));
  if (full.length > 0) return { strength: 'full', evidence: dedupe(full.map((c) => c.raw)) };
  const partial = consultant.filter((c) => entry.partial.has(c.canonical));
  if (partial.length > 0) return { strength: 'partial', evidence: dedupe(partial.map((c) => c.raw)) };
  return { strength: 'none', evidence: [] };
}

export type SkillCategorization = {
  /** Match explicite (compétence écrite telle quelle, canonique identique). */
  explicit: string[];
  /** Match par équivalence forte (preuve technique équivalente présente). */
  equivalent: Array<{ skill: string; evidence: string[] }>;
  /** Indice partiel (à renforcer / confirmer). */
  partial: Array<{ skill: string; evidence: string[] }>;
  /** Réellement absent (aucune preuve directe ni équivalente). */
  missing: string[];
};

/**
 * Classe chaque compétence requise en explicite / équivalent / partiel /
 * absent, en tenant compte des synonymes (normalize) ET des équivalences
 * parent→enfant. Utilisé pour nourrir le prompt LLM (justification + CV
 * optimizer) avec une catégorisation déjà défendable.
 */
export function categorizeRequiredSkills(
  requiredRaw: string[],
  consultantSkillNames: string[],
): SkillCategorization {
  const consultant = consultantSkillNames
    .map((raw) => ({ canonical: normalizeSkill(raw).canonical, raw }))
    .filter((c) => c.canonical);
  const consultantCanon = new Set(consultant.map((c) => c.canonical));

  const out: SkillCategorization = { explicit: [], equivalent: [], partial: [], missing: [] };
  const seen = new Set<string>();

  for (const raw of requiredRaw) {
    const req = normalizeSkill(raw);
    if (!req.canonical || seen.has(req.canonical)) continue;
    seen.add(req.canonical);

    if (consultantCanon.has(req.canonical)) {
      out.explicit.push(raw);
      continue;
    }
    const eq = findEquivalence(req.canonical, consultant);
    if (eq.strength === 'full') out.equivalent.push({ skill: raw, evidence: eq.evidence });
    else if (eq.strength === 'partial') out.partial.push({ skill: raw, evidence: eq.evidence });
    else out.missing.push(raw);
  }
  return out;
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr)).slice(0, 5);
}

/** Pour les tests : nombre d'entrées parent chargées. */
export function _debugEquivMapSize(): number {
  return MAP.size;
}
