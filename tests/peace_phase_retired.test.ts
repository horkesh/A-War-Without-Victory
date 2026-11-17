/**
 * The in-sim peace phase is retired (schema v41). No scenario can start in peace since
 * v40, so the state pipeline (runOneTurn), its no-op phase handlers, the peace UI and the
 * peace-only bookkeeping are gone.
 *
 * - Save migration v41 deletes every peace-only field (meta, faction, political) and keeps
 *   the four fields war code reads: meta.war_start_turn, meta.game_over, meta.outcome,
 *   faction.declared.
 * - An old v40 save carrying every deleted field loads, validates and round-trips clean.
 * - The validator rejects phase 'peace' and rejects any deleted field on a v41 state.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import {
    PEACE_PHASE_RETIRED_FACTION_FIELDS,
    PEACE_PHASE_RETIRED_META_FIELDS,
    PEACE_PHASE_RETIRED_POLITICAL_FIELDS,
} from '../src/state/peace_phase_retired_fields.js';
import { applyMigrations } from '../src/state/save_migration.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

const FIXTURE = resolve(process.cwd(), 'tests', 'fixtures', 'save_migration', 'v40_peace_phase_fields_retired.json');
const STARTUP = resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json');

const ALL_DELETED_KEYS = [
    ...PEACE_PHASE_RETIRED_META_FIELDS,
    ...PEACE_PHASE_RETIRED_FACTION_FIELDS,
    ...PEACE_PHASE_RETIRED_POLITICAL_FIELDS,
];

function legacyV40State(): GameState {
    return {
        schema_version: 40,
        meta: {
            turn: 12,
            seed: 'peace-phase-retired',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            peace_scheduled_referendum_turn: null,
            peace_scheduled_war_start_turn: null,
            war_opposing_edges_streak: 4,
            war_force_transition_after_turns: 52,
            war_entrenchment_init_turns: 0,
            peace_end_turn: null,
            war_start_lifecycle_phase_turn: 0,
            escalation_reason: 'war_start_turn',
            war_start_turn: 0,
            game_over: true,
            outcome: 'dayton',
        },
        factions: [
            { id: 'RS', prewar_capital: 100, declaration_pressure: 100, declared: true, declaration_turn: 0 },
            { id: 'RBiH', prewar_capital: 70, declaration_pressure: 0, declared: false, declaration_turn: null },
            { id: 'HRHB', prewar_capital: 40, declaration_pressure: 100, declared: true, declaration_turn: 0 },
        ],
        political: {
            political_controllers: {},
            phase0_relationships: { rbih_rs: 0.15, rbih_hrhb: 0.6 },
            phase0_events_log: [[{ type: 'declaration', turn: 0, faction: 'RS', details: {} }]],
        },
    } as unknown as GameState;
}

function deletedKeysPresent(state: GameState): string[] {
    const found: string[] = [];
    const meta = state.meta as unknown as Record<string, unknown>;
    for (const key of PEACE_PHASE_RETIRED_META_FIELDS) if (key in meta) found.push(`meta.${key}`);
    for (const faction of state.factions ?? []) {
        const f = faction as unknown as Record<string, unknown>;
        for (const key of PEACE_PHASE_RETIRED_FACTION_FIELDS) if (key in f) found.push(`${String(f.id)}.${key}`);
    }
    const political = (state.political ?? {}) as unknown as Record<string, unknown>;
    for (const key of PEACE_PHASE_RETIRED_POLITICAL_FIELDS) if (key in political) found.push(`political.${key}`);
    return found;
}

describe('save migration v41 — peace-phase fields deleted', () => {
    it('the schema is at v41', () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(41);
    });

    it('deletes every peace-only field and keeps war_start_turn, game_over, outcome and declared', () => {
        const state = legacyV40State();
        applyMigrations(state);
        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(deletedKeysPresent(state)).toEqual([]);
        expect(state.meta.war_start_turn).toBe(0);
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe('dayton');
        expect(state.meta.phase).toBe('war');
        expect(state.factions.map((f) => [f.id, f.declared])).toEqual([
            ['RS', true],
            ['RBiH', false],
            ['HRHB', true],
        ]);
        expect(state.political.political_controllers).toEqual({});
    });

    it('is idempotent', () => {
        const state = legacyV40State();
        applyMigrations(state);
        const once = JSON.stringify(state);
        applyMigrations(state);
        expect(JSON.stringify(state)).toBe(once);
    });

    it('an old v40 save carrying every deleted field loads, validates and round-trips without them', () => {
        const payload = readFileSync(FIXTURE, 'utf8');
        const raw = JSON.parse(payload) as GameState;
        expect(raw.schema_version).toBe(40);
        // The fixture really does carry every deleted key, on all three factions.
        expect(deletedKeysPresent(raw).sort()).toEqual([
            ...PEACE_PHASE_RETIRED_META_FIELDS.map((k) => `meta.${k}`),
            ...['HRHB', 'RBiH', 'RS'].flatMap((id) => PEACE_PHASE_RETIRED_FACTION_FIELDS.map((k) => `${id}.${k}`)),
            ...PEACE_PHASE_RETIRED_POLITICAL_FIELDS.map((k) => `political.${k}`),
        ].sort());

        const loaded = deserializeState(payload);
        expect(loaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(deletedKeysPresent(loaded)).toEqual([]);
        expect(loaded.meta.war_start_turn).toBe(0);
        expect(loaded.meta.game_over).toBe(false);
        expect(loaded.factions.find((f) => f.id === 'RS')?.declared).toBe(true);

        const validation = validateGameStateShape(loaded);
        expect(validation.ok, validation.ok ? '' : validation.errors.join('; ')).toBe(true);

        const serialized = serializeState(loaded);
        for (const key of ALL_DELETED_KEYS) expect(serialized).not.toContain(`"${key}"`);
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });

    it('the startup snapshot carries none of the deleted fields', () => {
        const startup = readFileSync(STARTUP, 'utf8');
        for (const key of ALL_DELETED_KEYS) expect(startup).not.toContain(`"${key}"`);
        const state = JSON.parse(startup) as GameState;
        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.meta.phase).toBe('war');
        expect(state.meta.war_start_turn).toBe(0);
    });
});

describe('validator — the peace phase is gone', () => {
    function startupState(): GameState {
        return deserializeState(readFileSync(STARTUP, 'utf8'));
    }

    it('accepts the startup state', () => {
        const result = validateGameStateShape(startupState());
        expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(true);
    });

    it("rejects phase 'peace'", () => {
        const state = startupState();
        (state.meta as unknown as Record<string, unknown>).phase = 'peace';
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect(result.ok ? '' : result.errors.join('\n')).toMatch(/meta\.phase must be one of: war/);
    });

    it.each([
        ['meta', 'referendum_held', true],
        ['meta', 'war_opposing_edges_streak', 0],
        ['meta', 'escalation_reason', null],
        ['faction', 'prewar_capital', 70],
        ['faction', 'declaration_pressure', 0],
        ['faction', 'declaration_turn', null],
        ['political', 'phase0_relationships', { rbih_rs: 0.5, rbih_hrhb: 0.5 }],
        ['political', 'phase0_events_log', []],
    ] as const)('rejects %s.%s present on a v41 state', (where, key, value) => {
        const state = startupState();
        const target = (where === 'meta'
            ? state.meta
            : where === 'faction'
                ? state.factions[0]
                : state.political) as unknown as Record<string, unknown>;
        target[key] = value;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect(result.ok ? '' : result.errors.join('\n')).toContain(`${key} was retired at schema v41 and must be absent`);
    });

    it('still type-checks a legacy field on a pre-v41 state instead of rejecting it', () => {
        const state = legacyV40State() as unknown as Record<string, unknown>;
        const meta = state.meta as Record<string, unknown>;
        expect(validateGameStateShape(state).ok ? [] : (validateGameStateShape(state) as { errors: string[] }).errors
            .filter((e) => e.includes('retired at schema v41'))).toEqual([]);
        meta.referendum_held = 'yes';
        const result = validateGameStateShape(state);
        expect(result.ok ? '' : result.errors.join('\n')).toMatch(/meta\.referendum_held must be boolean when present/);
    });
});
