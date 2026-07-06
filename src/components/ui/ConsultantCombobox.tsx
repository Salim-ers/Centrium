'use client';

import { useMemo } from 'react';

import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';

export type ConsultantOption = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  is_prospect?: boolean;
};

type Props = {
  consultants: ConsultantOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Largeur mini du panneau (px). Défaut 380. */
  minPanelWidth?: number;
};

/**
 * Sélecteur de consultant — désormais une simple façade sur le Combobox
 * premium unifié (même design que partout ailleurs sur le site : panneau
 * portal élargi, recherche, coche terracotta, navigation clavier).
 * On conserve l'API historique (consultants / value / onChange) pour ne
 * pas toucher aux call-sites.
 */
export function ConsultantCombobox({
  consultants,
  value,
  onChange,
  placeholder = '— Choisir ou taper un nom —',
  disabled = false,
  className,
  ariaLabel,
  minPanelWidth = 380,
}: Props) {
  const options = useMemo<ComboboxOption[]>(
    () =>
      consultants.map((c) => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name}`.trim(),
        sublabel: c.job_title ?? undefined,
        badge: c.is_prospect ? '★ Vivier' : undefined,
      })),
    [consultants],
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      ariaLabel={ariaLabel}
      searchable
      clearable
      minPanelWidth={minPanelWidth}
    />
  );
}
