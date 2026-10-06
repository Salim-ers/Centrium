import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Routes EXCLUES du middleware (matchent PAS) :
  //   - api/...        : route handlers gèrent leur propre auth
  //   - _next/static   : assets Next.js
  //   - _next/image    : optimisation d'images
  //   - favicon.ico    : favicon root
  //   - robots.txt     : ⚠ doit être servi SANS auth pour les crawlers
  //   - sitemap.xml    : idem
  //   - llms.txt       : idem (pour ChatGPT, Claude, Perplexity)
  //   - manifest.webmanifest : PWA manifest public
  //   - opengraph-image : OG dynamique pour réseaux sociaux
  //   - icon, apple-icon : favicons dynamiques edge (et /icons/* du manifeste)
  //   - sw.js, offline.html : service worker et page hors ligne (PWA)
  //   - *.svg / png / jpg / etc. : assets binaires
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|manifest\\.webmanifest|sw\\.js|offline\\.html|opengraph-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
