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
            'tests/scenario_continue_from_save_equivalence.test.ts',
        ];
        const fastRepresentatives = [
            'tests/alliance_lifecycle.test.ts',
            'tests/test_discovery_contract.test.ts',
            'tests/combat_exhaustion.test.ts',
            'tests/combat_front_emergence.test.ts',
            'tests/combat_summary.test.ts',
            'tests/combat_state_schema.test.ts',
            'tests/desktop_packaging_contract.test.ts',
            'tests/desktop_sim_bundle_smoke.test.ts',
            'tests/early_war_state_schema.test.ts',
            'tests/early_war_turn_structure.test.ts',
            'tests/front_assignment.test.ts',
            'tests/front_posture_commitment.test.ts',
            'tests/game_state_shape.test.ts',
            'tests/negotiation_pressure.test.ts',
            'tests/scenario_registry.test.ts',
            'tests/serialize_gamestate_stability.test.ts',
            'tests/state.test.ts',
            'tests/turn_pipeline.test.ts',
            'tests/turn_pipeline_order.test.ts',
            'tests/ui_map_panel_rail.test.ts',
            'tests/ui_map_deck_counter_visibility.test.ts',
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
});
