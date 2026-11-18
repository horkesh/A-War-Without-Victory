/**
 * The September 1991 peace start is retired (campaign structure decision 2026-03-23;
 * scenario, runner path and scenario fields removed 2026-11-16).
 *
 * - A scenario can no longer start in the peace phase: the loader rejects it.
 * - Save migration v40 deletes meta.peace_war_start_control_path, which only the
 *   peace start ever set (an absolute filesystem path) and only the peace-to-war
 *   transition read. An old v39 save that still holds it loads and validates.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { normalizeScenario } from '../src/scenario/scenario_loader.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { applyMigrations } from '../src/state/save_migration.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

const LEGACY_PATH = 'C:\\legacy\\checkout\\data\\source\\municipalities_1990_initial_political_controllers_apr1992.json';

describe('September 1991 peace start retired — scenario loader', () => {
    it('rejects start_lifecycle_phase "peace"', () => {
        expect(() => normalizeScenario({ scenario_id: 'x', weeks: 1, start_lifecycle_phase: 'peace' }))
            .toThrow(/retired/);
    });

    it('accepts a war start and an omitted phase (defaults to war)', () => {
        expect(normalizeScenario({ scenario_id: 'x', weeks: 1, start_lifecycle_phase: 'war' }).start_lifecycle_phase)
            .toBe('war');
        expect(normalizeScenario({ scenario_id: 'x', weeks: 1 }).start_lifecycle_phase).toBe('war');
    });

    it('no longer carries the peace_* scenario fields', () => {
        const s = normalizeScenario({
            scenario_id: 'x',
            weeks: 1,
            peace_war_start_control: 'apr1992',
            peace_war_start_turn: 30,
        }) as unknown as Record<string, unknown>;
        expect('peace_war_start_control' in s).toBe(false);
        expect('peace_war_start_turn' in s).toBe(false);
    });
});

describe('save migration v40 — meta.peace_war_start_control_path deleted', () => {
    for (const legacy of [LEGACY_PATH, null]) {
        it(`deletes the key (legacy value ${legacy === null ? 'null' : 'absolute path'}) and keeps the rest of meta`, () => {
            const state = {
                schema_version: 39,
                meta: { turn: 40, seed: 's', phase: 'war', war_start_turn: 0, peace_war_start_control_path: legacy },
            } as unknown as GameState;
            applyMigrations(state);
            const meta = state.meta as unknown as Record<string, unknown>;
            expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
            expect('peace_war_start_control_path' in meta).toBe(false);
            expect(meta.war_start_turn).toBe(0);
            expect(meta.phase).toBe('war');
        });
    }

    it('is idempotent', () => {
        const state = { schema_version: 39, meta: { turn: 1, peace_war_start_control_path: LEGACY_PATH } } as unknown as GameState;
        applyMigrations(state);
        const once = JSON.stringify(state.meta);
        applyMigrations(state);
        expect(JSON.stringify(state.meta)).toBe(once);
    });

    it('an old v39 save holding the key loads, validates, and round-trips without it', () => {
        const payload = readFileSync(
            resolve(process.cwd(), 'tests', 'fixtures', 'save_migration', 'v39_peace_control_path_retired.json'),
            'utf8',
        );
        expect(JSON.parse(payload).meta.peace_war_start_control_path).toBe(LEGACY_PATH);
        const loaded = deserializeState(payload);
        expect(loaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect('peace_war_start_control_path' in (loaded.meta as object)).toBe(false);
        const serialized = serializeState(loaded);
        expect(serialized).not.toContain('peace_war_start_control_path');
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });

    it('the startup snapshot no longer carries the key', () => {
        const startup = readFileSync(
            resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        );
        expect(startup).not.toContain('peace_war_start_control_path');
    });

    it('the validator rejects the key on a v40 state', () => {
        const state = deserializeState(readFileSync(
            resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        ));
        (state.meta as unknown as Record<string, unknown>).peace_war_start_control_path = null;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        const errors = result.ok ? [] : result.errors;
        expect(errors.join('\n')).toMatch(/peace_war_start_control_path was retired at schema v40/);
    });
});
