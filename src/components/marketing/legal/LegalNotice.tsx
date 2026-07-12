'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export function LegalNotice() {
  const { locale } = useLocale();
  if (locale === 'en') return <LegalNoticeEn />;
  return <LegalNoticeFr />;
}

function LegalNoticeFr() {
  return (
    <div>
      <p>
        Conformément aux dispositions des articles 6-III et 19 de la{' '}
        <strong>Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l&apos;Économie Numérique (LCEN)</strong>,
        il est précisé aux utilisateurs de la plateforme <strong>Centrium</strong> (ci-après « la Plateforme »)
        l&apos;identité des différents intervenants dans le cadre de sa réalisation et de son suivi.
      </p>
      <p>
        <strong>Centrium</strong> est une marque et une plateforme SaaS éditée par <strong>QuadCore SAS</strong>.
      </p>

      <h2>1. Éditeur de la Plateforme</h2>
      <ul>
        <li><strong>Marque / plateforme :</strong> Centrium est une marque éditée par QuadCore SAS</li>
        <li><strong>Dénomination sociale :</strong> QuadCore SAS</li>
        <li><strong>Forme juridique :</strong> Société par Actions Simplifiée (SAS)</li>
        <li><strong>Capital social :</strong> 1 000,00 €</li>
        <li><strong>Siège social :</strong> 5 Rue du Docteur Roux, 60180 Nogent-sur-Oise, France</li>
        <li><strong>Président / Directeur de la publication :</strong> Mouhamad Moustakine</li>
        <li><strong>RCS :</strong> 101 694 016 R.C.S. Compiègne</li>
        <li><strong>SIREN :</strong> 101 694 016</li>
        <li><strong>Identifiant européen (EUID) :</strong> FR6002.101694016</li>
        <li><strong>N° TVA intracommunautaire :</strong> FR85 101 694 016</li>
        <li><strong>Date d&apos;immatriculation :</strong> 18 mars 2026</li>
        <li><strong>Greffe :</strong> Tribunal de Commerce de Compiègne — 2 Rue du Dahomey, 60200 Compiègne (n° de gestion 2026B00505)</li>
        <li><strong>E-mail :</strong> contact@centrium-platform.com</li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>La Plateforme est hébergée par les prestataires suivants :</p>
      <ul>
        <li>
          <strong>Frontend applicatif :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis —
          hébergement des fonctions edge et CDN (réseau mondial, calcul primaire en région européenne). Société
          américaine : les éventuels transferts hors UE sont encadrés par les Clauses Contractuelles Types (CCT/SCC).
        </li>
        <li>
          <strong>Base de données & authentification :</strong> Supabase, Inc., 970 Toa Payoh N, Singapore —
          instances et données stockées en région <strong>eu-north-1 (Stockholm, Suède — UE)</strong>.
        </li>
        <li>
          <strong>Stockage fichiers (CV, documents) :</strong> Supabase Storage, région UE.
        </li>
        <li>
          <strong>Paiement :</strong> Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin,
          Irlande.
        </li>
        <li>
          <strong>IA / Traitement CV :</strong> Anthropic PBC, 548 Market St, PMB 90375, San Francisco, CA, États-Unis —
          sous Clauses Contractuelles Types (CCT) de la Commission européenne.
        </li>
      </ul>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments de la Plateforme (marque <strong>Centrium</strong>, logo, charte graphique,
        templates CV propriétaires, interfaces, textes, illustrations, code source, bases de données) est la propriété
        exclusive de QUADCORE SAS ou fait l&apos;objet d&apos;une licence d&apos;usage régulière.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments de la
        Plateforme, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de
        QUADCORE SAS, sous peine de constituer une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code
        de la propriété intellectuelle.
      </p>

      <h2>4. Responsabilité</h2>
      <p>
        QUADCORE s&apos;efforce d&apos;assurer au mieux de ses possibilités l&apos;exactitude et la mise à jour des
        informations diffusées sur la Plateforme. QUADCORE ne saurait cependant garantir l&apos;exactitude, la précision
        ou l&apos;exhaustivité des informations mises à disposition.
      </p>
      <p>
        QUADCORE ne pourra être tenue responsable des dommages directs ou indirects, quelle qu&apos;en soit la cause,
        l&apos;origine, la nature ou la conséquence, résultant de l&apos;accès ou de l&apos;utilisation de la
        Plateforme, à l&apos;exception des cas expressément prévus par les <strong>Conditions Générales
        d&apos;Utilisation</strong> et les <strong>Conditions Générales de Services</strong>.
      </p>

      <h2>5. Liens hypertextes</h2>
      <p>
        La Plateforme peut contenir des liens hypertextes vers d&apos;autres sites. QUADCORE n&apos;exerce aucun
        contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>6. Droit applicable et juridiction compétente</h2>
      <p>
        Les présentes mentions légales sont régies par le <strong>droit français</strong>. En cas de litige, et à défaut
        de résolution amiable, compétence exclusive est attribuée aux tribunaux du ressort du siège social de QUADCORE
        SAS, sauf disposition impérative contraire.
      </p>

      <h2>7. Médiation de la consommation</h2>
      <p>
        La Plateforme étant exclusivement destinée à une clientèle professionnelle (<strong>B2B</strong>), les
        dispositions relatives à la médiation de la consommation ne sont pas applicables. Tout différend fera
        l&apos;objet d&apos;une tentative de résolution amiable préalable conformément aux CGU.
      </p>

      <h2>8. Accessibilité & signalement</h2>
      <p>
        Pour toute question, signalement de contenu illicite ou demande de modification, contactez-nous à{' '}
        <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a>.
      </p>

      <hr />
      <p className="text-sm text-white/50"><em>Dernière mise à jour : avril 2026</em></p>
    </div>
  );
}

function LegalNoticeEn() {
  return (
    <div>
      <p>
        <em className="text-white/50">
          This English version is provided for convenience. The French version prevails in the event of any
          discrepancy or dispute.
        </em>
      </p>
      <p>
        In accordance with Articles 6-III and 19 of French{' '}
        <strong>Act No. 2004-575 of 21 June 2004 on Confidence in the Digital Economy (LCEN)</strong>, users of the{' '}
        <strong>Centrium</strong> platform (hereinafter the &quot;Platform&quot;) are informed of the identity of the
        various parties involved in its creation and operation.
      </p>
      <p>
        <strong>Centrium</strong> is a brand and SaaS platform published by <strong>QuadCore SAS</strong>.
      </p>

      <h2>1. Platform publisher</h2>
      <ul>
        <li><strong>Brand / platform:</strong> Centrium is a brand published by QuadCore SAS</li>
        <li><strong>Company name:</strong> QuadCore SAS</li>
        <li><strong>Legal form:</strong> Simplified Joint-Stock Company (SAS)</li>
        <li><strong>Share capital:</strong> €1,000.00</li>
        <li><strong>Registered office:</strong> 5 Rue du Docteur Roux, 60180 Nogent-sur-Oise, France</li>
        <li><strong>President / Publication director:</strong> Mouhamad Moustakine</li>
        <li><strong>Trade register:</strong> 101 694 016 R.C.S. Compiègne</li>
        <li><strong>SIREN:</strong> 101 694 016</li>
        <li><strong>European identifier (EUID):</strong> FR6002.101694016</li>
        <li><strong>Intra-EU VAT number:</strong> FR85 101 694 016</li>
        <li><strong>Registration date:</strong> 18 March 2026</li>
        <li><strong>Registry:</strong> Compiègne Commercial Court — 2 Rue du Dahomey, 60200 Compiègne (file no. 2026B00505)</li>
        <li><strong>Email:</strong> contact@centrium-platform.com</li>
      </ul>

      <h2>2. Hosting</h2>
      <p>The Platform is hosted by the following providers:</p>
      <ul>
        <li>
          <strong>Application frontend:</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, United States —
          hosting of edge functions and CDN (global network, primary compute in a European region). US company: any
          transfers outside the EU are covered by Standard Contractual Clauses (SCCs).
        </li>
        <li>
          <strong>Database &amp; authentication:</strong> Supabase, Inc., 970 Toa Payoh N, Singapore — instances and
          data stored in region <strong>eu-north-1 (Stockholm, Sweden — EU)</strong>.
        </li>
        <li>
          <strong>File storage (CVs, documents):</strong> Supabase Storage, EU region.
        </li>
        <li>
          <strong>Payment:</strong> Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin,
          Ireland.
        </li>
        <li>
          <strong>AI / CV processing:</strong> Anthropic PBC, 548 Market St, PMB 90375, San Francisco, CA, United States
          — under the European Commission&apos;s Standard Contractual Clauses (SCCs).
        </li>
      </ul>

      <h2>3. Intellectual property</h2>
      <p>
        All elements of the Platform (the <strong>Centrium</strong> brand, logo, visual identity, proprietary CV
        templates, interfaces, texts, illustrations, source code, databases) are the exclusive property of QUADCORE SAS
        or are used under a valid license.
      </p>
      <p>
        Any reproduction, representation, modification, publication or adaptation of all or part of the Platform&apos;s
        elements, by any means or process, is prohibited without prior written authorization from QUADCORE SAS, on pain
        of constituting infringement punishable under Articles L.335-2 et seq. of the French Intellectual Property Code.
      </p>

      <h2>4. Liability</h2>
      <p>
        QUADCORE endeavors, to the best of its ability, to ensure the accuracy and updating of the information published
        on the Platform. QUADCORE cannot, however, guarantee the accuracy, precision or completeness of the information
        provided.
      </p>
      <p>
        QUADCORE may not be held liable for direct or indirect damages, whatever the cause, origin, nature or
        consequence, resulting from access to or use of the Platform, except in the cases expressly provided for by the{' '}
        <strong>Terms of Use</strong> and the <strong>Terms of Service</strong>.
      </p>

      <h2>5. Hyperlinks</h2>
      <p>
        The Platform may contain hyperlinks to other sites. QUADCORE exercises no control over these sites and disclaims
        any liability for their content.
      </p>

      <h2>6. Governing law and competent jurisdiction</h2>
      <p>
        This legal notice is governed by <strong>French law</strong>. In the event of a dispute, and failing amicable
        resolution, exclusive jurisdiction is granted to the courts of the registered office of QUADCORE SAS, unless a
        mandatory provision states otherwise.
      </p>

      <h2>7. Consumer mediation</h2>
      <p>
        As the Platform is exclusively intended for professional customers (<strong>B2B</strong>), the provisions
        relating to consumer mediation do not apply. Any dispute will be subject to a prior attempt at amicable
        resolution in accordance with the Terms.
      </p>

      <h2>8. Accessibility &amp; reporting</h2>
      <p>
        For any question, report of unlawful content or modification request, contact us at{' '}
        <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a>.
      </p>

      <hr />
      <p className="text-sm text-white/50"><em>Last updated: April 2026</em></p>
    </div>
  );
}
