# Security audit — Centrium

## Plugin Claude Code : Security-Audit-Claude-Skill

Le plugin [ReeperReepx/Security-Audit-Claude-Skill](https://github.com/ReeperReepx/Security-Audit-Claude-Skill) fournit une commande `/security-audit` qui exécute un audit de sécurité en **10 phases** sur le projet, avec auto-remediation et rapport PDF.

### Installation (à exécuter par l'utilisateur)

Dans Claude Code, lance :

```
/plugin marketplace add ReeperReepx/Security-Audit-Claude-Skill
/plugin install security-audit@reeperreepx-security-audit
```

Une fois installé, la commande slash `/security-audit` devient disponible dans toute session sur ce projet.

### Usage

Lancer un audit complet :

```
/security-audit
```

Le plugin :
1. Scanne les dépendances (npm audit + Snyk-style)
2. Vérifie les patterns OWASP Top 10 (injection SQL, XSS, CSRF, deserialization, etc.)
3. Audit des routes API (auth, RLS, validation Zod, rate limiting)
4. Vérifie les secrets en dur (clés AWS, JWT, tokens)
5. Vérifie les headers de sécurité (HSTS, X-Frame, CSP) — déjà OK dans `next.config.js`
6. Audit des middlewares (auth/api gating)
7. Vérifie l'isolation multi-tenant (RLS policies Supabase)
8. Vérifie les cookies (HttpOnly, Secure, SameSite)
9. Génère un rapport PDF avec sévérité + remediation suggérée
10. Applique l'auto-remediation pour les fixes triviaux (sur confirmation)

### Spécifique Centrium

Points à vérifier en priorité lors du premier audit :

- **RLS Supabase** : toutes les tables principales (consultants, contracts, invoices, timesheets, opportunities, contacts) doivent avoir RLS activé + policies sur `organization_id = auth.jwt() ->> 'organization_id'`
- **Service role key** : ne doit JAMAIS être exposée côté client. Vérifier qu'elle n'est utilisée que dans `route.ts` (Route Handlers) et Edge Functions
- **Validation Zod** : tous les endpoints API doivent parser le body avec un schéma Zod avant insertion DB
- **Upload de fichiers** : `/api/upload-logo` et autres routes d'upload doivent vérifier MIME type + taille + scan antivirus si possible
- **CSP** : à ajouter dans `next.config.js` après l'audit initial (le plugin générera une CSP adaptée)

### Limites connues

- Le plugin ne teste pas l'app live — il analyse le code statiquement. Pour des tests dynamiques (penetration testing), utiliser ZAP, Burp Suite, ou nuclei en complément.
- Les policies RLS sont validées sur le code (`supabase/migrations/*.sql`), pas sur le projet Supabase déployé. Pour vérifier le projet live, utiliser `mcp__supabase__get_advisors` dans Claude Code.

## Audit live Supabase

Le projet MCP Supabase est configuré. Pour audit live :

```
mcp__supabase__get_advisors (type: 'security')
```

Retourne les advisors actifs : missing RLS, public functions sans search_path, etc.

## Headers de sécurité en place

Voir `next.config.js` → `headers()` :
- HSTS preload (2 ans)
- X-Frame-Options SAMEORIGIN
- X-Content-Type-Options nosniff
- Referrer-Policy strict-origin-when-cross-origin
- Permissions-Policy lockdown (camera, microphone, geolocation, browsing-topics)
- X-DNS-Prefetch-Control on

## CSP — à ajouter post-audit

Une fois `/security-audit` lancé, le plugin recommande une CSP. Template de base à adapter :

```js
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.anthropic.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; '),
}
```

(`unsafe-inline` et `unsafe-eval` à supprimer une fois que tous les inline scripts sont retirés ou nonce-ifiés. Le bootstrap theme script dans `layout.tsx` est inline → soit le nonce-ifier, soit le déplacer en fichier statique.)
