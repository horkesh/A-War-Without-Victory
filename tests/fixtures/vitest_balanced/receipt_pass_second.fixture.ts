import { expect, test } from 'vitest';

test('also passes', () => {
  expect('second').toContain('cond');
});
