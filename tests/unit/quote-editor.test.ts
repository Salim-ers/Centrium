import { describe, expect, it } from 'vitest';

import { moveItem } from '@/components/documents/QuoteEditor';
import { A4_PX, docScale } from '@/components/app/DocumentCanvas';

describe('moveItem (lignes du devis)', () => {
  it('moves a line up or down, by drag or arrow keys', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('ignores out-of-range moves', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 2)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
  });
});

describe('docScale (aperçu A4)', () => {
  it('uses fixed percentages', () => {
    expect(docScale('50', { w: 0, h: 0 })).toBe(0.5);
    expect(docScale('100', { w: 400, h: 400 })).toBe(1);
  });

  it('fits the width or the whole page, within bounds', () => {
    const box = { w: A4_PX.w * 0.6 + 48, h: A4_PX.h * 0.5 + 48 };
    expect(docScale('width', box)).toBeCloseTo(0.6, 5);
    expect(docScale('page', box)).toBeCloseTo(0.5, 5);
    expect(docScale('width', { w: 5000, h: 900 })).toBe(1.25);
    expect(docScale('width', { w: 0, h: 0 })).toBe(1);
  });
});
