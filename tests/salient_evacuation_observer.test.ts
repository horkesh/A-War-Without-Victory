import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { evacuateFormationsSeveredByCapture } from '../src/sim/combat/salient_withdrawal.js';
import { resetReasonCodeTopicCacheForTests, SALIENT_EVACUATION_PREFIX } from '../src/sim/combat/reason_code_debug.js';

const IDS = ['hrhb_102nd_brigade', 'hvo_hrvoje_vukcic_brigade'];

function setEnv(on: boolean, turns = '9..11', brigades = IDS.join(',')): void {
    if (on) process.env.AWWV_DEBUG_REASON_CODES = 'salient_evacuation';
    else delete process.env.AWWV_DEBUG_REASON_CODES;
    process.env.AWWV_DEBUG_SALIENT_TURNS = turns;
    process.env.AWWV_DEBUG_SALIENT_BRIGADES = brigades;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    delete process.env.AWWV_DEBUG_REASON_CODES;
    delete process.env.AWWV_DEBUG_SALIENT_TURNS;
    delete process.env.AWWV_DEBUG_SALIENT_BRIGADES;
    resetReasonCodeTopicCacheForTests();
    vi.restoreAllMocks();
});

function brigade(id: string, location: string, overrides: Partial<FormationState> = {}): FormationState {
    return { id, name: id, faction: 'HRHB', corps_id: 'hvo_north', kind: 'brigade', status: 'active', created_turn: 0,
        personnel: 1500, cohesion: 60, morale: 60, location_osid: location,
        assignment: { kind: 'sector', sector_id: 'sector:pocket' }, entrenchment_turns: 3,
        ...overrides } as FormationState;
}

function stateWith(formations: Record<string, FormationState>, turn = 10): GameState {
    return { meta: { turn, phase: 'war', seed: 'observer' }, factions: [{ id: 'RBiH' }, { id: 'HRHB' }, { id: 'RS' }],
        military: { formations, brigade_movement_orders: {}, brigade_movement_state: {} } as any,
        political: { war_alliance_rbih_hrhb: 0.75,
            political_controllers: { pocket: 'HRHB', corridor: 'RBiH', neck: 'RS', rear: 'HRHB', rear2: 'HRHB' },
            last_supply_state_by_osid: { pocket: 'critical', corridor: 'adequate', neck: 'adequate', rear: 'adequate', rear2: 'adequate' } } as any,
        displacement: {} as any } as unknown as GameState;
}

const adjacency = new Map<string, readonly string[]>([
    ['pocket', ['corridor']], ['corridor', ['neck', 'pocket']], ['neck', ['corridor', 'rear']],
    ['rear', ['neck', 'rear2']], ['rear2', ['rear']],
]);

function runAndRows(state: GameState, captured = 'neck'): { report: unknown; rows: any[]; stdout: string[] } {
    const stdout: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => stdout.push(String(line)));
    const report = evacuateFormationsSeveredByCapture(state, captured, 'HRHB', adjacency);
    const rows = stdout.filter(line => line.startsWith(SALIENT_EVACUATION_PREFIX))
        .map(line => JSON.parse(line.slice(SALIENT_EVACUATION_PREFIX.length + 1)));
    return { report, rows, stdout };
}

describe('salient evacuation stdout observer', () => {
    it('is default-off and leaves report/state byte-identical to an opt-in run', () => {
        const offState = stateWith({ [IDS[0]!]: brigade(IDS[0]!, 'pocket') });
        const onState = structuredClone(offState);
        setEnv(false);
        const off = runAndRows(offState);
        expect(off.stdout).toEqual([]);
        setEnv(true);
        const on = runAndRows(onState);
        expect(on.rows.length).toBeGreaterThan(0);
        expect(JSON.stringify(on.report)).toBe(JSON.stringify(off.report));
        expect(JSON.stringify(onState)).toBe(JSON.stringify(offState));
    });

    it('emits ranked components, actual capture binding, route, write/clear receipts and one terminal per selected id', () => {
        setEnv(true);
        const state = stateWith({
            [IDS[0]!]: brigade(IDS[0]!, 'pocket'),
            [IDS[1]!]: brigade(IDS[1]!, 'pocket', { tags: ['enclave'] }),
        });
        state.military.brigade_movement_orders![IDS[0]!] = { destination_osid: 'corridor' } as any;
        state.military.brigade_movement_state![IDS[0]!] = { status: 'moving' } as any;
        const { rows } = runAndRows(state);
        expect(rows[0]).toMatchObject({ kind: 'pass_start', turn: 10, captured_osid: 'neck', captured_owner: 'RS', displaced_faction: 'HRHB' });
        expect(rows.find(r => r.kind === 'component_rank')).toMatchObject({ initial_main_osids: ['rear', 'rear2'] });
        const written = rows.find(r => r.kind === 'formation_terminal' && r.formation_id === IDS[0]);
        expect(written).toMatchObject({ terminal: 'evacuated', start_osid: 'pocket', destination_osid: 'rear', corps_id_before: 'hvo_north', corps_id_after: 'hvo_north', order_present_before: true, order_present_after: false, movement_state_present_before: true, movement_state_present_after: false });
        expect(written.chosen_path).toEqual(['pocket', 'corridor', 'neck', 'rear']);
        expect(rows.find(r => r.kind === 'formation_terminal' && r.formation_id === IDS[1])).toMatchObject({ terminal: 'ineligible_enclave' });
        expect(rows.filter(r => r.kind === 'formation_terminal')).toHaveLength(2);
        expect(rows.at(-1)).toMatchObject({ kind: 'pass_end', terminal: 'completed' });
    });

    it('covers components<2, operation participant/staging, no-route, already-connected, out-window and absent inventory', () => {
        setEnv(true);
        const one = stateWith({ [IDS[0]!]: brigade(IDS[0]!, 'rear') });
        one.political.political_controllers = { rear: 'HRHB', rear2: 'HRHB', neck: 'RS' } as any;
        const oneRows = runAndRows(one).rows;
        expect(oneRows.find(r => r.kind === 'formation_terminal')).toMatchObject({ terminal: 'components_lt_2' });
        expect(oneRows.at(-1)).toMatchObject({ kind: 'pass_end', terminal: 'components_lt_2' });

        const held = stateWith({ [IDS[0]!]: brigade(IDS[0]!, 'pocket'), [IDS[1]!]: brigade(IDS[1]!, 'pocket') });
        held.military.corps_command = { hvo_north: { active_operations: [{ phase: 'planning', participating_brigades: [IDS[0]], staging_osid: 'pocket', axes: [] }] } } as any;
        const heldRows = runAndRows(held).rows.filter(r => r.kind === 'formation_terminal');
        expect(heldRows.map(r => r.terminal)).toEqual(['ineligible_operation_participant', 'ineligible_operation_staging']);

        const absent = stateWith({ other: brigade('other', 'pocket') });
        const absentRows = runAndRows(absent).rows;
        expect(absentRows.find(r => r.kind === 'inventory')).toMatchObject({ absent_requested_ids: IDS });
        expect(absentRows.filter(r => r.kind === 'formation_terminal').map(r => r.terminal)).toEqual(['inventory_absent', 'inventory_absent']);

        setEnv(true, '11..9');
        expect(runAndRows(stateWith({ [IDS[0]!]: brigade(IDS[0]!, 'pocket') })).stdout).toEqual([]);
        setEnv(true, '9..11');
        const connected = stateWith({ [IDS[0]!]: brigade(IDS[0]!, 'rear') });
        expect(runAndRows(connected).rows.find(r => r.kind === 'formation_terminal')).toMatchObject({ terminal: 'already_connected_to_main' });
        const blockedAdjacency = new Map(adjacency); blockedAdjacency.set('neck', ['corridor']);
        const logs: string[] = [];
        vi.restoreAllMocks(); vi.spyOn(console, 'log').mockImplementation(v => logs.push(String(v)));
        evacuateFormationsSeveredByCapture(stateWith({ [IDS[0]!]: brigade(IDS[0]!, 'pocket') }), 'neck', 'HRHB', blockedAdjacency);
        const terminal = logs.map(l => JSON.parse(l.slice(SALIENT_EVACUATION_PREFIX.length + 1))).find(r => r.kind === 'formation_terminal');
        expect(terminal).toMatchObject({ terminal: 'no_route' });
    });

    it('reader accepts valid input and rejects each structural/provenance contradiction with exit 2', () => {
        const reader = 'logs/claude-channel-20261004/314-salient-reader.cjs';
        setEnv(true);
        const base: any[] = runAndRows(stateWith(Object.fromEntries(IDS.map(id => [id, brigade(id, 'pocket')])))).rows;
        const invoke = (rows: any[]) => spawnSync(process.execPath, [reader, '--turn', '10', '--capture', 'neck', '--faction', 'HRHB', '--brigades', IDS.join(','), '--emit', 'JSON'], { input: rows.map(r => `${SALIENT_EVACUATION_PREFIX} ${JSON.stringify(r)}`).join('\n'), encoding: 'utf8' });
        expect(invoke(base).status).toBe(0);
        const invalids = [
            base.slice(0, -1), [...base, base.at(-1)], base.filter(r => r.formation_id !== IDS[1]),
            base.map(r => r.kind === 'inventory' ? { ...r, absent_requested_ids: [IDS[0]], present_requested_ids: [IDS[1]] } : r),
            base.map(r => r.kind === 'pass_start' ? { ...r, captured_osid: 'wrong' } : r),
            base.map(r => r.kind === 'pass_start' ? { ...r, turn: 9 } : r),
            base.map(r => r.kind === 'pass_start' ? { ...r, displaced_faction: 'RS' } : r),
            base.map(r => r.formation_id === IDS[0] ? { ...r, terminal: 'mystery' } : r),
            base.map(r => r.formation_id === IDS[0] ? { ...r, terminal: 'evacuated', wrote: false } : r),
            [...base.slice(0, -1), { schema_version: 1, kind: 'component_rank', turn: 10, components: [{ osids: 'bad', size: 1, supplied_count: 1 }], initial_main_osids: [] }, base.at(-1)],
            [base[0], base[4], ...base.slice(1, 4), ...base.slice(5)],
            base.map(r => r.kind === 'component_rank' ? { ...r, initial_main_osids: ['wrong'] } : r),
            base.map(r => r.wrote ? { ...r, chosen_path: ['wrong', 'rear'] } : r),
            base.map(r => r.kind === 'pass_end' ? { ...r, evacuated_formation_ids: [] } : r),
            base.map(r => r.kind === 'inventory' ? { ...r, turn: 99 } : r),
            base.map(r => r.kind === 'component_rank' ? { ...r, components: r.components.map((c: any) => ({ ...c, supplied_count: c.size + 1 })) } : r),
            base.map(r => r.kind === 'operation_holders' ? { ...r, participant_ids: [42] } : r),
            base.map(r => r.wrote ? { ...r, corps_id_after: 'wrong' } : r),
            base.map(r => r.wrote ? { ...r, order_present_after: true } : r),
            base.map(r => r.wrote ? { ...r, terminal: 'no_route', wrote: false, destination_osid: undefined, chosen_path: undefined, without_neck_terminal: 'reached_main' } : r),
        ];
        for (const rows of invalids) expect(invoke(rows).status).toBe(2);
        expect(spawnSync(process.execPath, [reader, '--turn', '10'], { input: '', encoding: 'utf8' }).status).toBe(2);
        expect(spawnSync(process.execPath, [reader, '--turn', 'NaN', '--capture', 'x', '--faction', 'HRHB', '--brigades', IDS.join(','), '--emit', 'JSON'], { input: '', encoding: 'utf8' }).status).toBe(2);
    });
});
