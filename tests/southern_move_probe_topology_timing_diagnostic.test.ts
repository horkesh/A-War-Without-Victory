import { describe, expect, it } from 'vitest';

import type {
    CorpsFrontSector,
    CorpsOperation,
    FormationState,
    GameState,
    SectorIntelRecord,
} from '../src/state/game_state.js';
import {
    autoResolveProbe,
    getOperationIntelConfidence,
    resolveActiveProbe,
    tickPreparation,
} from '../src/sim/combat/operation_preparation.js';
import { deriveSectorIntel, stableSectorKey } from '../src/sim/combat/sector_intel.js';

const CORPS = 'vrs_1st_krajina';
const OWN_NOW = 'own_now';
const TARGET_NOW = 'target_now';
const OTHER_NOW = 'other_now';
const OWN_EDGE_A = 'edge:shared:other';
const OWN_EDGE_B = 'edge:shared:target';
const OLD_TARGET_KEY = 'arbih_target|edge:anchor:old';

function sector(
    sectorId: string,
    corpsId: string,
    faction: 'RS' | 'RBiH',
    edgeIds: string[],
    territoryOsids: string[],
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [faction === 'RS' ? 'RBiH' : 'RS'],
        edge_ids: edgeIds,
        territory_osids: territoryOsids,
        assigned_brigade_ids: faction === 'RS' ? ['b1'] : [],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        length_edges: edgeIds.length,
        density: faction === 'RS' ? 1 : 0,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
        sub_segments: [],
    } as CorpsFrontSector;
}

function intel(
    enemySectorId: string,
    confidence: number,
    ownStableKey: string,
    enemyStableKey: string,
): SectorIntelRecord {
    return {
        enemy_sector_id: enemySectorId,
        enemy_faction: 'RBiH',
        enemy_corps_id: enemyStableKey.split('|')[0],
        front_edge_count: 1,
        strength_category: 'moderate',
        posture_observed: 'defensive',
        offensive_signs: false,
        confidence,
        turns_in_contact: 4,
        visible_brigade_ids: [],
        last_updated_turn: 186,
        own_stable_key: ownStableKey,
        enemy_stable_key: enemyStableKey,
    };
}

function formation(id: string, kind: 'corps' | 'brigade'): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        corps_id: CORPS,
        kind,
        status: 'active',
        created_turn: 0,
        assignment: null,
        personnel: kind === 'brigade' ? 1500 : 0,
        cohesion: 80,
        morale: 75,
        equipment_class: 'light_infantry',
        location_osid: 'op:home',
    } as FormationState;
}

function operation(): CorpsOperation {
    return {
        name: 'Operation Southern Move',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 186,
        phase_started_turn: 186,
        planning_duration: 6,
        participating_brigades: ['b1'],
        sector_id: OWN_NOW,
        objectives: ['op:target'],
        supply_readiness: 0.9,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        preparation_sub_phase: 'intel_gathering',
        preparation_turns_elapsed: 0,
        preparation_max_turns: 6,
        postponement_count: 0,
        active_probe: {
            target_osid: 'op:target',
            brigade_ids: ['b1'],
            started_turn: 185,
            resolved: false,
        },
    } as CorpsOperation;
}

function makeState(targetAnchor: 'old' | 'new'): { state: GameState; op: CorpsOperation } {
    const op = operation();
    const sectors = {
        [OWN_NOW]: sector(OWN_NOW, CORPS, 'RS', [OWN_EDGE_A, OWN_EDGE_B], ['op:home']),
        [TARGET_NOW]: sector(
            TARGET_NOW,
            'arbih_target',
            'RBiH',
            [`edge:anchor:${targetAnchor}`, OWN_EDGE_B],
            ['op:target'],
        ),
        [OTHER_NOW]: sector(OTHER_NOW, 'arbih_other', 'RBiH', [OWN_EDGE_A], ['op:other']),
    };
    const ownKey = stableSectorKey(sectors[OWN_NOW]);
    const state = {
        meta: { turn: 187, phase: 'war', seed: 'probe-topology-timing' },
        political: {
            political_controllers: { 'op:home': 'RS', 'op:target': 'RBiH', 'op:other': 'RBiH' },
            control_events: [],
        },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: { [CORPS]: formation(CORPS, 'corps'), b1: formation('b1', 'brigade') },
            corps_command: {
                [CORPS]: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [op],
                },
            },
            corps_front_sectors: sectors,
            sector_intel: {
                own_old: [
                    intel('target_old', 0.2, ownKey, OLD_TARGET_KEY),
                    intel('other_old', 0.7, ownKey, stableSectorKey(sectors[OTHER_NOW])),
                ],
            },
            named_officers: {},
            named_officer_data: [],
            opsec_sectors: [],
            brigade_attack_orders: {},
            brigade_movement_orders: {},
        },
    } as unknown as GameState;
    return { state, op };
}

function tick(state: GameState, op: CorpsOperation): number {
    return tickPreparation(state, op, CORPS, 'RS', 0.9).intel_confidence;
}

describe('Southern Move probe topology/timing diagnostic', () => {
    it('credits only the current objective pair when enemy topology is unchanged', () => {
        const { state, op } = makeState('old');
        const beforeTarget = state.military.sector_intel!.own_old![0]!.confidence;
        const beforeOther = state.military.sector_intel!.own_old![1]!.confidence;

        autoResolveProbe(state, op, 'RS', CORPS);

        const targetAfter = state.military.sector_intel!.own_old![0]!.confidence;
        expect(beforeTarget).toBe(0.2);
        expect(beforeOther).toBe(0.7);
        expect(targetAfter).toBeCloseTo(0.375, 6);
        expect(state.military.sector_intel!.own_old![1]!.confidence).toBeCloseTo(0.7, 6);
        expect(getOperationIntelConfidence(state, op)).toBe(targetAfter);
        expect(tick(state, op)).toBe(targetAfter);
    });

    it('creates and credits the current target pair after an enemy anchor change', () => {
        const { state, op } = makeState('new');
        const [staleTarget, unrelated] = state.military.sector_intel!.own_old!;
        const staleBefore = staleTarget!.confidence;
        const unrelatedBefore = unrelated!.confidence;

        autoResolveProbe(state, op, 'RS', CORPS);

        expect(state.military.corps_front_sectors![OTHER_NOW]!.territory_osids).not.toContain('op:target');
        expect(unrelated!.enemy_stable_key).toBe(stableSectorKey(state.military.corps_front_sectors![OTHER_NOW]!));
        expect(staleBefore).toBe(0.2);
        expect(unrelatedBefore).toBe(0.7);
        expect(staleTarget!.confidence).toBeCloseTo(0.2, 6);
        expect(unrelated!.confidence).toBeCloseTo(0.7, 6);
        expect(staleTarget!.enemy_stable_key).not.toBe(stableSectorKey(state.military.corps_front_sectors![TARGET_NOW]!));
        const currentTarget = Object.values(state.military.sector_intel!).flat().find(
            rec => rec.own_stable_key === stableSectorKey(state.military.corps_front_sectors![OWN_NOW]!)
                && rec.enemy_stable_key === stableSectorKey(state.military.corps_front_sectors![TARGET_NOW]!),
        );
        // The probe runs before the normal intel derivation. Missing records start at
        // the existing RS 0.30 floor, then receive the automatic probe's 0.175 credit.
        expect(currentTarget?.confidence).toBeCloseTo(0.475, 6);
        expect(currentTarget?.turns_in_contact).toBe(0);
        expect(currentTarget?.last_updated_turn).toBe(187);
        expect(getOperationIntelConfidence(state, op)).toBeCloseTo(0.475, 6);
        expect(tick(state, op)).toBeCloseTo(0.475, 6);

        deriveSectorIntel(state, 187);

        const afterDerive = Object.values(state.military.sector_intel!).flat().find(
            rec => rec.own_stable_key === stableSectorKey(state.military.corps_front_sectors![OWN_NOW]!)
                && rec.enemy_stable_key === stableSectorKey(state.military.corps_front_sectors![TARGET_NOW]!),
        );
        // Exactly one normal turn update: 0.475 + 0.08 passive - 0.12 decay = 0.435.
        expect(afterDerive?.confidence).toBeCloseTo(0.435, 6);
        expect(afterDerive?.turns_in_contact).toBe(1);
        expect(getOperationIntelConfidence(state, op)).toBeCloseTo(0.435, 6);
    });

    it('credits the derived current target record without changing unrelated intel', () => {
        const { state, op } = makeState('new');

        deriveSectorIntel(state, 187);
        const records = Object.values(state.military.sector_intel!).flat();
        const currentTarget = records.find(rec => rec.enemy_stable_key === stableSectorKey(state.military.corps_front_sectors![TARGET_NOW]!));
        const currentOther = records.find(rec => rec.enemy_stable_key === stableSectorKey(state.military.corps_front_sectors![OTHER_NOW]!));
        expect(currentTarget).toBeDefined();
        expect(currentOther).toBeDefined();
        const targetBefore = currentTarget!.confidence;
        const unrelatedBefore = currentOther!.confidence;
        // The changed target anchor cannot carry the prior target's 0.2 history. It starts from
        // the RS 0.30 floor plus one turn of 0.08 buildup minus 0.12 decay.
        expect(targetBefore).toBeCloseTo(0.26, 6);
        expect(unrelatedBefore).toBeCloseTo(0.66, 6);

        autoResolveProbe(state, op, 'RS', CORPS);

        expect(currentTarget!.confidence).toBeCloseTo(0.435, 6);
        expect(currentOther!.confidence).toBeCloseTo(0.66, 6);
        expect(getOperationIntelConfidence(state, op)).toBe(currentTarget!.confidence);
        expect(tick(state, op)).toBe(currentTarget!.confidence);
    });

    it('leaves OPSEC, decay, passive contact, and concentration to the one scheduled derive', () => {
        const { state, op } = makeState('new');
        state.military.opsec_sectors = [TARGET_NOW];
        state.military.corps_front_sectors![TARGET_NOW]!.reserve_brigade_ids = ['reserve_a', 'reserve_b'];

        autoResolveProbe(state, op, 'RS', CORPS);

        const ownKey = stableSectorKey(state.military.corps_front_sectors![OWN_NOW]!);
        const targetKey = stableSectorKey(state.military.corps_front_sectors![TARGET_NOW]!);
        const beforeDerive = Object.values(state.military.sector_intel!).flat().find(
            rec => rec.own_stable_key === ownKey && rec.enemy_stable_key === targetKey,
        );
        expect(beforeDerive?.confidence).toBeCloseTo(0.475, 6);
        expect(beforeDerive?.turns_in_contact).toBe(0);

        deriveSectorIntel(state, 187);

        const afterDerive = Object.values(state.military.sector_intel!).flat().find(
            rec => rec.own_stable_key === ownKey && rec.enemy_stable_key === targetKey,
        );
        // One scheduled update: +0.04 OPSEC-halved passive -0.12 decay +0.10 concentration.
        expect(afterDerive?.confidence).toBeCloseTo(0.495, 6);
        expect(afterDerive?.turns_in_contact).toBe(1);
    });

    it('applies a real probe and counter-probe only to the reciprocal current pair', () => {
        const { state, op } = makeState('new');
        const staleTarget = state.military.sector_intel!.own_old![0]!;
        const unrelated = state.military.sector_intel!.own_old![1]!;

        resolveActiveProbe(state, op, 'RS', CORPS);

        const ownKey = stableSectorKey(state.military.corps_front_sectors![OWN_NOW]!);
        const targetKey = stableSectorKey(state.military.corps_front_sectors![TARGET_NOW]!);
        const records = Object.values(state.military.sector_intel!).flat();
        const attackerRecord = records.find(
            rec => rec.own_stable_key === ownKey && rec.enemy_stable_key === targetKey,
        );
        const defenderRecord = records.find(
            rec => rec.own_stable_key === targetKey && rec.enemy_stable_key === ownKey,
        );

        expect(staleTarget.confidence).toBeCloseTo(0.2, 6);
        expect(unrelated.confidence).toBeCloseTo(0.7, 6);
        expect(attackerRecord?.confidence).toBeCloseTo(0.65, 6);
        expect(defenderRecord?.confidence).toBeCloseTo(0.2, 6);
        expect(defenderRecord?.offensive_signs).toBe(true);
        expect(getOperationIntelConfidence(state, op)).toBeCloseTo(0.65, 6);

        deriveSectorIntel(state, 187);

        const afterDerive = Object.values(state.military.sector_intel!).flat();
        const derivedAttacker = afterDerive.find(
            rec => rec.own_stable_key === ownKey && rec.enemy_stable_key === targetKey,
        );
        const derivedDefender = afterDerive.find(
            rec => rec.own_stable_key === targetKey && rec.enemy_stable_key === ownKey,
        );
        expect(derivedAttacker?.confidence).toBeCloseTo(0.61, 6);
        expect(derivedDefender?.confidence).toBeCloseTo(0.22, 6);
        expect(derivedAttacker?.turns_in_contact).toBe(1);
        expect(derivedDefender?.turns_in_contact).toBe(1);
        expect(derivedDefender?.offensive_signs).toBe(true);
    });
});
