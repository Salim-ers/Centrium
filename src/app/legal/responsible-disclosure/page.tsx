import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';

export const metadata: Metadata = {
  title: 'Divulgation responsable',
  description:
    'Politique de divulgation responsable Centrium : comment signaler une vulnérabilité, ce qu\'on s\'engage à faire, hors-scope.',
  alternates: { canonical: '/legal/responsible-disclosure' },
};

export default function ResponsibleDisclosurePage() {
  return (
    <LegalShell
      title="Politique de divulgation responsable"
      updatedAt="4 juin 2026"
      currentSlug="privacy"
    >
      <p>
        Nous prenons la sécurité de Centrium très au sérieux. Si tu as identifié
        une vulnérabilité, nous voulons en être informés rapidement pour la
        corriger et protéger nos utilisateurs.
      </p>

      <h2>Comment nous signaler une vulnérabilité</h2>
      <ol>
        <li>
          Envoie un email à <a href="mailto:security@centrium-platform.com">security@centrium-platform.com</a>
        </li>
        <li>Décris la vulnérabilité, les étapes pour la reproduire, l&apos;impact estimé</li>
        <li>Inclus ta preuve de concept (vidéo, captures, requêtes HTTP)</li>
        <li>Ne divulgue PAS publiquement avant qu&apos;on ait confirmé un correctif</li>
      </ol>

      <h2>Notre engagement (Safe Harbor)</h2>
      <p>
        Tant que tu respectes cette politique, nous nous engageons à :
      </p>
      <ul>
        <li>Accuser réception sous <strong>48h ouvrées</strong></li>
        <li>Trier et évaluer la vulnérabilité sous <strong>7 jours</strong></li>
        <li>Te tenir informé de l&apos;avancement</li>
        <li>
          Déployer un correctif selon la criticité : 24h (critique), 7 jours
          (haute), 30 jours (moyenne), 90 jours (basse)
        </li>
        <li>
          Te reconnaître publiquement dans notre Hall of Fame si tu le souhaites
        </li>
        <li>
          Ne PAS engager de poursuites judiciaires si tes recherches sont de
          bonne foi, ciblent uniquement TES propres données ou un compte de
          test, et respectent la loi française et européenne
        </li>
      </ul>

      <h2>Périmètre concerné</h2>
      <p>Sont dans le périmètre :</p>
      <ul>
        <li>Le domaine <code>centrium-platform.com</code> et tous ses sous-domaines</li>
        <li>L&apos;API REST Centrium (<code>/api/*</code>)</li>
        <li>Les composants techniques que nous opérons directement</li>
      </ul>

      <h2>Hors-scope</h2>
      <ul>
        <li>Attaques nécessitant un accès physique à nos serveurs</li>
        <li>Ingénierie sociale contre nos employés ou nos clients</li>
        <li>Spam, déni de service (DDoS), brute-force sans impact réel</li>
        <li>
          Vulnérabilités dans nos sous-traitants (Supabase, Vercel, Anthropic,
          Stripe, Resend) — reporte directement chez eux, leurs programmes
          bug bounty sont publics
        </li>
        <li>Findings de scanners automatisés sans démonstration d&apos;impact</li>
        <li>
          Headers HTTP manquants sans démonstration d&apos;exploitabilité
          (ex: "missing X-Content-Type-Options")
        </li>
        <li>Self-XSS (ne touche que le compte du chercheur)</li>
      </ul>

      <h2>Bug Bounty</h2>
      <p>
        Notre programme de Bug Bounty rémunéré est en cours de mise en place
        (lancement prévu Q4 2026 sur YesWeHack). En attendant, les chercheurs
        qui contribuent significativement reçoivent des goodies et une mise en
        avant publique.
      </p>

      <h2>Hall of Fame</h2>
      <p>
        Notre Hall of Fame est en cours de constitution. Si tu nous as déjà
        signalé une vulnérabilité, merci ! Tu peux nous demander d&apos;y figurer
        à l&apos;adresse{' '}
        <a href="mailto:security@centrium-platform.com">security@centrium-platform.com</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Toute question sur cette politique :{' '}
        <a href="mailto:security@centrium-platform.com">security@centrium-platform.com</a>
      </p>
    </LegalShell>
  );
}
