import { Suspense } from 'react';

import { PasswordSetupForm } from '@/components/auth/PasswordSetupForm';

// =========================================================================
// /auth/first-password — création du PREMIER mot de passe après invitation
// (membre d'organisation ou consultant). La session a été posée par
// /auth/callback (verifyOtp) juste avant d'arriver ici.
//   ?welcome=portal   → copie consultant
//   ?welcome=invited  → copie membre (+ ?org=Nom)
//   ?error=link_expired|invalid_link → carte d'erreur avec issue de secours
// =========================================================================

export const metadata = { title: 'Créer mon mot de passe — Centrium' };

export default function FirstPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordSetupForm mode="first" />
    </Suspense>
  );
}
