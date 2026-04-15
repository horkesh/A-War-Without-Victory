/**
 * HV (Croatian Army) Integration tests.
 *
 * Tests:
 *   - HV brigades don't spawn before Washington
 *   - HV brigades spawn after Washington + delay
 *   - HV brigades have correct stats (high equipment, cohesion, morale)
 *   - HV brigades assigned to western front (hvo_tomislavgrad corps)
 *   - Only spawns once (not every turn)
 *   - Washington patron override path fires correctly
 *
 * Determinism: all tests verify identical outputs for identical inputs.
 */

import assert from 'node:assert';
import { describe, test } from 'vitest';
import {
    HV_BRIGADE_DEFS,
    HV_CORPS_ID,
    HV_PREPARATION_DELAY,
    tickHvIntegration,
} from '../src/sim/combat/hv_integration.js';
import {
    checkAndApplyWashington,
    evaluateWashingtonPatronOverride,
    WASH_ALLIANCE_LOCK_VALUE,
    WASH_ALLIANCE_WAR_THRESHOLD,
    WASH_MIN_WAR_DURATION,
    WASH_PATRON_OVERRIDE_THRESHOLD,
} from '../src/sim/early_war/washington_agreement.js';
import { ensureRbihHrhbState } from '../src/sim/early_war/alliance_update.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Minimal GameState for HV integration tests. */
function makeState(overrides?: Record<string, any>): GameState {
    const base = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'hv-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        factions: [
            {
                id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null
            },
            {
                id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
                patron_state: { material_support_level: 0.5, diplomatic_isolation: 0.2, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 5 }
            }
        ],
        political: {} as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
        ...overrides,
    };
    return base as unknown as GameState;
}

/** Create a state with Washington already signed at the given turn. */
function makeWashingtonSignedState(washingtonTurn: number, currentTurn: number): GameState {
    const state = makeState({
        meta: { turn: currentTurn, seed: 'hv-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
    });
    ensureRbihHrhbState(state);
    state.political.rbih_hrhb_state!.washington_signed = true;
    state.political.rbih_hrhb_state!.washington_turn = washingtonTurn;
    state.political.war_alliance_rbih_hrhb = WASH_ALLIANCE_LOCK_VALUE;
    return state;
}

// ═══════════════════════════════════════════════════════════════════════════
// HV Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('HV integration', () => {
    test('HV brigades do NOT spawn before Washington is signed', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        // Washington not signed
        assert.strictEqual(state.political.rbih_hrhb_state!.washington_signed, false);

        const report = tickHvIntegration(state);
        assert.strictEqual(report.washington_signed, false);
        assert.strictEqual(report.spawned_this_turn, false);
        assert.strictEqual(report.spawned_brigade_ids.length, 0);
        assert.strictEqual(report.turns_until_spawn, -1);

        // Verify no HV formations exist
        for (const def of HV_BRIGADE_DEFS) {
            assert.strictEqual(state.military.formations[def.id], undefined, `${def.id} should not exist`);
        }
    });

    test('HV brigades do NOT spawn during preparation delay', () => {
        const washTurn = 100;
        // Try each turn during the delay period
        for (let t = washTurn; t < washTurn + HV_PREPARATION_DELAY; t++) {
            const state = makeWashingtonSignedState(washTurn, t);
            const report = tickHvIntegration(state);
            assert.strictEqual(report.spawned_this_turn, false, `Should not spawn at turn ${t}`);
            assert.strictEqual(report.washington_signed, true);
            assert.strictEqual(report.turns_until_spawn, HV_PREPARATION_DELAY - (t - washTurn));
        }
    });

    test('HV brigades spawn exactly at Washington + delay', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);

        const report = tickHvIntegration(state);
        assert.strictEqual(report.spawned_this_turn, true);
        assert.strictEqual(report.spawned_brigade_ids.length, HV_BRIGADE_DEFS.length);
        assert.strictEqual(report.turns_until_spawn, 0);

        // Verify all 4 brigades were spawned
        for (const def of HV_BRIGADE_DEFS) {
            const f = state.military.formations[def.id];
            assert.ok(f, `Formation ${def.id} should exist`);
            assert.strictEqual(f.faction, 'HRHB');
            assert.strictEqual(f.status, 'active');
        }
    });

    test('HV brigades have correct stats — high equipment, cohesion, morale', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);
        tickHvIntegration(state);

        for (const def of HV_BRIGADE_DEFS) {
            const f = state.military.formations[def.id]!;

            // High cohesion (>= 78)
            assert.ok((f.cohesion ?? 0) >= 78, `${def.id} cohesion should be >= 78, got ${f.cohesion}`);

            // High morale (>= 82)
            assert.ok((f.morale ?? 0) >= 82, `${def.id} morale should be >= 82, got ${f.morale}`);

            // Personnel matches definition
            assert.strictEqual(f.personnel, def.personnel, `${def.id} personnel mismatch`);

            // Has composition with tanks and artillery
            assert.ok(f.composition, `${def.id} should have composition`);
            assert.ok((f.composition?.tanks ?? 0) > 0, `${def.id} should have tanks`);
            assert.ok((f.composition?.artillery ?? 0) > 0, `${def.id} should have artillery`);

            // Tags include hv_origin
            assert.ok(f.tags?.includes('hv_origin'), `${def.id} should be tagged hv_origin`);
        }
    });

    test('HV brigades assigned to western front corps (hvo_tomislavgrad)', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);
        tickHvIntegration(state);

        for (const def of HV_BRIGADE_DEFS) {
            const f = state.military.formations[def.id]!;
            assert.strictEqual(f.corps_id, HV_CORPS_ID, `${def.id} should be assigned to ${HV_CORPS_ID}`);
        }
    });

    test('HV brigades located on western front OSIDs', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);
        tickHvIntegration(state);

        const westernFrontPrefixes = ['op:livno', 'op:tomislavgrad', 'op:glamoc', 'op:kupres'];

        for (const def of HV_BRIGADE_DEFS) {
            const f = state.military.formations[def.id]!;
            const onWesternFront = westernFrontPrefixes.some(p => (f.location_osid ?? '').startsWith(p));
            assert.ok(onWesternFront, `${def.id} should be on western front, got ${f.location_osid}`);
        }
    });

    test('HV brigades only spawn once — not every turn', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);

        // First tick: should spawn
        const report1 = tickHvIntegration(state);
        assert.strictEqual(report1.spawned_this_turn, true);
        assert.strictEqual(state.meta.hv_brigades_spawned, true);

        // Second tick (next turn): should NOT spawn again
        (state.meta as any).turn = spawnTurn + 1;
        const report2 = tickHvIntegration(state);
        assert.strictEqual(report2.spawned_this_turn, false);
        assert.strictEqual(report2.already_spawned, true);
        assert.strictEqual(report2.spawned_brigade_ids.length, 0);

        // Verify still exactly 4 HV formations (no duplicates)
        let hvCount = 0;
        for (const def of HV_BRIGADE_DEFS) {
            if (state.military.formations[def.id]) hvCount++;
        }
        assert.strictEqual(hvCount, HV_BRIGADE_DEFS.length);
    });

    test('HV brigades set attack posture', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);
        tickHvIntegration(state);

        for (const def of HV_BRIGADE_DEFS) {
            const f = state.military.formations[def.id]!;
            assert.strictEqual(f.posture, 'attack', `${def.id} should have attack posture`);
        }
    });

    test('HV brigade definitions are deterministic — sorted IDs', () => {
        const ids = HV_BRIGADE_DEFS.map(d => d.id);
        // All IDs are unique
        const unique = new Set(ids);
        assert.strictEqual(unique.size, ids.length, 'All HV brigade IDs must be unique');
    });

    test('report includes spawned brigade IDs sorted', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonSignedState(washTurn, spawnTurn);

        const report = tickHvIntegration(state);
        // Verify sorted
        const sorted = [...report.spawned_brigade_ids].sort();
        assert.deepStrictEqual(report.spawned_brigade_ids, sorted);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Washington Patron Override Path B Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Washington patron override (Path B)', () => {
    test('patron override evaluates false when conditions not met', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        // Alliance positive, no war, no override authority
        state.political.war_alliance_rbih_hrhb = 0.35;

        const result = evaluateWashingtonPatronOverride(state);
        assert.strictEqual(result.p1_alliance_below_threshold, false);
        assert.strictEqual(result.all_met, false);
    });

    test('patron override evaluates true when all conditions met', () => {
        const warStart = 10;
        const currentTurn = warStart + WASH_MIN_WAR_DURATION + 5;
        const state = makeState({
            meta: { turn: currentTurn, seed: 'hv-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        });
        ensureRbihHrhbState(state);

        // P1: Alliance below threshold
        state.political.war_alliance_rbih_hrhb = WASH_ALLIANCE_WAR_THRESHOLD - 0.1;
        // War started
        state.political.rbih_hrhb_state!.war_started_turn = warStart;

        // P3: High patron override authority (requires negotiation system state)
        (state.military as any).negotiation = {
            capital: {},
            patron_relationships: {
                HRHB: {
                    patron_id: 'croatia',
                    support_level: 60,
                    override_authority: WASH_PATRON_OVERRIDE_THRESHOLD + 10,
                    sanctions_active: false,
                    relationship_events: [],
                },
            },
            peace_plans_history: [],
        };

        const result = evaluateWashingtonPatronOverride(state);
        assert.strictEqual(result.p1_alliance_below_threshold, true);
        assert.strictEqual(result.p2_war_duration_met, true);
        assert.strictEqual(result.p3_patron_override_met, true);
        assert.strictEqual(result.all_met, true);
    });

    test('Washington fires via patron override when diplomatic path fails', () => {
        const warStart = 10;
        const currentTurn = warStart + WASH_MIN_WAR_DURATION + 5;
        const state = makeState({
            meta: { turn: currentTurn, seed: 'hv-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        });
        ensureRbihHrhbState(state);

        // Alliance deep in war territory (Path A ceasefire conditions NOT met)
        state.political.war_alliance_rbih_hrhb = -0.60;
        state.political.rbih_hrhb_state!.war_started_turn = warStart;
        state.political.rbih_hrhb_state!.ceasefire_active = false; // No ceasefire — Path A blocked

        // Set up patron override authority
        (state.military as any).negotiation = {
            capital: {},
            patron_relationships: {
                HRHB: {
                    patron_id: 'croatia',
                    support_level: 60,
                    override_authority: WASH_PATRON_OVERRIDE_THRESHOLD + 10,
                    sanctions_active: false,
                    relationship_events: [],
                },
            },
            peace_plans_history: [],
        };

        const report = checkAndApplyWashington(state);
        assert.strictEqual(report.fired, true);
        assert.strictEqual(report.trigger_path, 'patron_override');
        assert.strictEqual(state.political.rbih_hrhb_state!.washington_signed, true);
        assert.strictEqual(state.political.war_alliance_rbih_hrhb, WASH_ALLIANCE_LOCK_VALUE);
    });

    test('Washington activates bilateral ceasefire on fire', () => {
        const warStart = 10;
        const currentTurn = warStart + WASH_MIN_WAR_DURATION + 5;
        const state = makeState({
            meta: { turn: currentTurn, seed: 'hv-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        });
        ensureRbihHrhbState(state);
        state.political.war_alliance_rbih_hrhb = -0.60;
        state.political.rbih_hrhb_state!.war_started_turn = warStart;
        state.political.rbih_hrhb_state!.ceasefire_active = false;

        (state.military as any).negotiation = {
            capital: {},
            patron_relationships: {
                HRHB: {
                    patron_id: 'croatia',
                    support_level: 60,
                    override_authority: WASH_PATRON_OVERRIDE_THRESHOLD + 10,
                    sanctions_active: false,
                    relationship_events: [],
                },
            },
            peace_plans_history: [],
        };

        checkAndApplyWashington(state);
        // Ceasefire should now be active
        assert.strictEqual(state.political.rbih_hrhb_state!.ceasefire_active, true);
        assert.strictEqual(state.political.rbih_hrhb_state!.ceasefire_since_turn, currentTurn);
    });
});
