import { Cursor } from '@/components/site/Cursor';
import { Intro } from '@/components/site/Intro';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteMotion } from '@/components/site/SiteMotion';

/** Habillage des pages du site vitrine. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-ivory font-sans text-ink antialiased">
      <Intro />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[95] focus:rounded-md focus:bg-ivory focus:px-3 focus:py-2 focus:text-ink focus:shadow-md">
        Aller au contenu
      </a>
      <SiteMotion>
        <SiteHeader />
        <main id="contenu">{children}</main>
        <SiteFooter />
        <Cursor />
      </SiteMotion>
    </div>
  );
}
