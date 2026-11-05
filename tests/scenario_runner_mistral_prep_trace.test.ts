import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitMistralPrepTraceLine } from '../src/scenario/scenario_runner.js';
import type { GameState } from '../src/state/game_state.js';
import type { TurnReport } from '../src/sim/turn_pipeline_types.js';

const ENV_VAR = 'AWWV_MISTRAL_PREP_TRACE';
const PREFIX = '[mistral-prep-trace] ';

interface OperationFixture {
    name: string;
    started_turn: number;
    phase: string;
    phase_started_turn: number;
    planning_duration: number;
    preparation_sub_phase?: string;
    preparation_turns_elapsed?: number;
    preparation_max_turns?: number;
    postponement_count?: number;
    sector_id: string;
    participating_brigades: string[];
}

function buildOperation(overrides: Partial<OperationFixture> = {}): OperationFixture {
    return {
        name: 'Operation Mistral 2',
        started_turn: 175,
        phase: 'planning',
        phase_started_turn: 175,
        planning_duration: 4,
        preparation_sub_phase: 'intel_gathering',
        preparation_turns_elapsed: 2,
        preparation_max_turns: 5,
        postponement_count: 0,
        sector_id: 'sector:hvo_tomislavgrad:0',
        participating_brigades: ['hv_4th_guards_split'],
        ...overrides,
    };
}

function buildState(turn: number, operation: OperationFixture | null = buildOperation()): GameState {
    return {
        meta: { turn },
        military: {
            corps_command: {
                hvo_tomislavgrad: { active_operations: operation ? [operation] : [] },
            },
            sector_intel: {
                'sector:hvo_tomislavgrad:0': [{ enemy_sector_id: 'sector:vrs_2nd_krajina:0', confidence: 0 }],
            },
            formations: {
                hv_4th_guards_split: { location_osid: 'op:livno:livno_2', status: 'active' },
            },
        },
    } as unknown as GameState;
}

function buildReport(): TurnReport {
    return {
        seed: 'x',
        phases: [],
        preparation_events: [
            {
                corps_id: 'hvo_tomislavgrad',
                operation_name: 'Operation Mistral 2',
                sub_phase: 'intel_gathering',
                intel_confidence: 0,
                supply_readiness: 1,
                force_ratio_estimate: 1,
            },
            {
                corps_id: 'arbih_3rd_corps',
                operation_name: 'Some Other Operation',
                sub_phase: 'ready',
                intel_confidence: 1,
                supply_readiness: 1,
            },
        ],
    } as unknown as TurnReport;
}

function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.keys(value as Record<string, unknown>)) {
            deepFreeze((value as Record<string, unknown>)[key]);
        }
    }
    return value;
}

function captureWrites(): { lines: () => string[] } {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    return { lines: () => write.mock.calls.map((call) => String(call[0])) };
}

function parseLine(line: string): Record<string, any> {
    expect(line.startsWith(PREFIX)).toBe(true);
    expect(line.endsWith('\n')).toBe(true);
    return JSON.parse(line.slice(PREFIX.length));
}

describe('emitMistralPrepTraceLine', () => {
    afterEach(() => {
        delete process.env[ENV_VAR];
        vi.restoreAllMocks();
    });

    it('gate off: returns before any state or report access and writes nothing', () => {
        const out = captureWrites();
        const tripwire = new Proxy({}, {
            get() { throw new Error('state/report touched with the gate off'); },
            has() { throw new Error('state/report touched with the gate off'); },
            ownKeys() { throw new Error('state/report touched with the gate off'); },
        });
        for (const value of [undefined, '', '0', 'true', 'yes', ' 1']) {
            if (value === undefined) delete process.env[ENV_VAR];
            else process.env[ENV_VAR] = value;
            expect(() => emitMistralPrepTraceLine(tripwire as GameState, tripwire as TurnReport, 176)).not.toThrow();
        }
        expect(out.lines()).toEqual([]);
    });

    it('gate off with real fixtures: no output and no mutation of state or report', () => {
        const out = captureWrites();
        const state = buildState(177);
        const report = buildReport();
        const before = JSON.stringify([state, report]);
        emitMistralPrepTraceLine(state, report, 176);
        expect(out.lines()).toEqual([]);
        expect(JSON.stringify([state, report])).toBe(before);
    });

    it('gate on: reads frozen state and report without mutating them and emits one prefixed line', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        const state = deepFreeze(buildState(177));
        const report = deepFreeze(buildReport());
        const before = JSON.stringify([state, report]);
        expect(() => emitMistralPrepTraceLine(state, report, 176)).not.toThrow();
        expect(JSON.stringify([state, report])).toBe(before);
        expect(out.lines()).toHaveLength(1);
        const payload = parseLine(out.lines()[0]!);
        expect(payload.loop_index).toBe(176);
        expect(payload.turn).toBe(177);
        expect(payload.turn).toBe(payload.loop_index + 1);
        expect(payload.operation.corps_id).toBe('hvo_tomislavgrad');
        expect(payload.operation.name).toBe('Operation Mistral 2');
        expect(payload.operation.preparation_sub_phase).toBe('intel_gathering');
        expect(payload.operation.preparation_turns_elapsed).toBe(2);
        expect(payload.operation.preparation_max_turns).toBe(5);
        expect(payload.operation.commander_officer_id).toBeNull();
        expect(payload.operation.is_pre_planned).toBeNull();
        expect(payload.operation.loaned_brigade_count).toBe(0);
        expect(payload.sector_intel_for_sector).toEqual([
            { enemy_sector_id: 'sector:vrs_2nd_krajina:0', confidence: 0 },
        ]);
        expect(payload.brigades).toEqual([
            { id: 'hv_4th_guards_split', location_osid: 'op:livno:livno_2', status: 'active' },
        ]);
    });

    it('filters preparation events to Operation Mistral 2 only', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        emitMistralPrepTraceLine(buildState(177), buildReport(), 176);
        const payload = parseLine(out.lines()[0]!);
        expect(payload.preparation_events).toHaveLength(1);
        expect(payload.preparation_events[0].operation_name).toBe('Operation Mistral 2');
        expect(payload.preparation_events[0].sub_phase).toBe('intel_gathering');
        expect(JSON.stringify(payload)).not.toContain('Some Other Operation');
    });

    it('is byte-stable: identical inputs produce identical output bytes', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        emitMistralPrepTraceLine(buildState(178), buildReport(), 177);
        emitMistralPrepTraceLine(buildState(178), buildReport(), 177);
        const lines = out.lines();
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe(lines[1]);
    });

    it('covers exactly turns 175-181, once each, with loop_index = turn - 1', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        for (let turn = 173; turn <= 183; turn += 1) {
            emitMistralPrepTraceLine(buildState(turn), buildReport(), turn - 1);
        }
        const payloads = out.lines().map(parseLine);
        expect(payloads.map((p) => p.turn)).toEqual([175, 176, 177, 178, 179, 180, 181]);
        for (const p of payloads) expect(p.loop_index).toBe(p.turn - 1);
    });

    it('creation turn 175 fixture: planning with null preparation fields and no events', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        const created = buildOperation({
            preparation_sub_phase: undefined,
            preparation_turns_elapsed: undefined,
            preparation_max_turns: undefined,
            postponement_count: undefined,
        });
        const report = { seed: 'x', phases: [] } as unknown as TurnReport;
        emitMistralPrepTraceLine(buildState(175, created), report, 174);
        const payload = parseLine(out.lines()[0]!);
        expect(payload.loop_index).toBe(174);
        expect(payload.turn).toBe(175);
        expect(payload.operation.name).toBe('Operation Mistral 2');
        expect(payload.operation.phase).toBe('planning');
        expect(payload.operation.started_turn).toBe(175);
        expect(payload.operation.preparation_sub_phase).toBeNull();
        expect(payload.operation.preparation_turns_elapsed).toBeNull();
        expect(payload.preparation_events).toEqual([]);
    });

    it('emits the caller-supplied loop index verbatim so a collector can reject a mismatch', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        emitMistralPrepTraceLine(buildState(177), buildReport(), 177);
        const payload = parseLine(out.lines()[0]!);
        expect(payload.loop_index).toBe(177);
        expect(payload.turn).toBe(177);
        expect(payload.turn).not.toBe(payload.loop_index + 1);
    });

    it('null-operation boundary: Mistral 2 absent in-window emits operation:null without throwing', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        const report = { seed: 'x', phases: [] } as unknown as TurnReport;
        expect(() => emitMistralPrepTraceLine(buildState(178, null), report, 177)).not.toThrow();
        const payload = parseLine(out.lines()[0]!);
        expect(payload.operation).toBeNull();
        expect(payload.sector_intel_for_sector).toEqual([]);
        expect(payload.brigades).toEqual([]);
        expect(payload.preparation_events).toEqual([]);
    });

    it('with two corps carrying Mistral 2, reports the strictCompare-first corps_id', () => {
        process.env[ENV_VAR] = '1';
        const out = captureWrites();
        const state = buildState(177) as unknown as { military: { corps_command: Record<string, unknown> } };
        state.military.corps_command = {
            zzz_corps: { active_operations: [buildOperation({ preparation_turns_elapsed: 4 })] },
            aaa_corps: { active_operations: [buildOperation({ preparation_turns_elapsed: 1 })] },
        };
        emitMistralPrepTraceLine(state as unknown as GameState, buildReport(), 176);
        const payload = parseLine(out.lines()[0]!);
        expect(payload.operation.corps_id).toBe('aaa_corps');
        expect(payload.operation.preparation_turns_elapsed).toBe(1);
    });
});
