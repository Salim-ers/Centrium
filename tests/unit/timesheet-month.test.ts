import { describe, expect, it } from 'vitest';
import { daysLabel, expectedDays, monthChecks, monthTotals, prefillCorrections, type MonthDay } from '@/lib/timesheets/month';

const worked = (day_date: string, extra: Partial<MonthDay> = {}): MonthDay => ({ day_date, kind: 'worked', duration: 1, ...extra });

/** Ce que pose le trigger de la migration 026 : tous les jours ouvrés du mois, « travaillé ». */
function triggerPrefill(year: number, month: number): MonthDay[] {
  const out: MonthDay[] = [];
  for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) out.push(worked(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
  }
  return out;
}

describe('CRA : jours du mois', () => {
  it('jours attendus : ouvrés, hors fériés, dans la période de la mission', () => {
    expect(expectedDays(2026, 10, { start_date: '2026-10-27', end_date: '2027-04-04' })).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
    const november = expectedDays(2026, 11, null);
    expect(november).toHaveLength(20);
    expect(november).not.toContain('2026-11-11');
    expect(expectedDays(2026, 9, { start_date: '2026-06-28', end_date: '2026-09-26' })).toHaveLength(19);
  });

  it('corrige le pré-remplissage : jours hors mission retirés, fériés marqués', () => {
    const october = prefillCorrections({ start_date: '2026-10-27', end_date: null }, triggerPrefill(2026, 10));
    expect(october.clear).toHaveLength(18);
    expect(october.clear[0]).toBe('2026-10-01');
    expect(october.clear.at(-1)).toBe('2026-10-26');
    expect(october.holidays).toEqual([]);
    expect(prefillCorrections(null, triggerPrefill(2026, 11))).toEqual({ clear: [], holidays: ['2026-11-11'] });
    // Une absence déjà saisie un jour férié n'est pas touchée.
    expect(prefillCorrections(null, [{ day_date: '2026-11-11', kind: 'paid_leave', duration: 0 }]).holidays).toEqual([]);
  });

  it('contrôles avant envoi : jour manquant, saisie hors mission, férié travaillé', () => {
    const span = { start_date: '2026-06-28', end_date: '2026-09-26' };
    const september = triggerPrefill(2026, 9).filter((d) => d.day_date <= '2026-09-26' && d.day_date !== '2026-09-14');
    expect(monthChecks(2026, 9, span, september)).toEqual([{ id: 'unfilled', days: ['2026-09-14'] }]);
    expect(monthChecks(2026, 9, span, [...september, worked('2026-09-14'), worked('2026-09-28')])).toEqual([{ id: 'outside', days: ['2026-09-28'] }]);
    const july = [...triggerPrefill(2026, 7)];
    expect(monthChecks(2026, 7, span, july)).toEqual([{ id: 'holiday_worked', days: ['2026-07-14'] }]);
    expect(monthChecks(2026, 7, span, july.map((d) => (d.day_date === '2026-07-14' ? { ...d, kind: 'holiday' as const, duration: 0 } : d)))).toEqual([]);
  });

  it('totaux : demi-journées, télétravail et absences', () => {
    const t = monthTotals([
      worked('2026-10-27'),
      worked('2026-10-28', { duration: '0.5' }),
      worked('2026-10-29', { is_remote: true }),
      { day_date: '2026-10-30', kind: 'paid_leave', duration: 0 },
      { day_date: '2026-11-11', kind: 'holiday', duration: 0 },
    ]);
    expect(t).toMatchObject({ worked: 2.5, remote: 1, paid_leave: 1, holiday: 1, absences: 1 });
  });

  it('libellés de jours', () => {
    expect(daysLabel(['2026-09-14'], 'fr')).toBe('lun. 14 sept.');
    expect(daysLabel(['2026-10-05', '2026-10-01', '2026-10-02'], 'fr')).toBe('1er, 2 et 5 oct.');
    expect(daysLabel(prefillCorrections({ start_date: '2026-10-27', end_date: null }, triggerPrefill(2026, 10)).clear, 'fr')).toBe('du 1er au 26 oct.');
    expect(daysLabel(['2026-10-01', '2026-10-02'], 'en')).toMatch(/^1 and 2 /);
    expect(daysLabel([], 'fr')).toBe('');
  });
});
