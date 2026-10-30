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
        controlledProvenance: selectedDescribe(),
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
                browser: 'Chromium 142.0.7444.175',
                electron: '40.0.0',
                revision: 'synthetic-revision',
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
    input.lifecycleSignals[0].observedAtMs = START_MS + 5;
    input.lifecycleSignals[1].observedAtMs = endedMs - 100;
    input.lifecycleSignals[2].observedAtMs = seekMs + 0.05;
    input.lifecycleSignals[3].observedAtMs = seekMs + 0.1;
    input.lifecycleSignals[4].observedAtMs = playingMs + 0.05;
    input.lifecycleSignals[5].observedAtMs = playingMs + 100;

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
        expect(result.evidence.clocks.mediaOffsetMs).toBeCloseTo(MEDIA_OFFSET_MS, 3);
        expect(result.evidence.clocks.networkOffsetMs).toBeCloseTo(MEDIA_OFFSET_MS, 3);
        expect(result.evidence.clocks.mediaOffsetDeltaMs).toBeCloseTo(0, 3);
        expect(result.evidence.clocks.mediaProjection).toBe('timestamp*1000+mediaOffsetMs');
        expect(result.evidence.clocks.startProjectedAtMs).toBeCloseTo(START_MS, 3);
        expect(result.evidence.clocks.logProjectedAtMs).toBeCloseTo(CREATED_MS, 3);
        expect(result.evidence.clocks.logProjectedAtMs).toBeLessThan(WINDOW_OPEN);
        expect(result.evidence.clocks.startProjectedAtMs).toBeGreaterThan(WINDOW_OPEN);
        expect(result.evidence.clocks.requestAnchorDeltaMs).toBeGreaterThan(29000);
        expect(result.evidence.media.logReference.created).toBe(CREATED_UTC);
        expect(result.evidence.rawReferences.mediaPlayerEvents[0].timestamp).toBeGreaterThan(600000);
        expect(JSON.stringify(input)).toBe(before);
        expect(JSON.stringify(verify(input))).toBe(JSON.stringify(result));
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
        input.lifecycleSignals[4].observedAtMs = READY_MS;
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
    });

    test('rejects the startup duration marker after readiness but before the selected start', () => {
        const input = startupAbsenceInput();
        input.lifecycleSignals[4].observedAtMs = READY_MS + 100;
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
    });

    test('rejects the startup duration marker moved into the selected proof interval', () => {
        const input = startupAbsenceInput();
        input.lifecycleSignals[4].observedAtMs = POST_PLAY_MS;
        const result = verify(input);
        expect(result.ok).toBe(false);
        expect(result.reasons).toContain('lifecycle.mediaStateUnavailable');
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
        input.lifecycleSignals[0].observedAtMs = input.lifecycleSignals[2].observedAtMs;
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
        input.lifecycleSignals[0].observedAtMs = WINDOW_OPEN - 100;
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

    test('rejects a UTC creation anchor conflicting with the Media monotonic offset', () => {
        const late = baseInput();
        const lateEvent = mediaPlayerEvents(late)
            .find((entry: any) => JSON.parse(entry.value).event === 'kMediaLogCreated');
        lateEvent.value = JSON.stringify({
            event: 'kMediaLogCreated',
            created: '2026-10-29 21:28:56.015365 UTC',
        });
        expectRejected(late);

        const early = baseInput();
        const earlyEvent = mediaPlayerEvents(early)
            .find((entry: any) => JSON.parse(entry.value).event === 'kMediaLogCreated');
        earlyEvent.value = JSON.stringify({
            event: 'kMediaLogCreated',
            created: '2026-10-29 21:28:55.815365 UTC',
        });
        expectRejected(early);
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
        input.lifecycleSignals[0].observedAtMs = early + 5;
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
});
