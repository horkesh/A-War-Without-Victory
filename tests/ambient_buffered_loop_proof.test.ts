import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'vitest';

/*
 * Behavioral contract tests for the native buffered-loop proof checker.
 *
 * The module under test is a fail-closed scaffold in this phase: it performs no
 * I/O and admits nothing, so every positive admission assertion below is
 * expected RED until the real checker lands. Mutation negatives must stay raw
 * failures, which the scaffold already satisfies, so they pin the contract
 * without weakening it.
 *
 * The fixture is an exact copy of the approved unit facts
 * (tests/fixtures/native_audio_loop_case.json). Each case writes the sidecar
 * artifact into a fresh owned OS temp directory, hashes the actual bytes, and
 * builds the receipt from that file.
 */

const require = createRequire(import.meta.url);

type AttributionResult = { remaining: any[]; expected: any[] };
type Attribute = (input: Record<string, unknown>) => AttributionResult;

const { attributeBufferedAmbientLoopAborts } = require('../tools/ui/ambient_buffered_loop_proof.cjs') as {
    attributeBufferedAmbientLoopAborts: Attribute;
};

const ALLOWLIST = 'ambient-buffered-loop-proof-v1';
const FIXTURE_PATH = join(process.cwd(), 'tests', 'fixtures', 'native_audio_loop_case.json');

type Fixture = {
    unit_fixture_only: boolean;
    provenance: string;
    source_capture_sha256: string;
    source_cdp_sha256: string;
    failures: any[];
    signals: any[];
    artifact: any;
};

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Fixture;

type Parts = {
    index: number;
    failures: any[];
    signals: any[];
    artifact: any;
};

type Built = {
    input: {
        networkFailures: any[];
        lifecycleSignals: any[];
        cdpReceipt: Record<string, any>;
        expectedSidecarPath: string;
    };
    path: string;
    sha256: string;
    parts: Parts;
};

type Mutation = {
    name: string;
    caseIndex?: number;
    mutate?: (parts: Parts) => void;
    afterWrite?: (built: Built) => void;
    failures?: 'single' | 'both';
};

const ownedDirs: string[] = [];

afterEach(() => {
    while (ownedDirs.length > 0) {
        const dir = ownedDirs.pop() as string;
        rmSync(dir, { recursive: true, force: true });
    }
});

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function sha256(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

function projectUrl(raw: string): Record<string, any> {
    const url = new URL(raw);
    return {
        status: 'present',
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname.split('/'),
        had_userinfo: Boolean(url.username || url.password),
        had_query: url.search.length > 0,
        had_fragment: url.hash.length > 0,
    };
}

function chainOf(artifact: any, index: number): { request: any; response: any; failure: any; body: any } {
    const pick = (kind: string): any => artifact.events.filter((event: any) => event.kind === kind)[index];
    return {
        request: pick('request'),
        response: pick('response'),
        failure: pick('failure'),
        body: artifact.body_attempts[index],
    };
}

function caseSignals(parts: Parts, kind?: string): any[] {
    const elementId = `media:${parts.index + 1}`;
    return parts.signals.filter((signal: any) => signal.elementId === elementId && (kind === undefined || signal.kind === kind));
}

function seekSignal(parts: Parts): any {
    return caseSignals(parts, 'seeking')[0];
}

function seekedOf(parts: Parts): any {
    return caseSignals(parts, 'seeked')[0];
}

function playAfterSeek(parts: Parts): any {
    const seeked = seekedOf(parts);
    return caseSignals(parts).filter((signal: any) => signal.signalSequence > seeked.signalSequence && signal.kind === 'playing')[0];
}

function preSeekSample(parts: Parts): any {
    const seeking = seekSignal(parts);
    const candidates = caseSignals(parts).filter((signal: any) => {
        const state = signal.mediaState;
        return signal.signalSequence < seeking.signalSequence
            && state
            && state.paused === false
            && state.readyState === 4
            && state.currentTime > 0
            && state.currentTime < state.duration;
    });
    return candidates[candidates.length - 1];
}

function finalSample(parts: Parts): any {
    const signals = caseSignals(parts);
    return signals[signals.length - 1];
}

function unpausedPreSeekSamples(parts: Parts): any[] {
    const seeking = seekSignal(parts);
    return caseSignals(parts).filter((signal: any) => signal.signalSequence < seeking.signalSequence
        && signal.mediaState
        && signal.mediaState.paused === false
        && signal.mediaState.readyState === 4);
}

function setRanges(parts: Parts, key: 'buffered' | 'seekable', value: any): void {
    for (const signal of caseSignals(parts)) {
        signal.mediaState[key] = clone(value);
    }
}

function setAssetUrl(parts: Parts, rawUrl: string): void {
    const original = fixture.failures[parts.index].url;
    for (const failure of parts.failures) {
        if (failure.url === original) failure.url = rawUrl;
    }
    for (const signal of parts.signals) {
        if (signal.url === original) {
            signal.url = rawUrl;
            signal.origin = new URL(rawUrl).origin;
        }
    }
    const chain = chainOf(parts.artifact, parts.index);
    chain.request.url = projectUrl(rawUrl);
    chain.response.url = projectUrl(rawUrl);
}

function historySignal(options: {
    kind: string;
    sequence: number;
    observedAtMs: number;
    currentTime: number;
    readyState?: number;
    paused?: boolean;
    seeking?: boolean;
    duration?: number;
    buffered?: any;
    seekable?: any;
}): any {
    const duration = options.duration ?? 30;
    return {
        kind: options.kind,
        signalSequence: options.sequence,
        elementId: 'media:1',
        sourceEpoch: 1,
        url: 'http://127.0.0.1:50306/assets/ambient_warroom-CO4FPnyV.ogg',
        origin: 'http://127.0.0.1:50306',
        observedAtMs: options.observedAtMs,
        mediaState: {
            networkState: 1,
            readyState: options.readyState ?? 4,
            paused: options.paused ?? false,
            ended: false,
            seeking: options.seeking ?? false,
            currentTime: options.currentTime,
            duration,
            loop: true,
            buffered: options.buffered ?? [[-0.002667, duration]],
            seekable: options.seekable ?? [[0, duration]],
            mediaError: null,
        },
        mediaStateUnavailable: [],
        mediaStateReadErrors: {},
    };
}

function build(index: number, options: { mutate?: (parts: Parts) => void; failures?: 'single' | 'both' } = {}): Built {
    const artifact = clone(fixture.artifact);
    const signals = clone(fixture.signals);
    const failures = options.failures === 'both'
        ? clone(fixture.failures)
        : [clone(fixture.failures[index])];
    const parts: Parts = { index, failures, signals, artifact };
    const before = JSON.stringify({ failures: parts.failures, signals: parts.signals, artifact: parts.artifact });
    options.mutate?.(parts);
    const after = JSON.stringify({ failures: parts.failures, signals: parts.signals, artifact: parts.artifact });
    if (options.mutate && before === after) {
        throw new Error(`mutation for retained case ${index} did not change the fixture`);
    }

    const dir = mkdtempSync(join(tmpdir(), 'awwv-ambient-loop-'));
    ownedDirs.push(dir);
    const path = join(dir, 'cdp-sidecar.json');
    const bytes = Buffer.from(JSON.stringify(parts.artifact, null, 2), 'utf8');
    writeFileSync(path, bytes);
    const digest = sha256(bytes);
    const input = {
        networkFailures: parts.failures,
        lifecycleSignals: parts.signals,
        cdpReceipt: {
            path,
            sha256: digest,
            schema: parts.artifact.schema,
            status: parts.artifact.status,
        },
        expectedSidecarPath: path,
    };
    return { input, path, sha256: digest, parts };
}

function expectNoAdmission(built: Built): AttributionResult {
    const failuresBefore = clone(built.input.networkFailures);
    const signalsBefore = clone(built.input.lifecycleSignals);
    const result = attributeBufferedAmbientLoopAborts(built.input);
    assert.deepEqual(result.expected, [], 'mutated or incomplete evidence must never be admitted');
    assert.equal(result.remaining.length, failuresBefore.length, 'every rejected failure must remain raw');
    assert.deepEqual(result.remaining, failuresBefore, 'rejected failures must be returned unchanged');
    assert.deepEqual(built.input.networkFailures, failuresBefore, 'checker must not mutate raw failures');
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'checker must not mutate raw signals');
    return result;
}

function defineNegatives(mutations: Mutation[]): void {
    for (const mutation of mutations) {
        test(mutation.name, () => {
            const built = build(mutation.caseIndex ?? 0, { mutate: mutation.mutate, failures: mutation.failures });
            mutation.afterWrite?.(built);
            expectNoAdmission(built);
        });
    }
}

// ---------------------------------------------------------------------------
// Fixture provenance
// ---------------------------------------------------------------------------

test('portable fixture keeps explicit unit-only provenance and raw unavailable body evidence', () => {
    assert.equal(fixture.unit_fixture_only, true);
    assert.equal(typeof fixture.provenance, 'string');
    assert.match(fixture.provenance, /NOT a native qualification receipt/);
    assert.match(fixture.source_capture_sha256, /^[0-9a-f]{64}$/);
    assert.match(fixture.source_cdp_sha256, /^[0-9a-f]{64}$/);
    assert.equal(fixture.failures.length, 2);
    assert.equal(fixture.artifact.body_attempts.length, 2);
    for (const attempt of fixture.artifact.body_attempts as any[]) {
        assert.equal(attempt.state, 'error');
        assert.equal(attempt.byte_count, null);
        assert.equal(attempt.sha256, null);
    }
});

// ---------------------------------------------------------------------------
// Positive admissions (expected RED against the fail-closed scaffold)
// ---------------------------------------------------------------------------

const POSITIVE_CASES: Array<{ index: number; label: string }> = [
    { index: 0, label: 'ambient_warroom' },
    { index: 1, label: 'ambient_field' },
];

for (const retained of POSITIVE_CASES) {
    test(`admits the retained ${retained.label} buffered loop abort under the full native proof contract`, () => {
        const built = build(retained.index);
        const originalFailure = clone(fixture.failures[retained.index]);
        const chain = chainOf(built.parts.artifact, retained.index);

        const result = attributeBufferedAmbientLoopAborts(built.input);

        assert.deepEqual(result.remaining, [], 'a fully proven failure must be attributed, not left raw');
        assert.equal(result.expected.length, 1, 'exactly one expected admission entry');

        const entry = result.expected[0];
        assert.equal(entry.allowlist, ALLOWLIST);
        for (const key of Object.keys(originalFailure)) {
            assert.deepEqual(entry[key], originalFailure[key], `expected entry must copy raw failure field ${key}`);
        }

        const proof = entry.bufferedLoopProof;
        assert.ok(proof && typeof proof === 'object', 'expected entry must carry bufferedLoopProof facts');
        assert.equal(proof.artifact.path, built.path);
        assert.equal(proof.artifact.sha256, built.sha256);
        assert.equal(proof.elementId, `media:${retained.index + 1}`);
        assert.equal(proof.sourceEpoch, 1);
        assert.equal(proof.requestId, chain.request.request_id);
        for (const key of ['clocks', 'buffers', 'wrap', 'continuation']) {
            assert.ok(proof[key] && typeof proof[key] === 'object', `proof must carry ${key} facts`);
        }
        assert.ok(proof.body && typeof proof.body === 'object', 'proof must state body availability explicitly');
        assert.equal(proof.body.sha256, null, 'unavailable body evidence must never invent a SHA256');
        assert.equal(proof.body.byteCount, null);
        assert.equal(typeof proof.body.state, 'string');
        assert.notEqual(proof.body.state.length, 0);

        assert.deepEqual(built.input.networkFailures, [originalFailure], 'raw failure input must stay immutable');
        assert.deepEqual(built.input.lifecycleSignals, fixture.signals, 'raw lifecycle signals must stay immutable');
    });
}

// ---------------------------------------------------------------------------
// Receipt path, bytes, schema and status
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a missing sidecar receipt file',
        afterWrite: (built) => {
            rmSync(built.path, { force: true });
            assert.equal(existsSync(built.path), false);
        },
    },
    {
        name: 'rejects receipt bytes tampered after the recorded sha256',
        afterWrite: (built) => {
            appendFileSync(built.path, ' ');
            assert.notEqual(sha256(readFileSync(built.path)), built.sha256);
        },
    },
    {
        name: 'rejects a stale receipt sha256 that does not match the sidecar bytes',
        afterWrite: (built) => {
            built.input.cdpReceipt.sha256 = '0'.repeat(64);
        },
    },
    {
        name: 'rejects a receipt path that is not the exact expected sidecar path',
        afterWrite: (built) => {
            const other = join(dirname(built.path), 'other-sidecar.json');
            writeFileSync(other, readFileSync(built.path));
            built.input.cdpReceipt.path = other;
        },
    },
    {
        name: 'rejects a receipt with no sha256',
        afterWrite: (built) => {
            delete built.input.cdpReceipt.sha256;
        },
    },
    {
        name: 'rejects a receipt whose status is not complete',
        afterWrite: (built) => {
            built.input.cdpReceipt.status = 'partial';
        },
    },
    {
        name: 'rejects a sidecar schema older than collector v3',
        mutate: (parts) => {
            parts.artifact.schema = 'awwv.r8-warroom.cdp-network-collection.v2';
        },
    },
    {
        name: 'rejects a receipt schema that disagrees with the sidecar schema',
        afterWrite: (built) => {
            built.input.cdpReceipt.schema = 'awwv.r8-warroom.cdp-network-collection.v2';
        },
    },
    {
        name: 'rejects a tampered receipt for the retained ambient_field case',
        caseIndex: 1,
        afterWrite: (built) => {
            built.input.cdpReceipt.sha256 = 'f'.repeat(64);
        },
    },
]);

// ---------------------------------------------------------------------------
// Collector completeness: status, setup, flush, errors, overflow, pending
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects collector setup that is not ready',
        mutate: (parts) => {
            parts.artifact.setup.state = 'error';
        },
    },
    {
        name: 'rejects an incomplete collector status',
        mutate: (parts) => {
            parts.artifact.status = 'incomplete';
        },
    },
    {
        name: 'rejects a collector that presents itself as admitting',
        mutate: (parts) => {
            parts.artifact.non_admitting = false;
        },
    },
    {
        name: 'rejects collector inconsistencies',
        mutate: (parts) => {
            parts.artifact.inconsistencies = ['sequence-gap'];
        },
    },
    {
        name: 'rejects collector overflow receipts',
        mutate: (parts) => {
            parts.artifact.overflow_receipts = [{ kind: 'eventRows' }];
        },
    },
    {
        name: 'rejects an unclosed flush state',
        mutate: (parts) => {
            parts.artifact.flush.state = 'open';
        },
    },
    {
        name: 'rejects a flush that never detached',
        mutate: (parts) => {
            parts.artifact.flush.detach = 'attached';
        },
    },
    {
        name: 'rejects pending work at the flush deadline',
        mutate: (parts) => {
            parts.artifact.flush.pending_at_deadline = 1;
        },
    },
    {
        name: 'rejects pending work in the collector summary',
        mutate: (parts) => {
            parts.artifact.summary.pending_at_flush = 1;
        },
    },
    {
        name: 'rejects a collector cap violation',
        mutate: (parts) => {
            parts.artifact.summary.cap_violations = 1;
        },
    },
    {
        name: 'rejects a collector stopped before the failure row',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            parts.artifact.observation_stopped_at_sequence = chain.request.sequence;
        },
    },
]);

// ---------------------------------------------------------------------------
// CDP chain identity, order, target, frame, loader and duplicate rows
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a duplicate request row for one failure chain',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            parts.artifact.events.push(clone(chain.request));
        },
    },
    {
        name: 'rejects a duplicate response row for one failure chain',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            parts.artifact.events.push(clone(chain.response));
        },
    },
    {
        name: 'rejects a duplicate failure row for one failure chain',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            parts.artifact.events.push(clone(chain.failure));
        },
    },
    {
        name: 'rejects a second body attempt for one request',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            parts.artifact.body_attempts.push(clone(chain.body));
        },
    },
    {
        name: 'rejects a failure chain with no body attempt',
        mutate: (parts) => {
            parts.artifact.body_attempts.length = 0;
        },
    },
    {
        name: 'rejects a failure row that points at an unknown request id',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.request_id = '24304.99999';
        },
    },
    {
        name: 'rejects a request observed outside the selected target frame',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).request.frame_id = 'frame-not-selected';
        },
    },
    {
        name: 'rejects a request with an empty loader id',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).request.loader_id = '';
        },
    },
    {
        name: 'rejects a request with no loader id',
        mutate: (parts) => {
            delete chainOf(parts.artifact, parts.index).request.loader_id;
        },
    },
    {
        name: 'rejects a failure row from another target generation',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.generation = 2;
        },
    },
    {
        name: 'rejects a response from another observer session',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.observer_session_id = 'cdp-observer-other';
        },
    },
    {
        name: 'rejects a tainted chain',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.chain_tainted = true;
        },
    },
    {
        name: 'rejects a redirected request',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).request.redirect_present = true;
        },
    },
    {
        name: 'rejects a chain with a finish row before the failure',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            parts.artifact.events.push({
                observer_session_id: chain.failure.observer_session_id,
                sequence: chain.failure.sequence + 1,
                kind: 'finish',
                request_id: chain.failure.request_id,
                generation: chain.failure.generation,
                timestamp: chain.failure.timestamp + 0.001,
                chain_tainted: false,
                observed_at_ms: chain.failure.observed_at_ms + 1,
            });
        },
    },
    {
        name: 'rejects a chain whose sequence numbers are not strictly ordered',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.response.sequence = chain.request.sequence;
        },
    },
    {
        name: 'rejects a response observed after the terminal failure',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.response.observed_at_ms = chain.failure.observed_at_ms + 5;
        },
    },
    {
        name: 'rejects a terminal timestamp earlier than the response timestamp',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.failure.timestamp = chain.response.timestamp - 0.0005;
        },
    },
    {
        name: 'rejects a non-GET request',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).request.method = 'POST';
        },
    },
    {
        name: 'rejects a non-Media resource type',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).request.resource_type = 'XHR';
        },
    },
    {
        name: 'rejects a main-frame failure',
        mutate: (parts) => {
            parts.failures[0].isMainFrame = true;
        },
    },
    {
        name: 'rejects a failure captured during teardown',
        mutate: (parts) => {
            parts.failures[0].teardownStarted = true;
        },
    },
    {
        name: 'rejects an empty selected target id',
        mutate: (parts) => {
            parts.artifact.session.target.target_id = '';
        },
    },
]);

// ---------------------------------------------------------------------------
// Asset URL identity: local origin, port, no query/fragment/userinfo, ambient asset
// ---------------------------------------------------------------------------

const ASSET_URL = 'http://127.0.0.1:50306/assets/ambient_warroom-CO4FPnyV.ogg';

defineNegatives([
    {
        name: 'rejects an asset URL that is not the local 127.0.0.1 origin',
        mutate: (parts) => {
            setAssetUrl(parts, ASSET_URL.replace('127.0.0.1', 'example.com'));
        },
    },
    {
        name: 'rejects an asset URL on a different port',
        mutate: (parts) => {
            setAssetUrl(parts, ASSET_URL.replace(':50306', ':50307'));
        },
    },
    {
        name: 'rejects an asset URL with a query string',
        mutate: (parts) => {
            setAssetUrl(parts, `${ASSET_URL}?cache=1`);
            assert.equal(chainOf(parts.artifact, parts.index).request.url.had_query, true);
        },
    },
    {
        name: 'rejects an asset URL with a fragment',
        mutate: (parts) => {
            setAssetUrl(parts, `${ASSET_URL}#loop`);
            assert.equal(chainOf(parts.artifact, parts.index).request.url.had_fragment, true);
        },
    },
    {
        name: 'rejects an asset URL with userinfo',
        mutate: (parts) => {
            setAssetUrl(parts, ASSET_URL.replace('http://', 'http://user:secret@'));
            assert.equal(chainOf(parts.artifact, parts.index).request.url.had_userinfo, true);
        },
    },
    {
        name: 'rejects an asset that is not an ambient warroom, field or archive file',
        mutate: (parts) => {
            setAssetUrl(parts, 'http://127.0.0.1:50306/assets/ambient_other-CO4FPnyV.ogg');
        },
    },
]);

// ---------------------------------------------------------------------------
// Range, cache, status and response headers
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a CDP request range that does not open at byte zero',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).request.actual_range.value = 'bytes=100-';
        },
    },
    {
        name: 'rejects a CDP request with no range',
        mutate: (parts) => {
            delete chainOf(parts.artifact, parts.index).request.actual_range;
        },
    },
    {
        name: 'rejects a Playwright request range that is not bytes=0-',
        mutate: (parts) => {
            parts.failures[0].requestRange.value = 'bytes=0-1';
        },
    },
    {
        name: 'rejects a response status other than 206',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.status = 200;
        },
    },
    {
        name: 'rejects a Content-Range total that does not match the resource size',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.content_range.value = 'bytes 0-206419/206421';
        },
    },
    {
        name: 'rejects a Content-Range end that is not N-1',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.content_range.value = 'bytes 0-206418/206420';
        },
    },
    {
        name: 'rejects a Content-Range that does not start at byte zero',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.content_range.value = 'bytes 1-206419/206420';
        },
    },
    {
        name: 'rejects a Content-Length that disagrees with Content-Range',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.content_length.value = '206419';
        },
    },
    {
        name: 'rejects a response without byte range support',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.accept_ranges.value = 'none';
        },
    },
    {
        name: 'rejects an audio mime type other than ogg or octet-stream',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.mime_type = 'audio/mpeg';
        },
    },
    {
        name: 'rejects a response that is not a cached partial response',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.from_disk_cache = false;
        },
    },
    {
        name: 'rejects a response served by a service worker',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.from_service_worker = true;
        },
    },
    {
        name: 'rejects a failure text other than net::ERR_ABORTED',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.error_text = 'net::ERR_FAILED';
        },
    },
    {
        name: 'rejects a failure that was not canceled',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.canceled = false;
        },
    },
    {
        name: 'rejects an abort with a blocked reason',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.blocked_reason = 'inspector';
        },
    },
    {
        name: 'rejects a failure the collector did not mark as a candidate',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.candidate = false;
        },
    },
    {
        name: 'rejects a candidate that carries disqualification reasons',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).failure.disqualification_reasons = ['redirect'];
        },
    },
    {
        name: 'rejects a body attempt that is still pending',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).body.state = 'pending';
        },
    },
    {
        name: 'rejects a truncated body attempt',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).body.state = 'truncated';
        },
    },
    {
        name: 'rejects a captured body with no valid sha256',
        mutate: (parts) => {
            const body = chainOf(parts.artifact, parts.index).body;
            body.state = 'captured';
            body.byte_count = 10;
            body.sha256 = null;
        },
    },
    {
        name: 'rejects an errored body attempt that invents a sha256',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).body.sha256 = 'a'.repeat(64);
        },
    },
    {
        name: 'rejects a body attempt settled before its trigger',
        mutate: (parts) => {
            const body = chainOf(parts.artifact, parts.index).body;
            body.settled_sequence = body.trigger_sequence - 1;
        },
    },
    {
        name: 'rejects a body attempt that does not match the failure trigger',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).body.trigger_sequence += 1;
        },
    },
    {
        name: 'rejects a body attempt for another request id',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).body.request_id = '24304.99999';
        },
    },
]);

// ---------------------------------------------------------------------------
// Clocks: finite numeric, unique alignment, stale and inconsistent inputs
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a request with no wall_time_s',
        mutate: (parts) => {
            delete chainOf(parts.artifact, parts.index).request.wall_time_s;
        },
    },
    {
        name: 'rejects a string wall_time_s',
        mutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            request.wall_time_s = String(request.wall_time_s);
        },
    },
    {
        name: 'rejects a wall_time_s stale by half a second',
        mutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            request.wall_time_s += 0.5;
        },
    },
    {
        name: 'rejects a wall_time_s outside the 20ms Playwright alignment fence',
        mutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            request.wall_time_s += 0.021;
        },
    },
    {
        name: 'rejects a request with no protocol timestamp',
        mutate: (parts) => {
            delete chainOf(parts.artifact, parts.index).request.timestamp;
        },
    },
    {
        name: 'rejects a string protocol timestamp',
        mutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            request.timestamp = String(request.timestamp);
        },
    },
    {
        name: 'rejects a request with no observed_at_ms',
        mutate: (parts) => {
            delete chainOf(parts.artifact, parts.index).request.observed_at_ms;
        },
    },
    {
        name: 'rejects observed_at_ms more than 20ms from the protocol timestamp',
        mutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            request.observed_at_ms += 500;
        },
    },
    {
        name: 'rejects a response with a non-finite observed_at_ms',
        mutate: (parts) => {
            chainOf(parts.artifact, parts.index).response.observed_at_ms = null;
        },
    },
    {
        name: 'rejects a Playwright failure clock that disagrees with the CDP chain',
        mutate: (parts) => {
            parts.failures[0].observedAtMs += 500;
        },
    },
    {
        name: 'rejects a string signal observation clock',
        mutate: (parts) => {
            const signal = preSeekSample(parts);
            signal.observedAtMs = String(signal.observedAtMs);
        },
    },
    {
        name: 'rejects a signal with no observation clock',
        mutate: (parts) => {
            delete preSeekSample(parts).observedAtMs;
        },
    },
]);

// ---------------------------------------------------------------------------
// Lifecycle element/sourceEpoch identity, signal order and media ranges
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a failure with no lifecycle signals',
        mutate: (parts) => {
            parts.signals.length = 0;
        },
    },
    {
        name: 'rejects a signal with no sourceEpoch',
        mutate: (parts) => {
            delete preSeekSample(parts).sourceEpoch;
        },
    },
    {
        name: 'rejects a sourceEpoch change inside one playback chain',
        mutate: (parts) => {
            seekedOf(parts).sourceEpoch = 2;
        },
    },
    {
        name: 'rejects a second element reporting the same asset',
        mutate: (parts) => {
            const signals = caseSignals(parts);
            const last = signals[signals.length - 1];
            parts.signals.push({
                ...clone(playAfterSeek(parts)),
                elementId: 'media:9',
                signalSequence: last.signalSequence + 1,
                observedAtMs: last.observedAtMs + 1,
            });
        },
    },
    {
        name: 'rejects duplicate signal sequence numbers',
        mutate: (parts) => {
            preSeekSample(parts).signalSequence = preSeekSample(parts).signalSequence - 1;
        },
    },
    {
        name: 'rejects non-monotonic signal observation clocks',
        mutate: (parts) => {
            caseSignals(parts, 'playing')[0].observedAtMs = 1793225069000;
        },
    },
    {
        name: 'rejects unavailable media state',
        mutate: (parts) => {
            preSeekSample(parts).mediaStateUnavailable = ['buffered'];
        },
    },
    {
        name: 'rejects media state read errors',
        mutate: (parts) => {
            preSeekSample(parts).mediaStateReadErrors = { buffered: 'not-readable' };
        },
    },
    {
        name: 'rejects buffered ranges with a gap',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[-0.002667, 10], [20, 30]]);
        },
    },
    {
        name: 'rejects buffered coverage that starts late',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[5, 30]]);
        },
    },
    {
        name: 'rejects buffered coverage that ends before the duration',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[-0.002667, 29.5]]);
        },
    },
    {
        name: 'rejects a non-numeric buffered bound',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[-0.002667, '30']]);
        },
    },
    {
        name: 'rejects unordered buffered ranges',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[20, 30], [-0.002667, 30]]);
        },
    },
    {
        name: 'rejects inverted buffered ranges',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[30, -0.002667]]);
        },
    },
    {
        name: 'rejects seekable ranges with a gap',
        mutate: (parts) => {
            setRanges(parts, 'seekable', [[0, 10], [20, 30]]);
        },
    },
    {
        name: 'rejects an empty seekable range',
        mutate: (parts) => {
            setRanges(parts, 'seekable', []);
        },
    },
    {
        name: 'rejects a media element error',
        mutate: (parts) => {
            finalSample(parts).mediaState.mediaError = { code: 2, message: 'MEDIA_ERR_NETWORK' };
        },
    },
    {
        name: 'rejects ended playback on the confirmation sample',
        mutate: (parts) => {
            finalSample(parts).mediaState.ended = true;
        },
    },
    {
        name: 'rejects a confirmation sample that is not ready for playback',
        mutate: (parts) => {
            finalSample(parts).mediaState.readyState = 3;
        },
    },
]);

// ---------------------------------------------------------------------------
// Natural wrap: pre-seek position, zero seek, timing and seeked/playing events
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a chain with no natural wrap candidate before the seek',
        mutate: (parts) => {
            const candidates = unpausedPreSeekSamples(parts);
            assert.ok(candidates.length > 0);
            for (const signal of candidates) signal.mediaState.currentTime = 0;
        },
    },
    {
        name: 'rejects a chain whose pre-seek samples are paused',
        mutate: (parts) => {
            const candidates = unpausedPreSeekSamples(parts);
            assert.ok(candidates.length > 0);
            for (const signal of candidates) signal.mediaState.paused = true;
        },
    },
    {
        name: 'rejects a wrap that does not seek to zero',
        mutate: (parts) => {
            seekSignal(parts).mediaState.currentTime = 0.5;
            seekedOf(parts).mediaState.currentTime = 0.5;
        },
    },
    {
        name: 'rejects a seek that does not align with the request within 20ms',
        mutate: (parts) => {
            seekSignal(parts).observedAtMs -= 100;
        },
    },
    {
        name: 'rejects a wrap whose elapsed time does not predict reaching the duration within 100ms',
        mutate: (parts) => {
            preSeekSample(parts).mediaState.currentTime = 28;
        },
    },
    {
        name: 'rejects a chain without a seeked event',
        mutate: (parts) => {
            const seeked = seekedOf(parts);
            parts.signals.splice(parts.signals.indexOf(seeked), 1);
        },
    },
    {
        name: 'rejects a seeked event that is still seeking',
        mutate: (parts) => {
            seekedOf(parts).mediaState.seeking = true;
        },
    },
    {
        name: 'rejects a seeked event that is not ready4',
        mutate: (parts) => {
            seekedOf(parts).mediaState.readyState = 2;
        },
    },
    {
        name: 'rejects a chain without playing after the seek',
        mutate: (parts) => {
            const playing = playAfterSeek(parts);
            parts.signals.splice(parts.signals.indexOf(playing), 1);
        },
    },
    {
        name: 'rejects playing after the seek that is not at zero',
        mutate: (parts) => {
            playAfterSeek(parts).mediaState.currentTime = 0.4;
        },
    },
    {
        name: 'rejects a chain with no post-wrap advancement',
        mutate: (parts) => {
            finalSample(parts).mediaState.currentTime = 0;
        },
    },
    {
        name: 'rejects continuation that disagrees with elapsed wall time beyond 250ms',
        mutate: (parts) => {
            finalSample(parts).mediaState.currentTime = 0.4;
        },
    },
    {
        name: 'rejects a stalled event between the seek and the confirmation sample',
        mutate: (parts) => {
            playAfterSeek(parts).kind = 'stalled';
        },
    },
    {
        name: 'rejects an error event between the seek and the confirmation sample',
        mutate: (parts) => {
            const playing = playAfterSeek(parts);
            playing.kind = 'error';
            playing.mediaState.mediaError = { code: 2, message: 'MEDIA_ERR_NETWORK' };
        },
    },
    {
        name: 'rejects an emptied event between the seek and the confirmation sample',
        mutate: (parts) => {
            playAfterSeek(parts).kind = 'emptied';
        },
    },
    {
        name: 'rejects a load event between the seek and the confirmation sample',
        mutate: (parts) => {
            playAfterSeek(parts).kind = 'load';
        },
    },
    {
        name: 'rejects an intervening pause before the confirmation sample',
        mutate: (parts) => {
            const playing = playAfterSeek(parts);
            playing.kind = 'pause';
            playing.mediaState.paused = true;
            playing.mediaState.currentTime = 0.2;
        },
    },
    {
        name: 'rejects a duration change on the confirmation sample',
        mutate: (parts) => {
            const sample = finalSample(parts);
            sample.mediaState.duration = 31;
            sample.mediaState.buffered = [[-0.002667, 31]];
            sample.mediaState.seekable = [[-0.002667, 31]];
        },
    },
    {
        name: 'rejects loop disabled on the confirmation sample',
        mutate: (parts) => {
            finalSample(parts).mediaState.loop = false;
        },
    },
    {
        name: 'rejects a sourceEpoch change on the confirmation sample',
        mutate: (parts) => {
            finalSample(parts).sourceEpoch = 2;
        },
    },
    {
        name: 'rejects a retained ambient_field chain without a natural wrap',
        caseIndex: 1,
        mutate: (parts) => {
            const candidates = unpausedPreSeekSamples(parts);
            assert.ok(candidates.length > 0);
            for (const signal of candidates) signal.mediaState.currentTime = 0;
        },
    },
]);

// ---------------------------------------------------------------------------
// Independent review regressions: strict-proof omissions
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a protocol timeline that no longer projects onto the observed clocks',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.failure.timestamp += 3600;
            assert.ok(chain.failure.timestamp > chain.response.timestamp);
        },
    },
    {
        name: 'rejects reversed overlapping buffered ranges',
        mutate: (parts) => {
            setRanges(parts, 'buffered', [[-0.002667, 30], [-1, 20]]);
        },
    },
    {
        name: 'rejects reversed overlapping seekable ranges',
        mutate: (parts) => {
            setRanges(parts, 'seekable', [[-0.002667, 30], [-1, 20]]);
        },
    },
    {
        name: 'rejects a captured body whose length is not the response total',
        mutate: (parts) => {
            const body = chainOf(parts.artifact, parts.index).body;
            body.state = 'captured';
            body.byte_count = 1;
            body.sha256 = '0'.repeat(64);
            body.error = null;
        },
    },
    {
        name: 'rejects an intervening pause method with no valid progression',
        mutate: (parts) => {
            const terminal = finalSample(parts);
            const playing = playAfterSeek(parts);
            const intruder = clone(playing);
            intruder.kind = 'pause';
            intruder.signalSequence = terminal.signalSequence;
            intruder.observedAtMs = playing.observedAtMs + 800;
            intruder.mediaState.currentTime = 0;
            terminal.signalSequence = terminal.signalSequence + 1;
            const index = parts.signals.indexOf(terminal);
            parts.signals.splice(index, 0, intruder);
        },
    },
]);

// ---------------------------------------------------------------------------
// Window selection: request-correlated interval over full capture history
// ---------------------------------------------------------------------------

test('admits the request-correlated window despite earlier unloaded history and a previous loop', () => {
    const built = build(0, {
        mutate: (parts) => {
            parts.signals.unshift(
                historySignal({
                    kind: 'loadstart', sequence: 10, observedAtMs: 1793225060000, currentTime: 0,
                    readyState: 0, paused: true, duration: 0, buffered: [], seekable: [],
                }),
                historySignal({
                    kind: 'loadedmetadata', sequence: 11, observedAtMs: 1793225060100, currentTime: 0,
                    readyState: 1, paused: true, duration: 0, buffered: [], seekable: [],
                }),
                historySignal({
                    kind: 'seeking', sequence: 60, observedAtMs: 1793225065000, currentTime: 0,
                    readyState: 1, seeking: true,
                }),
                historySignal({
                    kind: 'playing', sequence: 61, observedAtMs: 1793225065100, currentTime: 0,
                    readyState: 4, seeking: false,
                }),
            );
        },
    });
    const signalsBefore = clone(built.input.lifecycleSignals);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'the request-correlated window must be admitted');
    assert.deepEqual(result.remaining, []);
    assert.equal(result.expected[0].bufferedLoopProof.elementId, 'media:1');
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'history must stay immutable');
});

test('admits the request-correlated window despite a later same-asset loop outside the request clock', () => {
    const built = build(0, {
        mutate: (parts) => {
            parts.signals.push(
                historySignal({
                    kind: 'seeking', sequence: 200, observedAtMs: 1793225090000, currentTime: 0,
                    readyState: 1, seeking: true,
                }),
                historySignal({
                    kind: 'playing', sequence: 201, observedAtMs: 1793225090010, currentTime: 0,
                    readyState: 4, seeking: false,
                }),
            );
        },
    });
    const signalsBefore = clone(built.input.lifecycleSignals);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'the later loop must not make the request window ambiguous');
    assert.deepEqual(result.remaining, []);
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'history must stay immutable');
});

test('admits a genuine advancing sample before the terminal pause-method wrapper', () => {
    const built = build(0, {
        mutate: (parts) => {
            const terminal = finalSample(parts);
            const playing = playAfterSeek(parts);
            const advance = clone(playing);
            advance.kind = 'playing';
            advance.signalSequence = terminal.signalSequence;
            advance.observedAtMs = playing.observedAtMs + 800;
            advance.mediaState.currentTime = 0.8;
            terminal.signalSequence = terminal.signalSequence + 1;
            const index = parts.signals.indexOf(terminal);
            parts.signals.splice(index, 0, advance);
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1);
    assert.deepEqual(result.remaining, []);
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(proof.continuation.sequence, 82, 'the first genuine advancement confirms the window');
    assert.equal(proof.continuation.kind, 'playing');
});

defineNegatives([
    {
        name: 'rejects a bad sample inside the chosen request window',
        mutate: (parts) => {
            seekedOf(parts).mediaStateReadErrors = { buffered: 'not-readable' };
        },
    },
    {
        name: 'rejects a competing element identity inside the chosen request window',
        mutate: (parts) => {
            seekedOf(parts).elementId = 'media:9';
        },
    },
    {
        name: 'rejects two seeking0 signals that both match the request clock',
        mutate: (parts) => {
            const seeking = seekSignal(parts);
            const duplicate = clone(seeking);
            duplicate.signalSequence = seeking.signalSequence + 1;
            duplicate.observedAtMs = seeking.observedAtMs;
            for (const signal of caseSignals(parts)) {
                if (signal.signalSequence >= duplicate.signalSequence) signal.signalSequence += 1;
            }
            const index = parts.signals.indexOf(seeking);
            parts.signals.splice(index + 1, 0, duplicate);
        },
    },
    {
        name: 'rejects a seeking0 whose clock is stale against the request',
        mutate: (parts) => {
            seekSignal(parts).observedAtMs += 500;
        },
    },
    {
        name: 'rejects a selected loop that no longer matches the request asset',
        mutate: (parts) => {
            seekSignal(parts).url = 'http://127.0.0.1:50306/assets/ambient_archive-ZZZZ1111.ogg';
        },
    },
    {
        name: 'rejects seeked and playing spread beyond one 100ms window from seeking',
        mutate: (parts) => {
            const seeking = seekSignal(parts);
            const seeked = seekedOf(parts);
            const playing = playAfterSeek(parts);
            seeked.observedAtMs = seeking.observedAtMs + 75;
            playing.observedAtMs = seeking.observedAtMs + 150;
            caseSignals(parts, 'canplay')[0].observedAtMs = seeking.observedAtMs + 110;
        },
    },
]);

// ---------------------------------------------------------------------------
// Cross-failure mapping: ambiguous reuse and unrelated survival
// ---------------------------------------------------------------------------

test('rejects a CDP chain reused across two retained failures so neither is admitted', () => {
    const built = build(0, {
        failures: 'both',
        mutate: (parts) => {
            const first = chainOf(parts.artifact, 0);
            const second = chainOf(parts.artifact, 1);
            second.failure.request_id = first.request.request_id;
            second.body.request_id = first.request.request_id;
            assert.notEqual(first.request.request_id, second.request.request_id);
        },
    });
    expectNoAdmission(built);
});

test('a rejected retained case leaves the unrelated raw failure and fixture provenance untouched', () => {
    const built = build(1, {
        failures: 'both',
        mutate: (parts) => {
            chainOf(parts.artifact, 1).body.state = 'pending';
        },
    });
    const rawA = clone(built.input.networkFailures[0]);
    const rawB = clone(built.input.networkFailures[1]);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.ok(
        result.remaining.some((failure: any) => JSON.stringify(failure) === JSON.stringify(rawB)),
        'the rejected failure must stay raw',
    );
    assert.equal(
        result.expected.filter((entry: any) => entry.url === rawB.url).length,
        0,
        'the mutated failure must never be admitted',
    );
    assert.deepEqual(built.input.networkFailures, [rawA, rawB], 'both raw failures must stay immutable');
    assert.equal(fixture.unit_fixture_only, true, 'fixture provenance must stay unit-only');
});
