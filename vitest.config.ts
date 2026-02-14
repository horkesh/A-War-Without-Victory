/**
 * Vitest config: run only tests that use Vitest (describe/it/expect from 'vitest').
 * The rest of the suite uses Node's node:test — run those with: npm test (tsx --test).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/brigade_*.test.ts',
      'tests/settlement_control.test.ts',
      'tests/corps_command.test.ts',
      'tests/aor_reshaping.test.ts',
      'tests/bot_three_sides_validation.test.ts',
    ],
    globals: false,
  },
});
