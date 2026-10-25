import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { afterEach, test, vi } from 'vitest';

const require = createRequire(import.meta.url);

afterEach(() => {
    vi.useRealTimers();
});

type Collector = {
    awaitReady(): Promise<void>;
    closeAndFlush(): Promise<any>;
    failClosed(code: string): void;
};

type StartCollector = (options: Record<string, unknown>) => Collector;

function loadCollector(): StartCollector {
    return require('../tools/ui/cdp_network_collector.cjs').startCdpNetworkCollection;
}

class FakeSession extends EventEmitter {
    readonly sends: Array<{ method: string; params: unknown }> = [];
    detachCalls = 0;
    bodyResult: any = { body: Buffer.from('ambient-bytes').toString('base64'), base64Encoded: true };
    bodyPromise: Promise<any> | null = null;
    failEnable: Error | null = null;
    enablePromise: Promise<any> | null = null;
    failDetach: Error | null = null;
    failOnEvent: string | null = null;
    listenerError: Error | null = null;
    targetInfo: any = {
        targetInfo: {
            targetId: 'gameplay-target-1',
            type: 'iframe',
            url: 'http://127.0.0.1:64245/index.html?embedded=1',
        },
    };
    targetInfoPromise: Promise<any> | null = null;
    emitDisconnectedOnDetach = false;
    bodyByRequestId = new Map<string, Promise<any>>();

    override on(event: string, listener: (...args: any[]) => void): this {
        if (event === this.failOnEvent) throw this.listenerError ?? new Error(`listener install failed for ${event}`);
        return super.on(event, listener);
    }

    async send(method: string, params: unknown = {}): Promise<any> {
        this.sends.push({ method, params });
        if (method === 'Network.enable') {
            if (this.failEnable) throw this.failEnable;
            if (this.enablePromise) return this.enablePromise;
            return {};
        }
        if (method === 'Target.getTargetInfo') return this.targetInfoPromise ?? this.targetInfo;
        if (method === 'Network.getResponseBody') {
            const requestId = (params as any)?.requestId;
            if (this.bodyByRequestId.has(requestId)) return this.bodyByRequestId.get(requestId);
            if (this.bodyPromise) return this.bodyPromise;
            if (this.bodyResult instanceof Error) throw this.bodyResult;
            return this.bodyResult;
        }
        throw new Error(`unexpected command ${method}`);
    }

    async detach(): Promise<void> {
        this.detachCalls += 1;
        if (this.emitDisconnectedOnDetach) this.emit('close');
        if (this.failDetach) throw this.failDetach;
    }
}

function requestEvent(overrides: Record<string, unknown> = {}) {
    return {
        requestId: 'cdp-request-1',
        loaderId: 'loader-1',
        frameId: 'frame-1',
        timestamp: 10,
        type: 'Media',
        request: {
            url: 'http://127.0.0.1:64245/assets/ambient_warroom-AbCd_123.ogg',
            method: 'GET',
            headers: { Range: 'bytes=0-' },
        },
        ...overrides,
    };
}

function responseEvent(overrides: Record<string, unknown> = {}) {
    return {
        requestId: 'cdp-request-1',
        timestamp: 11,
        type: 'Media',
        response: {
            url: 'http://127.0.0.1:64245/assets/ambient_warroom-AbCd_123.ogg',
            status: 206,
            mimeType: 'audio/ogg',
            protocol: 'http/1.1',
            fromDiskCache: false,
            fromServiceWorker: false,
            headers: {
                'Content-Range': 'bytes 0-206419/206420',
                'Content-Length': '206420',
                'Accept-Ranges': 'bytes',
            },
        },
        ...overrides,
    };
}

function failureEvent(overrides: Record<string, unknown> = {}) {
    return {
        requestId: 'cdp-request-1',
        timestamp: 12,
        type: 'Media',
        errorText: 'net::ERR_ABORTED',
        canceled: true,
        ...overrides,
    };
}

async function readyCollector(session: FakeSession, artifactIdentity = 'run/RS/cdp-v3.json', extra: Record<string, unknown> = {}) {
    const collector = loadCollector()({
        artifactIdentity,
        createSession: async () => session,
        closeTimeoutMs: 100,
        ...extra,
    });
    await collector.awaitReady();
    return collector;
}

test('binds provenance to the selected gameplay frame target before enabling the declared window', async () => {
    const session = new FakeSession();
    const selectedFrameUrl = session.targetInfo.targetInfo.url;
    const collector = await readyCollector(session, 'run/RS/frame-target.json', { expectedTargetUrl: selectedFrameUrl });
    const artifact = await collector.closeAndFlush();

    assert.deepEqual(session.sends.slice(0, 2).map((row) => row.method), ['Target.getTargetInfo', 'Network.enable']);
    assert.equal(artifact.status, 'complete');
    assert.equal(artifact.session.target.target_id, 'gameplay-target-1');
    assert.equal(artifact.session.target.type, 'iframe');
    assert.equal(artifact.session.target.selected_frame_url.status, 'present');
    assert.equal(artifact.session.target.reported_url.status, 'present');
    assert.equal(artifact.session.coverage_window.begins_after, 'selected-gameplay-frame-network-enable');
    assert.deepEqual(artifact.session.coverage_window.excludes, [
        'outer-page-load',
        'campaign-bootstrap',
        'intro-or-resume-routing',
        'pre-attachment-frame-traffic',
    ]);
});

test('rejects a session that cannot establish the selected gameplay frame target identity', async () => {
    const session = new FakeSession();
    session.targetInfo.targetInfo.url = 'http://127.0.0.1:64245/outer.html';
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/wrong-target.json',
        expectedTargetUrl: 'http://127.0.0.1:64245/index.html?embedded=1',
        createSession: async () => session,
        closeTimeoutMs: 100,
    });

    await assert.rejects(() => collector.awaitReady(), /setup failed/i);
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'setup-error');
    assert.equal(artifact.setup.primary_error.includes('outer.html'), false);
});

test('unexpected session close is fatal while collector-owned detach is expected and idempotent', async () => {
    const unexpectedSession = new FakeSession();
    const unexpected = await readyCollector(unexpectedSession);
    unexpectedSession.emit('close');
    const failed = await unexpected.closeAndFlush();
    assert.equal(failed.status, 'runtime-error');
    assert.equal(failed.inconsistencies.some((row: any) => row.code === 'unexpected-session-close'), true);

    const ownedSession = new FakeSession();
    ownedSession.emitDisconnectedOnDetach = true;
    const owned = await readyCollector(ownedSession);
    const first = await owned.closeAndFlush();
    const second = await owned.closeAndFlush();
    assert.equal(first.status, 'complete');
    assert.equal(first.inconsistencies.some((row: any) => row.code === 'unexpected-session-close'), false);
    assert.strictEqual(second, first);
    assert.equal(ownedSession.detachCalls, 1);
});

test('session close and external target loss stay fatal while finalization waits for a body settlement', async () => {
    for (const failure of ['session-close', 'external-frame-loss'] as const) {
        const session = new FakeSession();
        let resolveBody: (value: any) => void = () => {};
        session.bodyPromise = new Promise((resolve) => { resolveBody = resolve; });
        const collector = await readyCollector(session, `run/RS/flush-${failure}.json`);
        session.emit('Network.requestWillBeSent', requestEvent());
        session.emit('Network.responseReceived', responseEvent());
        session.emit('Network.loadingFailed', failureEvent());
        const closing = collector.closeAndFlush();
        await Promise.resolve();
        await Promise.resolve();
        if (failure === 'session-close') session.emit('close');
        else collector.failClosed('observed-frame-detached');
        resolveBody({ body: 'settled', base64Encoded: false });
        const artifact = await closing;
        assert.equal(artifact.status, 'runtime-error', failure);
        const expectedCode = failure === 'session-close' ? 'unexpected-session-close' : 'observed-frame-detached';
        assert.equal(artifact.inconsistencies.some((row: any) => row.code === expectedCode), true, failure);
    }
});

test('session close during setup retains the primary runtime error classification', async () => {
    const session = new FakeSession();
    let resolveTargetInfo: (value: any) => void = () => {};
    session.targetInfoPromise = new Promise((resolve) => { resolveTargetInfo = resolve; });
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/setup-close.json',
        expectedTargetUrl: session.targetInfo.targetInfo.url,
        createSession: async () => session,
        closeTimeoutMs: 100,
    });
    for (let attempt = 0; attempt < 10 && !session.sends.some((row) => row.method === 'Target.getTargetInfo'); attempt += 1) {
        await Promise.resolve();
    }
    assert.equal(session.sends.some((row) => row.method === 'Target.getTargetInfo'), true);
    session.emit('close');
    resolveTargetInfo(session.targetInfo);
    await assert.rejects(() => collector.awaitReady(), /setup failed/i);
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'runtime-error');
    assert.equal(artifact.inconsistencies.some((row: any) => row.code === 'unexpected-session-close'), true);
});

test('setup timeout preserves an already recorded runtime target loss', async () => {
    for (const failure of ['session-close', 'external-frame-loss'] as const) {
        const session = new FakeSession();
        session.targetInfoPromise = new Promise(() => {});
        const collector = loadCollector()({
            artifactIdentity: `run/RS/setup-timeout-${failure}.json`,
            expectedTargetUrl: session.targetInfo.targetInfo.url,
            createSession: async () => session,
            closeTimeoutMs: 15,
        });
        for (let attempt = 0; attempt < 10 && !session.sends.some((row) => row.method === 'Target.getTargetInfo'); attempt += 1) {
            await Promise.resolve();
        }
        assert.equal(session.sends.some((row) => row.method === 'Target.getTargetInfo'), true);
        if (failure === 'session-close') session.emit('close');
        else collector.failClosed('observed-frame-detached');

        await assert.rejects(() => collector.awaitReady(), /setup timed out/i);
        const artifact = await collector.closeAndFlush();
        assert.equal(artifact.setup.state, 'timeout');
        assert.equal(artifact.setup.primary_error, 'CDP collection setup timed out');
        assert.equal(artifact.status, 'runtime-error');
        const expectedCode = failure === 'session-close' ? 'unexpected-session-close' : 'observed-frame-detached';
        assert.equal(artifact.inconsistencies.some((row: any) => row.code === expectedCode), true);
    }
});

test('collects one exact CDP failure and hashes only the direct same-session body result', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFailed', failureEvent());
    const artifact = await collector.closeAndFlush();

    assert.equal(artifact.status, 'complete');
    assert.equal(artifact.non_admitting, true);
    assert.equal(artifact.events.length, 3);
    assert.equal(artifact.body_attempts.length, 1);
    assert.equal(artifact.body_attempts[0].state, 'captured');
    assert.equal(artifact.body_attempts[0].byte_count, Buffer.byteLength('ambient-bytes'));
    assert.match(artifact.body_attempts[0].sha256, /^[a-f0-9]{64}$/);
    assert.ok(artifact.body_attempts[0].settled_sequence > artifact.body_attempts[0].trigger_sequence);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable', 'Network.getResponseBody']);
    assert.deepEqual(session.sends[1].params, { requestId: 'cdp-request-1' });
    assert.equal(session.detachCalls, 1);
    assert.equal(artifact.events.every((row: any) => row.observer_session_id === artifact.session.observer_session_id), true);
});

test('retains privacy-safe URL projections and rejects ambiguous Range without a body command', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent({
        request: {
            url: 'http://user:password@127.0.0.1:64245/assets/ambient_warroom-AbCd_123.ogg?token=secret-query#secret-fragment',
            method: 'GET',
            headers: { Range: 'bytes=0-', range: 'bytes=0-' },
        },
    }));
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFailed', failureEvent());
    const artifact = await collector.closeAndFlush();
    const serialized = JSON.stringify(artifact);

    assert.equal(serialized.includes('password'), false);
    assert.equal(serialized.includes('secret-query'), false);
    assert.equal(serialized.includes('secret-fragment'), false);
    assert.equal(artifact.events[0].url.had_userinfo, true);
    assert.equal(artifact.events[0].url.had_query, true);
    assert.equal(artifact.events[0].url.had_fragment, true);
    assert.equal(artifact.events[0].actual_range.error_code, 'ambiguous-case-duplicate');
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('taints every local generation after a redirect without inventing terminal generation evidence', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.requestWillBeSent', requestEvent({
        timestamp: 11,
        redirectResponse: { status: 302 },
    }));
    session.emit('Network.responseReceived', responseEvent({ timestamp: 12 }));
    session.emit('Network.loadingFailed', failureEvent({ timestamp: 13 }));
    const artifact = await collector.closeAndFlush();

    assert.deepEqual(artifact.events.filter((row: any) => row.kind === 'request').map((row: any) => row.generation), [1, 2]);
    assert.equal(artifact.events.at(-1).chain_tainted, true);
    assert.equal(JSON.stringify(artifact).includes('stale-generation'), false);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('uses sidecar-scoped observer identities so reused CDP request IDs cannot collide', async () => {
    const firstSession = new FakeSession();
    const secondSession = new FakeSession();
    const first = await readyCollector(firstSession, 'run/RS/one.json');
    const second = await readyCollector(secondSession, 'run/RS/two.json');
    for (const session of [firstSession, secondSession]) {
        session.emit('Network.requestWillBeSent', requestEvent());
        session.emit('Network.responseReceived', responseEvent());
        session.emit('Network.loadingFailed', failureEvent());
    }
    const [left, right] = await Promise.all([first.closeAndFlush(), second.closeAndFlush()]);
    assert.notEqual(left.session.observer_session_id, right.session.observer_session_id);
    assert.equal(left.events[0].request_id, right.events[0].request_id);
    assert.notDeepEqual(
        [left.events[0].observer_session_id, left.events[0].request_id],
        [right.events[0].observer_session_id, right.events[0].request_id],
    );
});

test('first overflow stops observation with one bounded receipt and no tail claim', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session, 'run/RS/overflow.json', { maxEvents: 2 });
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFailed', failureEvent());
    session.emit('Network.loadingFinished', { requestId: 'later', timestamp: 14, encodedDataLength: 1 });
    const artifact = await collector.closeAndFlush();

    assert.equal(artifact.status, 'over-cap');
    assert.equal(artifact.overflow_receipts.length, 1);
    assert.equal(artifact.overflow_receipts[0].code, 'event-rows');
    assert.equal(artifact.events.length, 2);
    assert.equal(artifact.observation_stopped_at_sequence, artifact.overflow_receipts[0].sequence);
    assert.equal(artifact.summary.complete_through_stop_only, true);
});

test('long non-http data URLs are bounded noncandidates without weakening HTTP URL caps', async () => {
    const dataSession = new FakeSession();
    const dataCollector = await readyCollector(dataSession, 'run/RS/data-url.json');
    const dataUrl = `data:image/svg+xml,${'x'.repeat(278)}`;
    dataSession.emit('Network.requestWillBeSent', requestEvent({
        request: { url: dataUrl, method: 'GET', headers: {} },
        type: 'Image',
    }));
    dataSession.emit('Network.loadingFinished', { requestId: 'cdp-request-1', timestamp: 11, encodedDataLength: 278 });
    const dataArtifact = await dataCollector.closeAndFlush();

    assert.equal(dataArtifact.status, 'complete');
    assert.deepEqual(dataArtifact.events[0].url, {
        status: 'non-http',
        protocol: 'data:',
        length: dataUrl.length,
        sha256: require('node:crypto').createHash('sha256').update(dataUrl).digest('hex'),
    });
    assert.equal(Object.prototype.hasOwnProperty.call(dataArtifact.events[0].url, 'path'), false);
    assert.equal(dataArtifact.summary.target_like_failures, 0);

    const httpSession = new FakeSession();
    const httpCollector = await readyCollector(httpSession, 'run/RS/long-http.json');
    httpSession.emit('Network.requestWillBeSent', requestEvent({
        request: {
            url: `http://127.0.0.1:64245/${'x'.repeat(278)}`,
            method: 'GET',
            headers: {},
        },
        type: 'Image',
    }));
    const httpArtifact = await httpCollector.closeAndFlush();
    assert.equal(httpArtifact.status, 'over-cap');
    assert.equal(httpArtifact.overflow_receipts[0].code, 'url-path-component');
    assert.equal(httpArtifact.overflow_receipts[0].observed, 278);
});

test('pending body settles explicitly under the shared close deadline and late completion cannot mutate the snapshot', async () => {
    const session = new FakeSession();
    let resolveBody: (value: any) => void = () => {};
    session.bodyPromise = new Promise((resolve) => { resolveBody = resolve; });
    const collector = await readyCollector(session, 'run/RS/pending.json', { closeTimeoutMs: 15 });
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFailed', failureEvent());
    const artifact = await collector.closeAndFlush();
    const frozen = JSON.stringify(artifact);
    resolveBody({ body: 'late-body', base64Encoded: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(artifact.body_attempts[0].state, 'pending');
    assert.equal(artifact.status, 'flush-timeout');
    assert.equal(JSON.stringify(artifact), frozen);
    assert.equal(artifact.flush.detach, 'detach-timeout');
    assert.equal(session.detachCalls, 0);
});

test('Network.enable failure after listener installation cleans up exactly once and preserves both setup and detach errors', async () => {
    const session = new FakeSession();
    session.failEnable = new Error('enable-secret-' + 'x'.repeat(600));
    session.failDetach = new Error('detach-secret-' + 'y'.repeat(600));
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/setup-error.json',
        createSession: async () => session,
        closeTimeoutMs: 100,
    });
    await assert.rejects(() => collector.awaitReady(), /Network\.enable|setup/i);
    const first = await collector.closeAndFlush();
    const second = await collector.closeAndFlush();

    assert.equal(first.status, 'setup-error');
    assert.equal(first.setup.primary_error.length <= 400, true);
    assert.equal(first.setup.cleanup_error.length <= 400, true);
    assert.equal(session.detachCalls, 1);
    assert.deepEqual(second, first);
});

test('listener installation failure disposes the partially owned session exactly once', async () => {
    const session = new FakeSession();
    session.failOnEvent = 'Network.responseReceived';
    session.listenerError = new Error('https://user:password@host/path?token=LISTENER_SECRET');
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/listener-error.json',
        createSession: async () => session,
        closeTimeoutMs: 100,
    });
    await assert.rejects(() => collector.awaitReady(), /setup failed.*redacted-error/i);
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'setup-error');
    assert.equal(session.detachCalls, 1);
    assert.equal(session.listenerCount('Network.requestWillBeSent'), 0);
    assert.equal(JSON.stringify(artifact).includes('LISTENER_SECRET'), false);
});

test('records asynchronous body settlement order independently from request order', async () => {
    const session = new FakeSession();
    let resolveFirst: (value: any) => void = () => {};
    let resolveSecond: (value: any) => void = () => {};
    session.bodyByRequestId.set('cdp-request-1', new Promise((resolve) => { resolveFirst = resolve; }));
    session.bodyByRequestId.set('cdp-request-2', new Promise((resolve) => { resolveSecond = resolve; }));
    const collector = await readyCollector(session);
    const emitCandidate = (requestId: string, timestamp: number) => {
        session.emit('Network.requestWillBeSent', requestEvent({ requestId, timestamp }));
        session.emit('Network.responseReceived', responseEvent({ requestId, timestamp: timestamp + 1 }));
        session.emit('Network.loadingFailed', failureEvent({ requestId, timestamp: timestamp + 2 }));
    };
    emitCandidate('cdp-request-1', 10);
    emitCandidate('cdp-request-2', 20);
    resolveSecond({ body: 'second', base64Encoded: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveFirst({ body: 'first', base64Encoded: false });
    const artifact = await collector.closeAndFlush();
    const [first, second] = artifact.body_attempts;
    assert.ok(second.settled_sequence < first.settled_sequence);
    assert.equal(first.trigger_sequence < second.trigger_sequence, true);
});

test('pending session setup consumes the shared close budget and cannot mutate the frozen snapshot later', async () => {
    const session = new FakeSession();
    let resolveSession: (value: FakeSession) => void = () => {};
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/pending-setup.json',
        createSession: () => new Promise((resolve) => { resolveSession = resolve; }),
        closeTimeoutMs: 15,
    });
    const artifact = await collector.closeAndFlush();
    const frozen = JSON.stringify(artifact);
    resolveSession(session);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(artifact.status, 'flush-timeout');
    assert.equal(JSON.stringify(artifact), frozen);
    assert.equal(session.sends.length, 0);
});

test('oversized request identity stops before it can become a retained map key', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent({ requestId: 's'.repeat(257) }));
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'over-cap');
    assert.equal(JSON.stringify(artifact).includes('s'.repeat(257)), false);
    assert.equal(artifact.overflow_receipts[0].code, 'request-id');
    assert.equal(artifact.events.length, 0);
});

test('redirect taint and generation survive a terminal before request ID reuse', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.requestWillBeSent', requestEvent({ timestamp: 11, redirectResponse: { status: 302 } }));
    session.emit('Network.responseReceived', responseEvent({ timestamp: 12 }));
    session.emit('Network.loadingFinished', { requestId: 'cdp-request-1', timestamp: 13, encodedDataLength: 1 });
    session.emit('Network.requestWillBeSent', requestEvent({ timestamp: 20 }));
    session.emit('Network.responseReceived', responseEvent({ timestamp: 21 }));
    session.emit('Network.loadingFailed', failureEvent({ timestamp: 22 }));
    const artifact = await collector.closeAndFlush();
    assert.deepEqual(artifact.events.filter((row: any) => row.kind === 'request').map((row: any) => row.generation), [1, 2, 3]);
    assert.equal(artifact.events.at(-1).chain_tainted, true);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test.each([
    ['request', requestEvent({ timestamp: undefined }), responseEvent(), failureEvent()],
    ['request nonfinite', requestEvent({ timestamp: Number.POSITIVE_INFINITY }), responseEvent(), failureEvent()],
    ['response missing', requestEvent(), responseEvent({ timestamp: undefined }), failureEvent()],
    ['response', requestEvent(), responseEvent({ timestamp: Number.NaN }), failureEvent()],
    ['failure', requestEvent(), responseEvent(), failureEvent({ timestamp: undefined })],
    ['failure nonfinite', requestEvent(), responseEvent(), failureEvent({ timestamp: Number.NEGATIVE_INFINITY })],
])('missing or nonfinite %s timestamp cannot trigger body capture', async (_name, request, response, failure) => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', request);
    session.emit('Network.responseReceived', response);
    session.emit('Network.loadingFailed', failure);
    await collector.closeAndFlush();
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('late setup rejection cannot reset the active close deadline for detach', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    session.enablePromise = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('late secret')), 20));
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/late-setup.json',
        createSession: async () => session,
        closeTimeoutMs: 10,
    });

    let artifact: any = null;
    let closeSettled = false;
    let twentyMillisecondControlSettled = false;
    const twentyMillisecondControl = new Promise<void>((resolve) => setTimeout(resolve, 20)).then(() => {
        twentyMillisecondControlSettled = true;
    });
    const closing = collector.closeAndFlush().then((value) => {
        artifact = value;
        closeSettled = true;
        return value;
    });

    await vi.advanceTimersByTimeAsync(9);
    assert.equal(closeSettled, false, 'the close must not settle before its active deadline');
    await vi.advanceTimersByTimeAsync(1);
    assert.equal(closeSettled, true, 'close must settle at the original 10ms deadline');
    assert.equal(twentyMillisecondControlSettled, false, 'the clock control must remain pending at 10ms');
    await closing;
    assert.equal(Date.now(), 10);
    assert.equal(artifact.status, 'flush-timeout');
    assert.equal(artifact.flush.detach, 'detach-timeout');
    assert.equal(session.detachCalls, 0);

    await vi.advanceTimersByTimeAsync(10);
    await twentyMillisecondControl;
    await Promise.resolve();
    assert.equal(Date.now(), 20);
    assert.equal(twentyMillisecondControlSettled, true, 'the clock control must settle at 20ms');
    assert.equal(session.detachCalls, 0, 'the late setup rejection must not start detach after close');
});

test('retained setup, detach, body, failure, and protocol values do not disclose injected secrets', async () => {
    const session = new FakeSession();
    session.bodyResult = new Error('body-token=BODY_SECRET https://user:pass@host/p?q=BODY_QUERY');
    session.failDetach = new Error('detach-token=DETACH_SECRET');
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent({ response: { ...responseEvent().response, protocol: 'secret-PROTOCOL_SECRET' } }));
    session.emit('Network.loadingFailed', failureEvent({ errorText: 'net::ERR_ABORTED' }));
    const artifact = await collector.closeAndFlush();
    const serialized = JSON.stringify(artifact);
    for (const secret of ['BODY_SECRET', 'BODY_QUERY', 'DETACH_SECRET', 'PROTOCOL_SECRET']) assert.equal(serialized.includes(secret), false);
});

test('any stream inconsistency makes the collector incomplete while preserving rows', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.responseReceived', responseEvent());
    const artifact = await collector.closeAndFlush();
    assert.notEqual(artifact.status, 'complete');
    assert.equal(artifact.events.length, 1);
    assert.equal(artifact.inconsistencies[0].code, 'response-without-request');
});

test.each([
    ['missing Range', { request: { ...requestEvent().request, headers: {} } }, {}, {}],
    ['wrong Range', { request: { ...requestEvent().request, headers: { Range: 'bytes=1-' } } }, {}, {}],
    ['wrong URL host', { request: { ...requestEvent().request, url: 'http://localhost:64245/assets/ambient_warroom-AbCd_123.ogg' } }, {}, {}],
    ['wrong URL path', { request: { ...requestEvent().request, url: 'http://127.0.0.1:64245/not-ambient.ogg' } }, {}, {}],
    ['query URL', { request: { ...requestEvent().request, url: 'http://127.0.0.1:64245/assets/ambient_warroom-AbCd_123.ogg?x=1' } }, {}, {}],
    ['wrong method', { request: { ...requestEvent().request, method: 'POST' } }, {}, {}],
    ['wrong resource type', { type: 'Fetch' }, {}, {}],
    ['wrong failure', {}, {}, { errorText: 'net::ERR_FAILED' }],
])('%s is non-candidate and sends only Network.enable', async (_name, requestOverrides, responseOverrides, failureOverrides) => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent(requestOverrides));
    session.emit('Network.responseReceived', responseEvent(responseOverrides));
    session.emit('Network.loadingFailed', failureEvent(failureOverrides));
    await collector.closeAndFlush();
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('failure without a request remains inconsistent and blocks body capture', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFailed', failureEvent());
    const artifact = await collector.closeAndFlush();
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
    assert.notEqual(artifact.status, 'complete');
});

test('canceled PMTiles fetch before response is a lawful terminal chain and cannot trigger body capture', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    for (const [requestId, requestTimestamp, failureTimestamp, range] of [
        ['2504.13828', 311468.035391, 311468.047686, 'bytes=9726509-9806118'],
        ['2504.13829', 311468.035742, 311468.047775, 'bytes=9806119-9885319'],
    ] as const) {
        session.emit('Network.requestWillBeSent', requestEvent({
            requestId,
            frameId: '8778EA545EB90912FB9054284B55427C',
            loaderId: '287E1352FE37E449F3D155424B3AF1D4',
            timestamp: requestTimestamp,
            type: 'Fetch',
            request: {
                url: 'http://127.0.0.1:52168/data/derived/tiles/hillshade.pmtiles',
                method: 'GET',
                headers: { Range: range },
            },
        }));
        session.emit('Network.loadingFailed', failureEvent({ requestId, timestamp: failureTimestamp, type: 'Fetch' }));
    }
    const artifact = await collector.closeAndFlush();

    assert.equal(artifact.status, 'complete');
    assert.deepEqual(artifact.inconsistencies, []);
    assert.deepEqual(artifact.events.map((row: any) => row.kind), ['request', 'failure', 'request', 'failure']);
    assert.deepEqual(artifact.events[1].disqualification_reasons, [
        'wrong-path',
        'wrong-resource-type',
        'wrong-range',
        'response-count',
        'missing-response-timestamp',
    ]);
    assert.equal(artifact.summary.target_like_failures, 0);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('target-shaped failure before response remains non-candidate and cannot trigger body capture', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.loadingFailed', failureEvent());
    const artifact = await collector.closeAndFlush();

    assert.equal(artifact.status, 'complete');
    assert.deepEqual(artifact.inconsistencies, []);
    assert.deepEqual(artifact.events[1].disqualification_reasons, ['response-count', 'missing-response-timestamp']);
    assert.equal(artifact.summary.target_like_failures, 0);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('duplicate response and duplicate terminal are retained as fatal inconsistencies', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.responseReceived', responseEvent({ timestamp: 11.5 }));
    session.emit('Network.loadingFinished', { requestId: 'cdp-request-1', timestamp: 12, encodedDataLength: 1 });
    session.emit('Network.loadingFailed', failureEvent({ timestamp: 13 }));
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'inconsistent');
    assert.deepEqual(artifact.inconsistencies.map((row: any) => row.code), ['duplicate-response', 'failure-without-request']);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('ordinary loadingFinished records a terminal row without attempting a body', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFinished', { requestId: 'cdp-request-1', timestamp: 12, encodedDataLength: 99 });
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'complete');
    assert.equal(artifact.events.at(-1).kind, 'finish');
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test.each([
    ['unavailable', {}, 'unavailable', null],
    ['malformed', { body: '***', base64Encoded: true }, 'error', null],
    ['empty', { body: '', base64Encoded: false }, 'captured', 0],
    ['over-cap', { body: '12345', base64Encoded: false }, 'truncated', 5],
    ['rejected', new Error('body-secret=REJECT_SECRET'), 'error', null],
])('direct body result %s has an explicit bounded state', async (_name, result, expectedState, expectedBytes) => {
    const session = new FakeSession();
    session.bodyResult = result;
    const collector = await readyCollector(session, `run/RS/body-${_name}.json`, { maxBodyBytes: 4 });
    session.emit('Network.requestWillBeSent', requestEvent());
    session.emit('Network.responseReceived', responseEvent());
    session.emit('Network.loadingFailed', failureEvent());
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.body_attempts[0].state, expectedState);
    assert.equal(artifact.body_attempts[0].byte_count, expectedBytes);
    assert.equal(JSON.stringify(artifact).includes('REJECT_SECRET'), false);
});

test.each([
    ['live-request-ids', { maxLiveRequestIds: 1 }, (session: FakeSession) => {
        session.emit('Network.requestWillBeSent', requestEvent({ requestId: 'one' }));
        session.emit('Network.requestWillBeSent', requestEvent({ requestId: 'two' }));
    }],
    ['target-generations', { maxTargetGenerations: 1 }, (session: FakeSession) => {
        for (const [requestId, timestamp] of [['one', 10], ['two', 20]] as const) {
            session.emit('Network.requestWillBeSent', requestEvent({ requestId, timestamp }));
            session.emit('Network.responseReceived', responseEvent({ requestId, timestamp: timestamp + 1 }));
            session.emit('Network.loadingFailed', failureEvent({ requestId, timestamp: timestamp + 2 }));
        }
    }],
    ['body-attempts', { maxBodyAttempts: 1 }, (session: FakeSession) => {
        for (const [requestId, timestamp] of [['one', 10], ['two', 20]] as const) {
            session.emit('Network.requestWillBeSent', requestEvent({ requestId, timestamp }));
            session.emit('Network.responseReceived', responseEvent({ requestId, timestamp: timestamp + 1 }));
            session.emit('Network.loadingFailed', failureEvent({ requestId, timestamp: timestamp + 2 }));
        }
    }],
])('%s cap stops observation with an explicit receipt', async (code, caps, emit) => {
    const session = new FakeSession();
    const collector = await readyCollector(session, `run/RS/cap-${code}.json`, caps);
    emit(session);
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'over-cap');
    assert.equal(artifact.overflow_receipts[0].code, code);
});

test('events after close cannot mutate the frozen snapshot', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    const artifact = await collector.closeAndFlush();
    const frozen = JSON.stringify(artifact);
    session.emit('Network.requestWillBeSent', requestEvent());
    assert.equal(JSON.stringify(artifact), frozen);
});

test('handler runtime error is redacted and fatal', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session);
    const event: any = requestEvent();
    Object.defineProperty(event, 'request', { get() { throw new Error('listener-secret=HANDLER_SECRET'); } });
    session.emit('Network.requestWillBeSent', event);
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'runtime-error');
    assert.equal(JSON.stringify(artifact).includes('HANDLER_SECRET'), false);
});

test('createSession rejection is redacted, fatal, and does not detach an unowned session', async () => {
    const collector = loadCollector()({
        artifactIdentity: 'run/RS/create-reject.json',
        createSession: async () => { throw new Error('create-token=CREATE_SECRET'); },
        closeTimeoutMs: 100,
    });
    await assert.rejects(() => collector.awaitReady(), /redacted-error/);
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'setup-error');
    assert.equal(JSON.stringify(artifact).includes('CREATE_SECRET'), false);
});

test('setup and noncandidate failure errors are retained only through redacted projections', async () => {
    const setupSession = new FakeSession();
    setupSession.failEnable = new Error('https://user:password@host/path?token=SETUP_SECRET');
    const setupCollector = loadCollector()({
        artifactIdentity: 'run/RS/setup-secret.json', createSession: async () => setupSession, closeTimeoutMs: 100,
    });
    await assert.rejects(() => setupCollector.awaitReady());
    const setupArtifact = await setupCollector.closeAndFlush();
    const failureSession = new FakeSession();
    const failureCollector = await readyCollector(failureSession);
    failureSession.emit('Network.requestWillBeSent', requestEvent());
    failureSession.emit('Network.responseReceived', responseEvent());
    failureSession.emit('Network.loadingFailed', failureEvent({ errorText: 'failure-token=FAILURE_SECRET' }));
    const failureArtifact = await failureCollector.closeAndFlush();
    const serialized = JSON.stringify([setupArtifact, failureArtifact]);
    assert.equal(serialized.includes('SETUP_SECRET'), false);
    assert.equal(serialized.includes('FAILURE_SECRET'), false);
    assert.equal(failureArtifact.events.at(-1).error_text, '[redacted]');
});

test('129 sequential completed request IDs keep live state at one without overflowing lifetime history', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session, 'run/RS/sequential-129.json');
    for (let index = 0; index < 129; index += 1) {
        const requestId = `completed-${index}`;
        const timestamp = 100 + index * 3;
        session.emit('Network.requestWillBeSent', requestEvent({ requestId, timestamp }));
        session.emit('Network.responseReceived', responseEvent({ requestId, timestamp: timestamp + 1 }));
        session.emit('Network.loadingFinished', { requestId, timestamp: timestamp + 2, encodedDataLength: index });
    }
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'complete');
    assert.equal(artifact.events.length, 129 * 3);
    assert.equal(artifact.overflow_receipts.length, 0);
    assert.deepEqual(session.sends.map((row) => row.method), ['Network.enable']);
});

test('permanent request ID history stops at the existing event-row bound', async () => {
    const session = new FakeSession();
    const collector = await readyCollector(session, 'run/RS/history-bound.json', { maxEvents: 2 });
    session.emit('Network.requestWillBeSent', requestEvent({ requestId: 'history-one' }));
    session.emit('Network.requestWillBeSent', requestEvent({ requestId: 'history-two' }));
    session.emit('Network.requestWillBeSent', requestEvent({ requestId: 'history-three' }));
    const artifact = await collector.closeAndFlush();
    assert.equal(artifact.status, 'over-cap');
    assert.equal(artifact.events.length, 2);
    assert.equal(artifact.overflow_receipts[0].code, 'request-id-histories');
    assert.equal(artifact.overflow_receipts[0].limit, 2);
});

