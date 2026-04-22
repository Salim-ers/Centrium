'use client';

export function ConsultantsMockup() {
  const rows = [
    { name: 'Jean D.', skill: 'DevOps', tjm: '650€', color: 'bg-emerald-400' },
    { name: 'Aïcha B.', skill: 'React / Node', tjm: '580€', color: 'bg-violet-400' },
    { name: 'Marco P.', skill: 'Data / ML', tjm: '720€', color: 'bg-cyan-400' },
    { name: 'Sofia L.', skill: 'UX / Product', tjm: '540€', color: 'bg-magenta' },
  ];
  return (
    <Frame>
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-28 rounded bg-white/10" />
        <div className="h-6 w-20 rounded bg-violet-brand/30" />
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between rounded-md bg-white/5 border border-white/5 px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className={`h-6 w-6 rounded-full ${r.color}/40 border border-white/10`} />
              <div>
                <div className="text-[11px] text-white/90 font-medium">{r.name}</div>
                <div className="text-[9px] text-white/50">{r.skill}</div>
              </div>
            </div>
            <div className="text-[10px] text-white/60">{r.tjm}</div>
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
        <div className="h-3 w-32 rounded bg-white/15" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-white/5 p-2.5 space-y-1.5 border border-white/5">
          <div className="h-2 w-16 rounded bg-violet-400/70" />
          <div className="h-1.5 w-full rounded bg-white/10" />
          <div className="h-1.5 w-4/5 rounded bg-white/10" />
          <div className="h-1.5 w-3/4 rounded bg-white/10" />
          <div className="pt-1" />
          <div className="h-2 w-12 rounded bg-magenta/70" />
          <div className="h-1.5 w-full rounded bg-white/10" />
          <div className="h-1.5 w-2/3 rounded bg-white/10" />
        </div>
        <div className="rounded bg-gradient-to-br from-violet-brand/20 to-magenta/20 p-2.5 space-y-1.5 border border-violet-brand/30">
          <div className="h-2 w-20 rounded bg-white/60" />
          <div className="h-1.5 w-full rounded bg-white/20" />
          <div className="h-1.5 w-5/6 rounded bg-white/20" />
          <div className="h-1.5 w-3/4 rounded bg-white/20" />
          <div className="pt-1" />
          <div className="h-2 w-14 rounded bg-white/60" />
          <div className="h-1.5 w-full rounded bg-white/20" />
          <div className="h-1.5 w-4/5 rounded bg-white/20" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Template QuadCore
        </div>
        <div className="h-6 w-20 rounded bg-qc-gradient" />
      </div>
    </Frame>
  );
}

export function CRMMockup() {
  const columns = [
    { title: 'Leads', color: 'bg-white/15', count: 8 },
    { title: 'Qualif.', color: 'bg-violet-400/70', count: 5 },
    { title: 'Propo.', color: 'bg-magenta/70', count: 3 },
    { title: 'Won', color: 'bg-emerald-400/70', count: 2 },
  ];
  return (
    <Frame>
      <div className="grid grid-cols-4 gap-1.5">
        {columns.map((c) => (
          <div key={c.title} className="rounded bg-white/5 border border-white/5 p-1.5">
            <div className="flex items-center gap-1 mb-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
              <div className="text-[9px] text-white/70 font-medium">{c.title}</div>
              <div className="ml-auto text-[8px] text-white/40">{c.count}</div>
            </div>
            <div className="space-y-1">
              {Array.from({ length: Math.min(c.count, 3) }).map((_, i) => (
                <div key={i} className="rounded bg-white/10 p-1.5 space-y-0.5">
                  <div className="h-1.5 w-full rounded bg-white/30" />
                  <div className="h-1 w-2/3 rounded bg-white/15" />
                </div>
              ))}
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
        <div className="h-3 w-28 rounded bg-white/15" />
        <div className="h-5 w-16 rounded bg-emerald-400/20 text-[9px] text-emerald-300 flex items-center justify-center">Validé</div>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {days.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-gradient-to-t from-violet-brand to-magenta"
              style={{ height: `${(h / 8) * 100}%`, minHeight: h > 0 ? '4px' : '2px', opacity: h > 0 ? 1 : 0.2 }}
            />
            <div className="text-[8px] text-white/40">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded bg-white/5 border border-white/5 px-2.5 py-2">
        <div>
          <div className="text-[10px] text-white/50">Facture avril</div>
          <div className="text-xs text-white/90 font-semibold">12 450 €</div>
        </div>
        <div className="h-6 w-16 rounded bg-qc-gradient text-[10px] flex items-center justify-center font-medium">PDF</div>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl bg-midnight-200/80 border border-white/10 p-4 shadow-2xl backdrop-blur overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-brand/40 to-transparent" />
      {children}
    </div>
  );
}
