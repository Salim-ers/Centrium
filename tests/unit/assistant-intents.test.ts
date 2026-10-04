import { describe, expect, it } from 'vitest';
import { parseIntent } from '@/lib/assistant/intents';

const TODAY = new Date(2026, 9, 4); // 4 octobre 2026

describe('assistant — compréhension des questions', () => {
  it('consultants disponibles le mois prochain', () => {
    const i = parseIntent('Quels consultants deviennent disponibles le mois prochain ?', TODAY);
    expect(i).toMatchObject({ kind: 'consultants_available', from: '2026-11-01', to: '2026-11-30', skill: null });
  });

  it('CA prévisionnel pour décembre', () => {
    expect(parseIntent('Quel est mon CA prévisionnel pour décembre ?', TODAY)).toEqual({
      kind: 'revenue_forecast',
      year: 2026,
      month: 12,
    });
  });

  it('un mois déjà passé désigne l’année suivante', () => {
    expect(parseIntent('CA de mars', TODAY)).toEqual({ kind: 'revenue_forecast', year: 2027, month: 3 });
  });

  it('missions qui terminent dans moins de 30 jours', () => {
    expect(parseIntent('Quelles missions terminent dans moins de 30 jours ?', TODAY)).toEqual({
      kind: 'missions_ending',
      days: 30,
    });
    expect(parseIntent('missions ending in 15 days', TODAY)).toEqual({ kind: 'missions_ending', days: 15 });
  });

  it('consultants avec une compétence', () => {
    const i = parseIntent('Trouve-moi les consultants AWS disponibles pour cette mission.', TODAY);
    expect(i).toMatchObject({ kind: 'consultants_available', skill: 'aws' });
  });

  it('résumé d’activité client, noms composés compris', () => {
    expect(parseIntent("Résume l'activité du client Orange.", TODAY)).toEqual({
      kind: 'client_summary',
      clientName: 'orange',
    });
    expect(parseIntent("Résume l'activité de la Banque de France", TODAY)).toMatchObject({
      kind: 'client_summary',
      clientName: 'la banque de france',
    });
  });

  it('CRA en attente et intercontrat', () => {
    expect(parseIntent('Combien de CRA en attente de validation ?', TODAY)).toEqual({ kind: 'pending_timesheets' });
    expect(parseIntent('Qui est en intercontrat ?', TODAY)).toEqual({ kind: 'intercontract' });
  });

  it('question non reconnue : jamais devinée', () => {
    expect(parseIntent('Quelle est la météo ?', TODAY)).toEqual({ kind: 'unknown' });
  });
});
