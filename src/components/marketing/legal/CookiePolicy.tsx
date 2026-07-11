export function CookiePolicy() {
  return (
    <div>
      <p>
        La présente <strong>Politique de cookies</strong> décrit les traceurs utilisés sur la plateforme
        <strong> Centrium</strong>, éditée par QuadCore SAS, ainsi que les choix dont vous disposez pour les gérer,
        conformément à l&apos;<strong>article 82 de la Loi Informatique et Libertés</strong> et aux recommandations de
        la <strong>CNIL</strong>.
      </p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) lors de la
        consultation d&apos;un site web. Il permet de reconnaître votre navigateur, de maintenir votre session
        authentifiée ou de mémoriser certaines préférences.
      </p>

      <h2>2. Cookies utilisés par Centrium</h2>

      <h3>2.1 Cookies strictement nécessaires (exemptés de consentement)</h3>
      <p>
        Ces cookies sont indispensables au fonctionnement de la Plateforme. Ils ne nécessitent pas votre consentement
        préalable.
      </p>
      <ul>
        <li><strong>sb-access-token / sb-refresh-token</strong> (Supabase) — authentification. Durée : session + 7 jours.</li>
        <li><strong>__stripe_mid / __stripe_sid</strong> (Stripe, uniquement lors d&apos;un paiement) — prévention de la fraude. Durée : 1 an / 30 minutes.</li>
      </ul>
      <p>
        La protection contre les abus (limitation de débit) est assurée côté serveur, <strong>sans dépôt de cookie de
        traçage</strong>. Vos préférences de langue et vos choix de consentement ne sont pas des cookies : ils sont
        stockés dans le <strong>stockage local (localStorage)</strong> de votre navigateur, sous les clés{' '}
        <code>centrium-landing-locale</code> et <code>centrium-cookie-consent</code>.
      </p>

      <h3>2.2 Base légale des traceurs</h3>
      <p>
        Les traceurs <strong>strictement nécessaires</strong> ci-dessus reposent sur l&apos;exemption de consentement
        prévue à l&apos;<strong>article 82, alinéa 2, de la Loi Informatique et Libertés</strong>. Tout traceur non
        essentiel (mesure d&apos;audience non exemptée, communication) serait subordonné à votre{' '}
        <strong>consentement préalable</strong>, libre et univoque (art. 6-1-a et 7 du RGPD ; art. 82 LIL), recueilli
        via le bandeau et révocable à tout moment.
      </p>

      <h3>2.3 Mesure d&apos;audience, publicité, réseaux sociaux</h3>
      <p>
        À la date de la présente politique, la Plateforme <strong>ne dépose aucun cookie de mesure d&apos;audience</strong>,
        ni aucun cookie à finalité publicitaire, de profilage ou de réseau social. Les catégories « mesure
        d&apos;audience » et « communication » éventuellement présentes dans le module de préférences sont réservées à une
        évolution future : le cas échéant, la présente politique sera mise à jour et votre consentement recueilli{' '}
        <strong>avant tout dépôt</strong>.
      </p>

      <h3>2.4 Transferts hors Union européenne</h3>
      <p>
        Les traceurs Stripe (prévention de la fraude) sont déposés par un prestataire dont des traitements peuvent
        impliquer un transfert hors UE. Ces transferts sont encadrés par les <strong>garanties appropriées</strong> du
        chapitre V du RGPD (clauses contractuelles types de la Commission et/ou EU-US Data Privacy Framework). Copie sur
        demande à <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a>.
      </p>

      <h2>3. Gestion de vos préférences</h2>
      <p>
        Au premier accès, un bandeau vous permet d&apos;accepter ou de refuser les cookies non essentiels, ou de
        personnaliser vos choix. Vos préférences sont enregistrées dans le stockage local de votre navigateur pour une
        durée maximale de <strong>13 mois</strong> (recommandation CNIL) et sont modifiables à tout moment depuis le lien
        « Gérer mes cookies » du pied de page.
      </p>
      <p>Vous pouvez également contrôler les cookies directement depuis votre navigateur :</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
        <li><a href="https://support.microsoft.com/fr-fr/microsoft-edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
      </ul>
      <p>
        Le refus des cookies strictement nécessaires peut empêcher certaines fonctionnalités essentielles
        (authentification notamment) de fonctionner correctement.
      </p>

      <h2>4. Durée de conservation</h2>
      <p>
        La durée maximale de conservation d&apos;un cookie est de <strong>13 mois</strong> conformément à la
        recommandation CNIL. À l&apos;expiration, votre consentement vous sera redemandé.
      </p>

      <h2>5. Vos droits</h2>
      <p>
        Vous pouvez <strong>retirer votre consentement</strong> aux traceurs non essentiels à tout moment, aussi
        facilement que vous l&apos;avez donné, via le lien « Gérer mes cookies » du pied de page (art. 7-3 du RGPD). Si
        vous estimez que le traitement de vos données n&apos;est pas conforme, vous disposez du droit d&apos;introduire
        une <strong>réclamation auprès de la CNIL</strong> (3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>), conformément à
        l&apos;article 77 du RGPD.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question relative aux cookies, écrivez à{' '}
        <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a> ou consultez notre{' '}
        <a href="/legal/privacy" className="text-magenta hover:underline">Politique de confidentialité</a>.
      </p>

      <hr />
      <p className="text-sm text-white/50"><em>Dernière mise à jour : juillet 2026</em></p>
    </div>
  );
}
