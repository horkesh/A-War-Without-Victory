import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { afterEach, test, vi } from 'vitest';

const require = createRequire(import.meta.url);

/*
 * Contract tests for the native Media-origin diagnostic probe.
 *
 * These tests use a mocked Playwright CDPSession (EventEmitter + send) and
 * mocked DOM/Runtime delegate results. They pin raw telemetry preservation,
 * subscription ordering, caps, fail-closed states, cleanup ownership and the
 * optional controlled renderer-JS seek. The probe is diagnostic only: nothing
 * here may be treated as acceptance, an OS control proof or a natural-wrap
 * proof.
 */

const MEDIA_EVENTS = [
    'Media.playerCreated',
    'Media.playerPropertiesChanged',
    'Media.playerEventsAdded',
    'Media.playerMessagesLogged',
    'Media.playerErrorsRaised',
];

type ProbeOptions = {
    controlledRendererSeek?: boolean;
    expectedOrigin?: string;
    pollIntervalMs?: number;
    timeoutMs?: number;
};

type ProbeHandle = {
    snapshot(): any;
    finish(): Promise<any>;
};

type StartProbe = (session: FakeSession, options?: ProbeOptions) => ProbeHandle;

function loadProbe(): StartProbe {
    return require('../tools/ui/native_media_origin_probe.cjs').startMediaOriginProbe as StartProbe;
}

type SendRecord = { method: string; params: any };

class FakeSession extends EventEmitter {
    readonly sends: SendRecord[] = [];
    readonly listenersAtEnable: Record<string, number> = {};
    readonly runtimeCalls: SendRecord[] = [];
    detachCalls = 0;
    disableCalls = 0;
    enableError: Error | null = null;
    delegate: ((method: string, params: any) => any) | null = null;

    async send(method: string, params: any = {}): Promise<any> {
        this.sends.push({ method, params });
        if (method === 'Media.enable') {
            for (const event of MEDIA_EVENTS) this.listenersAtEnable[event] = this.listenerCount(event);
            if (this.enableError) throw this.enableError;
            return {};
        }
        if (method === 'Media.disable') {
            this.disableCalls += 1;
            return {};
        }
        if (method.startsWith('Runtime.') || method.startsWith('DOM.')) {
            this.runtimeCalls.push({ method, params });
        }
        if (this.delegate) return this.delegate(method, params);
        throw new Error(`unexpected CDP command ${method}`);
    }

    async detach(): Promise<void> {
        this.detachCalls += 1;
    }

    commands(prefix: string): SendRecord[] {
        return this.sends.filter((send) => send.method.startsWith(prefix));
    }
}

function playerCreated(playerId: string, domNodeId?: number) {
    return {
        player: {
            playerId,
            ...(domNodeId === undefined ? {} : { domNodeId }),
        },
    };
}

function installControlledDelegate(
    session: FakeSession,
    statesByBackend: Map<number, any>,
    options: {
        resolveError?: Error;
        inspectException?: any;
        seekException?: any;
        seekResult?: any;
    } = {},
) {
    session.delegate = async (method: string, params: any) => {
        if (method === 'DOM.resolveNode') {
            if (options.resolveError) throw options.resolveError;
            return { object: { objectId: `probe-object-${params.backendNodeId}` } };
        }
        if (method === 'Runtime.callFunctionOn') {
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeInspect')) {
                if (options.inspectException) {
                    return { result: { type: 'undefined' }, exceptionDetails: options.inspectException };
                }
                const backendNodeId = Number(String(params.objectId).replace('probe-object-', ''));
                return { result: { type: 'object', value: statesByBackend.get(backendNodeId) } };
            }
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeSeek')) {
                if (options.seekException) {
                    return { result: { type: 'undefined' }, exceptionDetails: options.seekException };
                }
                return {
                    result: {
                        type: 'object',
                        value: options.seekResult ?? { applied: true, currentTime: 0, seeking: false },
                    },
                };
            }
            throw new Error('unexpected Runtime.callFunctionOn declaration');
        }
        if (method === 'Runtime.releaseObject') return {};
        throw new Error(`unexpected controlled command ${method}`);
    };
}

function qualifyState(overrides: Record<string, any> = {}) {
    return {
        url: 'http://127.0.0.1:43123/assets/ambient_warroom-abc123.ogg',
        currentTime: 9.8,
        duration: 10,
        loop: true,
        paused: false,
        seeking: false,
        readyState: 4,
        controls: false,
        ...overrides,
    };
}

const ORIGIN = 'http://127.0.0.1:43123';
const AMBIENT_URL = 'http://127.0.0.1:43123/assets/ambient_warroom-abc123.ogg';

function seekCalls(session: FakeSession): SendRecord[] {
    return session.runtimeCalls.filter((call) =>
        call.method === 'Runtime.callFunctionOn'
        && call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek'));
}

function releasedIds(session: FakeSession): string[] {
    return session.runtimeCalls
        .filter((call) => call.method === 'Runtime.releaseObject')
        .map((call) => call.params.objectId);
}

function makeFakeMediaElement(options: {
    currentTime?: number;
    duration?: number;
    url?: string;
    throwOnSet?: boolean;
} = {}) {
    let time = options.currentTime ?? 9.8;
    const writes: number[] = [];
    const element: any = {
        currentSrc: options.url ?? AMBIENT_URL,
        src: options.url ?? AMBIENT_URL,
        duration: options.duration ?? 10,
        loop: true,
        paused: false,
        seeking: false,
        readyState: 4,
        controls: false,
        get currentTime() {
            return time;
        },
        set currentTime(value: number) {
            if (options.throwOnSet) throw new Error('setter denied');
            time = value;
            writes.push(value);
        },
        advance(delta: number) {
            time += delta;
        },
    };
    return { element, writes };
}

function readFakeMediaState(element: any) {
    return {
        url: element.currentSrc,
        currentTime: element.currentTime,
        duration: element.duration,
        loop: element.loop,
        paused: element.paused,
        seeking: element.seeking,
        readyState: element.readyState,
        controls: element.controls,
    };
}

function installAtomicSeekDelegate(
    session: FakeSession,
    element: any,
    writes: number[],
    mutateAfterInspect?: (element: any) => void,
) {
    session.delegate = async (method: string, params: any) => {
        if (method === 'DOM.resolveNode') return { object: { objectId: 'atomic-object' } };
        if (method === 'Runtime.callFunctionOn') {
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeInspect')) {
                const state = readFakeMediaState(element);
                mutateAfterInspect?.(element);
                return { result: { type: 'object', value: state } };
            }
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeSeek')) {
                const rendererFunction = new Function(`return (${params.functionDeclaration});`)();
                const args = (params.arguments ?? []).map((argument: any) => argument.value);
                try {
                    const value = rendererFunction.apply(element, args);
                    return { result: { type: 'object', value } };
                } catch (error: any) {
                    return {
                        result: { type: 'undefined' },
                        exceptionDetails: { text: error.message, exception: { description: error.message } },
                    };
                }
            }
        }
        if (method === 'Runtime.releaseObject') return {};
        throw new Error(`unexpected atomic command ${method}`);
    };
    return writes;
}

afterEach(() => {
    vi.useRealTimers();
});

test('subscribes all five Media events before Media.enable and preserves raw telemetry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const session = new FakeSession();
    const probe = loadProbe()(session);

    assert.strictEqual(session.sends[0]?.method, 'Media.enable');
    for (const event of MEDIA_EVENTS) {
        assert.strictEqual(session.listenersAtEnable[event], 1, `${event} not subscribed before enable`);
    }

    session.emit('Media.playerCreated', {
        player: { playerId: 'player-1', domNodeId: 42 },
        untouched: 'raw-created',
    });
    session.emit('Media.playerEventsAdded', {
        playerId: 'player-1',
        events: [{ timestamp: 123.456, value: 'kPlay' }, { timestamp: 0, value: 'kNatural' }],
    });
    session.emit('Media.playerPropertiesChanged', {
        playerId: 'player-1',
        properties: [{ name: 'origin_url', value: 'raw://not-classified' }],
    });

    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.diagnosticOnly, true);
    assert.strictEqual(snapshot.admission, 'none');
    assert.strictEqual(snapshot.status === 'PASS', false);
    assert.deepStrictEqual(snapshot.records.map((record: any) => record.sequence), [1, 2, 3]);
    assert.deepStrictEqual(snapshot.records[0].params, {
        player: { playerId: 'player-1', domNodeId: 42 },
        untouched: 'raw-created',
    });
    assert.strictEqual(snapshot.records[1].params.events[0].timestamp, 123.456);
    assert.strictEqual(snapshot.records[1].params.events[0].value, 'kPlay');
    assert.strictEqual(snapshot.records[2].params.properties[0].value, 'raw://not-classified');
    assert.deepStrictEqual(snapshot.records.map((record: any) => record.observedAtMs), [1_000, 1_000, 1_000]);

    // A snapshot is a copy: callers cannot mutate the probe's retained raw data.
    snapshot.records[0].params.untouched = 'mutated';
    snapshot.records[1].params.events[0].value = 'mutated';
    const fresh = probe.snapshot();
    assert.strictEqual(fresh.records[0].params.untouched, 'raw-created');
    assert.strictEqual(fresh.records[1].params.events[0].value, 'kPlay');

    assert.strictEqual(session.runtimeCalls.length, 0);
    const finished = await probe.finish();
    assert.strictEqual(finished.status === 'PASS', false);
    assert.strictEqual(session.disableCalls, 1);
    assert.strictEqual(session.detachCalls, 0);
});

test('records Media.enable failure explicitly, never disables and never detaches', async () => {
    vi.useFakeTimers();
    const session = new FakeSession();
    session.enableError = new Error('enable denied by target');

    const probe = loadProbe()(session);
    const snapshot = await probe.finish();

    assert.strictEqual(snapshot.setup.state, 'failed');
    assert.strictEqual(snapshot.setup.enable.succeeded, false);
    assert.strictEqual(snapshot.records.length, 0);
    assert.ok(snapshot.errors.some((error: any) => error.phase === 'media-enable'));
    assert.ok(snapshot.errors.some((error: any) => /enable denied/.test(error.error.message)));
    assert.strictEqual(session.disableCalls, 0);
    assert.strictEqual(session.detachCalls, 0);
    for (const event of MEDIA_EVENTS) assert.strictEqual(session.listenerCount(event), 0);
});

test('caps records at 4096 and exposes truncation/drop state instead of passing', async () => {
    vi.useFakeTimers();
    const session = new FakeSession();
    const probe = loadProbe()(session);

    for (let index = 0; index < 4097; index += 1) {
        session.emit('Media.playerMessagesLogged', {
            playerId: 'player-1',
            messages: [{ level: 'info', message: `message-${index}` }],
        });
    }

    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.records.length, 4096);
    assert.strictEqual(snapshot.summary.dropped, 1);
    assert.strictEqual(snapshot.summary.truncated, true);
    assert.strictEqual(snapshot.overflow.records, true);
    assert.strictEqual(snapshot.records[0].sequence, 1);
    assert.strictEqual(snapshot.records[4095].sequence, 4096);
    const sequences = snapshot.records.map((record: any) => record.sequence);
    assert.strictEqual(new Set(sequences).size, sequences.length);
    assert.strictEqual(snapshot.status === 'PASS', false);

    await probe.finish();
});

test('caps retained bytes at 4MiB and records the byte overflow explicitly', async () => {
    vi.useFakeTimers();
    const session = new FakeSession();
    const probe = loadProbe()(session);

    session.emit('Media.playerMessagesLogged', {
        playerId: 'player-1',
        messages: [{ level: 'info', message: 'x'.repeat(4 * 1024 * 1024) }],
    });

    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.records.length, 0);
    assert.strictEqual(snapshot.summary.dropped, 1);
    assert.strictEqual(snapshot.summary.truncated, true);
    assert.strictEqual(snapshot.overflow.bytes, true);
    assert.ok(snapshot.summary.storedBytes <= 4 * 1024 * 1024);

    await probe.finish();
});

test('finish removes only probe-owned listeners, clears its timer and is idempotent', async () => {
    vi.useFakeTimers();
    const session = new FakeSession();
    let foreignCalls = 0;
    const foreign = () => { foreignCalls += 1; };
    session.on('Media.playerCreated', foreign);

    const probe = loadProbe()(session);
    const first = probe.finish();
    const second = probe.finish();
    assert.strictEqual(first, second);

    const snapshot = await first;
    assert.strictEqual(session.listenerCount('Media.playerCreated'), 1);
    for (const event of MEDIA_EVENTS.filter((event) => event !== 'Media.playerCreated')) {
        assert.strictEqual(session.listenerCount(event), 0);
    }
    session.emit('Media.playerCreated', playerCreated('after-finish', 1));
    assert.strictEqual(foreignCalls, 1);
    assert.strictEqual(snapshot.records.length, 0);
    assert.strictEqual(session.disableCalls, 1);
    assert.strictEqual(session.detachCalls, 0);
    assert.strictEqual(vi.getTimerCount(), 0);
});

test('default mode is passive: no DOM or Runtime calls even with player telemetry', async () => {
    vi.useFakeTimers();
    const session = new FakeSession();
    const probe = loadProbe()(session);
    session.emit('Media.playerCreated', playerCreated('player-1', 42));

    await vi.advanceTimersByTimeAsync(5_000);
    const snapshot = probe.snapshot();
    await vi.advanceTimersByTimeAsync(5_000);
    await probe.finish();

    assert.strictEqual(session.runtimeCalls.length, 0);
    assert.strictEqual(snapshot.control.requested, false);
    assert.strictEqual(snapshot.control.status, 'disabled');
});

test('controlled renderer seek waits for the 0.35s threshold and invokes currentTime=0 exactly once', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const session = new FakeSession();
    const states = new Map<number, any>([[42, qualifyState({ currentTime: 9.64, duration: 10 })]]);
    installControlledDelegate(session, states);

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 250,
        timeoutMs: 120_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    session.emit('Media.playerEventsAdded', {
        playerId: 'player-1',
        events: [{ timestamp: 77.25, value: 'kPlay' }],
    });

    await vi.advanceTimersByTimeAsync(250);
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.callFunctionOn').length, 1);

    // 0.36s remaining is outside the threshold; no control action yet.
    states.set(42, qualifyState({ currentTime: 9.65, duration: 10 }));
    await vi.advanceTimersByTimeAsync(250);

    const calls = session.runtimeCalls;
    const inspectCalls = calls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeInspect'));
    const seekCalls = calls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek'));
    assert.strictEqual(inspectCalls.length, 2);
    assert.strictEqual(seekCalls.length, 1);
    assert.ok(seekCalls[0].params.functionDeclaration.includes('currentTime = 0'));
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.releaseObject').length, 2);

    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.control.status, 'attempted');
    assert.strictEqual(snapshot.control.mode, 'controlled-renderer-js-seek');
    assert.strictEqual(snapshot.control.thresholdSeconds, 0.35);
    assert.ok(snapshot.control.intent);
    assert.ok(snapshot.control.intent.nodeObservedAtMs >= 500);
    assert.ok(Math.abs(snapshot.control.intent.remainingSeconds - 0.35) < 1e-9);
    assert.strictEqual(snapshot.control.intent.browserClock.timestamp, 77.25);
    assert.deepStrictEqual(snapshot.control.invocation.result, { applied: true, currentTime: 0, seeking: false });
    assert.strictEqual(snapshot.control.invocation.error, null);
    assert.ok(/renderer js/i.test(snapshot.control.scopeStatement));
    assert.ok(/not/i.test(snapshot.control.scopeStatement));

    // No further polls or synthetic lifecycle records after the single seek.
    const recordCount = snapshot.records.length;
    await vi.advanceTimersByTimeAsync(60_000);
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.callFunctionOn').length, 3);
    assert.strictEqual(probe.snapshot().records.length, recordCount);
    await probe.finish();
    assert.strictEqual(session.detachCalls, 0);
});

test('controlled seek triggers at exactly 0.35 seconds remaining', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    installControlledDelegate(session, new Map([[7, qualifyState({ currentTime: 0.65, duration: 1 })]]));
    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 7));

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.control.status, 'attempted');
    assert.strictEqual(session.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 1);
    await probe.finish();
});

test('rejects a candidate from a different origin and reports unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    installControlledDelegate(session, new Map([[42, qualifyState({
        url: 'http://127.0.0.1:9999/assets/ambient_warroom-abc123.ogg',
    })]]));
    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 500,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));

    await vi.advanceTimersByTimeAsync(500);
    const snapshot = probe.snapshot();
    await probe.finish();
    assert.strictEqual(snapshot.control.status, 'unavailable');
    assert.strictEqual(session.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 0);
});

test('rejects non-ambient and malformed URLs without a broad object sweep', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    for (const url of [
        'http://127.0.0.1:43123/assets/ambient_warroom-abc123.ogg?cache=1',
        'http://127.0.0.1:43123/assets/other-abc123.ogg',
        'http://127.0.0.1:43123/assets/ambient_warroom-abc123.mp3',
        'not-a-url',
    ]) {
        const session = new FakeSession();
        installControlledDelegate(session, new Map([[42, qualifyState({ url })]]));
        const probe = loadProbe()(session, {
            controlledRendererSeek: true,
            expectedOrigin: ORIGIN,
            pollIntervalMs: 100,
            timeoutMs: 300,
        });
        session.emit('Media.playerCreated', playerCreated('player-1', 42));
        await vi.advanceTimersByTimeAsync(300);
        const snapshot = probe.snapshot();
        await probe.finish();
        assert.strictEqual(snapshot.control.status, 'unavailable', url);
        assert.strictEqual(session.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 0);
    }
});

test('reports unsupported when playerCreated has no domNodeId and performs no DOM/Runtime calls', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 300,
    });
    session.emit('Media.playerCreated', playerCreated('player-1'));

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    await probe.finish();
    assert.strictEqual(snapshot.control.status, 'unsupported');
    assert.match(snapshot.control.reason, /domNodeId/);
    assert.strictEqual(session.runtimeCalls.length, 0);
});

test('rejects paused, non-looping, wrong-readyState, hidden-controls and partial states', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const invalidStates = [
        qualifyState({ paused: true }),
        qualifyState({ loop: false }),
        qualifyState({ readyState: 3 }),
        qualifyState({ seeking: true }),
        qualifyState({ controls: true }),
        { url: 'http://127.0.0.1:43123/assets/ambient_warroom-abc123.ogg', paused: false, loop: true },
    ];
    for (const state of invalidStates) {
        const session = new FakeSession();
        installControlledDelegate(session, new Map([[42, state]]));
        const probe = loadProbe()(session, {
            controlledRendererSeek: true,
            expectedOrigin: ORIGIN,
            pollIntervalMs: 100,
            timeoutMs: 300,
        });
        session.emit('Media.playerCreated', playerCreated('player-1', 42));
        await vi.advanceTimersByTimeAsync(300);
        const snapshot = probe.snapshot();
        await probe.finish();
        assert.strictEqual(snapshot.control.status, 'unavailable', JSON.stringify(state));
        assert.strictEqual(session.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 0);
    }
});

test('rejects ambiguous qualifying players without seeking either one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    installControlledDelegate(session, new Map([
        [1, qualifyState()],
        [2, qualifyState()],
    ]));
    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 500,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 1));
    session.emit('Media.playerCreated', playerCreated('player-2', 2));

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    await probe.finish();
    assert.strictEqual(snapshot.control.status, 'ambiguous');
    assert.strictEqual(session.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 0);
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.releaseObject').length, 2);
});

test('records DOM resolve and Runtime inspect errors and never seeks on uncertainty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const resolveSession = new FakeSession();
    installControlledDelegate(resolveSession, new Map(), { resolveError: new Error('resolve failed') });
    const resolveProbe = loadProbe()(resolveSession, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 300,
    });
    resolveSession.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(300);
    const resolveSnapshot = resolveProbe.snapshot();
    await resolveProbe.finish();
    assert.strictEqual(resolveSnapshot.control.status, 'unavailable');
    assert.ok(resolveSnapshot.errors.some((error: any) => error.phase === 'dom-resolve'));
    assert.strictEqual(resolveSession.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 0);

    const inspectSession = new FakeSession();
    installControlledDelegate(inspectSession, new Map(), {
        inspectException: { text: 'inspect failed', exception: { description: 'raw' } },
    });
    const inspectProbe = loadProbe()(inspectSession, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 300,
    });
    inspectSession.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(300);
    const inspectSnapshot = inspectProbe.snapshot();
    await inspectProbe.finish();
    assert.strictEqual(inspectSnapshot.control.status, 'unavailable');
    assert.ok(inspectSnapshot.errors.some((error: any) => error.phase === 'runtime-inspect'));
    assert.strictEqual(inspectSession.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 0);
});

test('records a seek exception, still invokes only once and labels the result as renderer JS', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    installControlledDelegate(session, new Map([[42, qualifyState()]]), {
        seekException: { text: 'seek failed', exception: { description: 'raw seek error' } },
    });
    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 500,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    await probe.finish();
    assert.strictEqual(snapshot.control.status, 'attempted');
    assert.strictEqual(snapshot.control.mode, 'controlled-renderer-js-seek');
    assert.ok(snapshot.control.invocation.error);
    assert.deepStrictEqual(snapshot.control.invocation.exceptionDetails, {
        text: 'seek failed',
        exception: { description: 'raw seek error' },
    });
    assert.ok(snapshot.errors.some((error: any) => error.phase === 'runtime-seek'));
    assert.strictEqual(session.runtimeCalls.filter((call) => call.params.functionDeclaration?.includes('awwvNativeMediaOriginProbeSeek')).length, 1);
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.releaseObject').length, 1);
});

test('rejects invalid controlled options and never follows non-local origins', () => {
    const session = new FakeSession();
    for (const options of [
        { controlledRendererSeek: true },
        { controlledRendererSeek: true, expectedOrigin: 'https://127.0.0.1:43123' },
        { controlledRendererSeek: true, expectedOrigin: 'http://example.com:43123' },
        { controlledRendererSeek: true, expectedOrigin: 'http://127.0.0.1:43123/path' },
        { controlledRendererSeek: true, expectedOrigin: ORIGIN, pollIntervalMs: 251 },
        { controlledRendererSeek: true, expectedOrigin: ORIGIN, timeoutMs: 120_001 },
    ]) {
        assert.throws(() => loadProbe()(session, options as ProbeOptions));
    }
    assert.strictEqual(session.sends.length, 0);
});

test('renderer seek revalidates expected identity/state atomically and applies exactly once', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element, writes } = makeFakeMediaElement();
    installAtomicSeekDelegate(session, element, writes, (target) => target.advance(0.01));

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(100);

    const calls = seekCalls(session);
    assert.strictEqual(calls.length, 1);
    assert.deepStrictEqual(calls[0].params.arguments.map((argument: any) => argument.value), [
        AMBIENT_URL,
        ORIGIN,
        {
            currentTime: 9.8,
            duration: 10,
            loop: true,
            paused: false,
            seeking: false,
            readyState: 4,
            controls: false,
        },
    ]);
    assert.deepStrictEqual(writes, [0]);
    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.control.invocation.result.applied, true);
    assert.strictEqual(snapshot.control.invocation.outcome, 'applied');
    await probe.finish();
});

test('renderer seek does not assign when URL, state, wrap, clock or duration changed after inspection', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const scenarios: Array<[string, (element: any) => void]> = [
        ['url', (element) => { element.currentSrc = 'http://127.0.0.1:43123/assets/ambient_warroom-changed.ogg'; }],
        ['origin', (element) => { element.currentSrc = 'http://127.0.0.1:9999/assets/ambient_warroom-abc123.ogg'; }],
        ['loop', (element) => { element.loop = false; }],
        ['controls', (element) => { element.controls = true; }],
        ['paused', (element) => { element.paused = true; }],
        ['seeking', (element) => { element.seeking = true; }],
        ['readyState', (element) => { element.readyState = 3; }],
        ['wrap', (element) => { element.advance(-9.6); }],
        ['clock-jump', (element) => { element.advance(0.15); }],
        ['duration', (element) => { element.duration = 11; }],
    ];

    for (const [name, mutate] of scenarios) {
        const session = new FakeSession();
        const { element, writes } = makeFakeMediaElement();
        installAtomicSeekDelegate(session, element, writes, mutate);
        const probe = loadProbe()(session, {
            controlledRendererSeek: true,
            expectedOrigin: ORIGIN,
            pollIntervalMs: 100,
            timeoutMs: 1_000,
        });
        session.emit('Media.playerCreated', playerCreated('player-1', 42));
        await vi.advanceTimersByTimeAsync(100);

        assert.strictEqual(seekCalls(session).length, 1, name);
        assert.deepStrictEqual(writes, [], `${name} must not assign currentTime`);
        const result = probe.snapshot().control.invocation.result;
        assert.strictEqual(result.applied, false, name);
        assert.strictEqual(typeof result.reason, 'string', name);
        assert.notStrictEqual(result.reason.length, 0, name);
        await probe.finish();
    }
});

test('changed observed player inventory between inspection and invocation prevents the seek', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element, writes } = makeFakeMediaElement();
    let announced = false;
    installAtomicSeekDelegate(session, element, writes, () => {
        if (announced) return;
        announced = true;
        session.emit('Media.playerCreated', playerCreated('late-player', 99));
    });

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(100);

    const snapshot = probe.snapshot();
    assert.strictEqual(seekCalls(session).length, 0);
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(snapshot.control.status, 'ambiguous');
    assert.match(snapshot.control.reason, /inventory/);
    await probe.finish();
});

test('renderer seek retains a setter exception and never claims control', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element, writes } = makeFakeMediaElement({ throwOnSet: true });
    installAtomicSeekDelegate(session, element, writes);

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(100);

    const snapshot = probe.snapshot();
    assert.deepStrictEqual(writes, []);
    assert.match(snapshot.control.invocation.error, /setter denied/);
    assert.strictEqual(snapshot.control.invocation.outcome, 'exception');
    assert.ok(snapshot.errors.some((error: any) => error.phase === 'runtime-seek'));
    await probe.finish();
});

test('finish during a pending seek retains the returned result instead of claiming no control', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element } = makeFakeMediaElement();
    let resolveSeek: ((value: any) => void) | null = null;
    const seekDeferred = new Promise<any>((resolve) => { resolveSeek = resolve; });
    session.delegate = async (method: string, params: any) => {
        if (method === 'DOM.resolveNode') return { object: { objectId: 'seek-object' } };
        if (method === 'Runtime.callFunctionOn') {
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeInspect')) {
                return { result: { type: 'object', value: readFakeMediaState(element) } };
            }
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeSeek')) return seekDeferred;
        }
        if (method === 'Runtime.releaseObject') return {};
        throw new Error(`unexpected pending-seek command ${method}`);
    };

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(100);

    const pending = probe.snapshot();
    assert.strictEqual(pending.control.status, 'seek-pending');
    assert.strictEqual(pending.control.invocation.outcome, 'pending');

    const finishing = probe.finish();
    resolveSeek!({ result: { type: 'object', value: { applied: true, currentTime: 0, seeking: false } } });
    const snapshot = await finishing;

    assert.strictEqual(snapshot.control.status, 'attempted');
    assert.strictEqual(snapshot.control.reason, null);
    assert.strictEqual(snapshot.control.invocation.outcome, 'applied');
    assert.deepStrictEqual(snapshot.control.invocation.result, { applied: true, currentTime: 0, seeking: false });
    assert.notStrictEqual(snapshot.control.reason, 'finished-before-control');
    assert.deepStrictEqual(releasedIds(session), ['seek-object']);
    assert.strictEqual(session.detachCalls, 0);
});

test('finish remains bounded when the seek protocol never settles and reports uncertainty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element } = makeFakeMediaElement();
    session.delegate = async (method: string, params: any) => {
        if (method === 'DOM.resolveNode') return { object: { objectId: 'never-settles-object' } };
        if (method === 'Runtime.callFunctionOn') {
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeInspect')) {
                return { result: { type: 'object', value: readFakeMediaState(element) } };
            }
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeSeek')) {
                return new Promise(() => undefined);
            }
        }
        if (method === 'Runtime.releaseObject') return {};
        throw new Error(`unexpected non-settling command ${method}`);
    };

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(100);

    const finishing = probe.finish();
    await vi.advanceTimersByTimeAsync(5_000);
    const snapshot = await finishing;

    assert.strictEqual(snapshot.control.status, 'attempted-uncertain');
    assert.strictEqual(snapshot.control.invocation.outcome, 'uncertain');
    assert.strictEqual(snapshot.control.reason, 'protocol-response-uncertain');
    assert.strictEqual(snapshot.status, 'diagnostic-incomplete');
    assert.notStrictEqual(snapshot.control.reason, 'finished-before-control');
    assert.strictEqual(session.detachCalls, 0);
});

test('a DOM.resolveNode response arriving after finish is still released and never inspected', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    let resolveResolve: ((value: any) => void) | null = null;
    const resolveDeferred = new Promise<any>((resolve) => { resolveResolve = resolve; });
    session.delegate = async (method: string, params: any) => {
        if (method === 'DOM.resolveNode') return resolveDeferred;
        if (method === 'Runtime.callFunctionOn') {
            if (params.functionDeclaration.includes('awwvNativeMediaOriginProbeInspect')) {
                throw new Error('inspection must not run after finish');
            }
        }
        if (method === 'Runtime.releaseObject') return {};
        throw new Error(`unexpected late-resolve command ${method}`);
    };

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    await vi.advanceTimersByTimeAsync(100);

    const finishing = probe.finish();
    resolveResolve!({ object: { objectId: 'late-object' } });
    await finishing;

    assert.deepStrictEqual(releasedIds(session), ['late-object']);
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.callFunctionOn').length, 0);
    assert.strictEqual(session.detachCalls, 0);
});

test('record truncation prevents any controlled seek instead of passing a partial capture', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element } = makeFakeMediaElement();

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    for (let index = 0; index < 4097; index += 1) {
        session.emit('Media.playerMessagesLogged', {
            playerId: 'player-1',
            messages: [{ level: 'info', message: `message-${index}` }],
        });
    }
    session.emit('Media.playerCreated', playerCreated('player-1', 42));
    installAtomicSeekDelegate(session, element, []);

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.summary.truncated, true);
    assert.strictEqual(snapshot.overflow.records, true);
    assert.strictEqual(snapshot.control.status, 'incomplete');
    assert.strictEqual(session.runtimeCalls.length, 0);
    assert.strictEqual(seekCalls(session).length, 0);
    await probe.finish();
});

test('player metadata cap prevents controlled seek and reports explicit truncation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element } = makeFakeMediaElement();

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    for (let index = 0; index < 129; index += 1) {
        session.emit('Media.playerCreated', playerCreated(`player-${index}`, index + 1));
    }
    installAtomicSeekDelegate(session, element, []);

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.metadata.playersTruncated, true);
    assert.strictEqual(snapshot.metadata.playersObserved, 128);
    assert.strictEqual(snapshot.metadata.playersDropped, 1);
    assert.strictEqual(snapshot.control.status, 'incomplete');
    assert.strictEqual(session.runtimeCalls.length, 0);
    await probe.finish();
});

test('error metadata is capped/bounded and an overflow prevents controlled seek', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    const { element } = makeFakeMediaElement();

    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 1_000,
    });
    for (let index = 0; index < 65; index += 1) {
        session.emit('Media.playerCreated', { player: { index } });
    }
    installAtomicSeekDelegate(session, element, []);

    await vi.advanceTimersByTimeAsync(100);
    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.errors.length, 64);
    assert.strictEqual(snapshot.metadata.errorsTruncated, true);
    assert.strictEqual(snapshot.metadata.errorsDropped, 1);
    assert.strictEqual(snapshot.control.status, 'incomplete');
    assert.strictEqual(session.runtimeCalls.length, 0);
    await probe.finish();

    const longErrorSession = new FakeSession();
    longErrorSession.enableError = new Error('E'.repeat(1_000));
    const longErrorProbe = loadProbe()(longErrorSession);
    const longErrorSnapshot = await longErrorProbe.finish();
    assert.strictEqual(longErrorSnapshot.errors.length, 1);
    assert.strictEqual(longErrorSnapshot.errors[0].error.message.length, 400);
    assert.strictEqual(longErrorSnapshot.errors[0].error.messageTruncated, true);
});

test('reports unavailable on timeout, clears polling and leaves no owned listeners or remote objects', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const session = new FakeSession();
    installControlledDelegate(session, new Map([[42, qualifyState({ paused: true })]]));
    const probe = loadProbe()(session, {
        controlledRendererSeek: true,
        expectedOrigin: ORIGIN,
        pollIntervalMs: 100,
        timeoutMs: 400,
    });
    session.emit('Media.playerCreated', playerCreated('player-1', 42));

    await vi.advanceTimersByTimeAsync(400);
    const snapshot = probe.snapshot();
    assert.strictEqual(snapshot.control.status, 'unavailable');
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.callFunctionOn').length, 4);
    assert.strictEqual(session.runtimeCalls.filter((call) => call.method === 'Runtime.releaseObject').length, 4);

    await probe.finish();
    for (const event of MEDIA_EVENTS) assert.strictEqual(session.listenerCount(event), 0);
    assert.strictEqual(session.detachCalls, 0);
    assert.strictEqual(vi.getTimerCount(), 0);
});
