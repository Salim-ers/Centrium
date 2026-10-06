'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DEFAULT_LAYOUT, SECTION_LABEL, certificationLine, moveInList, normalizeOrder, toggleInList, type DossierLayout, type NameFormat } from '@/lib/cv/layout';
import { formatMonthYear } from '@/lib/utils';
import { fold } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import type { Certification, CVContent, CVSectionId } from '@/types';

type Props = {
  layout: DossierLayout;
  onChange: (next: DossierLayout) => void;
  /** Contenu généré (toutes les expériences et compétences du profil). */
  generated: CVContent;
  certifications: Certification[];
  /** Expériences jugées pertinentes pour le besoin. */
  relevantIds: Set<string>;
  consultantId: string;
  lang: 'fr' | 'en';
};

function Block({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12.5px] font-semibold">{title}</h3>
        {action}
      </div>
      {hint && <p className="-mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/**
 * Contenu du dossier, bloc par bloc : sections (affichées, ordre, titres),
 * expériences retenues et leur ordre, compétences mises en avant ou
 * masquées, certifications, nom affiché. On choisit et on ordonne ; on
 * n'ajoute rien qui ne soit sur le profil.
 */
export function ContentPanel({ layout, onChange, generated, certifications, relevantIds, consultantId, lang }: Props) {
  const fr = lang === 'fr';
  const order = normalizeOrder(layout.order);
  const set = (patch: Partial<DossierLayout>) => onChange({ ...layout, ...patch });

  // Expériences : retenues (dans l'ordre choisi) puis les autres.
  const allIds = generated.experiences.map((e) => e.id);
  const chosen = layout.experienceIds ?? allIds;
  const rest = allIds.filter((id) => !chosen.includes(id));
  const byId = new Map(generated.experiences.map((e) => [e.id, e]));

  // Compétences : mises en avant (choix explicite, sinon celui du générateur) et masquées.
  const generatorHighlights = generated.skillCategories.flatMap((c) => c.highlighted ?? []);
  const highlighted = new Set((layout.highlightedSkills ?? generatorHighlights).map(fold));
  const hidden = new Set(layout.hiddenSkills.map(fold));
  function cycleSkill(skill: string) {
    const k = fold(skill);
    const hi = layout.highlightedSkills ?? generatorHighlights;
    if (hidden.has(k)) {
      set({ hiddenSkills: layout.hiddenSkills.filter((s) => fold(s) !== k) });
    } else if (highlighted.has(k)) {
      set({ highlightedSkills: hi.filter((s) => fold(s) !== k), hiddenSkills: [...layout.hiddenSkills, skill] });
    } else {
      set({ highlightedSkills: [...hi, skill] });
    }
  }

  const certNames = layout.certificationNames ?? certifications.map((c) => c.name);

  return (
    <div className="space-y-6">
      <Block title={fr ? 'Sections' : 'Sections'} hint={fr ? 'Affichez, ordonnez et renommez. Les titres se modifient aussi sur l’aperçu.' : 'Show, order and rename. Titles can also be edited on the preview.'}>
        <ul className="space-y-1">
          {order.map((id: CVSectionId, i) => {
            const isHidden = layout.hidden.includes(id);
            return (
              <li key={id} className={cn('flex items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-1', isHidden && 'opacity-60')}>
                <IconButton label={isHidden ? (fr ? `Afficher « ${SECTION_LABEL[id].fr} »` : `Show “${SECTION_LABEL[id].en}”`) : fr ? `Masquer « ${SECTION_LABEL[id].fr} »` : `Hide “${SECTION_LABEL[id].en}”`} onClick={() => set({ hidden: toggleInList(layout.hidden, id) })}>
                  {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-app-terra" />}
                </IconButton>
                <Input
                  value={layout.titles[id] ?? ''}
                  onChange={(e) => {
                    const titles = { ...layout.titles };
                    if (e.target.value.trim()) titles[id] = e.target.value;
                    else delete titles[id];
                    set({ titles });
                  }}
                  placeholder={SECTION_LABEL[id][lang]}
                  aria-label={fr ? `Titre de la section ${SECTION_LABEL[id].fr}` : `Title of the ${SECTION_LABEL[id].en} section`}
                  maxLength={60}
                  className="h-7 border-transparent bg-transparent px-1.5 text-[12.5px] shadow-none hover:border-border"
                />
                <IconButton label={fr ? 'Monter' : 'Move up'} onClick={() => set({ order: moveInList(order, id, -1) })} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label={fr ? 'Descendre' : 'Move down'} onClick={() => set({ order: moveInList(order, id, 1) })} disabled={i === order.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block
        title={fr ? `Expériences (${chosen.length}/${allIds.length})` : `Experience (${chosen.length}/${allIds.length})`}
        hint={fr ? 'Cochez celles à présenter ; l’ordre est celui du dossier.' : 'Tick the ones to present; the order is the dossier’s.'}
        action={
          layout.experienceIds && (
            <button type="button" onClick={() => set({ experienceIds: null })} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
              {fr ? 'Toutes, ordre d’origine' : 'All, original order'}
            </button>
          )
        }
      >
        <ul className="space-y-1">
          {[...chosen, ...rest].map((id) => {
            const e = byId.get(id);
            if (!e) return null;
            const on = chosen.includes(id);
            const pos = chosen.indexOf(id);
            return (
              <li key={id} className={cn('flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5', !on && 'opacity-60')}>
                <Checkbox
                  checked={on}
                  onCheckedChange={() => set({ experienceIds: on ? chosen.filter((x) => x !== id) : [...chosen, id] })}
                  aria-label={fr ? `Présenter l’expérience ${e.client_name}` : `Present the ${e.client_name} experience`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium">
                    <span className="truncate">{e.client_name}</span>
                    {relevantIds.has(id) && <span className="shrink-0 rounded-full bg-app-peach-light px-1.5 text-[10px] font-semibold text-app-terra-dark">{fr ? 'pertinente' : 'relevant'}</span>}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {e.role} · {formatMonthYear(e.start_date)} – {formatMonthYear(e.end_date)}
                  </span>
                </span>
                {on && (
                  <>
                    <IconButton label={fr ? 'Monter' : 'Move up'} onClick={() => set({ experienceIds: moveInList(chosen, id, -1) })} disabled={pos === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label={fr ? 'Descendre' : 'Move down'} onClick={() => set({ experienceIds: moveInList(chosen, id, 1) })} disabled={pos === chosen.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconButton>
                  </>
                )}
              </li>
            );
          })}
          {allIds.length === 0 && <li className="text-[11.5px] text-muted-foreground">{fr ? 'Aucune expérience sur le profil.' : 'No experience on the profile.'}</li>}
        </ul>
      </Block>

      <Block title={fr ? 'Compétences' : 'Skills'} hint={fr ? 'Chaque clic : affichée → mise en avant ★ → masquée → affichée.' : 'Each click: shown → highlighted ★ → hidden → shown.'}>
        <div className="space-y-2">
          {generated.skillCategories.map((cat, ci) => (
            <div key={`${cat.name}-${ci}`}>
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{cat.name}</p>
              <div className="flex flex-wrap gap-1">
                {cat.items.map((it) => {
                  const k = fold(it);
                  const state = hidden.has(k) ? 'hidden' : highlighted.has(k) ? 'highlighted' : 'normal';
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => cycleSkill(it)}
                      aria-label={`${it} — ${state === 'highlighted' ? (fr ? 'mise en avant' : 'highlighted') : state === 'hidden' ? (fr ? 'masquée' : 'hidden') : fr ? 'affichée' : 'shown'}`}
                      className={cn(
                        'inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11.5px] font-medium transition-colors',
                        state === 'highlighted' && 'border-app-terra bg-app-terra text-white',
                        state === 'hidden' && 'border-dashed border-border text-muted-foreground line-through',
                        state === 'normal' && 'border-border bg-card hover:border-app-terra/40',
                      )}
                    >
                      {state === 'highlighted' && <Star className="h-3 w-3 fill-current" />}
                      {it}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {generated.skillCategories.length === 0 && <p className="text-[11.5px] text-muted-foreground">{fr ? 'Aucune compétence sur le profil.' : 'No skill on the profile.'}</p>}
        </div>
      </Block>

      <Block title={fr ? 'Certifications' : 'Certifications'}>
        {certifications.length === 0 ? (
          <p className="text-[11.5px] leading-snug text-muted-foreground">
            {fr ? 'Aucune certification sur le profil. ' : 'No certification on the profile. '}
            <Link href={`/consultants/${consultantId}`} className="font-medium text-app-terra-dark hover:underline">
              {fr ? 'Les ajouter sur la fiche' : 'Add them on the profile'}
            </Link>
          </p>
        ) : (
          <ul className="space-y-1">
            {certifications.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-[12px]">
                <Checkbox checked={certNames.includes(c.name)} onCheckedChange={() => set({ certificationNames: toggleInList(certNames, c.name) })} aria-label={c.name} />
                <span className="min-w-0 truncate">{certificationLine(c)}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={fr ? 'Nom affiché' : 'Displayed name'} hint={fr ? 'Par défaut, le dossier est anonymisé (initiales du profil) avant envoi au client.' : 'By default the dossier is anonymised (profile initials) before it goes to the client.'}>
        <Select value={layout.nameFormat} onChange={(e) => set({ nameFormat: e.target.value as NameFormat })} aria-label={fr ? 'Nom affiché' : 'Displayed name'}>
          <option value="initials">{fr ? 'Initiales (par défaut)' : 'Initials (default)'}</option>
          <option value="first_initial">{fr ? 'Prénom et initiale' : 'First name and initial'}</option>
          <option value="full">{fr ? 'Nom complet' : 'Full name'}</option>
        </Select>
      </Block>

      <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_LAYOUT)} className="-ml-2">
        <RotateCcw />
        {fr ? 'Réinitialiser la mise en page' : 'Reset the layout'}
      </Button>
    </div>
  );
}
