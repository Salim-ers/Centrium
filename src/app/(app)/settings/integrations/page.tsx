'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { IntegrationsPanel } from '@/components/finance/IntegrationsPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/** Paramètres › Intégrations : webhook signé ; l'export CSV vit dans le pilotage financier. */
export default function IntegrationsSettingsPage() {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const { can } = usePermissions();
  return (
    <AppShell>
      <PageHeader
        title={fr ? 'Intégrations' : 'Integrations'}
        description={fr ? 'Webhook signé vers votre système. L’export comptable (CSV) se fait depuis le pilotage financier.' : 'Signed webhook to your system. Accounting export (CSV) lives in the financial overview.'}
        actions={
          can('finance.view') && (
            <Button asChild variant="secondary">
              <Link href="/finance?view=export">
                {fr ? 'Export comptable' : 'Accounting export'}
                <ArrowRight />
              </Link>
            </Button>
          )
        }
      />
      <IntegrationsPanel lang={fr ? 'fr' : 'en'} canManage={can('settings.manage')} />
    </AppShell>
  );
}
