'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

import { notifyError } from '@/lib/notify';

type Props = {
  kind: 'logo' | 'signature';
  value: string;
  onChange: (url: string) => void;
  label?: string;
};

/**
 * Zone de drop / picker pour uploader un logo ou une signature
 * depuis le formulaire de création d'organisation (super_admin).
 *
 * Comportement :
 *   1. Drop ou click → ouvre le picker fichier
 *   2. Envoie en POST multipart à /api/admin/upload-asset
 *   3. Le serveur stocke dans organization-assets/_pending/<uuid>/
 *   4. Récupère l'URL publique et la passe à onChange
 *   5. Affiche un aperçu visuel du fichier uploadé
 *
 * Formats acceptés : PNG, JPG, WebP, SVG · 5 MB max.
 */
export function AssetUploader({ kind, value, onChange, label }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      const res = await fetch('/api/admin/upload-asset', {
        method: 'POST',
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? body.error ?? 'Upload impossible');
        return;
      }
      onChange(body.data.url);
    } catch (e) {
      notifyError('Erreur réseau : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void upload(f);
    e.target.value = ''; // reset pour pouvoir re-sélectionner le même fichier
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void upload(f);
  }

  const friendly = label ?? (kind === 'logo' ? 'Logo' : 'Signature');

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-hairline bg-card/40 p-3">
        <div className="h-14 w-14 shrink-0 rounded-md border border-hairline bg-white p-1.5 overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={friendly}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground/90">{friendly} prêt</div>
          <div className="text-[11px] text-muted-foreground truncate">{value}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] text-foreground/80 hover-surface transition"
          >
            Remplacer
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={busy}
            className="rounded-md border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10 transition"
            title="Retirer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={onPick}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => !busy && fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`group cursor-pointer rounded-lg border-2 border-dashed transition px-4 py-5 text-center ${
        dragOver
          ? 'border-magenta bg-magenta/[0.06]'
          : 'border-hairline bg-card/30 hover:border-magenta/40 hover:bg-card/60'
      } ${busy ? 'opacity-50 cursor-wait' : ''}`}
    >
      <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-magenta transition">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </div>
      <div className="text-xs font-semibold text-foreground/90">
        {busy ? 'Upload en cours…' : `Téléverser ${friendly.toLowerCase()}`}
      </div>
      <div className="mt-1 text-[10.5px] text-muted-foreground">
        Glisse-dépose ou clique · PNG, JPG, WebP, SVG · 5 MB max
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
