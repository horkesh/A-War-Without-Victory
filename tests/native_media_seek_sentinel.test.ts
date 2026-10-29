import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test, expect } from 'vitest';

/*
 * Diagnostic pre-navigation MediaSession seek sentinel tests.
 *
 * The installer is serialized with toString() and executed inside a synthetic
 * browser realm. No real browser, OS MediaSession, audio element, DOM node or
 * network is used.
 */

const require = createRequire(import.meta.url);
const KEY = '__AWWV_NATIVE_MEDIA_SEEK_SENTINEL__';
const ORIGIN = 'http://127.0.0.1:43123';
const AMBIENT_WARROOM = `${ORIGIN}/assets/ambient_warroom-abc123.ogg`;
const AMBIENT_FIELD = `${ORIGIN}/assets/ambient_field-def456.ogg`;
const AMBIENT_ARCHIVE = `${ORIGIN}/assets/ambient_archive-ghi789.ogg`;

function installerSource(): string {
    return require('../tools/ui/native_media_seek_sentinel.cjs').installMediaSessionSeekSentinel.toString();
}

class FakeTimeRanges {
    ranges: Array<[number, number]>;
    failLength = false;
    failStart = false;
    failEnd = false;

    constructor(ranges: Array<[number, number]>) {
        this.ranges = ranges;
    }

    get length() {
        if (this.failLength) throw new Error('length read failed');
        return this.ranges.length;
    }

    start(index: number) {
        if (this.failStart) throw new Error('start read failed');
        return this.ranges[index][0];
    }

    end(index: number) {
        if (this.failEnd) throw new Error('end read failed');
        return this.ranges[index][1];
    }
}

type PlayBehavior = (this: any, args: IArguments) => any;

function createRealm(options: {
    url?: string;
    readyState?: string;
    mediaSession?: boolean;
    failAction?: string;
    wrongRealm?: boolean;
    weakRefClass?: any;
    noWeakRef?: boolean;
    preexistingGlobal?: any;
    ownSetActionHandlerShadow?: boolean;
    now?: number;
    performanceNow?: number;
} = {}) {
    const state = {
        playBehavior: null as PlayBehavior | null,
        playCalls: [] as Array<{ receiver: any; args: any[]; registryCount: number | null; source: string | null }>,
    };
    const location = {
        origin: options.url ?? ORIGIN,
        href: `${options.url ?? ORIGIN}/index.html`,
        protocol: 'http:',
        hostname: '127.0.0.1',
    };
    const document: any = {
        readyState: options.readyState ?? 'loading',
        defaultView: null as any,
    };

    class HTMLMediaElement {
        _src: string;
        _currentSrc: string;
        _currentTime = 0;
        loop = false;
        controls = false;
        duration = 10;
        paused = true;
        seeking = false;
        readyState = 4;
        error: any = null;
        played: FakeTimeRanges;
        buffered: FakeTimeRanges;

        constructor(source = '') {
            this._src = source;
            this._currentSrc = source;
            this.played = new FakeTimeRanges([[0, 0]]);
            this.buffered = new FakeTimeRanges([[0, 10]]);
        }

        get src() {
            return this._src;
        }

        set src(value: string) {
            this._src = value;
            this._currentSrc = value;
        }

        get currentSrc() {
            return this._currentSrc;
        }

        get currentTime() {
            return this._currentTime;
        }

        set currentTime(value: number) {
            this._currentTime = value;
        }

        play(..._args: any[]) {
            return state.playBehavior!.call(this, arguments);
        }

        pause() {}
        load() {}
    }

    class Audio extends HTMLMediaElement {}

    class MediaSession {
        handlers = new Map<any, any>();
        calls: Array<{ action: any; handler: any }> = [];
        failAction: any = options.failAction ?? null;

        setActionHandler(action: any, handler: any) {
            this.calls.push({ action, handler });
            if (this.failAction === action) throw new Error('registration failed for native action');
            this.handlers.set(action, handler);
            return 'native-set-return';
        }
    }

    const mediaSession = options.mediaSession === false ? null : new MediaSession();
    if (mediaSession && options.ownSetActionHandlerShadow) {
        Object.defineProperty(mediaSession, 'setActionHandler', {
            configurable: true,
            writable: true,
            value: mediaSession.setActionHandler.bind(mediaSession),
        });
    }
    const weakRefValue = options.noWeakRef ? undefined : (options.weakRefClass ?? WeakRef);
    const navigator: any = { mediaSession };
    const window: any = {
        location,
        document,
        navigator,
        HTMLMediaElement,
        Audio,
        URL,
        WeakMap,
        WeakRef: weakRefValue,
        Date: { now: () => options.now ?? 1000 },
        performance: { now: () => options.performanceNow ?? 2000 },
    };
    window.window = options.wrongRealm ? {} : window;
    document.defaultView = window;
    if (options.preexistingGlobal !== undefined) window[KEY] = options.preexistingGlobal;

    state.playBehavior = function (args: IArguments) {
        const globalApi = window[KEY];
        const snapshot = globalApi && typeof globalApi.snapshot === 'function' ? globalApi.snapshot() : null;
        state.playCalls.push({
            receiver: this,
            args: Array.from(args),
            registryCount: snapshot ? snapshot.registry.count : null,
            source: this.currentSrc,
        });
        return 'original-play-return';
    };

    const context: any = {
        window,
        document,
        navigator,
        location,
        HTMLMediaElement,
        Audio,
        URL,
        WeakMap,
        WeakRef: weakRefValue,
        Date: window.Date,        performance: window.performance,
    };
    const install = vm.runInNewContext(`(${installerSource()})`, context);
    let report: any;
    try {
        report = install();
    } catch (error) {
        report = { installed: false, diagnosticValid: false, reason: 'threw', error: String(error) };
    }
    return {
        window,
        document,
        navigator,
        location,
        mediaSession,
        HTMLMediaElement,
        Audio,
        state,
        install,
        report,
        api: window[KEY],
    };
}

function ambientElements(realm: any, count: number): any[] {
    const elements = [];
    for (let index = 0; index < count; index += 1) {
        const element = new realm.Audio(`${ORIGIN}/assets/ambient_warroom-sentinel${index}.ogg`);
        element.play();
        elements.push(element);
    }
    return elements;
}

function requireMediaSession(realm: ReturnType<typeof createRealm>) {
    if (!realm.mediaSession) throw new Error('fixture requires a non-null mediaSession');
    return realm.mediaSession;
}

test('installs exactly the three seek sentinels and exposes a frozen stable API', () => {
    const realm = createRealm();
    const mediaSession = requireMediaSession(realm);
    expect(realm.report.installed).toBe(true);
    expect(realm.report.diagnosticValid).toBe(true);
    expect(Array.from(mediaSession.handlers.keys())).toEqual(['seekto', 'seekforward', 'seekbackward']);
    expect(mediaSession.calls.map((call: any) => call.action)).toEqual(['seekto', 'seekforward', 'seekbackward']);
    expect(mediaSession.calls.every((call: any) => typeof call.handler === 'function')).toBe(true);
    expect(Object.isFrozen(realm.api)).toBe(true);
    const descriptor = Object.getOwnPropertyDescriptor(realm.window, KEY);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
    const snapshot = realm.api.snapshot();
    expect(snapshot.diagnosticOnly).toBe(true);
    expect(snapshot.naturalOriginAdmitted).toBe(false);
    expect(snapshot.valid).toBe(true);
    expect(snapshot.install.readyStateAtInstall).toBe('loading');
    expect(snapshot.install.installedAt.dateNow).toBe(1000);
    expect(snapshot.install.installedAt.performanceNow).toBe(2000);
    expect(snapshot.coverage.mediaSessionActions).toEqual(['seekto', 'seekforward', 'seekbackward']);
    expect(snapshot.coverage.osControl).toBe(false);
    expect(snapshot.coverage.defaultMediaSession).toBe(false);
    expect(snapshot.coverage.naturalLoopOrigin).toBe(false);
    expect(snapshot.coverage.audioQuality).toBe(false);
    expect(snapshot.coverage.sourceEpochSemantics).toBe('observed-source-url-changes-only');
    expect(snapshot.coverage.sameUrlReloadProvenance).toBe(false);
});

test('play wrapper preserves receiver, arguments, return, promise and exception and registers before delegate', () => {
    const realm = createRealm();
    const first = new realm.Audio(AMBIENT_WARROOM);
    const returnValue = first.play('one', 2);
    expect(returnValue).toBe('original-play-return');
    expect(realm.state.playCalls[0].receiver).toBe(first);
    expect(realm.state.playCalls[0].args).toEqual(['one', 2]);
    expect(realm.state.playCalls[0].registryCount).toBe(1);

    const promise = Promise.resolve('exact-promise');
    realm.state.playBehavior = () => promise;
    const second = new realm.Audio(AMBIENT_FIELD);
    expect(second.play()).toBe(promise);

    const thrown = new Error('exact-play-error');
    realm.state.playBehavior = () => { throw thrown; };
    const third = new realm.Audio(AMBIENT_ARCHIVE);
    let caught: any = null;
    try {
        third.play();
    } catch (error) {
        caught = error;
    }
    expect(caught).toBe(thrown);
});

test('filters non-ambient, cross-origin, query/hash and non-ogg play URLs', () => {
    const realm = createRealm();
    for (const source of [
        `${ORIGIN}/assets/music-theme.ogg`,
        `${ORIGIN}/assets/ambient_warroom-abc123.ogg?cache=1`,
        `${ORIGIN}/assets/ambient_warroom-abc123.ogg#fragment`,
        'http://127.0.0.1:9999/assets/ambient_warroom-abc123.ogg',
        `${ORIGIN}/assets/ambient_warroom-abc123.mp3`,
        'not-a-url',
    ]) {
        new realm.Audio(source).play();
    }
    expect(realm.api.snapshot().registry.count).toBe(0);
    new realm.Audio(AMBIENT_WARROOM).play();
    new realm.Audio(AMBIENT_FIELD).play();
    new realm.Audio(AMBIENT_ARCHIVE).play();
    const snapshot = realm.api.snapshot();
    expect(snapshot.registry.count).toBe(3);
    expect(snapshot.registry.entries.map((entry: any) => entry.source)).toEqual([
        AMBIENT_WARROOM,
        AMBIENT_FIELD,
        AMBIENT_ARCHIVE,
    ]);
});

test('keeps stable id per detached element, bumps source epoch, and resolves only exact identity', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.play();
    const first = realm.api.snapshot().registry.entries[0];
    element.play();
    const second = realm.api.snapshot().registry.entries[0];
    expect(second.id).toBe(first.id);
    expect(second.sourceEpoch).toBe(first.sourceEpoch);
    expect(realm.api.resolve(first.id, { sourceEpoch: first.sourceEpoch, url: AMBIENT_WARROOM })).toMatchObject({
        ok: true,
        id: first.id,
        source: AMBIENT_WARROOM,
        sourceEpoch: first.sourceEpoch,
        element,
    });

    element.src = AMBIENT_FIELD;
    element.play();
    const changed = realm.api.snapshot().registry.entries[0];
    expect(changed.id).toBe(first.id);
    expect(changed.sourceEpoch).toBe(first.sourceEpoch + 1);
    expect(realm.api.resolve(first.id, { sourceEpoch: first.sourceEpoch, url: AMBIENT_WARROOM }).ok).toBe(false);
    expect(realm.api.resolve(first.id, { sourceEpoch: changed.sourceEpoch, url: AMBIENT_FIELD }).ok).toBe(true);
    expect(realm.api.resolve('unknown-id', { sourceEpoch: 1, url: AMBIENT_WARROOM }).ok).toBe(false);

    element.src = `${ORIGIN}/assets/music-theme.ogg`;
    const nonambient = realm.api.snapshot().registry.entries[0];
    expect(realm.api.resolve(first.id, { sourceEpoch: nonambient.sourceEpoch, url: nonambient.source }).ok).toBe(false);
});

test('keeps duplicate URLs visible and resolves each id exactly, never first-by-URL', () => {
    const realm = createRealm();
    const first = new realm.Audio(AMBIENT_WARROOM);
    const second = new realm.Audio(AMBIENT_WARROOM);
    first.play();
    second.play();
    const snapshot = realm.api.snapshot();
    expect(snapshot.registry.count).toBe(2);
    expect(snapshot.registry.duplicateSources).toContain(AMBIENT_WARROOM);
    expect(snapshot.registry.entries.every((entry: any) => entry.duplicateSource === true)).toBe(true);
    const firstEntry = snapshot.registry.entries[0];
    const secondEntry = snapshot.registry.entries[1];
    const firstId = firstEntry.id;
    const secondId = secondEntry.id;
    expect(firstId).not.toBe(secondId);
    expect(realm.api.resolve(firstId, { sourceEpoch: firstEntry.sourceEpoch, url: AMBIENT_WARROOM }).element).toBe(first);
    expect(realm.api.resolve(secondId, { sourceEpoch: secondEntry.sourceEpoch, url: AMBIENT_WARROOM }).element).toBe(second);
});

test('bounds the registry at 16 and reports overflow without silently dropping', () => {
    const realm = createRealm();
    ambientElements(realm, 17);
    const snapshot = realm.api.snapshot();
    expect(snapshot.registry.count).toBe(16);
    expect(snapshot.registry.capacity).toBe(16);
    expect(snapshot.invalidReasons).toContain('registry-overflow');
    expect(snapshot.valid).toBe(false);
    expect(snapshot.events.records.some((record: any) => record.kind === 'registry-overflow')).toBe(true);
});

test('dead WeakRef entries remain visible but resolve rejects', () => {
    class CapturingWeakRef {
        static created: CapturingWeakRef[] = [];
        target: any;
        constructor(target: any) {
            this.target = target;
            CapturingWeakRef.created.push(this);
        }
        deref() {
            return this.target;
        }
    }
    const realm = createRealm({ weakRefClass: CapturingWeakRef });
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.play();
    const entry = realm.api.snapshot().registry.entries[0];
    const id = entry.id;
    CapturingWeakRef.created[0].target = null;
    const snapshot = realm.api.snapshot();
    expect(snapshot.registry.entries[0].alive).toBe(false);
    expect(realm.api.resolve(id, { sourceEpoch: entry.sourceEpoch, url: entry.source })).toMatchObject({ ok: false, reason: 'dead' });
});

test('records readyState, buffered and error read failures explicitly', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    Object.defineProperty(element, 'readyState', { configurable: true, get() { throw new Error('ready read failed'); } });
    Object.defineProperty(element, 'buffered', { configurable: true, get() { throw new Error('buffer read failed'); } });
    Object.defineProperty(element, 'error', { configurable: true, get() { throw new Error('error read failed'); } });
    element.play();
    const snapshot = realm.api.snapshot();
    const entry = snapshot.registry.entries[0];
    expect(entry.readErrors.readyState).toMatch(/ready read failed/);
    expect(entry.readErrors.buffered).toMatch(/buffer read failed/);
    expect(entry.readErrors.error).toMatch(/error read failed/);
    expect(snapshot.invalidReasons).toContain('state-read-failure');
    expect(snapshot.valid).toBe(false);
});

test('fails closed for unsupported MediaSession, wrong realm, wrong origin and late installation', () => {
    const unsupported = createRealm({ mediaSession: false });
    expect(unsupported.report.installed).toBe(false);
    expect(unsupported.api.snapshot().valid).toBe(false);
    expect(unsupported.api.snapshot().invalidReasons).toContain('unsupported-media-session');

    const wrongRealm = createRealm({ wrongRealm: true });
    expect(wrongRealm.report.installed).toBe(false);
    expect(wrongRealm.api.snapshot().invalidReasons).toContain('wrong-realm');
    expect(requireMediaSession(wrongRealm).calls.length).toBe(0);

    const wrongOrigin = createRealm({ url: 'https://example.com' });
    expect(wrongOrigin.report.installed).toBe(false);
    expect(wrongOrigin.api.snapshot().invalidReasons).toContain('wrong-origin');

    const late = createRealm({ readyState: 'complete' });
    expect(late.report.installed).toBe(true);
    expect(late.api.snapshot().valid).toBe(false);
    expect(late.api.snapshot().invalidReasons).toContain('late-installation');
    expect(late.api.snapshot().install.readyStateAtInstall).toBe('complete');
});

test('fails closed when WeakRef is unavailable', () => {
    const realm = createRealm({ noWeakRef: true });
    expect(realm.report.installed).toBe(false);
    expect(realm.api.snapshot().valid).toBe(false);
    expect(realm.api.snapshot().invalidReasons).toContain('unsupported-weakref');
    expect(requireMediaSession(realm).calls.length).toBe(0);
});

test('resolve requires explicit positive integer epoch and exact URL and rechecks reads', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.play();
    const entry = realm.api.snapshot().registry.entries[0];
    expect(realm.api.resolve(entry.id).ok).toBe(false);
    expect(realm.api.resolve(entry.id, { sourceEpoch: 0, url: AMBIENT_WARROOM }).ok).toBe(false);
    expect(realm.api.resolve(entry.id, { sourceEpoch: 1.5, url: AMBIENT_WARROOM }).ok).toBe(false);
    expect(realm.api.resolve(entry.id, { sourceEpoch: '1', url: AMBIENT_WARROOM }).ok).toBe(false);
    expect(realm.api.resolve(entry.id, { sourceEpoch: entry.sourceEpoch }).ok).toBe(false);
    expect(realm.api.resolve(entry.id, { sourceEpoch: entry.sourceEpoch, url: AMBIENT_FIELD }).ok).toBe(false);
    expect(realm.api.resolve('unknown-id', { sourceEpoch: 1, url: AMBIENT_WARROOM })).toMatchObject({ ok: false, reason: 'unknown-id' });
    expect(realm.api.resolve(entry.id, { sourceEpoch: entry.sourceEpoch, url: AMBIENT_WARROOM }).ok).toBe(true);

    element.play = () => 'own-shadow';
    expect(realm.api.resolve(entry.id, { sourceEpoch: entry.sourceEpoch, url: AMBIENT_WARROOM })).toMatchObject({
        ok: false,
        reason: 'element-play-shadow',
    });

    const unwrapped = createRealm();
    const throwing = new unwrapped.Audio(AMBIENT_WARROOM);
    throwing.play();
    const cleanSnapshot = unwrapped.api.snapshot();
    expect(cleanSnapshot.valid).toBe(true);
    const thrownEntry = cleanSnapshot.registry.entries[0];
    const thrownIdentity = { id: thrownEntry.id, sourceEpoch: thrownEntry.sourceEpoch };
    Object.defineProperty(throwing, 'currentTime', {
        configurable: true,
        get() { throw new Error('currentTime read failed'); },
    });
    expect(unwrapped.api.resolve(thrownIdentity.id, {
        sourceEpoch: thrownIdentity.sourceEpoch,
        url: AMBIENT_WARROOM,
    }).ok).toBe(false);
    const failedSnapshot = unwrapped.api.snapshot();
    expect(failedSnapshot.valid).toBe(false);
    expect(failedSnapshot.invalidReasons).toContain('state-read-failure');
    expect(failedSnapshot.registry.entries[0].readErrors.currentTime).toMatch(/currentTime read failed/);
});

test('rejects malformed or over-cap time-range data instead of silently truncating', () => {
    const cases: Array<[string, any]> = [
        ['fractional-length', { length: 1.5, start: () => 0, end: () => 1 }],
        ['over-cap-length', { length: 65, start: () => 0, end: () => 1 }],
        ['negative-length', { length: -1, start: () => 0, end: () => 1 }],
        ['nonfinite-length', { length: Number.POSITIVE_INFINITY, start: () => 0, end: () => 1 }],
        ['reversed', { length: 1, start: () => 2, end: () => 1 }],
        ['nonfinite-endpoint', { length: 1, start: () => 0, end: () => Number.NaN }],
        ['overlapping', { length: 2, start: (index: number) => index === 0 ? 0 : 0.5, end: (index: number) => index === 0 ? 1 : 2 }],
        ['out-of-order', { length: 2, start: (index: number) => index === 0 ? 2 : 1, end: (index: number) => index === 0 ? 3 : 2 }],
    ];
    for (const [name, ranges] of cases) {
        const realm = createRealm();
        const element = new realm.Audio(AMBIENT_WARROOM);
        element.buffered = ranges;
        element.play();
        const snapshot = realm.api.snapshot();
        const entry = snapshot.registry.entries[0];
        expect(Object.keys(entry.readErrors).some((key) => key.startsWith('buffered')), name).toBe(true);
        expect(snapshot.invalidReasons, name).toContain('state-read-failure');
        expect(snapshot.valid, name).toBe(false);
    }
});

test('detects descriptor flag tampering on play and setActionHandler', () => {
    const playRealm = createRealm();
    const playDescriptor = Object.getOwnPropertyDescriptor(playRealm.HTMLMediaElement.prototype, 'play');
    Object.defineProperty(playRealm.HTMLMediaElement.prototype, 'play', {
        ...playDescriptor,
        enumerable: playDescriptor?.enumerable !== true,
    });
    expect(playRealm.api.snapshot().invalidReasons).toContain('play-descriptor-tampered');

    const handlerRealm = createRealm();
    const session = requireMediaSession(handlerRealm);
    const ownDescriptor = Object.getOwnPropertyDescriptor(session, 'setActionHandler');
    Object.defineProperty(session, 'setActionHandler', {
        ...ownDescriptor,
        enumerable: ownDescriptor?.enumerable !== true,
    });
    expect(handlerRealm.api.snapshot().invalidReasons).toContain('setActionHandler-descriptor-tampered');
});

test('rejects a forged frozen API and accepts only an explicit genuine prior reference', () => {
    let forgedSnapshotCalls = 0;
    const forged = Object.freeze({
        __marker: 'awwv-native-media-seek-sentinel-api-v1',
        schema: 'awwv.native-media-seek-sentinel.v1',
        snapshot() {
            forgedSnapshotCalls += 1;
            return { valid: true };
        },
        resolve() {
            return { ok: true };
        },
    });
    const forgedRealm = createRealm({ preexistingGlobal: forged });
    expect(forgedRealm.report).toMatchObject({ installed: false, reason: 'foreign-global' });
    expect(forgedRealm.window[KEY]).toBe(forged);
    expect(forgedSnapshotCalls).toBe(0);
    expect(requireMediaSession(forgedRealm).calls.length).toBe(0);

    const genuine = createRealm();
    expect(genuine.report.api).toBe(genuine.api);
    const idempotent = genuine.install(genuine.report.api);
    expect(idempotent).toMatchObject({ installed: true, idempotent: true, diagnosticValid: true });
    expect(genuine.window[KEY]).toBe(genuine.report.api);
    expect(requireMediaSession(genuine).calls.length).toBe(3);

    const noHandle = createRealm();
    const genuineApi = noHandle.report.api;
    expect(noHandle.install()).toMatchObject({ installed: false, reason: 'foreign-global' });
    expect(noHandle.window[KEY]).toBe(genuineApi);
});

test('setActionHandler delegates without coercing or reading custom action fields', () => {
    const realm = createRealm();
    const session = requireMediaSession(realm);
    let coercions = 0;
    const actionObject = {
        toString() {
            coercions += 1;
            throw new Error('toString must not run');
        },
        [Symbol.toPrimitive]() {
            coercions += 1;
            throw new Error('toPrimitive must not run');
        },
    };
    const handler = () => undefined;
    const returned = session.setActionHandler(actionObject as any, handler);
    expect(returned).toBe('native-set-return');
    expect(coercions).toBe(0);
    expect(session.calls[session.calls.length - 1].action).toBe(actionObject);
    expect(session.handlers.get(actionObject)).toBe(handler);
    expect(realm.api.snapshot().events.records.some((record: any) =>
        record.kind === 'action-registration' && record.action === null && record.actionType === 'object')).toBe(true);

    session.failAction = actionObject;
    let caught: any = null;
    try {
        session.setActionHandler(actionObject as any, handler);
    } catch (error) {
        caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('registration failed for native action');
    expect(coercions).toBe(0);
});

test('reports registration exceptions, partial coverage, rollback and does not wrap play', () => {
    const realm = createRealm({ failAction: 'seekforward' });
    expect(realm.report.installed).toBe(false);
    const snapshot = realm.api.snapshot();
    expect(snapshot.install.status).toBe('partial');
    expect(snapshot.install.installedActions).toEqual(['seekto']);
    expect(snapshot.install.registrationFailures[0].action).toBe('seekforward');
    expect(snapshot.install.rollback.some((row: any) => row.action === 'seekto')).toBe(true);
    expect(snapshot.invalidReasons).toContain('media-session-registration-failure');
    expect(snapshot.install.playWrapped).toBe(false);
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.play();
    expect(realm.api.snapshot().registry.count).toBe(0);
});

test('intercepts later action registration and detects handler/play replacement', () => {
    const realm = createRealm();
    const session = requireMediaSession(realm);
    const pauseHandler = () => undefined;
    session.setActionHandler('pause', pauseHandler);
    expect(session.handlers.get('pause')).toBe(pauseHandler);
    let snapshot = realm.api.snapshot();
    expect(snapshot.valid).toBe(false);
    expect(snapshot.invalidReasons).toContain('action-registration-after-install');
    expect(snapshot.events.records.some((record: any) => record.kind === 'action-registration' && record.action === 'pause')).toBe(true);

    const replacement = function replacementSetActionHandler() { return 'replacement'; };
    session.setActionHandler = replacement;
    snapshot = realm.api.snapshot();
    expect(snapshot.invalidReasons).toContain('setActionHandler-replaced');
    expect(snapshot.valid).toBe(false);

    const playReplacement = function replacementPlay() { return 'replacement-play'; };
    realm.HTMLMediaElement.prototype.play = playReplacement;
    snapshot = realm.api.snapshot();
    expect(snapshot.invalidReasons).toContain('play-replaced');
    expect(snapshot.valid).toBe(false);
});

test('rejects an arbitrary preexisting global and own setActionHandler shadow without trusting it', () => {
    const foreign = {
        snapshot: () => ({ valid: true, naturalOriginAdmitted: true }),
        resolve: () => ({ ok: true }),
    };
    const realm = createRealm({ preexistingGlobal: foreign });
    expect(realm.report.installed).toBe(false);
    expect(realm.report.reason).toBe('foreign-global');
    expect(realm.window[KEY]).toBe(foreign);
    expect(requireMediaSession(realm).calls.length).toBe(0);

    const shadowed = createRealm({ ownSetActionHandlerShadow: true });
    const snapshot = shadowed.api.snapshot();
    expect(snapshot.valid).toBe(false);
    expect(snapshot.invalidReasons).toContain('setActionHandler-own-shadow');
    expect(snapshot.install.status).toBe('installed');
});

test('invoking any sentinel records finite details, invalidates the diagnostic and does not change currentTime', () => {
    const realm = createRealm();
    const session = requireMediaSession(realm);
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.play();
    const before = element.currentTime;
    session.handlers.get('seekto')({ seekTime: 12.5 });
    session.handlers.get('seekforward')({ seekOffset: 3, fastSeek: true });
    session.handlers.get('seekbackward')({ seekOffset: Number.NaN, seekTime: Number.POSITIVE_INFINITY });
    const snapshot = realm.api.snapshot();
    expect(element.currentTime).toBe(before);
    expect(snapshot.valid).toBe(false);
    expect(snapshot.invalidReasons).toContain('media-session-action-invoked');
    const actions = snapshot.events.records.filter((record: any) => record.kind === 'media-session-action');
    expect(actions.map((record: any) => record.action)).toEqual(['seekto', 'seekforward', 'seekbackward']);
    expect(actions[0]).toMatchObject({ seekTime: 12.5, seekOffset: null, fastSeek: null, performed: false });
    expect(actions[1]).toMatchObject({ seekTime: null, seekOffset: 3, fastSeek: true, performed: false });
    expect(actions[2]).toMatchObject({ seekTime: null, seekOffset: null, fastSeek: null, performed: false });
    expect(snapshot.events.records.every((record: any) => Number.isFinite(record.at?.dateNow) || record.at?.dateNow === null)).toBe(true);
});

test('bounds append-only diagnostic events at 128 and reports truncation', () => {
    const realm = createRealm();
    const session = requireMediaSession(realm);
    for (let index = 0; index < 140; index += 1) session.handlers.get('seekto')({ seekTime: index });
    const snapshot = realm.api.snapshot();
    expect(snapshot.events.capacity).toBe(128);
    expect(snapshot.events.count).toBe(128);
    expect(snapshot.events.truncated).toBe(true);
    expect(snapshot.invalidReasons).toContain('event-overflow');
    expect(snapshot.valid).toBe(false);
});

test('is idempotent only for the same known API instance', () => {
    const realm = createRealm();
    const session = requireMediaSession(realm);
    const first = realm.api;
    const firstPlay = realm.HTMLMediaElement.prototype.play;
    expect(realm.report.api).toBe(first);
    const secondReport = realm.install(realm.report.api);
    const second = realm.window[KEY];
    expect(secondReport.installed).toBe(true);
    expect(secondReport.idempotent).toBe(true);
    expect(secondReport.diagnosticValid).toBe(true);
    expect(second).toBe(first);
    expect(realm.HTMLMediaElement.prototype.play).toBe(firstPlay);
    expect(session.calls.length).toBe(3);
    expect(Object.isFrozen(second)).toBe(true);

    const noHandle = createRealm();
    const genuineApi = noHandle.report.api;
    expect(noHandle.install()).toMatchObject({ installed: false, reason: 'foreign-global' });
    expect(noHandle.window[KEY]).toBe(genuineApi);
});
