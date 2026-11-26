/**
 * CAS-REPORT-2 (orchestrator ruling §16, 2026-11-26): the battle record reports exactly the
 * applied loss on both sides, including the homeland-determination extras that morale
 * absorption applies AFTER the record is pushed.
 *
 * Before the fix the record held only the pre-absorption figures, so the AAR, Chronicle,
 * letter home and turn aftermath under-reported losses that were applied.
 *
 * Invariant pinned here, for a battle the defender absorbs:
 *   battle.defender_casualties == the defender's personnel drop (exact);
 *   battle.attacker_casualties == the attackers' personnel drop (within the §15 share rounding);
 *   battle totals == report.casualty_attacker / report.casualty_defender.
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

/** Two RS brigades attack an ARBiH brigade holding the cell, with high defender morale. */
function makeScenario(defenderPersonnel: number) {
    const corps = makeFormation('vrs_drina', 'RS', 'corps', 'op:rs:hq');
    const big = makeFormation('brig_rs_big', 'RS', 'brigade', STAGING_OSID, { corps_id: 'vrs_drina' });
    const small = makeFormation('brig_rs_small', 'RS', 'brigade', STAGING_OSID, { corps_id: 'vrs_drina', personnel: 2000 });
    const defender = makeFormation('brig_rbih_def', 'RBiH', 'brigade', TARGET_OSID, {
        personnel: defenderPersonnel, morale: 90, posture: 'defend',
        composition: {
            infantry: Math.max(1, Math.round(defenderPersonnel * 0.8)), tanks: 0, artillery: 2, aa_systems: 0,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
    });
    const attackers = [big, small];
    const operation = {
        name: 'test_abs_op', type: 'sector_attack', occupies_on_victory: true, phase: 'execution',
        started_turn: 3, phase_started_turn: 3,
        participating_brigades: attackers.map(a => a.id),
        objectives: [TARGET_OSID], objective_capture_count: 0, attack_attempt_count: 0,
        sector_id: 'sector:vrs_drina:0',
        axes: [{
            axis_id: 'test_abs_op_ax0', name: 'Main', assigned_brigades: attackers.map(a => a.id),
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
        vrs_drina: corps, [big.id]: big, [small.id]: small, [defender.id]: defender,
    };
    const state = {
        meta: { turn: 5, phase: 'war', seed: 'abs-rec-test', scenario_start_date: { year: 1992, month: 4, day: 6 } },
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
            militia_pools: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        },
        displacement: {},
    } as unknown as GameState;
    const edges: EdgeRecord[] = [{ edge_id: 'e1', a: STAGING_OSID, b: TARGET_OSID } as EdgeRecord];
    return { state, edges, attackers, defender };
}

const personnelOf = (fs_: FormationState[]) => fs_.reduce((n, f) => n + (f.personnel ?? 0), 0);

describe('CAS-REPORT-2: the battle record includes the morale-absorption extras', () => {
    it('an absorbed battle records exactly the applied loss on both sides', () => {
        let absorbedCases = 0;
        for (const defenderPersonnel of [3500, 4000, 5000, 7000, 10000]) {
            const fx = makeScenario(defenderPersonnel);
            const attBefore = personnelOf(fx.attackers);
            const defBefore = fx.defender.personnel ?? 0;
            const report = resolveAttackOrdersOsid(fx.state, fx.edges, new Map<string, string[]>(), null, null,
                new Map<string, number>([[TARGET_OSID, 40_000]]));
            expect(report.battles.length).toBe(1);
            const battle = report.battles[0]!;
            const absorbed = battle.snap_events.some(e => e.snap_type === 'morale_absorption');            if (!absorbed) continue;
            absorbedCases++;
            const attDrop = attBefore - personnelOf(fx.attackers);
            const defDrop = defBefore - (fx.defender.personnel ?? 0);
            expect(defDrop).toBeGreaterThan(0);
            expect(battle.defender_casualties).toBe(defDrop);
            expect(Math.abs(battle.attacker_casualties - attDrop)).toBeLessThanOrEqual(1);
            expect(report.casualty_attacker).toBe(battle.attacker_casualties);
            expect(report.casualty_defender).toBe(battle.defender_casualties);
        }
        // The fixture must exercise the path it pins.
        expect(absorbedCases).toBeGreaterThan(0);
    });
});
