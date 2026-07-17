import { describe, expect, it } from 'vitest';

import {
  isCommandBriefingItemCurrent,
  resolveCommandBriefingHeadline,
} from '../../src/ui/map/data/commandBriefingCopy.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

describe('command briefing count summary', () => {
  it('states both the total row count and the warning subset', () => {
    setLocale('en');
    const briefing = {
      headline: '4 items of note.',
      criticalCount: 0,
      pendingCount: 5,
      items: [
        { severity: 'warning' as const },
        { severity: 'warning' as const },
        { severity: 'warning' as const },
        { severity: 'warning' as const },
        { severity: 'info' as const },
      ],
    };

    expect(resolveCommandBriefingHeadline(briefing)).toBe(
      '5 items in this briefing. 4 warnings need review.',
    );
  });

  it('derives critical priority from visible rows rather than a stale saved count', () => {
    setLocale('en');
    const briefing = {
      headline: '2 critical items require attention.',
      criticalCount: 2,
      pendingCount: 2,
      items: [
        { severity: 'warning' as const },
        { severity: 'info' as const },
      ],
    };

    expect(resolveCommandBriefingHeadline(briefing)).toBe(
      '2 items in this briefing. 1 warning needs review.',
    );
  });

  it('keeps a peace-plan briefing only while that exact plan is pending', () => {
    const item = {
      id: 'dip-peace-plan',
      kind: 'diplomatic' as const,
      severity: 'critical' as const,
      title: 'Peace plan requires response',
      detail: 'A peace plan has been proposed.',
      target: { type: 'peace_plan' as const, peacePlanId: 'vance_owen', label: 'Peace plan' },
    };
    const pending = {
      planId: 'vance_owen',
      planName: 'Vance-Owen Peace Plan',
      narrative: 'A proposal.',
      turnOffered: 40,
      proposedSplit: { RBiH: 0, RS: 0, HRHB: 0 },
      institutionalModel: 'cantons',
      botResponses: {},
    };

    expect(isCommandBriefingItemCurrent(item, pending)).toBe(true);
    expect(isCommandBriefingItemCurrent(item, undefined)).toBe(false);
    expect(isCommandBriefingItemCurrent(item, { ...pending, planId: 'other_plan' })).toBe(false);
  });
});
