import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

/*
 * Pure synthetic tests for the controlled native media cycle correlator.
 *
 * These fixtures model the documented raw shapes but do not execute a browser,
 * collector, provenance helper, sentinel, network request or filesystem read.
 */

const require = createRequire(import.meta.url);
const MODULE = '../tools/ui/native_media_cycle_evidence.cjs';

function verify(input: any): any {
    return require(MODULE).verifyControlledNativeLoopCycle(input);
}

const ORIGIN = 'http://127.0.0.1:43123';
const FRAME_URL = `${ORIGIN}/index.html?session=fixture#warroom`;
const QA_ELEMENT_ID = 'qa-ambient-17';
const AMBIENT = `${ORIGIN}/assets/ambient_warroom-abc123.ogg`;
const AMBIENT_OTHER = `${ORIGIN}/assets/ambient_field-def456.ogg`;
const SOURCE_SHA = 'a'.repeat(40);
const PACKAGE_SHA = 'b'.repeat(40);
const PROFILE = 'awwv.controlled-native-media-loop-cycle.v1';
const MUTATION_PROFILE = 'controlled-qa-native-media-mutation-provenance';
const MUTATION_SCHEMA = 'awwv.native-media-mutation-provenance.v1';
const SENTINEL_SCHEMA = 'awwv.native-media-seek-sentinel.v1';
const MEDIA_SCHEMA = 'awwv.native-media-origin-probe.v1';
const CAPTURED_PLAYER_ID = 'A8E6B18BCE9F2756121472424E0069E3';
const CAPTURED_SEQUENCE = [
    { timestamp: 698513.164772, value: { event: 'kEnded' } },
    { timestamp: 698513.782797, value: { event: 'kSeek', seek_target: 0 } },
    {
        timestamp: 698513.782860,
        value: { event: 'kPipelineStateChange', pipeline_state: 'kSeeking' },
    },
    {
        timestamp: 698513.783011,
        value: { event: 'kPipelineStateChange', pipeline_state: 'kPlaying' },
    },
    {
        timestamp: 698513.783379,
        value: {
            event: 'kBufferingStateChanged',
            audio_buffering_state: { state: 'BUFFERING_HAVE_ENOUGH' },
        },
    },
    {
        timestamp: 698513.847420,
        value: {
            event: 'kBufferingStateChanged',
            pipeline_buffering_state: {
                for_suspended_start: false,
                state: 'BUFFERING_HAVE_ENOUGH',
            },
        },
    },
] as const;

const CREATED_MS = Date.UTC(2026, 9, 29, 21, 28, 55, 915) + 0.365;
const CREATED_UTC = '2026-10-29 21:28:55.915365 UTC';
const LOG_TIMESTAMP = 698462.575704;
const MEDIA_OFFSET_MS = CREATED_MS - LOG_TIMESTAMP * 1000;
const TIME_ORIGIN = CREATED_MS - 12209.8;
const GENERATION_MS = CREATED_MS - 500;
const READY_MS = CREATED_MS + 20;
const LOOP_BASE_MS = CREATED_MS + 30500;
const START_MS = LOOP_BASE_MS;
const PRE_SEEK_MS = LOOP_BASE_MS + 2000;
const ENDED_MS = LOOP_BASE_MS + 2100;
const SEEK_MS = LOOP_BASE_MS + 2102;
const POST_PLAY_MS = LOOP_BASE_MS + 2114;
const READINESS_MS = POST_PLAY_MS + 3;
const CONFIRMATION_MS = POST_PLAY_MS + 100;
const EARLIER_START_MS = START_MS - 400;
const EARLIER_ENDED_MS = START_MS - 200;
const REQUEST_MS = CREATED_MS + 30007;
const PROTOCOL_REQUEST_S = (REQUEST_MS - MEDIA_OFFSET_MS) / 1000;
const WINDOW_OPEN = CREATED_MS + 30000;
const WINDOW_CLOSE = CONFIRMATION_MS + 200;

function at(epochMs: number) {
    return { dateNow: epochMs, performanceNow: epochMs - TIME_ORIGIN };
}

function capturedClock(epochMs: number, wallDriftMs = 0) {
    return {
        dateNow: epochMs + wallDriftMs,
        performanceNow: epochMs - TIME_ORIGIN,
        timeOrigin: TIME_ORIGIN,
    };
}

function mediaTimestamp(epochMs: number) {
    return (epochMs - MEDIA_OFFSET_MS) / 1000;
}

function makeEvent(event: string, epochMs: number, extra: Record<string, unknown> = {}) {
    return {
        timestamp: mediaTimestamp(epochMs),
        value: JSON.stringify({ event, ...extra }),
    };
}

function pipelineState(state: string, epochMs: number) {
    return makeEvent('kPipelineStateChange', epochMs, { pipeline_state: state });
}

function semanticMediaEvent(raw: any): string {
    const value = JSON.parse(raw.value);
    return value.event === 'kPipelineStateChange' ? value.pipeline_state : value.event;
}

function absenceAudit() {
    return {
        schema: 'awwv.native-media-optional-absence-audit.v1',
        recordedAt: 'installation',
        recheckedOnEveryValidation: true,
        prototypeChain: 'all',
        instanceShadows: 'rejected',
        readFailure: 'fail-closed',
        laterAppearance: 'reject',
        presentButUnwrapped: 'reject',
        entries: [{ name: 'fastSeek', kind: 'method', status: 'absent' }],
    };
}

function selectedDescribe(overrides: Record<string, any> = {}) {
    return {
        schema: MUTATION_SCHEMA,
        diagnosticOnly: true,
        diagnosticValid: true,
        valid: true,
        reason: null,
        element: {
            id: 'media:1',
            alive: true,
            supported: true,
            subclass: false,
            createdByInstalledConstructor: true,
            constructorSequence: 1,
            sourceEpoch: 1,
            source: AMBIENT,
            sourceIsAmbient: true,
            origin: ORIGIN,
            registeredAt: at(CREATED_MS + 9.8),
        },
        provenance: {
            profile: MUTATION_PROFILE,
            sourceEpochSemantics: 'monotonic-per-object',
            sameUrlReloadAdvancesEpoch: true,
            initialSetupValid: true,
            laterMutations: 'explicit-evidence',
            attributes: {
                src: AMBIENT,
                loop: '',
                controls: null,
                autoplay: null,
                preload: 'auto',
            },
            rateAttributes: { playbackRate: null, defaultPlaybackRate: null },
            rateProperties: { playbackRate: 1, defaultPlaybackRate: 1 },
            srcObject: { present: false, type: 'none', attributeReflection: false },
            autoplayEnabled: false,
            observer: {
                recordsSeen: 0,
                overflow: false,
                unexplained: 0,
                drainedBeforeValidation: true,
            },
            ownShadows: [],
            readErrors: {},
            continuity: {
                playCount: 1,
                pauseCount: 0,
                lastPlaySequence: 3,
                lastPauseSequence: null,
                lastPlayEpoch: 1,
                lastPauseEpoch: null,
            },
        },
        mutationCounts: { setters: 0, methods: 1, byName: { play: 1 } },
        ...overrides,
    };
}

function provenanceSnapshot(describeResult: any) {
    const installAt = at(GENERATION_MS);
    const records = [
        {
            sequence: 1,
            kind: 'install',
            at: installAt,
            readyState: 'loading',
            origin: ORIGIN,
            methods: { play: 'wrapped', pause: 'wrapped', load: 'wrapped', fastSeek: 'unavailable' },
            setters: {
                currentTime: 'wrapped',
                src: 'wrapped',
                playbackRate: 'wrapped',
                defaultPlaybackRate: 'wrapped',
                loop: 'wrapped',
                controls: 'wrapped',
                autoplay: 'wrapped',
                srcObject: 'wrapped',
                preload: 'wrapped',
            },
            missingOptionalApis: ['fastSeek'],
        },
        {
            sequence: 2,
            kind: 'construct',
            at: at(CREATED_MS + 10),
            id: 'media:1',
            constructorSequence: 1,
            source: AMBIENT,
            sourceEpoch: 1,
            subclass: false,
            origin: ORIGIN,
        },
        {
            sequence: 3,
            kind: 'mutation-attempt',
            at: at(START_MS - 40),
            targetType: 'method',
            name: 'play',
            id: 'media:1',
            sourceEpoch: 1,
            argTypes: [],
            argumentCount: 0,
        },
        {
            sequence: 4,
            kind: 'mutation-result',
            at: at(START_MS - 39),
            targetType: 'method',
            name: 'play',
            id: 'media:1',
            outcome: 'success',
            resultType: 'object',
            sourceEpoch: 1,
            sequenceOfAttempt: 3,
        },
    ];
    return {
        schema: MUTATION_SCHEMA,
        diagnosticOnly: true,
        applicationAcceptance: false,
        universalProvenance: false,
        valid: true,
        label: 'synthetic controlled provenance',
        coverage: {
            profile: MUTATION_PROFILE,
            diagnosticOnly: true,
            productionDefaultControls: false,
            applicationAcceptance: false,
            universalProvenance: false,
            exactObjectIdentity: true,
            sameRealmInstalledAudioConstructorOnly: true,
            autoplay: 'rejected',
            sourceChildren: 'unsupported-invalidating',
            unknownCreation: 'unsupported-invalidating',
            attributesCaptured: ['src', 'loop', 'controls', 'autoplay', 'preload'],
            rateProperties: {
                playbackRate: 'property',
                defaultPlaybackRate: 'property',
                attributeReflection: false,
            },
            srcObject: { property: 'wrapped', attributeReflection: false },
            methods: { play: 'wrapped', pause: 'wrapped', load: 'wrapped', fastSeek: 'unavailable' },
            setters: {
                currentTime: 'wrapped',
                src: 'wrapped',
                playbackRate: 'wrapped',
                defaultPlaybackRate: 'wrapped',
                loop: 'wrapped',
                controls: 'wrapped',
                autoplay: 'wrapped',
                srcObject: 'wrapped',
                preload: 'wrapped',
            },
            missingOptionalApis: ['fastSeek'],
            absenceAudit: absenceAudit(),
            sourceEpoch: {
                semantics: 'monotonic-per-object',
                initialNonEmptySourceEpoch: 1,
                emptySourceEpoch: 0,
                advancesOn: ['src-setter-success', 'srcObject-setter-success', 'load-success'],
                sameUrlReloadAdvancesEpoch: true,
                urlEqualityPreservesEpoch: false,
                constructorSetupCountsAsInitial: true,
            },
            mutationObserver: {
                attributes: true,
                childList: true,
                subtree: true,
                recordCap: 64,
                drainBeforeValidation: true,
                unexplainedMutations: 'invalidate',
                sourceChildUnsupported: true,
            },
            limits: { events: 256, entries: 16, observerRecordsPerObject: 64 },
            browserTamperResistance: false,
            note: 'synthetic',
        },
        install: {
            status: 'installed',
            installedAt: installAt,
            readyStateAtInstall: 'loading',
            readyState: 'complete',
            realmValid: true,
            originValid: true,
            origin: ORIGIN,
            lateInstallation: false,
            constructorWrapped: true,
            playLayerBound: true,
            methods: { play: 'wrapped', pause: 'wrapped', load: 'wrapped', fastSeek: 'unavailable' },
            setters: {
                currentTime: 'wrapped',
                src: 'wrapped',
                playbackRate: 'wrapped',
                defaultPlaybackRate: 'wrapped',
                loop: 'wrapped',
                controls: 'wrapped',
                autoplay: 'wrapped',
                srcObject: 'wrapped',
                preload: 'wrapped',
            },
            unsupportedOptionalApis: ['fastSeek'],
            absenceAudit: absenceAudit(),
            apiFrozen: true,
        },
        invalidReasons: [],
        events: {
            capacity: 256,
            count: records.length,
            truncated: false,
            dropped: 0,
            records,
        },
        registry: {
            capacity: 16,
            count: 1,
            overflow: false,
            duplicateSources: [],
            entries: [{
                id: 'media:1',
                alive: true,
                supported: true,
                subclass: false,
                sourceEpoch: 1,
                source: AMBIENT,
                sourceIsAmbient: true,
                admissible: true,
                reason: null,
                attributes: {
                    src: AMBIENT,
                    loop: '',
                    controls: null,
                    autoplay: null,
                    preload: 'auto',
                },
                rateProperties: { playbackRate: 1, defaultPlaybackRate: 1 },
                continuity: describeResult.provenance.continuity,
                mutationCounts: { setters: 0, methods: 1, byName: { play: 1 } },
                observer: { recordsSeen: 0, overflow: false, unexplained: 0, drainedBeforeValidation: true },
                readErrors: {},
            }],
        },
    };
}

function sentinelSnapshot() {
    const installAt = at(GENERATION_MS);
    const records = [{
        sequence: 1,
        kind: 'install',
        at: installAt,
        readyState: 'loading',
        origin: ORIGIN,
        actions: ['seekto', 'seekforward', 'seekbackward'],
    }];
    return {
        schema: SENTINEL_SCHEMA,
        diagnosticOnly: true,
        naturalOriginAdmitted: false,
        valid: true,
        label: 'synthetic controlled sentinel',
        coverage: {
            mediaSessionActions: ['seekto', 'seekforward', 'seekbackward'],
            exactRegistryOnly: true,
            osControl: false,
            defaultMediaSession: false,
            naturalLoopOrigin: false,
            audioQuality: false,
            sourceEpochSemantics: 'observed-source-url-changes-only',
            sameUrlReloadProvenance: false,
        },
        install: {
            status: 'installed',
            installedAt: installAt,
            readyStateAtInstall: 'loading',
            readyState: 'complete',
            realmValid: true,
            originValid: true,
            origin: ORIGIN,
            installedActions: ['seekto', 'seekforward', 'seekbackward'],
            registrationFailures: [],
            rollback: [],
            playWrapped: true,
            setActionHandlerWrapped: true,
            apiFrozen: true,
        },
        invalidReasons: [],
        events: {
            capacity: 128,
            count: records.length,
            truncated: false,
            dropped: 0,
            records,
        },
        registry: {
            capacity: 16,
            count: 0,
            duplicateSources: [],
            entries: [],
        },
    };
}

function mediaSnapshot() {
    const observedAtMs = WINDOW_CLOSE - 10;
    const playerEvents = [
        pipelineState('kPlaying', POST_PLAY_MS),
        makeEvent('kLoad', CREATED_MS + 2, { url: AMBIENT }),
        pipelineState('kEnded', ENDED_MS),
        makeEvent('kMediaLogCreated', CREATED_MS, { created: CREATED_UTC }),
        makeEvent('kSeek', SEEK_MS, { seek_target: 0 }),
        pipelineState('kPlaying', START_MS),
        makeEvent('kBufferingStateChanged', START_MS + 40, {
            audio_buffering_state: { state: 'BUFFERING_HAVE_ENOUGH' },
        }),
        makeEvent('kBufferingStateChanged', START_MS + 50, {
            pipeline_buffering_state: { for_suspended_start: false, state: 'BUFFERING_HAVE_ENOUGH' },
        }),
        makeEvent('kDecoderEOF', ENDED_MS + 1),
        makeEvent('kBufferingStateChanged', SEEK_MS + 1, {
            audio_buffering_state: { state: 'BUFFERING_HAVE_ENOUGH' },
        }),
        makeEvent('kBufferingStateChanged', POST_PLAY_MS - 20, {
            pipeline_buffering_state: { for_suspended_start: false, state: 'BUFFERING_HAVE_ENOUGH' },
        }),
        makeEvent('kBufferingStateChanged', READINESS_MS, {
            pipeline_buffering_state: { for_suspended_start: false, state: 'BUFFERING_HAVE_ENOUGH' },
        }),
    ];
    return {
        schema: MEDIA_SCHEMA,
        diagnosticOnly: true,
        failClosedDiagnostic: true,
        admission: 'none',
        status: 'diagnostic-complete',
        passive: true,
        setup: {
            state: 'ready',
            enable: { attempted: true, succeeded: true, settled: true },
            domain: 'Media',
            subscriptions: [
                'Media.playerCreated',
                'Media.playerPropertiesChanged',
                'Media.playerEventsAdded',
                'Media.playerMessagesLogged',
                'Media.playerErrorsRaised',
            ],
        },
        caps: {
            records: 4096,
            bytes: 4 * 1024 * 1024,
            players: 128,
            errors: 64,
            errorMessageChars: 400,
        },
        metadata: {
            playersObserved: 1,
            playersDropped: 0,
            playersTruncated: false,
            errorsRecorded: 0,
            errorsDropped: 0,
            errorsTruncated: false,
        },
        summary: {
            delivered: 4,
            recorded: 4,
            dropped: 0,
            truncated: false,
            evidenceTruncated: false,
            storedBytes: 1000,
            playersObserved: 1,
        },
        overflow: {
            records: false,
            bytes: false,
            other: false,
            players: false,
            errors: false,
            dropReasons: { records: 0, bytes: 0, other: 0 },
        },
        errors: [],
        records: [
            {
                sequence: 1,
                event: 'Media.playerCreated',
                observedAtMs,
                params: { player: { playerId: 'player-1' } },
            },
            {
                sequence: 2,
                event: 'Media.playerPropertiesChanged',
                observedAtMs,
                params: {
                    playerId: 'player-1',
                    properties: [{ name: 'kFrameUrl', value: FRAME_URL }],
                },
            },
            {
                sequence: 3,
                event: 'Media.playerEventsAdded',
                observedAtMs,
                params: { playerId: 'player-1', events: playerEvents },
            },
            {
                sequence: 4,
                event: 'Media.playerErrorsRaised',
                observedAtMs,
                params: { playerId: 'player-1', errors: [] },
            },
        ],
        control: {
            requested: false,
            mode: null,
            status: 'disabled',
            reason: 'option-not-requested',
            expectedOrigin: null,
            thresholdSeconds: null,
            pollIntervalMs: null,
            timeoutMs: null,
            scopeStatement: 'synthetic passive capture',
            player: null,
            candidate: null,
            intent: null,
            invocation: null,
        },
    };
}

function lifecycleState(overrides: Record<string, unknown> = {}) {
    return {
        networkState: 1,
        readyState: 4,
        paused: false,
        seeking: false,
        ended: false,
        currentTime: 1,
        duration: 10,
        loop: true,
        controls: false,
        mediaError: null,
        buffered: [[0, 10]],
        seekable: [[0, 10]],
        ...overrides,
    };
}

function lifecycleSignal(sequence: number, kind: string, observedAtMs: number, state: any) {
    return {
        signalSequence: sequence,
        kind,
        observedAtMs,
        elementId: QA_ELEMENT_ID,
        sourceEpoch: 1,
        url: AMBIENT,
        origin: ORIGIN,
        mediaState: state,
        mediaStateUnavailable: [],
        mediaStateReadErrors: {},
        clock: capturedClock(observedAtMs),
        clockReadErrors: {},
        controlledProvenance: selectedDescribe(),
    };
}

function moveSignal(signal: any, observedAtMs: number): void {
    signal.observedAtMs = observedAtMs;
    signal.clock = capturedClock(observedAtMs);
}

function driftSignal(signal: any, wallDriftMs: number): void {
    const dateNow = signal.observedAtMs + wallDriftMs;
    signal.observedAtMs = dateNow;
    signal.clock = {
        dateNow,
        performanceNow: signal.clock.performanceNow,
        timeOrigin: TIME_ORIGIN,
    };
}

function startupAbsentLifecycleState(overrides: Record<string, unknown> = {}) {
    return lifecycleState({
        networkState: 2,
        readyState: 0,
        paused: true,
        currentTime: 0,
        duration: null,
        buffered: [],
        seekable: [],
        ...overrides,
    });
}

function startupSignal(sequence: number, kind: string, observedAtMs: number): any {
    const signal: any = lifecycleSignal(
        sequence,
        kind,
        observedAtMs,
        startupAbsentLifecycleState(),
    );
    signal.mediaStateUnavailable = ['duration'];
    return signal;
}

function startupAbsenceInput(): any {
    const input = baseInput();
    const kinds = ['playing', 'waiting', 'request-start', 'progress', 'suspend'];
    const offsets = [-400, -300, -200, -100, -50];
    const startup = kinds.map((kind, index) => startupSignal(
        index + 1,
        kind,
        READY_MS + offsets[index],
    ));
    for (const signal of input.lifecycleSignals) signal.signalSequence += startup.length;
    input.lifecycleSignals.unshift(...startup);
    input.selected = {
        preSeek: { signalSequence: 7 },
        seeking: { signalSequence: 8 },
        seeked: { signalSequence: 9 },
        playing: { signalSequence: 10 },
        confirmation: { signalSequence: 11 },
    };
    return input;
}

function baseInput(): any {
    const describeResult = selectedDescribe();
    const snapshot = provenanceSnapshot(describeResult);
    const signals = [
        lifecycleSignal(1, 'playing', START_MS + 5, lifecycleState({ currentTime: 0 })),
        lifecycleSignal(2, 'timeupdate', PRE_SEEK_MS, lifecycleState({ currentTime: 9.9 })),
        lifecycleSignal(3, 'seeking', SEEK_MS + 2, lifecycleState({ currentTime: 0, seeking: true })),
        lifecycleSignal(4, 'seeked', SEEK_MS + 5, lifecycleState({ currentTime: 0 })),
        lifecycleSignal(5, 'playing', POST_PLAY_MS + 3, lifecycleState({ currentTime: 0 })),
        lifecycleSignal(6, 'timeupdate', POST_PLAY_MS + 80, lifecycleState({ currentTime: 0.08 })),
    ];
    return {
        binding: {
            sourceSha40: SOURCE_SHA,
            packageSha40: PACKAGE_SHA,
            runtime: {
                browser: 'Chrome/146.0.7680.80',
                electron: '41.0.3',
                revision: '@f08938029c887ea624da7a1717059788ed95034d',
            },
            frameUrl: FRAME_URL,
            origin: ORIGIN,
            documentGeneration: 'document-generation-7',
            profile: PROFILE,
            collectionReady: {
                dateNow: READY_MS,
                performanceNow: READY_MS - TIME_ORIGIN,
                timeOrigin: TIME_ORIGIN,
            },
            generationInstalled: at(GENERATION_MS),
        },
        provenance: { snapshot, selected: describeResult },
        sentinel: sentinelSnapshot(),
        media: mediaSnapshot(),
        lifecycleSignals: signals,
        selected: {
            preSeek: { signalSequence: 2 },
            seeking: { signalSequence: 3 },
            seeked: { signalSequence: 4 },
            playing: { signalSequence: 5 },
            confirmation: { signalSequence: 6 },
        },
        clockProjection: {
            requestWallTimeS: REQUEST_MS / 1000,
            protocolTimestamps: {
                request: PROTOCOL_REQUEST_S,
                response: PROTOCOL_REQUEST_S + 0.1,
                failure: PROTOCOL_REQUEST_S + 0.2,
            },
            projectedObservedAtMs: {
                request: REQUEST_MS,
                response: REQUEST_MS + 100,
                failure: REQUEST_MS + 200,
            },
            observationWindow: {
                clock: 'node-epoch-ms',
                openedAtMs: WINDOW_OPEN,
                closedAtMs: WINDOW_CLOSE,
            },
        },
    };
}

const CANCELLATION_DURATION = 30;
const CANCELLATION_PRE_SEEK_TIME = 29.748984;
const CANCELLATION_CONFIRMATION_TIME = 0.19293;

/*
 * The recorded RBiH4 cancellation cycle reports the exact signed buffered
 * start from the raw evidence. Fixtures below keep it verbatim; the correlator
 * must neither normalize nor rewrite it.
 */
function recordedCancellationState(overrides: Record<string, unknown> = {}) {
    return lifecycleState({
        readyState: 4,
        currentTime: 0,
        duration: CANCELLATION_DURATION,
        buffered: [[-0.002667, CANCELLATION_DURATION]],
        seekable: [[0, CANCELLATION_DURATION]],
        ...overrides,
    });
}

function cancellationInput(): any {
    const input = baseInput();
    input.lifecycleSignals = [
        lifecycleSignal(1, 'playing', START_MS + 5, recordedCancellationState({ currentTime: 0 })),
        lifecycleSignal(2, 'timeupdate', PRE_SEEK_MS, recordedCancellationState({
            currentTime: CANCELLATION_PRE_SEEK_TIME,
        })),
        lifecycleSignal(3, 'seeking', SEEK_MS + 2, recordedCancellationState({
            readyState: 1,
            currentTime: 0,
            seeking: true,
        })),
        lifecycleSignal(4, 'seeked', SEEK_MS + 5, recordedCancellationState({ currentTime: 0 })),
        lifecycleSignal(5, 'playing', POST_PLAY_MS + 3, recordedCancellationState({ currentTime: 0 })),
        lifecycleSignal(6, 'timeupdate', POST_PLAY_MS + 80, recordedCancellationState({
            currentTime: CANCELLATION_CONFIRMATION_TIME,
        })),
    ];
    input.selected = {
        preSeek: { signalSequence: 2 },
        seeking: { signalSequence: 3 },
        seeked: { signalSequence: 4 },
        playing: { signalSequence: 5 },
        confirmation: { signalSequence: 6 },
    };
    return input;
}

function capturedSequenceInput(): any {
    const input = baseInput();
    const capturedSeek = CAPTURED_SEQUENCE[1];
    const mediaOffsetMs = SEEK_MS - capturedSeek.timestamp * 1000;
    const events = mediaPlayerEvents(input);
    const retained = events.filter((event: any) => {
        const value = JSON.parse(event.value);
        if (value.event === 'kLoad' || value.event === 'kMediaLogCreated') return true;
        return value.event === 'kPipelineStateChange'
            && value.pipeline_state === 'kPlaying'
            && Math.abs(event.timestamp - mediaTimestamp(START_MS)) < 0.000001;
    });
    for (const event of retained) {
        const value = JSON.parse(event.value);
        const intendedProjectedMs = value.event === 'kMediaLogCreated'
            ? CREATED_MS
            : event.timestamp * 1000 + MEDIA_OFFSET_MS;
        event.timestamp = (intendedProjectedMs - mediaOffsetMs) / 1000;
    }
    events.length = 0;
    for (const event of retained) events.push(event);
    for (const entry of CAPTURED_SEQUENCE) {
        events.push({ timestamp: entry.timestamp, value: JSON.stringify(entry.value) });
    }
    // Unit-only readiness marker at the retained DOM completion stage. The raw
    // captured sequence above is not rewritten; this synthetic marker only
    // supplies the separately required pipeline buffering stage.
    events.push({
        timestamp: CAPTURED_SEQUENCE[3].timestamp + 0.00005,
        value: JSON.stringify({
            event: 'kBufferingStateChanged',
            pipeline_buffering_state: {
                for_suspended_start: false,
                state: 'BUFFERING_HAVE_ENOUGH',
            },
        }),
    });

    const protocolRequest = (REQUEST_MS - mediaOffsetMs) / 1000;
    input.clockProjection.protocolTimestamps = {
        request: protocolRequest,
        response: protocolRequest + 0.1,
        failure: protocolRequest + 0.2,
    };

    const projected = (timestamp: number) => timestamp * 1000 + mediaOffsetMs;
    const endedMs = projected(CAPTURED_SEQUENCE[0].timestamp);
    const seekMs = projected(capturedSeek.timestamp);
    const playingMs = projected(CAPTURED_SEQUENCE[3].timestamp);
    moveSignal(input.lifecycleSignals[0], START_MS + 5);
    moveSignal(input.lifecycleSignals[1], endedMs - 100);
    moveSignal(input.lifecycleSignals[2], seekMs + 0.05);
    moveSignal(input.lifecycleSignals[3], seekMs + 0.1);
    moveSignal(input.lifecycleSignals[4], playingMs + 0.05);
    moveSignal(input.lifecycleSignals[5], playingMs + 100);

    for (const record of input.media.records) {
        if (record.params && record.params.playerId) {
            record.params.playerId = CAPTURED_PLAYER_ID;
        }
        if (record.params && record.params.player && record.params.player.playerId) {
            record.params.player.playerId = CAPTURED_PLAYER_ID;
        }
    }
    return input;
}

function appendCapturedCompletedLoop(
    input: any,
    startTimestamp: number,
    durationSeconds: number,
): void {
    const events = mediaPlayerEvents(input);
    events.push(
        {
            timestamp: startTimestamp,
            value: JSON.stringify({ event: 'kPipelineStateChange', pipeline_state: 'kPlaying' }),
        },
        {
            timestamp: startTimestamp + durationSeconds,
            value: JSON.stringify({ event: 'kEnded' }),
        },
        {
            timestamp: startTimestamp + durationSeconds + 0.001,
            value: JSON.stringify({ event: 'kSeek', seek_target: 0 }),
        },
        {
            timestamp: startTimestamp + durationSeconds + 0.002,
            value: JSON.stringify({ event: 'kPipelineStateChange', pipeline_state: 'kSeeking' }),
        },
        {
            timestamp: startTimestamp + durationSeconds + 0.003,
            value: JSON.stringify({ event: 'kPipelineStateChange', pipeline_state: 'kPlaying' }),
        },
    );
}

function completedEarlierLoopInput(): any {
    const input = baseInput();
    for (const signal of input.lifecycleSignals) signal.signalSequence += 2;
    input.lifecycleSignals.unshift(
        lifecycleSignal(1, 'playing', EARLIER_START_MS, lifecycleState({ currentTime: 0 })),
        lifecycleSignal(2, 'ended', EARLIER_ENDED_MS, lifecycleState({
            currentTime: 10,
            ended: true,
            paused: true,
        })),
    );
    input.selected = {
        preSeek: { signalSequence: 4 },
        seeking: { signalSequence: 5 },
        seeked: { signalSequence: 6 },
        playing: { signalSequence: 7 },
        confirmation: { signalSequence: 8 },
    };
    appendCapturedCompletedLoop(input, mediaTimestamp(EARLIER_START_MS), 0.2);
    return input;
}

function withoutFreshStarts(input: any): void {
    input.lifecycleSignals = input.lifecycleSignals.filter(
        (signal: any) => !(signal.kind === 'playing'
            && signal.mediaState.currentTime === 0
            && signal.observedAtMs < PRE_SEEK_MS),
    );
}

function appendForeignPlayingStart(
    input: any,
    options: { elementId: string; sourceEpoch: number },
): void {
    const sequence = Math.max(...input.lifecycleSignals.map((signal: any) => signal.signalSequence)) + 1;
    const foreign = lifecycleSignal(
        sequence,
        'playing',
        START_MS + 10,
        lifecycleState({ currentTime: 0 }),
    );
    foreign.url = AMBIENT_OTHER;
    foreign.sourceEpoch = options.sourceEpoch;
    foreign.elementId = options.elementId;
    foreign.controlledProvenance = selectedDescribe();
    foreign.controlledProvenance.element.id = 'media:foreign';
    foreign.controlledProvenance.element.source = AMBIENT_OTHER;
    foreign.controlledProvenance.provenance.attributes.src = AMBIENT_OTHER;
    input.lifecycleSignals.push(foreign);
}

function clone<T>(value: T): T {
    return structuredClone(value);
}

function expectRejected(input: any): void {
    const before = JSON.stringify(input);
    const result = verify(input);
    expect(result.ok).toBe(false);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(JSON.stringify(input)).toBe(before);
}

function mediaPlayerEvents(input: any): any[] {
    return input.media.records.find((record: any) => record.event === 'Media.playerEventsAdded')
        .params.events;
}

function driftedAt(epochMs: number, wallDriftMs: number) {
    return {
        dateNow: epochMs + wallDriftMs,
        performanceNow: epochMs - TIME_ORIGIN,
    };
}

function appendProvenanceHistory(
    input: any,
    epochMs: number,
    options: { driftMs?: number; at?: any; kind?: string } = {},
): any {
    const events = input.provenance.snapshot.events.records;
    const event = {
        sequence: Math.max(...events.map((entry: any) => entry.sequence)) + 1,
        kind: options.kind ?? 'history',
        at: Object.prototype.hasOwnProperty.call(options, 'at')
            ? options.at
            : driftedAt(epochMs, options.driftMs ?? 0),
    };
    events.push(event);
    input.provenance.snapshot.events.count = events.length;
    return event;
}

function addMutation(input: any, name: string, outcome = 'success'): void {
    const events = input.provenance.snapshot.events.records;
    const sequence = Math.max(...events.map((event: any) => event.sequence)) + 1;
    const targetType = ['play', 'pause', 'load', 'fastSeek'].includes(name) ? 'method' : 'setter';
    const observedAt = at(START_MS + 100);
    events.push({
        sequence,
        kind: 'mutation-attempt',
        at: observedAt,
        targetType,
        name,
        id: 'media:1',
        sourceEpoch: 1,
        argTypes: [],
        argumentCount: 1,
    });
    events.push({
        sequence: sequence + 1,
        kind: 'mutation-result',
        at: at(START_MS + 101),
        targetType,
        name,
        id: 'media:1',
        outcome,
        resultType: 'undefined',
        sourceEpoch: 1,
        sequenceOfAttempt: sequence,
    });
    input.provenance.snapshot.events.count = events.length;
}

function appendMediaRecord(input: any, record: any): void {
    const records = input.media.records;
    record.sequence = records.length + 1;
    record.observedAtMs = WINDOW_CLOSE - 9;
    records.push(record);
    input.media.summary.delivered = records.length;
    input.media.summary.recorded = records.length;
}

describe('verifyControlledNativeLoopCycle', () => {
    test('accepts one exact controlled cycle with a fresh kEnded and timestamp-unsorted replay', () => {
        const input = baseInput();
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result).toMatchObject({
            ok: true,
            evidence: {
                scope: {
                    profile: PROFILE,
                    sourceSha40: SOURCE_SHA,
                    packageSha40: PACKAGE_SHA,
                    controlledProfileOnly: true,
                    admission: 'none',
                },
                media: {
                    playerId: 'player-1',
                    loadReference: { recordSequence: 3, eventIndex: 1 },
                    endedReference: { recordSequence: 3, eventIndex: 2 },
                    seekReference: { recordSequence: 3, eventIndex: 4 },
                },
                lifecycle: {
                    start: { signalSequence: 1 },
                    preSeek: { signalSequence: 2 },
                    seeking: { signalSequence: 3 },
                    seeked: { signalSequence: 4 },
                    playing: { signalSequence: 5 },
                    confirmation: { signalSequence: 6 },
                },
            },
        });
        expect(result.evidence.clocks.createdUtcMs).toBeCloseTo(CREATED_MS, 3);
        expect(result.evidence.clocks.mediaLogTimestamp).toBeCloseTo(LOG_TIMESTAMP, 6);
        expect(result.evidence.clocks.clockModel).toBe('shared-monotonic-renderer-anchor-v1');
        expect(result.evidence.clocks.rendererAnchor.signalSequence).toBe(3);
        expect(result.evidence.clocks.rendererAnchor.observedAtMs).toBe(SEEK_MS + 2);
        expect(result.evidence.clocks.rendererAnchor.localOffsetMs).toBeCloseTo(TIME_ORIGIN, 3);
        expect(result.evidence.clocks.lifetimeWallPerformanceDriftMs.maxAbs).toBeLessThan(1);
        expect(result.evidence.clocks.mediaOffsetMs).toBeCloseTo(MEDIA_OFFSET_MS, 3);
        expect(result.evidence.clocks.historicalMediaOffsetMs).toBeCloseTo(MEDIA_OFFSET_MS, 3);
        expect(result.evidence.clocks.effectiveMediaOffsetMs).toBeCloseTo(MEDIA_OFFSET_MS, 3);
        expect(result.evidence.clocks.networkOffsetMs).toBeCloseTo(MEDIA_OFFSET_MS, 3);
        expect(result.evidence.clocks.mediaOffsetDeltaMs).toBeCloseTo(0, 3);
        expect(result.evidence.clocks.mediaProjection).toBe('timestamp*1000+networkOffsetMs');
        expect(result.evidence.clocks.historicalMediaProjection)
            .toBe('timestamp*1000+historicalMediaOffsetMs');
        expect(result.evidence.clocks.startProjectedAtMs).toBeCloseTo(START_MS, 3);
        expect(result.evidence.clocks.logProjectedAtMs).toBeCloseTo(CREATED_MS, 3);
        expect(result.evidence.clocks.historicalLogProjectedAtMs).toBeCloseTo(CREATED_MS, 3);
        expect(result.evidence.clocks.logProjectedAtMs).toBeLessThan(WINDOW_OPEN);
        expect(result.evidence.clocks.startProjectedAtMs).toBeGreaterThan(WINDOW_OPEN);
        expect(result.evidence.clocks.requestAnchorDeltaMs).toBeGreaterThan(29000);
        expect(result.evidence.scope.observedSegmentOnly).toBe(true);
        expect(result.evidence.media.logReference.created).toBe(CREATED_UTC);
        expect(result.evidence.rawReferences.mediaPlayerEvents[0].timestamp).toBeGreaterThan(600000);
        expect(JSON.stringify(input)).toBe(before);
        expect(JSON.stringify(verify(input))).toBe(JSON.stringify(result));
    });

    test('maps the selected cycle with the independent Network pair while reporting historical Media drift', () => {
        const input = baseInput();
        const log = mediaPlayerEvents(input)
            .find((event: any) => JSON.parse(event.value).event === 'kMediaLogCreated');
        const load = mediaPlayerEvents(input)
            .find((event: any) => JSON.parse(event.value).event === 'kLoad');
        log.timestamp += 0.04718;
        load.timestamp += 0.04718;
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.clocks.mediaOffsetDeltaMs).toBeCloseTo(-47.18, 3);
        expect(Math.abs(result.evidence.clocks.mediaOffsetDeltaMs)).toBeGreaterThan(20);
        expect(result.evidence.clocks.historicalLogProjectedAtMs).toBeCloseTo(CREATED_MS, 3);
        expect(result.evidence.clocks.logProjectedAtMs).toBeCloseTo(CREATED_MS + 47.18, 3);
        expect(result.evidence.clocks.startProjectedAtMs).toBeCloseTo(START_MS, 3);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('accepts a long-lived wall/performance drift using each captured local pair and the seeking anchor', () => {
        const input = baseInput();
        const driftMs = 45;
        for (const signal of input.lifecycleSignals) driftSignal(signal, driftMs);
        input.clockProjection.requestWallTimeS = (REQUEST_MS + driftMs) / 1000;
        input.clockProjection.projectedObservedAtMs = {
            request: REQUEST_MS + driftMs,
            response: REQUEST_MS + driftMs + 100,
            failure: REQUEST_MS + driftMs + 200,
        };
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.clocks.rendererAnchor.signalSequence).toBe(3);
        expect(result.evidence.clocks.rendererAnchor.localOffsetMs).toBeCloseTo(TIME_ORIGIN + driftMs, 6);
        expect(result.evidence.clocks.lifetimeWallPerformanceDriftMs.maxAbs).toBeCloseTo(driftMs, 6);
        expect(result.evidence.clocks.mediaOffsetDeltaMs).toBeCloseTo(-driftMs, 6);
        expect(result.evidence.clocks.startProjectedAtMs).toBeCloseTo(START_MS + driftMs, 3);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects old lifecycle rows without actual captured clock pairs instead of synthesizing them', () => {
        const missing = baseInput();
        delete missing.lifecycleSignals[2].clock;
        const missingResult = verify(missing);
        expect(missingResult.ok).toBe(false);
        expect(missingResult.reasons).toContain('lifecycle.clock');

        const partial = baseInput();
        delete partial.lifecycleSignals[3].clock.performanceNow;
        const partialResult = verify(partial);
        expect(partialResult.ok).toBe(false);
        expect(partialResult.reasons).toContain('lifecycle.clock');

        const readError = baseInput();
        readError.lifecycleSignals[4].clockReadErrors.performanceNow = 'clock read blocked';
        const readResult = verify(readError);
        expect(readResult.ok).toBe(false);
        expect(readResult.reasons).toContain('lifecycle.clock.read-errors');

        const wrongOrigin = baseInput();
        wrongOrigin.lifecycleSignals[5].clock.timeOrigin += 1;
        const originResult = verify(wrongOrigin);
        expect(originResult.ok).toBe(false);
        expect(originResult.reasons).toContain('lifecycle.clock.origin');

        const staleObserved = baseInput();
        staleObserved.lifecycleSignals[1].observedAtMs += 1;
        const staleResult = verify(staleObserved);
        expect(staleResult.ok).toBe(false);
        expect(staleResult.reasons).toContain('lifecycle.clock.observation');
    });

    test('rejects every unsupported runtime or revision instead of assuming the shared monotonic model', () => {
        const fields = [
            ['browser', 'Chrome/145.0.0.0'],
            ['electron', '40.0.0'],
            ['revision', '@0000000000000000000000000000000000000000'],
        ] as const;
        for (const [field, value] of fields) {
            const input = baseInput();
            input.binding.runtime[field] = value;
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain('binding.runtime');
        }
    });

    test('rejects missing or malformed selected Network request anchors', () => {
        const missing = baseInput();
        delete missing.clockProjection.protocolTimestamps.request;
        expect(verify(missing).reasons).toContain('clockProjection.protocolTimestamps');

        const nonfinite = baseInput();
        nonfinite.clockProjection.protocolTimestamps.request = Number.NaN;
        expect(verify(nonfinite).reasons).toContain('clockProjection.protocolTimestamps');

        const wrongProjection = baseInput();
        wrongProjection.clockProjection.projectedObservedAtMs.request = REQUEST_MS + 1;
        expect(verify(wrongProjection).reasons).toContain('clockProjection.request-anchor');
    });

    test('rejects nonmonotonic captured renderer performance time', () => {
        const input = baseInput();
        input.lifecycleSignals[2].clock.performanceNow =
            input.lifecycleSignals[1].clock.performanceNow - 1;
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.order');

        const history = baseInput();
        const reversed = lifecycleSignal(
            3,
            'timeupdate',
            PRE_SEEK_MS + 5,
            lifecycleState({ currentTime: 9.95 }),
        );
        setComparisonClock(reversed, PRE_SEEK_MS + 5, PRE_SEEK_MS - 15);
        insertLifecycleSignal(history, 2, reversed);
        const historyResult = verify(history);
        expect(historyResult.ok).toBe(false);
        expect(historyResult.reasons).toContain('lifecycle.clock.chronology');
    });

    test('still rejects a genuine 20.001ms same-stage seeking/native discrepancy', () => {
        const input = baseInput();
        const shiftMs = 20.001;
        moveSignal(input.lifecycleSignals[2], SEEK_MS + shiftMs);
        moveSignal(input.lifecycleSignals[3], SEEK_MS + 5 + shiftMs);
        moveSignal(input.lifecycleSignals[4], POST_PLAY_MS + 3 + shiftMs);
        moveSignal(input.lifecycleSignals[5], POST_PLAY_MS + 80 + shiftMs);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.seek.unique');
    });

    test('accepts actual-shaped startup duration absence strictly before readiness and selected start', () => {
        const input = startupAbsenceInput();
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        const retained = result.evidence.rawReferences.lifecycleSignals;
        expect(retained).toHaveLength(input.lifecycleSignals.length);
        expect(retained.slice(0, 5)).toEqual(input.lifecycleSignals.slice(0, 5));
        for (const signal of retained.slice(0, 5)) {
            expect(signal.mediaStateUnavailable).toEqual(['duration']);
            expect(signal.mediaState.duration).toBeNull();
            expect(signal.mediaState.readyState).toBe(0);
            expect(signal.mediaStateReadErrors).toEqual({});
        }
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects the startup duration marker at the exact collection readiness boundary', () => {
        const input = startupAbsenceInput();
        moveSignal(input.lifecycleSignals[4], READY_MS);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
    });

    test('rejects the startup duration marker after readiness but before the selected start', () => {
        const input = startupAbsenceInput();
        moveSignal(input.lifecycleSignals[4], READY_MS + 100);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
    });

    test('rejects the startup duration marker moved into the selected proof interval', () => {
        const input = startupAbsenceInput();
        moveSignal(input.lifecycleSignals[4], POST_PLAY_MS);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
    });

    test('rejects a start whose captured performance is before readiness despite a raw-wall-fresh placement', () => {
        const input = baseInput();
        for (const signal of input.lifecycleSignals) driftSignal(signal, 10);
        setComparisonClock(input.lifecycleSignals[0], START_MS + 5, START_MS + 5);
        input.binding.collectionReady = {
            dateNow: START_MS + 10,
            performanceNow: START_MS + 10 - TIME_ORIGIN,
            timeOrigin: TIME_ORIGIN,
        };
        const startEvent = mediaPlayerEvents(input).find((event: any) => {
            const value = JSON.parse(event.value);
            return value.event === 'kPipelineStateChange'
                && value.pipeline_state === 'kPlaying'
                && Math.abs(event.timestamp - mediaTimestamp(START_MS)) < 0.000001;
        });
        startEvent.timestamp = mediaTimestamp(START_MS + 15);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.start.unique');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects other unavailable fields, duplicate markers and malformed annotations at startup', () => {
        const cases: any[] = [
            ['buffered'],
            ['duration', 'buffered'],
            ['duration', 'duration'],
            ['duration', null],
            'duration',
            {},
        ];
        for (const unavailable of cases) {
            const input = startupAbsenceInput();
            input.lifecycleSignals[4].mediaStateUnavailable = unavailable;
            expectRejected(input);
        }
    });

    test('rejects missing, non-null or inferred startup duration values', () => {
        const missing = startupAbsenceInput();
        delete missing.lifecycleSignals[4].mediaState.duration;
        expectRejected(missing);

        const undefinedDuration = startupAbsenceInput();
        undefinedDuration.lifecycleSignals[4].mediaState.duration = undefined;
        expectRejected(undefinedDuration);

        const inferred = startupAbsenceInput();
        inferred.lifecycleSignals[4].mediaState.duration = 30;
        expectRejected(inferred);
    });

    test('rejects any startup mediaState read error even with the duration marker', () => {
        const input = startupAbsenceInput();
        input.lifecycleSignals[4].mediaStateReadErrors = { duration: 'read-threw' };
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateReadErrors');
    });

    test('accepts actual pipeline/buffering shapes, historical creation and documented optional absence', () => {
        const input = baseInput();
        expect(input.provenance.selected.provenance.srcObject).toEqual({
            present: false,
            type: 'none',
            attributeReflection: false,
        });
        expect(input.provenance.selected.element.registeredAt.performanceNow).not.toBe(
            input.provenance.snapshot.events.records[1].at.performanceNow,
        );
        expect(input.provenance.snapshot.install.methods.fastSeek).toBe('unavailable');
        expect(input.provenance.snapshot.install.absenceAudit.entries).toEqual([
            { name: 'fastSeek', kind: 'method', status: 'absent' },
        ]);
        expect(input.media.records[3]).toMatchObject({
            event: 'Media.playerErrorsRaised',
            params: { playerId: 'player-1', errors: [] },
        });
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.media.eventOrder).toEqual([
            'kPipelineStateChange',
            'kPipelineStateChange',
            'kSeek',
            'kPipelineStateChange',
        ]);
        expect(result.evidence.media.decoderEofUsed).toBe(false);
        expect(result.evidence.rawReferences.mediaPlayerEvents.some((event: any) =>
            event.value.event === 'kBufferingStateChanged')).toBe(true);
    });

    test('accepts the captured kSeek request followed by one pipeline kSeeking transition', () => {
        const input = capturedSequenceInput();
        const result = verify(input);
        expect(result.ok).toBe(true);
        const captured = result.evidence.rawReferences.mediaPlayerEvents;
        expect(captured.filter((event: any) => event.value.event === 'kSeek')).toHaveLength(1);
        expect(captured.filter((event: any) => event.value.event === 'kPipelineStateChange'
            && event.value.pipeline_state === 'kSeeking')).toHaveLength(1);
        expect(captured.some((event: any) => event.value.event === 'kBufferingStateChanged'
            && event.value.audio_buffering_state?.state === 'BUFFERING_HAVE_ENOUGH')).toBe(true);
        expect(captured.some((event: any) => event.value.event === 'kBufferingStateChanged'
            && event.value.pipeline_buffering_state?.for_suspended_start === false
            && event.value.pipeline_buffering_state?.state === 'BUFFERING_HAVE_ENOUGH')).toBe(true);
        expect(result.evidence.media.playerId).toBe(CAPTURED_PLAYER_ID);
        expect(result.evidence.media.seekReference.seekTarget).toBe(0);
    });

    test('rejects an extra kSeek request beside the captured request', () => {
        const input = capturedSequenceInput();
        mediaPlayerEvents(input).push({
            timestamp: CAPTURED_SEQUENCE[0].timestamp + 0.1,
            value: JSON.stringify({ event: 'kSeek', seek_target: 0 }),
        });
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.seek.ambiguous');
    });

    test('rejects a pipeline kSeeking transition before the selected request', () => {
        const input = capturedSequenceInput();
        mediaPlayerEvents(input).push({
            timestamp: CAPTURED_SEQUENCE[0].timestamp + 0.2,
            value: JSON.stringify({ event: 'kPipelineStateChange', pipeline_state: 'kSeeking' }),
        });
        expectRejected(input);
    });

    test('rejects a pipeline kSeeking transition after post-seek playing', () => {
        const input = capturedSequenceInput();
        mediaPlayerEvents(input).push({
            timestamp: CAPTURED_SEQUENCE[3].timestamp + 0.1,
            value: JSON.stringify({ event: 'kPipelineStateChange', pipeline_state: 'kSeeking' }),
        });
        expectRejected(input);
    });

    test('rejects duplicate pipeline kSeeking transitions inside the selected request interval', () => {
        const input = capturedSequenceInput();
        mediaPlayerEvents(input).push({
            timestamp: CAPTURED_SEQUENCE[2].timestamp + 0.00002,
            value: JSON.stringify({ event: 'kPipelineStateChange', pipeline_state: 'kSeeking' }),
        });
        expectRejected(input);
    });

    test('accepts a synthetic completed earlier loop outside the selected cycle', () => {
        const input = capturedSequenceInput();
        appendCapturedCompletedLoop(input, CAPTURED_SEQUENCE[1].timestamp - 5, 1);
        const result = verify(input);
        expect(result.ok).toBe(true);
        const captured = result.evidence.rawReferences.mediaPlayerEvents;
        expect(captured.filter((event: any) => event.value.event === 'kSeek')).toHaveLength(2);
        expect(captured.filter((event: any) => event.value.event === 'kPipelineStateChange'
            && event.value.pipeline_state === 'kSeeking')).toHaveLength(2);
        expect(result.evidence.media.seekReference.timestamp).toBe(CAPTURED_SEQUENCE[1].timestamp);
    });

    test('accepts synthetic completed loops before the selected start and after confirmation', () => {
        const input = capturedSequenceInput();
        appendCapturedCompletedLoop(input, CAPTURED_SEQUENCE[1].timestamp - 5, 1);
        appendCapturedCompletedLoop(input, CAPTURED_SEQUENCE[3].timestamp + 0.12, 0.02);
        const result = verify(input);
        expect(result.ok).toBe(true);
        const captured = result.evidence.rawReferences.mediaPlayerEvents;
        expect(captured.filter((event: any) => event.value.event === 'kPipelineStateChange'
            && event.value.pipeline_state === 'kSeeking')).toHaveLength(3);
        expect(result.evidence.media.seekReference.timestamp).toBe(CAPTURED_SEQUENCE[1].timestamp);
    });

    test('selects the unique latest start after a completed earlier lifecycle and native loop', () => {
        const input = completedEarlierLoopInput();
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.lifecycle.start).toEqual({
            signalSequence: 3,
            observedAtMs: START_MS + 5,
        });
        expect(result.evidence.media.startReference).toEqual({
            recordSequence: 3,
            recordIndex: 2,
            eventIndex: 5,
            timestamp: mediaTimestamp(START_MS),
        });
        expect(result.evidence.lifecycle.preSeek.signalSequence).toBe(4);
        expect(result.evidence.lifecycle.confirmation.signalSequence).toBe(8);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects two eligible latest starts sharing one timestamp', () => {
        const input = completedEarlierLoopInput();
        moveSignal(input.lifecycleSignals[0], input.lifecycleSignals[2].observedAtMs);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.start.unique');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects a selected cycle with no fresh earlier playing start', () => {
        const input = completedEarlierLoopInput();
        withoutFreshStarts(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.start.unique');
    });

    test('rejects a latest playing candidate for a different QA element', () => {
        const input = completedEarlierLoopInput();
        withoutFreshStarts(input);
        appendForeignPlayingStart(input, {
            elementId: 'qa-ambient-foreign',
            sourceEpoch: 1,
        });
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.start.unique');
    });

    test('rejects a latest playing candidate from another source epoch', () => {
        const input = completedEarlierLoopInput();
        withoutFreshStarts(input);
        appendForeignPlayingStart(input, {
            elementId: QA_ELEMENT_ID,
            sourceEpoch: 2,
        });
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.start.unique');
    });

    test('rejects a prior playing start older than the fresh collection floor', () => {
        const input = completedEarlierLoopInput();
        input.lifecycleSignals = input.lifecycleSignals.filter(
            (signal: any) => signal.signalSequence !== 3,
        );
        moveSignal(input.lifecycleSignals[0], WINDOW_OPEN - 100);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.start.unique');
    });

    test('rejects an additional native playing start beside the selected lifecycle start', () => {
        const input = completedEarlierLoopInput();
        mediaPlayerEvents(input).push(pipelineState('kPlaying', START_MS + 2));
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.start.unique');
    });

    test('same result when the replay array is reordered or delivery records are batched', () => {
        const normallyOrdered = baseInput();
        const reversed = baseInput();
        const events = mediaPlayerEvents(reversed);
        events.reverse();
        for (const record of reversed.media.records) record.observedAtMs = WINDOW_CLOSE - 10;
        expect(verify(normallyOrdered).ok).toBe(true);
        expect(verify(reversed).ok).toBe(true);
    });

    test('rejects a stale endpoint with no fresh kEnded for the selected cycle', () => {
        const input = baseInput();
        const events = mediaPlayerEvents(input);
        const endedIndex = events.findIndex((event: any) => semanticMediaEvent(event) === 'kEnded');
        events.splice(endedIndex, 1);
        events.push(makeEvent('kEnded', START_MS - 10));
        expectRejected(input);
    });

    test('rejects decoderEOF-only completion', () => {
        const input = baseInput();
        const events = mediaPlayerEvents(input);
        const endedIndex = events.findIndex((event: any) => semanticMediaEvent(event) === 'kEnded');
        events[endedIndex] = makeEvent('kDecoderEOF', ENDED_MS);
        expectRejected(input);
    });

    for (const competing of ['kPause', 'kLoad', 'kError', 'kSeek']) {
        test(`rejects ${competing} interference inside the selected Media cycle`, () => {
            const input = baseInput();
            mediaPlayerEvents(input).push(makeEvent(
                competing,
                START_MS + 100,
                competing === 'kLoad'
                    ? { url: AMBIENT }
                    : (competing === 'kSeek' ? { seek_target: 0 } : {}),
            ));
            expectRejected(input);
        });
    }

    test('rejects a Media record outside the recorded collection window', () => {
        const input = baseInput();
        input.media.records[0].observedAtMs = WINDOW_CLOSE + 1;
        expectRejected(input);
    });

    test('rejects a load URL that does not identify the selected ambient asset', () => {
        const input = baseInput();
        const load = mediaPlayerEvents(input).find((event: any) => semanticMediaEvent(event) === 'kLoad');
        load.value = JSON.stringify({ event: 'kLoad', url: AMBIENT_OTHER });
        expectRejected(input);
    });

    test('rejects duplicate same-asset players', () => {
        const input = baseInput();
        appendMediaRecord(input, {
            event: 'Media.playerCreated',
            params: { player: { playerId: 'player-2' } },
        });
        appendMediaRecord(input, {
            event: 'Media.playerPropertiesChanged',
            params: { playerId: 'player-2', properties: [{ name: 'kFrameUrl', value: FRAME_URL }] },
        });
        appendMediaRecord(input, {
            event: 'Media.playerEventsAdded',
            params: {
                playerId: 'player-2',
                events: [makeEvent('kLoad', CREATED_MS + 3, { url: AMBIENT })],
            },
        });
        expectRejected(input);
    });

    test('rejects a duplicate same-asset load on the selected player', () => {
        const input = baseInput();
        mediaPlayerEvents(input).push(makeEvent('kLoad', CREATED_MS + 4, { url: AMBIENT }));
        expectRejected(input);
    });

    test('rejects a missing player creation record', () => {
        const input = baseInput();
        input.media.records = input.media.records.filter(
            (record: any) => record.event !== 'Media.playerCreated',
        );
        input.media.summary.delivered = input.media.records.length;
        input.media.summary.recorded = input.media.records.length;
        expectRejected(input);
    });

    test('rejects a duplicate eligible provenance element for the same asset', () => {
        const input = baseInput();
        const entry = clone(input.provenance.snapshot.registry.entries[0]);
        input.provenance.snapshot.registry.entries.push(entry);
        input.provenance.snapshot.registry.count = 2;
        input.provenance.snapshot.registry.duplicateSources = [AMBIENT];
        expectRejected(input);
    });

    test('rejects missing kMediaLogCreated creation evidence', () => {
        const input = baseInput();
        const events = mediaPlayerEvents(input);
        const index = events.findIndex((event: any) => JSON.parse(event.value).event === 'kMediaLogCreated');
        events.splice(index, 1);
        expectRejected(input);
    });

    test('rejects missing kFrameUrl player properties', () => {
        const input = baseInput();
        input.media.records = input.media.records.filter(
            (record: any) => record.event !== 'Media.playerPropertiesChanged',
        );
        input.media.summary.delivered = input.media.records.length;
        input.media.summary.recorded = input.media.records.length;
        expectRejected(input);
    });

    test('rejects a malformed UTC creation anchor', () => {
        const input = baseInput();
        const event = mediaPlayerEvents(input)
            .find((entry: any) => JSON.parse(entry.value).event === 'kMediaLogCreated');
        event.value = JSON.stringify({ event: 'kMediaLogCreated', created: '2026-10-29T21:28:55.915Z' });
        expectRejected(input);
    });

    test('accepts delayed native Media creation relative to the provenance construct marker and reports separation', () => {
        const input = baseInput();
        const event = mediaPlayerEvents(input)
            .find((entry: any) => JSON.parse(entry.value).event === 'kMediaLogCreated');
        event.value = JSON.stringify({
            event: 'kMediaLogCreated',
            created: '2026-10-29 21:28:56.061309 UTC',
        });
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.clocks.nativeCreationVsConstructMarkerMs)
            .toBeCloseTo(135.944, 3);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects impossible native Media history order rather than inventing a stage latency', () => {
        const input = baseInput();
        const events = mediaPlayerEvents(input);
        const log = events.find((entry: any) => JSON.parse(entry.value).event === 'kMediaLogCreated');
        const load = events.find((entry: any) => JSON.parse(entry.value).event === 'kLoad');
        log.timestamp = load.timestamp + 0.001;
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.history.native-order');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects historical Media creation before the installed generation', () => {
        const input = baseInput();
        const event = mediaPlayerEvents(input)
            .find((entry: any) => JSON.parse(entry.value).event === 'kMediaLogCreated');
        event.value = JSON.stringify({
            event: 'kMediaLogCreated',
            created: '2026-10-29 21:28:55.385365 UTC',
        });
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.history.generation');
    });

    test('rejects absent optional APIs without the documented rechecked absence contract', () => {
        const missing = baseInput();
        delete missing.provenance.snapshot.install.absenceAudit;
        delete missing.provenance.snapshot.coverage.absenceAudit;
        expectRejected(missing);

        const inconsistent = baseInput();
        inconsistent.provenance.snapshot.install.methods.fastSeek = 'wrapped';
        expectRejected(inconsistent);

        const present = baseInput();
        present.provenance.snapshot.install.methods.fastSeek = 'present-unwrapped';
        present.provenance.snapshot.coverage.methods.fastSeek = 'present-unwrapped';
        expectRejected(present);

        const notRechecked = baseInput();
        notRechecked.provenance.snapshot.install.absenceAudit.recheckedOnEveryValidation = false;
        notRechecked.provenance.snapshot.coverage.absenceAudit.recheckedOnEveryValidation = false;
        expectRejected(notRechecked);

        const wrongKind = baseInput();
        wrongKind.provenance.snapshot.install.absenceAudit.entries[0].kind = 'setter';
        wrongKind.provenance.snapshot.coverage.absenceAudit.entries[0].kind = 'setter';
        expectRejected(wrongKind);

        const unlisted = baseInput();
        unlisted.provenance.snapshot.install.unsupportedOptionalApis = [];
        unlisted.provenance.snapshot.coverage.missingOptionalApis = [];
        expectRejected(unlisted);
    });

    test('rejects registration clocks ordered after construction', () => {
        const input = baseInput();
        input.provenance.selected.element.registeredAt = at(CREATED_MS + 20);
        expectRejected(input);
    });

    test('rejects a srcObject report that is null instead of the exact none type', () => {
        const input = baseInput();
        input.provenance.selected.provenance.srcObject.type = null;
        expectRejected(input);
    });

    test('rejects nonempty player error arrays while empty arrays remain zero errors', () => {
        const input = baseInput();
        appendMediaRecord(input, {
            event: 'Media.playerErrorsRaised',
            params: {
                playerId: 'player-1',
                errors: [{ error: 'kDecodeError' }],
            },
        });
        expectRejected(input);
    });

    test('rejects a network request anchor outside the 20ms UTC fence', () => {
        const input = baseInput();
        input.clockProjection.requestWallTimeS = (REQUEST_MS + 100) / 1000;
        input.clockProjection.projectedObservedAtMs.request = REQUEST_MS + 100;
        input.clockProjection.projectedObservedAtMs.response = REQUEST_MS + 200;
        input.clockProjection.projectedObservedAtMs.failure = REQUEST_MS + 300;
        expectRejected(input);
    });

    test('rejects a renderer clock pair that does not agree inside 20ms', () => {
        const input = baseInput();
        input.binding.collectionReady.dateNow += 100;
        expectRejected(input);
    });

    test('rejects collection readiness before generation installation', () => {
        const input = baseInput();
        input.binding.generationInstalled = at(READY_MS + 100);
        expectRejected(input);
    });

    test('rejects tied ambiguous end and seek ordering', () => {
        const input = baseInput();
        const events = mediaPlayerEvents(input);
        const seek = events.find((event: any) => semanticMediaEvent(event) === 'kSeek');
        const ended = events.find((event: any) => semanticMediaEvent(event) === 'kEnded');
        ended.timestamp = seek.timestamp;
        expectRejected(input);
    });

    test('rejects a cycle start before collectionReady', () => {
        const input = baseInput();
        const early = READY_MS - 100;
        const events = mediaPlayerEvents(input);
        events.find((event: any) => {
            const parsed = JSON.parse(event.value);
            return semanticMediaEvent(event) === 'kPlaying' && Math.abs(event.timestamp - mediaTimestamp(START_MS)) < 0.000001;
        }).timestamp = mediaTimestamp(early);
        moveSignal(input.lifecycleSignals[0], early + 5);
        expectRejected(input);
    });

    test('rejects a selected source epoch other than the initial URL epoch 1', () => {
        const input = baseInput();
        input.provenance.selected.element.sourceEpoch = 2;
        input.provenance.snapshot.registry.entries[0].sourceEpoch = 2;
        input.provenance.snapshot.events.records[1].sourceEpoch = 2;
        for (const signal of input.lifecycleSignals) {
            signal.sourceEpoch = 2;
            signal.controlledProvenance.element.sourceEpoch = 2;
        }
        expectRejected(input);
    });

    test('rejects a same-URL reset even when the URL remains identical', () => {
        const input = baseInput();
        input.provenance.snapshot.events.records.push({
            sequence: 5,
            kind: 'source-epoch',
            at: at(START_MS + 200),
            id: 'media:1',
            cause: 'load',
            previous: 1,
            sourceEpoch: 2,
            source: AMBIENT,
        });
        input.provenance.snapshot.events.count = 5;
        expectRejected(input);
    });

    for (const name of [
        'currentTime',
        'fastSeek',
        'load',
        'src',
        'srcObject',
        'playbackRate',
        'defaultPlaybackRate',
        'loop',
        'controls',
        'autoplay',
        'preload',
        'play',
        'pause',
    ]) {
        test(`rejects manual ${name} interference during the selected cycle`, () => {
            const input = baseInput();
            addMutation(input, name);
            expectRejected(input);
        });
    }

    test('rejects a thrown mutation intent during the selected cycle', () => {
        const input = baseInput();
        addMutation(input, 'pause', 'threw');
        expectRejected(input);
    });

    test('rejects an unexpected MediaSession action', () => {
        const input = baseInput();
        input.sentinel.invalidReasons = ['media-session-action-invoked'];
        input.sentinel.valid = false;
        input.sentinel.events.records.push({
            sequence: 2,
            kind: 'media-session-action',
            at: at(START_MS + 200),
            action: 'seekto',
            seekTime: 10,
            seekOffset: null,
            fastSeek: null,
            performed: false,
        });
        input.sentinel.events.count = 2;
        expectRejected(input);
    });

    test('rejects own shadows, tamper reasons and read errors', () => {
        const shadowed = baseInput();
        shadowed.provenance.selected.provenance.ownShadows = ['play'];
        expectRejected(shadowed);

        const tampered = baseInput();
        tampered.provenance.snapshot.valid = false;
        tampered.provenance.snapshot.invalidReasons = ['constructor-replaced'];
        expectRejected(tampered);

        const unreadable = baseInput();
        unreadable.provenance.selected.provenance.readErrors = { src: 'read-threw' };
        expectRejected(unreadable);
    });

    test('rejects unexplained observer changes', () => {
        const input = baseInput();
        input.provenance.selected.provenance.observer.unexplained = 1;
        expectRejected(input);
    });

    test('rejects dropped or truncated collector records', () => {
        const dropped = baseInput();
        dropped.media.summary.dropped = 1;
        dropped.media.summary.truncated = true;
        dropped.media.summary.evidenceTruncated = true;
        dropped.media.overflow.records = true;
        dropped.media.overflow.dropReasons.records = 1;
        expectRejected(dropped);

        const provenanceTruncated = baseInput();
        provenanceTruncated.provenance.snapshot.events.truncated = true;
        provenanceTruncated.provenance.snapshot.events.dropped = 1;
        expectRejected(provenanceTruncated);
    });

    test('rejects a missing selected signal reference', () => {
        const input = baseInput();
        input.lifecycleSignals = input.lifecycleSignals.filter(
            (signal: any) => signal.signalSequence !== 6,
        );
        expectRejected(input);
    });

    test('rejects duplicated signal sequences and resolves selected entries only by signalSequence', () => {
        const duplicated = baseInput();
        duplicated.lifecycleSignals[5].signalSequence = 5;
        expectRejected(duplicated);

        const detached = baseInput();
        detached.selected.confirmation = {
            signalSequence: 6,
            kind: 'fabricated-kind',
            observedAtMs: 1,
        };
        expect(verify(detached).ok).toBe(true);

        detached.selected.confirmation = { signalSequence: 999 };
        expectRejected(detached);
    });

    test('rejects malformed finite clock values rather than inferring defaults', () => {
        const input = baseInput();
        input.clockProjection.protocolTimestamps.response = Number.NaN;
        expectRejected(input);
    });

    test('accepts coherent in-order later provenance history beyond the clock fence after the selected cycle', () => {
        const input = baseInput();
        const appended = [];
        for (let index = 0; index < 16; index += 1) {
            appended.push(appendProvenanceHistory(
                input,
                CONFIRMATION_MS + 20000 + index * 10000,
                { driftMs: 28.0999 },
            ));
        }
        const events = input.provenance.snapshot.events;
        expect(events.records).toHaveLength(4 + appended.length);
        expect(events.count).toBe(events.records.length);
        for (const event of appended) {
            expect(Math.abs(event.at.dateNow - (TIME_ORIGIN + event.at.performanceNow)))
                .toBeGreaterThan(20);
            expect(event.at.dateNow).toBeGreaterThan(CONFIRMATION_MS);
            expect(TIME_ORIGIN + event.at.performanceNow).toBeGreaterThan(CONFIRMATION_MS);
        }
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects the same wall drift inside the selected interval', () => {
        const input = baseInput();
        const insideMs = input.lifecycleSignals[1].observedAtMs + 100;
        appendProvenanceHistory(input, insideMs, { driftMs: 28.0999 });
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('provenance.events.clock');
    });

    test('rejects conflicting late-history clock-domain membership at the selected boundary', () => {
        const input = baseInput();
        const confirmationMs = input.lifecycleSignals[5].observedAtMs;
        appendProvenanceHistory(input, confirmationMs + 5, { driftMs: 28.0999 });
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('provenance.events.clock.membership');
    });

    test('rejects malformed, nonfinite or incomplete late provenance history', () => {
        const lateEpochMs = CONFIRMATION_MS + 50000;
        const valid = driftedAt(lateEpochMs, 28.0999);
        const cases: any[] = [
            { ...valid, dateNow: Number.NaN },
            { ...valid, performanceNow: Number.POSITIVE_INFINITY },
            { ...valid, dateNow: 0 },
            { ...valid, performanceNow: -1 },
            { dateNow: valid.dateNow },
            { performanceNow: valid.performanceNow },
            {},
            null,
        ];
        for (const at of cases) {
            const input = baseInput();
            appendProvenanceHistory(input, lateEpochMs, { at });
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain('provenance.events.clock');
            expect(input.provenance.snapshot.events.records).toHaveLength(5);
        }
    });

    test('accepts the recorded cancellation cycle with readyState 1 only at the zero seeking sample', () => {
        const input = cancellationInput();
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(input.lifecycleSignals.map((signal: any) => signal.mediaState.readyState))
            .toEqual([4, 4, 1, 4, 4, 4]);
        expect(input.lifecycleSignals[2].mediaState.currentTime).toBe(0);
        expect(input.lifecycleSignals[2].mediaState.seeking).toBe(true);
        expect(input.lifecycleSignals[2].signalSequence).toBe(3);
        expect(input.lifecycleSignals[2].mediaState.buffered).toEqual([[-0.002667, 30]]);
        expect(input.lifecycleSignals[2].mediaState.seekable).toEqual([[0, 30]]);
        expect(input.lifecycleSignals[5].mediaState.currentTime).toBe(CANCELLATION_CONFIRMATION_TIME);
        expect(result.evidence.lifecycle.seeking.signalSequence).toBe(3);
        expect(result.evidence.lifecycle.confirmation.signalSequence).toBe(6);
        const retained = result.evidence.rawReferences.lifecycleSignals;
        expect(retained).toHaveLength(input.lifecycleSignals.length);
        expect(retained[2].mediaState.readyState).toBe(1);
        expect(retained[2].mediaState.buffered).toEqual([[-0.002667, 30]]);
        expect(retained[2].mediaState.seekable).toEqual([[0, 30]]);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('retains readyState 4 acceptance at the selected seeking sample', () => {
        const input = cancellationInput();
        input.lifecycleSignals[2].mediaState.readyState = 4;
        const before = JSON.stringify(input);
        expect(verify(input).ok).toBe(true);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects readyState 0 at the selected zero seeking sample', () => {
        const input = cancellationInput();
        input.lifecycleSignals[2].mediaState.readyState = 0;
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.seeking.state');
    });

    test('rejects readiness other than 1 or 4 at the selected seeking sample', () => {
        for (const readyState of [2, 3, 5]) {
            const input = cancellationInput();
            input.lifecycleSignals[2].mediaState.readyState = readyState;
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain('selected.seeking.state');
        }
    });

    test('rejects readyState 1 at every selected stage other than seeking', () => {
        const stages: Array<[number, string]> = [
            [1, 'selected.preSeek.state'],
            [3, 'selected.seeked.state'],
            [4, 'selected.playing.state'],
            [5, 'selected.confirmation.state'],
        ];
        for (const [index, reason] of stages) {
            const input = cancellationInput();
            input.lifecycleSignals[index].mediaState.readyState = 1;
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain(reason);
        }
    });

    test('rejects a readyState 1 sample that is not the zero seeking stage', () => {
        const advancing = cancellationInput();
        advancing.lifecycleSignals[2].mediaState.currentTime = 0.5;
        expect(verify(advancing).reasons).toContain('selected.seeking');

        const notSeeking = cancellationInput();
        notSeeking.lifecycleSignals[2].mediaState.seeking = false;
        expect(verify(notSeeking).reasons).toContain('selected.seeking');

        const wrongKind = cancellationInput();
        wrongKind.lifecycleSignals[2].kind = 'seeked';
        expect(verify(wrongKind).reasons).toContain('selected.seeking');
    });

    test('rejects missing or malformed duration metadata at the readyState 1 seeking sample', () => {
        const missing = cancellationInput();
        delete missing.lifecycleSignals[2].mediaState.duration;
        expect(verify(missing).reasons).toContain('selected.seeking.state');

        const cases: any[] = [null, 0, -1, Number.POSITIVE_INFINITY, Number.NaN, '30'];
        for (const duration of cases) {
            const input = cancellationInput();
            input.lifecycleSignals[2].mediaState.duration = duration;
            expect(verify(input).reasons).toContain('selected.seeking.state');
        }
    });

    test('rejects read errors and partially annotated ranges at the readyState 1 seeking sample', () => {
        const unreadable = cancellationInput();
        unreadable.lifecycleSignals[2].mediaStateReadErrors = { buffered: 'read-threw' };
        expect(verify(unreadable).reasons).toContain('lifecycle.mediaStateReadErrors');

        for (const field of ['buffered', 'seekable']) {
            const unavailable = cancellationInput();
            unavailable.lifecycleSignals[2].mediaStateUnavailable = [field];
            const result = verify(unavailable);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
        }
    });

    test('rejects a media element error at the readyState 1 seeking sample and at confirmation', () => {
        const cases: Array<[number, string]> = [
            [2, 'selected.seeking.state'],
            [5, 'selected.confirmation.state'],
        ];
        for (const [index, reason] of cases) {
            const input = cancellationInput();
            input.lifecycleSignals[index].mediaState.mediaError = {
                code: 2,
                message: 'MEDIA_ERR_NETWORK',
            };
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain(reason);
        }
    });

    test('rejects interference and a failed continuation in the readyState 1 cycle', () => {
        const waiting = cancellationInput();
        waiting.lifecycleSignals.push(lifecycleSignal(
            7,
            'waiting',
            SEEK_MS + 3,
            recordedCancellationState({ readyState: 1, currentTime: 0, seeking: true }),
        ));
        expect(verify(waiting).reasons).toContain('selected.interference');

        const duplicateSeeking = cancellationInput();
        duplicateSeeking.lifecycleSignals.push(lifecycleSignal(
            7,
            'seeking',
            SEEK_MS + 4,
            recordedCancellationState({ readyState: 1, currentTime: 0, seeking: true }),
        ));
        expect(verify(duplicateSeeking).reasons).toContain('selected.seeking.ambiguity');

        const stalled = cancellationInput();
        stalled.lifecycleSignals[5].mediaState.currentTime = 0;
        expect(verify(stalled).reasons).toContain('selected.confirmation');
    });

    /*
     * Retained actual three-case replay, first case. The in-progress zero seek
     * is reported as `waiting` between the uniquely selected seeking and seeked
     * samples while the browser still exposes readyState 1. Every sample keeps
     * its signed buffered/seekable values verbatim and nothing is rewritten.
     * The original rejection of waiting generally remains pinned above.
     */
    function inProgressWaitingInput(): any {
        const input = baseInput();
        input.lifecycleSignals = [
            lifecycleSignal(536, 'playing', START_MS + 5, recordedCancellationState({ currentTime: 0 })),
            lifecycleSignal(537, 'timeupdate', PRE_SEEK_MS, recordedCancellationState({
                currentTime: CANCELLATION_PRE_SEEK_TIME,
            })),
            lifecycleSignal(538, 'seeking', SEEK_MS + 2, recordedCancellationState({
                readyState: 1,
                currentTime: 0,
                seeking: true,
            })),
            lifecycleSignal(539, 'waiting', SEEK_MS + 2.5, recordedCancellationState({
                readyState: 1,
                currentTime: 0,
                seeking: true,
            })),
            lifecycleSignal(540, 'progress', SEEK_MS + 2.6, recordedCancellationState({
                readyState: 1,
                currentTime: 0,
                seeking: true,
            })),
            lifecycleSignal(541, 'suspend', SEEK_MS + 2.7, recordedCancellationState({
                readyState: 1,
                currentTime: 0,
                seeking: true,
            })),
            lifecycleSignal(542, 'timeupdate', SEEK_MS + 3, recordedCancellationState({
                currentTime: 0,
                seeking: false,
            })),
            lifecycleSignal(543, 'seeked', SEEK_MS + 5, recordedCancellationState({ currentTime: 0 })),
            lifecycleSignal(544, 'canplay', SEEK_MS + 6, recordedCancellationState({ currentTime: 0 })),
            lifecycleSignal(545, 'playing', POST_PLAY_MS + 3, recordedCancellationState({ currentTime: 0 })),
            lifecycleSignal(546, 'timeupdate', POST_PLAY_MS + 80, recordedCancellationState({
                currentTime: CANCELLATION_CONFIRMATION_TIME,
            })),
        ];
        input.selected = {
            preSeek: { signalSequence: 537 },
            seeking: { signalSequence: 538 },
            seeked: { signalSequence: 543 },
            playing: { signalSequence: 545 },
            confirmation: { signalSequence: 546 },
        };
        return input;
    }

    function waitingOf(input: any): any {
        return input.lifecycleSignals.find((signal: any) => signal.kind === 'waiting');
    }

    function expectWaitingRejected(input: any, reason = 'selected.interference'): void {
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain(reason);
        expect(JSON.stringify(input)).toBe(before);
    }

    test('accepts the retained in-progress zero-seek waiting interval with readyState 1 then 4', () => {
        const input = inProgressWaitingInput();
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.lifecycle.preSeek.signalSequence).toBe(537);
        expect(result.evidence.lifecycle.seeking.signalSequence).toBe(538);
        expect(result.evidence.lifecycle.seeked.signalSequence).toBe(543);
        expect(result.evidence.lifecycle.playing.signalSequence).toBe(545);
        expect(result.evidence.lifecycle.confirmation.signalSequence).toBe(546);
        const retained = result.evidence.rawReferences.lifecycleSignals;
        expect(retained).toEqual(input.lifecycleSignals);
        const waiting = retained.find((signal: any) => signal.kind === 'waiting');
        expect(waiting.signalSequence).toBe(539);
        expect(waiting.observedAtMs).toBe(SEEK_MS + 2.5);
        expect(waiting.mediaState).toMatchObject({
            readyState: 1,
            currentTime: 0,
            seeking: true,
            duration: CANCELLATION_DURATION,
            mediaError: null,
            loop: true,
            controls: false,
            paused: false,
            ended: false,
            buffered: [[-0.002667, CANCELLATION_DURATION]],
            seekable: [[0, CANCELLATION_DURATION]],
        });
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects waiting before the uniquely selected seeking sample', () => {
        const input = inProgressWaitingInput();
        moveSignal(waitingOf(input), SEEK_MS);
        expectWaitingRejected(input);
    });

    test('rejects waiting at or after the uniquely selected seeked sample', () => {
        for (const offset of [0, 1, 2]) {
            const input = inProgressWaitingInput();
            moveSignal(waitingOf(input), SEEK_MS + 5 + offset);
            expectWaitingRejected(input);
        }
    });

    test('rejects waiting moved into the post-seek continuation', () => {
        const input = inProgressWaitingInput();
        const waiting = waitingOf(input);
        waiting.signalSequence = 547;
        moveSignal(waiting, POST_PLAY_MS + 10);
        expectWaitingRejected(input);
    });

    test('rejects waiting with a sequence outside the selected seeking/seeked bracket', () => {
        const input = inProgressWaitingInput();
        waitingOf(input).signalSequence = 547;
        expectWaitingRejected(input);
    });

    test('rejects waiting that keeps the selected asset but claims a competing identity', () => {
        const element = inProgressWaitingInput();
        waitingOf(element).elementId = 'qa-ambient-competing';
        expectWaitingRejected(element, 'lifecycle.competing-element');

        const epoch = inProgressWaitingInput();
        waitingOf(epoch).sourceEpoch = 2;
        expectWaitingRejected(epoch, 'lifecycle.competing-element');
    });

    test('rejects waiting that claims the selected object for a different source', () => {
        const input = inProgressWaitingInput();
        const waiting = waitingOf(input);
        waiting.url = AMBIENT_OTHER;
        waiting.controlledProvenance.element.source = AMBIENT_OTHER;
        waiting.controlledProvenance.provenance.attributes.src = AMBIENT_OTHER;
        expectWaitingRejected(input, 'lifecycle.source-reset');
    });

    test('rejects an advancing, non-seeking or differently ready waiting sample', () => {
        for (const overrides of [
            { currentTime: 0.1 },
            { seeking: false },
            { readyState: 0 },
            { readyState: 2 },
            { readyState: 3 },
            { readyState: 4 },
        ]) {
            const input = inProgressWaitingInput();
            Object.assign(waitingOf(input).mediaState, overrides);
            expectWaitingRejected(input);
        }
    });

    test('rejects waiting without an unchanged finite actual duration', () => {
        const missing = inProgressWaitingInput();
        delete waitingOf(missing).mediaState.duration;
        expectWaitingRejected(missing);

        for (const duration of [null, 0, -1, 29.999, 30.001, 31, Number.NaN, Number.POSITIVE_INFINITY, '30']) {
            const input = inProgressWaitingInput();
            waitingOf(input).mediaState.duration = duration;
            expectWaitingRejected(input);
        }
    });

    test('rejects waiting with incomplete state annotations', () => {
        const unavailable = inProgressWaitingInput();
        waitingOf(unavailable).mediaStateUnavailable = ['buffered'];
        expectWaitingRejected(unavailable, 'lifecycle.mediaStateUnavailable');

        const unreadable = inProgressWaitingInput();
        waitingOf(unreadable).mediaStateReadErrors = { buffered: 'read-threw' };
        expectWaitingRejected(unreadable, 'lifecycle.mediaStateReadErrors');
    });

    test('rejects waiting without full signed buffered and seekable coverage', () => {
        const cases: Array<[string, any]> = [
            ['buffered', []],
            ['buffered', [[0, 5]]],
            ['buffered', [[-0.002667, 10], [11, 30]]],
            ['buffered', [[10, 30], [0, 10]]],
            ['buffered', [[-0.002667]]],
            ['buffered', [['-0.002667', 30]]],
            ['buffered', [[-0.002667, Number.NaN]]],
            ['buffered', [[-0.002667, Number.POSITIVE_INFINITY]]],
            ['buffered', [[0.5, 30]]],
            ['buffered', [[10, 0]]],
            ['seekable', []],
            ['seekable', [[0, 29.999]]],
            ['seekable', [[0, 10], [10.5, 30]]],
            ['seekable', [[1, 30]]],
            ['seekable', [[0, 30, 31]]],
            ['seekable', [[0, Number.NaN]]],
        ];
        for (const [field, value] of cases) {
            const input = inProgressWaitingInput();
            waitingOf(input).mediaState[field] = value;
            expectWaitingRejected(input);
        }
    });

    test('rejects waiting with a media error or changed loop, control, pause and end state', () => {
        for (const overrides of [
            { mediaError: { code: 2, message: 'synthetic' } },
            { loop: false },
            { controls: true },
            { paused: true },
            { ended: true },
        ]) {
            const input = inProgressWaitingInput();
            Object.assign(waitingOf(input).mediaState, overrides);
            expectWaitingRejected(input);
        }
    });

    test('rejects a stalled zero-state sample masquerading as waiting', () => {
        const input = inProgressWaitingInput();
        waitingOf(input).kind = 'stalled';
        expectWaitingRejected(input);
    });
});

/*
 * Observed-resume start mode (explicit controlled-QA contract extension).
 *
 * A cancellation may be attributed from a fresh resume anchor at a positive
 * position when no fresh zero start exists. This is NOT an entirely observed
 * cycle, NOT uninterrupted sound, and it never substitutes kPlay for the
 * post-seek pipeline kPlaying or the DOM zero completion.
 */
const RESUME_MS = START_MS + 5000;
const RESUME_TIME = 28.496443;
const RESUME_DURATION = 30;
const RESUME_PRE_SEEK_TIME = 29.748984;
const RESUME_CONFIRMATION_TIME = 0.19293;
const RESUME_OLDER_MS = RESUME_MS - 3610;
const RESUME_OLDER_TIME = 24.886463;
const RESUME_PRE_SEEK_MS = RESUME_MS + (RESUME_PRE_SEEK_TIME - RESUME_TIME) * 1000;
const RESUME_ENDED_MS = RESUME_PRE_SEEK_MS + (RESUME_DURATION - RESUME_PRE_SEEK_TIME) * 1000;
const RESUME_SEEK_MS = RESUME_ENDED_MS + 2;
const RESUME_POST_PLAY_MS = RESUME_SEEK_MS + 30;
const RESUME_READINESS_MS = RESUME_POST_PLAY_MS + 3;
const RESUME_CONFIRMATION_MS = RESUME_POST_PLAY_MS + 100;
const RESUME_WINDOW_CLOSE = RESUME_CONFIRMATION_MS + 200;
const RESUME_NATIVE_PLAY_MS = RESUME_MS - 3;
const RESUME_PLAY_MS = RESUME_MS - 12;
const RESUME_PLAY_RESULT_MS = RESUME_MS - 11;
const RESUME_PAUSE_MS = RESUME_MS - 120;
const RESUME_SETTLE_SEEK_MS = RESUME_MS - 150;
const OBSERVED_RESUME_CLAIM = 'observed resume-to-end segment and reset; not an entirely observed cycle or uninterrupted sound';

function resumeMediaEvents(): any[] {
    return [
        makeEvent('kMediaLogCreated', CREATED_MS, { created: CREATED_UTC }),
        makeEvent('kLoad', CREATED_MS + 2, { url: AMBIENT }),
        // Historical native start from the older cycle. It is settled history
        // and lies outside the observed resume-to-end interval.
        pipelineState('kPlaying', START_MS),
        makeEvent('kPlay', RESUME_NATIVE_PLAY_MS),
        // Explained resume-side pipeline transition. It may accompany kPlay but
        // it is never the post-seek pipeline kPlaying anchor.
        pipelineState('kPlaying', RESUME_MS - 2),
        pipelineState('kEnded', RESUME_ENDED_MS),
        makeEvent('kSeek', RESUME_SEEK_MS, { seek_target: 0 }),
        pipelineState('kSeeking', RESUME_SEEK_MS + 0.06),
        pipelineState('kPlaying', RESUME_POST_PLAY_MS),
        makeEvent('kBufferingStateChanged', RESUME_SEEK_MS + 1, {
            audio_buffering_state: { state: 'BUFFERING_HAVE_ENOUGH' },
        }),
        makeEvent('kBufferingStateChanged', RESUME_POST_PLAY_MS - 20, {
            pipeline_buffering_state: {
                for_suspended_start: false,
                state: 'BUFFERING_HAVE_ENOUGH',
            },
        }),
        makeEvent('kBufferingStateChanged', RESUME_READINESS_MS, {
            pipeline_buffering_state: {
                for_suspended_start: false,
                state: 'BUFFERING_HAVE_ENOUGH',
            },
        }),
        makeEvent('kDecoderEOF', RESUME_ENDED_MS + 1),
    ];
}

function addMutationAt(
    input: any,
    name: string,
    epochMs: number,
    outcome = 'success',
    resultType = 'undefined',
): any {
    const events = input.provenance.snapshot.events.records;
    const sequence = events.length + 1;
    const targetType = ['play', 'pause', 'load', 'fastSeek'].includes(name) ? 'method' : 'setter';
    const attempt = {
        sequence,
        kind: 'mutation-attempt',
        at: at(epochMs),
        targetType,
        name,
        id: 'media:1',
        sourceEpoch: 1,
        argTypes: [],
        argumentCount: name === 'play' ? 0 : 1,
    };
    const result = {
        sequence: sequence + 1,
        kind: 'mutation-result',
        at: at(epochMs + 1),
        targetType,
        name,
        id: 'media:1',
        outcome,
        resultType,
        sourceEpoch: 1,
        sequenceOfAttempt: sequence,
    };
    events.push(attempt, result);
    input.provenance.snapshot.events.count = events.length;
    return { attempt, result };
}

function resumeInput(options: { orderedSameMsSetterBeforePlay?: boolean } = {}): any {
    const input = baseInput();
    input.lifecycleSignals = [
        lifecycleSignal(1, 'playing', RESUME_OLDER_MS, recordedCancellationState({
            currentTime: RESUME_OLDER_TIME,
        })),
        lifecycleSignal(2, 'playing', RESUME_MS, recordedCancellationState({
            currentTime: RESUME_TIME,
        })),
        lifecycleSignal(3, 'timeupdate', RESUME_PRE_SEEK_MS, recordedCancellationState({
            currentTime: RESUME_PRE_SEEK_TIME,
        })),
        lifecycleSignal(4, 'seeking', RESUME_SEEK_MS + 2, recordedCancellationState({
            readyState: 1,
            currentTime: 0,
            seeking: true,
        })),
        lifecycleSignal(5, 'seeked', RESUME_SEEK_MS + 5, recordedCancellationState({ currentTime: 0 })),
        lifecycleSignal(6, 'playing', RESUME_POST_PLAY_MS + 3, recordedCancellationState({
            currentTime: 0,
        })),
        lifecycleSignal(7, 'timeupdate', RESUME_POST_PLAY_MS + 80, recordedCancellationState({
            currentTime: RESUME_CONFIRMATION_TIME,
        })),
    ];
    input.selected = {
        preSeek: { signalSequence: 3 },
        seeking: { signalSequence: 4 },
        seeked: { signalSequence: 5 },
        playing: { signalSequence: 6 },
        confirmation: { signalSequence: 7 },
    };

    const events = mediaPlayerEvents(input);
    events.length = 0;
    events.push(...resumeMediaEvents());
    for (const record of input.media.records) {
        record.observedAtMs = RESUME_WINDOW_CLOSE - 10;
    }
    input.clockProjection.observationWindow.closedAtMs = RESUME_WINDOW_CLOSE;

    addMutationAt(input, 'currentTime', RESUME_SETTLE_SEEK_MS);
    addMutationAt(input, 'pause', RESUME_PAUSE_MS);
    if (options.orderedSameMsSetterBeforePlay) {
        addMutationAt(input, 'loop', RESUME_PLAY_MS);
    }
    addMutationAt(input, 'play', RESUME_PLAY_MS, 'success', 'object');
    linkResumeAnchor(input);
    return input;
}

// The DOM descriptor records the exact application play sequence/epoch at
// record time. The resume anchor must carry that link; timestamps alone are
// never used to guess which application play call the anchor belongs to.
function linkResumeAnchor(input: any): any {
    const pair = resumePlayPair(input);
    const anchor = resumeAnchor(input);
    anchor.controlledProvenance.provenance.continuity.lastPlaySequence = pair.attempt.sequence;
    anchor.controlledProvenance.provenance.continuity.lastPlayEpoch = pair.attempt.sourceEpoch;
    return pair;
}

function retimeResumeHistory(input: any, earliestMs: number): void {
    const records = input.provenance.snapshot.events.records;
    const priorAttempts = records.filter((event: any) => event.kind === 'mutation-attempt'
        && event.name !== 'play');
    let cursorMs = earliestMs - (priorAttempts.length * 10) - 10;
    for (const attempt of priorAttempts) {
        attempt.at = at(cursorMs);
        const result = records.find((event: any) => event.kind === 'mutation-result'
            && event.sequenceOfAttempt === attempt.sequence);
        if (result) result.at = at(cursorMs + 1);
        cursorMs += 10;
    }
}

function setResumeTiming(
    input: any,
    attemptMs: number,
    resultMs: number,
    nativeMs: number,
): any {
    const pair = resumePlayPair(input);
    pair.attempt.at = at(attemptMs);
    pair.result.at = at(resultMs);
    retimeResumeHistory(input, Math.min(attemptMs, resultMs));
    nativeKPlay(input).timestamp = mediaTimestamp(nativeMs);
    return pair;
}

function timingInput(attemptMs: number, resultMs: number, nativeMs: number): any {
    const input = resumeInput();
    setResumeTiming(input, attemptMs, resultMs, nativeMs);
    return input;
}

function resumeAnchor(input: any): any {
    return input.lifecycleSignals.find((signal: any) => signal.kind === 'playing'
        && signal.observedAtMs === RESUME_MS);
}

function resumePlayPair(input: any): any {
    const events = input.provenance.snapshot.events.records;
    const attempts = events.filter((event: any) => event.kind === 'mutation-attempt'
        && event.name === 'play');
    const attempt = attempts[attempts.length - 1];
    const result = events.find((event: any) => event.kind === 'mutation-result'
        && event.sequenceOfAttempt === attempt.sequence);
    return { attempt, result };
}

// Remove one attempt/result pair while preserving the producer's required
// continuous sequence stream (sequence === index + 1 and result references).
function removeMutationPair(input: any, pair: any): void {
    const records = input.provenance.snapshot.events.records;
    const retained = records.filter(
        (event: any) => event !== pair.attempt && event !== pair.result,
    );
    const remap = new Map<number, number>();
    retained.forEach((event: any, index: number) => remap.set(event.sequence, index + 1));
    for (const event of retained) {
        if (event.kind === 'mutation-result') {
            event.sequenceOfAttempt = remap.get(event.sequenceOfAttempt);
        }
        event.sequence = remap.get(event.sequence);
    }
    input.provenance.snapshot.events.records = retained;
    input.provenance.snapshot.events.count = retained.length;
}

function nativeKPlay(input: any): any {
    return mediaPlayerEvents(input).find((event: any) => JSON.parse(event.value).event === 'kPlay');
}

function nativePostSeekPlaying(input: any): any {
    return mediaPlayerEvents(input).find((event: any) => {
        const value = JSON.parse(event.value);
        return value.event === 'kPipelineStateChange'
            && value.pipeline_state === 'kPlaying'
            && Math.abs(event.timestamp - mediaTimestamp(RESUME_POST_PLAY_MS)) < 0.000001;
    });
}

function expectResumeRejected(input: any, reason?: string): void {
    const before = JSON.stringify(input);
    const result = verify(input);
    expect(result.ok).toBe(false);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    if (reason) expect(result.reasons).toContain(reason);
    expect(JSON.stringify(input)).toBe(before);
}

describe('verifyControlledNativeLoopCycle observed-resume start mode', () => {
    test('accepts the actual-shaped fresh resume at 28.496443 of 30 through end, reset and continued play', () => {
        const input = resumeInput();
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.startMode).toBe('observed-resume');
        expect(result.evidence.startClaim).toBe(OBSERVED_RESUME_CLAIM);
        expect(result.evidence.start).toMatchObject({
            mode: 'observed-resume',
            claim: OBSERVED_RESUME_CLAIM,
            anchor: {
                signalSequence: 2,
                observedAtMs: RESUME_MS,
                currentTime: RESUME_TIME,
                duration: RESUME_DURATION,
                readyState: 4,
                seeking: false,
                paused: false,
                ended: false,
            },
        });
        expect(result.evidence.lifecycle.start).toEqual({
            signalSequence: 2,
            observedAtMs: RESUME_MS,
        });
        expect(result.evidence.lifecycle.preSeek.signalSequence).toBe(3);
        expect(result.evidence.lifecycle.playing.signalSequence).toBe(6);
        expect(result.evidence.media.eventOrder).toEqual([
            'kPlay',
            'kPipelineStateChange',
            'kSeek',
            'kPipelineStateChange',
        ]);
        expect(result.evidence.start.playAttempt.sequence).toBe(9);
        expect(result.evidence.start.playResult).toMatchObject({
            sequence: 10,
            outcome: 'success',
            resultType: 'object',
            sequenceOfAttempt: 9,
        });
        expect(result.evidence.start.nativePlay).toMatchObject({
            timestamp: mediaTimestamp(RESUME_NATIVE_PLAY_MS),
        });
        expect(result.evidence.start.anchorDeltaMs).toBeCloseTo(3, 6);
        expect(result.evidence.clocks.startProjectedAtMs).toBeCloseTo(RESUME_NATIVE_PLAY_MS, 3);
        expect(result.evidence.media.seekReference.seekTarget).toBe(0);
        expect(result.evidence.media.postSeekPlayingReference.timestamp)
            .toBe(mediaTimestamp(RESUME_POST_PLAY_MS));
        expect(result.evidence.scope.observedResumeSegmentOnly).toBe(true);
        expect(result.evidence.scope.entirelyObservedCycle).toBe(false);
        expect(result.evidence.scope.uninterruptedSound).toBe(false);
        expect(JSON.stringify(input)).toBe(before);
        expect(JSON.stringify(verify(input))).toBe(JSON.stringify(result));
    });

    test('does not emit observed-resume claims for the retained zero-start mode', () => {
        const input = cancellationInput();
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.startMode).toBeUndefined();
        expect(result.evidence.startClaim).toBeUndefined();
        expect(result.evidence.start).toBeUndefined();
        expect(result.evidence.media.eventOrder).toEqual([
            'kPipelineStateChange',
            'kPipelineStateChange',
            'kSeek',
            'kPipelineStateChange',
        ]);
    });

    test('accepts the fresh resume after an older zero start separated by settled pause and seek activity', () => {
        const input = resumeInput();
        insertLifecycleSignal(input, 0, lifecycleSignal(
            1,
            'playing',
            RESUME_OLDER_MS - 1000,
            recordedCancellationState({ currentTime: 0 }),
        ));
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.startMode).toBe('observed-resume');
        expect(result.evidence.lifecycle.start.signalSequence).toBe(3);
        expect(result.evidence.lifecycle.start.observedAtMs).toBe(RESUME_MS);
    });

    test('rejects missing, failed, stale and ambiguous application play attempt/result pairs', () => {
        const missing = resumeInput();
        const missingEvents = missing.provenance.snapshot.events.records;
        const missingPair = resumePlayPair(missing);
        missing.provenance.snapshot.events.records = missingEvents.filter(
            (event: any) => event !== missingPair.attempt && event !== missingPair.result,
        );
        missing.provenance.snapshot.events.count = missing.provenance.snapshot.events.records.length;
        expectResumeRejected(missing);

        const threw = resumeInput();
        resumePlayPair(threw).result.outcome = 'threw';
        expectResumeRejected(threw, 'resume.play.result');

        const wrongResult = resumeInput();
        resumePlayPair(wrongResult).result.resultType = 'undefined';
        expectResumeRejected(wrongResult, 'resume.play.result');

        const stale = resumeInput();
        removeMutationPair(stale, resumePlayPair(stale));
        const stalePair = resumePlayPair(stale);
        stalePair.attempt.at = at(CREATED_MS + 15);
        stalePair.result.at = at(CREATED_MS + 16);
        const staleAnchor = resumeAnchor(stale).controlledProvenance.provenance.continuity;
        staleAnchor.lastPlaySequence = stalePair.attempt.sequence;
        staleAnchor.lastPlayEpoch = 1;
        expectResumeRejected(stale, 'resume.play.fresh');

        const ambiguous = resumeInput();
        addMutationAt(ambiguous, 'play', RESUME_PLAY_MS + 1, 'success', 'object');
        expectResumeRejected(ambiguous, 'resume.play.unique');

        const wrongEpoch = resumeInput();
        const epochPair = resumePlayPair(wrongEpoch);
        epochPair.attempt.sourceEpoch = 2;
        epochPair.result.sourceEpoch = 2;
        expectResumeRejected(wrongEpoch, 'resume.play.epoch');

        const wrongId = resumeInput();
        const idPair = resumePlayPair(wrongId);
        idPair.attempt.id = 'media:other';
        idPair.result.id = 'media:other';
        expectResumeRejected(wrongId, 'resume.link.attempt');
    });

    test('accepts a 91ms delayed DOM playing notification with the exact linked sequence and native 10.876ms before the app intent', () => {
        const input = resumeInput();
        const pair = resumePlayPair(input);
        const attemptMs = RESUME_MS - 91;
        setResumeTiming(input, attemptMs, attemptMs, attemptMs - 10.876);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.start.playAttempt).toMatchObject({
            sequence: pair.attempt.sequence,
            sourceEpoch: 1,
        });
        expect(result.evidence.start.playResult).toMatchObject({
            sequence: pair.result.sequence,
            sequenceOfAttempt: pair.attempt.sequence,
            outcome: 'success',
            resultType: 'object',
        });
        expect(result.evidence.start.notificationDelayMs).toBeCloseTo(91, 6);
        expect(result.evidence.start.nativeToAttemptMs).toBeCloseTo(-10.876, 3);
        expect(result.evidence.start.nativeToResultMs).toBeCloseTo(-10.876, 3);
        expect(result.evidence.start.anchorDeltaMs).toBeCloseTo(101.876, 3);
        expect(JSON.stringify(input)).toBe(before);
        expect(JSON.stringify(verify(input))).toBe(JSON.stringify(result));
    });

    test('accepts native kPlay exactly 20ms from the app attempt and rejects just outside while DOM delay varies', () => {
        for (const attemptLeadMs of [91, 240]) {
            const attemptMs = RESUME_MS - attemptLeadMs;
            const input = timingInput(attemptMs, attemptMs + 5, attemptMs + 20);
            const result = verify(input);
            expect(result.ok).toBe(true);
            expect(result.evidence.start.nativeToAttemptMs).toBeCloseTo(20, 6);
            expect(result.evidence.start.nativeToResultMs).toBeCloseTo(15, 6);
            expect(result.evidence.start.notificationDelayMs).toBeCloseTo(attemptLeadMs - 5, 6);
        }
        const attemptMs = RESUME_MS - 91;
        const outside = timingInput(attemptMs, attemptMs + 5, attemptMs + 20.001);
        expectResumeRejected(outside, 'media.cycle.resume.play.unique');
    });

    test('accepts native kPlay exactly 20ms from the recorded call result and rejects just outside while DOM delay varies', () => {
        for (const notificationDelayMs of [10, 91, 240]) {
            const resultMs = RESUME_MS - notificationDelayMs;
            const input = timingInput(resultMs - 5, resultMs, resultMs - 20);
            const result = verify(input);
            expect(result.ok).toBe(true);
            expect(result.evidence.start.nativeToResultMs).toBeCloseTo(-20, 6);
            expect(result.evidence.start.nativeToAttemptMs).toBeCloseTo(-15, 6);
            expect(result.evidence.start.notificationDelayMs).toBeCloseTo(notificationDelayMs, 6);
        }
        const resultMs = RESUME_MS - 91;
        const outside = timingInput(resultMs - 5, resultMs, resultMs - 20.001);
        expectResumeRejected(outside, 'media.cycle.resume.play.unique');
    });

    test('rejects missing, stale, wrong-sequence and wrong-epoch DOM continuity links without timestamp fallback', () => {
        const missing = resumeInput();
        delete resumeAnchor(missing).controlledProvenance.provenance.continuity;
        expectResumeRejected(missing, 'resume.link.continuity');

        const stale = resumeInput();
        resumeAnchor(stale).controlledProvenance.provenance.continuity.lastPlaySequence = 3;
        expectResumeRejected(stale, 'resume.play.settled');

        const wrongSequence = resumeInput();
        resumeAnchor(wrongSequence).controlledProvenance.provenance.continuity.lastPlaySequence = 999;
        expectResumeRejected(wrongSequence, 'resume.link.sequence');

        const wrongEpoch = resumeInput();
        resumeAnchor(wrongEpoch).controlledProvenance.provenance.continuity.lastPlayEpoch = 2;
        expectResumeRejected(wrongEpoch, 'resume.link.epoch');
    });

    test('rejects mutation, pause, seek, reset and error during a delayed notification interval', () => {
        const attemptMs = RESUME_MS - 91;
        const mutation = resumeInput();
        setResumeTiming(mutation, attemptMs, attemptMs, attemptMs - 10.876);
        addMutationAt(mutation, 'pause', attemptMs + 45);
        expectResumeRejected(mutation, 'resume.play.settled');

        for (const kind of ['pause', 'seeking', 'seeked', 'error']) {
            const input = resumeInput();
            setResumeTiming(input, attemptMs, attemptMs, attemptMs - 10.876);
            insertLifecycleSignal(input, 1, lifecycleSignal(
                2,
                kind,
                attemptMs + 45,
                recordedCancellationState({
                    currentTime: RESUME_TIME,
                    ...(kind === 'pause' ? { paused: true } : {}),
                    ...(kind === 'seeking' ? { seeking: true } : {}),
                }),
            ));
            expectResumeRejected(input, 'resume.play.settled');
        }

        const reset = resumeInput();
        setResumeTiming(reset, attemptMs, attemptMs, attemptMs - 10.876);
        const resetEvents = reset.provenance.snapshot.events.records;
        resetEvents.push({
            sequence: Math.max(...resetEvents.map((event: any) => event.sequence)) + 1,
            kind: 'source-epoch',
            at: at(attemptMs + 45),
            id: 'media:1',
            cause: 'load',
            previous: 1,
            sourceEpoch: 2,
            source: AMBIENT,
        });
        reset.provenance.snapshot.events.count = resetEvents.length;
        expectResumeRejected(reset, 'provenance.source-reset');
    });

    test('rejects a pause between the resume anchor and the end/reset confirmation', () => {
        const input = resumeInput();
        insertLifecycleSignal(input, 2, lifecycleSignal(
            3,
            'pause',
            RESUME_MS + 500,
            recordedCancellationState({ currentTime: RESUME_TIME + 0.5, paused: true }),
        ));
        expectResumeRejected(input, 'resume.after.settled');
    });

    test('rejects wrong identity, metadata, coverage and duration on a delayed-notification anchor', () => {
        const duration = resumeInput();
        setResumeTiming(duration, RESUME_MS - 91, RESUME_MS - 91, RESUME_MS - 101.876);
        resumeAnchor(duration).mediaState.duration = RESUME_DURATION + 0.001;
        resumeAnchor(duration).mediaState.buffered = [[0, RESUME_DURATION + 0.001]];
        resumeAnchor(duration).mediaState.seekable = [[0, RESUME_DURATION + 0.001]];
        expectResumeRejected(duration, 'selected.start.duration');

        const coverage = resumeInput();
        setResumeTiming(coverage, RESUME_MS - 91, RESUME_MS - 91, RESUME_MS - 101.876);
        resumeAnchor(coverage).mediaState.buffered = [[0, 5]];
        expectResumeRejected(coverage, 'selected.start.buffered');

        const identity = resumeInput();
        setResumeTiming(identity, RESUME_MS - 91, RESUME_MS - 91, RESUME_MS - 101.876);
        resumeAnchor(identity).controlledProvenance.element.id = 'media:other';
        expectResumeRejected(identity, 'lifecycle.controlledProvenance.identity');
    });

    test('rejects DOM playing before the recorded call return', () => {
        const input = resumeInput();
        resumePlayPair(input).result.at = at(RESUME_MS + 1);
        expectResumeRejected(input, 'resume.play.result');
    });

    test('accepts an ordered same-millisecond loop setter before play and rejects a later intervening mutation', () => {
        const ordered = resumeInput({ orderedSameMsSetterBeforePlay: true });
        const orderedLoopResult = ordered.provenance.snapshot.events.records.find(
            (event: any) => event.kind === 'mutation-result' && event.name === 'loop',
        );
        orderedLoopResult.at = at(RESUME_PLAY_MS);
        const orderedPair = resumePlayPair(ordered);
        expect(orderedPair.attempt.at.dateNow).toBe(RESUME_PLAY_MS);
        const result = verify(ordered);
        expect(result.ok).toBe(true);
        expect(result.evidence.start.playAttempt.sequence).toBe(orderedPair.attempt.sequence);
        expect(result.evidence.start.attemptLeadMs)
            .toBeCloseTo(RESUME_MS - RESUME_PLAY_MS, 6);

        const laterSameMs = resumeInput();
        resumePlayPair(laterSameMs).result.at = at(RESUME_PLAY_MS);
        addMutationAt(laterSameMs, 'loop', RESUME_PLAY_MS);
        expectResumeRejected(laterSameMs, 'resume.play.settled');

        const later = resumeInput();
        addMutationAt(later, 'loop', RESUME_MS - 5);
        expectResumeRejected(later, 'resume.play.settled');
    });

    test('rejects a well-formed continuous stream missing the fresh application play pair at the resume-specific guard', () => {
        const missing = resumeInput();
        // A later mutation keeps the removed play pair mid-stream, so the
        // helper must repair sequence continuity for the stream to remain
        // well formed before the resume guard is reached.
        addMutationAt(missing, 'loop', RESUME_MS - 5);
        removeMutationPair(missing, resumePlayPair(missing));
        const before = JSON.stringify(missing);
        const result = verify(missing);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('resume.link.attempt');
        expect(JSON.stringify(missing)).toBe(before);

        const noPlay = resumeInput();
        removeMutationPair(noPlay, resumePlayPair(noPlay));
        removeMutationPair(noPlay, resumePlayPair(noPlay));
        expectResumeRejected(noPlay, 'resume.link.sequence');
    });

    test('rejects a missing, outside-fence or ambiguous native kPlay anchor', () => {
        const missing = resumeInput();
        const events = mediaPlayerEvents(missing);
        const index = events.indexOf(nativeKPlay(missing));
        events.splice(index, 1);
        expectResumeRejected(missing, 'media.cycle.resume.play.unique');

        const delayed = resumeInput();
        nativeKPlay(delayed).timestamp = mediaTimestamp(RESUME_MS - 35);
        expectResumeRejected(delayed, 'media.cycle.resume.play.unique');

        const ambiguous = resumeInput();
        mediaPlayerEvents(ambiguous).push(makeEvent('kPlay', RESUME_MS - 4));
        expectResumeRejected(ambiguous, 'media.cycle.resume.play.unique');
    });

    test('rejects the native kPlay recorded for another player', () => {
        const input = resumeInput();
        const events = mediaPlayerEvents(input);
        const index = events.indexOf(nativeKPlay(input));
        const moved = events[index];
        events.splice(index, 1);
        appendMediaRecord(input, {
            event: 'Media.playerCreated',
            params: { player: { playerId: 'player-2' } },
        });
        appendMediaRecord(input, {
            event: 'Media.playerPropertiesChanged',
            params: { playerId: 'player-2', properties: [{ name: 'kFrameUrl', value: FRAME_URL }] },
        });
        appendMediaRecord(input, {
            event: 'Media.playerEventsAdded',
            params: { playerId: 'player-2', events: [moved] },
        });
        input.media.metadata.playersObserved = 2;
        input.media.summary.playersObserved = 2;
        expectResumeRejected(input, 'media.cycle.resume.play.unique');
    });

    test('rejects a resume anchor with the wrong object, source or lifecycle identity', () => {
        const source = resumeInput();
        const sourceAnchor = resumeAnchor(source);
        sourceAnchor.controlledProvenance.element.source = AMBIENT_OTHER;
        sourceAnchor.controlledProvenance.provenance.attributes.src = AMBIENT_OTHER;
        expectResumeRejected(source, 'lifecycle.controlledProvenance.identity');

        const epoch = resumeInput();
        resumeAnchor(epoch).sourceEpoch = 2;
        expectResumeRejected(epoch);

        const element = resumeInput();
        resumeAnchor(element).elementId = 'qa-ambient-foreign';
        expectResumeRejected(element, 'lifecycle.competing-element');
    });

    test('rejects resume anchor states other than readyState 4, unseeked, in-bounds and fully covered', () => {
        const ready = resumeInput();
        resumeAnchor(ready).mediaState.readyState = 3;
        expectResumeRejected(ready, 'selected.start.state');

        const seeking = resumeInput();
        resumeAnchor(seeking).mediaState.seeking = true;
        expectResumeRejected(seeking, 'selected.start.state');

        const paused = resumeInput();
        resumeAnchor(paused).mediaState.paused = true;
        expectResumeRejected(paused, 'selected.start.state');

        const ended = resumeInput();
        resumeAnchor(ended).mediaState.ended = true;
        expectResumeRejected(ended, 'selected.start.state');

        const loop = resumeInput();
        resumeAnchor(loop).mediaState.loop = false;
        expectResumeRejected(loop, 'selected.start.state');

        const controls = resumeInput();
        resumeAnchor(controls).mediaState.controls = true;
        expectResumeRejected(controls, 'selected.start.state');

        const error = resumeInput();
        resumeAnchor(error).mediaState.mediaError = { code: 2, message: 'synthetic' };
        expectResumeRejected(error);

        const zero = resumeInput();
        const zeroEvents = mediaPlayerEvents(zero);
        const resumePlayingIndex = zeroEvents.findIndex((event: any) => {
            const value = JSON.parse(event.value);
            return value.event === 'kPipelineStateChange'
                && value.pipeline_state === 'kPlaying'
                && Math.abs(event.timestamp - mediaTimestamp(RESUME_MS - 2)) < 0.000001;
        });
        zeroEvents.splice(resumePlayingIndex, 1);
        resumeAnchor(zero).mediaState.currentTime = 0;
        expectResumeRejected(zero);

        for (const currentTime of [RESUME_DURATION, RESUME_DURATION + 1, -1, Number.NaN]) {
            const input = resumeInput();
            resumeAnchor(input).mediaState.currentTime = currentTime;
            expectResumeRejected(input, 'selected.start.position');
        }

        for (const [field, value] of [
            ['buffered', []],
            ['buffered', [[0, 5]]],
            ['buffered', [[0, 10], [11, 30]]],
            ['seekable', []],
            ['seekable', [[0, 29.999]]],
            ['seekable', [[1, 30]]],
        ] as Array<[string, any]>) {
            const input = resumeInput();
            resumeAnchor(input).mediaState[field] = value;
            expectResumeRejected(input, `selected.start.${field}`);
        }
    });

    test('rejects a missing or changed duration and incomplete resume annotations', () => {
        const missing = resumeInput();
        delete resumeAnchor(missing).mediaState.duration;
        expectResumeRejected(missing);

        for (const duration of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, '30']) {
            const input = resumeInput();
            resumeAnchor(input).mediaState.duration = duration;
            expectResumeRejected(input);
        }

        const changed = resumeInput();
        changed.lifecycleSignals[2].mediaState.duration = RESUME_DURATION + 0.001;
        expectResumeRejected(changed, 'selected.start.duration');

        const unavailable = resumeInput();
        resumeAnchor(unavailable).mediaStateUnavailable = ['buffered'];
        expectResumeRejected(unavailable, 'lifecycle.mediaStateUnavailable');

        const unreadable = resumeInput();
        resumeAnchor(unreadable).mediaStateReadErrors = { buffered: 'read-threw' };
        expectResumeRejected(unreadable, 'lifecycle.mediaStateReadErrors');
    });

    test('rejects pause or seek transition between the play intent and the resume anchor', () => {
        const pause = resumeInput();
        insertLifecycleSignal(pause, 1, lifecycleSignal(
            2,
            'pause',
            RESUME_MS - 10,
            recordedCancellationState({
                currentTime: RESUME_TIME,
                paused: true,
            }),
        ));
        expectResumeRejected(pause, 'resume.play.settled');

        const seeking = resumeInput();
        insertLifecycleSignal(seeking, 1, lifecycleSignal(
            2,
            'seeking',
            RESUME_MS - 6,
            recordedCancellationState({
                currentTime: RESUME_TIME,
                seeking: true,
            }),
        ));
        expectResumeRejected(seeking, 'resume.play.settled');
    });

    test('rejects pause, play, seek, source, rate and control mutation after the resume anchor', () => {
        for (const name of ['pause', 'play', 'currentTime', 'src', 'playbackRate', 'controls']) {
            const input = resumeInput();
            addMutationAt(input, name, RESUME_MS + 100);
            expectResumeRejected(input, `provenance.interference.${name}`);
        }
    });

    test('rejects nonunique anchors and matches outside the retained 20ms fence', () => {
        const duplicate = resumeInput();
        const sequence = Math.max(...duplicate.lifecycleSignals.map((signal: any) => signal.signalSequence)) + 1;
        duplicate.lifecycleSignals.push(lifecycleSignal(
            sequence,
            'playing',
            RESUME_MS,
            recordedCancellationState({ currentTime: RESUME_TIME + 0.001 }),
        ));
        expectResumeRejected(duplicate, 'selected.start.unique');

        const delayedPlay = resumeInput();
        nativeKPlay(delayedPlay).timestamp = mediaTimestamp(RESUME_MS + 21);
        expectResumeRejected(delayedPlay, 'media.cycle.resume.play.unique');

        const delayedEnded = resumeInput();
        mediaPlayerEvents(delayedEnded)
            .find((event: any) => semanticMediaEvent(event) === 'kEnded')
            .timestamp = mediaTimestamp(RESUME_PRE_SEEK_MS - 21);
        expectResumeRejected(delayedEnded);
    });

    test('rejects a post-seek readiness marker displaced 21.406ms from DOM playing', () => {
        const input = resumeInput();
        const readiness = pipelineReadinessWithin(input, RESUME_READINESS_MS);
        expect(readiness).toHaveLength(1);
        readiness[0].timestamp = mediaTimestamp(RESUME_READINESS_MS + 21.406);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.readiness.unique');
    });

    test('rejects a missing native endpoint, missing post-seek playing, non-zero completion and failed continuation', () => {
        const missingEnded = resumeInput();
        const endedEvents = mediaPlayerEvents(missingEnded);
        const endedIndex = endedEvents.findIndex(
            (event: any) => semanticMediaEvent(event) === 'kEnded',
        );
        endedEvents.splice(endedIndex, 1);
        expectResumeRejected(missingEnded, 'media.cycle.ended');

        const missingPost = resumeInput();
        const postEvents = mediaPlayerEvents(missingPost);
        const postIndex = postEvents.indexOf(nativePostSeekPlaying(missingPost));
        postEvents.splice(postIndex, 1);
        expectResumeRejected(missingPost, 'media.cycle.playing.unique');

        const progressed = resumeInput();
        inputPlaying(progressed).mediaState.currentTime = 0.1;
        expectResumeRejected(progressed, 'selected.playing');

        const stalled = resumeInput();
        stalled.lifecycleSignals[6].mediaState.currentTime = 0;
        expectResumeRejected(stalled, 'selected.confirmation');

        const extraPlay = resumeInput();
        mediaPlayerEvents(extraPlay).push(makeEvent('kPlay', RESUME_MS + 100));
        expectResumeRejected(extraPlay, 'media.cycle.resume.play.ambiguous');
    });
});

/*
 * Post-seek stage correlation amendment.
 *
 * Pinned Chromium 146 marks the pipeline kPlaying shortly after the seek, while
 * the DOM `playing` completion follows the separate pipeline BUFFERING_HAVE_ENOUGH
 * readiness marker. The old 20ms pipeline-playing-to-DOM-playing cap therefore
 * compared distinct stages. These synthetic unit markers pin the corrected
 * same-stage readiness fence without widening any existing fence.
 */
const READINESS_FENCE_MS = 20;

function mediaNetworkOffsetMs(input: any): number {
    return input.clockProjection.requestWallTimeS * 1000
        - input.clockProjection.protocolTimestamps.request * 1000;
}

function addPipelineReadiness(input: any, epochMs: number): any {
    const event = makeEvent('kBufferingStateChanged', epochMs, {
        pipeline_buffering_state: {
            for_suspended_start: false,
            state: 'BUFFERING_HAVE_ENOUGH',
        },
    });
    mediaPlayerEvents(input).push(event);
    return event;
}

function pipelineReadinessWithin(input: any, epochMs: number, fenceMs = READINESS_FENCE_MS): any[] {
    const offsetMs = mediaNetworkOffsetMs(input);
    return mediaPlayerEvents(input).filter((event: any) => {
        const value = JSON.parse(event.value);
        if (value.event !== 'kBufferingStateChanged') return false;
        if (!Object.prototype.hasOwnProperty.call(value, 'pipeline_buffering_state')) return false;
        return Math.abs(event.timestamp * 1000 + offsetMs - epochMs) <= fenceMs;
    });
}

function delayedReadinessInput(delayMs: number): { input: any; marker: any; playingMs: number } {
    const input = baseInput();
    const playingMs = POST_PLAY_MS + delayMs;
    moveSignal(input.lifecycleSignals[4], playingMs);
    moveSignal(input.lifecycleSignals[5], playingMs + 100);
    const marker = addPipelineReadiness(input, playingMs + 0.3);
    const windowClose = playingMs + 300;
    for (const record of input.media.records) record.observedAtMs = windowClose - 10;
    input.clockProjection.observationWindow.closedAtMs = windowClose;
    return { input, marker, playingMs };
}

function moveReadinessToForeignPlayer(input: any, marker: any): void {
    const events = mediaPlayerEvents(input);
    events.splice(events.indexOf(marker), 1);
    appendMediaRecord(input, {
        event: 'Media.playerCreated',
        params: { player: { playerId: 'player-2' } },
    });
    appendMediaRecord(input, {
        event: 'Media.playerPropertiesChanged',
        params: { playerId: 'player-2', properties: [{ name: 'kFrameUrl', value: FRAME_URL }] },
    });
    appendMediaRecord(input, {
        event: 'Media.playerEventsAdded',
        params: { playerId: 'player-2', events: [marker] },
    });
    input.media.metadata.playersObserved = 2;
    input.media.summary.playersObserved = 2;
}

function resumeSidePipelinePlaying(input: any): any {
    return mediaPlayerEvents(input).find((event: any) => {
        const value = JSON.parse(event.value);
        return value.event === 'kPipelineStateChange'
            && value.pipeline_state === 'kPlaying'
            && Math.abs(event.timestamp - mediaTimestamp(RESUME_MS - 2)) < 0.000001;
    });
}

function delayedResumePipelineInput(delayMs: number): any {
    const input = resumeInput();
    resumeSidePipelinePlaying(input).timestamp = mediaTimestamp(RESUME_MS + delayMs);
    if (pipelineReadinessWithin(input, RESUME_POST_PLAY_MS + 3).length === 0) {
        addPipelineReadiness(input, RESUME_POST_PLAY_MS + 3);
    }
    return input;
}

describe('post-seek readiness stage correlation', () => {
    test('accepts delayed DOM playing matched to the unique pipeline HAVE_ENOUGH readiness marker', () => {
        const { input, marker, playingMs } = delayedReadinessInput(238);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.lifecycle.playing.observedAtMs).toBe(playingMs);
        // The retained post-seek pipeline reference remains the pipeline kPlaying,
        // not the much later DOM completion.
        expect(result.evidence.media.postSeekPlayingReference.timestamp)
            .toBe(mediaTimestamp(POST_PLAY_MS));
        expect(result.evidence.clocks.postSeekPlayingProjectedAtMs).toBeCloseTo(POST_PLAY_MS, 3);
        expect(result.evidence.media.eventOrder).toEqual([
            'kPipelineStateChange',
            'kPipelineStateChange',
            'kSeek',
            'kPipelineStateChange',
        ]);
        expect(result.evidence.rawReferences.mediaPlayerEvents.some((event: any) =>
            event.value.event === 'kBufferingStateChanged'
            && event.value.pipeline_buffering_state?.state === 'BUFFERING_HAVE_ENOUGH'
            && event.value.pipeline_buffering_state?.for_suspended_start === false
            && event.timestamp === marker.timestamp)).toBe(true);
        const markerRecord = input.media.records.find(
            (record: any) => record.params?.events?.includes(marker),
        );
        expect(result.evidence.media.readinessReference).toMatchObject({
            recordSequence: markerRecord.sequence,
            recordIndex: input.media.records.indexOf(markerRecord),
            eventIndex: markerRecord.params.events.indexOf(marker),
            timestamp: marker.timestamp,
            pipelineBufferingState: {
                state: 'BUFFERING_HAVE_ENOUGH',
                forSuspendedStart: false,
            },
        });
        expect(result.evidence.clocks.readinessProjectedAtMs).toBeCloseTo(playingMs + 0.3, 3);
        expect(result.evidence.clocks.readinessVsDomPlayingDeltaMs).toBeCloseTo(0.3, 3);
        expect(Math.abs(result.evidence.clocks.readinessVsDomPlayingDeltaMs))
            .toBeLessThanOrEqual(READINESS_FENCE_MS);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('accepts a native pipeline playing after kPlay but just before the app attempt', () => {
        const input = resumeInput();
        setResumeTiming(input, RESUME_MS - 50, RESUME_MS - 45, RESUME_MS - 60);
        resumeSidePipelinePlaying(input).timestamp = mediaTimestamp(RESUME_MS - 55);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(true);
        expect(result.evidence.startMode).toBe('observed-resume');
        expect(result.evidence.rawReferences.mediaPlayerEvents.some((event: any) =>
            event.value.event === 'kPipelineStateChange'
            && event.value.pipeline_state === 'kPlaying'
            && event.timestamp === mediaTimestamp(RESUME_MS - 55))).toBe(true);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects an extra pipeline playing after kEnded before the endpoint seek', () => {
        const input = resumeInput();
        const events = mediaPlayerEvents(input);
        events.splice(events.indexOf(resumeSidePipelinePlaying(input)), 1);
        events.push(makeEvent('kPipelineStateChange', RESUME_ENDED_MS + 0.5, {
            pipeline_state: 'kPlaying',
        }));
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.playing.ambiguous');
    });

    test('accepts one optional resume-side pipeline playing 41-49ms after the DOM resume', () => {
        for (const delayMs of [41, 49]) {
            const input = delayedResumePipelineInput(delayMs);
            const before = JSON.stringify(input);
            const result = verify(input);
            expect(result.ok).toBe(true);
            expect(result.evidence.startMode).toBe('observed-resume');
            expect(result.evidence.media.postSeekPlayingReference.timestamp)
                .toBe(mediaTimestamp(RESUME_POST_PLAY_MS));
            expect(result.evidence.media.eventOrder).toEqual([
                'kPlay',
                'kPipelineStateChange',
                'kSeek',
                'kPipelineStateChange',
            ]);
            expect(result.evidence.rawReferences.mediaPlayerEvents.some((event: any) =>
                event.value.event === 'kPipelineStateChange'
                && event.value.pipeline_state === 'kPlaying'
                && event.timestamp === mediaTimestamp(RESUME_MS + delayMs))).toBe(true);
            expect(JSON.stringify(input)).toBe(before);
        }
    });

    test('rejects a second optional resume-side pipeline playing after the matched intent', () => {
        const input = delayedResumePipelineInput(41);
        mediaPlayerEvents(input).push(makeEvent('kPipelineStateChange', RESUME_MS + 10, {
            pipeline_state: 'kPlaying',
        }));
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.resume.playing.ambiguous');
    });

    test('rejects missing, audio-only, wrong-player, wrong-state and suspended readiness markers', () => {
        const missing = delayedReadinessInput(238);
        const missingEvents = mediaPlayerEvents(missing.input);
        missingEvents.splice(missingEvents.indexOf(missing.marker), 1);
        expect(verify(missing.input).reasons).toContain('media.cycle.readiness.unique');

        const audioOnly = delayedReadinessInput(238);
        audioOnly.marker.value = JSON.stringify({
            event: 'kBufferingStateChanged',
            audio_buffering_state: { state: 'BUFFERING_HAVE_ENOUGH' },
        });
        expect(verify(audioOnly.input).reasons).toContain('media.cycle.readiness.unique');

        const wrongPlayer = delayedReadinessInput(238);
        moveReadinessToForeignPlayer(wrongPlayer.input, wrongPlayer.marker);
        expect(verify(wrongPlayer.input).reasons).toContain('media.cycle.readiness.unique');

        for (const pipelineBufferingState of [
            { for_suspended_start: false, state: 'BUFFERING_LOW_DATA' },
            { for_suspended_start: true, state: 'BUFFERING_HAVE_ENOUGH' },
            { state: 'BUFFERING_HAVE_ENOUGH' },
        ]) {
            const input = delayedReadinessInput(238);
            input.marker.value = JSON.stringify({
                event: 'kBufferingStateChanged',
                pipeline_buffering_state: pipelineBufferingState,
            });
            expect(verify(input.input).reasons).toContain('media.cycle.readiness.stage');
        }
    });

    test('rejects duplicate, preseek, out-of-order and later-cycle readiness markers', () => {
        const duplicate = delayedReadinessInput(238);
        addPipelineReadiness(duplicate.input, duplicate.playingMs + 0.4);
        expect(verify(duplicate.input).reasons).toContain('media.cycle.readiness.unique');

        const preseek = delayedReadinessInput(238);
        preseek.marker.timestamp = mediaTimestamp(SEEK_MS - 1);
        expect(verify(preseek.input).reasons).toContain('media.cycle.readiness.unique');

        const outOfOrder = delayedReadinessInput(238);
        const pipeline = mediaPlayerEvents(outOfOrder.input).find((event: any) => {
            const value = JSON.parse(event.value);
            return value.event === 'kPipelineStateChange'
                && value.pipeline_state === 'kPlaying'
                && Math.abs(event.timestamp - mediaTimestamp(POST_PLAY_MS)) < 0.000001;
        });
        pipeline.timestamp = mediaTimestamp(outOfOrder.playingMs + 1);
        expect(verify(outOfOrder.input).reasons).toContain('media.cycle.playing.order');

        const laterCycle = delayedReadinessInput(238);
        laterCycle.marker.timestamp = mediaTimestamp(laterCycle.playingMs + 1000);
        expect(verify(laterCycle.input).reasons).toContain('media.cycle.readiness.unique');
    });

    test('rejects competing native play, pause, seek, load, end, reset and error inside the readiness interval', () => {
        const cases: Array<[string, Record<string, unknown>, string]> = [
            ['kPlay', {}, 'media.cycle.resume.play.ambiguous'],
            ['kPause', {}, 'media.cycle.interference'],
            ['kSeek', { seek_target: 0 }, 'media.cycle.seek.ambiguous'],
            ['kLoad', { url: AMBIENT }, 'media.load.unique'],
            ['kEnded', {}, 'media.cycle.ended.ambiguous'],
            ['kError', {}, 'media.cycle.interference'],
        ];
        for (const [event, extra, reason] of cases) {
            const { input } = delayedReadinessInput(238);
            mediaPlayerEvents(input).push(makeEvent(event, POST_PLAY_MS + 100, extra));
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain(reason);
        }

        const reset = delayedReadinessInput(238);
        const records = reset.input.provenance.snapshot.events.records;
        records.push({
            sequence: records.length + 1,
            kind: 'source-epoch',
            at: at(POST_PLAY_MS + 100),
            id: 'media:1',
            cause: 'load',
            previous: 1,
            sourceEpoch: 2,
            source: AMBIENT,
        });
        reset.input.provenance.snapshot.events.count = records.length;
        expect(verify(reset.input).reasons).toContain('provenance.source-reset');
    });

    test('keeps the unchanged 20ms readiness fence and rejects 20.001ms', () => {
        for (const offsetMs of [READINESS_FENCE_MS, -READINESS_FENCE_MS]) {
            const { input, marker, playingMs } = delayedReadinessInput(238);
            marker.timestamp = mediaTimestamp(playingMs + offsetMs);
            expect(verify(input).ok).toBe(true);
        }
        for (const offsetMs of [20.001, -20.001]) {
            const { input, marker, playingMs } = delayedReadinessInput(238);
            marker.timestamp = mediaTimestamp(playingMs + offsetMs);
            const result = verify(input);
            expect(result.ok).toBe(false);
            expect(result.reasons).toContain('media.cycle.readiness.unique');
        }
    });
});

function inputPlaying(input: any): any {
    return input.lifecycleSignals.find((signal: any) => signal.signalSequence
        === input.selected.playing.signalSequence);
}

function setComparisonClock(signal: any, wallMs: number, performanceEpochMs: number): void {
    signal.observedAtMs = wallMs;
    signal.clock = {
        dateNow: wallMs,
        performanceNow: performanceEpochMs - TIME_ORIGIN,
        timeOrigin: TIME_ORIGIN,
    };
}

function insertLifecycleSignal(input: any, index: number, signal: any): void {
    for (const existing of input.lifecycleSignals) {
        if (existing.signalSequence >= signal.signalSequence) existing.signalSequence += 1;
    }
    for (const name of ['preSeek', 'seeking', 'seeked', 'playing', 'confirmation']) {
        if (input.selected[name].signalSequence >= signal.signalSequence) {
            input.selected[name].signalSequence += 1;
        }
    }
    input.lifecycleSignals.splice(index, 0, signal);
}

describe('clock-model comparison composition', () => {
    test('rejects resume intent/result whose raw wall agrees with native kPlay but performance projection is outside 20ms', () => {
        const input = resumeInput();
        const nativeMs = RESUME_MS - 30;
        const pair = resumePlayPair(input);
        pair.attempt.at = {
            dateNow: nativeMs + 15,
            performanceNow: (nativeMs + 25) - TIME_ORIGIN,
        };
        pair.result.at = {
            dateNow: nativeMs + 16,
            performanceNow: (nativeMs + 26) - TIME_ORIGIN,
        };
        nativeKPlay(input).timestamp = mediaTimestamp(nativeMs);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.resume.play.unique');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects post-seek readiness whose raw wall agrees with DOM playing but performance projection is outside 20ms', () => {
        const input = baseInput();
        setComparisonClock(input.lifecycleSignals[4], POST_PLAY_MS + 15, POST_PLAY_MS + 25);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('media.cycle.readiness.unique');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('assesses nonselected interference by performance interval even when raw wall is outside', () => {
        const input = baseInput();
        const interference = lifecycleSignal(
            3,
            'error',
            PRE_SEEK_MS - 5,
            lifecycleState({ currentTime: 9.95 }),
        );
        setComparisonClock(interference, PRE_SEEK_MS - 5, PRE_SEEK_MS + 15);
        insertLifecycleSignal(input, 2, interference);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('selected.interference');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects reversed performance chronology across the relevant lifecycle history', () => {
        const input = baseInput();
        const reversed = lifecycleSignal(
            3,
            'timeupdate',
            PRE_SEEK_MS + 5,
            lifecycleState({ currentTime: 9.95 }),
        );
        setComparisonClock(reversed, PRE_SEEK_MS + 5, PRE_SEEK_MS - 15);
        insertLifecycleSignal(input, 2, reversed);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.clock.chronology');
        expect(JSON.stringify(input)).toBe(before);
    });

    test('rejects reversed performance chronology across the complete provenance stream', () => {
        const input = baseInput();
        appendProvenanceHistory(input, CONFIRMATION_MS + 20000);
        appendProvenanceHistory(input, CONFIRMATION_MS + 19990);
        const before = JSON.stringify(input);
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('provenance.events.clock.chronology');
        expect(JSON.stringify(input)).toBe(before);
    });
});
