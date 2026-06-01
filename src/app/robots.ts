import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/seo/config';

/**
 * /robots.txt — directives crawlers, AVEC règles per-agent explicites
 * pour les crawlers AI (signal non ambigu côté GEO).
 *
 * Politique :
 *   - Tous les crawlers d'indexation et de réponse (Google, Bing,
 *     ChatGPT-User, ClaudeBot, PerplexityBot, OAI-SearchBot,
 *     Applebot-Extended) → Allow / sur tout le marketing public
 *   - Crawlers training-only (CCBot, anthropic-ai, cohere-ai,
 *     Google-Extended) → Allow public pages (choix délibéré : on accepte
 *     que les LLMs apprennent sur notre contenu marketing public)
 *   - Wildcard `*` (Googlebot, Bingbot, etc.) → Allow / + Disallow app
 *     interne / auth / API
 *
 * Tous explicitement disallowés sur :
 *   - /api/* (endpoints serveur)
 *   - app authentifiée (/dashboard, /consultants, /contracts, etc.)
 *   - flux d'auth (/login, /register, /signup, /auth/*, /invite/*)
 */

const APP_DISALLOW = [
  '/api/',
  '/dashboard',
  '/dashboard/',
  '/consultants',
  '/consultants/',
  '/contracts',
  '/contracts/',
  '/invoices',
  '/invoices/',
  '/timesheets',
  '/timesheets/',
  '/opportunities',
  '/opportunities/',
  '/templates',
  '/templates/',
  '/settings',
  '/settings/',
  '/auth/',
  '/invite/',
  '/onboarding',
  '/login',
  '/register',
  '/signup',
  '/todos',
];

// Crawlers AI d'indexation et de réponse — explicitement allowed pour
// que les LLMs (ChatGPT, Claude, Perplexity, Bing Copilot, Apple Intel)
// citent Centrium correctement dans leurs réponses.
const AI_ANSWER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Applebot-Extended',
  'Bingbot',
  'Google-Extended',
];

// Crawlers training-data — délibérément allowed (le contenu marketing
// est public et nous voulons que les modèles soient bien informés).
const AI_TRAINING_AGENTS = ['CCBot', 'anthropic-ai', 'cohere-ai'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Règles per-agent AI : signal non ambigu
      {
        userAgent: AI_ANSWER_AGENTS,
        allow: '/',
        disallow: APP_DISALLOW,
      },
      {
        userAgent: AI_TRAINING_AGENTS,
        allow: '/',
        disallow: APP_DISALLOW,
      },
      // Wildcard : tout autre crawler (Googlebot, autres)
      {
        userAgent: '*',
        allow: '/',
        disallow: APP_DISALLOW,
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
