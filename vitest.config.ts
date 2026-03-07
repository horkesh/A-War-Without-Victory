/**
 * Vitest config: run only tests that use Vitest (describe/it/expect from 'vitest').
 * The rest of the suite uses Node's node:test — run those with: npm test (tsx --test).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/brigade_aor.test.ts', 'tests/brigade_composition.test.ts', 'tests/brigade_corps_front_assign.test.ts', 'tests/brigade_deploy_orders.test.ts', 'tests/brigade_posture.test.ts', 'tests/brigade_pressure.test.ts', 'tests/settlement_control.test.ts', 'tests/corps_command.test.ts', 'tests/aor_reshaping.test.ts', 'tests/bot_three_sides_validation.test.ts', 'tests/corps_aor_contiguity.test.ts', 'tests/sandbox_slice_determinism.test.ts', 'tests/operational_data_osid.test.ts', 'tests/ongoing_mobilization.test.ts', 'tests/displacement_reporting_fix.test.ts', 'tests/proto_brigade_spawn.test.ts', 'tests/activate_corps.test.ts', 'tests/supply_reserves.test.ts', 'tests/enclave_resilience_phase_c.test.ts', 'tests/supply_reserves_phase_b.test.ts', 'tests/war_timeline.test.ts', 'tests/ui_map_interactions.test.ts', 'tests/ui_map_officers_phase_e.test.ts', 'tests/supply_airdrop.test.ts', 'tests/supply_phase_e1.test.ts', 'tests/supply_phase_e2_bombardment.test.ts', 'tests/sector_intel.test.ts', 'tests/scenario_operation_diagnostics.test.ts', 'tests/sector_contiguity_split.test.ts', 'tests/sector_rearrangement.test.ts', 'tests/sector_stance_orders.test.ts', 'tests/operation_tempo.test.ts', 'tests/phase_c_supply_agency.test.ts', 'tests/h_phase_intelligence_warfare.test.ts', 'tests/scenario_runner_artifact_repair.test.ts', 'tests/sector_offensive_idle_recovery.test.ts'],
    globals: false
  }
});
