/**
 * Vitest config: run only tests that use Vitest (describe/it/expect from 'vitest').
 * The rest of the suite uses Node's node:test — run those with: npm test (tsx --test).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/brigade_*.test.ts', 'tests/settlement_control.test.ts', 'tests/corps_command.test.ts', 'tests/aor_reshaping.test.ts', 'tests/bot_three_sides_validation.test.ts', 'tests/corps_aor_contiguity.test.ts', 'tests/sandbox_slice_determinism.test.ts', 'tests/operational_data_osid.test.ts', 'tests/linked_zoc.test.ts', 'tests/ongoing_mobilization.test.ts', 'tests/displacement_reporting_fix.test.ts', 'tests/proto_brigade_spawn.test.ts', 'tests/activate_corps.test.ts', 'tests/supply_reserves.test.ts', 'tests/enclave_resilience_phase_c.test.ts', 'tests/supply_reserves_phase_b.test.ts'],
    globals: false
  }
});