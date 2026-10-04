import { DASHBOARD_H, DASHBOARD_W, ProductDashboard } from '../ProductDashboard';
import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { Appear, Cta, FlowLine, Kicker, Lead, MaskImage, Section, Title, Wide } from '../kit';

type Module = { name: string; text: string; points: string[] };
const GROUPS: Array<{ n: string; title: string; modules: Module[] }> = [
  {
    n: '01',
    title: 'Commerce',
    modules: [
      { name: 'CRM', text: 'Contacts, sociétés et opportunités dans un pipeline par étape.', points: ['Clients, prospects et ESN partenaires', 'Montant, probabilité, pipeline pondéré', 'Tâches de relance automatiques'] },
      { name: 'Clients', text: 'Une fiche par client, qui rassemble tout ce qui le concerne.', points: ['Missions, CA et marge', 'Documents et devis', 'Demandes déposées depuis son portail'] },
      { name: 'Devis & documents', text: 'Des devis construits sur vos modèles, des documents privés et versionnés.', points: ['Modèles de devis', 'Versions conservées', 'Partage choisi avec le client ou le consultant'] },
    ],
  },
  {
    n: '02',
    title: 'Talents',
    modules: [
      { name: 'Consultants', text: 'La fiche de chaque consultant : compétences, séniorité, disponibilité, CV.', points: ['Salariés et indépendants', 'Compétences et langues', 'Documents rattachés'] },
      { name: 'Staffing', text: 'Missions, fins de mission, congés et propositions sur une même ligne de temps.', points: ['Disponibilités à venir', 'Consultants en intercontrat', 'Propositions en cours'] },
      { name: 'Matching', text: 'Un score sur 100 pour chaque besoin, calculé sur sept critères visibles.', points: ['Compétences requises et souhaitées', 'Disponibilité, séniorité, TJM', 'Langues et localisation'] },
    ],
  },
  {
    n: '03',
    title: 'Production',
    modules: [
      { name: 'Missions', text: 'Dates, consultant, TJM de vente et coût : la marge de chaque mission.', points: ['Créées depuis l’opportunité gagnée', 'Alertes de fin à 90, 60, 30 et 15 jours', 'Suivi de l’avancement'] },
      { name: 'CRA', text: 'Un calendrier mensuel, rempli par le consultant, validé par vous.', points: ['Télétravail jour par jour', 'Validation ou demande de correction', 'Approbation du client sur son portail'] },
      { name: 'Préfacturation', text: 'Les jours validés deviennent des préfactures, prêtes à reprendre.', points: ['Calcul jours × TJM', 'Document imprimable', 'Suivi par mission et par client'] },
    ],
  },
  {
    n: '04',
    title: 'Pilotage',
    modules: [
      { name: 'Tableau de bord', text: 'CA signé, marge, à traiter, activité, staffing et pipeline sur un écran.', points: ['Tendances sur douze mois', 'Éléments à traiter du jour', 'Meilleurs clients et pipeline'] },
      { name: 'Analytics', text: 'Les analyses qui pilotent une ESN, calculées sur vos données.', points: ['Occupation des consultants', 'CA par consultant, motifs de perte', 'Ponctualité des CRA, devis'] },
      { name: 'Automatisations', text: 'Sept règles qui surveillent les échéances et préviennent la bonne personne.', points: ['Fins de mission, CRA manquants ou à valider', 'Opportunités sans activité, devis à échéance', 'Activables règle par règle'] },
    ],
  },
  {
    n: '05',
    title: 'Ouverture',
    modules: [
      { name: 'Portail client', text: 'Votre client suit ses missions et dépose ses besoins.', points: ['Missions, CRA, devis, documents', 'Nouveau besoin → opportunité', 'Accès révocable à tout moment'] },
      { name: 'Portail consultant', text: 'Le consultant retrouve sa mission, son CRA et ses documents.', points: ['Saisie du CRA', 'Contrats et documents partagés', 'Ni TJM de vente, ni marge, ni notes internes'] },
      { name: 'Rôles & recherche', text: 'Chacun voit ce que son rôle permet, et trouve tout en un raccourci.', points: ['Admin, business manager, recruteur, finance', 'Permissions vérifiées côté serveur', 'Recherche globale ⌘K'] },
    ],
  },
];

/** Page Plateforme (Produit) : le cycle, puis les modules. */
export function Platform() {
  return (
    <>
      <Section tone="deep" aria-label="Plateforme" className="overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
        <Wide>
          <Kicker n="01">Plateforme</Kicker>
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
              <Kicker n="02">Fonctionnalités</Kicker>
              <Title size="lg" className="mt-6" lines={[['Quinze modules.'], ['Un seul ', { em: 'flux.' }]]} />
            </div>
            <Lead className="lg:justify-self-end">Tous inclus dans chaque offre. Aucun module en option.</Lead>
          </div>

          <div className="mt-20 space-y-24">
            {GROUPS.map((g) => (
              <div key={g.n} className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <div className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra">{g.n}</div>
                  <h2 className="mt-2 text-[clamp(2rem,3.4vw,3.4rem)] font-extrabold uppercase leading-none tracking-[-0.045em]">{g.title}</h2>
                </div>
                <div className="grid gap-px overflow-hidden rounded-[28px] bg-line md:grid-cols-3">
                  {g.modules.map((m, i) => (
                    <Appear key={m.name} delay={i * 0.06} className="flex flex-col bg-warm p-7">
                      <h3 className="text-[20px] font-extrabold uppercase tracking-[-0.02em]">{m.name}</h3>
                      <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft/80">{m.text}</p>
                      <ul className="mt-6 space-y-2 border-t border-line pt-5 text-[14px]">
                        {m.points.map((p) => (
                          <li key={p} className="flex gap-2.5">
                            <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-terra" aria-hidden />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </Appear>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Wide>
      </Section>

      <section data-nav="light" aria-label="Sécurité" className="relative h-[80svh] min-h-[520px] overflow-hidden bg-terra-dark text-ivory">
        <MaskImage src="/photos/terracotta-balconies.webp" alt="Façade aux balcons en terre cuite" sizes="100vw" className="absolute inset-0" />
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
