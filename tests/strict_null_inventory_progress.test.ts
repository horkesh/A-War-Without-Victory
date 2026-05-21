import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PHASE_1_FILES = [
    'src/state/game_state.ts',
    'src/state/serialize.ts',
    'src/state/validateGameState.ts',
    'src/state/displacement.ts',
    'src/state/supply_reserves.ts',
];

const PHASE_2_COMBAT_BATCH_4_FILES = [
    'src/sim/combat/army_co_roster_loader.ts',
    'src/sim/combat/attack_casualty_distribution.ts',
    'src/sim/combat/combat_estimate.ts',
];

const PHASE_2_COMBAT_BATCH_5_FILES = [
    'src/sim/combat/combat_math.ts',
    'src/sim/combat/faction_progression.ts',
    'src/sim/combat/operation_casualty_attribution.ts',
    'src/sim/combat/warlord_friction.ts',
];

const PHASE_2_COMBAT_BATCH_7_FILES = [
    'src/sim/combat/attack_history_recording.ts',
    'src/sim/combat/commander/briefing.ts',
    'src/sim/combat/exhaustion.ts',
    'src/sim/combat/militia_garrison.ts',
    'src/sim/combat/osid_graph_analysis.ts',
];

const PHASE_2_COMBAT_BATCH_8_FILES = [
    'src/sim/combat/brigade_movement_query.ts',
];

const PHASE_2_COMBAT_BATCH_9_FILES = [
    'src/sim/combat/bot_brigade_eval_attack.ts',
];

const PHASE_2_COMBAT_BATCH_10_FILES = [
    'src/sim/combat/hv_integration.ts',
    'src/sim/combat/sector_splitting.ts',
];

const PHASE_2_COMBAT_BATCH_11_FILES = [
    'src/sim/combat/brigade_home_return.ts',
    'src/sim/combat/brigade_movement.ts',
    'src/sim/combat/brigade_front_distribution.ts',
];

const PHASE_2_COMBAT_BATCH_12_FILES = [
    'src/sim/combat/rear_pocket_consolidation.ts',
    'src/sim/combat/sector_rearrangement.ts',
    'src/sim/combat/subsegment_assignment.ts',
];

const PHASE_2_COMBAT_BATCH_13_FILES = [
    'src/sim/combat/ongoing_mobilization.ts',
];

const PHASE_2_COMBAT_BATCH_14_FILES = [
    'src/sim/combat/jna_phantom_brigades.ts',
];

const PHASE_2_COMBAT_BATCH_15_FILES = [
    'src/sim/combat/army_reserve_system.ts',
];

const PHASE_2_COMBAT_BATCH_16_FILES = [
    'src/sim/combat/army_order_interpretation.ts',
];

const PHASE_2_COMBAT_BATCH_17_FILES = [
    'src/sim/combat/attack_retreat_displacement.ts',
];

const PHASE_2_COMBAT_BATCH_19_FILES = [
    'src/sim/combat/bot_brigade_ai_osid.ts',
    'src/sim/combat/bot_brigade_eval_front.ts',
    'src/sim/combat/officer_system.ts',
    'src/sim/combat/operation_preparation.ts',
    'src/sim/combat/osid_column_movement.ts',
];

const PHASE_2_COMBAT_BATCH_20_FILES = [
    'src/sim/combat/attack_resolution_osid.ts',
    'src/sim/combat/commander/emit.ts',
    'src/sim/combat/commander/plan.ts',
];

const PHASE_2_COMBAT_BATCH_18_FILES = [
    'src/sim/combat/battle_resolution.ts',
    'src/sim/combat/combat_predictor.ts',
    'src/sim/combat/commander/force_eval.ts',
    'src/sim/combat/corps_operation_readiness.ts',
    'src/sim/combat/front_emergence.ts',
];

const PHASE_3_EARLY_WAR_BATCH_39_FILES = [
    'src/sim/bot/simple_general_bot.ts',
    'src/sim/early_war/authority_degradation.ts',
    'src/sim/early_war/militia_emergence.ts',
];

const PHASE_3_EARLY_WAR_BATCH_40_FILES = [
    'src/sim/early_war/control_flip.ts',
    'src/sim/early_war/control_strain.ts',
    'src/sim/early_war/minority_militia_decay.ts',
    'src/sim/early_war/pool_population.ts',
];

const PHASE_4_SCENARIO_BATCH_41_FILES = [
    'src/scenario/combat_causality.ts',
    'src/scenario/oob_early_war_entry.ts',
];

const PHASE_6_WARROOM_BATCH_42_FILES = [
    'src/ui/warroom/components/FactionOverviewPanel.ts',
    'src/ui/warroom/components/IvpBreakdownModal.ts',
    'src/ui/warroom/components/NewspaperModal.ts',
    'src/ui/warroom/components/ReportsModal.ts',
    'src/ui/warroom/components/warroom_utils.ts',
    'src/ui/warroom/data/war_data_extractor.ts',
];

const SIM_NON_COMBAT_BATCH_43_FILES = [
    'src/sim/codex/dynamic_section_builder.ts',
    'src/sim/compile_turn_summary.ts',
    'src/sim/consolidation_scoring.ts',
    'src/sim/events/evaluate_events.ts',
    'src/sim/local_truces.ts',
];

// Batch 44 lists only the files that are FULLY clean across all
// inventory categories. desktop_sim.ts, corps_dialogue.ts, and
// political_control_init.ts retain non-FactionId-cast escapes (as_unknown
// state-shape widenings + JSON.parse(...) as unknown loader guards) that
// are out of scope for this lane per the safe-slice stop-gates.
const STATE_SIM_DESKTOP_BATCH_44_FILES = [
    'src/sim/negotiation/compute_combat_effective.ts',
    'src/sim/turn_phases/early_war_phases.ts',
    'src/state/assignable_front_segments.ts',
    'src/state/minority_flight.ts',
    'src/state/seed_organizational_penetration_from_control.ts',
];

const WAR_PIPELINE_BATCH_45_FILES = [
    'src/sim/turn_phases/war_phases.ts',
];

const STATE_BATCH_46_FILES = [
    'src/state/displacement.ts',
    'src/state/displacement_takeover.ts',
    'src/state/supply_reserves.ts',
];

const PHASE_2_COMBAT_BATCH_47_FILES = [
    'src/sim/combat/paramilitary_sweep.ts',
    'src/sim/combat/sector_offensive.ts',
    'src/sim/combat/sector_building.ts',
    'src/sim/combat/supply_condition.ts',
];

const PHASE_5_ADAPTER_BATCH_48_FILES = [
    'src/ui/map/data/GameStateAdapter.ts',
];

const AI_COMMANDER_BATCH_49_FILES = [
    'src/sim/ai_commander/response_parser.ts',
];

// Batch C (Strict-Null schema-boundary lane, 2026-05-21): each of the twelve
// files in scope had its `as_unknown_casts` count driven to zero. Per-file
// slice constants pin the floor so future edits cannot silently regress.
// Plan: docs/plans/2026-05-20-strict-null-schema-boundary-validation-plan.md
const BATCH_C_SECTOR_OFFENSIVE_LAUNCH_HELPERS_FILES = [
    'src/sim/combat/sector_offensive_launch_helpers.ts',
];
const BATCH_C_VALIDATE_GAME_STATE_FILES = [
    'src/state/validateGameState.ts',
];
const BATCH_C_REPLAY_FRAME_SUMMARY_FILES = [
    'src/sim/replay/replay_frame_summary.ts',
];
const BATCH_C_WAR_DISPATCHES_FILES = [
    'src/sim/ai_commander/war_dispatches.ts',
];
const BATCH_C_DESKTOP_SIM_FILES = [
    'src/desktop/desktop_sim.ts',
];
const BATCH_C_COLLECT_BRIEFING_FILES = [
    'src/sim/briefing/collect_briefing.ts',
];
const BATCH_C_SERIALIZE_FILES = [
    'src/state/serialize.ts',
];
const BATCH_C_POLITICAL_CONTROL_INIT_FILES = [
    'src/state/political_control_init.ts',
];
const BATCH_C_OOB_LOADER_FILES = [
    'src/scenario/oob_loader.ts',
];
const BATCH_C_SCENARIO_LOADER_FILES = [
    'src/scenario/scenario_loader.ts',
];
const BATCH_C_WAR_TIMELINE_FILES = [
    'src/state/war_timeline.ts',
];
const BATCH_C_BRIGADE_TEMPORAL_EMIT_FILES = [
    'src/scenario/brigade_temporal_emit.ts',
];

const POST_BATCH_C_UNKNOWN_TAIL_FILES = [
    'src/scenario/scenario_runner.ts',
    'src/sim/ai_commander/prompt_builder.ts',
    'src/ui/map/components/AutonomyPanel.tsx',
    'src/ui/map/components/SituationTab.tsx',
    'src/ui/map/components/icons/Icon.tsx',
    'src/ui/map/components/warroom/AdvanceTurnModal.tsx',
    'src/ui/map/desktop/useIPC.ts',
    'src/ui/map/scripts/debugLoadSave.ts',
    'src/ui/warroom/ClickableRegionManager.ts',
];

const VALIDATE_FORMATIONS_AS_ANY_TAIL_FILES = [
    'src/validate/formations.ts',
];

const VALIDATE_MILITIA_POOLS_AS_ANY_TAIL_FILES = [
    'src/validate/militia_pools.ts',
];

const VALIDATE_END_STATE_AS_ANY_TAIL_FILES = [
    'src/validate/end_state.ts',
];

const VALIDATE_FRONT_SEGMENTS_AS_ANY_TAIL_FILES = [
    'src/validate/front_segments.ts',
];

const VALIDATE_FRONT_STATE_AS_ANY_TAIL_FILES = [
    'src/validate/front_posture.ts',
    'src/validate/front_posture_regions.ts',
    'src/validate/front_pressure.ts',
];

const UI_CORPS_FRONT_LINES_AS_ANY_TAIL_FILES = [
    'src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts',
];

const VALIDATE_FACTIONS_SUPPLY_RIGHTS_AS_ANY_TAIL_FILES = [
    'src/validate/factions.ts',
    'src/validate/supply_rights.ts',
];

const LOW_RISK_AS_ANY_LEAF_FILES = [
    'src/map/front_regions.ts',
    'src/sim/economy/smuggling_routes.ts',
    'src/sim/events/strategic_dimensions.ts',
    'src/sim/early_war/alliance_update.ts',
    'src/state/territorial_valuation.ts',
    'src/state/political_control_init.ts',
    'src/ui/map/data/diplomacyView.ts',
];

const UI_WINDOW_BRIDGE_AS_ANY_TAIL_FILES = [
    'src/ui/map/App.tsx',
    'src/ui/map/components/SidePickerOverlay.tsx',
];

const BOT_RESPONSE_INTERACTION_LAYER_AS_ANY_TAIL_FILES = [
    'src/sim/events/bot_response.ts',
    'src/ui/map/map/interactionLayerConfig.ts',
];

const CLI_POLITICAL_SIDE_MAPKIT_AS_ANY_TAIL_FILES = [
    'src/cli/mapkit_validate.ts',
    'src/cli/sim_formations.ts',
    'src/cli/sim_generate_formations.ts',
    'src/cli/sim_militia.ts',
    'src/cli/sim_negcap.ts',
    'src/cli/sim_phase5_check.ts',
    'src/cli/sim_set_posture.ts',
    'src/cli/sim_set_posture_region.ts',
];

const CORE_SINGLETON_AS_ANY_TAIL_FILES = [
    'src/state/serialize.ts',
    'src/state/validateGameState.ts',
    'src/sim/turn_phases/war_phase_negotiation_steps.ts',
    'src/sim/turn_phases/war_phases.ts',
];

const AI_SETTINGS_PANEL_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/AiSettingsPanel.tsx',
];

const CLI_FRONT_STATE_AS_ANY_TAIL_FILES = [
    'src/cli/sim_front_state.ts',
];

const POLITICAL_CONTROL_AUDIT_CLI_AS_ANY_TAIL_FILES = [
    'src/cli/phaseD0_political_control_inputs_audit.ts',
    'src/cli/phaseE4_null_political_control_diagnosis.ts',
];

const CLI_TREATY_AS_ANY_TAIL_FILES = [
    'src/cli/sim_treaty.ts',
];

const UI_WARROOM_DIPLOMACY_STRICT_NULL_TAIL_FILES = [
    'src/ui/warroom/map_viewer_app.ts',
    'src/ui/map/components/DiplomacyOverview.tsx',
];

const EVENT_EFFECTS_LOADED_STATE_UNKNOWN_TAIL_FILES = [
    'src/sim/events/apply_effects.ts',
    'src/ui/map/__mocks__/loadedGameState.ts',
];

const FORCE_READINESS_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/army_hq/ForceReadiness.tsx',
];

// The Phase 5 GameStateAdapter Batch 48 ceiling pins the per-file inventory
// count at exactly 10 retained escapes documented in
// `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`:
//   - 1 JSON entry boundary at L401 (`json: unknown` → `any`)
//   - 4 `Record<string, unknown>` field widenings at L551/607/665/736
//     (f.ops, f.combat_summary, f.brigade_history × 2 — load-bearing for
//     downstream free-form property access through the FormationRecord
//     `Record<string, unknown>` boundary)
//   - 2 multi-branch ternary widenings at L934 + L2278 (`activeOps` /
//     `opsArray` joining a typed-array branch with a `[singleton]` branch)
//   - 1 JSON-import baseline cast at L2916 (`historicalBaseline as any`
//     to bypass structural mismatch with the `HistoricalBaseline` interface
//     across a JSON resolve)
//   - 2 UI-local literal-union `FactionId` casts at L1842 + L1863 — the
//     UI `FactionId` in `src/ui/map/data/types.ts:8` is the literal union
//     `'RS' | 'RBiH' | 'HRHB' | null` and SHADOWS the engine
//     `FactionId = string` alias from `src/state/game_state.ts:45`; the
//     `string` source value (`ENCLAVE_UI_DEFINITIONS[i].faction`) does not
//     structurally match the literal union without the cast.
const ACCEPTED_PHASE_5_ADAPTER_BATCH_48_REMAINING = 10;

const ESCAPE_CATEGORIES = [
    'as_factionid_casts',
    'as_unknown_casts',
    'as_any_casts',
    'non_null_assertions_dot',
    'non_null_assertions_index',
] as const;

const ACCEPTED_PHASE_1_REMAINING_ESCAPE_HATCHES = 25;

type EscapeCategory = typeof ESCAPE_CATEGORIES[number];

interface InventoryCategory {
    counts_by_file?: Record<string, number>;
}

interface StrictNullInventory {
    categories: Record<string, InventoryCategory>;
}

function phaseCount(inventory: StrictNullInventory, category: EscapeCategory, files: readonly string[]): number {
    const countsByFile = inventory.categories[category]?.counts_by_file ?? {};
    return files.reduce((sum, file) => sum + (countsByFile[resolve(file)] ?? 0), 0);
}

describe('strict null inventory progress', () => {
    it('keeps Phase 1 state-schema escape hatches at or below the accepted deferred ceiling', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_1_FILES),
            0,
        );

        expect(currentTotal).toBeLessThanOrEqual(ACCEPTED_PHASE_1_REMAINING_ESCAPE_HATCHES);
    });

    it('cleans the Batch 4 Phase 2 combat leaf slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_4_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 5 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_5_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 7 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_7_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 8 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_8_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 9 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_9_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 10 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_10_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 11 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_11_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 12 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_12_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 13 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_13_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 14 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_14_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 15 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_15_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 16 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_16_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 17 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_17_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 18 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_18_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 19 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_19_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 20 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_20_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 39 Phase 3 early-war + bot safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_3_EARLY_WAR_BATCH_39_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 40 Phase 3 early-war continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_3_EARLY_WAR_BATCH_40_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 41 Phase 4 scenario safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_4_SCENARIO_BATCH_41_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 42 Phase 6 warroom safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_6_WARROOM_BATCH_42_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 43 sim non-combat safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, SIM_NON_COMBAT_BATCH_43_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 44 state + sim + desktop safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, STATE_SIM_DESKTOP_BATCH_44_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 45 war pipeline FactionId-cast slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // war_phases.ts retains save-shape-preserving non-null assertions on
        // optional supply_reserve / heavy_munitions_reserve / events_fired
        // collections plus one deliberately preserved `as any` widening. Those
        // are documented as out-of-scope per the lane's save-shape stop-gate
        // (analogous to the Batch 19 commander_march_correction precedent).
        // This slice pins only the as_factionid_casts category at zero.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', WAR_PIPELINE_BATCH_45_FILES);

        expect(factionIdCount).toBe(0);
    });

    it('cleans the Batch 46 state FactionId-cast slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // displacement.ts, displacement_takeover.ts, and supply_reserves.ts
        // retain save-shape-preserving `non_null_assertions_index` escapes on
        // optional state collections (e.g. `state.military.general_supply_reserve![fid]`)
        // that would shift serialized save shape if rewritten to an idempotent
        // default-init. Those are documented as out-of-scope per the lane's
        // save-shape stop-gate (analogous to the Batch 19 / Batch 45 precedent).
        // This slice pins only the as_factionid_casts category at zero.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', STATE_BATCH_46_FILES);

        expect(factionIdCount).toBe(0);
    });

    it('cleans the Batch 47 Phase 2 combat closeout FactionId-cast slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // paramilitary_sweep.ts, sector_offensive.ts, sector_building.ts, and
        // supply_condition.ts close out the Batch 46-D decision packet's
        // Phase 2 combat sites. Other inventory categories in these files
        // remain out-of-scope per the Phase 2 long-tail classification
        // (gated / load-bearing / save-shape / cross-file refactor): see
        // `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md`.
        // GameStateAdapter.ts (Phase 5) and response_parser.ts (LLM-schema) sites
        // from the Batch 46-D packet are not in this slice — they remain
        // documented as future-owner lanes per their respective stop-gates.
        // This slice pins only the as_factionid_casts category at zero.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', PHASE_2_COMBAT_BATCH_47_FILES);

        expect(factionIdCount).toBe(0);
    });

    it('caps the Batch 48 Phase 5 GameStateAdapter adapter-local cleanup', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // GameStateAdapter.ts retains exactly 10 documented load-bearing
        // escapes after Batch 48 (see `ACCEPTED_PHASE_5_ADAPTER_BATCH_48_REMAINING`
        // constant for the per-site classification):
        // - 1 JSON entry boundary cast (`json as any`)
        // - 4 Record<string, unknown> field widenings (f.ops, f.combat_summary,
        //   f.brigade_history × 2)
        // - 2 multi-branch ternary widenings (activeOps / opsArray)
        // - 1 JSON-import baseline cast (historicalBaseline as any)
        // - 2 UI-local literal-union FactionId casts (enclave faction lookups
        //   against ENCLAVE_UI_DEFINITIONS[i].faction: string, target field
        //   typed as `'RS' | 'RBiH' | 'HRHB' | null | undefined`)
        // The ceiling is enforced with `toBeLessThanOrEqual` (not exact)
        // so future schema-tightening or GameState-contract work that
        // removes additional sites does not require updating this test.
        const adapterTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_5_ADAPTER_BATCH_48_FILES),
            0,
        );

        expect(adapterTotal).toBeLessThanOrEqual(ACCEPTED_PHASE_5_ADAPTER_BATCH_48_REMAINING);
    });

    it('cleans the Batch C sector_offensive_launch_helpers slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_SECTOR_OFFENSIVE_LAUNCH_HELPERS_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C validateGameState slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_VALIDATE_GAME_STATE_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C replay_frame_summary slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_REPLAY_FRAME_SUMMARY_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C war_dispatches slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_WAR_DISPATCHES_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C desktop_sim slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_DESKTOP_SIM_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C collect_briefing slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_COLLECT_BRIEFING_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C serialize slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_SERIALIZE_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C political_control_init slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_POLITICAL_CONTROL_INIT_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C oob_loader slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_OOB_LOADER_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C scenario_loader slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_SCENARIO_LOADER_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C war_timeline slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_WAR_TIMELINE_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C brigade_temporal_emit slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_BRIGADE_TEMPORAL_EMIT_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the post-Batch-C unknown-cast tail safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', POST_BATCH_C_UNKNOWN_TAIL_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the validateFormations as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FORMATIONS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the validateMilitiaPools as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_MILITIA_POOLS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the validateEndState as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_END_STATE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the validateFrontSegments as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FRONT_SEGMENTS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the front posture and pressure validator as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FRONT_STATE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the UI corps front-lines builder as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', UI_CORPS_FRONT_LINES_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the factions and supply-rights validator as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FACTIONS_SUPPLY_RIGHTS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the low-risk as-any leaf slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', LOW_RISK_AS_ANY_LEAF_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the UI window bridge as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', UI_WINDOW_BRIDGE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the bot response and interaction-layer as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', BOT_RESPONSE_INTERACTION_LAYER_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the CLI political-side and MapKit singleton as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CLI_POLITICAL_SIDE_MAPKIT_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the core singleton as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CORE_SINGLETON_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the AI settings panel IPC as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', AI_SETTINGS_PANEL_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the CLI front-state diagnostic as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CLI_FRONT_STATE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the political-control audit CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', POLITICAL_CONTROL_AUDIT_CLI_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the treaty CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CLI_TREATY_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the warroom viewer and diplomacy overview strict-null tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const categories: Array<keyof Pick<
            StrictNullInventory['categories'],
            'as_any_casts' | 'non_null_assertions_dot' | 'non_null_assertions_index'
        >> = [
            'as_any_casts',
            'non_null_assertions_dot',
            'non_null_assertions_index',
        ];
        const total = categories.reduce(
            (sum, category) => sum + phaseCount(current, category, UI_WARROOM_DIPLOMACY_STRICT_NULL_TAIL_FILES),
            0
        );
        expect(total).toBe(0);
    });

    it('cleans the event-effects and loaded-state mock unknown-cast tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', EVENT_EFFECTS_LOADED_STATE_UNKNOWN_TAIL_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the ForceReadiness Army HQ as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', FORCE_READINESS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Batch 49 AI commander response_parser schema-validation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // response_parser.ts is the AI commander JSON boundary that ingests
        // `unknown` LLM output and narrows it to typed AdvisorResponse /
        // ArmyDecision / CorpsDecision shapes. Batch 49 replaces the two
        // inventory-counted escape sites with explicit schema validation:
        //   - 1 `as FactionId` widening on `data.faction` at parseAdvisorResponse
        //     replaced by `parseFactionId(value, fallback)` helper that requires
        //     both `typeof === 'string'` and `CANONICAL_FACTIONS.includes(value)`.
        //     Fallback semantics narrow: non-canonical strings and non-string
        //     truthy values now fall back to the supplied default ('RBiH' for
        //     parseAdvisorResponse) instead of being passed through. Documented
        //     in the Batch 49 ledger entry; covered by new parser tests.
        //   - 1 `d!.stance` non-null-assertion-dot at parseArmyResponse hoisted
        //     to a `rawStance` local with `typeof === 'string' &&
        //     VALID_STANCES.has(rawStance)` narrowing. Behavior-identical because
        //     VALID_STANCES only matches the three valid string stances.
        // The adjacent `parseAdvisorContextType` helper also replaced the
        // redundant `(data.context_type as AdvisorResponse['context_type']) ??
        // 'situation_analysis'` widening — that cast was not in the inventory
        // regex but is part of the same schema boundary. Other unknown→typed
        // widenings in this file (`data.operation_plan as
        // CorpsDecision['operation_plan']`, `data.brigade_movements as
        // CorpsDecision['brigade_movements']`, `data.reserve_deployment as
        // ArmyDecision['reserve_deployment']`, plus the `Record<string,
        // unknown>` directive/sector_stances widenings and the `as string[]` /
        // `as 'accept' | 'reject'` literal-union narrowings) do not match the
        // inventory regex and remain as future schema-validation lane work.
        // This slice pins both `as_factionid_casts` and `non_null_assertions_dot`
        // categories at zero for response_parser.ts.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', AI_COMMANDER_BATCH_49_FILES);
        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', AI_COMMANDER_BATCH_49_FILES);

        expect(factionIdCount).toBe(0);
        expect(nonNullDotCount).toBe(0);
    });
});
