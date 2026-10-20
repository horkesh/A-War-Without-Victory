import { expect, test, vi } from 'vitest';

test('leaves a fake epoch clock active', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(0));
  expect(Date.now()).toBe(0);
});
