'use strict';

// Diagnostic-only native Chromium Media telemetry probe.
//
// This module is intentionally NOT an acceptance checker. It observes the raw
// CDP Media domain backlog, preserves every delivered value without rewriting
// protocol timestamps or strings, and reports explicit truncation/drop/error
// state. It never detaches the caller's shared CDPSession.
//
// The optional controlled renderer seek is a narrow diagnostic control path:
// it uses only playerCreated.domNodeId to resolve one candidate node, reads its
// media state, and (at the requested threshold) performs ONE renderer JS
// currentTime=0 assignment. That is explicitly not an OS/defaultMediaSession
// control proof, not a natural-wrap proof, and not a gap-free audio proof.

const MEDIA_EVENTS = Object.freeze([
    'Media.playerCreated',
    'Media.playerPropertiesChanged',
    'Media.playerEventsAdded',
    'Media.playerMessagesLogged',
    'Media.playerErrorsRaised',
]);

const RECORD_CAP = 4096;
const BYTE_CAP = 4 * 1024 * 1024;
const PLAYER_CAP = 128;
const ERROR_CAP = 64;
const ERROR_MESSAGE_CHARS = 400;
const FINISH_SETTLE_TIMEOUT_MS = 1000;
const MAX_RENDERER_CLOCK_ADVANCE_SECONDS = 0.1;
const SEEK_THRESHOLD_SECONDS = 0.35;
const DEFAULT_POLL_INTERVAL_MS = 200;
const MAX_POLL_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 120000;
const AMBIENT_PATH = /^\/assets\/ambient_(?:warroom|field|archive)-[A-Za-z0-9_-]+\.ogg$/;
const SEEK_EPSILON_SECONDS = 1e-9;

const INSPECT_FUNCTION = `function awwvNativeMediaOriginProbeInspect() {
    const element = this;
    return {
        url: typeof element.currentSrc === 'string' && element.currentSrc.length > 0
            ? element.currentSrc
            : (typeof element.src === 'string' ? element.src : null),
        currentTime: element.currentTime,
        duration: element.duration,
        loop: element.loop,
        paused: element.paused,
        seeking: element.seeking,
        readyState: element.readyState,
        controls: element.controls
    };
}`;

const SEEK_FUNCTION = `function awwvNativeMediaOriginProbeSeek(expectedUrl, expectedOrigin, expectedState) {
    const element = this;
    const notApplied = (reason) => ({
        applied: false,
        reason: String(reason),
        currentTime: element.currentTime,
        seeking: element.seeking
    });

    const currentUrl = typeof element.currentSrc === 'string' && element.currentSrc.length > 0
        ? element.currentSrc
        : (typeof element.src === 'string' ? element.src : null);
    if (typeof expectedUrl !== 'string' || expectedUrl.length === 0) return notApplied('missing-expected-url');
    if (currentUrl !== expectedUrl) return notApplied('url-changed');
    if (typeof expectedOrigin !== 'string' || expectedOrigin.length === 0) return notApplied('missing-expected-origin');

    let parsedUrl;
    try {
        parsedUrl = new URL(currentUrl);
    } catch (error) {
        return notApplied('url-unparseable');
    }
    if (parsedUrl.origin !== expectedOrigin) return notApplied('origin-changed');

    if (!expectedState || typeof expectedState !== 'object') return notApplied('missing-expected-state');
    if (expectedState.loop !== true
        || expectedState.controls !== false
        || expectedState.paused !== false
        || expectedState.seeking !== false
        || expectedState.readyState !== 4) {
        return notApplied('expected-state-unqualified');
    }
    if (element.loop !== true) return notApplied('loop-changed');
    if (element.controls !== false) return notApplied('controls-changed');
    if (element.paused !== false) return notApplied('paused-changed');
    if (element.seeking !== false) return notApplied('seeking-changed');
    if (element.readyState !== 4) return notApplied('ready-state-changed');

    const currentTime = element.currentTime;
    const duration = element.duration;
    if (typeof currentTime !== 'number' || !Number.isFinite(currentTime) || currentTime <= 0) {
        return notApplied('invalid-current-time');
    }
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
        return notApplied('invalid-duration');
    }
    if (currentTime >= duration) return notApplied('outside-playable-window');
    if (typeof expectedState.currentTime !== 'number' || !Number.isFinite(expectedState.currentTime)) {
        return notApplied('invalid-expected-current-time');
    }
    if (typeof expectedState.duration !== 'number' || !Number.isFinite(expectedState.duration)) {
        return notApplied('invalid-expected-duration');
    }
    if (Math.abs(duration - expectedState.duration) > 1e-6) return notApplied('duration-changed');
    if (currentTime < expectedState.currentTime - 1e-9) return notApplied('clock-moved-backwards-or-wrapped');
    if (currentTime - expectedState.currentTime > ${MAX_RENDERER_CLOCK_ADVANCE_SECONDS}) return notApplied('clock-jumped');

    const remainingSeconds = duration - currentTime;
    if (!(remainingSeconds > 0) || remainingSeconds > ${SEEK_THRESHOLD_SECONDS} + 1e-9) {
        return notApplied('remaining-outside-threshold');
    }

    element.currentTime = 0;
    return { applied: true, currentTime: element.currentTime, seeking: element.seeking };
}`;

function cloneRaw(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function errorRecord(error, phase, context) {
    const record = {
        phase,
        nodeObservedAtMs: context?.nodeObservedAtMs ?? null,
        error: {
            name: typeof error?.name === 'string' ? error.name : 'Error',
            message: typeof error?.message === 'string' ? error.message : String(error),
        },
    };
    if (error?.code !== undefined) record.error.code = error.code;
    if (context?.playerId !== undefined) record.playerId = context.playerId;
    if (context?.domNodeId !== undefined) record.domNodeId = context.domNodeId;
    if (context?.atSequence !== undefined) record.atSequence = context.atSequence;
    if (context?.exceptionDetails !== undefined) record.exceptionDetails = cloneRaw(context.exceptionDetails);
    return record;
}

function exceptionMessage(details) {
    if (typeof details?.text === 'string' && details.text.length > 0) return details.text;
    if (typeof details?.exception?.description === 'string' && details.exception.description.length > 0) {
        return details.exception.description;
    }
    return 'CDP exception without message';
}

function validateExpectedOrigin(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
        throw new Error('controlled renderer seek requires an exact expectedOrigin string');
    }
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error('controlled renderer seek expectedOrigin must be a valid URL origin');
    }
    if (parsed.origin !== value) {
        throw new Error('controlled renderer seek expectedOrigin must be an exact origin without path, query or fragment');
    }
    if (parsed.protocol !== 'http:') {
        throw new Error('controlled renderer seek expectedOrigin must use http:');
    }
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        throw new Error('controlled renderer seek expectedOrigin must be localhost or 127.0.0.1');
    }
    if (parsed.username !== '' || parsed.password !== '') {
        throw new Error('controlled renderer seek expectedOrigin must not contain userinfo');
    }
    return parsed.origin;
}

function resolveOptions(options) {
    if (options === undefined || options === null) options = {};
    if (typeof options !== 'object' || Array.isArray(options)) {
        throw new Error('native media origin probe options must be an object');
    }
    const controlled = options.controlledRendererSeek === true;
    if (options.controlledRendererSeek !== undefined && typeof options.controlledRendererSeek !== 'boolean') {
        throw new Error('controlledRendererSeek must be a boolean');
    }
    let expectedOrigin = null;
    if (controlled) expectedOrigin = validateExpectedOrigin(options.expectedOrigin);

    const pollIntervalMs = options.pollIntervalMs === undefined ? DEFAULT_POLL_INTERVAL_MS : options.pollIntervalMs;
    if (typeof pollIntervalMs !== 'number' || !Number.isFinite(pollIntervalMs)
        || pollIntervalMs <= 0 || pollIntervalMs > MAX_POLL_INTERVAL_MS) {
        throw new Error(`pollIntervalMs must be a finite number in (0, ${MAX_POLL_INTERVAL_MS}]`);
    }
    const timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : options.timeoutMs;
    if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs)
        || timeoutMs <= 0 || timeoutMs > DEFAULT_TIMEOUT_MS) {
        throw new Error(`timeoutMs must be a finite number in (0, ${DEFAULT_TIMEOUT_MS}]`);
    }
    return { controlled, expectedOrigin, pollIntervalMs, timeoutMs };
}

function parseAmbientUrl(value, expectedOrigin) {
    if (typeof value !== 'string' || value.length === 0) return null;
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== 'http:') return null;
    if (url.origin !== expectedOrigin) return null;
    if (url.username !== '' || url.password !== '') return null;
    if (url.search !== '' || url.hash !== '') return null;
    if (!AMBIENT_PATH.test(url.pathname)) return null;
    return {
        url: value,
        origin: url.origin,
        pathname: url.pathname,
    };
}

function isQualifiedCandidate(state, expectedOrigin) {
    if (!isPlainObject(state)) return false;
    for (const field of ['loop', 'paused', 'seeking', 'controls']) {
        if (typeof state[field] !== 'boolean') return false;
    }
    for (const field of ['currentTime', 'duration', 'readyState']) {
        if (typeof state[field] !== 'number' || !Number.isFinite(state[field])) return false;
    }
    if (state.loop !== true) return false;
    if (state.paused !== false) return false;
    if (state.seeking !== false) return false;
    if (state.controls !== false) return false;
    if (state.readyState !== 4) return false;
    if (!(state.duration > 0)) return false;
    if (!(state.currentTime > 0)) return false;
    if (!(state.currentTime < state.duration)) return false;
    return parseAmbientUrl(state.url, expectedOrigin) !== null;
}

function startMediaOriginProbe(session, options) {
    if (!session || typeof session.send !== 'function' || typeof session.on !== 'function') {
        throw new Error('native media origin probe requires an existing CDP session with send/on');
    }
    const offMethod = typeof session.off === 'function'
        ? 'off'
        : (typeof session.removeListener === 'function' ? 'removeListener' : null);
    if (!offMethod) {
        throw new Error('native media origin probe requires session.off or session.removeListener for owned listener cleanup');
    }

    const resolved = resolveOptions(options);
    const now = Date.now;
    const startedAtMs = now();
    const deadlineAtMs = startedAtMs + resolved.timeoutMs;

    const records = [];
    const errors = [];
    const ownedObjectIds = new Set();
    const players = new Map();
    const installed = [];
    const dropReasons = { records: 0, bytes: 0, other: 0 };

    let sequence = 0;
    let storedBytes = 0;
    let dropped = 0;
    let truncated = false;
    let finished = false;
    let finishPromise = null;
    let timer = null;
    let pollActive = null;
    let enableSettled = false;
    let enableSucceeded = false;
    let disableCalled = false;
    let playersDropped = 0;
    let playersTruncated = false;
    let playerRevision = 0;
    let errorsDropped = 0;
    let errorsTruncated = false;

    const setup = {
        state: 'enabling',
        enable: { attempted: true, succeeded: false, settled: false },
        domain: 'Media',
        subscriptions: [...MEDIA_EVENTS],
    };

    const control = resolved.controlled
        ? {
            requested: true,
            mode: 'controlled-renderer-js-seek',
            status: 'pending',
            reason: 'awaiting-media-enable',
            expectedOrigin: resolved.expectedOrigin,
            thresholdSeconds: SEEK_THRESHOLD_SECONDS,
            pollIntervalMs: resolved.pollIntervalMs,
            timeoutMs: resolved.timeoutMs,
            scopeStatement: 'Controlled renderer JS currentTime seek only. NOT an OS/defaultMediaSession control proof and does NOT prove natural wrapping or gap-free audio.',
            player: null,
            candidate: null,
            intent: null,
            invocation: null,
        }
        : {
            requested: false,
            mode: null,
            status: 'disabled',
            reason: 'option-not-requested',
            expectedOrigin: null,
            thresholdSeconds: null,
            pollIntervalMs: null,
            timeoutMs: null,
            scopeStatement: 'Passive Chromium Media telemetry capture only; no renderer or DOM control was requested.',
            player: null,
            candidate: null,
            intent: null,
            invocation: null,
        };

    function recordError(phase, error, context = {}) {
        if (errors.length >= ERROR_CAP) {
            errorsDropped += 1;
            errorsTruncated = true;
            return;
        }
        const record = errorRecord(error, phase, {
            nodeObservedAtMs: now(),
            atSequence: sequence > 0 ? sequence : null,
            ...context,
        });
        if (record.error.message.length > ERROR_MESSAGE_CHARS) {
            record.error.message = record.error.message.slice(0, ERROR_MESSAGE_CHARS);
            record.error.messageTruncated = true;
        }
        errors.push(record);
    }

    function markDropped(reason) {
        dropped += 1;
        truncated = true;
        dropReasons[reason] += 1;
    }

    function notePlayerCreated(params) {
        const player = params?.player;
        if (!player || typeof player.playerId !== 'string' || player.playerId.length === 0) {
            recordError('player-created', new Error('Media.playerCreated lacked a usable playerId'));
            return;
        }
        const domNodeId = Number.isSafeInteger(player.domNodeId) && player.domNodeId > 0
            ? player.domNodeId
            : null;
        const existing = players.get(player.playerId);
        if (!existing) {
            if (players.size >= PLAYER_CAP) {
                playersDropped += 1;
                playersTruncated = true;
                playerRevision += 1;
                return;
            }
            players.set(player.playerId, {
                playerId: player.playerId,
                domNodeId,
                conflictingDomNodeId: false,
            });
            playerRevision += 1;
            return;
        }
        if (existing.domNodeId !== domNodeId) {
            existing.conflictingDomNodeId = true;
            playerRevision += 1;
        }
    }

    function recordEvent(eventName, params) {
        if (finished) return;
        sequence += 1;
        const observedAtMs = now();

        if (eventName === 'Media.playerCreated') notePlayerCreated(params);

        if (records.length >= RECORD_CAP) {
            markDropped('records');
            return;
        }

        let record;
        try {
            record = {
                sequence,
                event: eventName,
                observedAtMs,
                params: cloneRaw(params),
            };
        } catch (error) {
            markDropped('other');
            recordError('event-record', error);
            return;
        }

        let bytes;
        try {
            bytes = Buffer.byteLength(JSON.stringify(record), 'utf8');
        } catch (error) {
            markDropped('other');
            recordError('event-record', error);
            return;
        }
        if (storedBytes + bytes > BYTE_CAP) {
            markDropped('bytes');
            return;
        }

        records.push(record);
        storedBytes += bytes;
    }

    for (const eventName of MEDIA_EVENTS) {
        const listener = (params) => recordEvent(eventName, params);
        try {
            session.on(eventName, listener);
        } catch (error) {
            for (const [installedEvent, installedListener] of installed) {
                try {
                    session[offMethod](installedEvent, installedListener);
                } catch {
                    // A failed subscription is already the primary error.
                }
            }
            throw error;
        }
        installed.push([eventName, listener]);
    }

    // Media.enable starts synchronously after every listener is installed. Its
    // backlog is therefore delivered to this probe rather than lost.
    const enablePromise = (async () => {
        try {
            await session.send('Media.enable');
            enableSucceeded = true;
            setup.enable.succeeded = true;
            setup.state = 'ready';
            if (resolved.controlled && control.status === 'pending') {
                control.reason = 'awaiting-player-telemetry';
                scheduleNextPoll();
            }
        } catch (error) {
            setup.state = 'failed';
            recordError('media-enable', error);
            if (resolved.controlled && control.status === 'pending') {
                finalizeControl('failed', 'media-enable-failed');
            }
        } finally {
            enableSettled = true;
            setup.enable.settled = true;
        }
    })();

    function stopControlPolling() {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function finalizeControl(status, reason) {
        if (!resolved.controlled) return;
        control.status = status;
        control.reason = reason ?? null;
        stopControlPolling();
    }

    function latestBrowserClock(playerId) {
        for (let index = records.length - 1; index >= 0; index -= 1) {
            const record = records[index];
            if (record.event !== 'Media.playerEventsAdded') continue;
            if (record.params?.playerId !== playerId) continue;
            const events = Array.isArray(record.params.events) ? record.params.events : [];
            for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
                const timestamp = events[eventIndex]?.timestamp;
                if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
                    return {
                        source: 'Media.playerEventsAdded.timestamp',
                        sequence: record.sequence,
                        timestamp,
                    };
                }
            }
        }
        return null;
    }

    async function releaseOwnedObject(objectId) {
        ownedObjectIds.delete(objectId);
        try {
            await session.send('Runtime.releaseObject', { objectId });
        } catch (error) {
            recordError('runtime-release', error);
        }
    }

    function scheduleNextPoll() {
        if (finished || !resolved.controlled || control.status !== 'pending' || timer !== null) return;
        const remainingMs = deadlineAtMs - now();
        const delayMs = Math.max(0, Math.min(resolved.pollIntervalMs, remainingMs));
        timer = setTimeout(() => {
            timer = null;
            runPoll();
        }, delayMs);
    }

    function runPoll() {
        if (finished || !resolved.controlled || control.status !== 'pending') return;
        pollActive = (async () => {
            try {
                await pollOnce();
            } catch (error) {
                recordError('poll', error);
                finalizeControl('unavailable', 'poll-error');
            } finally {
                pollActive = null;
                if (!finished && control.status === 'pending') {
                    if (now() >= deadlineAtMs) {
                        finalizeControl(
                            'unavailable',
                            players.size === 0 ? 'no-playerCreated-telemetry' : 'no-qualified-candidate-before-timeout',
                        );
                    } else {
                        scheduleNextPoll();
                    }
                }
            }
        })();
    }

    async function pollOnce() {
        if (now() > deadlineAtMs) {
            finalizeControl('unavailable', players.size === 0 ? 'no-playerCreated-telemetry' : 'timeout');
            return;
        }
        if (truncated || playersTruncated || errorsTruncated) {
            const reasons = [];
            if (truncated) reasons.push('record-evidence-truncated');
            if (playersTruncated) reasons.push('player-metadata-truncated');
            if (errorsTruncated) reasons.push('error-metadata-truncated');
            finalizeControl('incomplete', reasons.join(';'));
            return;
        }
        const inventoryRevision = playerRevision;
        const knownPlayers = [...players.values()];
        if (knownPlayers.length === 0) return;

        const inspectable = knownPlayers.filter((player) => player.domNodeId !== null);
        if (inspectable.length === 0) {
            finalizeControl('unsupported', 'playerCreated.domNodeId absent; no broad object scan performed');
            return;
        }
        if (inspectable.length !== knownPlayers.length) {
            finalizeControl('ambiguous', 'playerCreated.domNodeId missing for some observed players');
            return;
        }
        if (knownPlayers.some((player) => player.conflictingDomNodeId)) {
            finalizeControl('ambiguous', 'conflicting playerCreated.domNodeId for the same playerId');
            return;
        }

        const resolvedObjects = [];
        const inspected = [];
        let inspectionError = false;

        try {
            for (const player of inspectable) {
                let objectId = null;
                try {
                    const response = await session.send('DOM.resolveNode', { backendNodeId: player.domNodeId });
                    objectId = response?.object?.objectId;
                    if (typeof objectId === 'string' && objectId.length > 0) {
                        ownedObjectIds.add(objectId);
                        resolvedObjects.push(objectId);
                    }
                    if (finished) return;
                    if (typeof objectId !== 'string' || objectId.length === 0) {
                        inspectionError = true;
                        recordError('dom-resolve', new Error('DOM.resolveNode returned no objectId'), {
                            playerId: player.playerId,
                            domNodeId: player.domNodeId,
                        });
                        continue;
                    }

                    const inspection = await session.send('Runtime.callFunctionOn', {
                        objectId,
                        functionDeclaration: INSPECT_FUNCTION,
                        returnByValue: true,
                        awaitPromise: false,
                    });
                    if (finished) return;
                    if (inspection?.exceptionDetails) {
                        inspectionError = true;
                        recordError('runtime-inspect', new Error(exceptionMessage(inspection.exceptionDetails)), {
                            playerId: player.playerId,
                            domNodeId: player.domNodeId,
                            exceptionDetails: inspection.exceptionDetails,
                        });
                        continue;
                    }
                    const state = inspection?.result?.value;
                    if (!isPlainObject(state)) {
                        inspectionError = true;
                        recordError('runtime-inspect', new Error('Runtime.callFunctionOn returned no media state object'), {
                            playerId: player.playerId,
                            domNodeId: player.domNodeId,
                        });
                        continue;
                    }
                    inspected.push({
                        playerId: player.playerId,
                        domNodeId: player.domNodeId,
                        objectId,
                        state,
                    });
                } catch (error) {
                    inspectionError = true;
                    recordError(objectId ? 'runtime-inspect' : 'dom-resolve', error, {
                        playerId: player.playerId,
                        domNodeId: player.domNodeId,
                    });
                }
            }

            if (inspectionError) {
                finalizeControl('unavailable', 'candidate-inspection-error');
                return;
            }

            const qualified = inspected.filter((entry) => isQualifiedCandidate(entry.state, resolved.expectedOrigin));
            if (qualified.length > 1) {
                finalizeControl('ambiguous', 'multiple-qualified-ambient-players');
                return;
            }
            if (qualified.length === 0) return;

            if (playerRevision !== inventoryRevision) {
                finalizeControl('ambiguous', 'player-inventory-changed-before-invocation');
                return;
            }
            if (truncated || playersTruncated || errorsTruncated) {
                finalizeControl('incomplete', 'evidence-truncated-before-invocation');
                return;
            }

            const selected = qualified[0];
            control.player = { playerId: selected.playerId, domNodeId: selected.domNodeId };
            control.candidate = cloneRaw({
                playerId: selected.playerId,
                domNodeId: selected.domNodeId,
                ...selected.state,
            });

            const remainingSeconds = selected.state.duration - selected.state.currentTime;
            if (remainingSeconds > SEEK_THRESHOLD_SECONDS + SEEK_EPSILON_SECONDS) return;
            if (remainingSeconds <= 0) return;

            await performControlledSeek(selected, remainingSeconds);
        } finally {
            for (const objectId of resolvedObjects) {
                await releaseOwnedObject(objectId);
            }
        }
    }

    async function performControlledSeek(selected, remainingSeconds) {
        if (control.status !== 'pending') return;
        const intentAtMs = now();
        control.intent = {
            nodeObservedAtMs: intentAtMs,
            action: 'set-currentTime-zero-once',
            thresholdSeconds: SEEK_THRESHOLD_SECONDS,
            remainingSeconds,
            browserClock: latestBrowserClock(selected.playerId),
        };

        // Record the attempt before the protocol call can mutate the renderer.
        // A finish that races this call must never claim that no control
        // happened.
        const invocation = {
            nodeObservedAtMs: intentAtMs,
            completedNodeObservedAtMs: null,
            uncertainAtNodeObservedAtMs: null,
            outcome: 'pending',
            result: null,
            error: null,
            exceptionDetails: null,
        };
        control.invocation = invocation;
        control.status = 'seek-pending';
        control.reason = null;

        const expectedState = cloneRaw({
            currentTime: selected.state.currentTime,
            duration: selected.state.duration,
            loop: selected.state.loop,
            paused: selected.state.paused,
            seeking: selected.state.seeking,
            readyState: selected.state.readyState,
            controls: selected.state.controls,
        });

        try {
            const response = await session.send('Runtime.callFunctionOn', {
                objectId: selected.objectId,
                functionDeclaration: SEEK_FUNCTION,
                returnByValue: true,
                awaitPromise: false,
                arguments: [
                    { value: selected.state.url },
                    { value: resolved.expectedOrigin },
                    { value: expectedState },
                ],
            });
            // Deliberately do not return early when finish started: a response
            // for an already-dispatched assignment must be retained.
            if (response?.exceptionDetails) {
                invocation.exceptionDetails = cloneRaw(response.exceptionDetails);
                invocation.error = exceptionMessage(response.exceptionDetails);
                invocation.outcome = 'exception';
                control.status = 'attempted';
                control.reason = null;
                recordError('runtime-seek', new Error(invocation.error), {
                    playerId: selected.playerId,
                    domNodeId: selected.domNodeId,
                    exceptionDetails: response.exceptionDetails,
                });
            } else {
                const result = cloneRaw(response?.result?.value ?? null);
                invocation.result = result;
                if (result && result.applied === true) {
                    invocation.outcome = 'applied';
                    control.status = 'attempted';
                    control.reason = null;
                } else if (result && result.applied === false) {
                    invocation.outcome = 'not-applied';
                    control.status = 'not-applied';
                    control.reason = typeof result.reason === 'string'
                        ? result.reason
                        : 'renderer-revalidation-rejected';
                } else {
                    invocation.outcome = 'unknown';
                    control.status = 'attempted-uncertain';
                    control.reason = 'unrecognized-renderer-result';
                }
            }
        } catch (error) {
            invocation.error = typeof error?.message === 'string' ? error.message : String(error);
            invocation.outcome = 'exception';
            control.status = 'attempted';
            control.reason = null;
            recordError('runtime-seek', error, {
                playerId: selected.playerId,
                domNodeId: selected.domNodeId,
            });
        } finally {
            invocation.completedNodeObservedAtMs = now();
        }

        if (control.status === 'seek-pending') {
            invocation.outcome = 'uncertain';
            invocation.uncertainAtNodeObservedAtMs = now();
            control.status = 'attempted-uncertain';
            control.reason = 'protocol-response-uncertain';
        }
        stopControlPolling();
    }

    function snapshot() {
        const evidenceIncomplete = truncated || playersTruncated || errorsTruncated;
        const controlIncomplete = resolved.controlled
            && control.status !== 'attempted'
            && control.status !== 'not-applied'
            && control.status !== 'disabled';
        return cloneRaw({
            schema: 'awwv.native-media-origin-probe.v1',
            diagnosticOnly: true,
            failClosedDiagnostic: true,
            admission: 'none',
            status: finished
                ? ((errors.length > 0 || evidenceIncomplete || controlIncomplete)
                    ? 'diagnostic-incomplete'
                    : 'diagnostic-complete')
                : 'diagnostic-collecting',
            passive: !resolved.controlled,
            setup: {
                state: setup.state,
                enable: { ...setup.enable },
                domain: setup.domain,
                subscriptions: [...setup.subscriptions],
            },
            caps: {
                records: RECORD_CAP,
                bytes: BYTE_CAP,
                players: PLAYER_CAP,
                errors: ERROR_CAP,
                errorMessageChars: ERROR_MESSAGE_CHARS,
            },
            metadata: {
                playersObserved: players.size,
                playersDropped,
                playersTruncated,
                errorsRecorded: errors.length,
                errorsDropped,
                errorsTruncated,
            },
            summary: {
                delivered: sequence,
                recorded: records.length,
                dropped,
                truncated,
                evidenceTruncated: evidenceIncomplete,
                storedBytes,
                playersObserved: players.size,
            },
            overflow: {
                records: dropReasons.records > 0,
                bytes: dropReasons.bytes > 0,
                other: dropReasons.other > 0,
                players: playersTruncated,
                errors: errorsTruncated,
                dropReasons: { ...dropReasons },
            },
            errors: cloneRaw(errors),
            records: cloneRaw(records),
            control: cloneRaw(control),
        });
    }

    function finish() {
        if (finishPromise) return finishPromise;
        finishPromise = (async () => {
            finished = true;
            stopControlPolling();
            if (pollActive) {
                let settleTimer = null;
                await Promise.race([
                    pollActive.catch(() => undefined),
                    new Promise((resolve) => {
                        settleTimer = setTimeout(resolve, FINISH_SETTLE_TIMEOUT_MS);
                    }),
                ]);
                if (settleTimer !== null) {
                    clearTimeout(settleTimer);
                    settleTimer = null;
                }
            }

            for (const [eventName, listener] of installed) {
                try {
                    session[offMethod](eventName, listener);
                } catch (error) {
                    recordError('remove-listener', error);
                }
            }
            installed.length = 0;

            try {
                await enablePromise;
            } catch {
                // enablePromise records its own failure.
            }

            for (const objectId of [...ownedObjectIds]) {
                await releaseOwnedObject(objectId);
            }

            if (resolved.controlled) {
                if (control.status === 'pending') {
                    finalizeControl('unavailable', 'finished-before-control');
                } else if (control.status === 'seek-pending') {
                    if (control.invocation) {
                        control.invocation.outcome = 'uncertain';
                        control.invocation.uncertainAtNodeObservedAtMs = now();
                    }
                    control.status = 'attempted-uncertain';
                    control.reason = 'protocol-response-uncertain';
                    stopControlPolling();
                }
            }

            if (enableSucceeded && !disableCalled) {
                disableCalled = true;
                try {
                    await session.send('Media.disable');
                } catch (error) {
                    recordError('media-disable', error);
                }
            }

            return snapshot();
        })();
        return finishPromise;
    }

    return { snapshot, finish };
}

module.exports = { startMediaOriginProbe };
