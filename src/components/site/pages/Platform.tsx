import { DASHBOARD_H, DASHBOARD_W, ProductDashboard } from '../ProductDashboard';
import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { Appear, Cta, FlowLine, Kicker, Lead, MaskImage, Section, Title, Wide } from '../kit';
import { Roles } from './Roles';

type Module = { name: string; text: string };
const GROUPS: Array<{ title: string; modules: Module[] }> = [
  {
    title: 'Commerce',
    modules: [
      { name: 'CRM', text: 'Contacts, sociétés et opportunités dans un pipeline par étape.' },
      { name: 'Clients', text: 'Une fiche par client, qui rassemble tout ce qui le concerne.' },
      { name: 'Devis & documents', text: 'Des devis construits sur vos modèles, des documents privés et versionnés.' },
    ],
  },
  {
    title: 'Talents',
    modules: [
      { name: 'Consultants', text: 'La fiche de chaque consultant : compétences, séniorité, disponibilité, CV.' },
      { name: 'Staffing', text: 'Missions, fins de mission, congés et propositions sur une même ligne de temps.' },
      { name: 'Matching', text: 'Un score sur 100 pour chaque besoin, calculé sur sept critères visibles.' },
    ],
  },
  {
    title: 'Production',
    modules: [
      { name: 'Missions', text: 'Dates, consultant, TJM de vente et coût : la marge de chaque mission.' },
      { name: 'CRA', text: 'Un calendrier mensuel, rempli par le consultant, validé par vous.' },
      { name: 'Préfacturation', text: 'Les jours validés deviennent des préfactures, prêtes à reprendre.' },
    ],
  },
  {
    title: 'Pilotage',
    modules: [
      { name: 'Tableau de bord', text: 'CA signé, marge, à traiter, activité, staffing et pipeline sur un écran.' },
      { name: 'Analytics', text: 'Les analyses qui pilotent une ESN, calculées sur vos données.' },
      { name: 'Automatisations', text: 'Sept règles qui surveillent les échéances et préviennent la bonne personne.' },
    ],
  },
  {
    title: 'Ouverture',
    modules: [
      { name: 'Portail client', text: 'Votre client suit ses missions et dépose ses besoins.' },
      { name: 'Portail consultant', text: 'Le consultant retrouve sa mission, son CRA et ses documents.' },
      { name: 'Rôles & recherche', text: 'Chacun voit ce que son rôle permet, et trouve tout en un raccourci.' },
    ],
  },
];

/**
 * Page Fonctionnalités (/plateforme) : le cycle, l'aperçu du cockpit, les
 * modules, puis ce que Centrium apporte à chaque fonction de l'ESN.
 */
export function Platform() {
  return (
    <>
      <Section tone="deep" aria-label="Plateforme" className="overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
        <Wide>
          <Kicker>Fonctionnalités</Kicker>
          <Title as="h1" size="hero" immediate className="mt-8 text-[clamp(2.8rem,8vw,9.5rem)]" lines={[['Un seul espace.'], ['Tout le ', { em: 'cycle.' }]]} />
          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Lead className="text-ivory/85">Centrium réunit le commerce, le staffing, la production et la rentabilité de votre ESN. Chaque module alimente le suivant, sans ressaisie.</Lead>
            <div className="flex flex-wrap gap-3">
              <Cta href="/demo" variant="ivory">
                Demander une démo
              </Cta>
              <Cta href="#modules" variant="outline-light" cursor="Explorer">
                Les modules
              </Cta>
              <Cta href="#roles" variant="outline-light" cursor="Explorer">
                Par fonction
              </Cta>
            </div>
          </div>
          <FlowLine light className="mt-20" />
        </Wide>
      </Section>

      <Section tone="dune" aria-label="Aperçu du cockpit" className="py-20 md:py-28">
        <Wide>
          <div className="mx-auto max-w-[1280px]" data-cursor="Explorer">
            <ScaleFrame width={DASHBOARD_W} height={DASHBOARD_H} label={`Tableau de bord Centrium (${EXAMPLE_LABEL.toLowerCase()}).`}>
              <ProductDashboard />
            </ScaleFrame>
            <p className="mt-4 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL} · sociétés et personnes fictives</p>
          </div>
        </Wide>
      </Section>

      <Section tone="ivory" id="modules" aria-label="Fonctionnalités" className="py-24 md:py-36">
        <Wide>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
            <div>
              <Kicker>Les modules</Kicker>
              <Title size="lg" className="mt-6" lines={[['Quinze modules.'], ['Un seul ', { em: 'flux.' }]]} />
            </div>
            <Lead className="lg:justify-self-end">Tous inclus dans chaque offre. Aucun module en option.</Lead>
          </div>

          <div className="mt-20 space-y-24">
            {GROUPS.map((g) => (
              <div key={g.title} className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <h2 className="text-[clamp(2rem,3.4vw,3.4rem)] font-extrabold uppercase leading-none tracking-[-0.045em]">{g.title}</h2>
                </div>
                <div className="grid gap-px overflow-hidden rounded-[28px] bg-line md:grid-cols-3">
                  {g.modules.map((m, i) => (
                    <Appear key={m.name} delay={i * 0.06} className="flex flex-col bg-warm p-7 transition-colors duration-300 hover:bg-white">
                      <h3 className="text-[20px] font-extrabold uppercase tracking-[-0.02em]">{m.name}</h3>
                      <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft/80">{m.text}</p>
                    </Appear>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Wide>
      </Section>

      <Roles />

      <section data-nav="light" aria-label="Sécurité" className="relative h-[80svh] min-h-[520px] overflow-hidden bg-terra-dark text-ivory">
        <MaskImage src="/photos/it-code-laptop.webp" alt="Ordinateur portable affichant du code" sizes="100vw" className="absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
        <Wide className="relative flex h-full flex-col justify-end gap-8 pb-14 md:flex-row md:items-end md:justify-between md:pb-20">
          <p className="max-w-[18ch] text-[clamp(2rem,5vw,5.4rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em]">
            Chaque organisation, <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra-peach">cloisonnée.</em>
          </p>
          <Cta href="/securite" variant="ivory" className="self-start md:self-auto">
            La sécurité
          </Cta>
        </Wide>
      </section>
    </>
  );
}
