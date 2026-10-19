/**
 * ONE selected startup case of the runScenario scenario-read receipt wiring (default OFF).
 *
 * This file is NOT a self-contained suite. It is launched by tools/test/run_scenario_read_wiring.ps1,
 * once per case, each in its own contained process, with a private selector:
 *   AWWV_READ_WIRING_CASE         off | on | failing   (missing/unknown FAILS; it never skips)
 *   AWWV_READ_WIRING_OUT_BASE     the task-owned outDirBase string shared by all cases
 *   AWWV_READ_WIRING_RESULT_FILE  where this case writes its result for the parent's cross-case comparison
 * Each invocation executes exactly ONE real `runScenario` with initialStateOnly: true and ZERO
 * simulation turns (runTurn and runOneTurn are tripwires that throw if called). Direct event evidence
 * comes from pass-through wrappers around the REAL loader, stamp and context functions; file-existence
 * observations at emission are supplementary only.
 *
 * What it proves: gate sampled once, correct context handed to the one real load, emission after the
 * stamp and before the metadata write, OFF creates no context and emits nothing, a failing observer
 * leaves startup unchanged and yields INVALID with no `match`. The parent compares metadata text,
 * initial-save bytes and the state hash across the three processes with no excluded field.
 * What it does NOT prove: any other loader, actual-used 31, physical-file identity, or simulation.
 */
import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import {
    SCENARIO_READ_RECEIPT_ENV_VAR,
    SCENARIO_READ_RECEIPT_LINE_PREFIX,
    checkpointsForScenario,
    pickHistoricalReferenceKey,
    runScenario,
    usesPaintedControlReference,
} from '../src/scenario/scenario_runner.js';
import {
    HEADLESS_FIXED_CONSUMED_INPUTS,
    deriveScenarioConsumedInputs,
    toRepoRelativePath,
} from '../src/scenario/run_provenance.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { strictCompare } from '../src/state/validateGameState.js';

const wiring = vi.hoisted(() => ({
    events: [] as string[],
    caseName: process.env.AWWV_READ_WIRING_CASE ?? '',
    gateVar: 'AWWV_SCENARIO_READ_RECEIPT',
    // Armed by the test body; called with the decoded text of every fd-1 writeSync chunk.
    onStdoutWrite: undefined as ((text: string) => void) | undefined,
}));

// The receipt line is written with a synchronous fd-1 fs.writeSync. This wrapper observes it and
// ALWAYS passes through to the real function (same arguments, same return value or throw).
vi.mock('node:fs', async (importOriginal) => {
    const real = await importOriginal<typeof import('node:fs')>();
    const wrapped = ((fd: number, buffer: unknown, offset?: number, length?: number) => {
        if (fd === 1 && wiring.onStdoutWrite !== undefined && Buffer.isBuffer(buffer)) {
            const start = offset ?? 0;
            wiring.onStdoutWrite(buffer.toString('utf8', start, start + (length ?? buffer.length - start)));
        }
        return (real.writeSync as unknown as (...a: unknown[]) => number)(fd, buffer, offset, length);
    }) as unknown as typeof real.writeSync;
    return { ...real, writeSync: wrapped };
});

vi.mock('../src/sim/turn_pipeline.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/sim/turn_pipeline.js')>();
    return {
        ...real,
        runTurn: () => {
            wiring.events.push('TRIPWIRE:runTurn');
            throw new Error('TRIPWIRE: runTurn was called in an initialStateOnly run');
        },
    };
});

vi.mock('../src/state/turn_pipeline.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/state/turn_pipeline.js')>();
    return {
        ...real,
        runOneTurn: () => {
            wiring.events.push('TRIPWIRE:runOneTurn');
            throw new Error('TRIPWIRE: runOneTurn was called in an initialStateOnly run');
        },
    };
});

vi.mock('../src/scenario/scenario_loader.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/scenario/scenario_loader.js')>();
    return {
        ...real,
        loadScenario: async (...args: Parameters<typeof real.loadScenario>) => {
            wiring.events.push('load:start');
            const scenario = await real.loadScenario(...args);
            wiring.events.push('load:end');
            // Flip the environment AFTER the load: a runner that re-sampled the gate later would
            // change behavior (OFF would start emitting; ON/failing would stop).
            process.env[wiring.gateVar] = wiring.caseName === 'off' ? '1' : '0';
            return scenario;
        },
    };
});

vi.mock('../src/scenario/run_provenance.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/scenario/run_provenance.js')>();
    return {
        ...real,
        buildRunProvenance: async (...args: Parameters<typeof real.buildRunProvenance>) => {
            wiring.events.push('stamp:start');
            const provenance = await real.buildRunProvenance(...args);
            wiring.events.push('stamp:end');
            return provenance;
        },
    };
});

vi.mock('../src/scenario/scenario_read_context.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/scenario/scenario_read_context.js')>();
    return {
        ...real,
        createScenarioReadContext: () => {
            wiring.events.push('context:create');
            const context = real.createScenarioReadContext();
            return {
                ...context,
                onRead(observation: Parameters<typeof context.onRead>[0]) {
                    wiring.events.push('observer:read');
                    if (wiring.caseName === 'failing') throw new Error('injected observer failure');
                    return context.onRead(observation);
                },
                onNormalized(token: unknown) {
                    wiring.events.push('observer:normalized');
                    context.onNormalized?.(token);
                },
                onParseFailed(token: unknown, errorName: string) {
                    wiring.events.push('observer:parse_failed');
                    context.onParseFailed?.(token, errorName);
                },
                onObserverError(error: unknown) {
                    wiring.events.push('observer:error');
                    context.onObserverError?.(error);
                },
                compareToStamp(args: Parameters<typeof context.compareToStamp>[0]) {
                    wiring.events.push('compare');
                    return context.compareToStamp(args);
                },
            };
        },
        renderScenarioReadComparison: (comparison: Parameters<typeof real.renderScenarioReadComparison>[0]) => {
            wiring.events.push('render');
            return real.renderScenarioReadComparison(comparison);
        },
    };
});

vi.mock('node:fs/promises', async (importOriginal) => {
    const real = await importOriginal<typeof import('node:fs/promises')>();
    const wrapped = ((path: Parameters<typeof real.writeFile>[0], data: Parameters<typeof real.writeFile>[1], options?: Parameters<typeof real.writeFile>[2]) => {
        if (typeof path === 'string' && path.replace(/\\/g, '/').endsWith('/run_meta.json')) wiring.events.push('meta:write');
        return real.writeFile(path, data, options);
    }) as unknown as typeof real.writeFile;
    return { ...real, writeFile: wrapped };
});

const EXPECTED_EVENTS: Record<string, readonly string[]> = {
    off: ['load:start', 'load:end', 'stamp:start', 'stamp:end', 'meta:write'],
    on: [
        'context:create', 'load:start', 'observer:read', 'observer:normalized', 'load:end',
        'stamp:start', 'stamp:end', 'compare', 'render', 'emit', 'meta:write',
    ],
    failing: [
        'context:create', 'load:start', 'observer:read', 'observer:error', 'observer:normalized', 'load:end',
        'stamp:start', 'stamp:end', 'compare', 'render', 'emit', 'meta:write',
    ],
};

// Narrow classifier: a gate read is "node spawn env serialization" only when the stack DIRECTLY
// contains Node's normalizeSpawnArguments frame in node:child_process. Anything else (including
// frames merely mentioning child_process or a known file) stays "runner_or_unrecognized".
const NODE_SPAWN_ENV_SERIALIZATION = 'node_spawn_env_serialization';
const NODE_SPAWN_FRAME = /\bat normalizeSpawnArguments \(node:child_process:\d+:\d+\)/;
function classifyGateReadStack(stackLines: readonly string[]): string {
    return stackLines.some((line) => NODE_SPAWN_FRAME.test(line)) ? NODE_SPAWN_ENV_SERIALIZATION : 'runner_or_unrecognized';
}

const SCENARIO_REL ='data/scenarios/apr1992_definitive_188w.json';

describe('scenario-read receipt wiring: one real initialStateOnly startup per process', () => {
    it('runs the selected case', async () => {
        const caseName = process.env.AWWV_READ_WIRING_CASE;
        const outBase = process.env.AWWV_READ_WIRING_OUT_BASE;
        const resultFile = process.env.AWWV_READ_WIRING_RESULT_FILE;
        expect(caseName, 'AWWV_READ_WIRING_CASE must be exactly off, on or failing').toMatch(/^(off|on|failing)$/);
        expect(outBase, 'AWWV_READ_WIRING_OUT_BASE is required').toBeTruthy();
        expect(resultFile, 'AWWV_READ_WIRING_RESULT_FILE is required').toBeTruthy();
        if (caseName === undefined || outBase === undefined || resultFile === undefined) return;

        // Hard prerequisites: absence/unreadability FAILS, never skips.
        expect(checkDataPrereqs({ baseDir: process.cwd() }).ok).toBe(true);
        const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_188w.json');
        expect(readFileSync(scenarioPath, 'utf8').length).toBeGreaterThan(0);

        // Expected values from the REAL (unwrapped) loader; recorded events are reset afterwards.
        const actualLoader = await vi.importActual<typeof import('../src/scenario/scenario_loader.js')>('../src/scenario/scenario_loader.js');
        const declared = await actualLoader.loadScenario(scenarioPath);
        const effective = { ...declared, weeks: 40 };
        const expectedRunId = actualLoader.computeRunId(effective);
        const expectedOutDir = join(outBase, expectedRunId);
        wiring.events.length = 0;

        const emitted: string[] = [];
        const emitObservations: Array<{ dir_exists: boolean; run_meta_exists: boolean; initial_save_exists: boolean }> = [];
        wiring.onStdoutWrite = (chunk: string) => {
            if (chunk.startsWith(SCENARIO_READ_RECEIPT_LINE_PREFIX)) {
                wiring.events.push('emit');
                emitted.push(chunk);
                emitObservations.push({
                    dir_exists: existsSync(expectedOutDir),
                    run_meta_exists: existsSync(join(expectedOutDir, 'run_meta.json')),
                    initial_save_exists: existsSync(join(expectedOutDir, 'initial_save.json')),
                });
            }
        };

        const savedEnv = process.env;
        if (caseName === 'off') delete savedEnv[SCENARIO_READ_RECEIPT_ENV_VAR];
        else savedEnv[SCENARIO_READ_RECEIPT_ENV_VAR] = '1';
        // EVERY raw read of the gate property is recorded with its stack and the event count at read
        // time. Only a read whose stack DIRECTLY shows Node's spawn-environment serialization
        // (normalizeSpawnArguments in node:child_process, observed for the two read-only git
        // subprocess calls in run_provenance) is classified separately; every other read, including
        // unrecognized callers, counts against the single runner sample.
        const gateReadLog: Array<{ ordinal: number; classification: string; events_at_read: number; stack: string[] }> = [];
        process.env = new Proxy(savedEnv, {
            get(target, property) {
                if (property === SCENARIO_READ_RECEIPT_ENV_VAR) {
                    const priorLimit = Error.stackTraceLimit;
                    Error.stackTraceLimit = 30;
                    const stackLines = (new Error().stack ?? '').split('\n').slice(1);
                    Error.stackTraceLimit = priorLimit;
                    gateReadLog.push({
                        ordinal: gateReadLog.length + 1,
                        classification: classifyGateReadStack(stackLines),
                        events_at_read: wiring.events.length,
                        stack: stackLines.slice(0, 12).map((line) => line.trim()),
                    });
                }
                return Reflect.get(target, property);
            },
            // Pass-through with the REAL process.env as receiver. Without this trap an assignment to an
            // EXISTING key (the post-load gate flip in the ON/failing cases) reaches Node's process.env
            // as a partial-descriptor define, which it rejects with a TypeError. Creating a key (OFF)
            // happens to work either way; deletes and unrelated keys are unaffected.
            set(target, property, value) {
                return Reflect.set(target, property, value, target);
            },
        });
        let runResult: Awaited<ReturnType<typeof runScenario>> | undefined;
        try {
            runResult = await runScenario({
                scenarioPath,
                outDirBase: outBase,
                weeksOverride: 40,
                initialStateOnly: true,
                uniqueRunFolder: false,
                consoleDiagnostics: false,
                emitTimingJson: false,
            });
        } finally {
            process.env = savedEnv;
            wiring.onStdoutWrite = undefined;
        }
        if (runResult === undefined) throw new Error('runScenario returned no result');
        const result = runResult;

        // Direct event evidence (primary).
        expect(wiring.events).toEqual(EXPECTED_EVENTS[caseName]);
        expect(wiring.events.filter((event) => event.startsWith('TRIPWIRE'))).toEqual([]);
        const runnerSamples = gateReadLog.filter((read) => read.classification === 'runner_or_unrecognized');
        expect(
            runnerSamples,
            `exactly one non-spawn-serialization gate read (the runner sample); raw reads: ${JSON.stringify(gateReadLog)}`,
        ).toHaveLength(1);
        // That single sample precedes every recorded wiring event (context:create / load:start ...).
        expect(runnerSamples[0]?.events_at_read, 'the runner samples the gate before any load/context event').toBe(0);
        // Serialization reads (if any) are only the directly identified Node mechanism.
        expect(gateReadLog.filter((read) => read.classification === NODE_SPAWN_ENV_SERIALIZATION).length)
            .toBe(gateReadLog.length - 1);
        expect(emitted).toHaveLength(caseName === 'off' ? 0 : 1);

        // Output location: explicit match between outDirBase and the produced nested outDir.
        expect(result.run_id).toBe(expectedRunId);
        expect(resolve(result.outDir)).toBe(resolve(join(outBase, result.run_id)));
        expect(resolve(result.outDir).startsWith(resolve(outBase) + sep)).toBe(true);
        expect(result.final_state_hash).toMatch(/^[0-9a-f]{16}$/);

        // Stamp rows: every row hashed; selected path set derived from the existing selectors.
        const meta = JSON.parse(readFileSync(join(result.outDir, 'run_meta.json'), 'utf8')) as {
            out_dir?: string;
            provenance?: { consumed_inputs?: { files?: Array<{ path: string; sha256: string | null }> } };
        };
        expect(meta.out_dir).toBe(`${outBase}/${result.run_id}`);
        const rows = meta.provenance?.consumed_inputs?.files ?? [];
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) expect(row.sha256, row.path).toMatch(/^[0-9a-f]{64}$/);
        const paintedKeys = Array.from(new Set([
            ...checkpointsForScenario(effective).map((checkpoint) => checkpoint.key),
            ...(usesPaintedControlReference(effective) ? [pickHistoricalReferenceKey(effective)] : []),
        ])).sort(strictCompare);
        const derived = deriveScenarioConsumedInputs({
            baseDir: process.cwd(),
            scenarioPath,
            initControl: declared.init_control,
            initFormations: declared.init_formations,
            warTimeline: declared.war_timeline,
            initOfficers: declared.init_officers,
            paintedReferenceKeys: paintedKeys,
        });
        const expectedPaths = Array.from(new Set([...HEADLESS_FIXED_CONSUMED_INPUTS, ...derived])).sort(strictCompare);
        const selectedPaths = rows.map((row) => row.path);
        expect(selectedPaths).toEqual(expectedPaths);
        expect(selectedPaths).toContain('data/source/calibration/painted_control_jan1993.json');
        expect(selectedPaths).not.toContain('data/source/calibration/painted_control_oct1995.json');
        expect(selectedPaths).toContain(SCENARIO_REL);

        // Emission content and (supplementary) file-existence observations.
        if (caseName !== 'off') {
            const payload = JSON.parse(emitted[0]?.slice(SCENARIO_READ_RECEIPT_LINE_PREFIX.length) ?? '{}') as {
                proof_status?: string;
                overall?: string;
                association?: { declared_row_path?: string };
                per_read?: Array<{ status?: string }>;
            };
            expect(payload.association?.declared_row_path).toBe(toRepoRelativePath(process.cwd(), scenarioPath));
            expect(payload.association?.declared_row_path).toBe(SCENARIO_REL);
            expect(emitObservations).toEqual([{ dir_exists: true, run_meta_exists: false, initial_save_exists: false }]);
            if (caseName === 'on') {
                expect(payload.proof_status).toBe('VALID');
                expect(payload.overall).toBe('match');
                expect(payload.per_read?.map((read) => read.status)).toEqual(['match']);
            } else {
                expect(payload.proof_status).toBe('INVALID');
                expect(payload.overall).toBe('invalid');
                expect(payload.per_read?.map((read) => read.status)).not.toContain('match');
                expect(emitted[0]).not.toContain('"status":"match"');
                expect(emitted[0]).not.toContain('"overall":"match"');
            }
        }

        writeFileSync(resultFile, JSON.stringify({
            case: caseName,
            outDir: result.outDir,
            run_id: result.run_id,
            final_state_hash: result.final_state_hash,
            selected_path_count: selectedPaths.length,
            selected_paths: selectedPaths,
            events: wiring.events,
            emitted_line_count: emitted.length,
            gate_reads: gateReadLog.length,
            gate_runner_samples: runnerSamples.length,
            gate_spawn_serialization_reads: gateReadLog.length - runnerSamples.length,
            gate_read_log: gateReadLog,
            emit_observations: emitObservations,
        }, null, 2), 'utf8');
    }, 140_000);
});
