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
});
