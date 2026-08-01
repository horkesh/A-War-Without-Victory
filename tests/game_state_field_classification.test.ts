import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
    assertCompleteFieldClassification,
    buildGameStateFieldClassification,
    stableStringify,
    type GameStateFieldInventoryRow,
} from '../tools/diagnostics/game_state_field_classification.js';

const TMP_ROOT = join(process.cwd(), '.tmp_game_state_field_classification');

function write(relativePath: string, contents: string): void {
    const absolutePath = join(TMP_ROOT, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
}

describe('GameState field classification diagnostic', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('emits every GameState and MilitaryState field with deterministic lifecycle evidence', () => {
        write('src/state/game_state.ts', `
export interface GameState {
    /** @persistence required-persisted */
    schema_version: number;
    /** Derived each turn; never persisted. @persistence derived/transient */
    turn_cache?: Record<string, number>;
    /** @persistence required-persisted */
    military: MilitaryState;
}

export interface MilitaryState {
    /** Retired legacy-save compatibility residue. @persistence compatibility-only */
    legacy_orders?: string[];
    /** @persistence optional-persisted */
    active_orders?: Array<{
        id: string;
        turn: number;
    }>;
    /** @persistence required-persisted */
    required_log: string[];
}
`);
        write('src/state/initialize_new_game_state.ts', `
import type { GameState } from './game_state.js';
export function initialize(state: GameState): void {
    state.military.active_orders = [];
}
`);
        write('src/validate/active_orders.ts', `
import type { GameState } from '../state/game_state.js';
export function validate(state: GameState): boolean {
    return 'active_orders' in state.military && Array.isArray(state.military.active_orders);
}
`);
        write('src/state/save_migration.ts', `
import type { GameState } from './game_state.js';
function ensureArray(_target: object, _key: string): void {}
export function migrate(state: GameState): void {
    ensureArray(state.military, 'active_orders');
}
`);
        write('src/state/serializeGameState.ts', `
export function serializeGameState(state: unknown): string {
    return JSON.stringify(state);
}
`);
        write('src/sim/read_orders.ts', `
import type { GameState } from '../state/game_state.js';
export function count(state: GameState): number {
    return state.military.active_orders?.length ?? 0;
}
`);
        write('src/sim/unrelated_asset.ts', `
const asset = { active_orders: ['not-state'] };
export const count = asset.active_orders.length;
`);

        const inventory = buildGameStateFieldClassification(TMP_ROOT);

        expect(inventory.fields.map((row) => `${row.interface}.${row.field}`)).toEqual([
            'GameState.military',
            'GameState.schema_version',
            'GameState.turn_cache',
            'MilitaryState.active_orders',
            'MilitaryState.legacy_orders',
            'MilitaryState.required_log',
        ]);
        expect(inventory.fields.find((row) => row.field === 'turn_cache')?.classification)
            .toBe('derived/transient');
        expect(inventory.fields.find((row) => row.field === 'legacy_orders')?.classification)
            .toBe('compatibility-only');
        expect(inventory.fields.find((row) => row.field === 'active_orders')).toMatchObject({
            declared_type: 'Array<{ id: string; turn: number; }>',
            classification: 'optional-persisted',
            initializer: [{ file: 'src/state/initialize_new_game_state.ts', line: 4 }],
            migration: [{ file: 'src/state/save_migration.ts', line: 5 }],
            serializer: {
                contract_match: true,
                evidence: [{ file: 'src/state/serializeGameState.ts', line: 2 }],
                expected: 'included',
                observed: 'included-when-present',
            },
            validator: [{ file: 'src/validate/active_orders.ts', line: 4 }],
            known_readers: [
                { file: 'src/sim/read_orders.ts', line: 4 },
                { file: 'src/validate/active_orders.ts', line: 4 },
            ],
        });
        expect(inventory.fields.find((row) => row.field === 'turn_cache')?.serializer).toMatchObject({
            contract_match: false,
            expected: 'excluded',
            observed: 'included-when-present',
        });
        expect(inventory.fields.find((row) => row.field === 'required_log')?.classification)
            .toBe('required-persisted');
        expect(inventory.summary).toEqual({
            by_classification: {
                'compatibility-only': 1,
                dead: 0,
                'derived/transient': 1,
                'optional-persisted': 1,
                'required-persisted': 3,
            },
            field_count: 6,
            unclassified_count: 0,
        });

        const serialized = stableStringify(inventory);
        expect(serialized).toBe(stableStringify(buildGameStateFieldClassification(TMP_ROOT)));
        expect(serialized).not.toContain(TMP_ROOT.replace(/\\/g, '/'));
        expect(serialized).not.toMatch(/generated_at|timestamp/i);
    });

    it('rejects an unclassified field instead of silently emitting an incomplete inventory', () => {
        const incomplete = [{
            interface: 'MilitaryState',
            field: 'mystery',
            classification: 'unclassified',
        }] as unknown as GameStateFieldInventoryRow[];

        expect(() => assertCompleteFieldClassification(incomplete))
            .toThrow('Unclassified GameState fields: MilitaryState.mystery');
    });

    it('does not infer persistence from optionality or misleading legacy prose', () => {
        write('src/state/game_state.ts', `
export interface GameState {
    /** Legacy describes an input key, not this field lifecycle. */
    militia_pools: Record<string, number>;
}
export interface MilitaryState {}
`);

        expect(() => buildGameStateFieldClassification(TMP_ROOT))
            .toThrow('Unclassified GameState fields: GameState.militia_pools');
    });

    it('keeps the live GameState and MilitaryState inventory complete and repo-relative', () => {
        const inventory = buildGameStateFieldClassification(process.cwd());

        expect(() => assertCompleteFieldClassification(inventory.fields)).not.toThrow();
        expect(inventory.fields.some((row) => row.interface === 'GameState')).toBe(true);
        expect(inventory.fields.some((row) => row.interface === 'MilitaryState')).toBe(true);
        expect(inventory.fields.every((row) => !/^[A-Za-z]:|^\//.test(row.declaration.file))).toBe(true);
        expect(inventory.summary.unclassified_count).toBe(0);
        expect(inventory.fields.find((row) => row.field === 'militia_pools')?.classification)
            .toBe('required-persisted');
        expect(inventory.fields.find((row) => row.field === 'army_corps_directives_by_faction')?.classification)
            .toBe('required-persisted');
        expect(inventory.fields.find((row) => row.field === 'patron_defiance_supply_cuts')?.classification)
            .toBe('optional-persisted');
        expect(inventory.fields.find((row) => row.field === 'formations')?.initializer)
            .toContainEqual({ file: 'src/scenario/scenario_runner.ts', line: 260 });
        expect(inventory.fields.find((row) => row.field === 'militia_pools')?.validator)
            .toContainEqual({ file: 'src/validate/militia_pools.ts', line: 32 });
        expect(inventory.fields.find((row) => row.field === 'army_corps_directives_by_faction')?.migration)
            .toContainEqual({ file: 'src/state/save_migration.ts', line: 485 });
    });
});
