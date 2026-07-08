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

      <h3>2.2 Cookies de mesure d&apos;audience (soumis au consentement si non anonymisés)</h3>
      <p>
        Lorsqu&apos;ils sont activés, ces cookies permettent d&apos;établir des statistiques de fréquentation. Centrium
        privilégie des outils de mesure d&apos;audience <strong>exemptés de consentement</strong> (configuration
        anonymisée, durée de vie courte, absence de croisement, pas de transfert hors UE) conformément à la
        recommandation CNIL.
      </p>

      <h3>2.3 Absence de cookies publicitaires et de réseaux sociaux</h3>
      <p>
        La Plateforme <strong>n&apos;utilise aucun cookie</strong> à finalité publicitaire, de profilage, ni de réseau
        social.
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

      <h2>5. Contact</h2>
      <p>
        Pour toute question relative aux cookies, écrivez à{' '}
        <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a> ou consultez notre{' '}
        <strong>Politique de confidentialité</strong>.
      </p>

      <hr />
      <p className="text-sm text-white/50"><em>Dernière mise à jour : avril 2026</em></p>
    </div>
  );
}
