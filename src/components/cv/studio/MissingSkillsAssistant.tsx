'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, HelpCircle, Loader2, MinusCircle, Plus, Sparkles, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { showBrandToast } from '@/components/ui/BrandToast';
import { consultantService } from '@/lib/services/consultant.service';
import { cn } from '@/lib/utils';

type Suggestion = {
  skill: string;
  verdict: 'strong' | 'plausible' | 'unsupported';
  reasoning: string;
  evidence: string[];
  suggested_category: string;
};

type Props = {
  consultantId: string;
  missingSkills: string[];
  /** Intitulé et description du besoin, pour contextualiser l'analyse. */
  offerContext: string;
  /** Noms (minuscules) des compétences déjà sur le profil. */
  profileSkillNames: Set<string>;
  lang: 'fr' | 'en';
  /** Le profil a changé (compétence ajoutée ou retirée) : recharger. */
  onProfileChanged: () => void;
};

/**
 * Compétences absentes du profil : l'IA cherche, dans le profil seulement,
 * des indices qu'elles sont détenues (fort, plausible, non étayé). Rien
 * n'est ajouté sans action explicite ; un ajout sans indice demande une
 * confirmation.
 */
export function MissingSkillsAssistant({ consultantId, missingSkills, offerContext, profileSkillNames, lang, onProfileChanged }: Props) {
  const fr = lang === 'fr';
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  // Autre profil ou autre besoin : l'analyse précédente ne vaut plus.
  const missingKey = missingSkills.join('|');
  useEffect(() => {
    setSuggestions(null);
    setIgnored(new Set());
  }, [consultantId, offerContext, missingKey]);

  async function analyze() {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/cv/skills/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultantId, missingSkills, offerContext }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) toast.error(fr ? 'Service IA temporairement indisponible. Réessayez dans un instant.' : 'AI service temporarily unavailable. Try again shortly.');
        else if (res.status === 429) toast.error(fr ? 'Trop de requêtes IA. Patientez quelques secondes.' : 'Too many AI requests. Wait a few seconds.');
        else if (res.status === 401 || res.status === 403) toast.error(fr ? 'Accès IA refusé.' : 'AI access denied.');
        else toast.error((fr ? 'Analyse impossible : ' : 'Analysis failed: ') + (body?.message ?? `${res.status}`));
        return;
      }
      const data = (await res.json()) as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions);
    } catch (e) {
      toast.error((fr ? 'Analyse IA échouée : ' : 'AI analysis failed: ') + (e instanceof Error ? e.message : fr ? 'erreur réseau' : 'network error'));
    } finally {
      setAnalyzing(false);
    }
  }

  async function add(s: Suggestion, force = false) {
    if (s.verdict === 'unsupported' && !force) return;
    if (
      force &&
      !window.confirm(
        fr
          ? `« ${s.skill} » n’est étayée par aucun élément du profil.\nL’ajouter quand même au profil du consultant ?`
          : `“${s.skill}” is not supported by the profile.\nAdd it to the consultant profile anyway?`,
      )
    )
      return;
    setBusy(s.skill);
    try {
      const res = await consultantService.addSkills(consultantId, [{ category: s.suggested_category || 'tools', name: s.skill, is_highlighted: false }]);
      if (res.error) {
        toast.error(res.error.message ?? (fr ? 'Ajout impossible' : 'Could not add'));
        return;
      }
      showBrandToast('success', res.data === 0 ? (fr ? 'Déjà sur le profil' : 'Already on the profile') : fr ? `« ${s.skill} » ajoutée au profil` : `“${s.skill}” added to the profile`);
      onProfileChanged();
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: Suggestion) {
    setBusy(s.skill);
    try {
      const res = await consultantService.removeSkillByName(consultantId, { name: s.skill, category: s.suggested_category || undefined });
      if (res.error) {
        toast.error(res.error.message ?? (fr ? 'Suppression impossible' : 'Could not remove'));
        return;
      }
      showBrandToast('success', fr ? `« ${s.skill} » retirée du profil` : `“${s.skill}” removed from the profile`);
      onProfileChanged();
    } finally {
      setBusy(null);
    }
  }

  if (missingSkills.length === 0) return null;
  if (!suggestions) {
    return (
      <Button size="sm" variant="secondary" onClick={() => void analyze()} disabled={analyzing} className="w-full" title={fr ? 'L’IA cherche dans le profil des indices que ces compétences sont détenues' : 'The AI looks for evidence in the profile'}>
        {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {analyzing ? (fr ? 'Analyse…' : 'Analyzing…') : fr ? 'Chercher des indices dans le profil (IA)' : 'Look for evidence in the profile (AI)'}
      </Button>
    );
  }

  const visible = suggestions.filter((s) => !ignored.has(s.skill));
  return (
    <div className="space-y-2">
      {visible.map((s) => {
        const meta =
          s.verdict === 'strong'
            ? { icon: CheckCircle2, tone: 'border-success/30 bg-success-soft/40', color: 'text-success', label: fr ? 'Indice fort' : 'Strong evidence' }
            : s.verdict === 'plausible'
              ? { icon: HelpCircle, tone: 'border-warning/30 bg-warning-soft/40', color: 'text-warning', label: 'Plausible' }
              : { icon: MinusCircle, tone: 'border-border bg-muted/40', color: 'text-muted-foreground', label: fr ? 'Non étayée' : 'Unsupported' };
        const onProfile = profileSkillNames.has(s.skill.trim().toLowerCase());
        return (
          <div key={s.skill} className={cn('rounded-lg border p-2.5 text-xs', meta.tone)}>
            <div className="flex items-center gap-1.5">
              <meta.icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} />
              <span className="truncate font-semibold">{s.skill}</span>
              <span className={cn('text-[10px] font-semibold uppercase tracking-wider', meta.color)}>{meta.label}</span>
            </div>
            <p className="mt-1 leading-snug text-muted-foreground">{s.reasoning}</p>
            {s.evidence.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground/90">
                {s.evidence.slice(0, 3).map((ev, i) => (
                  <li key={i} className="border-l border-border pl-2">
                    {ev}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {onProfile ? (
                <Button size="xs" variant="destructive-outline" onClick={() => void remove(s)} disabled={busy === s.skill}>
                  {busy === s.skill ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  {fr ? 'Retirer du profil' : 'Remove from profile'}
                </Button>
              ) : s.verdict !== 'unsupported' ? (
                <Button size="xs" variant="secondary" onClick={() => void add(s)} disabled={busy === s.skill}>
                  {busy === s.skill ? <Loader2 className="animate-spin" /> : <Plus />}
                  {fr ? 'Ajouter au profil' : 'Add to profile'}
                </Button>
              ) : (
                <Button size="xs" variant="ghost" className="text-warning" onClick={() => void add(s, true)} disabled={busy === s.skill}>
                  {busy === s.skill ? <Loader2 className="animate-spin" /> : <Plus />}
                  {fr ? 'Ajouter quand même…' : 'Add anyway…'}
                </Button>
              )}
              <Button size="xs" variant="ghost" onClick={() => setIgnored((prev) => new Set(prev).add(s.skill))}>
                <X />
                {fr ? 'Ignorer' : 'Ignore'}
              </Button>
            </div>
          </div>
        );
      })}
      {visible.length === 0 && <p className="text-[11.5px] italic text-muted-foreground">{fr ? 'Toutes les suggestions ont été traitées.' : 'All suggestions handled.'}</p>}
    </div>
  );
}
