import { QuadCoreLogo } from './QuadCoreLogo';

type Props = {
  /** Nom du signataire — DOIT venir du branding (representativeName) ou
   *  être passé explicitement. Fallback générique pour éviter de leak
   *  "QuadCore SAS" sur les comptes tenants. */
  signerName?: string;
  signerRole?: string;
  date?: string;
  imageUrl?: string | null;
  /** Nom de marque utilisé pour le bloc bas et l'alt du logo. */
  brandName?: string;
  /** URL du logo organisation (depuis branding.logoUrl). */
  logoUrl?: string | null;
  /** Couleur primaire pour fallback initiale du logo si pas uploadé. */
  primaryColor?: string | null;
  /** Cache buster du logo (branding.version) pour éviter le cache navigateur. */
  cacheKey?: string | number | null;
};

export function QuadCoreSignature({
  signerName,
  signerRole,
  date,
  imageUrl = null,
  brandName,
  logoUrl = null,
  primaryColor = null,
  cacheKey = null,
}: Props) {
  const displayName = signerName?.trim() || brandName?.trim() || '—';
  const displayRole = signerRole?.trim() || 'Signataire';
  const displayBrand = brandName?.trim() || displayName;
  const displayDate =
    date ??
    new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
      new Date(),
    );

  return (
    <div className="inline-block">
      <div className="border border-neutral-200 rounded-lg bg-white px-6 py-4 min-w-[260px]">
        <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Signature
        </div>

        <div className="h-16 flex items-center">
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
              style={{
                fontFamily: '"Brush Script MT","Lucida Handwriting",cursive',
                transform: 'rotate(-4deg)',
              }}
            >
              {displayName}
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-4">
          <QuadCoreLogo
            size="sm"
            showTagline={false}
            src={logoUrl}
            alt={displayBrand}
            brandName={displayBrand}
            primaryColor={primaryColor}
            cacheKey={cacheKey}
          />
          <div className="text-right">
            <div className="text-[10px] font-semibold text-neutral-800">{displayName}</div>
            <div className="text-[9px] text-neutral-500">{displayRole}</div>
          </div>
        </div>
      </div>

      {/* Date affichée sous le bloc, plus du tout collée au tampon. */}
      <div className="mt-2 text-center text-[11px] text-neutral-700">
        Fait le <span className="font-semibold text-neutral-900">{displayDate}</span>
      </div>
    </div>
  );
}
