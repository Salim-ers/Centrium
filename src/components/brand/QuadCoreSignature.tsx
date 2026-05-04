import { QuadCoreLogo } from './QuadCoreLogo';

type Props = {
  signerName?: string;
  signerRole?: string;
  date?: string;
  imageUrl?: string | null;
  brandName?: string;
  logoUrl?: string | null;
};

export function QuadCoreSignature({
  signerName = 'QuadCore SAS',
  signerRole = 'Direction commerciale',
  date,
  imageUrl = null,
  brandName = 'QuadCore',
  logoUrl = null,
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
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Signature"
              className="max-h-full max-w-[200px] object-contain select-none"
            />
          ) : (
            <span
              className="text-[32px] text-neutral-900 select-none"
              style={{ fontFamily: '"Brush Script MT","Lucida Handwriting",cursive', transform: 'rotate(-4deg)' }}
            >
              {signerName}
            </span>
          )}
          <div className="absolute right-0 top-0 text-[7px] text-neutral-400">
            {displayDate}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-4">
          <QuadCoreLogo size="sm" showTagline={false} src={logoUrl} alt={brandName} />
          <div className="text-right">
            <div className="text-[10px] font-semibold text-neutral-800">{signerName}</div>
            <div className="text-[9px] text-neutral-500">{signerRole}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
