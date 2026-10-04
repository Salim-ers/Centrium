/**
 * Style commun des champs de saisie (Input, Select, Textarea, DatePicker,
 * Combobox). Un seul endroit pour la bordure, le focus et l'état désactivé.
 */
export const fieldBase = [
  'w-full rounded-md border border-input bg-card text-sm text-foreground shadow-xs',
  'placeholder:text-muted-foreground/80',
  'transition-[border-color,box-shadow] duration-150',
  'hover:border-sand-300',
  'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-focus',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.15)]',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
].join(' ');
