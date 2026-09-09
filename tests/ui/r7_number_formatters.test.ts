import { describe, expect, it } from 'vitest';
import { fmtK } from '../../src/ui/map/utils/formatters.js';

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
