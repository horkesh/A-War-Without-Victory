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
});
