import { describe, test } from 'vitest';

describe.skip('skipped file', () => {
  test('does not run', () => {});
});
