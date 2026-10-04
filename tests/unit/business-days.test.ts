import { describe, expect, it } from 'vitest';
import {
  businessDaysBetween,
  businessDaysInMonth,
  businessDaysOverlap,
  easterSunday,
  frenchHolidays,
  isBusinessDay,
} from '@/lib/utils/business-days';

describe('jours ouvrés (France)', () => {
  it('calcule Pâques', () => {
    expect(easterSunday(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
    expect(easterSunday(2027).toDateString()).toBe(new Date(2027, 2, 28).toDateString());
  });

  it('liste les 11 jours fériés', () => {
    const h = frenchHolidays(2026);
    expect(h.size).toBe(11);
    expect(h.has('2026-04-06')).toBe(true); // lundi de Pâques
    expect(h.has('2026-05-14')).toBe(true); // Ascension
    expect(h.has('2026-05-25')).toBe(true); // Pentecôte
  });

  it('exclut week-ends et fériés', () => {
    expect(isBusinessDay(new Date(2026, 6, 14))).toBe(false); // 14 juillet
    expect(isBusinessDay(new Date(2026, 9, 3))).toBe(false); // samedi
    expect(isBusinessDay(new Date(2026, 9, 5))).toBe(true);
  });

  it('compte les jours ouvrés d’un mois', () => {
    expect(businessDaysInMonth(2026, 5)).toBe(17); // mai 2026 : 21 jours de semaine - 4 fériés (1er, 8, 14, 25)
    expect(businessDaysInMonth(2026, 10)).toBe(22);
  });

  it('gère les bornes et les périodes vides', () => {
    expect(businessDaysBetween('2026-10-05', '2026-10-09')).toBe(5);
    expect(businessDaysBetween('2026-10-09', '2026-10-05')).toBe(0);
  });

  it('intersecte une mission avec un mois', () => {
    expect(businessDaysOverlap('2026-10-15', null, 2026, 10)).toBe(12);
    expect(businessDaysOverlap('2026-09-01', '2026-10-09', 2026, 10)).toBe(7);
    expect(businessDaysOverlap('2026-11-01', null, 2026, 10)).toBe(0);
  });
});
