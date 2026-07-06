/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'centrium-platform.com',
        'www.centrium-platform.com',
      ],
    },
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // En-têtes de sécurité appliqués à toutes les pages.
  // Audit SEO technical : sans ces headers, X-Frame-Options /
  // X-Content-Type-Options / Referrer-Policy / Permissions-Policy ne
  // sont pas garantis sur Vercel. HSTS est appliqué par Vercel par
  // défaut sur les domaines apex managés ; on le redéclare ici pour
  // homogénéité et pour activer le preload.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Content-Security-Policy : politique stricte XSS + clickjacking.
          // 'unsafe-inline' nécessaire pour les <script> bootstrap inline
          // dans layout.tsx (theme + session gate). À nonce-ifier dans
          // une prochaine itération pour passer en CSP3 strict.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-inline' + 'unsafe-eval' nécessaires pour Tailwind +
              // scripts bootstrap inline + @react-pdf/renderer qui fait
              // de l'eval interne pour le layout PDF.
              // 'blob:' permet aux Web Workers spawnés par @react-pdf
              // (génération de PDF en off-thread).
              // https://js.stripe.com : Stripe.js (Embedded Checkout in-app).
              // Sans lui → « Failed to load Stripe.js » au clic Souscrire.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://va.vercel-scripts.com https://*.vercel-insights.com https://js.stripe.com",
              // worker-src explicite : @react-pdf/renderer + d'autres libs
              // (html2canvas, jspdf) spawnent des workers depuis Blob URLs.
              "worker-src 'self' blob:",
              // child-src fallback pour worker-src + frames éventuelles.
              "child-src 'self' blob: https://js.stripe.com https://hooks.stripe.com",
              // frame-src : iframe Embedded Checkout (js.stripe.com) +
              // 3D Secure (hooks.stripe.com) + fallback hosted checkout.
              "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              // 'blob:' indispensable pour <a href={URL.createObjectURL(...)} download>
              // qui déclenche le téléchargement du PDF généré côté client.
              // *.stripe.com : logos de cartes / icônes du checkout embarqué.
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://*.vercel.app https://*.stripe.com",
              // 'blob:' aussi pour les fetchs internes @react-pdf vers ses ressources.
              // wss:// nécessaire pour Supabase Realtime (postgres_changes + presence
              // utilisés par useCrmRealtime, OrgCursorsOverlay, OrgActivityListener,
              // useRealtimeReload). Sans wss:, l'app interne crash au mount avec
              // "WebSocket connection blocked by CSP".
              // api.stripe.com + r.stripe.com + merchant-ui-api.stripe.com :
              // XHR du checkout embarqué Stripe.
              "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://api.anthropic.com https://formspree.io https://*.vercel-insights.com https://api.stripe.com https://r.stripe.com https://merchant-ui-api.stripe.com https://checkout.stripe.com",
              "frame-ancestors 'self'",
              "form-action 'self' https://formspree.io",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // Force la redirection naked → www côté Vercel/Next (en plus du
  // 307 que Vercel applique déjà au niveau DNS — ceinture-bretelles
  // pour les cas où le DNS ne couvre pas).
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'centrium-platform.com' }],
        destination: 'https://www.centrium-platform.com/:path*',
        permanent: true,
      },
      // L'ancien tunnel devis (demande → validation manuelle → email de
      // paiement) est remplacé par le self-signup carte-à-l'inscription
      // (/essai). On redirige tout lien résiduel (favori, footer, lien
      // externe) vers le nouveau parcours. Temporaire (307) le temps que
      // le funnel se stabilise.
      {
        source: '/devis',
        destination: '/essai',
        permanent: false,
      },
    ];
  },
};

// Wrap avec Sentry (no-op si SENTRY_DSN absent — pas de surcoût en dev).
// Doit rester la DERNIÈRE transformation appliquée à nextConfig.
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  // Org/projet Sentry — passés en env vars pour ne pas hardcoder
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN, // pour upload des source maps

  // Mode silencieux en dev (évite les warnings quand DSN absent)
  silent: !process.env.CI,

  // Source maps : seulement en prod
  widenClientFileUpload: true,
  hideSourceMaps: true,

  // Tunneling : contourne les ad-blockers en routant Sentry via notre domaine
  tunnelRoute: '/monitoring',

  // Tree-shaking des logs Sentry verbeux + désactive le bundler analyzer
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
