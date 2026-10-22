import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { GameState, MilitiaPoolState } from '../src/state/game_state.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import {
    createPoolFlowObserver,
    POOL_FLOW_PREFIX,
    resetPoolFlowSelectorCacheForTests,
} from '../src/sim/combat/pool_flow_diagnostic.js';
import { runNamedPhase } from '../src/sim/turn_pipeline.js';
import { runOngoingMobilization } from '../src/sim/combat/ongoing_mobilization.js';
import { runDisplacedAndCrossEthnicContributions } from '../src/sim/early_war/pool_population.js';
import { applyPoolWarWearinessDecay } from '../src/sim/combat/pool_decay.js';
import { applyFrontlineAttrition } from '../src/sim/combat/frontline_attrition.js';
import { applyMilitiaWiaTrickleback } from '../src/sim/formation_spawn.js';
import { serializeState } from '../src/state/serialize.js';

const require = createRequire(import.meta.url);

function configure(topic?: string, pools?: string): void {
    if (topic === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = topic;
    if (pools === undefined) delete process.env.AWWV_DEBUG_REINFORCEMENT_POOLS;
    else process.env.AWWV_DEBUG_REINFORCEMENT_POOLS = pools;
    resetReasonCodeTopicCacheForTests();
    resetPoolFlowSelectorCacheForTests();
}

function state(turn = 21, pool: Partial<MilitiaPoolState> = {}): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'pool-flow-test' },
        factions: [{ id: 'RS' }],
        military: {
            formations: {},
            militia_pools: {
                'pale:RS': {
                    mun_id: 'pale', faction: 'RS', available: 100, committed: 20,
                    exhausted: 3, wounded_pending: 4, updated_turn: turn, ...pool,
                },
            },
        } as unknown as GameState['military'],
        political: { political_controllers: {}, municipalities: {} } as unknown as GameState['political'],
        displacement: { displacement_state: {} } as unknown as GameState['displacement'],
    } as GameState;
}

function rows(lines: string[]): Array<Record<string, any>> {
    return lines.filter((line) => line.startsWith(`${POOL_FLOW_PREFIX} `))
        .map((line) => JSON.parse(line.slice(POOL_FLOW_PREFIX.length + 1)));
}

describe('bounded Pale pool-flow diagnostic', () => {
    beforeEach(() => configure());
    afterEach(() => { vi.restoreAllMocks(); configure(); });

    it('is silent unless both the topic and exact Pale selector are enabled for turn 21 or 22', () => {
        const variants: Array<[string | undefined, string | undefined, number]> = [
            [undefined, 'pale:RS', 21], ['pool_flow', undefined, 21],
            ['pool_flow', 'other:RS', 21], ['pool_flow', 'pale:RS', 20],
            ['pool_flow', 'pale:RS', 23],
        ];
        for (const [topic, selector, turn] of variants) {
            configure(topic, selector);
            expect(createPoolFlowObserver(state(turn))).toBeUndefined();
        }
    });

    it('records attempted phase rows before output and closes only a completed phase', () => {
        configure('pool_flow', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const actual = state();
        const observer = createPoolFlowObserver(actual)!;
        const boundary = observer.beforePhase(actual, 'test-phase', 7, 'war');
        actual.military.militia_pools!['pale:RS'].available = 111;
        observer.afterPhase(actual, boundary, 'executed', null);
        observer.finish(actual, 'success');

        const observed = rows(output);
        expect(observed.map((row) => row.event)).toEqual(['phase_start', 'phase_end', 'terminal']);
        expect(observed[0]).toMatchObject({ schema_version: 1, sequence: 1, completed_turn: 21, pool_key: 'pale:RS' });
        expect(observed[0].pool.available).toEqual({ presence: 'present_value', value: 100 });
        expect(observed[1]).toMatchObject({ sequence: 2, phase_name: 'test-phase', status: 'executed' });
        expect(observed[1].pool.available).toEqual({ presence: 'present_value', value: 111 });
        expect(observed[2]).toMatchObject({ sequence: 3, status: 'success', attempted_record_count: 3, emitted_record_count: 2, diagnostic_error_count: 0 });
    });

    it('presence-tags missing, undefined, null, and nonfinite pool values without throwing', () => {
        configure('pool_flow', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const actual = state(22, { available: undefined as unknown as number, committed: null as unknown as number, exhausted: Number.NaN });
        const observer = createPoolFlowObserver(actual)!;
        const boundary = observer.beforePhase(actual, 'x', 0, 'war');
        delete actual.military.militia_pools!['pale:RS'];
        observer.afterPhase(actual, boundary, 'skipped', 'fixture');
        observer.finish(actual, 'success');
        const observed = rows(output);
        expect(observed[0].pool).toMatchObject({
            presence: 'present', available: { presence: 'present_undefined' },
            committed: { presence: 'present_null' }, exhausted: { presence: 'present_nonfinite', value: 'NaN' },
        });
        expect(observed[1].pool).toEqual({ presence: 'missing' });
    });

    it('central phase wrapping emits skip boundaries and never emits a false end after a gameplay exception', async () => {
        configure('pool_flow', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const actual = state();
        const report = { seed: 'x', phases: [] } as any;
        const context = { state: actual, report, input: {}, rng: () => 0 } as any;
        const observer = createPoolFlowObserver(actual)!;
        await runNamedPhase(context, { name: 'skipped-phase', skipIf: [() => 'fixture-skip'], run: () => undefined }, 'war', undefined, undefined, observer);
        await expect(runNamedPhase(context, { name: 'throwing-phase', run: () => { throw new Error('gameplay-failure'); } }, 'war', undefined, undefined, observer)).rejects.toThrow('gameplay-failure');
        expect(rows(output).filter((row) => row.phase_name === 'skipped-phase').map((row) => [row.event, row.status ?? null])).toEqual([
            ['phase_start', null], ['phase_end', 'skipped'],
        ]);
        expect(rows(output).filter((row) => row.phase_name === 'throwing-phase').map((row) => row.event)).toEqual(['phase_start']);
    });

    it('records actual direct, shared displaced, decay, and militia-WIA pool writes with reached operands', () => {
        configure('pool_flow', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const settlements = new Map([['op:pale:center', { osid: 'op:pale:center', mun1990_id: 'pale' } as any]]);

        const direct = state();
        direct.political = { municipalities: { pale: { control: 'consolidated' } }, political_controllers: { 'op:pale:center': 'RS' } } as any;
        createPoolFlowObserver(direct);
        runOngoingMobilization(direct, settlements, { pale: { serb: 50_000, bosniak: 0, croat: 0, other: 0 } } as any);

        const shared = state();
        shared.displacement = { displacement_state: { pale: { displaced_in: 10_000, displaced_in_by_faction: { RS: 10_000 } } } } as any;
        createPoolFlowObserver(shared);
        runDisplacedAndCrossEthnicContributions(shared, settlements);

        const decay = state();
        createPoolFlowObserver(decay);
        applyPoolWarWearinessDecay(decay);

        const wia = state(21, { wounded_pending: 10 });
        createPoolFlowObserver(wia);
        applyMilitiaWiaTrickleback(wia, { formations_returned: 0, personnel_returned: 0 });

        const mutations = rows(output).filter((row) => row.event === 'mutation');
        expect(mutations.map((row) => [row.source, row.branch, row.result])).toEqual(expect.arrayContaining([
            ['ongoing_mobilization', 'direct_controller', 'credited'],
            ['pool_population', 'shared_displaced_by_faction', 'credited'],
            ['pool_decay', 'war_weariness', 'debited'],
            ['formation_spawn', 'militia_wia', 'credited'],
        ]));
        for (const row of mutations) {
            expect(row.before.presence).toBe('present');
            expect(row.after.presence).toBe('present');
            expect(Object.values(row.operands).every((value: any) => value.presence === 'present_value')).toBe(true);
        }
    });

    it('reader accepts a complete real-producer two-turn envelope and rejects missing, duplicate, poisoned, or partial rows', async () => {
        configure('pool_flow', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const expectedPhases = [
            { phase_name: 'apply-frontline-attrition', phase_family: 'war' },
            { phase_name: 'ongoing-mobilization', phase_family: 'war' },
            { phase_name: 'pool-war-weariness-decay', phase_family: 'war' },
            { phase_name: 'wia-trickleback', phase_family: 'war' },
        ];
        const settlements = new Map([['op:pale:center', { osid: 'op:pale:center', mun1990_id: 'pale' } as any]]);
        const actual = state(21, { available: 100, wounded_pending: 10 });
        actual.political = { municipalities: { pale: { control: 'consolidated' } }, political_controllers: { 'op:pale:center': 'RS' } } as any;
        actual.displacement = { displacement_state: { pale: { displaced_in: 10_000, displaced_in_by_faction: { RS: 10_000 } } } } as any;
        actual.military.formations = {
            front: {
                id: 'front', faction: 'RS', name: 'Front', kind: 'brigade', status: 'active', assignment: null,
                created_turn: 1, personnel: 2_000, cohesion: 70, morale: 70,
                location_osid: 'op:pale:center', home_osid: 'op:pale:center', origin_mun: 'pale',
            },
        } as any;
        actual.military.corps_front_sectors = {
            front: {
                sector_id: 'front', corps_id: 'vrs_sarajevo_romanija', faction: 'RS', opposing_factions: ['RBiH'],
                territory_osids: ['op:pale:center'], assigned_brigade_ids: ['front'], reserve_brigade_ids: [], rear_brigade_ids: [],
                length_edges: 1, sub_segments: [{ sub_segment_id: 'front:0', friendly_osids: ['op:pale:center'], enemy_osids: ['op:trnovo:center'], edge_ids: [], primary_brigade_ids: ['front'], length_edges: 1 }],
            },
        } as any;
        for (const turn of [21, 22]) {
            actual.meta.turn = turn;
            const observer = createPoolFlowObserver(actual, expectedPhases)!;
            const context = { state: actual, report: { seed: 'x', phases: [] }, input: {}, rng: () => 0 } as any;
            await runNamedPhase(context, { name: 'apply-frontline-attrition', run: () => { applyFrontlineAttrition(actual); } }, 'war', undefined, undefined, observer);
            await runNamedPhase(context, { name: 'ongoing-mobilization', run: () => { runOngoingMobilization(actual, settlements, { pale: { serb: 50_000, bosniak: 0, croat: 0, other: 0 } } as any); } }, 'war', undefined, undefined, observer);
            await runNamedPhase(context, { name: 'pool-war-weariness-decay', run: () => { applyPoolWarWearinessDecay(actual); } }, 'war', undefined, undefined, observer);
            await runNamedPhase(context, { name: 'wia-trickleback', run: () => applyMilitiaWiaTrickleback(actual, { formations_returned: 0, personnel_returned: 0 }) }, 'war', undefined, undefined, observer);
            observer.finish(actual, 'success');
        }
        const stream = `${output.join('\n')}\n`;
        const reader = require('../tools/diagnostics/pool_flow_reader.cjs');
        expect(reader.validatePoolFlowStream(stream)).toMatchObject({
            schema_version: 1, turns: [21, 22], terminal_count: 2, mutation_count: 7,
            uninstrumented_phase_delta_count: 2,
            uninstrumented_phase_deltas: [
                expect.objectContaining({ completed_turn: 21, phase_name: 'apply-frontline-attrition', phase_family: 'war', phase_index: 0 }),
                expect.objectContaining({ completed_turn: 22, phase_name: 'apply-frontline-attrition', phase_family: 'war', phase_index: 0 }),
            ],
        });
        const variants = [
            output.slice(1),
            output.slice(0, -1),
            [...output, output[0]],
            output.map((line, index) => index === 1 ? line.replace('"value":2', '"value":999') : line),
        ];
        for (const lines of variants) expect(() => reader.validatePoolFlowStream(`${lines.join('\n')}\n`)).toThrow();
        const parseOutput = () => output.map((line) => JSON.parse(line.slice(POOL_FLOW_PREFIX.length + 1)) as Record<string, any>);
        const resequence = (records: Array<Record<string, any>>) => {
            for (const turn of [21, 22]) {
                const group = records.filter((row) => row.completed_turn === turn);
                group.forEach((row, index) => { row.sequence = index + 1; });
                const terminal = group.at(-1)!;
                terminal.attempted_record_count = group.length;
                terminal.emitted_record_count = group.length - 1;
            }
            return records.map((row) => `${POOL_FLOW_PREFIX} ${JSON.stringify(row)}`).join('\n') + '\n';
        };
        const missingWholePhase = parseOutput().filter((row) => !(row.completed_turn === 22 && row.phase_name === 'wia-trickleback'));
        const missingTerminal = missingWholePhase.find((row) => row.completed_turn === 22 && row.event === 'terminal')!;
        missingTerminal.observed_phase_manifest = missingTerminal.observed_phase_manifest.filter((phase: any) => phase.phase_name !== 'wia-trickleback');
        expect(() => reader.validatePoolFlowStream(resequence(missingWholePhase))).toThrow(/phase manifest/i);

        const poisonCases: Array<[string, (row: Record<string, any>) => void]> = [
            ['direct raw', (row) => { row.operands.raw.value += 1; }],
            ['direct composition', (row) => { row.operands.credit.value += 1; }],
            ['shared formula', (row) => { row.operands.displaced_in.value += 100; }],
            ['decay formula', (row) => { row.operands.rate.value += 0.01; }],
            ['wia conservation', (row) => { row.operands.wounded_pending_after.value += 1; }],
            ['before binding', (row) => { row.operands.available_before.value += 1; }],
        ];
        for (const [name, poison] of poisonCases) {
            const records = parseOutput();
            const row = name.startsWith('direct') ? records.find((item) => item.writer_group === 'direct' && item.event === 'mutation')!
                : name.startsWith('shared') ? records.find((item) => item.writer_group === 'shared' && item.event === 'mutation')!
                    : name.startsWith('decay') ? records.find((item) => item.writer_group === 'decay' && item.event === 'mutation')!
                        : name.startsWith('wia') ? records.find((item) => item.writer_group === 'wia' && item.event === 'mutation')!
                            : records.find((item) => item.event === 'mutation')!;
            poison(row);
            expect(() => reader.validatePoolFlowStream(resequence(records)), name).toThrow();
        }
        const poisonedSkip = parseOutput();
        const qualification = poisonedSkip.find((row) => row.completed_turn === 22 && row.event === 'writer_qualification' && row.writer_group === 'wia')!;
        qualification.result = 'skipped';
        qualification.skip_reason = 'invented-skip';
        expect(() => reader.validatePoolFlowStream(resequence(poisonedSkip))).toThrow(/skip semantics/i);
        const discontinuous = output.map((line) => {
            const row = line.startsWith(`${POOL_FLOW_PREFIX} `) ? JSON.parse(line.slice(POOL_FLOW_PREFIX.length + 1)) : null;
            if (row?.completed_turn === 22) {
                for (const pool of [row.pool, row.before, row.after]) {
                    if (pool?.presence === 'present') pool.available.value += 1;
                }
                for (const name of ['available_before', 'available_after']) {
                    if (row.operands?.[name]?.presence === 'present_value') row.operands[name].value += 1;
                }
            }
            return row ? `${POOL_FLOW_PREFIX} ${JSON.stringify(row)}` : line;
        });
        expect(() => reader.validatePoolFlowStream(`${discontinuous.join('\n')}\n`)).toThrow(/continuity/i);
        const crossPhaseGap = parseOutput();
        const nextPhaseStart = crossPhaseGap.find((row) => row.completed_turn === 21 && row.event === 'phase_start' && row.phase_name === 'ongoing-mobilization')!;
        nextPhaseStart.pool.exhausted.value += 1;
        expect(() => reader.validatePoolFlowStream(resequence(crossPhaseGap))).toThrow(/continuity/i);
        expect(() => reader.validatePoolFlowStream(`${stream}[pool_fl\n`)).toThrow(/partial/i);
    });

    it('reader CLI is require-safe, writes fresh output, and refuses overwrite', () => {
        const script = resolve('tools/diagnostics/pool_flow_reader.cjs');
        expect(() => require(script)).not.toThrow();
        const root = mkdtempSync(join(tmpdir(), 'awwv-pool-flow-reader-'));
        const input = join(root, 'input.log');
        const output = join(root, 'result.json');
        writeFileSync(input, 'unrelated\n');
        try {
            const invalid = spawnSync(process.execPath, [script, '--input', input, '--output', output], { encoding: 'utf8' });
            expect(invalid.status).toBe(2);
            expect(existsSync(output)).toBe(false);
            writeFileSync(output, '{}\n');
            const overwrite = spawnSync(process.execPath, [script, '--input', input, '--output', output], { encoding: 'utf8' });
            expect(overwrite.status).toBe(2);
            expect(readFileSync(output, 'utf8')).toBe('{}\n');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('keeps OFF and ON state, report, and serialization exact and contains output failures', () => {
        const off = state();
        configure();
        const offReport = applyPoolWarWearinessDecay(off);
        const offBytes = serializeState(off);

        const on = state();
        configure('pool_flow', 'pale:RS');
        const observer = createPoolFlowObserver(on)!;
        vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('closed stdout'); });
        const onReport = applyPoolWarWearinessDecay(on);
        expect(() => observer.finish(on, 'success')).not.toThrow();
        expect(onReport).toEqual(offReport);
        expect(serializeState(on)).toBe(offBytes);
    });

    it('does not touch pool state on the default-OFF observer guard', () => {
        configure();
        const actual = state();
        Object.defineProperty(actual.military, 'militia_pools', {
            configurable: true,
            get() { throw new Error('pool access before original guard'); },
        });
        expect(() => createPoolFlowObserver(actual)).not.toThrow();
        expect(createPoolFlowObserver(actual)).toBeUndefined();
    });

    it('builds the production phase manifest only after the complete observer gate passes', () => {
        let builds = 0;
        const build = () => { builds += 1; return [{ phase_name: 'x', phase_family: 'war' }]; };
        configure();
        expect(createPoolFlowObserver(state(), build)).toBeUndefined();
        expect(builds).toBe(0);
        configure('pool_flow', 'other:RS');
        expect(createPoolFlowObserver(state(), build)).toBeUndefined();
        expect(builds).toBe(0);
        configure('pool_flow', 'pale:RS');
        expect(createPoolFlowObserver(state(), build)).toBeDefined();
        expect(builds).toBe(1);
    });

    it('contains a throwing expected-phase callback and leaves the stream fail-closed', async () => {
        configure('pool_flow', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const actual = state(21);
        Object.defineProperty(actual.meta, 'recruitment_mode', {
            configurable: true,
            get() { throw new Error('recruitment_mode getter'); },
        });
        const report = { seed: 'x', phases: [] } as any;
        const context = { state: actual, report, input: {}, rng: () => 0 } as any;
        const build = () => actual.meta.recruitment_mode === 'bottom_up'
            ? [{ phase_name: 'pool-population', phase_family: 'early-war' }]
            : [];

        let observer: ReturnType<typeof createPoolFlowObserver>;
        expect(() => { observer = createPoolFlowObserver(actual, build); }).not.toThrow();
        expect(observer!).toBeDefined();
        const phase = { name: 'pool-war-weariness-decay', run: () => { applyPoolWarWearinessDecay(actual); } };
        await expect(runNamedPhase(context, phase, 'war', undefined, undefined, observer!)).resolves.toBeUndefined();
        observer!.finish(actual, 'success');

        expect(actual.military.militia_pools!['pale:RS'].available).toBe(98);
        expect(report.phases).toEqual([{ name: 'pool-war-weariness-decay' }]);
        expect(rows(output).filter((row) => row.event === 'mutation')).toHaveLength(1);
        const terminal = rows(output).at(-1);
        expect(terminal).toMatchObject({ event: 'terminal', expected_phase_manifest: null, diagnostic_error_count: 1 });
        const reader = require('../tools/diagnostics/pool_flow_reader.cjs');
        expect(() => reader.validatePoolFlowStream(`${output.join('\n')}\n`)).toThrow();
    });

    it('attributes only the selected Pale mutation in real two-pool decay regardless of insertion order', () => {
        for (const reverse of [false, true]) {
            configure('pool_flow', 'pale:RS');
            const output: string[] = [];
            vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
            const actual = state();
            const entries: Array<[string, MilitiaPoolState]> = [
                ['aaa:RS', { mun_id: 'aaa', faction: 'RS', available: 200, committed: 0, exhausted: 0, updated_turn: 20 }],
                ['pale:RS', actual.military.militia_pools!['pale:RS']],
            ];
            if (reverse) entries.reverse();
            actual.military.militia_pools = Object.fromEntries(entries);
            const observer = createPoolFlowObserver(actual, [{ phase_name: 'pool-war-weariness-decay', phase_family: 'war' }])!;
            const boundary = observer.beforePhase(actual, 'pool-war-weariness-decay', 0, 'war');
            applyPoolWarWearinessDecay(actual);
            observer.afterPhase(actual, boundary, 'executed', null);
            observer.finish(actual, 'success');
            const mutations = rows(output).filter((row) => row.event === 'mutation');
            expect(mutations).toHaveLength(1);
            expect(mutations[0]).toMatchObject({ source: 'pool_decay', branch: 'war_weariness', result: 'debited' });
            vi.restoreAllMocks();
        }
    });

    it('contains ON-only accessor failures so gameplay keeps the original mutation and exception order', async () => {
        const run = async (enabled: boolean) => {
            configure(enabled ? 'pool_flow' : undefined, enabled ? 'pale:RS' : undefined);
            const actual = state();
            const aaa: MilitiaPoolState = { mun_id: 'aaa', faction: 'RS', available: 100, committed: 0, exhausted: 0, updated_turn: 20 };
            const pale = actual.military.militia_pools!['pale:RS'];
            Object.defineProperty(pale, 'available', { configurable: true, get() { throw new Error('pale available getter'); } });
            actual.military.militia_pools = { 'aaa:RS': aaa, 'pale:RS': pale };
            const report = { seed: 'x', phases: [] } as any;
            vi.spyOn(console, 'log').mockImplementation(() => undefined);
            const context = { state: actual, report, input: {}, rng: () => 0 } as any;
            const observer = createPoolFlowObserver(actual, [{ phase_name: 'pool-war-weariness-decay', phase_family: 'war' }]);
            let error = '';
            try {
                await runNamedPhase(context, { name: 'pool-war-weariness-decay', run: () => { applyPoolWarWearinessDecay(actual); } }, 'war', undefined, undefined, observer);
            } catch (caught) { error = (caught as Error).message; }
            return { aaa: aaa.available, phases: report.phases.length, error };
        };
        expect(await run(false)).toEqual({ aaa: 98, phases: 1, error: 'pale available getter' });
        expect(await run(true)).toEqual({ aaa: 98, phases: 1, error: 'pale available getter' });
    });
});
