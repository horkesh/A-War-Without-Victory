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
const ALLOWLIST_CACHED_RESPONSE = 'ambient-buffered-cached-response-proof-v2';
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
    windowMutate?: (parts: Parts) => void;
    afterWrite?: (built: Built) => void;
    failures?: 'single' | 'both';
};

// SYNTHETIC unit-test-only observation bounds. These are computed from the
// cloned temp artifact and its cloned signals so the portable fixture JSON
// stays byte-exact and is never retrofitted with invented real capture bounds.
function syntheticObservationWindow(parts: Parts): { clock: string; opened_at_ms: number; closed_at_ms: number } {
    const values: number[] = [];
    for (const signal of parts.signals) {
        if (typeof signal?.observedAtMs === 'number' && Number.isFinite(signal.observedAtMs)) values.push(signal.observedAtMs);
    }
    for (const event of parts.artifact.events) {
        if (typeof event?.observed_at_ms === 'number' && Number.isFinite(event.observed_at_ms)) values.push(event.observed_at_ms);
        if (event?.kind === 'request' && typeof event.wall_time_s === 'number' && Number.isFinite(event.wall_time_s)) {
            values.push(event.wall_time_s * 1000);
        }
    }
    for (const failure of parts.failures) {
        if (typeof failure?.observedAtMs === 'number' && Number.isFinite(failure.observedAtMs)) values.push(failure.observedAtMs);
        if (typeof failure?.requestInitiatedAtMs === 'number' && Number.isFinite(failure.requestInitiatedAtMs)) {
            values.push(failure.requestInitiatedAtMs);
        }
    }
    if (values.length === 0) return { clock: 'node-epoch-ms', opened_at_ms: 0, closed_at_ms: 0 };
    return {
        clock: 'node-epoch-ms',
        opened_at_ms: Math.min(...values) - 1,
        closed_at_ms: Math.max(...values) + 1,
    };
}

const FIXTURE_OBSERVATION_WINDOW = (() => {
    const observed = (fixture.signals as any[])
        .map((signal) => signal.observedAtMs)
        .filter((value) => typeof value === 'number' && Number.isFinite(value));
    return {
        clock: 'node-epoch-ms',
        opened_at_ms: Math.min(...observed) - 1,
        closed_at_ms: Math.max(...observed) + 1,
    };
})();

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

// Synthetic unit-only same-asset cycle. It clones the first retained chain and
// its lifecycle signals, then translates both onto a separate well-formed
// clock interval. This is test-local data only; the portable fixture JSON stays
// byte-exact and no real capture is relabelled with these timestamps.
function appendSyntheticCycle(parts: Parts, options: {
    requestId: string;
    sequenceOffset: number;
    timeOffsetMs: number;
    copySignals?: boolean;
    playingDelayMs?: number;
    sourceSignals?: any[];
}): { request: any; response: any; failure: any; body: any; signals: any[] } {
    const source = chainOf(parts.artifact, 0);
    const timeOffsetS = options.timeOffsetMs / 1000;

    const request = clone(source.request);
    request.request_id = options.requestId;
    request.sequence = source.request.sequence + options.sequenceOffset;
    request.timestamp = source.request.timestamp + timeOffsetS;
    request.wall_time_s = source.request.wall_time_s + timeOffsetS;
    request.observed_at_ms = source.request.observed_at_ms + options.timeOffsetMs;

    const response = clone(source.response);
    response.request_id = options.requestId;
    response.sequence = source.response.sequence + options.sequenceOffset;
    response.timestamp = source.response.timestamp + timeOffsetS;
    response.observed_at_ms = source.response.observed_at_ms + options.timeOffsetMs;

    const failure = clone(source.failure);
    failure.request_id = options.requestId;
    failure.sequence = source.failure.sequence + options.sequenceOffset;
    failure.timestamp = source.failure.timestamp + timeOffsetS;
    failure.observed_at_ms = source.failure.observed_at_ms + options.timeOffsetMs;

    const body = clone(source.body);
    body.request_id = options.requestId;
    body.trigger_sequence = failure.sequence;
    body.settled_sequence = source.body.settled_sequence + options.sequenceOffset;

    parts.artifact.events.push(request, response, failure);
    parts.artifact.body_attempts.push(body);

    const signals = options.copySignals === false
        ? []
        : (options.sourceSignals ?? caseSignals(parts)).map((signal: any) => {
            const copy = clone(signal);
            copy.signalSequence += options.sequenceOffset;
            copy.observedAtMs += options.timeOffsetMs;
            return copy;
        });

    if (options.playingDelayMs !== undefined && signals.length > 0) {
        const seeking = signals.find((signal: any) => signal.kind === 'seeking'
            && signal.mediaState?.currentTime === 0
            && signal.mediaState?.seeking === true);
        const playing = seeking
            ? signals.find((signal: any) => signal.kind === 'playing'
                && signal.mediaState?.currentTime === 0
                && signal.signalSequence > seeking.signalSequence)
            : undefined;
        assert.ok(seeking && playing, 'synthetic cycle must expose one seeking0/playing0 pair');
        playing.observedAtMs = seeking.observedAtMs + options.playingDelayMs;
    }

    parts.signals.push(...signals);
    return { request, response, failure, body, signals };
}

function appendSameAssetFailure(parts: Parts, timeOffsetMs: number): void {
    const duplicate = clone(parts.failures[0]);
    duplicate.observedAtMs += timeOffsetMs;
    duplicate.requestInitiatedAtMs += timeOffsetMs;
    parts.failures.push(duplicate);
}

// Retained diagnostic shape of the seventh RBiH media cancellation: the
// browser received the cached 206 headers 243.233ms after the request and the
// DOM completed the zero seek 0.027ms after that projected response. These are
// synthetic unit facts; no value here is a native qualification receipt.
const SLOW_RESPONSE_LATENCY_MS = 243.233;
const SLOW_RESPONSE_ALIGN_MS = 0.027;

// Same arithmetic as the checker: browser-projected request epoch plus the
// ordered protocol request->response delta. Boundary tests derive their target
// from this value rather than from a decimal constant so float representation of
// the epoch cannot move the intended 20ms fence.
function projectedResponseMsOf(chain: any): number {
    const requestProjectedAtMs = chain.request.wall_time_s * 1000;
    return requestProjectedAtMs + (chain.response.timestamp - chain.request.timestamp) * 1000;
}

function alignPostSeekSignals(signals: any[], responseProjectedMs: number, seekedAlignMs: number, playingAlignMs: number): {
    seeking: any;
    seeked: any;
    playing: any;
} {
    const seeking = signals.find((signal: any) => signal.kind === 'seeking'
        && signal.mediaState?.currentTime === 0
        && signal.mediaState?.seeking === true);
    const seeked = signals.find((signal: any) => signal.kind === 'seeked'
        && signal.mediaState?.currentTime === 0);
    assert.ok(seeking && seeked, 'slow cycle must expose one seeking0/seeked0 pair');
    const playing = signals.find((signal: any) => signal.kind === 'playing'
        && signal.mediaState?.currentTime === 0
        && signal.signalSequence > seeked.signalSequence);
    assert.ok(playing, 'slow cycle must expose one playing0 after seeked0');

    const deltaMs = responseProjectedMs + seekedAlignMs - seeked.observedAtMs;
    for (const signal of signals) {
        if (signal.signalSequence >= seeked.signalSequence) signal.observedAtMs += deltaMs;
    }
    seeked.observedAtMs = responseProjectedMs + seekedAlignMs;
    playing.observedAtMs = responseProjectedMs + playingAlignMs;
    return { seeking, seeked, playing };
}

// Convert one retained cycle into the slow cached-response shape in place.
function slowify(parts: Parts, options: {
    responseLatencyMs?: number;
    seekedFromResponseMs?: number;
    playingFromResponseMs?: number;
} = {}): { chain: any; seeking: any; seeked: any; playing: any; responseProjectedMs: number } {
    const latencyMs = options.responseLatencyMs ?? SLOW_RESPONSE_LATENCY_MS;
    const seekedAlignMs = options.seekedFromResponseMs ?? SLOW_RESPONSE_ALIGN_MS;
    const playingAlignMs = options.playingFromResponseMs ?? SLOW_RESPONSE_ALIGN_MS;
    const chain = chainOf(parts.artifact, parts.index);
    const latencyS = latencyMs / 1000;

    chain.response.timestamp = chain.request.timestamp + latencyS;
    chain.response.observed_at_ms = chain.request.observed_at_ms + latencyMs;
    chain.failure.timestamp = chain.response.timestamp + 0.0005;
    chain.failure.observed_at_ms = chain.response.observed_at_ms + 1;
    parts.failures[0].observedAtMs = chain.failure.observed_at_ms;

    const responseProjectedMs = projectedResponseMsOf(chain);
    const aligned = alignPostSeekSignals(caseSignals(parts), responseProjectedMs, seekedAlignMs, playingAlignMs);
    return { chain, ...aligned, responseProjectedMs };
}

// Move the completion lifecycle (seeked and everything after it) to a chosen
// delay measured from the actual seeking event, preserving relative order.
function setCompletionDelay(parts: Parts, delayMs: number): { seeking: any; seeked: any; playing: any } {
    const signals = caseSignals(parts);
    const seeking = signals.find((signal: any) => signal.kind === 'seeking'
        && signal.mediaState?.currentTime === 0
        && signal.mediaState?.seeking === true);
    const seeked = signals.find((signal: any) => signal.kind === 'seeked'
        && signal.mediaState?.currentTime === 0);
    const playing = signals.find((signal: any) => signal.kind === 'playing'
        && signal.mediaState?.currentTime === 0
        && signal.signalSequence > seeked.signalSequence);
    assert.ok(seeking && seeked && playing, 'cycle must expose one seeking0/seeked0/playing0');
    const targetMs = seeking.observedAtMs + delayMs;
    const deltaMs = targetMs - seeked.observedAtMs;
    for (const signal of signals) {
        if (signal.signalSequence >= seeked.signalSequence) signal.observedAtMs += deltaMs;
    }
    seeked.observedAtMs = targetMs;
    playing.observedAtMs = targetMs;
    return { seeking, seeked, playing };
}

// Append a separate same-asset slow cycle with its own raw failure.
function appendSlowCycle(parts: Parts, options: {
    requestId: string;
    sequenceOffset: number;
    timeOffsetMs: number;
    sourceSignals?: any[];
    responseLatencyMs?: number;
    seekedFromResponseMs?: number;
    playingFromResponseMs?: number;
}): { request: any; response: any; failure: any; body: any; signals: any[]; rawFailure: any; chain: any } {
    const latencyMs = options.responseLatencyMs ?? SLOW_RESPONSE_LATENCY_MS;
    const seekedAlignMs = options.seekedFromResponseMs ?? SLOW_RESPONSE_ALIGN_MS;
    const playingAlignMs = options.playingFromResponseMs ?? SLOW_RESPONSE_ALIGN_MS;
    const cycle = appendSyntheticCycle(parts, {
        requestId: options.requestId,
        sequenceOffset: options.sequenceOffset,
        timeOffsetMs: options.timeOffsetMs,
        sourceSignals: options.sourceSignals,
    });
    const latencyS = latencyMs / 1000;

    cycle.response.timestamp = cycle.request.timestamp + latencyS;
    cycle.response.observed_at_ms = cycle.request.observed_at_ms + latencyMs;
    cycle.failure.timestamp = cycle.response.timestamp + 0.0005;
    cycle.failure.observed_at_ms = cycle.response.observed_at_ms + 1;

    const responseProjectedMs = projectedResponseMsOf(cycle);
    alignPostSeekSignals(cycle.signals, responseProjectedMs, seekedAlignMs, playingAlignMs);

    const rawFailure = clone(fixture.failures[0]);
    rawFailure.observedAtMs = cycle.failure.observed_at_ms + 1;
    rawFailure.requestInitiatedAtMs = cycle.request.observed_at_ms;
    parts.failures.push(rawFailure);

    const chain = {
        request: cycle.request,
        response: cycle.response,
        failure: cycle.failure,
        body: cycle.body,
    };
    return { ...cycle, chain, rawFailure };
}

function retainOnlyChain(parts: Parts, requestId: string): void {
    parts.artifact.events = parts.artifact.events.filter((event: any) => event.request_id === requestId);
    parts.artifact.body_attempts = parts.artifact.body_attempts.filter((attempt: any) => attempt.request_id === requestId);
}

function build(index: number, options: {
    mutate?: (parts: Parts) => void;
    windowMutate?: (parts: Parts) => void;
    failures?: 'single' | 'both';
} = {}): Built {
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
    // Only the cloned temporary artifact is augmented. The fixture JSON itself
    // remains byte-exact and no real capture is ever retrofitted with bounds.
    parts.artifact.observation_window = syntheticObservationWindow(parts);
    options.windowMutate?.(parts);

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
            const built = build(mutation.caseIndex ?? 0, {
                mutate: mutation.mutate,
                windowMutate: mutation.windowMutate,
                failures: mutation.failures,
            });
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

test('admits a genuine same-session abort whose Node callbacks are delivered 28ms after the browser events', () => {
    const built = build(0, {
        mutate: (parts) => {
            for (const event of parts.artifact.events) event.observed_at_ms += 28;
            for (const failure of parts.failures) {
                failure.requestInitiatedAtMs += 28;
                failure.observedAtMs += 28;
            }
        },
    });
    const expectedFailure = clone(built.input.networkFailures[0]);
    const expectedSignals = clone(built.input.lifecycleSignals);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'a delayed but genuine delivery inside the window must be admitted');
    assert.deepEqual(result.remaining, []);
    const proof = result.expected[0].bufferedLoopProof;
    assert.ok(proof.clocks.deliveryLagMs.request >= 20, 'request delivery lag must remain explicit evidence');
    assert.ok(proof.clocks.deliveryLagMs.failure >= 20, 'failure delivery lag must remain explicit evidence');
    assert.equal(proof.clocks.requestAlignmentMs, -1, 'same-domain Node request callbacks must still agree');
    assert.equal(proof.clocks.failureAlignmentMs, -1, 'same-domain Node failure callbacks must still agree');
    assert.ok(Math.abs(proof.clocks.seekAlignmentMs) <= 20, 'DOM seeking still correlates with the browser request epoch');
    assert.equal(proof.clocks.observationWindow.clock, 'node-epoch-ms');
    assert.ok(proof.clocks.observationWindow.openedAtMs <= proof.clocks.nodeObservedAtMs.request);
    assert.ok(proof.clocks.observationWindow.closedAtMs >= proof.clocks.nodeObservedAtMs.failure);
    assert.deepEqual(built.input.networkFailures, [expectedFailure], 'raw failure input must stay immutable');
    assert.deepEqual(built.input.lifecycleSignals, expectedSignals, 'lifecycle signals must stay immutable');
});

test('admits seeked and playing exactly at the finite 100ms boundary from seeking', () => {
    const built = build(0, {
        mutate: (parts) => {
            const seeking = seekSignal(parts);
            const seeked = seekedOf(parts);
            const playing = playAfterSeek(parts);
            seeked.observedAtMs = seeking.observedAtMs + 40;
            for (const signal of caseSignals(parts)) {
                if (signal.signalSequence > seeked.signalSequence && signal.signalSequence < playing.signalSequence) {
                    signal.observedAtMs = seeking.observedAtMs + 40;
                }
            }
            playing.observedAtMs = seeking.observedAtMs + 100;
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'exactly 100ms from seeking remains inside the finite boundary');
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(proof.wrap.seekedDelayMs, 40);
    assert.equal(proof.wrap.playingDelayMs, 100);
});

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
        // Retargeted: this is no longer a browser-vs-Node alignment test. A
        // browser request epoch 21ms later than the CDP Node delivery would
        // mean delivery preceded its own event by more than the 20ms fence.
        name: 'rejects a browser request epoch that Node delivery precedes by more than 20ms',
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
        // Retargeted: the old +500 mutation compared Node delivery with the
        // browser protocol epoch, which is not a meaningful pair. The genuine
        // same-domain defect is delivery arriving before its own browser event
        // epoch. All Node clocks move together so ordering and Node/PW pairing
        // stay intact and only the delivery direction is wrong.
        name: 'rejects Node delivery more than 20ms before its corresponding browser epoch',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.request.observed_at_ms -= 25;
            chain.response.observed_at_ms -= 25;
            chain.failure.observed_at_ms -= 25;
            parts.failures[0].requestInitiatedAtMs -= 25;
            parts.failures[0].observedAtMs -= 25;
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
// Observation window and clock-domain separation
// ---------------------------------------------------------------------------

defineNegatives([
    {
        name: 'rejects a sidecar with no observation window',
        windowMutate: (parts) => {
            delete parts.artifact.observation_window;
        },
    },
    {
        name: 'rejects an observation window with the wrong clock domain',
        windowMutate: (parts) => {
            parts.artifact.observation_window.clock = 'browser-performance-ms';
        },
    },
    {
        name: 'rejects string observation window bounds',
        windowMutate: (parts) => {
            parts.artifact.observation_window.opened_at_ms = String(parts.artifact.observation_window.opened_at_ms);
        },
    },
    {
        name: 'rejects non-finite observation window bounds',
        windowMutate: (parts) => {
            parts.artifact.observation_window.closed_at_ms = null;
        },
    },
    {
        name: 'rejects inverted observation window bounds',
        windowMutate: (parts) => {
            const window = parts.artifact.observation_window;
            const opened = window.opened_at_ms;
            window.opened_at_ms = window.closed_at_ms;
            window.closed_at_ms = opened;
        },
    },
    {
        name: 'rejects browser-derived request epochs outside the observation window',
        mutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            request.wall_time_s += 120;
        },
    },
    {
        name: 'rejects a protocol failure epoch projected outside the observation window',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.failure.timestamp += 120;
        },
    },
    {
        name: 'rejects a selected DOM lifecycle sample outside the observation window',
        windowMutate: (parts) => {
            parts.artifact.observation_window.closed_at_ms = finalSample(parts).observedAtMs - 30;
        },
    },
    {
        name: 'rejects Node callbacks outside the observation window even when delivery ordering is lawful',
        mutate: (parts) => {
            const chain = chainOf(parts.artifact, parts.index);
            chain.request.observed_at_ms -= 15;
            chain.response.observed_at_ms -= 15;
            chain.failure.observed_at_ms -= 15;
            parts.failures[0].requestInitiatedAtMs -= 15;
            parts.failures[0].observedAtMs -= 15;
        },
        windowMutate: (parts) => {
            const request = chainOf(parts.artifact, parts.index).request;
            const projected = request.wall_time_s * 1000;
            parts.artifact.observation_window.opened_at_ms = projected + 19;
        },
    },
    {
        name: 'rejects mismatched CDP Node request and Playwright request callback clocks',
        mutate: (parts) => {
            parts.failures[0].requestInitiatedAtMs += 25;
        },
    },
    {
        name: 'rejects mismatched CDP Node failure and Playwright failure callback clocks',
        mutate: (parts) => {
            parts.failures[0].observedAtMs += 25;
        },
    },
    {
        name: 'rejects DOM seeking more than 20ms from the browser request epoch',
        mutate: (parts) => {
            seekSignal(parts).observedAtMs += 25;
        },
    },
    {
        // The whole browser timeline is stale relative to the actual recorded
        // window while Node callbacks remain current. A delayed (but genuine)
        // Node delivery is admissible; stale browser evidence is not.
        name: 'rejects a stale browser timeline outside the fresh observation window',
        mutate: (parts) => {
            for (const signal of parts.signals) signal.observedAtMs -= 3000;
            for (const event of parts.artifact.events) {
                if (event.kind === 'request') event.wall_time_s -= 3;
            }
        },
        windowMutate: (parts) => {
            parts.artifact.observation_window = { ...FIXTURE_OBSERVATION_WINDOW };
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
        // Retargeted: the browser protocol timeline may now be delayed relative
        // to Node delivery, but it must still project inside the actual
        // observation window. This failure epoch lands an hour outside it.
        name: 'rejects a protocol failure epoch projected outside the observation window',
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
// Per-request same-asset cycle correlation
// ---------------------------------------------------------------------------

test('admits two distinct same-asset cycles one-to-one under their request clocks', () => {
    const built = build(0, {
        mutate: (parts) => {
            appendSyntheticCycle(parts, {
                requestId: '24304.30001',
                sequenceOffset: 1000,
                timeOffsetMs: 100000,
            });
            appendSameAssetFailure(parts, 100000);
        },
    });
    const failuresBefore = clone(built.input.networkFailures);
    const signalsBefore = clone(built.input.lifecycleSignals);
    const eventsBefore = clone(built.parts.artifact.events);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.deepEqual(result.remaining, []);
    assert.equal(result.expected.length, 2);
    const requestIds = result.expected
        .map((entry: any) => entry.bufferedLoopProof.requestId)
        .sort();
    assert.deepEqual(requestIds, ['24304.18835', '24304.30001']);
    for (const entry of result.expected) {
        assert.equal(entry.allowlist, ALLOWLIST);
        assert.equal(entry.bufferedLoopProof.artifact.sha256, built.sha256);
        assert.equal(entry.bufferedLoopProof.elementId, 'media:1');
        assert.equal(entry.bufferedLoopProof.sourceEpoch, 1);
    }
    assert.deepEqual(built.input.networkFailures, failuresBefore, 'raw failures must stay immutable');
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'signals must stay immutable');
    assert.deepEqual(built.parts.artifact.events, eventsBefore, 'sidecar events must stay immutable');

    // Reversing the raw failures must not change which request each one maps to.
    const [baseFailure, shiftedFailure] = built.input.networkFailures;
    const reversed = clone(built.input);
    reversed.networkFailures = [clone(shiftedFailure), clone(baseFailure)];
    const reversedResult = attributeBufferedAmbientLoopAborts(reversed);
    assert.equal(reversedResult.expected.length, 2);
    const mapping = new Map<number, string>(reversedResult.expected.map((entry: any) => [
        entry.observedAtMs,
        entry.bufferedLoopProof.requestId,
    ]));
    assert.equal(mapping.get(baseFailure.observedAtMs), '24304.18835');
    assert.equal(mapping.get(shiftedFailure.observedAtMs), '24304.30001');
});

test('rejects two individually eligible same-asset chains in one request window', () => {
    const addCompeting = (parts: Parts): void => {
        appendSyntheticCycle(parts, {
            requestId: '24304.30003',
            sequenceOffset: 1000,
            timeOffsetMs: 0,
            copySignals: false,
        });
    };

    const both = build(0, { mutate: addCompeting });
    expectNoAdmission(both);

    const firstOnly = build(0, {
        mutate: (parts) => {
            addCompeting(parts);
            retainOnlyChain(parts, '24304.18835');
        },
    });
    const firstResult = attributeBufferedAmbientLoopAborts(firstOnly.input);
    assert.equal(firstResult.expected.length, 1, 'first chain must be individually eligible');
    assert.equal(firstResult.expected[0].bufferedLoopProof.requestId, '24304.18835');

    const secondOnly = build(0, {
        mutate: (parts) => {
            addCompeting(parts);
            retainOnlyChain(parts, '24304.30003');
        },
    });
    const secondResult = attributeBufferedAmbientLoopAborts(secondOnly.input);
    assert.equal(secondResult.expected.length, 1, 'second chain must be individually eligible');
    assert.equal(secondResult.expected[0].bufferedLoopProof.requestId, '24304.30003');
});

test('rejects both duplicate failures that claim one eligible chain', () => {
    const built = build(0, {
        mutate: (parts) => {
            parts.failures.push(clone(parts.failures[0]));
        },
    });

    const result = expectNoAdmission(built);

    assert.equal(result.remaining.length, 2, 'neither duplicate claim may be admitted');
});

test('keeps an over-100ms same-asset cycle raw while admitting the unrelated proven cycle', () => {
    const built = build(0, {
        mutate: (parts) => {
            appendSyntheticCycle(parts, {
                requestId: '24304.30004',
                sequenceOffset: 1000,
                timeOffsetMs: 100000,
                playingDelayMs: 150,
            });
            appendSameAssetFailure(parts, 100000);
        },
    });
    const baseFailure = clone(built.input.networkFailures[0]);
    const badFailure = clone(built.input.networkFailures[1]);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'only the fully proven cycle may be admitted');
    assert.equal(result.expected[0].bufferedLoopProof.requestId, '24304.18835');
    assert.deepEqual(result.remaining, [badFailure], 'the 150ms cycle must stay raw');
    assert.deepEqual(built.input.networkFailures, [baseFailure, badFailure], 'both raw failures must stay immutable');
});

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

test('rejects ambiguous mapping when two CDP chains compete in the same request window', () => {
    const built = build(0, {
        failures: 'both',
        mutate: (parts) => {
            const first = chainOf(parts.artifact, 0);
            const second = chainOf(parts.artifact, 1);
            second.request.url = clone(first.request.url);
            second.response.url = clone(first.response.url);
            // URL multiplicity alone is not temporal ambiguity. Project the
            // second chain onto the first chain's browser and Node clocks so
            // both are genuine competing request-window candidates.
            second.request.wall_time_s = first.request.wall_time_s;
            second.request.timestamp = first.request.timestamp;
            second.request.observed_at_ms = first.request.observed_at_ms;
            second.response.timestamp = first.response.timestamp;
            second.response.observed_at_ms = first.response.observed_at_ms;
            second.failure.timestamp = first.failure.timestamp;
            second.failure.observed_at_ms = first.failure.observed_at_ms;
            assert.notEqual(first.request.request_id, second.request.request_id);
        },
    });
    expectNoAdmission(built);
});

// ---------------------------------------------------------------------------
// Slow cached-response correlation (v2), outside the 100ms fast completion window
// ---------------------------------------------------------------------------

function expectedByRequestId(result: AttributionResult, requestId: string): any {
    return result.expected.find((entry: any) => entry.bufferedLoopProof?.requestId === requestId);
}

test('admits the slow cached-response loop when seeked/playing align with the projected response', () => {
    const built = build(0, {
        mutate: (parts) => {
            const sourceSignals = caseSignals(parts).filter((signal: any) => signal.signalSequence < 1000);
            appendSlowCycle(parts, {
                requestId: '24304.19028',
                sequenceOffset: 2000,
                timeOffsetMs: 200000,
                sourceSignals,
            });
        },
    });
    const failuresBefore = clone(built.input.networkFailures);
    const signalsBefore = clone(built.input.lifecycleSignals);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.deepEqual(result.remaining, [], 'both genuinely correlated cycles must be admitted');
    assert.equal(result.expected.length, 2);
    const fast = expectedByRequestId(result, '24304.18835');
    const slow = expectedByRequestId(result, '24304.19028');
    assert.ok(fast && slow, 'both the fast and slow cycles must be admitted one-to-one');
    assert.equal(fast.allowlist, ALLOWLIST, 'the fast response keeps the v1 label');
    assert.equal(fast.bufferedLoopProof.path, 'fast-100ms');
    assert.equal(slow.allowlist, ALLOWLIST_CACHED_RESPONSE, 'the slow response needs a distinct v2 label');
    assert.equal(slow.bufferedLoopProof.criterion, ALLOWLIST_CACHED_RESPONSE);
    assert.equal(slow.bufferedLoopProof.path, 'slow-cached-response');

    const alignment = slow.bufferedLoopProof.responseAlignment;
    const selected = new Map<number, any>(
        (built.input.lifecycleSignals as any[]).map((signal: any) => [signal.signalSequence, signal]),
    );
    const selectedSeeking = selected.get(slow.bufferedLoopProof.wrap.seekingSequence);
    const selectedSeeked = selected.get(slow.bufferedLoopProof.wrap.seekedSequence);
    const selectedPlaying = selected.get(slow.bufferedLoopProof.wrap.playingSequence);
    assert.ok(selectedSeeking && selectedSeeked && selectedPlaying, 'selected lifecycle sequence IDs must resolve');
    assert.equal(
        alignment.latencyMs,
        slow.bufferedLoopProof.clocks.projectedObservedAtMs.response - slow.bufferedLoopProof.clocks.projectedObservedAtMs.request,
        'response latency is derived from projected browser clocks',
    );
    assert.equal(
        alignment.seekedFromResponseMs,
        selectedSeeked.observedAtMs - slow.bufferedLoopProof.clocks.projectedObservedAtMs.response,
    );
    assert.equal(
        alignment.playingFromResponseMs,
        selectedPlaying.observedAtMs - slow.bufferedLoopProof.clocks.projectedObservedAtMs.response,
    );
    assert.equal(
        alignment.seekedLatencyMs,
        selectedSeeked.observedAtMs - selectedSeeking.observedAtMs,
        'total seek latency is measured from the actual seeking event',
    );
    assert.equal(
        alignment.playingLatencyMs,
        selectedPlaying.observedAtMs - selectedSeeking.observedAtMs,
        'total playing latency is measured from the actual seeking event',
    );
    assert.match(slow.bufferedLoopProof.evidenceScope.statement, /cached 206 headers/);
    assert.match(slow.bufferedLoopProof.evidenceScope.statement, /does NOT prove/);
    assert.ok(slow.bufferedLoopProof.selectedSequenceIds.lifecycle.includes(slow.bufferedLoopProof.wrap.seekedSequence));
    assert.ok(slow.bufferedLoopProof.selectedSequenceIds.lifecycle.includes(slow.bufferedLoopProof.wrap.playingSequence));
    assert.ok(slow.bufferedLoopProof.selectedSequenceIds.request > 0);
    assert.equal(typeof slow.bufferedLoopProof.body.state, 'string');
    assert.equal(slow.bufferedLoopProof.body.sha256, null, 'body evidence must stay honest');
    assert.deepEqual(built.input.networkFailures, failuresBefore, 'raw failures must stay immutable');
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'raw signals must stay immutable');
});

test('keeps legacy fast completion in v1 when cached response headers arrive after 100ms', () => {
    const built = build(0, {
        mutate: (parts) => {
            slowify(parts, { responseLatencyMs: 130 });
            const completion = setCompletionDelay(parts, 2);
            assert.ok(completion.seeked.observedAtMs - completion.seeking.observedAtMs <= 100);
        },
    });
    const failuresBefore = clone(built.input.networkFailures);
    const signalsBefore = clone(built.input.lifecycleSignals);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.deepEqual(result.remaining, []);
    assert.equal(result.expected.length, 1);
    assert.equal(result.expected[0].allowlist, ALLOWLIST, 'completion delays select legacy v1 before response latency');
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(proof.path, 'fast-100ms');
    assert.ok(proof.responseAlignment.latencyMs > 100, 'the cached response really arrived after 100ms');
    const seeked = (built.input.lifecycleSignals as any[])
        .find((signal: any) => signal.signalSequence === proof.wrap.seekedSequence);
    assert.ok(Math.abs(seeked.observedAtMs - proof.clocks.projectedObservedAtMs.response) > 20,
        'the fast completion is not response-aligned, so v1 cannot be a v2 relabel');
    assert.deepEqual(built.input.networkFailures, failuresBefore, 'raw failures must stay immutable');
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'raw signals must stay immutable');
});

test('keeps a 90ms completion with a 105ms cached response in v1 instead of relabelling v2', () => {
    const built = build(0, {
        mutate: (parts) => {
            slowify(parts, { responseLatencyMs: 105 });
            const completion = setCompletionDelay(parts, 90);
            assert.ok(completion.seeked.observedAtMs - completion.seeking.observedAtMs <= 100);
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.deepEqual(result.remaining, []);
    assert.equal(result.expected.length, 1);
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(result.expected[0].allowlist, ALLOWLIST, 'a 90ms completion remains legacy v1');
    assert.equal(proof.path, 'fast-100ms');
    assert.ok(Math.abs(proof.responseAlignment.seekedFromResponseMs) <= 20, 'the old fast completion is response-eligible but must not be relabelled');
});

test('pins the signed 20ms response fence for slow cached-response completion', () => {
    const outside = 20 + 1 / 1024;
    const cases: Array<{ label: string; seeked: number; playing: number; admit: boolean }> = [
        { label: 'seeked and playing at +20ms', seeked: 20, playing: 20, admit: true },
        { label: 'seeked and playing at -20ms', seeked: -20, playing: -20, admit: true },
        { label: 'seeked and playing just outside +20ms', seeked: outside, playing: outside, admit: false },
        { label: 'seeked and playing just outside -20ms', seeked: -outside, playing: -outside, admit: false },
        { label: 'playing just outside +20ms with seeked aligned', seeked: 0, playing: outside, admit: false },
        { label: 'seeked just outside -20ms with playing inside', seeked: -outside, playing: -20, admit: false },
    ];

    for (const scenario of cases) {
        const built = build(0, {
            mutate: (parts) => {
                slowify(parts, {
                    responseLatencyMs: 130,
                    seekedFromResponseMs: scenario.seeked,
                    playingFromResponseMs: scenario.playing,
                });
            },
        });
        const failuresBefore = clone(built.input.networkFailures);
        const signalsBefore = clone(built.input.lifecycleSignals);

        if (!scenario.admit) {
            expectNoAdmission(built);
            continue;
        }

        const result = attributeBufferedAmbientLoopAborts(built.input);
        assert.deepEqual(result.remaining, [], scenario.label);
        assert.equal(result.expected.length, 1, scenario.label);
        assert.equal(result.expected[0].allowlist, ALLOWLIST_CACHED_RESPONSE, scenario.label);
        const alignment = result.expected[0].bufferedLoopProof.responseAlignment;
        assert.equal(alignment.seekedFromResponseMs, scenario.seeked, scenario.label);
        assert.equal(alignment.playingFromResponseMs, scenario.playing, scenario.label);
        assert.deepEqual(built.input.networkFailures, failuresBefore, 'raw failures must stay immutable');
        assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'raw signals must stay immutable');
    }
});

test('admits the slow cached-response loop when only Node delivery clocks shift by 28ms', () => {
    const built = build(0, {
        mutate: (parts) => {
            const slow = slowify(parts);
            slow.chain.response.observed_at_ms += 28;
            slow.chain.failure.observed_at_ms += 28;
            parts.failures[0].observedAtMs += 28;
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.deepEqual(result.remaining, []);
    assert.equal(result.expected.length, 1, 'callback lag is not an event-clock disagreement');
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(result.expected[0].allowlist, ALLOWLIST_CACHED_RESPONSE);
    assert.ok(proof.clocks.deliveryLagMs.response >= 20, 'response delivery lag stays explicit');
    assert.ok(Math.abs(proof.responseAlignment.latencyMs - SLOW_RESPONSE_LATENCY_MS) < 0.01, 'browser response latency is unchanged by Node delivery');
});

test('evaluates fast, slow and invalid slow cycles together without inheriting proof', () => {
    let invalidRaw: any;
    const built = build(0, {
        mutate: (parts) => {
            const sourceSignals = caseSignals(parts).filter((signal: any) => signal.signalSequence < 1000);
            appendSlowCycle(parts, {
                requestId: '24304.19028',
                sequenceOffset: 2000,
                timeOffsetMs: 200000,
                sourceSignals,
            });
            const invalid = appendSlowCycle(parts, {
                requestId: '24304.19030',
                sequenceOffset: 3000,
                timeOffsetMs: 400000,
                sourceSignals,
                playingFromResponseMs: 30,
            });
            invalidRaw = invalid.rawFailure;
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 2, 'only the fast and aligned slow cycles may be admitted');
    assert.equal(expectedByRequestId(result, '24304.18835')?.allowlist, ALLOWLIST);
    assert.equal(expectedByRequestId(result, '24304.19028')?.allowlist, ALLOWLIST_CACHED_RESPONSE);
    assert.equal(expectedByRequestId(result, '24304.19030'), undefined, 'the misaligned cycle must not inherit another proof');
    assert.deepEqual(result.remaining, [invalidRaw], 'the invalid cycle stays raw');
});

test('rejects a slow window made ambiguous by a second same-asset correlated chain', () => {
    const built = build(0, {
        mutate: (parts) => {
            const sourceSignals = caseSignals(parts).filter((signal: any) => signal.signalSequence < 1000);
            const slow = appendSlowCycle(parts, {
                requestId: '24304.19028',
                sequenceOffset: 2000,
                timeOffsetMs: 200000,
                sourceSignals,
            });
            const duplicate = appendSyntheticCycle(parts, {
                requestId: '24304.19029',
                sequenceOffset: 3000,
                timeOffsetMs: 200000,
                copySignals: false,
            });
            // Genuine temporal competitor: same request window, same projected
            // response and the same terminal failure clock as the slow chain.
            duplicate.failure.observed_at_ms = slow.chain.failure.observed_at_ms;
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'only the fast cycle is unambiguous');
    assert.equal(result.expected[0].bufferedLoopProof.requestId, '24304.18835');
    assert.deepEqual(result.remaining, [built.input.networkFailures[1]], 'the ambiguous slow request stays raw');
});

defineNegatives([
    {
        name: 'rejects a fast response whose seeked/playing completion lands after the 100ms window',
        mutate: (parts) => {
            const seeking = seekSignal(parts);
            const seeked = seekedOf(parts);
            const canplay = caseSignals(parts, 'canplay')[0];
            const playing = playAfterSeek(parts);
            seeked.observedAtMs = seeking.observedAtMs + 150;
            canplay.observedAtMs = seeking.observedAtMs + 150;
            playing.observedAtMs = seeking.observedAtMs + 150;
            assert.ok(seekedOf(parts).observedAtMs > seeking.observedAtMs);
        },
    },
    {
        name: 'rejects slow-response seeked/playing landing 25ms after the projected response',
        mutate: (parts) => {
            slowify(parts, { seekedFromResponseMs: 25, playingFromResponseMs: 25 });
        },
    },
    {
        name: 'rejects slow-response seeked/playing landing 25ms before the projected response',
        mutate: (parts) => {
            slowify(parts, { seekedFromResponseMs: -25, playingFromResponseMs: -25 });
        },
    },
    {
        name: 'rejects a slow response with no projected response timestamp',
        mutate: (parts) => {
            slowify(parts);
            delete chainOf(parts.artifact, parts.index).response.timestamp;
        },
    },
    {
        name: 'rejects a slow response with a non-finite browser-projected clock',
        mutate: (parts) => {
            slowify(parts);
            chainOf(parts.artifact, parts.index).response.timestamp = Number.POSITIVE_INFINITY;
        },
    },
    {
        name: 'rejects a slow response projected before its own request',
        mutate: (parts) => {
            slowify(parts);
            const chain = chainOf(parts.artifact, parts.index);
            chain.response.timestamp = chain.request.timestamp - 0.2;
        },
    },
    {
        name: 'rejects a slow window with a sourceEpoch change after the seek',
        mutate: (parts) => {
            slowify(parts);
            seekedOf(parts).sourceEpoch = 2;
        },
    },
    {
        name: 'rejects a slow window with a gapped buffered range',
        mutate: (parts) => {
            slowify(parts);
            setRanges(parts, 'buffered', [[-0.002667, 10], [20, 30]]);
        },
    },
    {
        name: 'rejects a slow window interrupted by a media error',
        mutate: (parts) => {
            slowify(parts);
            const playing = playAfterSeek(parts);
            playing.kind = 'error';
            playing.mediaState.mediaError = { code: 2, message: 'MEDIA_ERR_NETWORK' };
        },
    },
    {
        name: 'rejects a slow window whose confirmation never advances',
        mutate: (parts) => {
            slowify(parts);
            finalSample(parts).mediaState.currentTime = 0;
        },
    },
    {
        name: 'rejects a slow window closed before the projected response',
        mutate: (parts) => {
            slowify(parts);
        },
        windowMutate: (parts) => {
            const seeked = seekedOf(parts);
            parts.artifact.observation_window.closed_at_ms = seeked.observedAtMs - 30;
        },
    },
]);

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

// ---------------------------------------------------------------------------
// Controlled native cycle evidence (synthetic integration only)
// ---------------------------------------------------------------------------
//
// These cases are SYNTHETIC. The portable cycle fixture was generated from the
// existing native correlator's baseInput/capturedSequenceInput shapes; it is
// not a real cancellation capture, not a native qualification receipt, and it
// makes no gap-free audio claim.

const CONTROLLED_CYCLE_FIXTURE_PATH = join(
    process.cwd(),
    'tests',
    'fixtures',
    'native_audio_controlled_cycle_case.json',
);
const controlledCycleFixture = JSON.parse(
    readFileSync(CONTROLLED_CYCLE_FIXTURE_PATH, 'utf8'),
) as any;
const { verifyControlledNativeLoopCycle } = require('../tools/ui/native_media_cycle_evidence.cjs') as {
    verifyControlledNativeLoopCycle: (input: any) => { ok: boolean; reasons?: string[]; evidence?: any };
};
const CONTROLLED_CYCLE_CRITERION = 'ambient-buffered-controlled-native-cycle-proof-v3';

function controlledSeekEvent(cycle: any): any {
    const record = cycle.media.records.find((entry: any) => entry.event === 'Media.playerEventsAdded');
    return record.params.events.find((event: any) => JSON.parse(event.value).event === 'kSeek');
}

function alignControlledChain(parts: Parts, chain: any, cycle: any): void {
    const seeking = cycle.lifecycleSignals.find((signal: any) => signal.kind === 'seeking'
        && signal.mediaState?.currentTime === 0
        && signal.mediaState?.seeking === true);
    assert.ok(seeking, 'controlled cycle must expose one seeking0');
    const seekTimestamp = controlledSeekEvent(cycle).timestamp;
    chain.request.wall_time_s = seeking.observedAtMs / 1000;
    chain.request.timestamp = seekTimestamp;
    chain.response.timestamp = seekTimestamp + 0.001;
    chain.failure.timestamp = seekTimestamp + 0.002;
    chain.request.observed_at_ms = seeking.observedAtMs + 1;
    chain.response.observed_at_ms = seeking.observedAtMs + 2;
    chain.failure.observed_at_ms = seeking.observedAtMs + 3;
    parts.failures[0].requestInitiatedAtMs = chain.request.observed_at_ms;
    parts.failures[0].observedAtMs = chain.failure.observed_at_ms;
}

function appendControlledMutation(cycle: any, name: string): void {
    const events = cycle.provenance.snapshot.events.records;
    const sequence = events.length + 1;
    const dateNow = cycle.lifecycleSignals[2].observedAtMs + 5;
    const at = {
        dateNow,
        performanceNow: dateNow - cycle.binding.collectionReady.timeOrigin,
    };
    events.push({
        sequence,
        kind: 'mutation-attempt',
        at,
        targetType: 'setter',
        name,
        id: 'media:1',
        sourceEpoch: 1,
        argTypes: [],
        argumentCount: 1,
    });
    events.push({
        sequence: sequence + 1,
        kind: 'mutation-result',
        at: { ...at, dateNow: dateNow + 1, performanceNow: at.performanceNow + 1 },
        targetType: 'setter',
        name,
        id: 'media:1',
        outcome: 'success',
        resultType: 'number',
        sourceEpoch: 1,
        sequenceOfAttempt: sequence,
    });
    cycle.provenance.snapshot.events.count = events.length;
}

type ControlledOptions = {
    cycleMutate?: (cycle: any) => void;
    partsMutate?: (parts: Parts, cycle: any, chain: any) => void;
    records?: (records: any[], built: Built, cycle: any, chain: any) => any;
};

function buildControlled(options: ControlledOptions = {}): { built: Built; cycle: any; chain: any } {
    const cycle = clone(controlledCycleFixture);
    const baseWindow = clone(controlledCycleFixture.clockProjection.observationWindow);
    const built = build(0, {
        mutate: (parts) => {
            options.cycleMutate?.(cycle);
            parts.signals = clone(cycle.lifecycleSignals);
            const chain = chainOf(parts.artifact, 0);
            alignControlledChain(parts, chain, cycle);
            options.partsMutate?.(parts, cycle, chain);
        },
        windowMutate: (parts) => {
            parts.artifact.observation_window.opened_at_ms = Math.min(
                parts.artifact.observation_window.opened_at_ms,
                baseWindow.openedAtMs,
            ) - 1;
            parts.artifact.observation_window.closed_at_ms = Math.max(
                parts.artifact.observation_window.closed_at_ms,
                baseWindow.closedAtMs,
            ) + 1;
        },
    });
    const chain = chainOf(built.parts.artifact, 0);
    const records = [{ requestId: chain.request.request_id, cycleInput: cycle }];
    (built.input as any).controlledNativeCycles = options.records
        ? options.records(records, built, cycle, chain)
        : records;
    return { built, cycle, chain };
}

function expectNoControlledAdmission(built: Built): void {
    const before = JSON.stringify(built.input);
    const result = attributeBufferedAmbientLoopAborts(built.input);
    assert.deepEqual(result.expected, [], 'invalid controlled evidence must never be admitted');
    assert.equal(result.remaining.length, built.input.networkFailures.length);
    assert.deepEqual(result.remaining, built.input.networkFailures);
    assert.equal(JSON.stringify(built.input), before, 'checker must not mutate raw inputs');
}

test('controlled cycle fixture is synthetic and passes the real pure verifier alone', () => {
    assert.equal(controlledCycleFixture.unit_fixture_only, true);
    assert.match(controlledCycleFixture._provenance_note, /SYNTHETIC/);
    assert.match(controlledCycleFixture._provenance_note, /NOT a native qualification receipt/);
    const result = verifyControlledNativeLoopCycle(clone(controlledCycleFixture));
    assert.equal(result.ok, true, `portable fixture must pass the pure verifier: ${result.reasons}`);
    assert.equal(result.evidence.scope.admission, 'none');
    assert.equal(result.evidence.scope.gapFreeAudio, false);
});

test('admits the controlled native cycle when the sampled wrap prediction differs by over 100ms', () => {
    const fixtureCheck = verifyControlledNativeLoopCycle(clone(controlledCycleFixture));
    assert.equal(fixtureCheck.ok, true, `fixture must pass before checker admission: ${fixtureCheck.reasons}`);

    const { built, cycle } = buildControlled();
    const failuresBefore = clone(built.input.networkFailures);
    const signalsBefore = clone(built.input.lifecycleSignals);

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.deepEqual(result.remaining, [], 'the controlled cycle must replace only the sampled wrap heuristic');
    assert.equal(result.expected.length, 1);
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(result.expected[0].allowlist, ALLOWLIST, 'the harness allowlist must not be relabelled');
    assert.equal(proof.path, 'fast-100ms', 'the original completion path must be retained');
    assert.equal(proof.allowlist, ALLOWLIST);
    assert.equal(proof.legacyCriterion, ALLOWLIST);
    assert.equal(proof.criterion, CONTROLLED_CYCLE_CRITERION);
    assert.ok(Math.abs(proof.clocks.wrapDeltaS) > 0.1, 'the old sampled-time heuristic would reject this cycle');
    assert.ok(proof.controlledNativeCycle, 'the controlled acceptance must carry embedded verifier evidence');
    assert.equal(proof.controlledNativeCycle.criterion, CONTROLLED_CYCLE_CRITERION);
    assert.equal(proof.controlledNativeCycle.legacyCriterion, ALLOWLIST);
    assert.equal(proof.controlledNativeCycle.completionPath, 'fast-100ms');
    const evidence = proof.controlledNativeCycle.evidence;
    assert.equal(evidence.scope.profile, 'awwv.controlled-native-media-loop-cycle.v1');
    assert.equal(evidence.scope.admission, 'none');
    assert.equal(evidence.scope.networkFailureAdmitted, false);
    assert.equal(evidence.scope.existingGuardChanged, false);
    assert.equal(evidence.scope.gapFreeAudio, false);
    assert.equal(evidence.lifecycle.seeking.signalSequence, cycle.selected.seeking.signalSequence);
    assert.equal(evidence.lifecycle.seeking.observedAtMs, proof.clocks.seekObservedAtMs);
    assert.deepEqual(evidence.rawReferences.lifecycleSignals, built.input.lifecycleSignals);
    assert.equal(proof.body.sha256, null);
    assert.equal(proof.body.byteCount, null);

    assert.deepEqual(built.input.networkFailures, failuresBefore, 'raw failure input must stay immutable');
    assert.deepEqual(built.input.lifecycleSignals, signalsBefore, 'raw lifecycle signals must stay immutable');
});

test('keeps the legacy sampled-time wrap path when no controlled profile is supplied', () => {
    const { built } = buildControlled({
        cycleMutate: (cycle) => {
            cycle.lifecycleSignals[1].mediaState.currentTime = 9.3;
        },
    });
    delete (built.input as any).controlledNativeCycles;

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1);
    const proof = result.expected[0].bufferedLoopProof;
    assert.equal(proof.criterion, ALLOWLIST);
    assert.equal(proof.controlledNativeCycle, null);
});

test('does not fall back to legacy when controlled evidence is explicitly supplied but malformed', () => {
    const { built } = buildControlled({
        cycleMutate: (cycle) => {
            cycle.lifecycleSignals[1].mediaState.currentTime = 9.3;
        },
    });
    delete (built.input as any).controlledNativeCycles;
    assert.equal(attributeBufferedAmbientLoopAborts(built.input).expected.length, 1, 'legacy path must pass');

    for (const supplied of [undefined, null, {}, 'malformed']) {
        (built.input as any).controlledNativeCycles = supplied;
        expectNoControlledAdmission(built);
    }
    (built.input as any).controlledNativeCycles = [];
    expectNoControlledAdmission(built);
});

test('uses checker-selected lifecycle samples and clocks rather than caller-supplied refs', () => {
    const { built } = buildControlled({
        cycleMutate: (cycle) => {
            cycle.selected = {
                preSeek: { signalSequence: 1 },
                seeking: { signalSequence: 1 },
                seeked: { signalSequence: 1 },
                playing: { signalSequence: 1 },
                confirmation: { signalSequence: 1 },
            };
            cycle.clockProjection = {
                requestWallTimeS: 1,
                protocolTimestamps: { request: 0, response: 0, failure: 0 },
                projectedObservedAtMs: { request: 0, response: 0, failure: 0 },
                observationWindow: { clock: 'node-epoch-ms', openedAtMs: 0, closedAtMs: 1 },
            };
        },
    });

    const result = attributeBufferedAmbientLoopAborts(built.input);

    assert.equal(result.expected.length, 1, 'caller-selected refs and projection are not authority');
    const evidence = result.expected[0].bufferedLoopProof.controlledNativeCycle.evidence;
    assert.equal(evidence.lifecycle.preSeek.signalSequence, 2);
    assert.equal(evidence.lifecycle.seeking.signalSequence, 3);
    assert.notEqual(evidence.clocks.requestWallTimeS, 1);
});

test('does not let a caller projection rescue an invalid checker clock', () => {
    const { built } = buildControlled({
        cycleMutate: (cycle) => {
            cycle.clockProjection = {
                requestWallTimeS: 1,
                protocolTimestamps: { request: 0, response: 0, failure: 0 },
                projectedObservedAtMs: { request: 0, response: 0, failure: 0 },
                observationWindow: { clock: 'node-epoch-ms', openedAtMs: 0, closedAtMs: 1 },
            };
        },
        partsMutate: (parts) => {
            const seeking = parts.signals.find((signal: any) => signal.kind === 'seeking');
            seeking.observedAtMs += 100;
        },
    });
    expectNoControlledAdmission(built);
});

test('keeps both duplicate raw failures raw even when the controlled cycle verifies', () => {
    const { built } = buildControlled({
        partsMutate: (parts) => {
            appendSameAssetFailure(parts, 1);
        },
    });
    const before = JSON.stringify(built.input);
    const result = attributeBufferedAmbientLoopAborts(built.input);
    assert.deepEqual(result.expected, []);
    assert.equal(result.remaining.length, 2);
    assert.equal(JSON.stringify(built.input), before);
});

type ControlledCase = { name: string } & ControlledOptions;

const CONTROLLED_NEGATIVES: ControlledCase[] = [
    {
        name: 'rejects a missing controlled record for the unique request',
        records: () => [],
    },
    {
        name: 'rejects a controlled record that claims a different request',
        records: (records) => records.map((record) => ({ ...record, requestId: 'different-request' })),
    },
    {
        name: 'rejects duplicate controlled records claiming one request',
        records: (records) => [records[0], clone(records[0])],
    },
    {
        name: 'rejects a malformed cycleInput',
        records: (records) => records.map((record) => ({ ...record, cycleInput: null })),
    },
    {
        name: 'rejects incomplete provenance',
        cycleMutate: (cycle) => {
            delete cycle.provenance.snapshot;
        },
    },
    {
        name: 'rejects tampered provenance validity',
        cycleMutate: (cycle) => {
            cycle.provenance.snapshot.valid = false;
        },
    },
    {
        name: 'rejects truncated provenance events',
        cycleMutate: (cycle) => {
            cycle.provenance.snapshot.events.truncated = true;
        },
    },
    {
        name: 'rejects tampered sentinel validity',
        cycleMutate: (cycle) => {
            cycle.sentinel.valid = false;
        },
    },
    {
        name: 'rejects a wrong player identity',
        cycleMutate: (cycle) => {
            cycle.media.records[0].params.player.playerId = 'other-player';
        },
    },
    {
        name: 'rejects a wrong media asset',
        cycleMutate: (cycle) => {
            const record = cycle.media.records.find((entry: any) => entry.event === 'Media.playerEventsAdded');
            const load = record.params.events.find((event: any) => JSON.parse(event.value).event === 'kLoad');
            const value = JSON.parse(load.value);
            value.url = 'http://127.0.0.1:50306/assets/ambient_field-5Mv-hV7p.ogg';
            load.value = JSON.stringify(value);
        },
    },
    {
        name: 'rejects a wrong object source',
        cycleMutate: (cycle) => {
            cycle.provenance.selected.element.source = 'http://127.0.0.1:50306/assets/ambient_field-5Mv-hV7p.ogg';
        },
    },
    {
        name: 'rejects a wrong lifecycle source epoch',
        cycleMutate: (cycle) => {
            cycle.lifecycleSignals[2].sourceEpoch = 2;
        },
    },
    {
        name: 'rejects missing controlled controls read',
        cycleMutate: (cycle) => {
            delete cycle.lifecycleSignals[2].controlledControlsRead;
        },
    },
    {
        name: 'rejects an errored controlled controls read',
        cycleMutate: (cycle) => {
            cycle.lifecycleSignals[2].controlledControlsRead = { value: false, error: 'read-failed' };
        },
    },
    {
        name: 'rejects a true controlled controls read',
        cycleMutate: (cycle) => {
            cycle.lifecycleSignals[2].controlledControlsRead = { value: true, error: null };
            cycle.lifecycleSignals[2].mediaState.controls = true;
        },
    },
    {
        name: 'rejects inconsistent controls state and recorded read',
        cycleMutate: (cycle) => {
            cycle.lifecycleSignals[2].mediaState.controls = true;
        },
    },
    {
        name: 'rejects a stale media record outside the observation window',
        cycleMutate: (cycle) => {
            cycle.media.records[0].observedAtMs = cycle.clockProjection.observationWindow.closedAtMs + 100;
        },
    },
    {
        name: 'rejects an extra manual mutation inside the cycle',
        cycleMutate: (cycle) => {
            appendControlledMutation(cycle, 'currentTime');
        },
    },
    {
        name: 'rejects a raised media player error',
        cycleMutate: (cycle) => {
            const record = cycle.media.records.find((entry: any) => entry.event === 'Media.playerErrorsRaised');
            record.params.errors.push({ code: 2, message: 'synthetic error' });
        },
    },
    {
        name: 'rejects a partial buffered range',
        partsMutate: (parts) => {
            const seeking = parts.signals.find((signal: any) => signal.kind === 'seeking');
            const index = parts.signals.indexOf(seeking);
            parts.signals[index - 1].mediaState.buffered = [[0, 5]];
        },
    },
    {
        name: 'rejects a non-206 response after the verifier would pass',
        partsMutate: (parts, _cycle, chain) => {
            chain.response.status = 200;
        },
    },
    {
        name: 'rejects a mismatched content range after the verifier would pass',
        partsMutate: (parts, _cycle, chain) => {
            chain.response.content_range.value = 'bytes 0-9/10';
        },
    },
    {
        name: 'rejects continuation that disagrees beyond the existing 250ms guard',
        partsMutate: (parts) => {
            const confirmation = parts.signals[parts.signals.length - 1];
            confirmation.mediaState.currentTime = 0.9;
        },
    },
    {
        name: 'rejects late completion with an early response instead of widening fast completion',
        partsMutate: (parts) => {
            const seeking = parts.signals.find((signal: any) => signal.kind === 'seeking');
            const seeked = parts.signals.find((signal: any) => signal.kind === 'seeked');
            const playing = parts.signals.find((signal: any) => signal.kind === 'playing'
                && signal.mediaState.currentTime === 0);
            seeked.observedAtMs = seeking.observedAtMs + 150;
            playing.observedAtMs = seeking.observedAtMs + 160;
        },
    },
    {
        name: 'rejects a stale cached-response marker after the verifier would pass',
        partsMutate: (parts, _cycle, chain) => {
            chain.response.from_disk_cache = false;
        },
    },
    {
        name: 'rejects a seek that no longer correlates with the checker request clock',
        partsMutate: (parts) => {
            const seeking = parts.signals.find((signal: any) => signal.kind === 'seeking');
            seeking.observedAtMs += 100;
        },
    },
];

for (const mutation of CONTROLLED_NEGATIVES) {
    test(`controlled cycle negative: ${mutation.name}`, () => {
        const { built } = buildControlled({
            cycleMutate: mutation.cycleMutate,
            partsMutate: mutation.partsMutate,
            records: mutation.records,
        });
        expectNoControlledAdmission(built);
    });
}
