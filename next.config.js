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
          // Empêche les CDN ou proxys d'indexer ces pages comme si
          // elles venaient d'eux (signal canonical secondaire)
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
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
    ];
  },
};

module.exports = nextConfig;
