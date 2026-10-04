import { describe, expect, it } from 'vitest';

import { DEFAULT_LAYOUTS, WIDGETS, WIDGET_IDS, resolveLayout, widgetAllowed } from '@/lib/dashboard/widgets';
import type { Permission } from '@/lib/auth/permissions';

describe('resolveLayout', () => {
  it('returns the default layout of the view when nothing is saved', () => {
    // Act
    const layout = resolveLayout('direction', null);

    // Assert
    expect(layout.map((i) => i.id)).toEqual(DEFAULT_LAYOUTS.direction.map((i) => i.id));
    expect(layout.filter((i) => !i.hidden).map((i) => i.id).slice(0, 3)).toEqual(['revenue', 'margin', 'todo']);
  });

  it('keeps the saved order and visibility, then appends missing widgets as hidden', () => {
    // Arrange
    const saved = [
      { id: 'feed' as const },
      { id: 'revenue' as const, hidden: true },
    ];

    // Act
    const layout = resolveLayout('commercial', saved);

    // Assert
    expect(layout[0]).toEqual({ id: 'feed', hidden: false });
    expect(layout[1]).toEqual({ id: 'revenue', hidden: true });
    expect(layout).toHaveLength(WIDGET_IDS.length);
    expect(layout.slice(2).every((i) => i.hidden)).toBe(true);
  });

  it('drops unknown identifiers and duplicates', () => {
    // Arrange
    const saved = [{ id: 'todo' }, { id: 'todo' }, { id: 'not-a-widget' }] as Array<{ id: never }>;

    // Act
    const layout = resolveLayout('finance', saved);

    // Assert
    expect(layout.filter((i) => i.id === 'todo')).toHaveLength(1);
    expect(layout.some((i) => (i.id as string) === 'not-a-widget')).toBe(false);
  });
});

describe('widgetAllowed', () => {
  const can = (granted: Permission[]) => (p: Permission) => granted.includes(p);

  it('hides financial widgets from roles without financial access', () => {
    expect(widgetAllowed(WIDGETS.margin, can(['dashboard.view', 'missions.view']))).toBe(false);
    expect(widgetAllowed(WIDGETS.revenue, can(['dashboard.view']))).toBe(false);
  });

  it('shows widgets when one of the required permissions is granted', () => {
    expect(widgetAllowed(WIDGETS.revenue, can(['analytics.view']))).toBe(true);
    expect(widgetAllowed(WIDGETS.todo, can([]))).toBe(true);
  });

  it('requires every permission listed in allOf', () => {
    expect(widgetAllowed(WIDGETS.clients, can(['finance.view']))).toBe(false);
    expect(widgetAllowed(WIDGETS.clients, can(['finance.view', 'clients.view']))).toBe(true);
  });
});
