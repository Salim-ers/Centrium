---
title: "Documents Enterprise manquants — Plan de production"
subtitle: "Liste exhaustive triée par criticité"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "internal-checklist"
---

# Documents Enterprise manquants — Plan de production

> Inventaire exhaustif de tout ce qu'un client Enterprise peut demander avant signature.
> Classement **CRITIQUE / IMPORTANT / OPTIONNEL** basé sur la probabilité d'apparaître
> dans une procédure d'achat 20k€ – 100k€+.

---

## CRITIQUE — bloquant pour 80% des deals Enterprise

Documents demandés systématiquement en due diligence par RSSI, DSI ou Achats.
**Sans eux, le cycle de vente s'allonge de 4–8 semaines minimum.**

| # | Document | Audience | Statut |
|---|---|---|:-:|
| 1 | **Security Whitepaper** | RSSI, audit logiciel | ⏭ À produire |
| 2 | **Trust Center** (page publique) | Tous acheteurs | ⏭ À produire |
| 3 | **SLA & Support Guide** | Achats, DSI | ⏭ À produire |
| 4 | **Admin Guide** (gouvernance plateforme) | Admin clients | ⏭ À produire |
| 5 | **Architecture Overview** + diagrammes | DSI, architecte | ⏭ À produire |
| 6 | **DPA** (Data Processing Agreement) signable | DPO / Achats | 🟡 Mentionné "signable sur demande" — modèle PDF à formaliser |
| 7 | **Sous-traitants** (liste publique versionnée) | RSSI, DPO | 🟡 Listés dans présentation entreprise — à publier en page dédiée |
| 8 | **Incident Response Plan** (public, dégradé) | RSSI | ⏭ À produire |

**Effort total** : ~5 jours de rédaction + revue.

---

## IMPORTANT — déterminant pour la conversion

Documents qui font basculer un prospect "intéressé" vers "qualifié".
**Leur absence allonge le funnel mais ne le bloque pas.**

| # | Document | Audience | Statut |
|---|---|---|:-:|
| 9 | **ROI Guide / Calculator** | CEO ESN, finance | ⏭ À produire |
| 10 | **Help Center / Knowledge Base structurée** | Utilisateurs + support | ⏭ À produire (arbo) |
| 11 | **Case Study template** + 3 case studies clients | CEO, BM ESN | 🟡 Template à produire, contenus à recueillir |
| 12 | **Documentation API** (OpenAPI / Swagger) | Devs intégrateurs | ⏭ À produire |
| 13 | **Roadmap publique** (vision 12 mois) | Tous acheteurs | ⏭ À produire |
| 14 | **Changelog public** | Clients existants + prospects | ⏭ À produire |
| 15 | **Onboarding Guide** détaillé (J0→J+30) | Clients post-signature | 🟡 5 étapes mentionnées dans la présentation entreprise — à détailler |
| 16 | **Business Continuity Plan** résumé public | RSSI, audit | ⏭ À produire |
| 17 | **Comparatif concurrents** (factuel) | Achats, CEO | ⏭ À produire |
| 18 | **Status page** publique | Tous acheteurs, clients | ⏭ À déployer (status.centrium-platform.com) |

**Effort total** : ~7 jours de rédaction + intégration technique (status page = 1 jour Vercel + UptimeRobot ou Statuspage.io).

---

## OPTIONNEL — différenciation et thought-leadership

Documents qui transforment un "OK on signe" en "wow, c'est carré".

| # | Document | Audience | Statut |
|---|---|---|:-:|
| 19 | **Bug Bounty / VDP** (Vulnerability Disclosure Program) | RSSI, communauté sécurité | ⏭ À produire |
| 20 | **Penetration Test summary** (résumé public) | RSSI Enterprise | ⏭ À planifier (pentest annuel) |
| 21 | **SOC 2 Type I/II** roadmap publique | RSSI Grands comptes | ⏭ À annoncer (Q4 2026 réaliste) |
| 22 | **ISO 27001** roadmap | RSSI international | ⏭ À évaluer (2027) |
| 23 | **Whitepaper "État du staffing ESN 2026"** | Lead-gen | ⏭ À produire (thought-leadership) |
| 24 | **Customer Success Playbook** (interne) | Équipe Centrium | ⏭ À produire |
| 25 | **Sales Enablement Kit** (interne) | Équipe commerciale | ⏭ À produire (one-pagers, pitch deck, objection handling) |
| 26 | **Investor Deck** | Investisseurs SaaS | ⏭ À produire (si levée prévue) |
| 27 | **API SDK** (TypeScript + Python) | Devs intégrateurs avancés | ⏭ À planifier (post v1.1) |
| 28 | **Webhooks documentation** | Devs intégrateurs | ⏭ À produire |
| 29 | **Page Carrières / Équipe / Manifesto** | Tous publics | 🟡 Section "Engagements" existe — à enrichir |
| 30 | **Blog technique** (3-5 articles fondateurs) | SEO + crédibilité | ⏭ À produire |

**Effort total** : variable, certains éléments sont des décisions stratégiques (SOC 2, ISO).

---

## Priorisation 30 / 60 / 90 jours

### Sprint 1 (J0 – J+30) — débloquer 80% des objections

1. **Security Whitepaper** (CRITIQUE #1)
2. **Trust Center** page publique (CRITIQUE #2)
3. **SLA & Support Guide** (CRITIQUE #3)
4. **Admin Guide** (CRITIQUE #4)
5. **DPA modèle PDF signable** (CRITIQUE #6)
6. **Sous-traitants page publique** (CRITIQUE #7)

→ Livrable : 6 documents finalisés + 1 page Trust Center mise en ligne sur `centrium-platform.com/trust`.

### Sprint 2 (J+30 – J+60) — déblocage technique + commercial

7. **Architecture Overview** + diagrammes Mermaid (CRITIQUE #5)
8. **Incident Response Plan** public (CRITIQUE #8)
9. **Status page** opérationnelle (IMPORTANT #18)
10. **ROI Calculator / Guide** (IMPORTANT #9)
11. **Help Center structure** + 20 articles fondateurs (IMPORTANT #10)
12. **Case Study template** + 1 case study si client volontaire (IMPORTANT #11)

→ Livrable : statut applicatif opérationnel + dossier technique complet pour DSI.

### Sprint 3 (J+60 – J+90) — finalisation Enterprise-ready

13. **Documentation API OpenAPI** + portail développeur (IMPORTANT #12)
14. **Roadmap publique** + Changelog (IMPORTANT #13, 14)
15. **Comparatif concurrents** factuel (IMPORTANT #17)
16. **3 case studies clients** finalisées avec accord (IMPORTANT #11)
17. **SOC 2 Type I roadmap** annoncée publiquement (OPTIONNEL #21)
18. **Bug Bounty / VDP** publié (OPTIONNEL #19)

→ Livrable : posture Enterprise-ready, capable de répondre à un appel d'offres groupe sans concession documentaire.

---

## Documents produits dans cette session

Sur les 30 items listés, **8 sont produits immédiatement dans cette session** (cf. dossier `docs/produit/`) :

| # | Document | Fichier |
|---|---|---|
| 1 | Security Whitepaper | `SECURITY_WHITEPAPER.md` |
| 2 | Trust Center | `TRUST_CENTER.md` |
| 3 | SLA & Support Guide | `SLA_AND_SUPPORT_GUIDE.md` |
| 4 | Admin Guide | `ADMIN_GUIDE.md` |
| 5 | Architecture Overview | `ARCHITECTURE_OVERVIEW.md` |
| 9 | ROI Guide | `ROI_GUIDE.md` |
| 10 | Help Center Structure | `HELP_CENTER_STRUCTURE.md` |
| 11 | Case Study Template | `CASE_STUDY_TEMPLATE.md` |

Ces 8 documents couvrent **6 CRITIQUE sur 8** et **3 IMPORTANT sur 10**. La maturité documentaire passe d'une note **5,5 / 10** à une note projetée **8,5 / 10** une fois ces 8 documents publiés.

Les 22 documents restants relèvent d'opérations futures (déploiement status page, recueil case studies clients, audit SOC 2) et sortent du périmètre rédactionnel de cette session.

---

## Synthèse

> **Aujourd'hui** : 6,2 / 10 (Scale-up).
> **Après production des 8 documents de cette session** : 8,5 / 10 (PME SaaS solide).
> **Après opérations Sprint 2-3** (status page, case studies, SOC 2 annoncé) : 9,5 / 10 (Enterprise-ready).

**Prochaine étape** : lire les 8 documents produits, à commencer par [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md) puis [`TRUST_CENTER.md`](./TRUST_CENTER.md).
