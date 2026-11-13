import { describe, expect, it } from 'vitest';
import {
    CorpsReorganisationDataError,
    DEFAULT_TRANSFER_MAX_DEFER_TURNS,
    loadCorpsReorganisationEvents,
    processCorpsReorganisationEvents,
    resolveLiveCorpsId,
    validateCorpsReorganisationEvents,
    type CorpsReorganisationEventDef,
} from '../src/sim/corps_reorganisation.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';

function corps(id: string, extra: Partial<FormationState> = {}): FormationState {
    return { id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null, kind: 'corps_asset', personnel: 0, ...extra } as FormationState;
}

function brigade(id: string, corpsId: string, extra: Partial<FormationState> = {}): FormationState {
    return { id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade', personnel: 1500, corps_id: corpsId, ...extra } as FormationState;
}

function op(name: string, brigades: string[], extra: Partial<CorpsOperation> = {}): CorpsOperation {
    return { name, type: 'sector_attack', phase: 'execution', started_turn: 90, phase_started_turn: 92, participating_brigades: [...brigades], ...extra } as CorpsOperation;
}

function makeState(turn: number, formations: FormationState[]): GameState {
    const map: Record<string, FormationState> = {};
    for (const f of formations) map[f.id] = f;
    return {
        meta: { turn, phase: 'war', start_year: 1992 },
        factions: [{ id: 'RBiH' }],
        military: { formations: map, corps_command: {} },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

function cmd(state: GameState, id: string, ops: CorpsOperation[] = [], extra: Record<string, unknown> = {}) {
    state.military.corps_command![id] = {
        command_span: 8, subordinate_count: 0, og_slots: 1, active_ogs: [], corps_exhaustion: 0,
        stance: 'balanced', active_operations: ops, ...extra,
    } as any;
}

const TRANSFER: CorpsReorganisationEventDef = {
    id: 'arbih_7th_corps_formation', type: 'corps_transfer', trigger_turn: 99,
    target_corps_id: 'arbih_7th_corps', formation_ids: ['b705', 'b706'], reason: 'test',
};

describe('corps reorganisation — inertness', () => {
    it('performs zero mutation and returns null before any event triggers', () => {
        const state = makeState(98, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps')]);
        const before = JSON.stringify(state);
        expect(processCorpsReorganisationEvents(state, [TRANSFER])).toBeNull();
        expect(JSON.stringify(state)).toBe(before);
    });

    it('performs zero mutation with no events', () => {
        const state = makeState(150, [corps('arbih_3rd_corps'), brigade('b705', 'arbih_3rd_corps')]);
        const before = JSON.stringify(state);
        expect(processCorpsReorganisationEvents(state, [])).toBeNull();
        expect(JSON.stringify(state)).toBe(before);
    });

    it('the shipped data file validates (Phase A ships no reorganisation events)', async () => {
        const events = await loadCorpsReorganisationEvents(process.cwd());
        expect(Array.isArray(events)).toBe(true);
    });

    it('runs after activate-corps and before sector partition, inside the war pipeline', () => {
        const names = warPhases.map((p) => p.name);
        const at = names.indexOf('apply-corps-reorganisation');
        expect(at).toBeGreaterThan(names.indexOf('activate-corps'));
        expect(at).toBeLessThan(names.indexOf('partition-corps-front-sectors'));
        expect(at).toBeLessThan(names.indexOf('derive-osid-front-segments'));
        expect(at).toBeLessThan(names.indexOf('ai-corps-decisions'));
    });
});

describe('corps_transfer', () => {
    it('moves free brigades on the trigger week, writes a receipt and refreshes subordinate counts', () => {
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps'), brigade('b706', 'arbih_3rd_corps'), brigade('b301', 'arbih_3rd_corps')]);
        cmd(state, 'arbih_3rd_corps');
        cmd(state, 'arbih_7th_corps');
        const report = processCorpsReorganisationEvents(state, [TRANSFER])!;
        expect(state.military.formations.b705.corps_id).toBe('arbih_7th_corps');
        expect(state.military.formations.b706.corps_id).toBe('arbih_7th_corps');
        expect(state.military.formations.b301.corps_id).toBe('arbih_3rd_corps');
        expect(state.military.formation_lifecycle_events_fired).toEqual({ arbih_7th_corps_formation: 99 });
        expect(report.transferred.map((t) => t.formation_id)).toEqual(['b705', 'b706']);
        expect(state.military.corps_command!.arbih_7th_corps.subordinate_count).toBe(2);
        expect(state.military.corps_command!.arbih_3rd_corps.subordinate_count).toBe(1);
    });

    it('waits while the target corps is not active, then transfers once it is', () => {
        const state = makeState(99, [corps('arbih_3rd_corps'), brigade('b705', 'arbih_3rd_corps')]);
        cmd(state, 'arbih_3rd_corps');
        processCorpsReorganisationEvents(state, [TRANSFER]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_3rd_corps');
        expect(state.military.formation_lifecycle_events_fired?.arbih_7th_corps_formation).toBeUndefined();
        state.military.formations.arbih_7th_corps = corps('arbih_7th_corps');
        state.meta.turn = 100;
        processCorpsReorganisationEvents(state, [TRANSFER]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_7th_corps');
        expect(state.military.formation_lifecycle_events_fired?.arbih_7th_corps_formation).toBe(100);
    });

    it('lets a committed brigade finish its operation, then transfers it', () => {
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps'), brigade('b706', 'arbih_3rd_corps')]);
        cmd(state, 'arbih_3rd_corps', [op('Op A', ['b705'])]);
        cmd(state, 'arbih_7th_corps');
        const r1 = processCorpsReorganisationEvents(state, [TRANSFER])!;
        expect(r1.deferred).toEqual([{ event_id: TRANSFER.id, formation_id: 'b705' }]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_3rd_corps');
        expect(state.military.formations.b706.corps_id).toBe('arbih_7th_corps');
        expect(state.military.formation_lifecycle_events_fired?.[TRANSFER.id]).toBeUndefined();
        // Operation ends (engine removes it) → next turn the brigade transfers.
        state.military.corps_command!.arbih_3rd_corps.active_operations = [];
        state.meta.turn = 100;
        processCorpsReorganisationEvents(state, [TRANSFER]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_7th_corps');
        expect(state.military.formation_lifecycle_events_fired?.[TRANSFER.id]).toBe(100);
    });

    it('forces the transfer after max_defer_turns and detaches the brigade from every op list', () => {
        const state = makeState(99 + DEFAULT_TRANSFER_MAX_DEFER_TURNS, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps'), brigade('b301', 'arbih_3rd_corps')]);
        const live = op('Op A', ['b705', 'b301'], {
            axes: [{ assigned_brigades: ['b705', 'b301'] } as any],
            attached_brigades: ['b705'],
            primary_sector_brigades: ['b705'],
            loaned_brigades: [{ brigade_id: 'b705', source_sector_id: 's', arrived: true }],
        });
        cmd(state, 'arbih_3rd_corps', [live]);
        cmd(state, 'arbih_7th_corps');
        const report = processCorpsReorganisationEvents(state, [TRANSFER])!;
        expect(state.military.formations.b705.corps_id).toBe('arbih_7th_corps');
        expect(report.transferred).toEqual([{ event_id: TRANSFER.id, formation_id: 'b705', from_corps_id: 'arbih_3rd_corps', to_corps_id: 'arbih_7th_corps', forced: true }]);
        expect(live.participating_brigades).toEqual(['b301']);
        expect(live.axes![0].assigned_brigades).toEqual(['b301']);
        expect(live.attached_brigades).toEqual([]);
        expect(live.primary_sector_brigades).toEqual([]);
        expect(live.loaned_brigades).toEqual([]);
    });

    it('defers a brigade out on an elite loan', () => {
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps', { elite_loan_state: { on_loan: true } as any })]);
        cmd(state, 'arbih_3rd_corps');
        cmd(state, 'arbih_7th_corps');
        processCorpsReorganisationEvents(state, [TRANSFER]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_3rd_corps');
    });

    it('is standing: a listed brigade that appears after the trigger week joins the target corps', () => {
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps')]);
        cmd(state, 'arbih_3rd_corps');
        cmd(state, 'arbih_7th_corps');
        processCorpsReorganisationEvents(state, [TRANSFER]);
        // b706 spawns (or is reconstituted) later from the OOB catalog with the old corps id.
        state.meta.turn = 120;
        state.military.formations.b706 = brigade('b706', 'arbih_3rd_corps', { created_turn: 120 });
        processCorpsReorganisationEvents(state, [TRANSFER]);
        expect(state.military.formations.b706.corps_id).toBe('arbih_7th_corps');
        expect(state.military.formation_lifecycle_events_fired?.[TRANSFER.id]).toBe(99); // first completion kept
    });

    it('the latest-triggered transfer governs a brigade listed twice, with no ping-pong', () => {
        const later: CorpsReorganisationEventDef = { id: 'sana_support', type: 'corps_transfer', trigger_turn: 180, target_corps_id: 'arbih_5th_corps', formation_ids: ['b705'], reason: 'test' };
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), corps('arbih_5th_corps'), brigade('b705', 'arbih_3rd_corps'), brigade('b706', 'arbih_3rd_corps')]);
        for (const id of ['arbih_3rd_corps', 'arbih_5th_corps', 'arbih_7th_corps']) cmd(state, id);
        processCorpsReorganisationEvents(state, [later, TRANSFER]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_7th_corps');
        for (const turn of [180, 181, 182]) {
            state.meta.turn = turn;
            processCorpsReorganisationEvents(state, [later, TRANSFER]);
            expect(state.military.formations.b705.corps_id).toBe('arbih_5th_corps');
            expect(state.military.formations.b706.corps_id).toBe('arbih_7th_corps');
        }
    });

    it('ignores inactive and missing formations and never moves a corps formation', () => {
        const ev: CorpsReorganisationEventDef = { ...TRANSFER, formation_ids: ['b705', 'gone', 'arbih_3rd_corps'] };
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), brigade('b705', 'arbih_3rd_corps', { status: 'inactive' })]);
        cmd(state, 'arbih_3rd_corps');
        cmd(state, 'arbih_7th_corps');
        processCorpsReorganisationEvents(state, [ev]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_3rd_corps');
        expect(state.military.formations.arbih_3rd_corps.corps_id).toBeUndefined();
    });
});

describe('corps_retire', () => {
    const RETIRE: CorpsReorganisationEventDef = { id: 'retire_x', type: 'corps_retire', trigger_turn: 50, corps_id: 'corps_x', successor_corps_id: 'corps_y', reason: 'test' };

    function retireState(): GameState {
        const state = makeState(50, [
            corps('corps_x'), corps('corps_y'),
            brigade('bx1', 'corps_x'), brigade('bx2', 'corps_x'), brigade('bx_dead', 'corps_x', { status: 'inactive' }),
            brigade('og_x', 'corps_x', { kind: 'og' }), brigade('by1', 'corps_y'),
        ]);
        cmd(state, 'corps_x', [op('Op Live', ['bx1'], { commander_officer_id: 'off1', tg_commander_officer_id: 'off2' })], {
            queued_operations: ['Operation Later'], active_ogs: ['og_x'],
        });
        cmd(state, 'corps_y');
        state.military.named_officers = {
            off1: { status: 'active', assigned_operation: 'Op Live' },
            off2: { status: 'active', assigned_operation: 'Op Live' },
        } as any;
        return state;
    }

    it('cancels live ops, drops the queue, hands every active subordinate to the successor and switches the corps off', () => {
        const state = retireState();
        const report = processCorpsReorganisationEvents(state, [RETIRE])!;
        const f = state.military.formations;
        expect([f.bx1.corps_id, f.bx2.corps_id, f.og_x.corps_id]).toEqual(['corps_y', 'corps_y', 'corps_y']);
        expect(f.bx_dead.corps_id).toBe('corps_x'); // history untouched
        expect(f.corps_x.status).toBe('inactive');
        expect(state.military.corps_command!.corps_x).toBeUndefined();
        expect(state.military.corps_command!.corps_y.active_ogs).toEqual(['og_x']);
        expect(state.military.corps_command!.corps_y.subordinate_count).toBe(4);
        expect((state.military.named_officers as any).off1).toMatchObject({ status: 'reserve', assigned_operation: undefined });
        expect((state.military.named_officers as any).off2).toMatchObject({ status: 'reserve', assigned_operation: undefined });
        expect(report.retired).toEqual([{ event_id: 'retire_x', corps_id: 'corps_x', successor_corps_id: 'corps_y', cancelled_operations: ['Op Live'], dropped_queued_operations: ['Operation Later'] }]);
        expect(state.military.formation_lifecycle_events_fired).toEqual({ retire_x: 50 });
    });

    it('is standing: a formation that later appears under the retired corps goes to the successor', () => {
        const state = retireState();
        processCorpsReorganisationEvents(state, [RETIRE]);
        state.meta.turn = 60;
        state.military.formations.bx_late = brigade('bx_late', 'corps_x');
        processCorpsReorganisationEvents(state, [RETIRE]);
        expect(state.military.formations.bx_late.corps_id).toBe('corps_y');
        expect(state.military.corps_command!.corps_x).toBeUndefined();
        expect(state.military.formations.corps_x.status).toBe('inactive');
    });

    it('waits while the successor is not active', () => {
        const state = retireState();
        state.military.formations.corps_y.status = 'inactive';
        const before = JSON.stringify(state);
        expect(processCorpsReorganisationEvents(state, [RETIRE])).toBeNull();
        expect(JSON.stringify(state)).toBe(before);
    });

    it('a transfer whose target has retired resolves to the successor', () => {
        const state = retireState();
        state.military.formations.bz = brigade('bz', 'corps_y');
        const toX: CorpsReorganisationEventDef = { id: 'to_x', type: 'corps_transfer', trigger_turn: 40, target_corps_id: 'corps_x', formation_ids: ['bz'], reason: 'test' };
        processCorpsReorganisationEvents(state, [toX, RETIRE]);
        expect(state.military.formations.bz.corps_id).toBe('corps_y');
        expect(resolveLiveCorpsId('a', new Map([['a', 'b'], ['b', 'a']]))).toBe('a'); // cycle-safe
    });
});

describe('corps_transfer of a brigade out on an elite loan', () => {
    it('closes the loan through the recall lifecycle and leaves the host operation at the forced deadline', () => {
        const turn = 99 + DEFAULT_TRANSFER_MAX_DEFER_TURNS;
        const state = makeState(turn, [
            corps('arbih_3rd_corps'), corps('arbih_7th_corps'), corps('arbih_2nd_corps'),
            brigade('b705', 'arbih_3rd_corps', {
                home_osid: 'op:bugojno:home', base_osid: 'op:bugojno:base', location_osid: 'op:tuzla:front',
                elite_loan_state: { on_loan: true, loaned_to_corps: 'arbih_2nd_corps', loan_start_turn: 90, last_recall_turn: null, loan_start_personnel: 1500, permanently_degraded: false, current_episode_id: 0 },
            } as any),
            brigade('b201', 'arbih_2nd_corps'),
        ]);
        const hostOp = op('Host Op', ['b705', 'b201'], { attached_brigades: ['b705'] });
        cmd(state, 'arbih_3rd_corps');
        cmd(state, 'arbih_7th_corps');
        cmd(state, 'arbih_2nd_corps', [hostOp]);
        state.military.elite_brigade_tracker = {
            b705: { episodes: [{ loan_start_turn: 90, personnel_start: 1500, casualties_taken: 0, battles_fought: 2, osids_captured: 1 }], total_casualties_taken: 0, total_battles: 0, total_osids_captured: 0 },
        } as any;

        const report = processCorpsReorganisationEvents(state, [TRANSFER])!;
        const f = state.military.formations.b705;
        expect(f.corps_id).toBe('arbih_7th_corps');
        expect(report.transferred[0]).toMatchObject({ formation_id: 'b705', forced: true });
        expect(f.elite_loan_state).toMatchObject({ on_loan: false, loaned_to_corps: null, last_recall_turn: turn, current_episode_id: null });
        expect((state.military.elite_brigade_tracker as any).b705.episodes[0]).toMatchObject({ loan_end_turn: turn, recall_reason: 'corps_reorganisation' });
        expect(f.location_osid).toBe('op:bugojno:base');
        expect(hostOp.participating_brigades).toEqual(['b201']);
        expect(hostOp.attached_brigades).toEqual([]);
    });

    it('defers while the loan is live and the deadline has not passed', () => {
        const state = makeState(99, [corps('arbih_3rd_corps'), corps('arbih_7th_corps'),
            brigade('b705', 'arbih_3rd_corps', { elite_loan_state: { on_loan: true, loaned_to_corps: 'arbih_2nd_corps' } as any })]);
        cmd(state, 'arbih_3rd_corps');
        cmd(state, 'arbih_7th_corps');
        processCorpsReorganisationEvents(state, [TRANSFER]);
        expect(state.military.formations.b705.corps_id).toBe('arbih_3rd_corps');
        expect(state.military.formations.b705.elite_loan_state?.on_loan).toBe(true);
    });
});

describe('determinism', () => {
    it('produces identical state regardless of formation insertion order and event order', () => {
        const build = (reverse: boolean) => {
            const fs = [corps('arbih_3rd_corps'), corps('arbih_7th_corps'), corps('corps_x'),
                brigade('b705', 'arbih_3rd_corps'), brigade('b706', 'arbih_3rd_corps'), brigade('bx', 'corps_x')];
            const state = makeState(99, reverse ? [...fs].reverse() : fs);
            for (const id of reverse ? ['corps_x', 'arbih_7th_corps', 'arbih_3rd_corps'] : ['arbih_3rd_corps', 'arbih_7th_corps', 'corps_x']) cmd(state, id);
            const events: CorpsReorganisationEventDef[] = [TRANSFER, { id: 'r', type: 'corps_retire', trigger_turn: 99, corps_id: 'corps_x', successor_corps_id: 'arbih_7th_corps', reason: '' }];
            processCorpsReorganisationEvents(state, reverse ? [...events].reverse() : events);
            const sortKeys = (o: Record<string, unknown>) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
            return JSON.stringify({
                f: sortKeys(state.military.formations as any),
                c: sortKeys(state.military.corps_command as any),
                r: state.military.formation_lifecycle_events_fired,
            });
        };
        expect(build(true)).toBe(build(false));
    });
});

describe('validation', () => {
    it('rejects malformed data loudly', () => {
        expect(() => validateCorpsReorganisationEvents({})).toThrow(CorpsReorganisationDataError);
        expect(() => validateCorpsReorganisationEvents([{ id: 'a', type: 'corps_transfer', trigger_turn: 1, target_corps_id: 'x', formation_ids: [] }])).toThrow(/formation_ids/);
        expect(() => validateCorpsReorganisationEvents([{ id: 'a', type: 'corps_retire', trigger_turn: 1, corps_id: 'x', successor_corps_id: 'x' }])).toThrow(/successor/);
        expect(() => validateCorpsReorganisationEvents([{ id: 'a', type: 'nope', trigger_turn: 1 }])).toThrow(/unknown type/);
        expect(() => validateCorpsReorganisationEvents([{ id: 'a', type: 'corps_retire', trigger_turn: -1, corps_id: 'x', successor_corps_id: 'y' }])).toThrow(/trigger_turn/);
        const dup = { id: 'a', type: 'corps_retire', trigger_turn: 1, corps_id: 'x', successor_corps_id: 'y' };
        expect(() => validateCorpsReorganisationEvents([dup, dup])).toThrow(/duplicate/);
    });

    it('normalises formation_ids (dedupe + sort) and orders events by (trigger_turn, id)', () => {
        const out = validateCorpsReorganisationEvents([
            { id: 'z', type: 'corps_transfer', trigger_turn: 5, target_corps_id: 't', formation_ids: ['b', 'a', 'b'] },
            { id: 'a', type: 'corps_transfer', trigger_turn: 5, target_corps_id: 't', formation_ids: ['c'] },
            { id: 'm', type: 'corps_transfer', trigger_turn: 1, target_corps_id: 't', formation_ids: ['d'] },
        ]);
        expect(out.map((e) => e.id)).toEqual(['m', 'a', 'z']);
        expect((out[2] as any).formation_ids).toEqual(['a', 'b']);
    });
});
