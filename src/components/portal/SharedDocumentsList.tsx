'use client';

import { Download, FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DOCUMENT_KIND } from '@/lib/status';
import { formatDate } from '@/lib/format';

type SharedDoc = {
  id: string;
  version: number;
  kind: string;
  title: string;
  description: string | null;
  file_name: string | null;
  size_bytes: number | null;
  created_at: string;
};

function size(n: number | null) {
  if (!n) return '';
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

/**
 * Documents partagés par l'ESN avec l'utilisateur du portail. La liste et
 * les téléchargements passent par des routes serveur qui vérifient le
 * rattachement et la visibilité (`endpoint` + `/:id`).
 */
export function SharedDocumentsList({ endpoint, cacheKey }: { endpoint: string; cacheKey: string }) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<SharedDoc[]>(cacheKey, async () => {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: SharedDoc[] };
    return json.data ?? [];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fr ? 'Documents partagés avec vous' : 'Documents shared with you'}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading && !data ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data?.length ? (
          <p className="px-5 pb-5 text-[13px] text-muted-foreground">{fr ? 'Aucun document partagé pour le moment.' : 'No shared documents yet.'}</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {data.map((d) => (
              <li key={d.id}>
                <a href={`${endpoint}/${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{d.title}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {DOCUMENT_KIND[d.kind]?.[lang] ?? d.kind} · {formatDate(d.created_at, lang)}
                      {d.size_bytes ? ` · ${size(d.size_bytes)}` : ''}
                    </span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-primary-deep" aria-label={fr ? 'Télécharger' : 'Download'} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
