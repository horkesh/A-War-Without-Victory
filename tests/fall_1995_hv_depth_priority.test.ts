/**
 * Fall-1995 engine mechanics (synthesis §3 E-B2 / E-B3 / E-B4).
 *
 * Covers:
 *   E-B2  HV brigade gating — spawn-once after Washington + delay; tag check.
 *   E-B3  Strategic depth — VRS 2KK drops after svk_corps_active flips false.
 *   E-B4  Strategic priorities — getOsidPriority returns the canonical tier
 *         for known RS OSIDs (core, corridor, periphery default).
 *
 * Determinism: pure unit-level, no scenario harness, no randomness.
 */

import assert from 'node:assert';
import { describe, test } from 'vitest';
import {
    HV_BRIGADE_DEFS,
    HV_PREPARATION_DELAY,
    tickHvIntegration,
} from '../src/sim/combat/hv_integration.js';
import { ensureRbihHrhbState } from '../src/sim/early_war/alliance_update.js';
import {
    computeStrategicDepth,
    getStrategicDepth,
    updateStrategicDepth,
} from '../src/sim/combat/strategic_depth.js';
import {
    getOsidPriority,
    _setStrategicPrioritiesForTesting,
} from '../src/sim/combat/strategic_priorities.js';
import type { FormationId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

// ─────────────────────────────────────────────────────────────────────────────
// State factory
// ─────────────────────────────────────────────────────────────────────────────

function makeState(turn: number): GameState {
    const base = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'fall95-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2 },
        ],
        political: {} as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
    } as any;
    return base as GameState;
}

function makeWashingtonState(washingtonTurn: number, currentTurn: number): GameState {
    const state = makeState(currentTurn);
    ensureRbihHrhbState(state);
    state.political.rbih_hrhb_state!.washington_signed = true;
    state.political.rbih_hrhb_state!.washington_turn = washingtonTurn;
    return state;
}

function addCorps(state: GameState, id: FormationId, faction: 'RBiH' | 'RS' | 'HRHB'): FormationState {
    const corps: FormationState = {
        id,
        faction,
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'corps',
    } as FormationState;
    state.military.formations[id] = corps;
    return corps;
}

// ─────────────────────────────────────────────────────────────────────────────
// E-B2: HV brigade gating
// ─────────────────────────────────────────────────────────────────────────────

describe('E-B2: HV brigade gating refinement', () => {
    test('HV brigades spawn exactly once after Washington + delay', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonState(washTurn, spawnTurn);

        // First tick: spawn fires.
        const r1 = tickHvIntegration(state);
        assert.strictEqual(r1.spawned_this_turn, true, 'spawn must fire on first eligible tick');
        assert.strictEqual(r1.spawned_brigade_ids.length, HV_BRIGADE_DEFS.length);
        assert.strictEqual(state.meta.hv_brigades_spawned, true, 'one-shot flag must be set');

        // Capture pre-existing formation ids
        const idsAfterFirst = new Set(Object.keys(state.military.formations));

        // Second tick at next turn: must NOT spawn again.
        state.meta = { ...state.meta, turn: spawnTurn + 1 };
        const r2 = tickHvIntegration(state);
        assert.strictEqual(r2.spawned_this_turn, false, 'must not spawn twice');
        assert.strictEqual(r2.already_spawned, true);

        // No new formations were added.
        const idsAfterSecond = new Set(Object.keys(state.military.formations));
        assert.strictEqual(idsAfterSecond.size, idsAfterFirst.size, 'formation count unchanged after second tick');
    });

    test('Spawned HV brigades carry attached_source:hv tag', () => {
        const washTurn = 100;
        const spawnTurn = washTurn + HV_PREPARATION_DELAY;
        const state = makeWashingtonState(washTurn, spawnTurn);
        tickHvIntegration(state);

        for (const def of HV_BRIGADE_DEFS) {
            const f = state.military.formations[def.id];
            assert.ok(f, `${def.id} must exist`);
            assert.ok(
                f.tags?.includes('attached_source:hv'),
                `${def.id} must be tagged attached_source:hv (E-B2)`,
            );
            // Legacy tag preserved for existing readers.
            assert.ok(f.tags?.includes('hv_origin'), `${def.id} must keep legacy hv_origin tag`);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// E-B3: Strategic depth
// ─────────────────────────────────────────────────────────────────────────────

describe('E-B3: Strategic depth per corps', () => {
    test('getStrategicDepth defaults to 1.0 for undefined / missing corps', () => {
        assert.strictEqual(getStrategicDepth(undefined), 1.0);
        assert.strictEqual(getStrategicDepth(null), 1.0);
        const corps = { id: 'x', faction: 'RS', kind: 'corps' } as unknown as FormationState;
        assert.strictEqual(getStrategicDepth(corps), 1.0);
    });

    test('VRS 2nd Krajina Corps strategic_depth drops after SVK corps deactivates', () => {
        // Build minimal state with VRS 2KK and one sector full of friendly OSIDs.
        const state = makeState(150);
        const corpsId = '2nd_krajina_corps';
        const corps = addCorps(state, corpsId, 'RS');
        state.political.political_controllers = {
            'op:banja_luka:banja_luka_2': 'RS',
            'op:banja_luka:dragocaj': 'RS',
            'op:banja_luka:kola': 'RS',
        };
        state.military.corps_front_sectors = {
            'sector:2nd_krajina_corps': {
                sector_id: 'sector:2nd_krajina_corps',
                corps_id: corpsId,
                faction: 'RS',
                opposing_factions: [],
                edge_ids: [],
                sub_segments: [],
                length_edges: 0,
                territory_osids: [
                    'op:banja_luka:banja_luka_2',
                    'op:banja_luka:dragocaj',
                    'op:banja_luka:kola',
                ],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 0,
                threat_ratio: 0,
                defensive_power: 0,
                sector_stance: 'defend',
                stance_source: 'bot',
            } as any,
        };

        // Pre-Storm: svk_corps_active default true.
        const depthPreStorm = computeStrategicDepth(state, corpsId);
        assert.ok(depthPreStorm > 0, 'pre-Storm depth must be positive');
        // Sanity: corps gets partner buffer, so depth should be at least baseline.
        const baseline = depthPreStorm;

        // Flip SVK off via event_flags (canonical post-Storm source).
        state.military.event_flags = { svk_corps_active: false };
        const depthPostStorm = computeStrategicDepth(state, corpsId);

        assert.ok(
            depthPostStorm < baseline,
            `depth must drop after SVK deactivates (pre=${baseline}, post=${depthPostStorm})`,
        );

        // Also test the per-turn updater writes the field.
        state.military.event_flags = { svk_corps_active: false };
        updateStrategicDepth(state);
        const writtenPost = corps.strategic_depth;
        assert.strictEqual(typeof writtenPost, 'number');
        assert.ok(writtenPost! < baseline);
    });

    test('Non-corps formations are skipped by updateStrategicDepth', () => {
        const state = makeState(150);
        const brigade = {
            id: 'arbih_1st_corps_1st_brigade',
            faction: 'RBiH',
            kind: 'brigade',
            status: 'active',
            assignment: null,
            name: 'brigade',
            created_turn: 0,
        } as FormationState;
        state.military.formations[brigade.id] = brigade;
        updateStrategicDepth(state);
        assert.strictEqual(brigade.strategic_depth, undefined, 'brigades must not get strategic_depth');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// E-B4: Strategic priorities
// ─────────────────────────────────────────────────────────────────────────────

describe('E-B4: Strategic priority tiering', () => {
    test('Known RS core OSIDs map to "core"', () => {
        // Seed the cache with a known fixture so the test never hits disk.
        _setStrategicPrioritiesForTesting({
            schema_version: 1,
            by_faction: {
                RS: {
                    core: [
                        'op:banja_luka:banja_luka_2',
                        'op:pale:pale',
                    ],
                    corridor: ['op:brcko:brcko'],
                    periphery: ['__default__'],
                },
                RBiH: {
                    core: ['op:tuzla:tuzla_2'],
                    corridor: [],
                    periphery: ['__default__'],
                },
                HRHB: {
                    core: ['op:livno:livno_2'],
                    corridor: [],
                    periphery: ['__default__'],
                },
            },
        });

        assert.strictEqual(getOsidPriority('op:banja_luka:banja_luka_2', 'RS'), 'core');
        assert.strictEqual(getOsidPriority('op:pale:pale', 'RS'), 'core');
        assert.strictEqual(getOsidPriority('op:brcko:brcko', 'RS'), 'corridor');
        // Unlisted OSID for RS defaults to periphery via __default__.
        assert.strictEqual(getOsidPriority('op:something:not_listed', 'RS'), 'periphery');
        // Cross-faction: RS core OSID is NOT core for RBiH.
        assert.strictEqual(getOsidPriority('op:banja_luka:banja_luka_2', 'RBiH'), 'periphery');
        // Unknown faction defaults to periphery (conservative).
        assert.strictEqual(getOsidPriority('op:livno:livno_2', 'Unknown'), 'periphery');

        // Reset cache so subsequent tests/runs read disk again.
        _setStrategicPrioritiesForTesting(null);
    });

    test('Real on-disk priorities resolve banja_luka core OSID', () => {
        // Clear cache so the loader hits the real JSON file.
        _setStrategicPrioritiesForTesting(null);
        assert.strictEqual(getOsidPriority('op:banja_luka:banja_luka_2', 'RS'), 'core');
        assert.strictEqual(getOsidPriority('op:brcko:brcko', 'RS'), 'corridor');
        // Sarajevo stari_grad listed under RBiH core in real JSON.
        assert.strictEqual(
            getOsidPriority('op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo', 'RBiH'),
            'core',
        );
        // Reset for any later tests.
        _setStrategicPrioritiesForTesting(null);
    });
});
