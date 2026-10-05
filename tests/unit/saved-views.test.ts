import { beforeEach, describe, expect, it } from 'vitest';

import { readViews, removeView, sameFilters, saveView } from '@/lib/saved-views';
import { isFavorite, readFavorites, refreshFavorite, toggleFavorite } from '@/lib/favorites';

const ORG = 'org-1';

beforeEach(() => {
  window.localStorage.clear();
});

describe('saved views', () => {
  it('should save a view per organisation and page, newest first', () => {
    // Arrange / Act
    saveView(ORG, 'consultants', 'DevOps disponibles', { skill: 'DevOps', availability: 'now' });
    saveView(ORG, 'consultants', 'Consultants Paris', { query: 'Paris' });

    // Assert
    expect(readViews(ORG, 'consultants').map((v) => v.name)).toEqual(['Consultants Paris', 'DevOps disponibles']);
    expect(readViews(ORG, 'missions')).toEqual([]);
    expect(readViews('org-2', 'consultants')).toEqual([]);
  });

  it('should replace a view saved again under the same name', () => {
    saveView(ORG, 'missions', 'Fin < 30 j', { ending: '60' });
    saveView(ORG, 'missions', 'fin < 30 j', { ending: '30' });
    const views = readViews(ORG, 'missions');
    expect(views).toHaveLength(1);
    expect(views[0]!.filters.ending).toBe('30');
  });

  it('should remove a view', () => {
    const v = saveView(ORG, 'missions', 'Toutes', { scope: 'all' });
    removeView(ORG, 'missions', v.id);
    expect(readViews(ORG, 'missions')).toEqual([]);
  });

  it('should ignore corrupted storage', () => {
    window.localStorage.setItem(`centrium-views:${ORG}:consultants`, '{not json');
    expect(readViews(ORG, 'consultants')).toEqual([]);
  });
});

describe('sameFilters', () => {
  it('should treat missing keys as empty values', () => {
    expect(sameFilters({ query: '', skill: 'AWS' }, { skill: 'AWS' })).toBe(true);
    expect(sameFilters({ skill: 'AWS' }, { skill: 'GCP' })).toBe(false);
  });
});

describe('favorites', () => {
  it('should toggle a favorite and keep its label up to date', () => {
    // Act
    const on = toggleFavorite(ORG, { href: '/clients/1', label: 'Nordal', kind: 'client' });
    refreshFavorite(ORG, { href: '/clients/1', label: 'Nordal Assurances', kind: 'client' });

    // Assert
    expect(on).toBe(true);
    expect(isFavorite(ORG, '/clients/1')).toBe(true);
    expect(readFavorites(ORG)[0]!.label).toBe('Nordal Assurances');
    expect(toggleFavorite(ORG, { href: '/clients/1', label: 'Nordal Assurances', kind: 'client' })).toBe(false);
    expect(readFavorites(ORG)).toEqual([]);
  });

  it('should not add an unknown favorite when refreshing a label', () => {
    refreshFavorite(ORG, { href: '/missions/9', label: 'Mission', kind: 'mission' });
    expect(readFavorites(ORG)).toEqual([]);
  });
});
