import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { formatWarPlanningTurnDate } from '../../src/ui/warroom/components/WarPlanningMap.js';

describe('war planning map date localization', () => {
  afterEach(() => {
    setLocale('en');
  });

  it('keeps English abbreviated month labels by default', () => {
    setLocale('en');

    expect(formatWarPlanningTurnDate(0)).toBe('1 Sep 1991');
  });

  it('localizes abbreviated month labels in BCS mode', () => {
    setLocale('bcs');

    expect(formatWarPlanningTurnDate(0)).toBe('1 sep 1991');
  });
});
