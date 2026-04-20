import { QuadCoreLogo } from './QuadCoreLogo';

type Props = {
  signerName?: string;
  signerRole?: string;
  date?: string;
};

export function QuadCoreSignature({
  signerName = 'QuadCore SAS',
  signerRole = 'Direction commerciale',
  date,
}: Props) {
  const displayDate =
    date ??
    new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
      new Date(),
    );

  return (
    <div className="relative inline-block">
      <div className="border border-neutral-200 rounded-lg bg-white px-6 py-4 min-w-[260px]">
        <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Signature
        </div>

        <div className="relative h-16 flex items-center">
          <span
            className="text-[32px] text-neutral-900 select-none"
            style={{ fontFamily: '"Brush Script MT","Lucida Handwriting",cursive', transform: 'rotate(-4deg)' }}
          >
            {signerName}
          </span>
          <div
            className="absolute -right-2 -top-2 rotate-[-8deg] border-2 rounded-sm px-2 py-1"
            style={{ borderColor: '#e11d74' }}
          >
            <div className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: '#e11d74' }}>
              Signé&nbsp;·&nbsp;QuadCore
            </div>
            <div className="text-[7px] text-neutral-500 mt-0.5">{displayDate}</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-4">
          <QuadCoreLogo size="sm" showTagline={false} />
          <div className="text-right">
            <div className="text-[10px] font-semibold text-neutral-800">{signerName}</div>
            <div className="text-[9px] text-neutral-500">{signerRole}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
