/**
 * CAS-REPORT §15 (orchestrator ruling 2026-11-26): the attacker side of a battle record
 * reports only the casualties that were actually applied.
 *
 * `finalAttackerCas` is capped for the whole force, but the per-brigade shares were not,
 * while `applyPersonnelLoss` clamps each brigade at MIN_COMBAT_PERSONNEL. A small brigade
 * fighting beside a large one could be "charged" more than it could lose, and the battle
 * record, the turn report and the casualty ledger reported the unapplied figure. Player
 * text (AAR, Chronicle, letter home, turn aftermath) reads that record.
 *
 * Invariant pinned here: battle.attacker_casualties == the attackers' personnel drop ==
 * the attacker faction's ledger total == report.casualty_attacker.
 *
 * Deterministic: fixed turn, no randomness, no wall clock.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import {
    initializeCasualtyLedger,
    resetCasualtyRealismFractionOverride,
    setCasualtyRealismFractionOverride,
} from '../src/state/casualty_ledger.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import { MIN_COMBAT_PERSONNEL } from '../src/state/formation_constants.js';
import type {
    CorpsFrontSector,
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

const TARGET_OSID = 'op:gorazde:gorazde_2';
const STAGING_OSID = 'op:rs:staging';
const POOL_KEY = militiaPoolKey('gorazde', 'RBiH');

// The ledger assertions compare exact recorded totals: force the casualty-realism
// fractions to 1.0 so the ledger records the full applied loss.
beforeEach(() => setCasualtyRealismFractionOverride({ RBiH: 1, RS: 1, HRHB: 1 }));
afterEach(() => resetCasualtyRealismFractionOverride());

function makeFormation(id: string, faction: FactionId, kind: 'brigade' | 'corps', loc: string,
    overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, name: id, faction, kind, status: 'active',
        personnel: 5000, cohesion: 80, morale: 80, experience: 0.5,
        location_osid: loc, posture: 'attack',
        composition: {
            infantry: 2000, tanks: 20, artillery: 15, aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
        ...overrides,
    } as FormationState;
}

/**
 * A large RS brigade and a small one attack one ARBiH-held cell defended by militia
 * only, so the homeland-determination extra (a separate, already per-brigade-capped
 * path that needs a defending formation) stays out of the figures.
 */
function makeScenario(smallPersonnel: number) {
    const corps = makeFormation('vrs_drina', 'RS', 'corps', 'op:rs:hq');
    const big = makeFormation('brig_rs_big', 'RS', 'brigade', STAGING_OSID, { corps_id: 'vrs_drina' });
    const small = makeFormation('brig_rs_small', 'RS', 'brigade', STAGING_OSID, {
        corps_id: 'vrs_drina', personnel: smallPersonnel,
    });
    const attackers = [big, small];
    const operation = {
        name: 'test_cas_op', type: 'sector_attack', occupies_on_victory: true, phase: 'execution',
        started_turn: 3, phase_started_turn: 3,
        participating_brigades: attackers.map(a => a.id),
        objectives: [TARGET_OSID], objective_capture_count: 0, attack_attempt_count: 0,
        sector_id: 'sector:vrs_drina:0',
        axes: [{
            axis_id: 'test_cas_op_ax0', name: 'Main', assigned_brigades: attackers.map(a => a.id),
            objectives: [TARGET_OSID], current_objective_index: 0, status: 'executing',
            failure_count: 0, consecutive_failures_on_current: 0, momentum: 0,
            attack_attempt_count: 0, objective_capture_count: 0,
            movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
        }],
    } as unknown as CorpsOperation;
    const sector = {
        sector_id: 'sector:vrs_drina:0', corps_id: 'vrs_drina', faction: 'RS', opposing_factions: [],
        edge_ids: ['e1'],
        sub_segments: [{
            sub_segment_id: 'sub:vrs_drina:0:0', edge_ids: ['e1'], enemy_osids: [TARGET_OSID],
            friendly_osids: [STAGING_OSID], primary_brigade_ids: [], length_edges: 1,
        }],
        length_edges: 1, territory_osids: [STAGING_OSID],
        assigned_brigade_ids: attackers.map(a => a.id), reserve_brigade_ids: [],
        density: 1, threat_ratio: 1.0, defensive_power: 100, sector_stance: 'defend', stance_source: 'bot',
    } as unknown as CorpsFrontSector;
    const formations: Record<string, FormationState> = {
        vrs_drina: corps, [big.id]: big, [small.id]: small,
    };
    const state = {
        meta: { turn: 5, phase: 'war', seed: 'att-cas-test', scenario_start_date: { year: 1992, month: 4, day: 6 } },
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }],
        formations,
        political: {
            political_controllers: { [STAGING_OSID]: 'RS', 'op:rs:hq': 'RS', [TARGET_OSID]: 'RBiH' },
            control_events: [],
        },
        military: {
            formations,
            corps_command: {
                vrs_drina: {
                    command_span: 3, subordinate_count: 2, og_slots: 1, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [operation],
                },
            },
            corps_front_sectors: { 'sector:vrs_drina:0': sector },
            brigade_attack_orders: { [big.id]: TARGET_OSID, [small.id]: TARGET_OSID },
            militia_pools: { [POOL_KEY]: { mun_id: 'gorazde', faction: 'RBiH', available: 20_000, committed: 0, exhausted: 0, updated_turn: 0 } },
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        },
        displacement: {},
    } as unknown as GameState;
    const edges: EdgeRecord[] = [{ edge_id: 'e1', a: STAGING_OSID, b: TARGET_OSID } as EdgeRecord];
    return { state, edges, big, small };
}

function resolve(fx: ReturnType<typeof makeScenario>) {
    return resolveAttackOrdersOsid(fx.state, fx.edges, new Map<string, string[]>(), null, null,
        new Map<string, number>([[TARGET_OSID, 40_000]]));
}

function ledgerTotal(state: GameState, faction: string): number {
    const row = (state.military.casualty_ledger as unknown as Record<string, { killed: number; wounded: number; missing_captured: number }>)[faction];
    return row ? row.killed + row.wounded + row.missing_captured : 0;
}

describe('CAS-REPORT §15: attacker casualties are recorded as applied', () => {
    it('a brigade one man above the floor loses at most one man, and the record says so', () => {
        const fx = makeScenario(MIN_COMBAT_PERSONNEL + 1);
        const before = (fx.big.personnel ?? 0) + (fx.small.personnel ?? 0);
        const report = resolve(fx);
        const battle = report.battles.find(b => (b.attacker_brigades ?? []).includes(fx.small.id));
        expect(battle).toBeDefined();
        const drop = before - ((fx.big.personnel ?? 0) + (fx.small.personnel ?? 0));
        expect(fx.small.personnel).toBeGreaterThanOrEqual(MIN_COMBAT_PERSONNEL);
        expect(battle!.attacker_casualties).toBe(drop);
        expect(report.casualty_attacker).toBe(drop);
        expect(ledgerTotal(fx.state, 'RS')).toBe(drop);
    });

    it('with room to spare the applied figure equals the computed figure (no behaviour change)', () => {
        const fx = makeScenario(3000);
        const before = (fx.big.personnel ?? 0) + (fx.small.personnel ?? 0);
        const report = resolve(fx);
        const battle = report.battles[0]!;
        const drop = before - ((fx.big.personnel ?? 0) + (fx.small.personnel ?? 0));
        expect(battle.attacker_casualties).toBeGreaterThan(0);
        expect(battle.attacker_casualties).toBe(drop);
        expect(ledgerTotal(fx.state, 'RS')).toBe(drop);
    });
});
