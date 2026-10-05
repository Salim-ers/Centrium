import { Cta, FlowLine, Kicker, Section, Title, Wide } from '../kit';

/** Dernier appel, plein terracotta, avec la ligne signature du cycle. */
export function Closing() {
  return (
    <Section tone="terra" aria-label="Essayer Centrium" className="overflow-hidden py-24 md:py-36">
      <Wide>
        <Kicker>Votre tour</Kicker>
        <Title size="xl" className="mt-6 max-w-[14ch] text-[clamp(2.6rem,7vw,8.5rem)]" lines={[['Essayez-le sur'], ['vos propres ', { em: 'dossiers.' }]]} />
        <FlowLine light className="mt-16 max-w-5xl" />
        <div className="mt-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <ul className="space-y-1.5 text-[15px] text-ivory/85">
            <li>Essai de 7 jours</li>
            <li>Tous les modules dans chaque offre</li>
            <li>Données hébergées dans l’Union européenne</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Cta href="/demo" variant="ivory">
              Demander une démo
            </Cta>
            <Cta href="/essai" variant="outline-light">
              Essayer 7 jours
            </Cta>
          </div>
        </div>
      </Wide>
    </Section>
  );
}
