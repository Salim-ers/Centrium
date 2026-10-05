import { describe, expect, it } from 'vitest';

import { AUTOMATION_RULES, resolveAutomations } from '@/lib/automations/rules';
import { notificationGroup, notificationLevel } from '@/components/layout/NotificationCenter';

describe('resolveAutomations', () => {
  it('returns every rule with its default when nothing is stored', () => {
    // Act
    const s = resolveAutomations(undefined);

    // Assert
    expect(Object.keys(s)).toHaveLength(AUTOMATION_RULES.length);
    for (const rule of AUTOMATION_RULES) expect(s[rule.id].enabled).toBe(rule.defaultEnabled);
  });

  it('applies stored overrides and ignores malformed or unknown entries', () => {
    const s = resolveAutomations({
      client_request_to_opportunity: { enabled: false },
      mission_ending_alerts: { enabled: 'no' },
      unknown_rule: { enabled: false },
    });
    expect(s.client_request_to_opportunity.enabled).toBe(false);
    expect(s.mission_ending_alerts.enabled).toBe(true);
    expect('unknown_rule' in s).toBe(false);
  });
});

describe('notificationGroup', () => {
  it('files client decisions on timesheets under CRA, not commercial', () => {
    expect(notificationGroup('timesheet_client_decision')).toBe('cra');
  });
  it('files client requests and quote decisions under commercial', () => {
    expect(notificationGroup('client_request')).toBe('commercial');
    expect(notificationGroup('quote_decision')).toBe('commercial');
  });
});

describe('notificationLevel', () => {
  it('maps alert priorities to urgent, to-do and information', () => {
    expect(notificationLevel('critical')).toBe('urgent');
    expect(notificationLevel('high')).toBe('urgent');
    expect(notificationLevel('medium')).toBe('todo');
    expect(notificationLevel('low')).toBe('info');
  });
  it('treats a missing priority as a to-do', () => {
    expect(notificationLevel(null)).toBe('todo');
    expect(notificationLevel(undefined)).toBe('todo');
  });
});
