import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import {
  setScenarioStartDate,
  turnToDateString,
  turnToMonthYear,
  turnToShortLabel,
  turnToWeekString,
} from '../../src/ui/warroom/components/warroom_utils.js';

describe('warroom date localization', () => {
  afterEach(() => {
    setLocale('en');
    setScenarioStartDate(undefined);
  });

  it('keeps English warroom date labels as the default locale', () => {
    setLocale('en');
    setScenarioStartDate({ year: 1991, month: 8, day: 1 });

    expect(turnToDateString(0)).toBe('1 September 1991');
    expect(turnToMonthYear(0)).toBe('SEPTEMBER 1991');
    expect(turnToWeekString(0)).toBe('Week 1, September 1991');
    expect(turnToShortLabel(0)).toBe('Sep 1991');
  });

  it('localizes warroom date labels in BCS mode', () => {
    setLocale('bcs');
    setScenarioStartDate({ year: 1991, month: 8, day: 1 });

    expect(turnToDateString(0)).toBe('1 septembar 1991');
    expect(turnToMonthYear(0)).toBe('SEPTEMBAR 1991');
    expect(turnToWeekString(0)).toBe('Sedmica 1, septembar 1991');
    expect(turnToShortLabel(0)).toBe('sep 1991');
  });
});
