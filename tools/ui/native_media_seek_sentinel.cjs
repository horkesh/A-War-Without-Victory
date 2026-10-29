'use strict';

// Diagnostic-only pre-navigation MediaSession seek sentinel.
//
// The exported function is deliberately self-contained so it can be serialized
// with Function.prototype.toString and installed as a browser init script. It
// must not close over Node imports or module-level values.
//
// This module does not integrate with the existing QA observer, does not prove
// natural-loop origin, OS/defaultMediaSession routing, playback quality, or
// acceptance. Installing it deliberately alters diagnostic action-handler
// behavior and must never be described as normal production coverage.

function installMediaSessionSeekSentinel(priorApi) {
    const KEY = '__AWWV_NATIVE_MEDIA_SEEK_SENTINEL__';
    const TRUST_KEY = '__AWWV_NATIVE_MEDIA_SEEK_SENTINEL_TRUSTED_APIS__';
    const SCHEMA = 'awwv.native-media-seek-sentinel.v1';
    const MARKER = 'awwv-native-media-seek-sentinel-api-v1';
    const ACTIONS = ['seekto', 'seekforward', 'seekbackward'];
    const AMBIENT_PATH = /^\/assets\/ambient_(?:warroom|field|archive)-[A-Za-z0-9_-]+\.ogg$/;
    const EVENT_CAP = 128;
    const REGISTRY_CAP = 16;
    const RANGE_CAP = 64;
    const LABEL = 'ALTERED DIAGNOSTIC CONTROL: MediaSession action callbacks are observed-only sentinels; this is not production coverage, OS/defaultMediaSession proof, natural-loop proof, or audio-quality qualification.';

    if (typeof window === 'undefined' || !window || typeof window !== 'object') {
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'missing-window' };
    }

    function clock() {
        let dateNow = null;
        let performanceNow = null;
        try {
            const value = Date.now();
            if (Number.isFinite(value)) dateNow = value;
        } catch {}
        try {
            if (window.performance && typeof window.performance.now === 'function') {
                const value = window.performance.now();
                if (Number.isFinite(value)) performanceNow = value;
            }
        } catch {}
        return { dateNow, performanceNow };
    }

    const events = [];
    const invalidReasons = new Set();
    const entries = [];
    const entriesById = new Map();
    const ids = new WeakMap();
    let eventSequence = 0;
    let eventsDropped = 0;
    let eventsTruncated = false;
    let installStatus = 'not-installed';
    let installationClocks = null;
    let readyStateAtInstall = null;
    let realmValid = false;
    let originValid = false;
    let origin = null;
    let mediaSession = null;
    let originalSetActionHandler = null;
    let setActionHandlerWrapper = null;
    let setActionDescriptorOwner = null;
    let originalSetActionDescriptor = null;
    let mediaPrototype = null;
    let originalPlay = null;
    let playWrapper = null;
    let playInstalledDescriptor = null;
    let setActionInstalledDescriptor = null;
    let installedActions = [];
    let registrationFailures = [];
    let rollbackRecords = [];
    let idCounter = 0;
    let api = null;

    function appendEvent(kind, details) {
        eventSequence += 1;
        if (events.length >= EVENT_CAP) {
            eventsDropped += 1;
            eventsTruncated = true;
            if (!invalidReasons.has('event-overflow')) invalidReasons.add('event-overflow');
            return null;
        }
        const record = {
            sequence: eventSequence,
            kind,
            at: clock(),
            ...(details && typeof details === 'object' ? details : {}),
        };
        events.push(record);
        return record;
    }

    function markInvalid(reason, detail) {
        if (invalidReasons.has(reason)) return;
        invalidReasons.add(reason);
        appendEvent('invalidation', {
            reason,
            detail: detail === undefined ? null : detail,
        });
    }

    function copyJson(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return null;
        }
    }

    function safeRead(errors, key, read, fallback = null) {
        try {
            return read();
        } catch (error) {
            errors[key] = String(error && error.message ? error.message : error).slice(0, 200);
            return fallback;
        }
    }

    function readRanges(name, value, errors) {
        if (value === null || value === undefined) return null;
        const length = safeRead(errors, `${name}.length`, () => value.length, null);
        if (typeof length !== 'number' || !Number.isFinite(length) || !Number.isInteger(length) || length < 0) {
            if (!errors[`${name}.length`]) errors[`${name}.length`] = 'invalid-length';
            return null;
        }
        if (length > RANGE_CAP) {
            errors[`${name}.length`] = 'over-cap';
            return null;
        }
        const ranges = [];
        let invalid = false;
        let previousEnd = null;
        for (let index = 0; index < length; index += 1) {
            const start = safeRead(errors, `${name}.start[${index}]`, () => value.start(index), null);
            const end = safeRead(errors, `${name}.end[${index}]`, () => value.end(index), null);
            if (start === null || end === null) {
                invalid = true;
                continue;
            }
            if (!Number.isFinite(start) || !Number.isFinite(end)) {
                errors[`${name}.range[${index}]`] = 'nonfinite-endpoint';
                invalid = true;
                continue;
            }
            if (start > end) {
                errors[`${name}.range[${index}]`] = 'reversed-range';
                invalid = true;
                continue;
            }
            if (previousEnd !== null && start < previousEnd) {
                errors[`${name}.range[${index}]`] = 'overlap-or-out-of-order';
                invalid = true;
            }
            if (!invalid) previousEnd = end;
            ranges.push([start, end]);
        }
        return invalid ? null : { length, truncated: false, ranges };
    }

    function readSource(element) {
        const errors = {};
        let source = safeRead(errors, 'source.currentSrc', () => element.currentSrc, null);
        if (typeof source !== 'string' || source.length === 0) {
            source = safeRead(errors, 'source.src', () => element.src, null);
        }
        return {
            source: typeof source === 'string' && source.length > 0 ? source : null,
            errors,
        };
    }

    function readMediaState(element) {
        const errors = {};
        const errorValue = safeRead(errors, 'error', () => element.error, null);
        let errorState = null;
        if (errorValue) {
            errorState = {
                code: safeRead(errors, 'error.code', () => errorValue.code, null),
                message: safeRead(errors, 'error.message', () => errorValue.message, null),
            };
        }
        return {
            state: {
                loop: safeRead(errors, 'loop', () => element.loop, null),
                controls: safeRead(errors, 'controls', () => element.controls, null),
                currentTime: safeRead(errors, 'currentTime', () => element.currentTime, null),
                duration: safeRead(errors, 'duration', () => element.duration, null),
                paused: safeRead(errors, 'paused', () => element.paused, null),
                seeking: safeRead(errors, 'seeking', () => element.seeking, null),
                readyState: safeRead(errors, 'readyState', () => element.readyState, null),
                error: errorState,
                played: (() => {
                    const value = safeRead(errors, 'played', () => element.played, null);
                    return readRanges('played', value, errors);
                })(),
                buffered: (() => {
                    const value = safeRead(errors, 'buffered', () => element.buffered, null);
                    return readRanges('buffered', value, errors);
                })(),
            },
            errors,
        };
    }

    function isAmbientSource(source) {
        if (typeof source !== 'string' || source.length === 0) return false;
        let url;
        try {
            url = new URL(source, window.location && window.location.href ? window.location.href : undefined);
        } catch {
            return false;
        }
        if (url.origin !== origin) return false;
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        if (url.username !== '' || url.password !== '') return false;
        if (url.search !== '' || url.hash !== '') return false;
        return AMBIENT_PATH.test(url.pathname);
    }

    function readEntry(entry, updateEpoch) {
        let element = null;
        try {
            element = entry.ref && typeof entry.ref.deref === 'function' ? entry.ref.deref() : null;
        } catch {
            element = null;
        }
        if (!element) {
            return {
                id: entry.id,
                sourceEpoch: entry.sourceEpoch,
                alive: false,
                source: entry.lastSource,
                sourceIsAmbient: false,
                state: null,
                readErrors: {},
            };
        }

        const sourceInfo = readSource(element);
        if (updateEpoch && sourceInfo.source && sourceInfo.source !== entry.lastSource) {
            entry.sourceEpoch += 1;
            entry.lastSource = sourceInfo.source;
            appendEvent('source-change', {
                id: entry.id,
                sourceEpoch: entry.sourceEpoch,
                source: sourceInfo.source,
            });
        }
        const stateInfo = readMediaState(element);
        const readErrors = { ...sourceInfo.errors, ...stateInfo.errors };
        if (Object.keys(readErrors).length > 0) {
            markInvalid('state-read-failure', { id: entry.id, fields: Object.keys(readErrors) });
        }
        return {
            id: entry.id,
            sourceEpoch: entry.sourceEpoch,
            alive: true,
            source: sourceInfo.source || entry.lastSource,
            sourceIsAmbient: isAmbientSource(sourceInfo.source || entry.lastSource),
            state: stateInfo.state,
            readErrors,
        };
    }

    function registerAmbient(element) {
        if (!(element instanceof window.HTMLMediaElement)) {
            markInvalid('non-realm-play-receiver');
            return null;
        }
        const sourceInfo = readSource(element);
        if (Object.keys(sourceInfo.errors).length > 0) {
            markInvalid('state-read-failure', { fields: Object.keys(sourceInfo.errors) });
            return null;
        }
        if (!isAmbientSource(sourceInfo.source)) return null;

        const existingId = ids.get(element);
        if (existingId) {
            const existing = entriesById.get(existingId);
            if (existing) {
                if (sourceInfo.source !== existing.lastSource) {
                    existing.sourceEpoch += 1;
                    existing.lastSource = sourceInfo.source;
                    appendEvent('source-change', {
                        id: existing.id,
                        sourceEpoch: existing.sourceEpoch,
                        source: sourceInfo.source,
                    });
                }
                return existing;
            }
        }

        if (entries.length >= REGISTRY_CAP) {
            markInvalid('registry-overflow', { cap: REGISTRY_CAP });
            appendEvent('registry-overflow', { cap: REGISTRY_CAP });
            return null;
        }

        let reference;
        try {
            reference = new WeakRef(element);
        } catch {
            markInvalid('weakref-unavailable');
            return null;
        }
        const entry = {
            id: `ambient-${++idCounter}`,
            ref: reference,
            sourceEpoch: 0,
            lastSource: null,
            registeredAt: clock(),
        };
        ids.set(element, entry.id);
        entries.push(entry);
        entriesById.set(entry.id, entry);
        if (sourceInfo.source !== entry.lastSource) {
            entry.sourceEpoch += 1;
            entry.lastSource = sourceInfo.source;
        }
        appendEvent('register', {
            id: entry.id,
            source: sourceInfo.source,
            sourceEpoch: entry.sourceEpoch,
        });
        return entry;
    }

    function computeValid() {
        return installStatus === 'installed' && invalidReasons.size === 0 && !eventsTruncated;
    }

    function descriptorMatches(actual, expected) {
        if (!actual || !expected) return false;
        if (Object.prototype.hasOwnProperty.call(expected, 'value')) {
            if (!Object.prototype.hasOwnProperty.call(actual, 'value') || actual.value !== expected.value) return false;
        } else if (Object.prototype.hasOwnProperty.call(actual, 'value')
            || actual.get !== expected.get
            || actual.set !== expected.set) {
            return false;
        }
        return actual.writable === expected.writable
            && actual.configurable === expected.configurable
            && actual.enumerable === expected.enumerable;
    }

    function audit() {
        if (installStatus !== 'installed') return;
        try {
            if (!window.HTMLMediaElement || window.HTMLMediaElement.prototype.play !== playWrapper) {
                markInvalid('play-replaced');
            } else {
                const descriptor = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, 'play');
                if (!descriptorMatches(descriptor, playInstalledDescriptor)) {
                    markInvalid('play-descriptor-tampered');
                }
            }

            if (!mediaSession || mediaSession.setActionHandler !== setActionHandlerWrapper) {
                markInvalid('setActionHandler-replaced');
            } else {
                const own = Object.getOwnPropertyDescriptor(mediaSession, 'setActionHandler');
                if (!descriptorMatches(own, setActionInstalledDescriptor)) {
                    markInvalid('setActionHandler-descriptor-tampered');
                }
            }
            if (setActionDescriptorOwner === 'prototype') {
                const prototype = mediaSession && Object.getPrototypeOf(mediaSession);
                const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'setActionHandler');
                if (!descriptorMatches(descriptor, originalSetActionDescriptor)) {
                    markInvalid('setActionHandler-prototype-changed');
                }
            }

            if (window[KEY] !== api) markInvalid('global-replaced');
            const globalDescriptor = Object.getOwnPropertyDescriptor(window, KEY);
            if (!globalDescriptor
                || globalDescriptor.value !== api
                || globalDescriptor.writable !== false
                || globalDescriptor.configurable !== false) {
                markInvalid('global-descriptor-tampered');
            }
            if (!Object.isFrozen(api)) markInvalid('api-unfrozen');
        } catch {
            markInvalid('audit-error');
        }
    }

    function snapshot() {
        audit();
        const liveEntries = entries.map((entry) => readEntry(entry, true));
        const counts = new Map();
        for (const entry of liveEntries) {
            if (!entry.source) continue;
            counts.set(entry.source, (counts.get(entry.source) || 0) + 1);
        }
        const duplicateSources = [...counts.entries()]
            .filter(([, count]) => count > 1)
            .map(([source]) => source);
        const registryEntries = liveEntries.map((entry) => ({
            ...entry,
            duplicateSource: Boolean(entry.source && (counts.get(entry.source) || 0) > 1),
        }));
        let currentReadyState = null;
        try {
            currentReadyState = window.document ? window.document.readyState : null;
        } catch {}
        return {
            schema: SCHEMA,
            diagnosticOnly: true,
            naturalOriginAdmitted: false,
            valid: computeValid(),
            label: LABEL,
            coverage: {
                mediaSessionActions: ACTIONS.slice(),
                exactRegistryOnly: true,
                osControl: false,
                defaultMediaSession: false,
                naturalLoopOrigin: false,
                audioQuality: false,
                sourceEpochSemantics: 'observed-source-url-changes-only',
                sameUrlReloadProvenance: false,
            },
            install: {
                status: installStatus,
                installedAt: installationClocks ? { ...installationClocks } : null,
                readyStateAtInstall,
                readyState: currentReadyState,
                realmValid,
                originValid,
                origin,
                installedActions: installedActions.slice(),
                registrationFailures: copyJson(registrationFailures) || [],
                rollback: copyJson(rollbackRecords) || [],
                playWrapped: Boolean(mediaPrototype && mediaPrototype.play === playWrapper),
                setActionHandlerWrapped: Boolean(mediaSession && mediaSession.setActionHandler === setActionHandlerWrapper),
                apiFrozen: Object.isFrozen(api),
            },
            invalidReasons: [...invalidReasons],
            events: {
                capacity: EVENT_CAP,
                count: events.length,
                truncated: eventsTruncated,
                dropped: eventsDropped,
                records: copyJson(events) || [],
            },
            registry: {
                capacity: REGISTRY_CAP,
                count: entries.length,
                duplicateSources,
                entries: copyJson(registryEntries) || [],
            },
        };
    }

    function resolve(id, expected) {
        audit();
        if (!computeValid()) return { ok: false, reason: 'diagnostic-invalid' };
        if (!expected || typeof expected !== 'object') return { ok: false, reason: 'invalid-expected' };
        if (!Number.isInteger(expected.sourceEpoch) || expected.sourceEpoch <= 0) {
            return { ok: false, reason: 'invalid-expected' };
        }
        if (typeof expected.url !== 'string' || expected.url.length === 0) {
            return { ok: false, reason: 'invalid-expected' };
        }
        if (typeof id !== 'string' || id.length === 0) return { ok: false, reason: 'unknown-id' };
        const entry = entriesById.get(id);
        if (!entry) return { ok: false, reason: 'unknown-id' };

        const live = readEntry(entry, true);
        if (!computeValid()) return { ok: false, reason: 'diagnostic-invalid' };
        if (!live.alive) return { ok: false, reason: 'dead' };
        if (expected.sourceEpoch !== live.sourceEpoch) {
            return { ok: false, reason: 'source-epoch-mismatch' };
        }
        if (expected.url !== live.source) {
            return { ok: false, reason: 'source-mismatch' };
        }
        if (!live.source || !isAmbientSource(live.source)) {
            return { ok: false, reason: 'nonambient-source' };
        }

        const element = entry.ref && typeof entry.ref.deref === 'function' ? entry.ref.deref() : null;
        if (element && Object.prototype.hasOwnProperty.call(element, 'play')) {
            return { ok: false, reason: 'element-play-shadow' };
        }
        if (!element || ids.get(element) !== id) return { ok: false, reason: 'identity-mismatch' };
        return {
            ok: true,
            id,
            sourceEpoch: live.sourceEpoch,
            source: live.source,
            element,
        };
    }

    let trustRegistry = null;
    try {
        trustRegistry = window[TRUST_KEY];
    } catch {}
    if (!trustRegistry || typeof trustRegistry.has !== 'function' || typeof trustRegistry.add !== 'function') {
        try {
            trustRegistry = new WeakSet();
            Object.defineProperty(window, TRUST_KEY, {
                value: trustRegistry,
                writable: false,
                configurable: false,
                enumerable: false,
            });
        } catch {
            trustRegistry = null;
        }
    }

    let existing;
    try {
        existing = window[KEY];
    } catch {
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'global-access-failed' };
    }
    if (existing !== undefined) {
        let trustedPrior = false;
        try {
            trustedPrior = Boolean(priorApi)
                && priorApi === existing
                && trustRegistry
                && trustRegistry.has(priorApi);
        } catch {
            trustedPrior = false;
        }
        if (trustedPrior) {
            let diagnosticValid = false;
            try {
                diagnosticValid = existing.snapshot().valid === true;
            } catch {}
            return { installed: true, idempotent: true, diagnosticValid, reason: null, api: existing };
        }
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'foreign-global' };
    }

    api = {
        schema: SCHEMA,
        snapshot,
        resolve,
    };
    Object.defineProperty(api, '__marker', { value: MARKER, enumerable: false });
    Object.freeze(api);

    installStatus = 'blocked';
    installationClocks = clock();
    readyStateAtInstall = (() => {
        try {
            return window.document ? window.document.readyState : null;
        } catch {
            return null;
        }
    })();
    try {
        realmValid = window.window === window
            && window.document
            && window.document.defaultView === window
            && window.document === window.document
            && window.navigator !== undefined;
    } catch {
        realmValid = false;
    }
    try {
        origin = window.location && typeof window.location.origin === 'string'
            ? window.location.origin
            : null;
        if (origin) {
            const parsed = new URL(origin);
            originValid = (parsed.protocol === 'http:' || parsed.protocol === 'https:')
                && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1');
        }
    } catch {
        originValid = false;
    }

    try {
        Object.defineProperty(window, KEY, {
            value: api,
            writable: false,
            configurable: false,
            enumerable: false,
        });
    } catch {
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'api-expose-failed' };
    }

    if (!realmValid) {
        markInvalid('wrong-realm');
        installStatus = 'blocked';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'wrong-realm' };
    }
    if (!originValid) {
        markInvalid('wrong-origin');
        installStatus = 'blocked';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'wrong-origin' };
    }

    if (readyStateAtInstall !== 'loading') {
        markInvalid('late-installation', { readyState: readyStateAtInstall });
    }

    const navigatorObject = window.navigator;
    mediaSession = navigatorObject ? navigatorObject.mediaSession : null;
    if (!mediaSession || typeof mediaSession.setActionHandler !== 'function') {
        markInvalid('unsupported-media-session');
        installStatus = 'unsupported';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-media-session' };
    }

    mediaPrototype = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
    const playDescriptor = mediaPrototype && Object.getOwnPropertyDescriptor(mediaPrototype, 'play');
    if (!mediaPrototype || !playDescriptor || typeof playDescriptor.value !== 'function') {
        markInvalid('unsupported-media-element-play');
        installStatus = 'unsupported';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-media-element-play' };
    }
    originalPlay = playDescriptor.value;

    if (typeof WeakRef !== 'function') {
        markInvalid('unsupported-weakref');
        installStatus = 'unsupported';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-weakref' };
    }
    if (typeof WeakMap !== 'function') {
        markInvalid('unsupported-weakmap');
        installStatus = 'unsupported';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-weakmap' };
    }

    originalSetActionHandler = mediaSession.setActionHandler;
    try {
        const ownDescriptor = Object.getOwnPropertyDescriptor(mediaSession, 'setActionHandler');
        if (ownDescriptor) {
            setActionDescriptorOwner = 'own';
            originalSetActionDescriptor = ownDescriptor;
            markInvalid('setActionHandler-own-shadow');
        } else {
            const prototype = Object.getPrototypeOf(mediaSession);
            const prototypeDescriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'setActionHandler');
            if (prototypeDescriptor) {
                setActionDescriptorOwner = 'prototype';
                originalSetActionDescriptor = prototypeDescriptor;
            }
        }
    } catch {
        markInvalid('setActionHandler-descriptor-unavailable');
    }

    function sentinelCallback(action, details) {
        const value = details && typeof details === 'object' ? details : {};
        const seekTime = Number.isFinite(value.seekTime) ? value.seekTime : null;
        const seekOffset = Number.isFinite(value.seekOffset) ? value.seekOffset : null;
        const fastSeek = typeof value.fastSeek === 'boolean' ? value.fastSeek : null;
        appendEvent('media-session-action', {
            action,
            seekTime,
            seekOffset,
            fastSeek,
            performed: false,
        });
        markInvalid('media-session-action-invoked', { action });
    }

    installedActions = [];
    registrationFailures = [];
    rollbackRecords = [];
    let failedAction = null;
    for (const action of ACTIONS) {
        const callback = function diagnosticSeekSentinel(details) {
            return sentinelCallback(action, details);
        };
        try {
            originalSetActionHandler.call(mediaSession, action, callback);
            installedActions.push(action);
        } catch (error) {
            failedAction = action;
            registrationFailures.push({
                action,
                error: String(error && error.message ? error.message : error).slice(0, 200),
            });
            break;
        }
    }

    if (failedAction) {
        markInvalid('media-session-registration-failure', { action: failedAction });
        for (const action of installedActions.slice().reverse()) {
            try {
                originalSetActionHandler.call(mediaSession, action, null);
                rollbackRecords.push({ action, ok: true });
            } catch (error) {
                rollbackRecords.push({
                    action,
                    ok: false,
                    error: String(error && error.message ? error.message : error).slice(0, 200),
                });
                markInvalid('media-session-rollback-failure', { action });
            }
        }
        installStatus = 'partial';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'media-session-registration-failure' };
    }

    setActionHandlerWrapper = function diagnosticSetActionHandler(action, handler) {
        const actionType = typeof action;
        const actionName = actionType === 'string' ? action : null;
        const handlerType = typeof handler;
        appendEvent('action-registration', {
            action: actionName,
            actionType,
            handlerType,
        });
        markInvalid('action-registration-after-install', {
            action: actionName,
            actionType,
        });
        try {
            return originalSetActionHandler.apply(this, arguments);
        } catch (error) {
            appendEvent('action-registration-failure', {
                action: actionName,
                actionType,
                handlerType,
                errorType: typeof error,
            });
            markInvalid('action-registration-failure', {
                action: actionName,
                actionType,
            });
            throw error;
        }
    };

    try {
        mediaSession.setActionHandler = setActionHandlerWrapper;
        setActionInstalledDescriptor = Object.getOwnPropertyDescriptor(mediaSession, 'setActionHandler');
    } catch (error) {
        markInvalid('setActionHandler-install-failed');
        installStatus = 'partial';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'setActionHandler-install-failed' };
    }

    playWrapper = function diagnosticAmbientPlay() {
        try {
            registerAmbient(this);
        } catch (error) {
            markInvalid('registration-failure', {
                error: String(error && error.message ? error.message : error).slice(0, 200),
            });
        }
        return originalPlay.apply(this, arguments);
    };

    try {
        mediaPrototype.play = playWrapper;
        playInstalledDescriptor = Object.getOwnPropertyDescriptor(mediaPrototype, 'play');
    } catch (error) {
        markInvalid('play-install-failed');
        installStatus = 'partial';
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'play-install-failed' };
    }

    installStatus = 'installed';
    appendEvent('install', {
        readyState: readyStateAtInstall,
        origin,
        actions: ACTIONS.slice(),
    });

    const diagnosticValid = computeValid();
    if (diagnosticValid && trustRegistry) {
        try {
            trustRegistry.add(api);
        } catch {}
    }
    return {
        installed: true,
        idempotent: false,
        diagnosticValid,
        reason: null,
        api,
    };
}

module.exports = { installMediaSessionSeekSentinel };
