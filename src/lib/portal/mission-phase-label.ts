// Libellés de la phase d'une mission côté consultant : pastille + phrase
// courte (« démarre dans 22 jours », « se termine dans 12 jours »).

import type { StatusTone } from '@/components/ui/status-pill';
import { formatDate } from '@/lib/format';
import { MISSION_STATUS, statusOf } from '@/lib/status';
import type { Availability, MissionPhase } from './consultant-home';

type Lang = 'fr' | 'en';

const days = (n: number, lang: Lang) => (lang === 'fr' ? `${n} jour${n > 1 ? 's' : ''}` : `${n} day${n > 1 ? 's' : ''}`);

export function phaseDisplay(
  phase: MissionPhase,
  m: { status: string; start_date: string; end_date: string | null },
  lang: Lang,
): { label: string; tone: StatusTone; detail: string | null; soon: boolean } {
  const fr = lang === 'fr';
  switch (phase.kind) {
    case 'upcoming':
      return {
        label: fr ? 'À venir' : 'Upcoming',
        tone: 'info',
        detail:
          phase.inDays <= 1
            ? fr
              ? 'démarre demain'
              : 'starts tomorrow'
            : phase.inDays <= 30
              ? fr
                ? `démarre dans ${days(phase.inDays, lang)}`
                : `starts in ${days(phase.inDays, lang)}`
              : fr
                ? `démarre le ${formatDate(m.start_date, lang)}`
                : `starts on ${formatDate(m.start_date, lang)}`,
        soon: false,
      };
    case 'running': {
      const left = phase.daysLeft;
      return {
        label: fr ? 'En cours' : 'Ongoing',
        tone: 'success',
        detail:
          left == null
            ? fr
              ? 'sans date de fin'
              : 'open-ended'
            : left === 0
              ? fr
                ? 'se termine aujourd’hui'
                : 'ends today'
              : left <= 30
                ? fr
                  ? `se termine dans ${days(left, lang)}`
                  : `ends in ${days(left, lang)}`
                : fr
                  ? `jusqu’au ${formatDate(m.end_date, lang)}`
                  : `until ${formatDate(m.end_date, lang)}`,
        soon: left != null && left <= 30,
      };
    }
    case 'ended':
      return {
        label: fr ? 'Terminée' : 'Ended',
        tone: 'neutral',
        detail: phase.on ? (fr ? `terminée le ${formatDate(phase.on, lang)}` : `ended on ${formatDate(phase.on, lang)}`) : null,
        soon: false,
      };
    default: {
      const st = statusOf(MISSION_STATUS, m.status, lang);
      return { label: st.label, tone: st.tone, detail: null, soon: false };
    }
  }
}

/** Disponibilité vue par le consultant : un titre et une précision. */
export function availabilityDisplay(a: Availability, lang: Lang): { title: string; detail: string | null } {
  const fr = lang === 'fr';
  switch (a.kind) {
    case 'on_mission':
      return {
        title: fr ? 'En mission' : 'On mission',
        detail: a.until ? (fr ? `jusqu’au ${formatDate(a.until, lang)}` : `until ${formatDate(a.until, lang)}`) : fr ? 'sans date de fin' : 'open-ended',
      };
    case 'upcoming':
      return { title: fr ? 'Mission à venir' : 'Upcoming mission', detail: fr ? `démarre le ${formatDate(a.start, lang)}` : `starts on ${formatDate(a.start, lang)}` };
    case 'unavailable':
      return {
        title: fr ? 'Indisponible' : 'Unavailable',
        detail: a.date ? (fr ? `disponible à partir du ${formatDate(a.date, lang)}` : `available from ${formatDate(a.date, lang)}`) : null,
      };
    case 'available_from':
      return { title: fr ? `Disponible à partir du ${formatDate(a.date, lang)}` : `Available from ${formatDate(a.date, lang)}`, detail: null };
    case 'available':
      return { title: fr ? 'Disponible' : 'Available', detail: fr ? 'dès maintenant' : 'right now' };
  }
}
