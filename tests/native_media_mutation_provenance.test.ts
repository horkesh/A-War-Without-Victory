import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test, expect } from 'vitest';

/*
 * Controlled-QA native media mutation provenance tests.
 *
 * The installer is serialized with toString() and executed inside a synthetic
 * browser realm. No real browser, OS command, audio element, DOM implementation
 * or network is used. The synthetic MutationObserver queues records
 * synchronously; takeRecords() mirrors the browser drain used by the helper.
 */

const require = createRequire(import.meta.url);
const KEY = '__AWWV_NATIVE_MEDIA_MUTATION_PROVENANCE__';
const SENTINEL_KEY = '__AWWV_NATIVE_MEDIA_SEEK_SENTINEL__';
const ORIGIN = 'http://127.0.0.1:43123';
const AMBIENT_WARROOM = `${ORIGIN}/assets/ambient_warroom-abc123.ogg`;
const AMBIENT_FIELD = `${ORIGIN}/assets/ambient_field-def456.ogg`;
const AMBIENT_ARCHIVE = `${ORIGIN}/assets/ambient_archive-ghi789.ogg`;

function installerSource(): string {
    return require('../tools/ui/native_media_mutation_provenance.cjs')
        .installNativeMediaMutationProvenance.toString();
}

function sentinelInstallerSource(): string {
    return require('../tools/ui/native_media_seek_sentinel.cjs')
        .installMediaSessionSeekSentinel.toString();
}

type Behavior = (this: any, args: IArguments) => any;

type FakeRecord = {
    type: 'attributes' | 'childList';
    target: any;
    attributeName?: string;
    oldValue?: string | null;
    addedNodes?: any[];
    removedNodes?: any[];
};

class BaseMutationObserver {
    recordSink: FakeRecord[];
    targets: Array<{ target: any; options: any }> = [];
    active = true;

    constructor(public callback: (records: FakeRecord[], observer: BaseMutationObserver) => void, sink: FakeRecord[]) {
        this.recordSink = sink;
    }

    observe(target: any, options: any) {
        this.targets.push({ target, options: options ?? {} });
    }

    disconnect() {
        this.active = false;
        this.targets = [];
        this.recordSink.length = 0;
    }

    takeRecords() {
        const records = this.recordSink.slice();
        this.recordSink.length = 0;
        return records;
    }
}

function createRealm(options: {
    url?: string;
    readyState?: string;
    wrongRealm?: boolean;
    noMutationObserver?: boolean;
    noWeakRef?: boolean;
    noWeakSet?: boolean;
    noURL?: boolean;
    noAudio?: boolean;
    noMediaElement?: boolean;
    noPlayMethod?: boolean;
    noPauseMethod?: boolean;
    noLoadMethod?: boolean;
    noFastSeek?: boolean;
    missingSetters?: string[];
    preexistingGlobal?: any;
    weakRefClass?: any;
    now?: number;
    performanceNow?: number;
    srcObjectInitial?: any;
    mediaSession?: boolean;
} = {}) {
    const state = {
        playBehavior: null as Behavior | null,
        pauseBehavior: null as Behavior | null,
        loadBehavior: null as Behavior | null,
        fastSeekBehavior: null as Behavior | null,
        playCalls: [] as Array<{ receiver: any; args: any[] }>,
        currentTimeThrow: null as any,
        preloadThrow: null as any,
    };

    const observers: BaseMutationObserver[] = [];

    class FakeMutationObserver extends BaseMutationObserver {
        constructor(callback: (records: FakeRecord[], observer: BaseMutationObserver) => void) {
            super(callback, [] as FakeRecord[]);
            observers.push(this);
        }
    }

    function queueRecord(record: FakeRecord, target: any) {
        for (const observer of observers) {
            if (!observer.active) continue;
            for (const registration of observer.targets) {
                let matches = registration.target === target;
                if (!matches && registration.options.subtree) {
                    let parent = target?._parent;
                    while (parent) {
                        if (parent === registration.target) {
                            matches = true;
                            break;
                        }
                        parent = parent._parent;
                    }
                }
                if (matches) observer.recordSink.push({ ...record, target });
            }
        }
    }

    class FakeAttributes {
        constructor(public element: any) {}

        getNamedItem(name: string) {
            return this.element._attrs.has(name)
                ? { name, value: this.element._attrs.get(name), ownerElement: this.element }
                : null;
        }

        setNamedItem(attribute: any) {
            const previous = this.getNamedItem(attribute.name);
            this.element.setAttribute(attribute.name, attribute.value);
            return previous;
        }

        removeNamedItem(name: string) {
            const previous = this.getNamedItem(name);
            this.element.removeAttribute(name);
            return previous;
        }
    }

    class FakeHTMLMediaElement {
        _src = '';
        _currentSrc = '';
        _currentTime = 0;
        _loop = false;
        _controls = false;
        _autoplay = false;
        _preload = 'auto';
        _playbackRate = 1;
        _defaultPlaybackRate = 1;
        _srcObject: any = null;
        _attrs = new Map<string, string>();
        _parent: any = null;
        _children: any[] = [];
        _attributesFacade: FakeAttributes;
        _ownerDocument: any = null;
        duration = 10;
        paused = true;
        seeking = false;
        readyState = 4;
        error: any = null;

        constructor(source?: any) {
            this._attributesFacade = new FakeAttributes(this);
            this._srcObject = options.srcObjectInitial ?? null;
            if (source !== undefined) {
                const text = String(source);
                this._src = text;
                this._currentSrc = text;
                this._attrs.set('src', text);
            }
        }

        get ownerDocument() {
            return this._ownerDocument || document;
        }

        get attributes() {
            return this._attributesFacade;
        }

        getAttribute(name: string) {
            return this._attrs.has(name) ? this._attrs.get(name)! : null;
        }

        setAttribute(name: string, value: any) {
            const oldValue = this.getAttribute(name);
            this._attrs.set(name, String(value));
            queueRecord({ type: 'attributes', target: this, attributeName: name, oldValue }, this);
        }

        removeAttribute(name: string) {
            const oldValue = this.getAttribute(name);
            this._attrs.delete(name);
            queueRecord({ type: 'attributes', target: this, attributeName: name, oldValue }, this);
        }

        appendChild(node: any) {
            node._parent = this;
            this._children.push(node);
            queueRecord({ type: 'childList', target: this, addedNodes: [node], removedNodes: [] }, this);
            return node;
        }

        get src() {
            return this._src;
        }

        set src(value: any) {
            const text = String(value);
            this._src = text;
            this._currentSrc = text;
            this.setAttribute('src', text);
        }

        get currentSrc() {
            return this._currentSrc;
        }

        get currentTime() {
            return this._currentTime;
        }

        set currentTime(value: any) {
            if (state.currentTimeThrow) throw state.currentTimeThrow;
            this._currentTime = Number(value);
        }

        get loop() {
            return this._loop;
        }

        set loop(value: any) {
            const next = Boolean(value);
            this._loop = next;
            if (next) this.setAttribute('loop', '');
            else this.removeAttribute('loop');
        }

        get controls() {
            return this._controls;
        }

        set controls(value: any) {
            const next = Boolean(value);
            this._controls = next;
            if (next) this.setAttribute('controls', '');
            else this.removeAttribute('controls');
        }

        get autoplay() {
            return this._autoplay;
        }

        set autoplay(value: any) {
            const next = Boolean(value);
            this._autoplay = next;
            if (next) this.setAttribute('autoplay', '');
            else this.removeAttribute('autoplay');
        }

        get playbackRate() {
            return this._playbackRate;
        }

        get preload() {
            return this._preload;
        }

        set preload(value: any) {
            if (state.preloadThrow) throw state.preloadThrow;
            const text = String(value);
            this._preload = text;
            this.setAttribute('preload', text);
        }

        set playbackRate(value: any) {
            this._playbackRate = Number(value);
        }

        get defaultPlaybackRate() {
            return this._defaultPlaybackRate;
        }

        set defaultPlaybackRate(value: any) {
            this._defaultPlaybackRate = Number(value);
        }

        get srcObject() {
            return this._srcObject;
        }

        set srcObject(value: any) {
            this._srcObject = value;
            if (value) {
                this._src = '';
                this._currentSrc = '';
            }
        }

        play(..._args: any[]) {
            return state.playBehavior!.call(this, arguments);
        }

        pause(..._args: any[]) {
            return state.pauseBehavior!.call(this, arguments);
        }

        load(..._args: any[]) {
            return state.loadBehavior!.call(this, arguments);
        }

        fastSeek(..._args: any[]) {
            return state.fastSeekBehavior!.call(this, arguments);
        }
    }

    class FakeAudio extends FakeHTMLMediaElement {}

    const mediaPrototype: any = FakeHTMLMediaElement.prototype;
    if (options.noPlayMethod) delete mediaPrototype.play;
    if (options.noPauseMethod) delete mediaPrototype.pause;
    if (options.noLoadMethod) delete mediaPrototype.load;
    if (options.noFastSeek) delete mediaPrototype.fastSeek;
    for (const setter of options.missingSetters ?? []) delete mediaPrototype[setter];

    state.playBehavior = function (this: any, args: IArguments) {
        state.playCalls.push({ receiver: this, args: Array.from(args) });
        this.paused = false;
        return 'play-return';
    };
    state.pauseBehavior = function (this: any) {
        this.paused = true;
        return 'pause-return';
    };
    state.loadBehavior = function (this: any) {
        this._currentTime = 0;
        return 'load-return';
    };
    state.fastSeekBehavior = function (this: any, args: IArguments) {
        this._currentTime = Number(args[0]);
        return 'fastSeek-return';
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

    class FakeMediaSession {
        handlers = new Map<any, any>();
        calls: Array<{ action: any; handler: any }> = [];

        setActionHandler(action: any, handler: any) {
            this.calls.push({ action, handler });
            this.handlers.set(action, handler);
            return 'native-set-return';
        }
    }

    const mediaSession = options.mediaSession === false ? null : new FakeMediaSession();
    const navigator: any = { mediaSession };
    const weakRefValue = options.noWeakRef ? undefined : (options.weakRefClass ?? WeakRef);
    const window: any = {
        location,
        document,
        navigator,
        HTMLMediaElement: options.noMediaElement ? undefined : FakeHTMLMediaElement,
        Audio: options.noAudio ? undefined : FakeAudio,
        MutationObserver: options.noMutationObserver ? undefined : FakeMutationObserver,
        URL: options.noURL ? undefined : URL,
        WeakMap,
        WeakSet: options.noWeakSet ? undefined : WeakSet,
        WeakRef: weakRefValue,
        Date: { now: () => options.now ?? 1000 },
        performance: { now: () => options.performanceNow ?? 2000 },
    };
    window.window = options.wrongRealm ? {} : window;
    document.defaultView = window;
    if (options.preexistingGlobal !== undefined) window[KEY] = options.preexistingGlobal;

    const originalAudio = FakeAudio;
    const originals = {
        Audio: FakeAudio,
        play: mediaPrototype.play,
        pause: mediaPrototype.pause,
        load: mediaPrototype.load,
        fastSeek: mediaPrototype.fastSeek,
        setters: {} as Record<string, any>,
    };
    for (const name of [
        'currentTime',
        'src',
        'srcObject',
        'playbackRate',
        'defaultPlaybackRate',
        'loop',
        'controls',
        'autoplay',
        'preload',
    ]) {
        const descriptor = Object.getOwnPropertyDescriptor(mediaPrototype, name);
        originals.setters[name] = descriptor?.set;
    }

    const context: any = {
        window,
        document,
        navigator: window.navigator,
        location,
        HTMLMediaElement: window.HTMLMediaElement,
        Audio: window.Audio,
        MutationObserver: window.MutationObserver,
        URL: window.URL,
        WeakMap: window.WeakMap,
        WeakSet: window.WeakSet,
        WeakRef: window.WeakRef,
        Date: window.Date,
        performance: window.performance,
    };
    const realmObject = vm.runInNewContext('Object', context);
    const install = vm.runInNewContext(`(${installerSource()})`, context);
    const sentinelInstall = vm.runInNewContext(`(${sentinelInstallerSource()})`, context);
    let report: any;
    try {
        report = install();
    } catch (error) {
        report = { installed: false, diagnosticValid: false, reason: 'threw', error: String(error) };
    }

    return {
        window,
        document,
        location,
        navigator,
        mediaSession,
        state,
        observers,
        originalAudio,
        originals,
        HTMLMediaElement: FakeHTMLMediaElement,
        Audio: window.Audio,
        realmObject,
        install,
        sentinelInstall,
        report,
        api: window[KEY],
    };
}

function expectAmbient(realm: ReturnType<typeof createRealm>, url = AMBIENT_WARROOM) {
    const element = new realm.Audio(url);
    const description = realm.api.describe(element);
    expect(description.valid).toBe(true);
    expect(description.element.sourceIsAmbient).toBe(true);
    return { element, description };
}

function composeSentinel(realm: ReturnType<typeof createRealm>) {
    const priorDescriptor = Object.getOwnPropertyDescriptor(realm.HTMLMediaElement.prototype, 'play')!;
    const sentinelReport = realm.sentinelInstall();
    const binding = realm.report.bindPlayLayer({ priorDescriptor, sentinelResult: sentinelReport });
    return { priorDescriptor, sentinelReport, binding };
}

test('installs a frozen diagnostic API and describes initial ambient construction', () => {
    const realm = createRealm();
    expect(realm.report).toMatchObject({ installed: true, idempotent: false, diagnosticValid: true });
    expect(Object.isFrozen(realm.api)).toBe(true);
    const descriptor = Object.getOwnPropertyDescriptor(realm.window, KEY);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);

    const element = new realm.Audio(AMBIENT_WARROOM);
    const description = realm.api.describe(element);
    expect(description.valid).toBe(true);
    expect(description.reason).toBe(null);
    expect(description.schema).toBe('awwv.native-media-mutation-provenance.v1');
    expect(description.diagnosticOnly).toBe(true);
    expect(description.element.id).toMatch(/^media:\d+$/);
    expect(description.element.sourceEpoch).toBe(1);
    expect(description.element.source).toBe(AMBIENT_WARROOM);
    expect(description.element.sourceIsAmbient).toBe(true);
    expect(description.element.createdByInstalledConstructor).toBe(true);
    expect(description.element.subclass).toBe(false);
    expect(description.provenance.attributes).toMatchObject({
        src: AMBIENT_WARROOM,
        loop: null,
        controls: null,
        autoplay: null,
        preload: null,
    });
    expect(description.provenance.rateAttributes).toEqual({
        playbackRate: null,
        defaultPlaybackRate: null,
    });
    expect(description.provenance.rateProperties).toEqual({
        playbackRate: 1,
        defaultPlaybackRate: 1,
    });
    expect(description.provenance.autoplayEnabled).toBe(false);
    expect(description.provenance.continuity).toMatchObject({
        playCount: 0,
        pauseCount: 0,
        lastPlaySequence: null,
        lastPauseSequence: null,
    });
    expect(JSON.parse(JSON.stringify(description))).toEqual(description);

    const snapshot = realm.api.snapshot();
    expect(snapshot.valid).toBe(true);
    expect(snapshot.diagnosticOnly).toBe(true);
    expect(snapshot.applicationAcceptance).toBe(false);
    expect(snapshot.universalProvenance).toBe(false);
    expect(snapshot.install).toMatchObject({
        status: 'installed',
        readyStateAtInstall: 'loading',
        origin: ORIGIN,
        realmValid: true,
        originValid: true,
        lateInstallation: false,
    });
    expect(snapshot.install.installedAt).toEqual({ dateNow: 1000, performanceNow: 2000 });
    expect(snapshot.coverage.methods).toMatchObject({
        play: 'wrapped',
        pause: 'wrapped',
        load: 'wrapped',
        fastSeek: 'wrapped',
    });
    expect(snapshot.coverage.setters).toMatchObject({
        currentTime: 'wrapped',
        src: 'wrapped',
        srcObject: 'wrapped',
        playbackRate: 'wrapped',
        defaultPlaybackRate: 'wrapped',
        loop: 'wrapped',
        controls: 'wrapped',
        autoplay: 'wrapped',
        preload: 'wrapped',
    });
    expect(snapshot.coverage.sourceEpoch).toMatchObject({
        semantics: 'monotonic-per-object',
        sameUrlReloadAdvancesEpoch: true,
        urlEqualityPreservesEpoch: false,
        initialNonEmptySourceEpoch: 1,
        emptySourceEpoch: 0,
    });
    expect(snapshot.coverage.sourceEpoch.advancesOn).toEqual([
        'src-setter-success',
        'srcObject-setter-success',
        'load-success',
    ]);
    expect(snapshot.coverage.attributesCaptured).toEqual(['src', 'loop', 'controls', 'autoplay', 'preload']);
    expect(snapshot.coverage.rateProperties.attributeReflection).toBe(false);
    expect(snapshot.coverage.srcObject.attributeReflection).toBe(false);
    expect(snapshot.coverage.autoplay).toBe('rejected');
    expect(snapshot.coverage.sourceChildren).toBe('unsupported-invalidating');
    expect(snapshot.coverage.unknownCreation).toBe('unsupported-invalidating');
    expect(snapshot.coverage.mutationObserver).toMatchObject({
        attributes: true,
        childList: true,
        subtree: true,
        recordCap: 64,
        drainBeforeValidation: true,
        unexplainedMutations: 'invalidate',
    });
    expect(snapshot.coverage.limits).toEqual({
        events: 256,
        entries: 16,
        observerRecordsPerObject: 64,
    });
    expect(snapshot.coverage.browserTamperResistance).toBe(false);
    expect(snapshot.registry.count).toBe(1);
    expect(snapshot.registry.entries[0].id).toBe(description.element.id);
    expect(snapshot.events.records.every((record: any) =>
        Number.isFinite(record.at?.dateNow) || record.at?.dateNow === null)).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
});

test('keeps exact identity distinct for equal URLs and advances epoch on same-URL reset', () => {
    const realm = createRealm();
    const first = new realm.Audio(AMBIENT_WARROOM);
    const second = new realm.Audio(AMBIENT_WARROOM);
    const firstDescription = realm.api.describe(first);
    const secondDescription = realm.api.describe(second);
    expect(firstDescription.element.id).not.toBe(secondDescription.element.id);
    expect(firstDescription.element.sourceEpoch).toBe(1);
    expect(secondDescription.element.sourceEpoch).toBe(1);

    first.src = AMBIENT_WARROOM;
    const reset = realm.api.describe(first);
    expect(reset.valid).toBe(true);
    expect(reset.element.id).toBe(firstDescription.element.id);
    expect(reset.element.sourceEpoch).toBe(2);
    expect(realm.api.describe(second).element.sourceEpoch).toBe(1);
    expect(realm.api.describe(second).element.id).toBe(secondDescription.element.id);

    first.src = AMBIENT_WARROOM;
    first.load();
    const final = realm.api.describe(first);
    expect(final.element.sourceEpoch).toBe(4);
    expect(final.element.source).toBe(AMBIENT_WARROOM);

    const snapshot = realm.api.snapshot();
    expect(snapshot.registry.count).toBe(2);
    expect(snapshot.registry.duplicateSources).toContain(AMBIENT_WARROOM);
    expect(snapshot.coverage.sourceEpoch.sameUrlReloadAdvancesEpoch).toBe(true);
});

test('records currentTime, fastSeek, pause, load, source, rate, loop and control intent', () => {
    const realm = createRealm();
    const { element } = expectAmbient(realm, AMBIENT_FIELD);
    element.currentTime = 5;
    element.playbackRate = 1.25;
    element.defaultPlaybackRate = 1.5;
    element.loop = true;
    element.controls = true;
    expect(element.fastSeek(2)).toBe('fastSeek-return');
    expect(element.pause()).toBe('pause-return');
    expect(element.play()).toBe('play-return');
    expect(element.load()).toBe('load-return');

    const description = realm.api.describe(element);
    expect(description.valid).toBe(true);
    expect(description.element.sourceEpoch).toBe(2);
    expect(description.provenance.attributes).toMatchObject({
        src: AMBIENT_FIELD,
        loop: '',
        controls: '',
        autoplay: null,
    });
    expect(description.provenance.rateProperties).toEqual({
        playbackRate: 1.25,
        defaultPlaybackRate: 1.5,
    });
    expect(description.provenance.continuity.playCount).toBe(1);
    expect(description.provenance.continuity.pauseCount).toBe(1);
    expect(description.provenance.continuity.lastPlaySequence).toBeGreaterThan(
        description.provenance.continuity.lastPauseSequence,
    );
    for (const name of ['currentTime', 'playbackRate', 'defaultPlaybackRate', 'loop', 'controls', 'fastSeek', 'pause', 'play', 'load']) {
        expect(description.mutationCounts.byName[name], name).toBeGreaterThan(0);
    }
    expect(realm.api.snapshot().coverage.methods.fastSeek).toBe('wrapped');
});

test('preserves constructor coercion, new.target/subclass behavior and no-new failure', () => {
    const realm = createRealm();
    let coercions = 0;
    const argument = {
        toString() {
            coercions += 1;
            return AMBIENT_FIELD;
        },
    };
    const element = new realm.Audio(argument as any);
    expect(coercions).toBe(1);
    expect(element.src).toBe(AMBIENT_FIELD);
    expect(element).toBeInstanceOf(realm.HTMLMediaElement);
    expect(Object.getPrototypeOf(element)).toBe(realm.originalAudio.prototype);
    expect(realm.api.describe(element).valid).toBe(true);

    expect(() => (realm.Audio as any)(AMBIENT_WARROOM)).toThrow(TypeError);

    class SubAudio extends realm.Audio {
        marker = 'sub';

        constructor(source?: any) {
            super(source);
        }
    }
    const subclass = new SubAudio(AMBIENT_ARCHIVE);
    expect(subclass).toBeInstanceOf(SubAudio);
    expect(subclass).toBeInstanceOf(realm.originalAudio);
    expect((subclass as any).marker).toBe('sub');
    const description = realm.api.describe(subclass);
    expect(description.valid).toBe(false);
    expect(description.reason).toBe('unsupported-subclass');
    expect(description.element.subclass).toBe(true);
    expect(description.element.sourceEpoch).toBe(1);
    expect(realm.api.describe(subclass).reason).toBe('unsupported-subclass');
    expect(realm.api.snapshot().valid).toBe(true);
});

test('preserves play receiver, arguments, return, promise and exception exactly', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    const promise = Promise.resolve('exact-promise');
    realm.state.playBehavior = function (this: any, args: IArguments) {
        realm.state.playCalls.push({ receiver: this, args: Array.from(args) });
        return promise;
    };
    expect(element.play('one', 2)).toBe(promise);
    expect(realm.state.playCalls[0].receiver).toBe(element);
    expect(realm.state.playCalls[0].args).toEqual(['one', 2]);

    const thrown = new Error('exact-play-error');
    realm.state.playBehavior = function () {
        throw thrown;
    };
    let caught: any = null;
    try {
        element.play();
    } catch (error) {
        caught = error;
    }
    expect(caught).toBe(thrown);

    const records = realm.api.snapshot().events.records.filter((record: any) =>
        record.name === 'play' && record.kind === 'mutation-attempt');
    expect(records.length).toBe(2);
    expect(records[0]).toMatchObject({ argTypes: ['string', 'number'], argumentCount: 2 });
    expect(records[1]).toMatchObject({ argTypes: [], argumentCount: 0 });
    expect(realm.api.snapshot().events.records.some((record: any) =>
        record.kind === 'mutation-result' && record.name === 'play' && record.outcome === 'threw')).toBe(true);
    expect(realm.api.snapshot().valid).toBe(true);
});

test('does not pre-coerce setter arguments and preserves setter exceptions exactly', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    let coercions = 0;
    const argument = {
        [Symbol.toPrimitive]() {
            coercions += 1;
            return 1.25;
        },
    };
    (element as any).playbackRate = argument;
    expect(coercions).toBe(1);
    expect(element.playbackRate).toBe(1.25);
    expect(realm.api.describe(element).valid).toBe(true);

    const thrown = new Error('exact-currentTime-error');
    realm.state.currentTimeThrow = thrown;
    let caught: any = null;
    try {
        element.currentTime = 7;
    } catch (error) {
        caught = error;
    }
    expect(caught).toBe(thrown);
    expect(element.currentTime).toBe(0);
    const snapshot = realm.api.snapshot();
    expect(snapshot.valid).toBe(true);
    const attempted = snapshot.events.records.filter((record: any) =>
        record.name === 'currentTime' && record.kind === 'mutation-attempt');
    const threw = snapshot.events.records.filter((record: any) =>
        record.name === 'currentTime' && record.kind === 'mutation-result' && record.outcome === 'threw');
    expect(attempted.length).toBe(1);
    expect(threw.length).toBe(1);
    expect(JSON.stringify(snapshot.events.records)).not.toContain('exact-currentTime-error');
});

test('accepts the actual startup preload auto, loop true and play composition', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.preload = 'auto';
    element.loop = true;
    expect(element.play()).toBe('play-return');

    const description = realm.api.describe(element);
    expect(description.valid).toBe(true);
    expect(description.provenance.attributes).toMatchObject({
        src: AMBIENT_WARROOM,
        preload: 'auto',
        loop: '',
    });
    expect(description.mutationCounts.byName.preload).toBe(1);
    expect(description.mutationCounts.byName.loop).toBe(1);
    expect(description.mutationCounts.byName.play).toBe(1);

    const records = realm.api.snapshot().events.records;
    expect(records.filter((record: any) =>
        record.kind === 'mutation-attempt' && record.name === 'preload')).toHaveLength(1);
    expect(records.filter((record: any) =>
        record.kind === 'mutation-result'
        && record.name === 'preload'
        && record.outcome === 'success')).toHaveLength(1);
    expect(realm.api.snapshot().coverage.setters.preload).toBe('wrapped');
});

test('records same-value preload writes and preserves preload coercion and exceptions', () => {
    const sameValue = createRealm();
    const sameElement = new sameValue.Audio(AMBIENT_WARROOM);
    sameElement.preload = 'auto';
    sameElement.preload = 'auto';
    const sameDescription = sameValue.api.describe(sameElement);
    expect(sameDescription.valid).toBe(true);
    expect(sameDescription.provenance.attributes.preload).toBe('auto');
    expect(sameDescription.mutationCounts.byName.preload).toBe(2);
    const sameRecords = sameValue.api.snapshot().events.records;
    expect(sameRecords.filter((record: any) =>
        record.kind === 'mutation-attempt' && record.name === 'preload')).toHaveLength(2);
    expect(sameRecords.filter((record: any) =>
        record.kind === 'mutation-result' && record.name === 'preload')).toHaveLength(2);

    const coercing = createRealm();
    const coercingElement = new coercing.Audio(AMBIENT_WARROOM);
    let coercions = 0;
    const argument = {
        toString() {
            coercions += 1;
            return 'metadata';
        },
    };
    coercingElement.preload = argument as any;
    expect(coercions).toBe(1);
    expect(coercingElement.preload).toBe('metadata');
    expect(coercing.api.describe(coercingElement).valid).toBe(true);

    const throwing = createRealm();
    const throwingElement = new throwing.Audio(AMBIENT_WARROOM);
    const thrown = new Error('exact-preload-error');
    throwing.state.preloadThrow = thrown;
    let caught: any = null;
    try {
        throwingElement.preload = 'none';
    } catch (error) {
        caught = error;
    }
    expect(caught).toBe(thrown);
    expect(throwingElement.preload).toBe('auto');
    const throwingSnapshot = throwing.api.snapshot();
    expect(throwingSnapshot.valid).toBe(true);
    expect(throwingSnapshot.events.records.some((record: any) =>
        record.kind === 'mutation-result'
        && record.name === 'preload'
        && record.outcome === 'threw')).toBe(true);
    expect(JSON.stringify(throwingSnapshot.events.records)).not.toContain('exact-preload-error');
});

test('rejects unexplained direct, NamedNodeMap and asynchronous preload mutations', () => {
    const direct = createRealm();
    const directElement = new direct.Audio(AMBIENT_WARROOM);
    directElement.setAttribute('preload', 'none');
    expect(direct.api.describe(directElement).valid).toBe(false);
    expect(direct.api.describe(directElement).reason).toBe('unexplained-attribute-mutation');
    expect(direct.api.snapshot().invalidReasons).toContain('unexplained-mutation');

    const named = createRealm();
    const namedElement = new named.Audio(AMBIENT_WARROOM);
    namedElement.attributes.setNamedItem({ name: 'preload', value: 'none' });
    expect(named.api.describe(namedElement).reason).toBe('unexplained-attribute-mutation');

    const asynchronous = createRealm();
    const asynchronousElement = new asynchronous.Audio(AMBIENT_WARROOM);
    asynchronousElement.preload = 'metadata';
    expect(asynchronous.api.describe(asynchronousElement).valid).toBe(true);
    asynchronous.observers[0].callback(
        [{ type: 'attributes', target: asynchronousElement, attributeName: 'preload' }],
        asynchronous.observers[0],
    );
    const asynchronousDescription = asynchronous.api.describe(asynchronousElement);
    expect(asynchronousDescription.valid).toBe(false);
    expect(asynchronousDescription.reason).toBe('unexplained-attribute-mutation');
});

test('logs non-ambient, query/hash/cross-origin, parser and missing sources without admitting them', () => {
    const realm = createRealm();
    for (const source of [
        `${ORIGIN}/assets/music-theme.ogg`,
        `${ORIGIN}/assets/ambient_warroom-abc123.ogg?cache=1`,
        `${ORIGIN}/assets/ambient_warroom-abc123.ogg#fragment`,
        'http://127.0.0.1:9999/assets/ambient_warroom-abc123.ogg',
        `${ORIGIN}/assets/ambient_warroom-abc123.mp3`,
        'not-a-url',
    ]) {
        const description = realm.api.describe(new realm.Audio(source));
        expect(description.valid, source).toBe(false);
        expect(description.reason, source).toBe('non-ambient-source');
        expect(description.element.sourceIsAmbient, source).toBe(false);
    }
    const empty = realm.api.describe(new realm.Audio());
    expect(empty.valid).toBe(false);
    expect(empty.reason).toBe('missing-source');
    expect(empty.element.sourceEpoch).toBe(0);

    const unknown = realm.api.describe({});
    expect(unknown.valid).toBe(false);
    expect(unknown.reason).toBe('unknown-element');
    expect(unknown.element).toBe(null);

    expect(realm.api.snapshot().valid).toBe(true);
});

test('foreign objects and unknown creation never become valid through play registration', () => {
    const realm = createRealm();
    const foreign = new realm.originalAudio(AMBIENT_WARROOM);
    expect(realm.api.describe(foreign)).toMatchObject({ valid: false, reason: 'unknown-element' });
    foreign.play();
    const snapshot = realm.api.snapshot();
    expect(snapshot.valid).toBe(false);
    expect(snapshot.invalidReasons).toContain('unregistered-media-receiver');
    expect(snapshot.registry.count).toBe(0);
    expect(realm.api.describe(foreign)).toMatchObject({ valid: false, reason: 'unknown-element' });
});

test('direct attributes, NamedNodeMap and source-child mutations invalidate instead of being trusted', () => {
    const attributeRealm = createRealm();
    const attributeElement = new attributeRealm.Audio(AMBIENT_WARROOM);
    attributeElement.setAttribute('loop', '');
    const attributeSnapshot = attributeRealm.api.snapshot();
    expect(attributeSnapshot.valid).toBe(false);
    expect(attributeSnapshot.invalidReasons).toContain('unexplained-mutation');
    expect(attributeRealm.api.describe(attributeElement).reason).toBe('unexplained-attribute-mutation');

    const namedRealm = createRealm();
    const namedElement = new namedRealm.Audio(AMBIENT_WARROOM);
    namedElement.attributes.setNamedItem({ name: 'controls', value: '' });
    expect(namedRealm.api.describe(namedElement).reason).toBe('unexplained-attribute-mutation');

    const childRealm = createRealm();
    const childElement = new childRealm.Audio(AMBIENT_WARROOM);
    childElement.appendChild({ nodeName: 'SOURCE' });
    const childSnapshot = childRealm.api.snapshot();
    expect(childSnapshot.valid).toBe(false);
    expect(childSnapshot.invalidReasons).toContain('unsupported-source-child-mutation');
    expect(childRealm.api.describe(childElement).reason).toBe('unsupported-source-child-mutation');

    const bypassRealm = createRealm();
    const bypassElement = new bypassRealm.Audio(AMBIENT_WARROOM);
    bypassRealm.originals.setters.src.call(bypassElement, AMBIENT_FIELD);
    const bypassSnapshot = bypassRealm.api.snapshot();
    expect(bypassSnapshot.valid).toBe(false);
    expect(bypassSnapshot.invalidReasons.some((reason: string) =>
        reason === 'unexplained-mutation' || reason === 'unexplained-source-change')).toBe(true);
});

test('drains pending observer records before describe and snapshot validation', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.setAttribute('loop', '');
    const description = realm.api.describe(element);
    expect(description.valid).toBe(false);
    expect(description.reason).toBe('unexplained-attribute-mutation');
    expect(description.provenance.observer.recordsSeen).toBe(1);
});

test('fails closed on unsafe state reads and dead weak references', () => {
    const readRealm = createRealm();
    const readElement = new readRealm.Audio(AMBIENT_WARROOM);
    Object.defineProperty(readElement, 'duration', {
        configurable: true,
        get() {
            throw new Error('duration read failed');
        },
    });
    const readDescription = readRealm.api.describe(readElement);
    expect(readDescription.valid).toBe(false);
    expect(readDescription.reason).toBe('unsafe-read');
    const readSnapshot = readRealm.api.snapshot();
    expect(readSnapshot.valid).toBe(false);
    expect(readSnapshot.invalidReasons).toContain('state-read-failure');
    expect(readSnapshot.registry.entries[0].readErrors.duration).toBeTruthy();

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
    const deadRealm = createRealm({ weakRefClass: CapturingWeakRef });
    const deadElement = new deadRealm.Audio(AMBIENT_WARROOM);
    const before = deadRealm.api.describe(deadElement);
    expect(before.valid).toBe(true);
    CapturingWeakRef.created[0].target = null;
    const after = deadRealm.api.describe(deadElement);
    expect(after.valid).toBe(false);
    expect(after.reason).toBe('dead');
    expect(deadRealm.api.snapshot().registry.entries[0].alive).toBe(false);
});

test('rejects autoplay-enabled changes for the controlled profile', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    element.autoplay = true;
    expect(realm.api.describe(element).valid).toBe(false);
    expect(realm.api.describe(element).reason).toBe('autoplay-enabled');
    const snapshot = realm.api.snapshot();
    expect(snapshot.valid).toBe(false);
    expect(snapshot.invalidReasons).toContain('autoplay-enabled');
    element.autoplay = false;
    expect(realm.api.describe(element).reason).toBe('autoplay-enabled');
});

test('reports recorded and rechecked optional API absence while still installing', () => {
    const realm = createRealm({ noFastSeek: true, missingSetters: ['srcObject'] });
    expect(realm.report).toMatchObject({ installed: true, diagnosticValid: true });
    const snapshot = realm.api.snapshot();
    expect(snapshot.coverage.methods.fastSeek).toBe('unavailable');
    expect(snapshot.coverage.setters.srcObject).toBe('unavailable');
    expect(snapshot.coverage.missingOptionalApis).toEqual(
        expect.arrayContaining(['fastSeek', 'srcObject']),
    );
    expect(snapshot.install.unsupportedOptionalApis).toEqual(
        expect.arrayContaining(['fastSeek', 'srcObject']),
    );
    expect(snapshot.install.absenceAudit).toMatchObject({
        schema: 'awwv.native-media-optional-absence-audit.v1',
        recordedAt: 'installation',
        recheckedOnEveryValidation: true,
        prototypeChain: 'all',
        instanceShadows: 'rejected',
        readFailure: 'fail-closed',
        laterAppearance: 'reject',
        presentButUnwrapped: 'reject',
    });
    expect(snapshot.install.absenceAudit.entries).toEqual(expect.arrayContaining([
        { name: 'fastSeek', kind: 'method', status: 'absent' },
        { name: 'srcObject', kind: 'setter', status: 'absent' },
    ]));
    expect(snapshot.coverage.absenceAudit).toEqual(snapshot.install.absenceAudit);
    const element = new realm.Audio(AMBIENT_WARROOM);
    expect(realm.api.describe(element).valid).toBe(true);

    const stillAbsent = realm.api.describe(element);
    expect(stillAbsent.provenance.readErrors).toEqual({});
    expect(realm.api.snapshot().valid).toBe(true);
});

test('rejects later optional appearance, instance shadows, unwrapped presence and absence read failure', () => {
    const appeared = createRealm({ noFastSeek: true });
    const appearedElement = new appeared.Audio(AMBIENT_WARROOM);
    (appeared.Audio.prototype as any).fastSeek = function laterFastSeek() {
        return 'later';
    };
    const appearedDescription = appeared.api.describe(appearedElement);
    expect(appearedDescription.valid).toBe(false);
    expect(appearedDescription.reason).toBe('optional-api-appeared');
    expect(appeared.api.snapshot().invalidReasons).toContain('optional-api-appeared:fastSeek');

    const shadowed = createRealm({ noFastSeek: true });
    const shadowedElement = new shadowed.Audio(AMBIENT_WARROOM);
    (shadowedElement as any).fastSeek = () => 'shadow';
    const shadowedDescription = shadowed.api.describe(shadowedElement);
    expect(shadowedDescription.valid).toBe(false);
    expect(shadowedDescription.reason).toBe('own-shadow');
    expect(shadowedDescription.provenance.ownShadows).toContain('fastSeek');

    const unwrapped = createRealm({ noFastSeek: true });
    const unwrappedElement = new unwrapped.Audio(AMBIENT_WARROOM);
    Object.defineProperty(unwrapped.Audio.prototype, 'fastSeek', {
        configurable: true,
        value: 42,
    });
    const unwrappedDescription = unwrapped.api.describe(unwrappedElement);
    expect(unwrappedDescription.valid).toBe(false);
    expect(unwrappedDescription.reason).toBe('optional-api-present-unwrapped');
    expect(unwrapped.api.snapshot().invalidReasons)
        .toContain('optional-api-present-unwrapped:fastSeek');

    const unreadable = createRealm({ noFastSeek: true });
    const unreadableElement = new unreadable.Audio(AMBIENT_WARROOM);
    const originalDescriptor = unreadable.realmObject.getOwnPropertyDescriptor;
    unreadable.realmObject.getOwnPropertyDescriptor = function patchedDescriptor(target: any, name: any) {
        if (name === 'fastSeek') throw new Error('absence audit read failed');
        return originalDescriptor.call(this, target, name);
    };
    const unreadableDescription = unreadable.api.describe(unreadableElement);
    expect(unreadableDescription.valid).toBe(false);
    expect(unreadableDescription.reason).toBe('optional-api-absence-read-failed');
    expect(unreadable.api.snapshot().invalidReasons)
        .toContain('optional-api-absence-read-failed:fastSeek');
});

test('fails closed on missing required APIs', () => {
    const noObserver = createRealm({ noMutationObserver: true });
    expect(noObserver.report).toMatchObject({ installed: false, reason: 'unsupported-mutation-observer' });
    expect(noObserver.api.snapshot().invalidReasons).toContain('unsupported-mutation-observer');

    const noPlay = createRealm({ noPlayMethod: true });
    expect(noPlay.report).toMatchObject({ installed: false, reason: 'unsupported-method-play' });

    const noCurrentTime = createRealm({ missingSetters: ['currentTime'] });
    expect(noCurrentTime.report).toMatchObject({
        installed: false,
        reason: 'unsupported-setter-currentTime',
    });

    const noPreload = createRealm({ missingSetters: ['preload'] });
    expect(noPreload.report).toMatchObject({
        installed: false,
        reason: 'unsupported-setter-preload',
    });

    const noWeakRef = createRealm({ noWeakRef: true });
    expect(noWeakRef.report).toMatchObject({ installed: false, reason: 'unsupported-weakref' });

    const noWeakSet = createRealm({ noWeakSet: true });
    expect(noWeakSet.report).toMatchObject({ installed: false, reason: 'unsupported-weakset' });

    const noURL = createRealm({ noURL: true });
    expect(noURL.report).toMatchObject({ installed: false, reason: 'unsupported-url' });

    const noAudio = createRealm({ noAudio: true });
    expect(noAudio.report).toMatchObject({ installed: false, reason: 'unsupported-audio' });

    const noMedia = createRealm({ noMediaElement: true });
    expect(noMedia.report).toMatchObject({ installed: false, reason: 'unsupported-media-element' });
});

test('fails closed for wrong realm, wrong origin and late installation', () => {
    const wrongRealm = createRealm({ wrongRealm: true });
    expect(wrongRealm.report).toMatchObject({ installed: false, reason: 'wrong-realm' });
    expect(wrongRealm.api.snapshot().invalidReasons).toContain('wrong-realm');

    const wrongOrigin = createRealm({ url: 'https://example.com' });
    expect(wrongOrigin.report).toMatchObject({ installed: false, reason: 'wrong-origin' });
    expect(wrongOrigin.api.snapshot().invalidReasons).toContain('wrong-origin');

    const late = createRealm({ readyState: 'complete' });
    expect(late.report.installed).toBe(true);
    expect(late.api.snapshot().valid).toBe(false);
    expect(late.api.snapshot().invalidReasons).toContain('late-installation');
    expect(late.api.snapshot().install.readyStateAtInstall).toBe('complete');
    expect(late.api.snapshot().install.lateInstallation).toBe(true);
});

test('detects replaced methods, tampered descriptors, replaced constructor and own shadows', () => {
    const replaced = createRealm();
    replaced.HTMLMediaElement.prototype.play = function replacementPlay() {
        return 'replacement';
    };
    expect(replaced.api.snapshot().invalidReasons).toContain('method-play-replaced');

    const flags = createRealm();
    const playDescriptor = Object.getOwnPropertyDescriptor(flags.HTMLMediaElement.prototype, 'play')!;
    Object.defineProperty(flags.HTMLMediaElement.prototype, 'play', {
        ...playDescriptor,
        enumerable: playDescriptor.enumerable !== true,
    });
    expect(flags.api.snapshot().invalidReasons).toContain('method-play-descriptor-tampered');

    const constructor = createRealm();
    constructor.window.Audio = function replacementAudio() {
        return {};
    };
    expect(constructor.api.snapshot().invalidReasons).toContain('constructor-replaced');

    const shadow = createRealm();
    const shadowElement = new shadow.Audio(AMBIENT_WARROOM);
    shadowElement.play = () => 'own-shadow';
    const shadowDescription = shadow.api.describe(shadowElement);
    expect(shadowDescription.valid).toBe(false);
    expect(shadowDescription.reason).toBe('own-shadow');
    expect(shadowDescription.provenance.ownShadows).toContain('play');
    expect(shadow.api.snapshot().invalidReasons).toContain('own-shadow:play');

    const setterShadow = createRealm();
    const setterElement = new setterShadow.Audio(AMBIENT_WARROOM);
    Object.defineProperty(setterElement, 'loop', {
        configurable: true,
        get() {
            return false;
        },
        set() {},
    });
    expect(setterShadow.api.describe(setterElement).reason).toBe('own-shadow');
    expect(setterShadow.api.describe(setterElement).provenance.ownShadows).toContain('loop');
});

test('bounds events, observer records and entries, failing closed on overflow', () => {
    const eventRealm = createRealm();
    const eventElement = new eventRealm.Audio(AMBIENT_WARROOM);
    for (let index = 0; index < 200; index += 1) eventElement.currentTime = index;
    const eventSnapshot = eventRealm.api.snapshot();
    expect(eventSnapshot.events.capacity).toBe(256);
    expect(eventSnapshot.events.count).toBe(256);
    expect(eventSnapshot.events.truncated).toBe(true);
    expect(eventSnapshot.events.dropped).toBeGreaterThan(0);
    expect(eventSnapshot.invalidReasons).toContain('event-overflow');
    expect(eventSnapshot.valid).toBe(false);

    const observerRealm = createRealm();
    const observerElement = new observerRealm.Audio(AMBIENT_WARROOM);
    for (let index = 0; index < 70; index += 1) observerElement.loop = index % 2 === 0;
    const observerSnapshot = observerRealm.api.snapshot();
    expect(observerSnapshot.valid).toBe(false);
    expect(observerSnapshot.invalidReasons).toContain('observer-record-overflow');
    expect(observerSnapshot.registry.entries[0].observer.overflow).toBe(true);

    const entryRealm = createRealm();
    for (let index = 0; index < 17; index += 1) {
        new entryRealm.Audio(`${ORIGIN}/assets/ambient_warroom-entry${index}.ogg`);
    }
    const entrySnapshot = entryRealm.api.snapshot();
    expect(entrySnapshot.registry.count).toBe(16);
    expect(entrySnapshot.registry.capacity).toBe(16);
    expect(entrySnapshot.registry.overflow).toBe(true);
    expect(entrySnapshot.invalidReasons).toContain('entry-overflow');
    expect(entrySnapshot.valid).toBe(false);
});

test('sampling performs no media actions and returns serializable exact identity data', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    for (let index = 0; index < 5; index += 1) {
        realm.api.describe(element);
        realm.api.snapshot();
    }
    expect(realm.state.playCalls.length).toBe(0);
    const description = realm.api.describe(element);
    expect(description.element.id).toBe(realm.api.snapshot().registry.entries[0].id);
    expect(description.element).not.toHaveProperty('element');
    expect(description.provenance).not.toHaveProperty('element');
    expect(JSON.parse(JSON.stringify(description))).toEqual(description);
});

test('rejects forged preexisting globals and accepts only an explicit retained prior API reference', () => {
    let forgedSnapshotCalls = 0;
    const forged = Object.freeze({
        __marker: 'awwv-native-media-mutation-provenance-api-v1',
        schema: 'awwv.native-media-mutation-provenance.v1',
        snapshot() {
            forgedSnapshotCalls += 1;
            return { valid: true };
        },
        describe() {
            return { valid: true };
        },
    });
    const forgedRealm = createRealm({ preexistingGlobal: forged });
    expect(forgedRealm.report).toMatchObject({ installed: false, reason: 'foreign-global' });
    expect(forgedRealm.window[KEY]).toBe(forged);
    expect(forgedSnapshotCalls).toBe(0);
    expect(forgedRealm.HTMLMediaElement.prototype.play).toBe(forgedRealm.originals.play);

    const untrustedPrior = createRealm({ preexistingGlobal: forged });
    expect(untrustedPrior.install(forged)).toMatchObject({ installed: false, reason: 'foreign-global' });
    expect(untrustedPrior.window[KEY]).toBe(forged);

    const genuine = createRealm();
    const api = genuine.report.api;
    const wrappedPlay = genuine.HTMLMediaElement.prototype.play;
    const wrappedAudio = genuine.window.Audio;
    const idempotent = genuine.install(api);
    expect(idempotent).toMatchObject({ installed: true, idempotent: true, diagnosticValid: true });
    expect(genuine.window[KEY]).toBe(api);
    expect(genuine.HTMLMediaElement.prototype.play).toBe(wrappedPlay);
    expect(genuine.window.Audio).toBe(wrappedAudio);

    const noHandle = createRealm();
    const genuineApi = noHandle.report.api;
    expect(noHandle.install()).toMatchObject({ installed: false, reason: 'foreign-global' });
    expect(noHandle.window[KEY]).toBe(genuineApi);
});

test('processes callback-delivered observer records instead of losing restored state', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    const observer = realm.observers[0];
    element.setAttribute('src', AMBIENT_FIELD);
    element.setAttribute('src', AMBIENT_WARROOM);
    expect(element.src).toBe(AMBIENT_WARROOM);
    const delivered = observer.takeRecords();
    expect(delivered.length).toBe(2);
    expect(observer.takeRecords()).toEqual([]);

    observer.callback(delivered, observer);

    const description = realm.api.describe(element);
    expect(description.valid).toBe(false);
    expect(description.reason).toBe('unexplained-attribute-mutation');
    expect(description.provenance.observer.recordsSeen).toBe(2);
    expect(realm.api.snapshot().invalidReasons).toContain('unexplained-mutation');

    const unsupportedRealm = createRealm();
    const unsupportedElement = new unsupportedRealm.Audio(AMBIENT_WARROOM);
    const unsupportedObserver = unsupportedRealm.observers[0];
    unsupportedObserver.callback(
        [{ type: 'characterData' as any, target: unsupportedElement }],
        unsupportedObserver,
    );
    const unsupportedDescription = unsupportedRealm.api.describe(unsupportedElement);
    expect(unsupportedDescription.valid).toBe(false);
    expect(unsupportedDescription.reason).toBe('unsupported-mutation-record');
    expect(unsupportedDescription.provenance.observer.recordsSeen).toBe(1);
});

test('validates and drains unexplained prior state before method and setter delegation', () => {
    const methodRealm = createRealm();
    const methodElement = new methodRealm.Audio(AMBIENT_WARROOM);
    methodRealm.originals.setters.playbackRate!.call(methodElement, 1.5);
    expect(methodElement.play('one', 2)).toBe('play-return');
    expect(methodRealm.state.playCalls[0].args).toEqual(['one', 2]);
    const methodDescription = methodRealm.api.describe(methodElement);
    expect(methodDescription.valid).toBe(false);
    expect(methodDescription.reason).toBe('unexplained-rate-change');

    const setterRealm = createRealm();
    const setterElement = new setterRealm.Audio(AMBIENT_WARROOM);
    setterRealm.originals.setters.playbackRate!.call(setterElement, 1.25);
    setterElement.currentTime = 2;
    expect(setterElement.currentTime).toBe(2);
    const setterDescription = setterRealm.api.describe(setterElement);
    expect(setterDescription.valid).toBe(false);
    expect(setterDescription.reason).toBe('unexplained-rate-change');

    const pendingRealm = createRealm();
    const pendingElement = new pendingRealm.Audio(AMBIENT_WARROOM);
    pendingElement.setAttribute('loop', '');
    pendingElement.loop = true;
    const pendingSnapshot = pendingRealm.api.snapshot();
    expect(pendingSnapshot.valid).toBe(false);
    const records = pendingSnapshot.events.records;
    const invalidationIndex = records.findIndex((record: any) =>
        record.kind === 'invalidation'
        && record.reason === 'unexplained-attribute-mutation'
        && record.detail?.attributeName === 'loop');
    const explainedIndex = records.findIndex((record: any) =>
        record.kind === 'attribute-mutation-explained' && record.attributeName === 'loop');
    expect(invalidationIndex).toBeGreaterThanOrEqual(0);
    expect(explainedIndex).toBeGreaterThan(invalidationIndex);
});

test('rejects adopted media elements while the realm prototype still matches', () => {
    const realm = createRealm();
    const element = new realm.Audio(AMBIENT_WARROOM);
    expect(element).toBeInstanceOf(realm.HTMLMediaElement);
    Object.defineProperty(element, 'ownerDocument', {
        configurable: true,
        value: { defaultView: null },
    });

    const description = realm.api.describe(element);
    expect(element).toBeInstanceOf(realm.HTMLMediaElement);
    expect(description.valid).toBe(false);
    expect(description.reason).toBe('owner-document-mismatch');
    expect(realm.api.snapshot().invalidReasons).toContain('owner-document-mismatch');
});

test('rejects active srcObject for URL-backed media including initial and changed values', () => {
    const initial = createRealm({ srcObjectInitial: { kind: 'stream' } });
    const initialElement = new initial.Audio(AMBIENT_WARROOM);
    const initialDescription = initial.api.describe(initialElement);
    expect(initialDescription.valid).toBe(false);
    expect(initialDescription.reason).toBe('active-srcObject');
    expect(initialDescription.element.sourceIsAmbient).toBe(true);
    expect(initialDescription.provenance.srcObject).toMatchObject({
        present: true,
        type: 'object',
        attributeReflection: false,
    });

    const changed = createRealm();
    const changedElement = new changed.Audio(AMBIENT_WARROOM);
    changedElement._srcObject = { kind: 'stream' };
    const changedDescription = changed.api.describe(changedElement);
    expect(changedDescription.valid).toBe(false);
    expect(changedDescription.reason).toBe('active-srcObject');
    expect(changedDescription.element.source).toBe(AMBIENT_WARROOM);
    expect(changedDescription.element.sourceIsAmbient).toBe(true);
    expect(changed.api.snapshot().invalidReasons).toContain('active-srcObject');

    const wrapped = createRealm();
    const wrappedElement = new wrapped.Audio(AMBIENT_WARROOM);
    wrappedElement.srcObject = { kind: 'stream' };
    const wrappedDescription = wrapped.api.describe(wrappedElement);
    expect(wrappedDescription.valid).toBe(false);
    expect(wrappedDescription.reason).toBe('active-srcObject');
    expect(wrappedDescription.element.sourceEpoch).toBe(2);
    expect(wrappedDescription.element.source || '').not.toContain('blob:');
});

test('composes with the exact sentinel outer play layer', () => {
    const realm = createRealm();
    expect((realm.report as any).bindPlayLayer).toBeTypeOf('function');
    expect((realm.api as any).bindPlayLayer).toBeUndefined();

    const composition = composeSentinel(realm);
    expect(composition.sentinelReport).toMatchObject({ installed: true, diagnosticValid: true });
    expect(composition.binding).toMatchObject({ bound: true, reason: null });
    expect(realm.api.snapshot().valid).toBe(true);
    expect(realm.window[SENTINEL_KEY].snapshot().valid).toBe(true);

    const element = new realm.Audio(AMBIENT_WARROOM);
    expect(element.play()).toBe('play-return');
    const provenanceSnapshot = realm.api.snapshot();
    expect(provenanceSnapshot.valid).toBe(true);
    expect(provenanceSnapshot.registry.entries[0].continuity.playCount).toBe(1);
    const sentinelSnapshot = realm.window[SENTINEL_KEY].snapshot();
    expect(sentinelSnapshot.valid).toBe(true);
    expect(sentinelSnapshot.registry.count).toBe(1);
    expect(sentinelSnapshot.naturalOriginAdmitted).toBe(false);
});

test('fails closed for late, repeated and forged play-layer binding', () => {
    const late = createRealm();
    const latePrior = Object.getOwnPropertyDescriptor(late.HTMLMediaElement.prototype, 'play')!;
    const lateSentinel = late.sentinelInstall();
    new late.Audio(AMBIENT_WARROOM);
    const lateBinding = late.report.bindPlayLayer({
        priorDescriptor: latePrior,
        sentinelResult: lateSentinel,
    });
    expect(lateBinding).toMatchObject({ bound: false, reason: 'play-layer-binding-media-exists' });
    expect(late.api.snapshot().valid).toBe(false);

    const repeated = createRealm();
    const repeatedComposition = composeSentinel(repeated);
    expect(repeatedComposition.binding.bound).toBe(true);
    const repeatedBinding = repeated.report.bindPlayLayer({
        priorDescriptor: repeatedComposition.priorDescriptor,
        sentinelResult: repeatedComposition.sentinelReport,
    });
    expect(repeatedBinding).toMatchObject({
        bound: false,
        reason: 'play-layer-binding-already-attempted',
    });
    expect(repeated.api.snapshot().valid).toBe(false);

    const forged = createRealm();
    const forgedPrior = Object.getOwnPropertyDescriptor(forged.HTMLMediaElement.prototype, 'play')!;
    const forgedSentinel = forged.sentinelInstall();
    const forgedBinding = forged.report.bindPlayLayer({
        priorDescriptor: forgedPrior,
        sentinelResult: {
            installed: true,
            idempotent: false,
            diagnosticValid: true,
            reason: null,
            api: { snapshot: () => ({ valid: true }) },
        },
    });
    expect(forgedBinding).toMatchObject({
        bound: false,
        reason: 'play-layer-binding-sentinel-api-mismatch',
    });
    expect(forged.api.snapshot().valid).toBe(false);

    const mismatch = createRealm();
    const mismatchSentinel = mismatch.sentinelInstall();
    const mismatchBinding = mismatch.report.bindPlayLayer({
        priorDescriptor: {
            value: function wrongInnerPlay() {},
            writable: true,
            configurable: true,
            enumerable: true,
        },
        sentinelResult: mismatchSentinel,
    });
    expect(mismatchBinding).toMatchObject({
        bound: false,
        reason: 'play-layer-binding-prior-mismatch',
    });
});

test('invalidates composed provenance on outer replacement, sentinel action and own shadows', () => {
    const replaced = createRealm();
    composeSentinel(replaced);
    replaced.HTMLMediaElement.prototype.play = function replacementOuter() {
        return 'replacement';
    };
    const replacedSnapshot = replaced.api.snapshot();
    expect(replacedSnapshot.valid).toBe(false);
    expect(replacedSnapshot.invalidReasons).toContain('play-layer-descriptor-tampered');

    const action = createRealm();
    composeSentinel(action);
    const handler = action.mediaSession!.handlers.get('seekto');
    expect(typeof handler).toBe('function');
    handler({ seekTime: 4 });
    expect(action.window[SENTINEL_KEY].snapshot().valid).toBe(false);
    const actionSnapshot = action.api.snapshot();
    expect(actionSnapshot.valid).toBe(false);
    expect(actionSnapshot.invalidReasons).toContain('play-layer-sentinel-invalid');

    const shadow = createRealm();
    composeSentinel(shadow);
    const shadowElement = new shadow.Audio(AMBIENT_WARROOM);
    Object.defineProperty(shadowElement, 'play', {
        configurable: true,
        value: () => 'own-shadow',
    });
    const shadowDescription = shadow.api.describe(shadowElement);
    expect(shadowDescription.valid).toBe(false);
    expect(shadowDescription.reason).toBe('own-shadow');
    expect(shadowDescription.provenance.ownShadows).toContain('play');
});
