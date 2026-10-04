'use client';

export function ConsultantsMockup() {
  const rows = [
    { name: 'Jean D.', skill: 'DevOps', tjm: '650€', color: 'bg-success' },
    { name: 'Aïcha B.', skill: 'React / Node', tjm: '580€', color: 'bg-primary' },
    { name: 'Marco P.', skill: 'Data / ML', tjm: '720€', color: 'bg-info' },
    { name: 'Sofia L.', skill: 'UX / Product', tjm: '540€', color: 'bg-primary' },
  ];
  return (
    <Frame>
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-28 rounded bg-muted" />
        <div className="h-6 w-20 rounded bg-primary/30" />
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between rounded-md bg-muted border border-hairline px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className={`h-6 w-6 rounded-full ${r.color}/40 border border-hairline`} />
              <div>
                <div className="text-[11px] text-foreground font-medium">{r.name}</div>
                <div className="text-[9px] text-muted-foreground">{r.skill}</div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">{r.tjm}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function CVOptimizerMockup() {
  return (
    <Frame>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded bg-qc-gradient" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-muted p-2.5 space-y-1.5 border border-hairline">
          <div className="h-2 w-16 rounded bg-primary/70" />
          <div className="h-1.5 w-full rounded bg-muted" />
          <div className="h-1.5 w-4/5 rounded bg-muted" />
          <div className="h-1.5 w-3/4 rounded bg-muted" />
          <div className="pt-1" />
          <div className="h-2 w-12 rounded bg-primary/70" />
          <div className="h-1.5 w-full rounded bg-muted" />
          <div className="h-1.5 w-2/3 rounded bg-muted" />
        </div>
        <div className="rounded bg-gradient-to-br from-primary/20 to-primary/20 p-2.5 space-y-1.5 border border-primary/30">
          <div className="h-2 w-20 rounded bg-muted" />
          <div className="h-1.5 w-full rounded bg-muted" />
          <div className="h-1.5 w-5/6 rounded bg-muted" />
          <div className="h-1.5 w-3/4 rounded bg-muted" />
          <div className="pt-1" />
          <div className="h-2 w-14 rounded bg-muted" />
          <div className="h-1.5 w-full rounded bg-muted" />
          <div className="h-1.5 w-4/5 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Template QuadCore
        </div>
        <div className="h-6 w-20 rounded bg-qc-gradient" />
      </div>
    </Frame>
  );
}

/**
 * Matching & AO mockup : montre l'extraction LLM depuis une annonce
 * + les 3 meilleurs consultants matchés avec score. Remplace l'ancien
 * CRMMockup kanban.
 */
export function MatchingMockup() {
  const matches = [
    { name: 'Sarah K.', role: 'Lead Backend', score: 94, tone: 'bg-success/80' },
    { name: 'Karim B.', role: 'Backend Senior', score: 87, tone: 'bg-success/70' },
    { name: 'Léa M.', role: 'Backend Confirmé', score: 79, tone: 'bg-warning/70' },
  ];
  return (
    <Frame>
      {/* Bloc 1 : AO extrait */}
      <div className="rounded bg-muted border border-hairline p-2 mb-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <div className="text-[9px] uppercase tracking-wider text-primary font-semibold">
            AO extrait par IA
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-2 w-3/4 rounded bg-muted" />
          <div className="flex gap-1 mt-1.5">
            {['Java', 'Spring', 'AWS', 'K8s'].map((s) => (
              <div
                key={s}
                className="rounded bg-primary/30 border border-primary/50 px-1 py-0.5 text-[8px] text-muted-foreground"
              >
                {s}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[8px] text-muted-foreground">
            <span>Paris</span>
            <span>·</span>
            <span>650€/j</span>
            <span>·</span>
            <span>6 mois</span>
          </div>
        </div>
      </div>

      {/* Bloc 2 : 3 profils matchés */}
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
        Top matches
      </div>
      <div className="space-y-1">
        {matches.map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-2 rounded bg-card border border-hairline p-1.5"
          >
            <div className="h-5 w-5 rounded-full bg-qc-gradient-pink shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground font-medium leading-tight">
                {m.name}
              </div>
              <div className="text-[8px] text-muted-foreground leading-tight">{m.role}</div>
            </div>
            <div
              className={`text-[9px] font-bold text-foreground px-1.5 py-0.5 rounded ${m.tone}`}
            >
              {m.score}%
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function TimesheetsMockup() {
  const days = [3, 5, 7, 6, 8, 2, 0];
  return (
    <Frame>
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-success/20 text-[9px] text-success flex items-center justify-center">Validé</div>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {days.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-gradient-to-t from-primary to-primary"
              style={{ height: `${(h / 8) * 100}%`, minHeight: h > 0 ? '4px' : '2px', opacity: h > 0 ? 1 : 0.2 }}
            />
            <div className="text-[8px] text-muted-foreground">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded bg-muted border border-hairline px-2.5 py-2">
        <div>
          <div className="text-[10px] text-muted-foreground">Facture avril</div>
          <div className="text-xs text-foreground font-semibold">12 450 €</div>
        </div>
        <div className="h-6 w-16 rounded bg-qc-gradient text-[10px] flex items-center justify-center font-medium">PDF</div>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl bg-card/80 border border-hairline p-4 shadow-2xl overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {children}
    </div>
  );
}
