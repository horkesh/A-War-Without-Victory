/**
 * Phase B Sub-slice B2 — Event Database Runtime Substrate
 *
 * Tests cover Phase B Test Plan gates 31-39 (state shape + save migration).
 * Reference:
 *   docs/40_reports/research/20260527_EVENT_FAMILY_PHASE_B_TEST_PLAN.md
 *   docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md §2.3, §3.7
 *
 * Scope: shape-only — no evaluator change, no loader change in this slice.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readFileSync as readBytes } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyMigrations, getLatestSchemaVersion } from '../src/state/save_migration.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

function currentVersionState(): any {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'event-state-shape-b2',
            referendum_held: false,
            referendum_turn: null,
            war_start_turn: null,
            peace_scheduled_referendum_turn: null,
            peace_scheduled_war_start_turn: null,
            peace_war_start_control_path: null,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            player_faction: 'RBiH',
            decision_mode: 'historical',
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: {
                    pressure: 0,
                    last_change_turn: null,
                    capital: 0,
                    spent_total: 0,
                    last_capital_change_turn: null,
                },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
        ],
        paramilitary_decision_history: [],
        military: {
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            formations: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            militia_pools: {},
            war_militia_strength: {},
            war_jna: { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 },
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            event_overflow_queue: [],
            event_aggression_modifiers: [],
            recruitment_modifiers: [],
            equipment_quality_modifiers: [],
            cost_ledger_annotations: [],
            pending_convoy_decisions: [],
            convoy_decision_history: [],
            pending_reserve_requests: [],
            reserve_request_history: [],
            triggered_operations_accepted: {},
            declined_operations: {},
            used_operation_names: {},
            pending_officer_events: [],
            officer_decision_history: [],
            cascade_penalties: [],
            offensive_ops_suppressions: [],
            alliance_locks: [],
            bot_priority_shifts: [],
            pending_event_decisions: [],
            pending_event_notifications: [],
            phantoms_spawned: [],
            closed_event_ids: [],
            event_causality_log: [],
        },
        political: {
            political_controllers: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null, last_counter_turn: {} },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            municipalities: {},
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_state: {},
            civilian_casualties: {},
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            minority_flight_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            displacement_event_log: [],
            sustainability_state: {},
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        },
    };
}

describe('Phase B Sub-slice B2 — state shape + save migration', () => {
    describe('Gate 31 — closed_event_ids shape', () => {
        it('accepts a sorted, deduped string array', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = ['alpha_event', 'beta_event', 'charlie_event'];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(true);
        });

        it('accepts an empty array (default)', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = [];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(true);
        });

        it('rejects unsorted entries', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = ['beta_event', 'alpha_event'];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /closed_event_ids must be sorted/.test(e))).toBe(true);
            }
        });

        it('rejects duplicate entries', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = ['alpha_event', 'alpha_event'];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /closed_event_ids\[1\] must be unique/.test(e))).toBe(true);
            }
        });

        it('rejects non-string entries', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = ['alpha_event', 42];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /closed_event_ids\[1\] must be a string/.test(e))).toBe(true);
            }
        });

        it('rejects non-array values', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = {};

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /closed_event_ids must be a string array/.test(e))).toBe(true);
            }
        });
    });

    describe('Gate 32 — event_causality_log shape', () => {
        it('accepts a sorted array of valid CausalityLogEntry', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [
                { turn: 1, from_event: 'rs_strategic_goals', to_event: 'rs_paramilitary_policy', to_flag: null, kind: 'enables', source_response_id: 'all_six' },
                { turn: 1, from_event: 'rs_strategic_goals', to_event: 'rs_reintegration', to_flag: null, kind: 'closes', source_response_id: 'all_six' },
                { turn: 2, from_event: 'paramilitary_policy', to_event: null, to_flag: 'paramilitary_policy', kind: 'opens_flag' },
            ];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(true);
        });

        it('accepts empty array', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(true);
        });

        it('accepts all six kind values', () => {
            const state = currentVersionState();
            // Six entries with different kinds, sorted by kind alphabetically (turn equal, from_event equal, to_event equal, to_flag equal).
            // sort: closes < closes_flag < enables < mutex_suppressed < opens_flag < overflowed.
            state.military.event_causality_log = [
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'closes', source_response_id: 'a' },
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'closes_flag', source_response_id: 'a' },
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'enables', source_response_id: 'a' },
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'mutex_suppressed', source_response_id: 'a' },
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'opens_flag', source_response_id: 'a' },
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'overflowed', source_response_id: 'a' },
            ];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(true);
        });

        it('rejects an invalid kind enum value', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [
                { turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'invented_kind' },
            ];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /event_causality_log\[0\]\.kind must be one of/.test(e))).toBe(true);
            }
        });

        it('rejects unsorted entries (turn order violated)', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [
                { turn: 5, from_event: 'evt_b', to_event: null, to_flag: null, kind: 'enables' },
                { turn: 2, from_event: 'evt_a', to_event: null, to_flag: null, kind: 'enables' },
            ];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /event_causality_log must be sorted/.test(e))).toBe(true);
            }
        });

        it('rejects unsorted entries (from_event order violated within same turn)', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [
                { turn: 1, from_event: 'zulu', to_event: null, to_flag: null, kind: 'enables' },
                { turn: 1, from_event: 'alpha', to_event: null, to_flag: null, kind: 'enables' },
            ];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /event_causality_log must be sorted/.test(e))).toBe(true);
            }
        });

        it('rejects missing required fields', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [{ turn: 1, from_event: '', to_event: null, to_flag: null, kind: 'enables' }];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /from_event must be a non-empty string/.test(e))).toBe(true);
            }
        });

        it('rejects entry where to_event is not null and not a non-empty string', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [{ turn: 1, from_event: 'evt', to_event: 42, to_flag: null, kind: 'enables' }];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /to_event must be null or a non-empty string/.test(e))).toBe(true);
            }
        });

        it('rejects negative turn', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [{ turn: -1, from_event: 'evt', to_event: null, to_flag: null, kind: 'enables' }];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /turn must be a non-negative integer/.test(e))).toBe(true);
            }
        });
    });

    describe('Gate 33 — validateGameState rejects malformed shapes', () => {
        it('rejects malformed closed_event_ids (object instead of array)', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = { foo: 'bar' };

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
        });

        it('rejects malformed event_causality_log (non-object entry)', () => {
            const state = currentVersionState();
            state.military.event_causality_log = [42];

            const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors.some((e) => /event_causality_log\[0\] must be an object/.test(e))).toBe(true);
            }
        });
    });

    describe('Gate 34 — v32 closed_event_ids migration', () => {
        it('materializes [] default for v31 saves', () => {
            const state: any = {
                schema_version: 31,
                military: {},
            };

            applyMigrations(state);

            expect(state.schema_version).toBe(getLatestSchemaVersion());
            expect(state.military.closed_event_ids).toEqual([]);
        });

        it('preserves existing closed_event_ids contents on migration from v31', () => {
            const state: any = {
                schema_version: 31,
                military: {
                    closed_event_ids: ['alpha', 'beta'],
                },
            };

            applyMigrations(state);

            expect(state.military.closed_event_ids).toEqual(['alpha', 'beta']);
        });

        it('rejects current-version saves missing closed_event_ids', () => {
            const state = currentVersionState();
            delete state.military.closed_event_ids;

            expect(() => deserializeState(JSON.stringify(state))).toThrow(
                /Save schema validation failed after migration[\s\S]*v32[\s\S]*military\.closed_event_ids/,
            );
        });
    });

    describe('Gate 35 — v33 event_causality_log migration', () => {
        it('materializes [] default for v32 saves', () => {
            const state: any = {
                schema_version: 32,
                military: { closed_event_ids: [] },
            };

            applyMigrations(state);

            expect(state.schema_version).toBe(getLatestSchemaVersion());
            expect(state.military.event_causality_log).toEqual([]);
        });

        it('preserves existing event_causality_log contents on migration from v32', () => {
            const existing = [
                { turn: 1, from_event: 'evt', to_event: null, to_flag: 'flag_a', kind: 'opens_flag' as const },
            ];
            const state: any = {
                schema_version: 32,
                military: {
                    closed_event_ids: [],
                    event_causality_log: existing,
                },
            };

            applyMigrations(state);

            expect(state.military.event_causality_log).toEqual(existing);
        });

        it('rejects current-version saves missing event_causality_log', () => {
            const state = currentVersionState();
            delete state.military.event_causality_log;

            expect(() => deserializeState(JSON.stringify(state))).toThrow(
                /Save schema validation failed after migration[\s\S]*v33[\s\S]*military\.event_causality_log/,
            );
        });
    });

    describe('Gate 36 — fixture round-trip', () => {
        it('v31_closed_event_ids.json migrates and serializes byte-stably', () => {
            const fixtureDir = resolve(process.cwd(), 'tests', 'fixtures', 'save_migration');
            const payload = readFileSync(resolve(fixtureDir, 'v31_closed_event_ids.json'), 'utf8');

            const migrated = deserializeState(payload);
            expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
            expect(migrated.military.closed_event_ids).toEqual([]);
            expect(migrated.military.event_causality_log).toEqual([]);

            const serialized = serializeState(migrated);
            expect(serializeState(deserializeState(serialized))).toBe(serialized);
        });

        it('v32_event_causality_log.json migrates and serializes byte-stably', () => {
            const fixtureDir = resolve(process.cwd(), 'tests', 'fixtures', 'save_migration');
            const payload = readFileSync(resolve(fixtureDir, 'v32_event_causality_log.json'), 'utf8');

            const migrated = deserializeState(payload);
            expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
            expect(migrated.military.closed_event_ids).toEqual([]);
            expect(migrated.military.event_causality_log).toEqual([]);

            const serialized = serializeState(migrated);
            expect(serializeState(deserializeState(serialized))).toBe(serialized);
        });
    });

    describe('Gate 37 — round-trip contract preserved', () => {
        it('current-version state with new fields survives serialize/deserialize/serialize', () => {
            const state = currentVersionState();
            state.military.closed_event_ids = ['alpha', 'beta', 'charlie'];
            state.military.event_causality_log = [
                { turn: 1, from_event: 'a', to_event: 'b', to_flag: null, kind: 'enables' },
                { turn: 2, from_event: 'c', to_event: null, to_flag: 'd', kind: 'closes_flag' },
            ];

            const serialized = serializeState(state as any);
            const roundTripped = deserializeState(serialized);
            const reSerialized = serializeState(roundTripped);

            expect(reSerialized).toBe(serialized);
            expect(roundTripped.military.closed_event_ids).toEqual(['alpha', 'beta', 'charlie']);
            expect(roundTripped.military.event_causality_log).toEqual([
                { turn: 1, from_event: 'a', to_event: 'b', to_flag: null, kind: 'enables' },
                { turn: 2, from_event: 'c', to_event: null, to_flag: 'd', kind: 'closes_flag' },
            ]);
        });
    });

    describe('Gate 38 — drift audit clean', () => {
        it('save_migration_drift_audit.cjs reports no orphan anonymous defaults at v35', () => {
            const cwd = process.cwd();
            const outputPath = resolve(cwd, 'tools', 'diagnostics', 'output', 'save_migration_drift.json');

            execFileSync(process.execPath, ['tools/diagnostics/save_migration_drift_audit.cjs'], { cwd, stdio: 'pipe' });

            const report = JSON.parse(readBytes(outputPath, 'utf8')) as {
                latest_schema_version: number;
                anonymous_default_count: number;
                fields: Array<{ field: string }>;
            };

            expect(report.latest_schema_version).toBe(35);
            expect(report.anonymous_default_count).toBe(0);
            expect(report.fields).toEqual([]);
        });
    });

    describe('Gate 39 — migration purity', () => {
        it('save_migration.ts v32/v33 helpers contain no I/O, time, randomness, or env reads', () => {
            const source = readFileSync(resolve(process.cwd(), 'src', 'state', 'save_migration.ts'), 'utf8');

            // Extract the source block from the v32 registerMigration through end-of-file.
            const v32Anchor = source.indexOf("version: 32,");
            expect(v32Anchor).toBeGreaterThan(0);
            const region = source.slice(v32Anchor);

            const forbidden: Array<[RegExp, string]> = [
                [/\bMath\.random\s*\(/, 'Math.random'],
                [/\bDate\.now\s*\(/, 'Date.now'],
                [/\bnew\s+Date\s*\(/, 'new Date'],
                [/\bprocess\.env\b/, 'process.env'],
                [/\brandomUUID\s*\(/, 'randomUUID'],
                [/\brandomBytes\s*\(/, 'randomBytes'],
                [/\bgetRandomValues\s*\(/, 'getRandomValues'],
                [/\bfs\.[a-zA-Z]+Sync\s*\(/, 'sync fs I/O'],
                [/\bconsole\.\w+\s*\(/, 'console output'],
            ];
            for (const [pattern, label] of forbidden) {
                expect(pattern.test(region), `v32/v33 migration must not use ${label}`).toBe(false);
            }
        });

        it('v32 migration is idempotent (running twice produces identical state)', () => {
            const stateA: any = { schema_version: 31, military: {} };
            const stateB: any = { schema_version: 31, military: {} };

            applyMigrations(stateA);
            applyMigrations(stateA); // second pass should be no-op
            applyMigrations(stateB);

            expect(stateA).toEqual(stateB);
        });
    });
});
