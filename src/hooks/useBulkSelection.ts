'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Hook de sélection multiple pour des listes/tableaux.
 *
 * Gère un Set d'identifiants sélectionnés + helpers toggle / clear /
 * selectAll, en se réinitialisant automatiquement quand la liste sous-jacente
 * change radicalement (signature = liste d'ids triés).
 *
 * Usage :
 *   const { selected, toggle, clear, selectAll, isSelected, allSelected } =
 *     useBulkSelection(consultants.map(c => c.id));
 *
 *   <Checkbox checked={isSelected(c.id)} onChange={() => toggle(c.id)} />
 *   <button onClick={selectAll}>Tout sélectionner</button>
 *   <button onClick={clear}>Tout désélectionner</button>
 */
export function useBulkSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Signature stable de la liste — si elle change radicalement (ex: l'utilisateur
  // change de filtre), on purge la sélection pour éviter d'avoir des ids fantômes.
  const allIdsSignature = useMemo(() => [...allIds].sort().join('|'), [allIds]);

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const current = new Set(allIds);
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (current.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIdsSignature]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectAll = useCallback(() => {
    setSelected(new Set(allIds));
  }, [allIds]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  return {
    selected,
    selectedCount: selected.size,
    toggle,
    clear,
    selectAll,
    isSelected,
    allSelected,
    someSelected,
  };
}
