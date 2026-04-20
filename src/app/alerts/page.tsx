'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Check, X } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { alertService } from '@/lib/services';
import type { Alert, AlertStatus } from '@/types';
import { ALERT_PRIORITY_STYLE, ALERT_STATUS_LABEL } from '@/constants';
import { relativeDate } from '@/lib/utils';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<AlertStatus>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    alertService.list(filter).then((res) => {
      if (res.data) setAlerts(res.data);
      setLoading(false);
    });
  }, [filter]);

  async function resolve(id: string) {
    const res = await alertService.markResolved(id);
    if (res.error) return toast.error('Erreur');
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success('Alerte résolue');
  }

  async function dismiss(id: string) {
    const res = await alertService.dismiss(id);
    if (res.error) return toast.error('Erreur');
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success('Alerte ignorée');
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <BellRing className="h-7 w-7 text-violet-glow" />
          Centre d'alertes
        </h1>
        <p className="text-muted-foreground mt-1">
          Relances, échéances et signaux à traiter
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as AlertStatus)}>
        <TabsList>
          <TabsTrigger value="new">Nouvelles</TabsTrigger>
          <TabsTrigger value="in_progress">En cours</TabsTrigger>
          <TabsTrigger value="resolved">Résolues</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <BellRing className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune alerte {ALERT_STATUS_LABEL[filter].toLowerCase()}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <Card key={a.id} className="qc-card-hover">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={ALERT_PRIORITY_STYLE[a.priority]}>
                          {a.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {a.kind.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {relativeDate(a.due_date)}
                        </span>
                      </div>
                      <h3 className="font-medium mt-1.5">{a.title}</h3>
                      {a.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {a.description}
                        </p>
                      )}
                    </div>
                    {filter === 'new' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolve(a.id)}
                        >
                          <Check className="h-4 w-4" />
                          Traité
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismiss(a.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
