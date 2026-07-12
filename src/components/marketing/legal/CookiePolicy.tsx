'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export function CookiePolicy() {
  const { locale } = useLocale();
  if (locale === 'en') return <CookiePolicyEn />;
  return <CookiePolicyFr />;
}

function CookiePolicyFr() {
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

function CookiePolicyEn() {
  return (
    <div>
      <p>
        <em className="text-white/50">
          This English version is provided for convenience. The French version prevails in the event of any
          discrepancy or dispute.
        </em>
      </p>
      <p>
        This <strong>Cookie Policy</strong> describes the trackers used on the <strong>Centrium</strong> platform,
        published by QuadCore SAS, as well as the choices available to you to manage them, in accordance with{' '}
        <strong>Article 82 of the French Data Protection Act</strong> and the recommendations of the{' '}
        <strong>CNIL</strong> (French data protection authority).
      </p>

      <h2>1. What is a cookie?</h2>
      <p>
        A cookie is a small text file placed on your device (computer, smartphone, tablet) when you visit a website. It
        makes it possible to recognize your browser, keep your session authenticated or remember certain preferences.
      </p>

      <h2>2. Cookies used by Centrium</h2>

      <h3>2.1 Strictly necessary cookies (exempt from consent)</h3>
      <p>
        These cookies are essential to the operation of the Platform. They do not require your prior consent.
      </p>
      <ul>
        <li><strong>sb-access-token / sb-refresh-token</strong> (Supabase) — authentication. Duration: session + 7 days.</li>
        <li><strong>__stripe_mid / __stripe_sid</strong> (Stripe, only during a payment) — fraud prevention. Duration: 1 year / 30 minutes.</li>
      </ul>
      <p>
        Abuse protection (rate limiting) is handled server-side, <strong>without any tracking cookie</strong>. Your
        language preferences and consent choices are not cookies: they are stored in your browser&apos;s{' '}
        <strong>local storage (localStorage)</strong>, under the keys <code>centrium-landing-locale</code> and{' '}
        <code>centrium-cookie-consent</code>.
      </p>

      <h3>2.2 Legal basis for trackers</h3>
      <p>
        The <strong>strictly necessary</strong> trackers above rely on the consent exemption provided for in{' '}
        <strong>Article 82, paragraph 2, of the French Data Protection Act</strong>. Any non-essential tracker
        (non-exempt audience measurement, communication) would be subject to your <strong>prior, free and unambiguous
        consent</strong> (Art. 6-1-a and 7 GDPR; Art. 82 of the Data Protection Act), collected via the banner and
        revocable at any time.
      </p>

      <h3>2.3 Audience measurement, advertising, social networks</h3>
      <p>
        As of the date of this policy, the Platform <strong>places no audience-measurement cookie</strong>, nor any
        cookie for advertising, profiling or social-network purposes. The &quot;audience measurement&quot; and
        &quot;communication&quot; categories that may appear in the preferences module are reserved for future
        evolution: where applicable, this policy will be updated and your consent collected <strong>before any
        placement</strong>.
      </p>

      <h3>2.4 Transfers outside the European Union</h3>
      <p>
        The Stripe trackers (fraud prevention) are placed by a provider whose processing may involve a transfer outside
        the EU. These transfers are covered by the <strong>appropriate safeguards</strong> of Chapter V of the GDPR
        (Commission Standard Contractual Clauses and/or the EU-US Data Privacy Framework). Copy on request at{' '}
        <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a>.
      </p>

      <h2>3. Managing your preferences</h2>
      <p>
        On first access, a banner lets you accept or refuse non-essential cookies, or customize your choices. Your
        preferences are stored in your browser&apos;s local storage for a maximum of <strong>13 months</strong> (CNIL
        recommendation) and can be changed at any time via the &quot;Manage my cookies&quot; link in the footer.
      </p>
      <p>You can also control cookies directly from your browser:</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/en-us/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
        <li><a href="https://support.microsoft.com/en-us/microsoft-edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
      </ul>
      <p>
        Refusing strictly necessary cookies may prevent certain essential features (notably authentication) from working
        correctly.
      </p>

      <h2>4. Retention period</h2>
      <p>
        The maximum retention period for a cookie is <strong>13 months</strong> in accordance with the CNIL
        recommendation. Upon expiry, your consent will be requested again.
      </p>

      <h2>5. Your rights</h2>
      <p>
        You may <strong>withdraw your consent</strong> to non-essential trackers at any time, as easily as you gave it,
        via the &quot;Manage my cookies&quot; link in the footer (Art. 7-3 GDPR). If you consider that the processing of
        your data is not compliant, you have the right to lodge a <strong>complaint with the CNIL</strong> (3 place de
        Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>), in accordance with
        Article 77 of the GDPR.
      </p>

      <h2>6. Contact</h2>
      <p>
        For any question about cookies, write to{' '}
        <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a> or consult our{' '}
        <a href="/legal/privacy" className="text-magenta hover:underline">Privacy Policy</a>.
      </p>

      <hr />
      <p className="text-sm text-white/50"><em>Last updated: July 2026</em></p>
    </div>
  );
}
