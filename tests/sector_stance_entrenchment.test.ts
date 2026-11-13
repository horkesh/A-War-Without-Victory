import { describe, expect, it } from 'vitest';
import { applyBrigadeMovementOrders } from '../src/sim/combat/brigade_movement_orders.js';
import {
    applyStanceEntrenchment,
    type StanceEntrenchmentBasis,
} from '../src/sim/combat/sector_stance_entrenchment.js';
import { SECTOR_STANCE_ENTRENCHMENT_RATE } from '../src/sim/combat/combat_math.js';

function brigade(id: string, loc: string, et: number) {
    return { id, faction: 'RBiH', kind: 'brigade', status: 'active', location_osid: loc, entrenchment_turns: et };
}

function sector(id: string, stance: string, assigned: string[], reserve: string[] = []) {
    return {
        sector_id: id, corps_id: 'c1', faction: 'RBiH', sector_stance: stance, stance_source: 'bot',
        assigned_brigade_ids: assigned, reserve_brigade_ids: reserve, edge_ids: [`e_${id}`], sub_segments: [],
    };
}

function makeState(formations: ReturnType<typeof brigade>[], sectors: Record<string, ReturnType<typeof sector>> = {}): any {
    return {
        meta: { turn: 10, phase: 'war' },
        political: { political_controllers: {} },
        military: {
            formations: Object.fromEntries(formations.map((f) => [f.id, f])),
            corps_front_sectors: sectors,
        },
    };
}

describe('stance entrenchment (SE6)', () => {
    it('movement grows stationary brigades at the Defend rate and records the basis', () => {
        const state = makeState([brigade('b1', 'A', 3)]);
        const basis = new Map<string, StanceEntrenchmentBasis>();
        applyBrigadeMovementOrders(state, [], new Map() as any, undefined, basis as any);
        expect(state.military.formations.b1.entrenchment_turns).toBeCloseTo(3 + SECTOR_STANCE_ENTRENCHMENT_RATE.defend);
        expect(basis.get('b1')).toEqual({ before: 3, provisional: 3 + SECTOR_STANCE_ENTRENCHMENT_RATE.defend, location_osid: 'A' });
    });

    it('movement ignores last turn\'s sectors: the stance is not known before partition', () => {
        const state = makeState([brigade('b1', 'A', 3)], { s0: sector('s0', 'fortify', ['b1']) });
        applyBrigadeMovementOrders(state, [], new Map() as any);
        expect(state.military.formations.b1.entrenchment_turns).toBeCloseTo(3 + SECTOR_STANCE_ENTRENCHMENT_RATE.defend);
    });

    it('re-bases growth to the stance in force for this turn\'s combat', () => {
        const state = makeState([
            brigade('fort', 'A', 3), brigade('scr', 'B', 3), brigade('ad', 'C', 3), brigade('def', 'D', 3),
            brigade('res', 'E', 3), brigade('none', 'F', 3),
        ]);
        const basis = new Map<string, StanceEntrenchmentBasis>();
        applyBrigadeMovementOrders(state, [], new Map() as any, undefined, basis as any);
        state.military.corps_front_sectors = {
            s0: sector('s0', 'fortify', ['fort']),
            s1: sector('s1', 'screening', ['scr']),
            s2: sector('s2', 'active_defense', ['ad'], ['res']),
            s3: sector('s3', 'defend', ['def']),
        };
        const report = applyStanceEntrenchment(state, basis as any);
        const et = (id: string) => state.military.formations[id].entrenchment_turns;
        expect(et('fort')).toBeCloseTo(3 + 2.0);
        expect(et('scr')).toBeCloseTo(3);
        expect(et('ad')).toBeCloseTo(3 + 0.6);
        expect(et('res')).toBeCloseTo(3 + 0.6);
        expect(et('def')).toBeCloseTo(3 + 1.2);
        expect(et('none')).toBeCloseTo(3 + 1.2);
        expect(report.rebased).toBe(4);
    });

    it('respects the field ceiling and never re-bases a brigade that moved or was reset since', () => {
        const state = makeState([brigade('cap', 'A', 11.5), brigade('moved', 'B', 4), brigade('reset', 'C', 4)]);
        const basis = new Map<string, StanceEntrenchmentBasis>();
        applyBrigadeMovementOrders(state, [], new Map() as any, undefined, basis as any);
        state.military.formations.moved.location_osid = 'Z';
        state.military.formations.reset.entrenchment_turns = 0;
        state.military.corps_front_sectors = { s0: sector('s0', 'fortify', ['cap', 'moved', 'reset']) };
        const report = applyStanceEntrenchment(state, basis as any);
        expect(state.military.formations.cap.entrenchment_turns).toBe(12);
        expect(state.military.formations.moved.entrenchment_turns).toBeCloseTo(4 + 1.2);
        expect(state.military.formations.reset.entrenchment_turns).toBe(0);
        expect(report.skipped_moved_or_reset).toBe(2);
    });
});
