import { expect, it } from 'vitest';

it('is an intentional child-process failure control', () => {
  expect('failure-control').toBe('unexpected-success');
});
