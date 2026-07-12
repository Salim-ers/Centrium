'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';

import { ProvisionClientDialog } from '@/components/admin/ProvisionClientDialog';
import { PageHeader, AppCard, AppCardBody } from '@/components/app';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/**
 * Page super_admin dédiée à la création d'une organisation client.
 *
 * Accessible uniquement aux users avec role='super_admin' (middleware
 * Next.js bloque les autres et le check est répété côté API).
 *
 * UX : ouvre le dialog complet en plein écran dès le mount. Quand l'admin
 * a terminé (succès ou abandon), retour à /admin/clients qui affiche la
 * liste des orgs créées + des demandes de devis en attente.
 */
export default function AdminNewOrgPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [dialogOpen, setDialogOpen] = useState(true);

  // Fermeture du dialog = retour à la liste
  useEffect(() => {
    if (!dialogOpen) {
      router.push('/admin/clients');
    }
  }, [dialogOpen, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {isEn ? 'Back to client list' : 'Retour à la liste des clients'}
          </Link>

          <PageHeader
            eyebrow="Admin · Super-admin only"
            title={
              isEn ? (
                <>
                  Create a new{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    client workspace
                  </span>
                </>
              ) : (
                <>
                  Créer un nouvel{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    espace client
                  </span>
                </>
              )
            }
            description={
              isEn
                ? 'Provision a client IT-services company with its branding, legal notices and first admin. The full form opens automatically.'
                : "Provisionne une organisation ESN cliente avec son branding, ses mentions légales et son premier admin. Le formulaire complet s'ouvre automatiquement."
            }
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <AppCard>
            <AppCardBody>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {isEn ? 'Step 1 — Identity' : 'Étape 1 — Identité'}
              </div>
              <p className="text-sm text-foreground/85">
                {isEn
                  ? 'Legal name, URL slug, visual branding (logo, colors, signature), footer tagline.'
                  : 'Nom légal, slug URL, branding visuel (logo, couleurs, signature), tagline footer.'}
              </p>
            </AppCardBody>
          </AppCard>

          <AppCard>
            <AppCardBody>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {isEn ? 'Step 2 — Legal notices' : 'Étape 2 — Mentions légales'}
              </div>
              <p className="text-sm text-foreground/85">
                {isEn
                  ? 'SIREN, SIRET, VAT, RCS, capital, head-office address, signatory, bank details.'
                  : 'SIREN, SIRET, TVA, RCS, capital, adresse siège, signataire, coordonnées bancaires.'}
              </p>
            </AppCardBody>
          </AppCard>

          <AppCard>
            <AppCardBody>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {isEn ? 'Step 3 — First admin' : 'Étape 3 — Premier admin'}
              </div>
              <p className="text-sm text-foreground/85">
                {isEn ? (
                  <>
                    Email + name of the admin contact. They will receive an
                    invitation email with a password-creation link.
                  </>
                ) : (
                  <>
                    Email + nom du contact admin. Recevra un email d&apos;invitation
                    avec un lien de création de mot de passe.
                  </>
                )}
              </p>
            </AppCardBody>
          </AppCard>
        </div>

        {/* Bouton fallback si le dialog est fermé */}
        {!dialogOpen && (
          <div className="flex justify-center">
            <Button onClick={() => setDialogOpen(true)} className="qc-cta">
              <Sparkles className="h-4 w-4 mr-2" />
              {isEn ? 'Open the creation form' : 'Ouvrir le formulaire de création'}
            </Button>
          </div>
        )}

        <ProvisionClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          quoteRequest={null}
          onProvisioned={() => {
            // Redirection après succès — le dialog se ferme déjà via onOpenChange
            router.push('/admin/clients');
          }}
        />
      </div>
    </div>
  );
}
