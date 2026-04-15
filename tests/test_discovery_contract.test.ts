import { describe, expect, it } from 'vitest';
// @ts-expect-error JS-only repo helper exercised at runtime by the test suite.
import { discoverTests, toRepoRelative } from '../tools/test/discover_test_files.mjs';

describe('test discovery contracts', () => {
    it('routes desktop contract guardrails through vitest instead of node:test', () => {
        const rootDir = process.cwd();
        const discovered = discoverTests(rootDir);
        const vitestFiles = new Set(toRepoRelative(rootDir, discovered.vitestFiles));
        const nodeTestFiles = new Set(toRepoRelative(rootDir, discovered.nodeTestFiles));
        const desktopGuardrails = [
            'tests/desktop_campaign_start_contract.test.ts',
            'tests/desktop_packaging_contract.test.ts',
            'tests/desktop_packaged_runtime_probe.test.ts',
            'tests/desktop_sim_bundle_smoke.test.ts',
            'tests/desktop_startup_snapshot_guardrails.test.ts',
            'tests/desktop_release_ci_guardrails.test.ts',
            'tests/startup_snapshot_contract.test.ts',
        ];

        for (const file of desktopGuardrails) {
            expect(vitestFiles.has(file), `${file} should be owned by vitest discovery`).toBe(true);
            expect(nodeTestFiles.has(file), `${file} should not stay in node:test discovery`).toBe(false);
        }
    });

    it('splits vitest files into fast and scenario slices without overlap', () => {
        const rootDir = process.cwd();
        const discovered = discoverTests(rootDir);
        const vitestFiles = new Set(toRepoRelative(rootDir, discovered.vitestFiles));
        const scenarioVitestFiles = new Set(toRepoRelative(rootDir, discovered.scenarioVitestFiles));
        const fastVitestFiles = new Set(toRepoRelative(rootDir, discovered.fastVitestFiles));
        const scenarioRepresentatives = [
            'tests/integration_scenario_roundtrip.test.ts',
            'tests/integration_run_summary.test.ts',
            'tests/scenario_control_change_attribution_contract.test.ts',
            'tests/scenario_continue_from_save_equivalence.test.ts',
            'tests/scenario_end_report_h1_5.test.ts',
            'tests/scenario_failure_reporting_h1_5_1.test.ts',
            'tests/scenario_init_control_apr1992.test.ts',
            'tests/scenario_init_formations.test.ts',
            'tests/victory_conditions_a2.test.ts',
        ];
        const fastRepresentatives = [
            'tests/alliance_lifecycle.test.ts',
            'tests/acceptance_brcko_completeness.test.ts',
            'tests/acceptance_constraints.test.ts',
            'tests/test_discovery_contract.test.ts',
            'tests/combat_exhaustion.test.ts',
            'tests/combat_front_emergence.test.ts',
            'tests/combat_summary.test.ts',
            'tests/combat_state_schema.test.ts',
            'tests/control_change_attribution.test.ts',
            'tests/bot_manager_a1.test.ts',
            'tests/bot_operation_objective_focus.test.ts',
            'tests/competence_valuations.test.ts',
            'tests/dev_ui_exports_deterministic.test.ts',
            'tests/dev_ui_phase16.test.ts',
            'tests/desktop_packaging_contract.test.ts',
            'tests/desktop_sim_bundle_smoke.test.ts',
            'tests/displacement_pipeline_state_schema.test.ts',
            'tests/displacement_takeover.test.ts',
            'tests/early_war_state_schema.test.ts',
            'tests/early_war_turn_structure.test.ts',
            'tests/emergence_pipeline_integration.test.ts',
            'tests/emergence_pressure_schema.test.ts',
            'tests/end_state.test.ts',
            'tests/front_assignment.test.ts',
            'tests/front_posture_commitment.test.ts',
            'tests/game_state_shape.test.ts',
            'tests/generate_formations.test.ts',
            'tests/formations_validate.test.ts',
            'tests/brigade_history.test.ts',
            'tests/commander_override_reachability.test.ts',
            'tests/identity_migration.test.ts',
            'tests/militia_pools.test.ts',
            'tests/local_truces.test.ts',
            'tests/morale_combat.test.ts',
            'tests/migration_nested_ownership.test.ts',
            'tests/minority_flight.test.ts',
            'tests/multi_axis_operations.test.ts',
            'tests/negotiation_offers.test.ts',
            'tests/officer_quality.test.ts',
            'tests/operation_birth_anomaly_contract.test.ts',
            'tests/orphan_operation_brigades.test.ts',
            'tests/officer_system.test.ts',
            'tests/pre_planned_operations.test.ts',
            'tests/territorial_valuation.test.ts',
            'tests/recruitment_engine.test.ts',
            'tests/negotiation_pressure.test.ts',
            'tests/organizational_penetration_formula.test.ts',
            'tests/scenario_registry.test.ts',
            'tests/scenario_end_report_army_strengths.test.ts',
            'tests/scenario_reporting_contracts.test.ts',
            'tests/consolidation_scoring.test.ts',
            'tests/hv_integration.test.ts',
            'tests/production_facilities_a3.test.ts',
            'tests/sarajevo_exception.test.ts',
            'tests/sector_coverage_defense.test.ts',
            'tests/sector_frontline_contiguity_repro.test.ts',
            'tests/sector_offensive.test.ts',
            'tests/serialize_gamestate_stability.test.ts',
            'tests/supply_gating.test.ts',
            'tests/sustainability.test.ts',
            'tests/supply_reachability.test.ts',
            'tests/state.test.ts',
            'tests/to_terrain_combat.test.ts',
            'tests/troop_balance_lifecycle.test.ts',
            'tests/treaty.test.ts',
            'tests/treaty_apply_military.test.ts',
            'tests/triggered_operations.test.ts',
            'tests/turn_pipeline.test.ts',
            'tests/turn_pipeline_order.test.ts',
            'tests/ui_map_panel_rail.test.ts',
            'tests/osid_column_movement.test.ts',
            'tests/ui_map_deck_counter_visibility.test.ts',
            'tests/ui_map_fog_and_operation_contracts.test.ts',
            'tests/ui_map_front_lines_phase_a.test.ts',
            'tests/ui_map_game_state_adapter.test.ts',
            'tests/war_stories.test.ts',
        ];

        expect(discovered.fastVitestFiles.length + discovered.scenarioVitestFiles.length).toBe(discovered.vitestFiles.length);

        for (const file of vitestFiles) {
            const inScenarioSlice = scenarioVitestFiles.has(file);
            const inFastSlice = fastVitestFiles.has(file);
            expect(inScenarioSlice || inFastSlice, `${file} should belong to one vitest slice`).toBe(true);
            expect(inScenarioSlice && inFastSlice, `${file} should not belong to both vitest slices`).toBe(false);
        }

        for (const file of scenarioRepresentatives) {
            expect(scenarioVitestFiles.has(file), `${file} should be classified as scenario-heavy vitest`).toBe(true);
            expect(fastVitestFiles.has(file), `${file} should not remain in the fast vitest slice`).toBe(false);
        }

        for (const file of fastRepresentatives) {
            expect(fastVitestFiles.has(file), `${file} should stay in the fast vitest slice`).toBe(true);
            expect(scenarioVitestFiles.has(file), `${file} should not drift into the scenario vitest slice`).toBe(false);
        }
    });

    it('keeps the heaviest scenario artifact proof in node:test until it stops needing harness-shaped execution', () => {
        const rootDir = process.cwd();
        const discovered = discoverTests(rootDir);
        const vitestFiles = new Set(toRepoRelative(rootDir, discovered.vitestFiles));
        const nodeTestFiles = new Set(toRepoRelative(rootDir, discovered.nodeTestFiles));
        const keeper = 'tests/scenario_vrs_operation_proof.test.ts';

        expect(nodeTestFiles.has(keeper), `${keeper} should remain a node:test harness keeper`).toBe(true);
        expect(vitestFiles.has(keeper), `${keeper} should not drift into vitest discovery yet`).toBe(false);
    });

    it('ignores helper files under tests that are not test-entrypoints', () => {
        const rootDir = process.cwd();
        const discovered = discoverTests(rootDir);
        const discoveredFiles = new Set(
            toRepoRelative(rootDir, [
                ...discovered.vitestFiles,
                ...discovered.nodeTestFiles,
            ])
        );

        expect(discoveredFiles.has('tests/test_factories.ts')).toBe(false);
    });
});
