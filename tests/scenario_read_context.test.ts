/**
 * Focused contract tests for the optional `loadScenario` read observer and the per-run
 * `scenario_read_context` (diagnostic, default-off, ONE-loader scope).
 *
 * What this proves: with an observer the exact decoded string that `JSON.parse` receives can be
 * recorded (decoded hash and the stamp's CRLF-normalized hash kept separate), separately from
 * normalization success, and compared against the later declarative stamp row for the same logical
 * scenario input; with the observer absent the loader's reads, result and errors are unchanged.
 *
 * What it does NOT prove: raw-byte or physical-file identity (paths are LEXICAL), any other loader,
 * actual-used 31, production runner wiring (none exists in this scope), or anything about a retained run.
 *
 * `node:fs/promises` is wrapped with a call-recording pass-through (the real `readFile` always runs)
 * only to show that no extra read happens and that the ORIGINAL path string is what is read.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, posix, relative, resolve, win32 } from 'node:path';

import { computeRunId, loadScenario } from '../src/scenario/scenario_loader.js';
import type { ScenarioReadObserver } from '../src/scenario/scenario_loader.js';
import {
    HEADLESS_FIXED_CONSUMED_INPUTS,
    buildRunProvenance,
    normalizeForHash,
} from '../src/scenario/run_provenance.js';
import {
    associateScenarioWithStamp,
    compareReceiptToAssociation,
    createScenarioReadContext,
    renderScenarioReadComparison,
} from '../src/scenario/scenario_read_context.js';
import type { ScenarioReadReceipt } from '../src/scenario/scenario_read_context.js';
import { EVENT_FILES } from '../src/sim/events/event_loader.js';

const fsState = vi.hoisted(() => ({ readFileCalls: [] as string[] }));

vi.mock('node:fs/promises', async (importOriginal) => {
    const real = await importOriginal<typeof import('node:fs/promises')>();
    const wrapped = ((path: Parameters<typeof real.readFile>[0], options?: Parameters<typeof real.readFile>[1]) => {
        fsState.readFileCalls.push(String(path));
        return real.readFile(path, options as never);
    }) as unknown as typeof real.readFile;
    return { ...real, readFile: wrapped };
});

const TEMP_PREFIX = 'awwv-read-ctx-';
const SCENARIO_A = '{"scenario_id":"read_obs_fixture","weeks":1}\n';
const SCENARIO_B = '{"scenario_id":"read_obs_fixture","weeks":2}\n';
const SCENARIO_A_LF = '{\n  "scenario_id": "read_obs_fixture",\n  "weeks": 1\n}\n';
const SCENARIO_A_CRLF = SCENARIO_A_LF.replace(/\n/g, '\r\n');
const SCENARIO_ROW = 'data/scenarios/read_obs_fixture.json';

const roots: string[] = [];

function sha256Hex(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}

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

/** Every headless input and the event catalogue as stubs, plus the scenario file under test. */
function makeFullTree(scenarioContent: string): { root: string; scenarioPath: string } {
    const files: Record<string, string> = {};
    for (const input of HEADLESS_FIXED_CONSUMED_INPUTS) files[input] = `{"stub":"${input}"}\n`;
    for (const name of EVENT_FILES) files[`data/scenarios/events/${name}`] = `{"stub":"${name}"}\n`;
    files[SCENARIO_ROW] = scenarioContent;
    const root = makeRoot(files);
    return { root, scenarioPath: join(root, SCENARIO_ROW) };
}

async function stampFiles(root: string, scenarioPath: string) {
    const provenance = await buildRunProvenance({
        baseDir: root,
        scenarioPath,
        harness: 'headless',
        collapseEnabled: false,
    });
    return provenance.consumed_inputs.files;
}

afterAll(() => {
    for (const root of roots) {
        const resolved = resolve(root);
        // Guarded recursive deletion: only task-owned temp roots directly under the OS temp dir.
        if (dirname(resolved) === resolve(tmpdir()) && basename(resolved).startsWith(TEMP_PREFIX)) {
            rmSync(resolved, { recursive: true, force: true });
        }
    }
});

describe('fixtures A/B are accepted by the real loader', () => {
    it('A has weeks 1, B has weeks 2, and the run ids differ', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A, 'b.json': SCENARIO_B });
        const a = await loadScenario(join(root, 'a.json'));
        const b = await loadScenario(join(root, 'b.json'));
        expect(a.scenario_id).toBe('read_obs_fixture');
        expect(a.weeks).toBe(1);
        expect(b.weeks).toBe(2);
        expect(computeRunId(a)).not.toBe(computeRunId(b));
    });
});

describe('default-off compatibility', () => {
    it('observer-less and observed loads return equal scenarios and read exactly the original path once', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A });
        const path = join(root, 'a.json');
        const spies = [
            vi.spyOn(console, 'log').mockImplementation(() => undefined),
            vi.spyOn(console, 'info').mockImplementation(() => undefined),
            vi.spyOn(console, 'warn').mockImplementation(() => undefined),
            vi.spyOn(console, 'error').mockImplementation(() => undefined),
        ];
        try {
            fsState.readFileCalls.length = 0;
            const plain = await loadScenario(path);
            expect(fsState.readFileCalls).toEqual([path]);
            fsState.readFileCalls.length = 0;
            const context = createScenarioReadContext();
            const observed = await loadScenario(path, context);
            expect(fsState.readFileCalls).toEqual([path]);
            expect(observed).toEqual(plain);
            expect(computeRunId(observed)).toBe(computeRunId(plain));
            expect(context.receipts()).toHaveLength(1);
            for (const spy of spies) expect(spy).not.toHaveBeenCalled();
        } finally {
            for (const spy of spies) spy.mockRestore();
        }
    });

    it('a relative path is read as passed and its lexical resolution uses the cwd sampled at read time', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A });
        const absolute = join(root, 'a.json');
        const passed = relative(process.cwd(), absolute);
        const context = createScenarioReadContext();
        fsState.readFileCalls.length = 0;
        await loadScenario(passed, context);
        expect(fsState.readFileCalls).toEqual([passed]);
        const [receipt] = context.receipts();
        expect(receipt?.path_as_passed).toBe(passed);
        expect(receipt?.cwd_at_read).toBe(process.cwd());
        expect(receipt?.resolved_path).toBe(resolve(process.cwd(), passed));
    });
});

describe('the observed text is the exact decoded string that is parsed', () => {
    it('JSON.parse receives a string whose hash equals the receipt decoded hash', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A_CRLF });
        const path = join(root, 'a.json');
        const context = createScenarioReadContext();
        const parseSpy = vi.spyOn(JSON, 'parse');
        try {
            await loadScenario(path, context);
            const parsedStrings = parseSpy.mock.calls
                .map((call) => call[0])
                .filter((value): value is string => typeof value === 'string');
            const [receipt] = context.receipts();
            expect(receipt?.decoded_text_sha256).toBeDefined();
            const matching = parsedStrings.filter((text) => sha256Hex(text) === receipt?.decoded_text_sha256);
            expect(matching).toHaveLength(1);
            expect(receipt?.decoded_char_length).toBe(readFileSync(path, 'utf8').length);
            expect(receipt?.status).toBe('read_normalized');
        } finally {
            parseSpy.mockRestore();
        }
    });

    it('LF and CRLF versions: same parsed scenario, distinct decoded hashes, equal normalized hashes', async () => {
        const root = makeRoot({ 'lf.json': SCENARIO_A_LF, 'crlf.json': SCENARIO_A_CRLF });
        const context = createScenarioReadContext();
        const lf = await loadScenario(join(root, 'lf.json'), context);
        const crlf = await loadScenario(join(root, 'crlf.json'), context);
        expect(crlf).toEqual(lf);
        const [first, second] = context.receipts();
        expect(first?.decoded_text_sha256).not.toBe(second?.decoded_text_sha256);
        expect(first?.normalized_text_sha256).toBe(second?.normalized_text_sha256);
        expect(second?.normalized_text_sha256).toBe(sha256Hex(normalizeForHash(SCENARIO_A_CRLF)));
        expect(second?.normalized_text_sha256).toBe(sha256Hex(SCENARIO_A_LF));
        expect(second?.decoded_text_sha256).toBe(sha256Hex(SCENARIO_A_CRLF));
    });
});

describe('observed load versus the real stamp (same logical scenario row)', () => {
    it('unchanged content between load and stamp matches', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.proof_status).toBe('VALID');
        expect(comparison.overall).toBe('match');
        expect(comparison.association.declared_row_path).toBe(SCENARIO_ROW);
        expect(comparison.per_read.map((read) => read.status)).toEqual(['match']);
        const [receipt] = context.receipts();
        expect(receipt?.normalized_text_sha256).toBe(comparison.association.stamp_row_sha256);
        expect(renderScenarioReadComparison(comparison)).toContain('"overall":"match"');
    });

    it('content changed from A to B after the load and before the stamp is a mismatch', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        writeFileSync(scenarioPath, SCENARIO_B, 'utf8');
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.overall).toBe('hash_mismatch');
        expect(comparison.per_read[0]?.hash_equal).toBe(false);
        expect(context.receipts()[0]?.normalized_text_sha256).toBe(sha256Hex(normalizeForHash(SCENARIO_A)));
        expect(comparison.association.stamp_row_sha256).toBe(sha256Hex(normalizeForHash(SCENARIO_B)));
    });

    it('a CRLF file matches the stamp through the shared normalizer while keeping the decoded hash distinct', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A_CRLF);
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.overall).toBe('match');
        const [receipt] = context.receipts();
        expect(receipt?.decoded_text_sha256).not.toBe(receipt?.normalized_text_sha256);
    });

    it('repeated reads keep every ordinal and hash (no dedup) and disagreement is reported', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        writeFileSync(scenarioPath, SCENARIO_B, 'utf8');
        await loadScenario(scenarioPath, context);
        const receipts = context.receipts();
        expect(receipts.map((receipt) => receipt.ordinal)).toEqual([1, 2]);
        expect(receipts[0]?.normalized_text_sha256).not.toBe(receipts[1]?.normalized_text_sha256);
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.overall).toBe('repeat_disagreement');
        expect(comparison.per_read.map((read) => read.status)).toEqual(['hash_mismatch', 'match']);
    });

    it('identical repeated reads are both retained and still match', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        await loadScenario(scenarioPath, context);
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(context.receipts().map((receipt) => receipt.ordinal)).toEqual([1, 2]);
        expect(comparison.overall).toBe('match');
        expect(comparison.per_read.map((read) => read.status)).toEqual(['match', 'match']);
    });
});

describe('context isolation', () => {
    it('sequential contexts do not share ordinals or receipts', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A, 'b.json': SCENARIO_B });
        const first = createScenarioReadContext();
        const second = createScenarioReadContext();
        await loadScenario(join(root, 'a.json'), first);
        await loadScenario(join(root, 'b.json'), first);
        await loadScenario(join(root, 'b.json'), second);
        expect(first.receipts().map((receipt) => receipt.ordinal)).toEqual([1, 2]);
        expect(second.receipts().map((receipt) => receipt.ordinal)).toEqual([1]);
        expect(second.receipts()[0]?.normalized_text_sha256).toBe(sha256Hex(normalizeForHash(SCENARIO_B)));
    });

    it('concurrent loads with separate contexts do not mix', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A, 'b.json': SCENARIO_B });
        const first = createScenarioReadContext();
        const second = createScenarioReadContext();
        await Promise.all([
            loadScenario(join(root, 'a.json'), first),
            loadScenario(join(root, 'b.json'), second),
        ]);
        expect(first.receipts()).toHaveLength(1);
        expect(second.receipts()).toHaveLength(1);
        expect(first.receipts()[0]?.normalized_text_sha256).toBe(sha256Hex(normalizeForHash(SCENARIO_A)));
        expect(second.receipts()[0]?.normalized_text_sha256).toBe(sha256Hex(normalizeForHash(SCENARIO_B)));
        expect(first.receipts()[0]?.ordinal).toBe(1);
        expect(second.receipts()[0]?.ordinal).toBe(1);
    });

    it('receipts() returns copies, so a caller cannot rewrite recorded evidence', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A });
        const context = createScenarioReadContext();
        await loadScenario(join(root, 'a.json'), context);
        const snapshot = context.receipts();
        expect(snapshot[0]).not.toBe(context.receipts()[0]);
        expect(snapshot[0]).toEqual(context.receipts()[0]);
    });
});

describe('original errors are preserved and read evidence is not use', () => {
    async function capture(promise: Promise<unknown>): Promise<Error> {
        try {
            await promise;
        } catch (error) {
            if (error instanceof Error) return error;
        }
        throw new Error('expected the load to reject');
    }

    it('a missing file rejects identically and records no receipt', async () => {
        const root = makeRoot();
        const missing = join(root, 'missing.json');
        const plain = await capture(loadScenario(missing));
        const context = createScenarioReadContext();
        const observed = await capture(loadScenario(missing, context));
        expect(observed.message).toBe(plain.message);
        expect((observed as NodeJS.ErrnoException).code).toBe('ENOENT');
        expect(context.receipts()).toHaveLength(0);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: missing, stampFiles: [] });
        expect(comparison.overall).toBe('no_load_receipt');
    });

    it('invalid JSON rejects identically; the read is evidence only, never a normalized use', async () => {
        const root = makeRoot({ 'bad.json': '{' });
        const path = join(root, 'bad.json');
        const plain = await capture(loadScenario(path));
        const context = createScenarioReadContext();
        const observed = await capture(loadScenario(path, context));
        expect(observed.name).toBe('SyntaxError');
        expect(observed.message).toBe(plain.message);
        const [receipt] = context.receipts();
        expect(receipt?.status).toBe('read_parse_failed');
        expect(receipt?.parse_error_name).toBe('SyntaxError');
        const comparison = context.compareToStamp({
            baseDir: root,
            scenarioPathAsPassed: path,
            stampFiles: [{ path: 'bad.json', sha256: receipt?.normalized_text_sha256 ?? null }],
        });
        expect(comparison.overall).toBe('no_normalized_use');
        expect(comparison.overall).not.toBe('match');
    });

    it('a normalization error (missing weeks) rejects identically and is recorded as a failed use', async () => {
        const root = makeRoot({ 'noweeks.json': '{"scenario_id":"x"}\n' });
        const path = join(root, 'noweeks.json');
        const plain = await capture(loadScenario(path));
        const context = createScenarioReadContext();
        const observed = await capture(loadScenario(path, context));
        expect(plain.message).toBe('Scenario must have weeks (integer >= 1)');
        expect(observed.message).toBe(plain.message);
        const [receipt] = context.receipts();
        expect(receipt?.status).toBe('read_parse_failed');
        expect(receipt?.parse_error_name).toBe('Error');
    });
});

describe('observer failure invalidates the proof and never changes the loader', () => {
    it('a throwing onRead leaves the result unchanged, records the failure and is INVALID', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const baseline = await loadScenario(scenarioPath);
        const context = createScenarioReadContext();
        const failing: ScenarioReadObserver = {
            ...context,
            onRead() {
                throw new Error('observer boom');
            },
        };
        const observed = await loadScenario(scenarioPath, failing);
        expect(observed).toEqual(baseline);
        expect(context.observerFailures().some((failure) => failure.includes('observer boom'))).toBe(true);
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.proof_status).toBe('INVALID');
        expect(comparison.overall).toBe('invalid');
        expect(comparison.overall).not.toBe('match');
    });

    it('a throwing onNormalized leaves partial evidence: INVALID, never match', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const baseline = await loadScenario(scenarioPath);
        const context = createScenarioReadContext();
        const failing: ScenarioReadObserver = {
            ...context,
            onNormalized() {
                throw new Error('normalized boom');
            },
        };
        const observed = await loadScenario(scenarioPath, failing);
        expect(observed).toEqual(baseline);
        expect(context.receipts()[0]?.status).toBe('read_only');
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.proof_status).toBe('INVALID');
        expect(comparison.overall).toBe('invalid');
    });

    it('onNormalized that delegates to the context and THEN throws: loader unchanged, INVALID, and no row or rendered status is match', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const baseline = await loadScenario(scenarioPath);
        const context = createScenarioReadContext();
        const failing: ScenarioReadObserver = {
            ...context,
            onNormalized(token: unknown) {
                context.onNormalized?.(token);
                throw new Error('delegated then boom');
            },
        };
        const observed = await loadScenario(scenarioPath, failing);
        expect(observed).toEqual(baseline);
        expect(context.observerFailures().some((failure) => failure.includes('delegated then boom'))).toBe(true);
        const [receipt] = context.receipts();
        expect(receipt?.status).toBe('read_normalized');
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.proof_status).toBe('INVALID');
        expect(comparison.overall).toBe('invalid');
        expect(comparison.per_read.map((read) => read.status)).not.toContain('match');
        expect(comparison.per_read.map((read) => read.status)).toEqual(['invalid_evidence']);
        // Diagnostic facts are preserved: equal hash alone is not valid proof.
        expect(comparison.per_read[0]?.ordinal).toBe(1);
        expect(comparison.per_read[0]?.path_equal).toBe(true);
        expect(comparison.per_read[0]?.hash_equal).toBe(true);
        const rendered = renderScenarioReadComparison(comparison);
        expect(rendered).not.toContain('"status":"match"');
        expect(rendered).not.toContain('"overall":"match"');
    });

    it('an earlier successful matching read followed by a later observer failure cannot remain a match', async () => {
        const { root, scenarioPath } = makeFullTree(SCENARIO_A);
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        const failingLater: ScenarioReadObserver = {
            ...context,
            onRead() {
                throw new Error('later boom');
            },
        };
        const baseline = await loadScenario(scenarioPath);
        expect(await loadScenario(scenarioPath, failingLater)).toEqual(baseline);
        expect(context.observerFailures().some((failure) => failure.includes('later boom'))).toBe(true);
        const retained = context.receipts();
        expect(retained).toHaveLength(1);
        expect(retained[0]?.ordinal).toBe(1);
        expect(retained[0]?.status).toBe('read_normalized');
        const files = await stampFiles(root, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: root, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.proof_status).toBe('INVALID');
        expect(comparison.overall).toBe('invalid');
        expect(comparison.per_read.map((read) => read.status)).not.toContain('match');
        expect(comparison.per_read).toHaveLength(1);
        expect(comparison.per_read[0]?.ordinal).toBe(1);
        expect(comparison.per_read[0]?.path_equal).toBe(true);
        expect(comparison.per_read[0]?.hash_equal).toBe(true);
        expect(retained[0]?.normalized_text_sha256).toBe(comparison.association.stamp_row_sha256);
        expect(renderScenarioReadComparison(comparison)).not.toContain('"status":"match"');
    });

    it('an observer whose every callback (including the error hook) throws cannot change the load', async () => {
        const root = makeRoot({ 'a.json': SCENARIO_A, 'bad.json': '{' });
        const throwing: ScenarioReadObserver = {
            onRead() {
                throw new Error('x');
            },
            onNormalized() {
                throw new Error('x');
            },
            onParseFailed() {
                throw new Error('x');
            },
            onObserverError() {
                throw new Error('x');
            },
        };
        const baseline = await loadScenario(join(root, 'a.json'));
        expect(await loadScenario(join(root, 'a.json'), throwing)).toEqual(baseline);
        await expect(loadScenario(join(root, 'bad.json'), throwing)).rejects.toThrow(SyntaxError);
    });
});

describe('equal hashes with different lexical paths never match', () => {
    function receiptAt(resolvedPath: string, normalizedHash: string): ScenarioReadReceipt {
        return {
            ordinal: 1,
            path_as_passed: resolvedPath,
            cwd_at_read: '/cwd',
            resolved_path: resolvedPath,
            decoded_char_length: 1,
            decoded_text_sha256: normalizedHash,
            normalized_text_sha256: normalizedHash,
            status: 'read_normalized',
            parse_error_name: null,
        };
    }

    it('pure comparison: equal hash, different resolved path => path_identity_mismatch', () => {
        const hash = sha256Hex('same');
        const association = {
            path_as_passed: '/a/s.json',
            declared_row_path: 'data/s.json',
            stamped_resolved_path: '/stamp/data/s.json',
            stamp_row_sha256: hash,
        };
        const result = compareReceiptToAssociation(receiptAt('/a/s.json', hash), association);
        expect(result.status).toBe('path_identity_mismatch');
        expect(result.hash_equal).toBe(true);
        expect(result.path_equal).toBe(false);
    });

    it('host-native, outside base, stamp target unreadable: stamp_null with distinct lexical paths', async () => {
        const { root: other } = makeFullTree(SCENARIO_B);
        const scenarioRoot = makeRoot({ 's.json': SCENARIO_A });
        const scenarioPath = join(scenarioRoot, 's.json');
        const context = createScenarioReadContext();
        await loadScenario(scenarioPath, context);
        const files = await stampFiles(other, scenarioPath);
        const comparison = context.compareToStamp({ baseDir: other, scenarioPathAsPassed: scenarioPath, stampFiles: files });
        expect(comparison.overall).toBe('stamp_null');
        expect(comparison.association.stamped_resolved_path).not.toBe(context.receipts()[0]?.resolved_path);
    });

    it.skipIf(process.platform === 'win32')(
        'host-native POSIX, outside base, stamp target is ANOTHER file with the same content: not a match',
        async () => {
            const { root: other } = makeFullTree(SCENARIO_B);
            const scenarioRoot = makeRoot({ 's.json': SCENARIO_A });
            const scenarioPath = join(scenarioRoot, 's.json');
            const association = associateScenarioWithStamp({ baseDir: other, scenarioPathAsPassed: scenarioPath, stampFiles: [] });
            mkdirSync(dirname(association.stamped_resolved_path), { recursive: true });
            writeFileSync(association.stamped_resolved_path, SCENARIO_A, 'utf8');
            const context = createScenarioReadContext();
            await loadScenario(scenarioPath, context);
            const files = await stampFiles(other, scenarioPath);
            const comparison = context.compareToStamp({ baseDir: other, scenarioPathAsPassed: scenarioPath, stampFiles: files });
            expect(comparison.per_read[0]?.hash_equal).toBe(true);
            expect(comparison.overall).toBe('path_identity_mismatch');
        },
    );

    it.skipIf(process.platform === 'win32')(
        'host-native POSIX, outside base, stamp target is ANOTHER file with different content: path mismatch is reported',
        async () => {
            const { root: other } = makeFullTree(SCENARIO_B);
            const scenarioRoot = makeRoot({ 's.json': SCENARIO_A });
            const scenarioPath = join(scenarioRoot, 's.json');
            const association = associateScenarioWithStamp({ baseDir: other, scenarioPathAsPassed: scenarioPath, stampFiles: [] });
            mkdirSync(dirname(association.stamped_resolved_path), { recursive: true });
            writeFileSync(association.stamped_resolved_path, SCENARIO_B, 'utf8');
            const context = createScenarioReadContext();
            await loadScenario(scenarioPath, context);
            const files = await stampFiles(other, scenarioPath);
            const comparison = context.compareToStamp({ baseDir: other, scenarioPathAsPassed: scenarioPath, stampFiles: files });
            expect(comparison.per_read[0]?.hash_equal).toBe(false);
            expect(comparison.overall).toBe('path_identity_mismatch');
        },
    );
});

describe('lexical string tests with injected path modules (NOT host or physical-file identity)', () => {
    it('win32: an in-base scenario derives the same lexical path the stamp reads', () => {
        const association = associateScenarioWithStamp({
            baseDir: 'C:\\work\\repo',
            scenarioPathAsPassed: 'C:\\work\\repo\\data\\s.json',
            stampFiles: [{ path: 'data/s.json', sha256: 'abc' }],
            pathApi: win32,
        });
        expect(association.declared_row_path).toBe('data/s.json');
        expect(association.stamped_resolved_path).toBe(win32.resolve(win32.join('C:\\work\\repo', 'data/s.json')));
        expect(association.stamped_resolved_path).toBe('C:\\work\\repo\\data\\s.json');
        expect(association.stamp_row_sha256).toBe('abc');
    });

    it('posix: an in-base scenario derives the same lexical path the stamp reads', () => {
        const association = associateScenarioWithStamp({
            baseDir: '/work/repo',
            scenarioPathAsPassed: '/work/repo/data/s.json',
            stampFiles: [{ path: 'data/s.json', sha256: 'abc' }],
            pathApi: posix,
        });
        expect(association.declared_row_path).toBe('data/s.json');
        expect(association.stamped_resolved_path).toBe('/work/repo/data/s.json');
    });

    it('posix: an outside-base absolute path keeps its absolute row path and is stamped under the base', () => {
        const association = associateScenarioWithStamp({
            baseDir: '/work/repo',
            scenarioPathAsPassed: '/elsewhere/s.json',
            stampFiles: [],
            pathApi: posix,
        });
        expect(association.declared_row_path).toBe('/elsewhere/s.json');
        expect(association.stamped_resolved_path).toBe('/work/repo/elsewhere/s.json');
        expect(association.stamped_resolved_path).not.toBe(posix.resolve('/elsewhere/s.json'));
        expect(association.stamp_row_sha256).toBeUndefined();
    });

    it('win32: an outside-base path on another drive stays distinct from its own lexical resolution', () => {
        const association = associateScenarioWithStamp({
            baseDir: 'C:\\work\\repo',
            scenarioPathAsPassed: 'D:\\elsewhere\\s.json',
            stampFiles: [],
            pathApi: win32,
        });
        expect(association.declared_row_path).toBe('D:/elsewhere/s.json');
        expect(association.stamped_resolved_path.startsWith('C:\\work\\repo')).toBe(true);
        expect(association.stamped_resolved_path).not.toBe(win32.resolve('D:\\elsewhere\\s.json'));
    });
});
