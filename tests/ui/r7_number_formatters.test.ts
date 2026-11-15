import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { fmtK, formatCount, formatLocaleNumber, formatPersonnel } from '../../src/ui/map/utils/formatters.js';

describe('R7 compact number scale boundaries', () => {
  it.each([
    [999, '999'],
    [1_000, '1k'],
    [999_999, '1000k'],
    [1_000_000, '1M'],
    [1_211_000, '1.2M'],
  ])('formats %i without changing its scale', (value, expected) => {
    expect(fmtK(value)).toBe(expected);
  });
});

// RT3: Chromium and Electron ship ICU data that renders `bs-BA` with English commas
// (52,645). jsdom and Node render it correctly, so a test that only calls
// toLocaleString('bs-BA') passes while the shipped app is wrong. These tests assert the
// formatted strings directly and prove the formatter never asks the runtime for bs-BA.
describe('BCS number grouping does not depend on runtime ICU data', () => {
  afterEach(() => {
    setLocale('en');
    vi.restoreAllMocks();
  });

  it('groups BCS thousands with a dot and decimals with a comma', () => {
    expect(formatLocaleNumber(52_645, {}, true)).toBe('52.645');
    expect(formatLocaleNumber(1_234_567, {}, true)).toBe('1.234.567');
    expect(formatLocaleNumber(999, {}, true)).toBe('999');
    expect(formatLocaleNumber(1.5, { minimumFractionDigits: 1 }, true)).toBe('1,5');
    expect(formatLocaleNumber(52_645.25, { maximumFractionDigits: 2 }, true)).toBe('52.645,25');
    expect(formatLocaleNumber(52_645, { useGrouping: false }, true)).toBe('52645');
  });

  it('keeps English grouping for English', () => {
    expect(formatLocaleNumber(52_645, {}, false)).toBe('52,645');
    expect(formatLocaleNumber(1.5, { minimumFractionDigits: 1 }, false)).toBe('1.5');
  });

  it('formatCount and the compact formatters follow the active locale', () => {
    setLocale('bcs');
    expect(formatCount(52_645)).toBe('52.645');
    expect(formatCount(1_950_000)).toBe('1.950.000');
    expect(formatPersonnel(1_500)).toBe('1,5k');
    expect(formatPersonnel(52_645)).toBe('52,6k');
    expect(fmtK(1_211_000)).toBe('1,2M');
    setLocale('en');
    expect(formatCount(52_645)).toBe('52,645');
    expect(formatPersonnel(1_500)).toBe('1.5k');
  });

  it('only ever asks Intl for en-US, so an ICU that mangles bs-BA cannot reach the screen', () => {
    const requested: Array<string | string[] | undefined> = [];
    const RealNumberFormat = Intl.NumberFormat;
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(((locales?: string | string[], options?: Intl.NumberFormatOptions) => {
      requested.push(locales);
      return new RealNumberFormat(locales, options);
    }) as unknown as typeof Intl.NumberFormat);
    const toLocaleString = vi.spyOn(Number.prototype, 'toLocaleString');

    setLocale('bcs');
    expect(formatCount(52_645)).toBe('52.645');
    expect(formatPersonnel(52_645)).toBe('52,6k');
    expect(requested.length).toBeGreaterThan(0);
    expect(requested.every((locale) => locale === 'en-US')).toBe(true);
    expect(toLocaleString).not.toHaveBeenCalled();
  });
});
