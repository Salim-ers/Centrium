---
title: "Activer la status page publique — Centrium"
subtitle: "Setup Better Stack en 30 minutes (gratuit jusqu'à 10 monitors)"
date: "2026-06-15"
audience: "Salim, ops"
---

# Status page publique — Activation Better Stack

## Pourquoi maintenant

L'audit du 15/06/2026 a flagé que `status.centrium-platform.com` est référencée 2× sur le site mais n'est pas opérationnelle. C'est un blocker commercial : tout acheteur DSI/RSSI commence par vérifier la status page d'un fournisseur SaaS. Si elle 404, crédibilité = 0.

La page `/status` interne (créée dans ce commit) affiche un état statique honnête. Mais il faut aussi une page **externe** qui ping en continu pour montrer l'uptime réel — c'est ce qu'on installe ici.

## Better Stack vs alternatives

| Outil | Coût | Effort | Recommandation |
|---|---|---|---|
| **Better Stack** | Gratuit (10 monitors, 3 min interval) | 20 min | ✅ Recommandé |
| Statuspage.io (Atlassian) | 29 $/mois minimum | 15 min | Surdimensionné pour bootstrap |
| Upptime (self-host GitHub) | 0 € | 1h | Plus rigide, moins joli |
| UptimeRobot | Gratuit (50 monitors, 5 min interval) | 30 min | OK alternative |

**Choix : Better Stack** — UI moderne, status page brandable, intégrations Slack/email natives, plan gratuit suffisant pour 100 ESN.

## Setup en 6 étapes

### Étape 1 — Créer compte Better Stack (3 min)

1. Va sur https://betterstack.com
2. **Sign up** avec ton email Google (salim.elrs@gmail.com)
3. Choisis le plan **Free** (10 monitors)
4. Crée une "Team" : `Centrium by QuadCore`

### Étape 2 — Créer les 4 monitors uptime (5 min)

Dans **Monitors → Create monitor**, crée :

| Nom | URL | Type | Frequence |
|---|---|---|---|
| `Centrium — App` | `https://centrium-platform.com` | HTTPS | 3 min |
| `Centrium — API health` | `https://centrium-platform.com/api/health` | HTTPS, attend status 200 | 3 min |
| `Centrium — Auth login` | `https://centrium-platform.com/auth/login` | HTTPS | 3 min |
| `Centrium — Tarifs publique` | `https://centrium-platform.com/tarifs` | HTTPS | 3 min |

⚠️ **Note** : `/api/health` n'existe pas encore. À créer dans le sprint suivant (cf. plan "ETI ready"). En attendant, monitor uniquement `/`, `/auth/login`, `/tarifs`.

Pour chaque monitor :
- **Recovery period** : 2 min (évite faux positifs)
- **Notify channels** : email salim.elrs@gmail.com (Slack plus tard)

### Étape 3 — Créer la status page publique (5 min)

1. **Status pages → Create status page**
2. **Name** : `Centrium`
3. **Subdomain** : `centrium-platform` → URL = `centrium-platform.betteruptime.com`
4. **Logo** : upload `public/logo-centrium.svg`
5. **Theme** : Dark + couleur primaire violet (#8B5CF6)
6. **Resources** (sections) :
   - `Application` → linker au monitor `Centrium — App`
   - `API` → linker au monitor `API health`
   - `Authentification` → linker au monitor `Auth login`
7. **About text** :
   > Centrium est la plateforme SaaS B2B française pour ESN. Cette page reflète la disponibilité temps réel de nos systèmes. Pour signaler un incident : support@centrium-platform.com

### Étape 4 — DNS custom domain (optionnel mais recommandé, 10 min)

Pour avoir `status.centrium-platform.com` au lieu de `centrium-platform.betteruptime.com` :

1. Dans Better Stack → Status page → **Custom domain**
2. Ajoute `status.centrium-platform.com`
3. Va dans **Vercel → centrium-platform.com → Domains**
4. Ajoute un sous-domaine `status` avec CNAME vers `centrium-platform.betteruptime.com`
5. Better Stack provisionne le certif SSL en 2-5 min

### Étape 5 — Brancher la page /status interne (2 min)

Ajoute dans **Vercel → Settings → Environment Variables → Production** :

```
NEXT_PUBLIC_STATUS_PAGE_URL = https://status.centrium-platform.com
```

(ou `https://centrium-platform.betteruptime.com` si pas de DNS custom)

**Redeploy Vercel** pour que la variable soit picked up.

### Étape 6 — Vérification (5 min)

- [ ] https://centrium-platform.com/status affiche la page interne
- [ ] Le bouton "Status page temps réel" pointe vers Better Stack
- [ ] La status page Better Stack affiche les 4 monitors en vert
- [ ] Tester en arrêtant momentanément un déploiement Vercel → Better Stack envoie un email sous 5 min
- [ ] Ajouter le lien `status.centrium-platform.com` dans tes signatures email + footer site (déjà fait dans /trust et /tarifs)

## Coût récurrent

- **Better Stack Free** : 0 €/mois jusqu'à 10 monitors + 1 status page (suffit jusqu'à 50+ ESN)
- **Better Stack Team plan** : 18 $/mois si tu veux historique > 30 jours ou status page custom branding plus poussé — à reconsidérer après le 10ème client

## Pour SOC 2 / ISO 27001

Better Stack fournit nativement :
- Historique d'incidents exportable PDF (preuve d'audit)
- Uptime SLA mensuel chiffré (preuve d'engagement)
- Logs de notifications (preuve de processus incident)

Ces 3 éléments sont demandés en audit SOC 2 (CC7.2 monitoring) et ISO 27001 A.16.1 (gestion d'incidents).

## Contact

- Better Stack support : https://betterstack.com/help (chat)
- Page interne Centrium : [src/app/status/page.tsx](../../src/app/status/page.tsx)
- Trust Center : [/trust](https://centrium-platform.com/trust)
