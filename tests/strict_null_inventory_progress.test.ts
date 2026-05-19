import { readFileSync } from 'node:fs';
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

const ESCAPE_CATEGORIES = [
    'as_factionid_casts',
    'as_unknown_casts',
    'as_any_casts',
    'non_null_assertions_dot',
    'non_null_assertions_index',
] as const;

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
    it('shrinks Phase 1 state-schema escape hatches against the committed baseline', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const baseline = JSON.parse(
            readFileSync(resolve('docs/40_reports/strict_null_inventory_baseline.json'), 'utf8'),
        ) as StrictNullInventory;
        const current = diagnostic.buildInventory(process.cwd());

        const baselineTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(baseline, category, PHASE_1_FILES),
            0,
        );
        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_1_FILES),
            0,
        );

        expect(currentTotal).toBeLessThan(baselineTotal);
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
});
