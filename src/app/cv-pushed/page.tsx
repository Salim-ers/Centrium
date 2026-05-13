'use client';

import Link from 'next/link';
import { Send, Eye, Undo2, Search, UserCircle, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TalentTabs } from '@/components/consultants/TalentTabs';

import {
  consultantService,
  type ConsultantListItem,
} from '@/lib/services/consultant.service';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { SENIORITY_LABEL } from '@/constants';
import { formatCurrency, relativeDate } from '@/lib/utils';
import { notifyDestructive, notifyError } from '@/lib/notify';

/**
 * Page "CV poussés" — transversale bibliothèque + vivier.
 *
 * Liste les consultants ET prospects dont le CV a été envoyé (cv_pushed=true).
 * Action principale : "Retirer" pour démarquer un profil quand il a été
 * rejeté / la mission est tombée / on veut le pousser ailleurs.
 */
export default function CvPushedPage() {
  const { activeOrgId } = useOrganization();
  const [search, setSearch] = useState('');

  const {
    data: pushedData,
    loading,
    setData,
  } = useCachedQuery<ConsultantListItem[]>(
    `cv-pushed:${activeOrgId ?? 'none'}:${search.toLowerCase()}`,
    async () => {
      const res = await consultantService.list({
        cv_pushed: true,
        is_prospect: 'all',
        archived: 'all',
        search: search.trim() || undefined,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const pushed = pushedData ?? [];

  async function unmark(c: ConsultantListItem) {
    if (
      !confirm(
        `Retirer ${c.first_name} ${c.last_name} de la liste "CV poussés" ?`,
      )
    )
      return;
    const res = await consultantService.toggleCvPushed(c.id, false);
    if (res.error || !res.data) {
      notifyError('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    setData((prev) => (prev ?? []).filter((x) => x.id !== c.id));
    notifyDestructive(`${c.first_name} ${c.last_name} retiré des CV poussés`);
  }

  return (
    <AppShell>
      <TalentTabs active="cv-pushed" counts={{ cvPushed: pushed.length }} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Send className="h-7 w-7 text-magenta-neon" />
            CV poussés
          </h1>
          <p className="text-muted-foreground mt-1">
            {pushed.length} profil{pushed.length > 1 ? 's' : ''} positionné
            {pushed.length > 1 ? 's' : ''} — bibliothèque & vivier confondus
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par nom, prénom, intitulé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Cible / envoi</TableHead>
                <TableHead>Poussé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : pushed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <Send className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium">Aucun CV poussé pour le moment</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Depuis la bibliothèque ou le vivier, marque un profil comme
                      "CV poussé" pour le tracer ici et éviter de le re-positionner
                      par erreur.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                pushed.map((c) => {
                  const isProspect = c.is_prospect;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-qc-gradient-pink flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                            {c.first_name[0]}
                            {c.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.job_title}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isProspect ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/[0.08]">
                            <UserPlus className="h-3 w-3" />
                            Vivier
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/[0.08]">
                            <UserCircle className="h-3 w-3" />
                            Bibliothèque
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{SENIORITY_LABEL[c.seniority]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(c.daily_rate_eur)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.cv_pushed_target ? (
                          <span className="text-foreground">{c.cv_pushed_target}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.cv_pushed_at ? relativeDate(c.cv_pushed_at) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/consultants/${c.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              Voir
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unmark(c)}
                            title="Retirer des CV poussés"
                            className="text-amber-300 hover:bg-amber-500/10"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Retirer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
