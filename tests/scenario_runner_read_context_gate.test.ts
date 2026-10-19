/**
 * Cheap gate / error-path tests for the runScenario scenario-read receipt wiring (default OFF).
 *
 * NO real startup runs here. `loadScenario` is wrapped (real implementation underneath, calls
 * recorded) and, in "stop" mode, made to reject immediately, so runScenario ends at the load call
 * before any provenance, state build or turn. That is enough to prove the gate values, the
 * once-only gate sampling, fresh per-invocation contexts, contained factory failure and original
 * error propagation. The post-stamp emission helper is exercised directly with controlled inputs.
 *
 * The diagnostic line is written with a SYNCHRONOUS fd-1 write (fs.writeSync) so every output
 * failure is a caught error or a short/zero byte count, never an asynchronous sink error. `node:fs`
 * `writeSync` is wrapped here: when armed it captures, short-writes, partially writes or fails fd-1
 * writes; otherwise (and for every other fd) it passes straight through to the real function.
 *
 * What this does NOT prove: the post-stamp ordering and artifact neutrality (those belong to the
 * separately contained startup cases), any other loader, or actual-used 31.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

import {
    SCENARIO_READ_RECEIPT_ENV_VAR,
    SCENARIO_READ_RECEIPT_LINE_PREFIX,
    emitScenarioReadReceiptDiagnostic,
    isScenarioReadReceiptEnabled,
    runScenario,
} from '../src/scenario/scenario_runner.js';
import { loadScenario } from '../src/scenario/scenario_loader.js';
import { normalizeForHash } from '../src/scenario/run_provenance.js';
import { createScenarioReadContext } from '../src/scenario/scenario_read_context.js';
import type { ScenarioReadContext } from '../src/scenario/scenario_read_context.js';

type SinkMode = 'capture' | 'throw' | 'partial_then_throw' | 'short_then_ok' | 'zero';

const gate = vi.hoisted(() => ({
    loaderCalls: [] as unknown[][],
    loaderMode: 'stop' as 'stop' | 'real',
    contextCreations: 0,
    factoryThrows: false,
    renderThrows: false,
    sink: {
        armed: false,
        mode: 'capture' as SinkMode,
        written: '' as string,
        calls: [] as number[],
    },
}));
const STOP_MESSAGE = 'CONTROLLED LOAD STOP';

vi.mock('../src/scenario/scenario_loader.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/scenario/scenario_loader.js')>();
    return {
        ...real,
        loadScenario: (...args: Parameters<typeof real.loadScenario>) => {
            gate.loaderCalls.push([...args]);
            if (gate.loaderMode === 'stop') return Promise.reject(new Error(STOP_MESSAGE));
            return real.loadScenario(...args);
        },
    };
});

vi.mock('../src/scenario/scenario_read_context.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/scenario/scenario_read_context.js')>();
    return {
        ...real,
        createScenarioReadContext: () => {
            gate.contextCreations += 1;
            if (gate.factoryThrows) throw new Error('factory boom');
            return real.createScenarioReadContext();
        },
        renderScenarioReadComparison: (comparison: Parameters<typeof real.renderScenarioReadComparison>[0]) => {
            if (gate.renderThrows) throw new Error('render boom');
            return real.renderScenarioReadComparison(comparison);
        },
    };
});

vi.mock('node:fs', async (importOriginal) => {
    const real = await importOriginal<typeof import('node:fs')>();
    const wrapped = ((fd: number, buffer: Buffer, offset?: number, length?: number) => {
        if (!gate.sink.armed || fd !== 1 || !Buffer.isBuffer(buffer)) {
            return real.writeSync(fd, buffer, offset, length);
        }
        const start = offset ?? 0;
        const end = start + (length ?? buffer.length - start);
        const text = buffer.toString('utf8', start, end);
        gate.sink.calls.push(end - start);
        const mode = gate.sink.mode;
        if (mode === 'throw') {
            throw Object.assign(new Error('EPIPE: broken pipe, write'), { code: 'EPIPE' });
        }
        if (mode === 'zero') return 0;
        if (mode === 'partial_then_throw') {
            if (gate.sink.calls.length >= 2) {
                throw Object.assign(new Error('EPIPE: broken pipe, write'), { code: 'EPIPE' });
            }
            const partial = Math.min(5, end - start);
            gate.sink.written += text.slice(0, partial);
            return partial;
        }
        if (mode === 'short_then_ok') {
            const chunk = Math.min(7, end - start);
            gate.sink.written += text.slice(0, chunk);
            return chunk;
        }
        gate.sink.written += text;
        return end - start;
    }) as unknown as typeof real.writeSync;
    return { ...real, writeSync: wrapped };
});

const TEMP_PREFIX = 'awwv-read-gate-';
const roots: string[] = [];

function makeRoot(files: Record<string, string> = {}): string {
    const root = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
    roots.push(root);
    for (const [relativePath, content] of Object.entries(files)) {
        const abs = join(root, relativePath);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, 'utf8');
    }
    return root;
}

afterAll(() => {
    for (const root of roots) {
        const resolved = resolve(root);
        if (dirname(resolved) === resolve(tmpdir()) && basename(resolved).startsWith(TEMP_PREFIX)) {
            rmSync(resolved, { recursive: true, force: true });
        }
    }
});

const savedGate = process.env[SCENARIO_READ_RECEIPT_ENV_VAR];

beforeEach(() => {
    gate.loaderCalls.length = 0;
    gate.loaderMode = 'stop';
    gate.contextCreations = 0;
    gate.factoryThrows = false;
    gate.renderThrows = false;
    gate.sink.armed = false;
    gate.sink.mode = 'capture';
    gate.sink.written = '';
    gate.sink.calls.length = 0;
});

afterEach(() => {
    gate.sink.armed = false;
    if (savedGate === undefined) delete process.env[SCENARIO_READ_RECEIPT_ENV_VAR];
    else process.env[SCENARIO_READ_RECEIPT_ENV_VAR] = savedGate;
});

function setGate(value: string | undefined): void {
    if (value === undefined) delete process.env[SCENARIO_READ_RECEIPT_ENV_VAR];
    else process.env[SCENARIO_READ_RECEIPT_ENV_VAR] = value;
}

function runnerOptions(root: string, scenarioFile = 'missing-scenario.json') {
    return {
        scenarioPath: join(root, scenarioFile),
        outDirBase: join(root, 'out'),
        weeksOverride: 40,
        initialStateOnly: true,
        consoleDiagnostics: false,
    };
}

describe('gate values', () => {
    it('only the literal "1" enables the gate (pure function)', () => {
        expect(isScenarioReadReceiptEnabled({ [SCENARIO_READ_RECEIPT_ENV_VAR]: '1' })).toBe(true);
        for (const value of ['0', 'true', 'TRUE', 'yes', '', ' 1', '1 ', '01', 'on']) {
            expect(isScenarioReadReceiptEnabled({ [SCENARIO_READ_RECEIPT_ENV_VAR]: value }), JSON.stringify(value)).toBe(false);
        }
        expect(isScenarioReadReceiptEnabled({})).toBe(false);
    });

    it('runScenario hands a context to loadScenario only for the literal "1"; every other value keeps the one-argument call', async () => {
        const root = makeRoot();
        for (const value of ['0', 'true', 'TRUE', 'yes', '', ' 1', '01', undefined]) {
            gate.loaderCalls.length = 0;
            gate.contextCreations = 0;
            setGate(value);
            await expect(runScenario(runnerOptions(root))).rejects.toThrow(STOP_MESSAGE);
            expect(gate.loaderCalls, JSON.stringify(value)).toHaveLength(1);
            expect(gate.loaderCalls[0]?.length, JSON.stringify(value)).toBe(1);
            expect(gate.contextCreations, JSON.stringify(value)).toBe(0);
        }
        gate.loaderCalls.length = 0;
        gate.contextCreations = 0;
        setGate('1');
        await expect(runScenario(runnerOptions(root))).rejects.toThrow(STOP_MESSAGE);
        expect(gate.loaderCalls[0]?.length).toBe(2);
        const observer = gate.loaderCalls[0]?.[1] as { onRead?: unknown } | undefined;
        expect(typeof observer?.onRead).toBe('function');
        expect(gate.contextCreations).toBe(1);
    });

    it('each enabled invocation gets its own fresh context', async () => {
        const root = makeRoot();
        setGate('1');
        await expect(runScenario(runnerOptions(root))).rejects.toThrow(STOP_MESSAGE);
        await expect(runScenario(runnerOptions(root))).rejects.toThrow(STOP_MESSAGE);
        expect(gate.contextCreations).toBe(2);
        expect(gate.loaderCalls[0]?.[1]).toBeDefined();
        expect(gate.loaderCalls[1]?.[1]).toBeDefined();
        expect(gate.loaderCalls[0]?.[1]).not.toBe(gate.loaderCalls[1]?.[1]);
    });

    it('the gate variable is read exactly once per invocation (at runScenario entry)', async () => {
        const root = makeRoot();
        setGate('1');
        const realEnv = process.env;
        let gateReads = 0;
        process.env = new Proxy(realEnv, {
            get(target, property) {
                if (property === SCENARIO_READ_RECEIPT_ENV_VAR) gateReads += 1;
                return Reflect.get(target, property);
            },
        });
        try {
            await expect(runScenario(runnerOptions(root))).rejects.toThrow(STOP_MESSAGE);
        } finally {
            process.env = realEnv;
        }
        expect(gateReads).toBe(1);
    });
});

describe('contained failures and original errors', () => {
    it('a context-factory failure is contained: the load still runs with the one-argument call and its error propagates', async () => {
        const root = makeRoot();
        setGate('1');
        gate.factoryThrows = true;
        await expect(runScenario(runnerOptions(root))).rejects.toThrow(STOP_MESSAGE);
        expect(gate.contextCreations).toBe(1);
        expect(gate.loaderCalls[0]?.length).toBe(1);
    });

    it('original loader errors (missing file, invalid JSON, normalization) propagate unchanged with the gate on and off', async () => {
        const root = makeRoot({ 'bad.json': '{', 'noweeks.json': '{"scenario_id":"x"}\n' });
        gate.loaderMode = 'real';
        for (const file of ['missing.json', 'bad.json', 'noweeks.json']) {
            const errors: Error[] = [];
            for (const value of [undefined, '1']) {
                setGate(value);
                try {
                    await runScenario(runnerOptions(root, file));
                } catch (error) {
                    if (error instanceof Error) errors.push(error);
                }
            }
            expect(errors, file).toHaveLength(2);
            expect(errors[1]?.name, file).toBe(errors[0]?.name);
            expect(errors[1]?.message, file).toBe(errors[0]?.message);
        }
    });
});

describe('post-stamp diagnostic emission helper (direct, no startup; synchronous fd-1 write)', () => {
    const SCENARIO_A = '{"scenario_id":"read_obs_fixture","weeks":1}\n';

    async function loadedContext() {
        const root = makeRoot({ 'a.json': SCENARIO_A });
        const path = join(root, 'a.json');
        gate.loaderMode = 'real';
        const context = createScenarioReadContext();
        await loadScenario(path, context);
        const sha = createHash('sha256').update(normalizeForHash(SCENARIO_A), 'utf8').digest('hex');
        return { root, path, context, stampFiles: [{ path: 'a.json', sha256: sha }] };
    }

    function arm(mode: SinkMode): void {
        gate.sink.armed = true;
        gate.sink.mode = mode;
        gate.sink.written = '';
        gate.sink.calls.length = 0;
    }

    function parsedLine(): { proof_status?: string; overall?: string } {
        expect(gate.sink.written.startsWith(SCENARIO_READ_RECEIPT_LINE_PREFIX)).toBe(true);
        expect(gate.sink.written.endsWith('\n')).toBe(true);
        return JSON.parse(gate.sink.written.slice(SCENARIO_READ_RECEIPT_LINE_PREFIX.length)) as { proof_status?: string; overall?: string };
    }

    it('a valid context writes exactly one complete line that parses and reports a match', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        arm('capture');
        const facts = emitScenarioReadReceiptDiagnostic({ context, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles });
        expect(facts.delivered).toBe(true);
        expect(facts.error).toBeUndefined();
        expect(facts.bytes_written).toBe(facts.bytes_total);
        expect(facts.bytes_total).toBe(Buffer.byteLength(gate.sink.written, 'utf8'));
        const payload = parsedLine();
        expect(payload.proof_status).toBe('VALID');
        expect(payload.overall).toBe('match');
    });

    it('a comparison failure becomes an explicit INVALID line and never throws', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        const failing: ScenarioReadContext = {
            ...context,
            compareToStamp() {
                throw new Error('compare boom');
            },
        };
        arm('capture');
        expect(() => emitScenarioReadReceiptDiagnostic({ context: failing, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles })).not.toThrow();
        expect(gate.sink.written).toContain('"proof_status":"INVALID"');
        expect(gate.sink.written).toContain('diagnostic_failure');
        expect(gate.sink.written).toContain('compare boom');
        expect(gate.sink.written).not.toContain('"overall":"match"');
    });

    it('a render failure becomes an explicit INVALID line and never throws', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        gate.renderThrows = true;
        arm('capture');
        expect(() => emitScenarioReadReceiptDiagnostic({ context, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles })).not.toThrow();
        expect(gate.sink.written).toContain('"proof_status":"INVALID"');
        expect(gate.sink.written).toContain('render boom');
    });

    it('a factory failure is reported as an INVALID line', () => {
        arm('capture');
        const facts = emitScenarioReadReceiptDiagnostic({
            context: undefined,
            contextFailure: 'context_factory_failure: factory boom',
            baseDir: '/base',
            scenarioPath: '/base/s.json',
            stampFiles: [],
        });
        expect(facts.delivered).toBe(true);
        expect(gate.sink.written).toContain('"proof_status":"INVALID"');
        expect(gate.sink.written).toContain('context_factory_failure: factory boom');
    });

    it('a short-writing sink is completed by looping and reports delivery of every byte', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        arm('short_then_ok');
        const facts = emitScenarioReadReceiptDiagnostic({ context, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles });
        expect(gate.sink.calls.length).toBeGreaterThan(1);
        expect(gate.sink.calls[0]).toBeGreaterThan(7);
        expect(facts.delivered).toBe(true);
        expect(facts.bytes_written).toBe(facts.bytes_total);
        expect(parsedLine().overall).toBe('match');
    });

    it('a sink that throws immediately is contained: delivered=false, zero bytes, the error recorded, no line produced', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        const listenersBefore = process.stdout.listenerCount('error');
        arm('throw');
        let facts: ReturnType<typeof emitScenarioReadReceiptDiagnostic> | undefined;
        expect(() => {
            facts = emitScenarioReadReceiptDiagnostic({ context, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles });
        }).not.toThrow();
        expect(facts?.delivered).toBe(false);
        expect(facts?.bytes_written).toBe(0);
        expect(facts?.error).toContain('EPIPE');
        expect(gate.sink.written).toBe('');
        expect(process.stdout.listenerCount('error')).toBe(listenersBefore);
    });

    it('a sink that fails after a partial write records the partial byte count and never claims delivery', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        arm('partial_then_throw');
        const facts = emitScenarioReadReceiptDiagnostic({ context, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles });
        expect(facts.delivered).toBe(false);
        expect(facts.bytes_written).toBe(5);
        expect(facts.bytes_written).toBeLessThan(facts.bytes_total);
        expect(facts.error).toContain('EPIPE');
        expect(gate.sink.written).toHaveLength(5);
        expect(gate.sink.written.endsWith('\n')).toBe(false);
    });

    it('a stalled sink (zero bytes written) is a failure and cannot loop forever', async () => {
        const { root, path, context, stampFiles } = await loadedContext();
        arm('zero');
        const facts = emitScenarioReadReceiptDiagnostic({ context, contextFailure: undefined, baseDir: root, scenarioPath: path, stampFiles });
        expect(gate.sink.calls).toHaveLength(1);
        expect(facts.delivered).toBe(false);
        expect(facts.bytes_written).toBe(0);
        expect(facts.error?.startsWith('stalled_write')).toBe(true);
    });
});
