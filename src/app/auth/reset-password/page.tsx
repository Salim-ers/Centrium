import { Suspense } from 'react';

import { PasswordSetupForm } from '@/components/auth/PasswordSetupForm';

// =========================================================================
// /auth/reset-password — réinitialisation après "mot de passe oublié".
// La session a été posée par /auth/callback (verifyOtp type=recovery).
//   ?error=link_expired|invalid_link → carte d'erreur avec renvoi de lien
// =========================================================================

export const metadata = { title: 'Réinitialiser mon mot de passe — Centrium' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordSetupForm mode="reset" />
    </Suspense>
  );
}
