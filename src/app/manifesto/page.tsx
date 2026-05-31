'use client';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MagneticButton } from '@/components/marketing/MagneticButton';

export default function ManifestoPage() {
  return (
    <MarketingShell>
      <main className="relative pt-32 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-6 text-center">
            Vision
          </div>

          <h1 className="font-display font-light tracking-[-0.04em] leading-[0.95] text-[clamp(2.6rem,6vw,5rem)] text-white text-center">
            Une plateforme
            <span className="block mt-3 font-editorial italic font-normal">
              pensée pour celles et ceux
            </span>
            <span className="block mt-3">qui font tourner les ESN.</span>
          </h1>

          <div className="mt-16 space-y-10 text-[17px] md:text-[18px] leading-[1.7] text-white/75 font-light">
            <p className="font-editorial italic text-[clamp(1.4rem,2.2vw,1.8rem)] text-white/90 leading-[1.5] text-center">
              « Le staffing ne devrait pas être un sport d&apos;endurance Excel. »
            </p>

            <p>
              Nous avons passé des années à voir des business managers
              brillants perdre 30 % de leur temps à recoller des morceaux —
              un CV dans Word, un pipeline dans Notion, un CRA sur WhatsApp,
              une facture sur un PDF retouché à la main.
            </p>

            <p>
              Pendant ce temps, les <em>vrais</em> sujets — qualifier finement
              un besoin, sentir un intercontrat qui se profile, soigner la
              relation avec un client — passaient au second plan. Pas par
              paresse. Par fatigue d&apos;outil.
            </p>

            <p>
              Centrium est notre réponse. Une seule plateforme, qui couvre
              tout le cycle, et qui s&apos;efface devant le métier. Pas un
              tableau de bord de plus. <strong className="text-white">L&apos;outil</strong>.
            </p>
          </div>

          <div className="qc-luminous-static mt-20 grid md:grid-cols-3 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {[
              {
                num: '01',
                title: 'Le métier d’abord',
                body: 'Chaque écran a été dessiné avec une ESN en main. Pas un Figma envoyé par un consultant qui n’a jamais staffé.',
              },
              {
                num: '02',
                title: 'L’IA assistée, pas autonome',
                body: 'Aucune décision n’est prise sans vous. L’IA propose, suggère, accélère — vous validez. Jamais d’invention.',
              },
              {
                num: '03',
                title: 'Conformité par défaut',
                body: 'Hébergement EU, RLS multi-tenant, audit trail. Votre client le plus exigeant peut auditer demain.',
              },
            ].map((p) => (
              <div key={p.num} className="bg-background p-8">
                <div className="text-[11px] font-mono text-white/30 mb-4">
                  {p.num}
                </div>
                <div className="font-editorial italic text-2xl text-white mb-3">
                  {p.title}
                </div>
                <p className="text-[14px] text-white/60 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <p className="font-editorial italic text-[clamp(1.6rem,2.6vw,2rem)] text-white/90 leading-[1.4] mb-3">
              Vous ne devriez pas avoir à choisir
            </p>
            <p className="font-editorial italic text-[clamp(1.6rem,2.6vw,2rem)] text-white/90 leading-[1.4]">
              entre rapidité et rigueur.
            </p>
            <p className="mt-6 text-white/55 text-[15px]">— L&apos;équipe Centrium</p>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton href="/devis" variant="primary">
              Demander une démo
            </MagneticButton>
            <MagneticButton href="/plateforme" variant="ghost">
              Voir la plateforme
            </MagneticButton>
          </div>
        </article>
      </main>
    </MarketingShell>
  );
}
