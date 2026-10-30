'use strict';

// Controlled-QA native media mutation provenance profile.
//
// The exported function is deliberately self-contained so it can be serialized
// with Function.prototype.toString and installed as a browser init script. It
// must not close over Node imports or module-level values.
//
// Installation order assumed by this profile: install after the existing QA
// ambient-lifecycle observer and before the native MediaSession seek sentinel.
// This module does not integrate those tools, does not change gameplay, and is
// not production/default control coverage, acceptance, playback proof,
// universal provenance, or tamper resistance against malicious same-origin
// scripts. It observes only objects created through the Audio constructor it
// installs in this realm, after that constructor is installed.

function installNativeMediaMutationProvenance(priorApi) {
    const KEY = '__AWWV_NATIVE_MEDIA_MUTATION_PROVENANCE__';
    const TRUST_KEY = '__AWWV_NATIVE_MEDIA_MUTATION_PROVENANCE_TRUSTED_APIS__';
    const SENTINEL_KEY = '__AWWV_NATIVE_MEDIA_SEEK_SENTINEL__';
    const SENTINEL_SCHEMA = 'awwv.native-media-seek-sentinel.v1';
    const SENTINEL_ACTIONS = ['seekto', 'seekforward', 'seekbackward'];
    const SCHEMA = 'awwv.native-media-mutation-provenance.v1';
    const ABSENCE_SCHEMA = 'awwv.native-media-optional-absence-audit.v1';
    const MARKER = 'awwv-native-media-mutation-provenance-api-v1';
    const LABEL = 'ALTERED CONTROLLED-QA PROFILE: exact same-realm Audio-constructor provenance and explicit mutation evidence only. This is not acceptance, production/default-control coverage, universal provenance, playback-quality proof, natural-loop proof, or tamper resistance.';
    const AMBIENT_PATH = /^\/assets\/ambient_(?:warroom|field|archive)-[A-Za-z0-9_-]+\.ogg$/;
    // Retention bound only. 32768 is a practical finite ceiling for the planned
    // route shapes, not demonstrated sufficiency for the full 188-turn route and
    // not an acceptance or physics threshold. The appendEvent overflow path is
    // unchanged: the first event past this cap is dropped, marks truncation and
    // adds event-overflow, so no capture is reinterpreted as valid here.
    const EVENT_CAP = 32768;
    const ENTRY_CAP = 16;
    const OBSERVER_RECORD_CAP = 64;
    const REQUIRED_METHODS = ['play', 'pause', 'load'];
    const OPTIONAL_METHODS = ['fastSeek'];
    const REQUIRED_SETTERS = [
        'currentTime',
        'src',
        'playbackRate',
        'defaultPlaybackRate',
        'loop',
        'controls',
        'autoplay',
        'preload',
    ];
    const OPTIONAL_SETTERS = ['srcObject'];
    const ATTRIBUTE_REFLECTION = {
        src: 'src',
        loop: 'loop',
        controls: 'controls',
        autoplay: 'autoplay',
        preload: 'preload',
    };
    const CAPTURED_ATTRIBUTES = ['src', 'loop', 'controls', 'autoplay', 'preload'];

    if (typeof window === 'undefined' || !window || typeof window !== 'object') {
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'missing-window' };
    }

    const events = [];
    const invalidReasons = new Set();
    const entries = [];
    const entriesById = new Map();
    const ids = new WeakMap();
    let eventSequence = 0;
    let eventsDropped = 0;
    let eventsTruncated = false;
    let objectSequence = 0;
    let idCounter = 0;
    let attributeTokenSequence = 0;
    let installStatus = 'not-installed';
    let installationClocks = null;
    let readyStateAtInstall = null;
    let installationDocument = null;
    let realmValid = false;
    let originValid = false;
    let origin = null;
    let originalAudio = null;
    let originalAudioDescriptor = null;
    let audioWrapper = null;
    let installedAudioDescriptor = null;
    let mediaPrototype = null;
    const wrappedMethods = [];
    const wrappedSetters = [];
    let methodCoverage = {};
    let setterCoverage = {};
    let missingOptionalApis = [];
    const absentOptionalApis = [];
    let api = null;
    let trustRegistry = null;
    let playLayerBindAttempted = false;
    let playLayerBinding = null;

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

    function appendEvent(kind, details) {
        eventSequence += 1;
        const sequence = eventSequence;
        if (events.length >= EVENT_CAP) {
            eventsDropped += 1;
            eventsTruncated = true;
            if (!invalidReasons.has('event-overflow')) invalidReasons.add('event-overflow');
            return { sequence, overflow: true };
        }
        const record = {
            sequence,
            kind,
            at: clock(),
            ...(details && typeof details === 'object' ? details : {}),
        };
        events.push(record);
        return record;
    }

    function markInvalid(reason, detail) {
        if (!invalidReasons.has(reason)) invalidReasons.add(reason);
        appendEvent('invalidation', {
            reason,
            detail: detail === undefined ? null : detail,
        });
    }

    function invalidateEntry(entry, reason, detail) {
        if (entry && !entry.reason) entry.reason = reason;
        markInvalid(reason, {
            id: entry ? entry.id : null,
            ...(detail && typeof detail === 'object' ? detail : {}),
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
        } catch {
            errors[key] = 'read-threw';
            return fallback;
        }
    }

    function isAmbientSource(source) {
        if (typeof source !== 'string' || source.length === 0) return false;
        if (!origin) return false;
        let url;
        try {
            url = new window.URL(source, window.location && window.location.href ? window.location.href : undefined);
        } catch {
            return false;
        }
        if (url.origin !== origin) return false;
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        if (url.username !== '' || url.password !== '') return false;
        if (url.search !== '' || url.hash !== '') return false;
        return AMBIENT_PATH.test(url.pathname);
    }

    function readAttributes(element, errors) {
        const attributes = {};
        for (const name of CAPTURED_ATTRIBUTES) {
            attributes[name] = safeRead(errors, `attribute.${name}`, () => element.getAttribute(name), null);
        }
        const rateAttributes = {
            playbackRate: safeRead(errors, 'attribute.playbackRate', () => element.getAttribute('playbackRate'), null),
            defaultPlaybackRate: safeRead(errors, 'attribute.defaultPlaybackRate', () => element.getAttribute('defaultPlaybackRate'), null),
        };
        return { attributes, rateAttributes };
    }

    function readMediaState(element, errors) {
        const state = {
            src: safeRead(errors, 'src', () => element.src, null),
            currentSrc: safeRead(errors, 'currentSrc', () => element.currentSrc, null),
            loop: safeRead(errors, 'loop', () => element.loop, null),
            controls: safeRead(errors, 'controls', () => element.controls, null),
            autoplay: safeRead(errors, 'autoplay', () => element.autoplay, null),
            preload: safeRead(errors, 'preload', () => element.preload, null),
            currentTime: safeRead(errors, 'currentTime', () => element.currentTime, null),
            duration: safeRead(errors, 'duration', () => element.duration, null),
            paused: safeRead(errors, 'paused', () => element.paused, null),
            seeking: safeRead(errors, 'seeking', () => element.seeking, null),
            readyState: safeRead(errors, 'readyState', () => element.readyState, null),
            playbackRate: safeRead(errors, 'playbackRate', () => element.playbackRate, null),
            defaultPlaybackRate: safeRead(errors, 'defaultPlaybackRate', () => element.defaultPlaybackRate, null),
        };
        let srcObjectRaw = null;
        let srcObjectPresent = false;
        let srcObjectType = 'none';
        try {
            srcObjectRaw = element.srcObject;
            srcObjectPresent = srcObjectRaw !== null && srcObjectRaw !== undefined;
            srcObjectType = srcObjectPresent ? typeof srcObjectRaw : 'none';
        } catch {
            errors.srcObject = 'read-threw';
        }
        return {
            state,
            srcObjectRaw,
            srcObjectPresent,
            srcObjectType,
        };
    }

    function captureTracked(element) {
        const errors = {};
        const mediaState = readMediaState(element, errors);
        const attributeState = readAttributes(element, errors);
        return {
            source: typeof mediaState.state.src === 'string' && mediaState.state.src.length > 0
                ? mediaState.state.src
                : null,
            state: mediaState.state,
            attributes: attributeState.attributes,
            rateAttributes: attributeState.rateAttributes,
            rates: {
                playbackRate: mediaState.state.playbackRate,
                defaultPlaybackRate: mediaState.state.defaultPlaybackRate,
            },
            srcObjectRaw: mediaState.srcObjectRaw,
            srcObjectPresent: mediaState.srcObjectPresent,
            srcObjectType: mediaState.srcObjectType,
            errors,
        };
    }

    function applyTrackers(entry, captured) {
        entry.lastSource = captured.source;
        entry.lastAttributes = { ...captured.attributes };
        entry.lastRates = { ...captured.rates };
        entry.lastSrcObject = captured.srcObjectRaw;
        entry.lastSrcObjectPresent = captured.srcObjectPresent;
        entry.lastSrcObjectType = captured.srcObjectType;
    }

    function noteActiveSrcObject(entry, captured) {
        if (!entry || !captured || !captured.srcObjectPresent) return false;
        if (!entry.srcObjectActiveNoted) {
            entry.srcObjectActiveNoted = true;
            invalidateEntry(entry, 'active-srcObject', { type: captured.srcObjectType });
            markInvalid('active-srcObject', { id: entry.id, type: captured.srcObjectType });
        }
        return true;
    }

    function readEntryElement(entry) {
        try {
            return entry.ref && typeof entry.ref.deref === 'function' ? entry.ref.deref() : null;
        } catch {
            return null;
        }
    }

    function lookupEntry(element) {
        let id;
        try {
            id = ids.get(element);
        } catch {
            return null;
        }
        if (!id) return null;
        const entry = entriesById.get(id);
        if (!entry) return null;
        const live = readEntryElement(entry);
        if (!live || live !== element) return null;
        return entry;
    }

    function processObserverRecords(entry, records) {
        if (!entry || entry.observerOverflow) return;
        for (const record of records) {
            entry.observerRecords += 1;
            if (entry.observerRecords > OBSERVER_RECORD_CAP) {
                entry.observerOverflow = true;
                invalidateEntry(entry, 'observer-record-overflow', { cap: OBSERVER_RECORD_CAP });
                return;
            }
            if (!record || typeof record !== 'object') {
                entry.observerUnexplained += 1;
                invalidateEntry(entry, 'unsupported-mutation-record');
                markInvalid('unsupported-mutation-record', { id: entry.id });
                continue;
            }
            if (record.type === 'attributes') {
                const name = record.attributeName;
                let index = -1;
                for (let cursor = 0; cursor < entry.expected.length; cursor += 1) {
                    if (entry.expected[cursor].attributeName === name) {
                        index = cursor;
                        break;
                    }
                }
                if (index >= 0) {
                    const token = entry.expected.splice(index, 1)[0];
                    appendEvent('attribute-mutation-explained', {
                        id: entry.id,
                        attributeName: name,
                        token: token.token,
                    });
                } else {
                    entry.observerUnexplained += 1;
                    invalidateEntry(entry, 'unexplained-attribute-mutation', { attributeName: name });
                    markInvalid('unexplained-mutation', { id: entry.id, attributeName: name });
                }
                continue;
            }
            if (record.type === 'childList') {
                entry.observerUnexplained += 1;
                invalidateEntry(entry, 'unsupported-source-child-mutation');
                markInvalid('unsupported-source-child-mutation', { id: entry.id });
                continue;
            }
            entry.observerUnexplained += 1;
            invalidateEntry(entry, 'unsupported-mutation-record', { type: String(record.type) });
            markInvalid('unsupported-mutation-record', { id: entry.id });
        }
    }

    function drainEntry(entry, deliveredRecords) {
        if (!entry || !entry.observer || entry.observerOverflow) return;
        let records;
        try {
            records = entry.observer.takeRecords();
        } catch {
            invalidateEntry(entry, 'observer-take-failed');
            return;
        }
        if (!Array.isArray(records)) records = [];
        const combined = [];
        if (Array.isArray(deliveredRecords)) {
            for (const record of deliveredRecords) combined.push(record);
        } else if (deliveredRecords !== null && deliveredRecords !== undefined) {
            combined.push(deliveredRecords);
        }
        for (const record of records) combined.push(record);
        processObserverRecords(entry, combined);
    }

    function auditOwnShadows(entry, element) {
        const names = [
            ...REQUIRED_METHODS,
            ...OPTIONAL_METHODS,
            ...REQUIRED_SETTERS,
            ...OPTIONAL_SETTERS,
        ];
        for (const name of names) {
            let hasOwn = false;
            try {
                hasOwn = Object.prototype.hasOwnProperty.call(element, name);
            } catch {
                hasOwn = true;
            }
            if (!hasOwn) continue;
            if (!entry.ownShadows.includes(name)) entry.ownShadows.push(name);
            invalidateEntry(entry, 'own-shadow', { property: name });
            markInvalid(`own-shadow:${name}`, { id: entry.id });
        }
        return entry.ownShadows.slice();
    }

    function compareTracked(entry, captured) {
        if (!Object.is(captured.source, entry.lastSource)) {
            invalidateEntry(entry, 'unexplained-source-change', {
                previous: entry.lastSource,
                current: captured.source,
            });
            markInvalid('unexplained-mutation', { id: entry.id, field: 'src' });
        }
        for (const name of CAPTURED_ATTRIBUTES) {
            if (!Object.is(captured.attributes[name], entry.lastAttributes[name])) {
                invalidateEntry(entry, 'unexplained-attribute-state', { attributeName: name });
                markInvalid('unexplained-mutation', { id: entry.id, attributeName: name });
            }
        }
        if (!Object.is(captured.rates.playbackRate, entry.lastRates.playbackRate)
            || !Object.is(captured.rates.defaultPlaybackRate, entry.lastRates.defaultPlaybackRate)) {
            invalidateEntry(entry, 'unexplained-rate-change');
            markInvalid('unexplained-mutation', { id: entry.id, field: 'rate' });
        }
        if (!Object.is(captured.srcObjectRaw, entry.lastSrcObject)) {
            invalidateEntry(entry, 'unexplained-srcObject-change');
            markInvalid('unexplained-mutation', { id: entry.id, field: 'srcObject' });
        }
        if (captured.state.autoplay === true) {
            entry.autoplayEnabled = true;
            invalidateEntry(entry, 'autoplay-enabled');
        }
    }

    function validateEntry(entry, element) {
        drainEntry(entry);
        auditOwnShadows(entry, element);
        auditOptionalAbsenceForEntry(entry, element);
        if (!(element instanceof window.HTMLMediaElement)) {
            invalidateEntry(entry, 'identity-mismatch');
            return { captured: null, ownShadows: entry.ownShadows.slice() };
        }
        let ownerDocument = null;
        let ownerDocumentRead = false;
        try {
            ownerDocument = element.ownerDocument;
            ownerDocumentRead = true;
        } catch {}
        if (!ownerDocumentRead || ownerDocument !== installationDocument) {
            invalidateEntry(entry, 'owner-document-mismatch');
            markInvalid('owner-document-mismatch', { id: entry.id });
            return { captured: null, ownShadows: entry.ownShadows.slice() };
        }
        const captured = captureTracked(element);
        if (Object.keys(captured.errors).length > 0) {
            invalidateEntry(entry, 'unsafe-read', { fields: Object.keys(captured.errors) });
            markInvalid('state-read-failure', { id: entry.id, fields: Object.keys(captured.errors) });
            return { captured, ownShadows: entry.ownShadows.slice() };
        }
        noteActiveSrcObject(entry, captured);
        compareTracked(entry, captured);
        return { captured, ownShadows: entry.ownShadows.slice() };
    }

    function evaluateEntry(entry, element) {
        const validation = validateEntry(entry, element);
        const captured = validation.captured;
        const source = captured ? captured.source : entry.lastSource;
        const sourceIsAmbient = isAmbientSource(source);
        let reason = null;
        if (entry.reason) reason = entry.reason;
        else if (entry.subclass) reason = 'unsupported-subclass';
        else if (!source) reason = 'missing-source';
        else if (!sourceIsAmbient) reason = 'non-ambient-source';
        const diagnosticValid = computeValid();
        if (!reason && !diagnosticValid) reason = 'diagnostic-invalid';
        return {
            captured,
            source,
            sourceIsAmbient,
            reason,
            diagnosticValid,
            valid: reason === null,
        };
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

    function auditPlayLayerBinding() {
        if (!playLayerBinding) return;
        const playMethod = wrappedMethods.find((method) => method.name === 'play');
        if (!playMethod) {
            markInvalid('play-layer-inner-missing');
            return;
        }
        let descriptor;
        try {
            descriptor = Object.getOwnPropertyDescriptor(playLayerBinding.owner, 'play');
        } catch {}
        if (!descriptor || !descriptorMatches(descriptor, playLayerBinding.outerDescriptor)) {
            markInvalid('play-layer-descriptor-tampered');
        }
        if (!descriptorMatches(playLayerBinding.priorDescriptor, playMethod.installedDescriptor)) {
            markInvalid('play-layer-inner-descriptor-changed');
        }
        let sentinelGlobalApi;
        try {
            sentinelGlobalApi = window[playLayerBinding.sentinelKey];
        } catch {}
        if (sentinelGlobalApi !== playLayerBinding.sentinelApi) {
            markInvalid('play-layer-sentinel-api-replaced');
        }
        let sentinelGlobalDescriptor;
        try {
            sentinelGlobalDescriptor = Object.getOwnPropertyDescriptor(window, playLayerBinding.sentinelKey);
        } catch {}
        if (!sentinelGlobalDescriptor
            || sentinelGlobalDescriptor.value !== playLayerBinding.sentinelApi
            || sentinelGlobalDescriptor.writable !== false
            || sentinelGlobalDescriptor.configurable !== false) {
            markInvalid('play-layer-sentinel-api-descriptor-tampered');
        }
        let sentinelSnapshot = null;
        try {
            sentinelSnapshot = playLayerBinding.sentinelApi.snapshot();
        } catch {}
        if (!sentinelSnapshot || sentinelSnapshot.schema !== SENTINEL_SCHEMA) {
            markInvalid('play-layer-sentinel-snapshot-invalid');
            return;
        }
        if (sentinelSnapshot.valid !== true) {
            markInvalid('play-layer-sentinel-invalid');
        }
        if (!sentinelSnapshot.install
            || sentinelSnapshot.install.status !== 'installed'
            || sentinelSnapshot.install.playWrapped !== true) {
            markInvalid('play-layer-sentinel-install-invalid');
        }
        const actions = sentinelSnapshot.coverage && sentinelSnapshot.coverage.mediaSessionActions;
        if (!Array.isArray(actions)
            || actions.length !== SENTINEL_ACTIONS.length
            || !SENTINEL_ACTIONS.every((action) => actions.indexOf(action) >= 0)) {
            markInvalid('play-layer-sentinel-coverage-invalid');
        }
    }

    function audit() {
        if (installStatus !== 'installed') return;
        try {
            if (window.Audio !== audioWrapper) markInvalid('constructor-replaced');
            const audioDescriptor = Object.getOwnPropertyDescriptor(window, 'Audio');
            if (!descriptorMatches(audioDescriptor, installedAudioDescriptor)) {
                markInvalid('constructor-descriptor-tampered');
            }
            auditOptionalAbsenceGlobally();
            for (const method of wrappedMethods) {
                if (method.name === 'play' && playLayerBinding) continue;
                const descriptor = Object.getOwnPropertyDescriptor(method.owner, method.name);
                if (!descriptor || descriptor.value !== method.wrapper) {
                    markInvalid(`method-${method.name}-replaced`);
                } else if (!descriptorMatches(descriptor, method.installedDescriptor)) {
                    markInvalid(`method-${method.name}-descriptor-tampered`);
                }
            }
            auditPlayLayerBinding();
            for (const setter of wrappedSetters) {
                const descriptor = Object.getOwnPropertyDescriptor(setter.owner, setter.name);
                if (!descriptor) {
                    markInvalid(`setter-${setter.name}-replaced`);
                } else if (!descriptorMatches(descriptor, setter.installedDescriptor)) {
                    markInvalid(`setter-${setter.name}-descriptor-tampered`);
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

    function computeValid() {
        return installStatus === 'installed' && invalidReasons.size === 0 && !eventsTruncated;
    }

    function advanceSourceEpoch(entry, cause) {
        const previous = entry.sourceEpoch;
        entry.sourceEpoch += 1;
        appendEvent('source-epoch', {
            id: entry.id,
            cause,
            previous,
            sourceEpoch: entry.sourceEpoch,
            source: entry.lastSource,
        });
    }

    function registerElement(element, subclass) {
        if (!(element instanceof window.HTMLMediaElement)) {
            markInvalid('non-media-constructor-result');
            return null;
        }
        const existingId = ids.get(element);
        if (existingId) {
            const existing = entriesById.get(existingId);
            if (existing) return existing;
        }
        if (entries.length >= ENTRY_CAP) {
            markInvalid('entry-overflow', { cap: ENTRY_CAP });
            appendEvent('entry-overflow', { cap: ENTRY_CAP });
            return null;
        }
        let reference;
        try {
            reference = new window.WeakRef(element);
        } catch {
            markInvalid('weakref-create-failed');
            return null;
        }
        const captured = captureTracked(element);
        const entry = {
            id: `media:${++idCounter}`,
            ref: reference,
            constructorSequence: ++objectSequence,
            subclass: Boolean(subclass),
            supported: !subclass,
            reason: subclass ? 'unsupported-subclass' : null,
            sourceEpoch: captured.source ? 1 : 0,
            lastSource: captured.source,
            lastAttributes: { ...captured.attributes },
            lastRates: { ...captured.rates },
            lastSrcObject: captured.srcObjectRaw,
            lastSrcObjectPresent: captured.srcObjectPresent,
            lastSrcObjectType: captured.srcObjectType,
            srcObjectActiveNoted: false,
            registeredAt: clock(),
            origin,
            observer: null,
            observerRecords: 0,
            observerUnexplained: 0,
            observerOverflow: false,
            expected: [],
            ownShadows: [],
            autoplayEnabled: captured.state.autoplay === true,
            mutationCounts: { setters: 0, methods: 0, byName: {} },
            continuity: {
                playCount: 0,
                pauseCount: 0,
                lastPlaySequence: null,
                lastPauseSequence: null,
                lastPlayEpoch: null,
                lastPauseEpoch: null,
            },
        };
        if (Object.keys(captured.errors).length > 0) {
            invalidateEntry(entry, 'unsafe-read', { fields: Object.keys(captured.errors) });
            markInvalid('state-read-failure', { id: entry.id, fields: Object.keys(captured.errors) });
        }
        noteActiveSrcObject(entry, captured);
        if (entry.autoplayEnabled) invalidateEntry(entry, 'autoplay-enabled');
        if (!subclass) {
            try {
                const observer = new window.MutationObserver(function nativeMediaProvenanceObserver(deliveredRecords) {
                    drainEntry(entry, deliveredRecords);
                });
                observer.observe(element, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeOldValue: false,
                });
                entry.observer = observer;
            } catch {
                invalidateEntry(entry, 'observer-attach-failure');
                markInvalid('observer-attach-failure', { id: entry.id });
            }
        }
        ids.set(element, entry.id);
        entries.push(entry);
        entriesById.set(entry.id, entry);
        appendEvent('construct', {
            id: entry.id,
            constructorSequence: entry.constructorSequence,
            source: entry.lastSource,
            sourceEpoch: entry.sourceEpoch,
            subclass: entry.subclass,
            origin,
        });
        return entry;
    }

    function summarizeEntry(entry) {
        const element = readEntryElement(entry);
        if (!element) {
            return {
                id: entry.id,
                alive: false,
                supported: entry.supported,
                subclass: entry.subclass,
                sourceEpoch: entry.sourceEpoch,
                source: entry.lastSource,
                sourceIsAmbient: false,
                admissible: false,
                reason: 'dead',
                attributes: { ...entry.lastAttributes },
                rateProperties: { ...entry.lastRates },
                continuity: { ...entry.continuity },
                mutationCounts: copyJson(entry.mutationCounts) || { setters: 0, methods: 0, byName: {} },
                observer: {
                    recordsSeen: entry.observerRecords,
                    overflow: entry.observerOverflow,
                    unexplained: entry.observerUnexplained,
                    drainedBeforeValidation: true,
                },
                readErrors: {},
            };
        }
        const evaluated = evaluateEntry(entry, element);
        const captured = evaluated.captured;
        return {
            id: entry.id,
            alive: true,
            supported: entry.supported,
            subclass: entry.subclass,
            sourceEpoch: entry.sourceEpoch,
            source: evaluated.source,
            sourceIsAmbient: evaluated.sourceIsAmbient,
            admissible: evaluated.valid,
            reason: evaluated.reason,
            attributes: captured ? { ...captured.attributes } : { ...entry.lastAttributes },
            rateProperties: captured ? { ...captured.rates } : { ...entry.lastRates },
            continuity: { ...entry.continuity },
            mutationCounts: copyJson(entry.mutationCounts) || { setters: 0, methods: 0, byName: {} },
            observer: {
                recordsSeen: entry.observerRecords,
                overflow: entry.observerOverflow,
                unexplained: entry.observerUnexplained,
                drainedBeforeValidation: true,
            },
            readErrors: captured ? copyJson(captured.errors) || {} : {},
        };
    }

    function snapshot() {
        audit();
        const summaries = entries.map(summarizeEntry);
        const counts = new Map();
        for (const summary of summaries) {
            if (typeof summary.source !== 'string' || summary.source.length === 0) continue;
            counts.set(summary.source, (counts.get(summary.source) || 0) + 1);
        }
        const duplicateSources = [...counts.entries()]
            .filter(([, count]) => count > 1)
            .map(([source]) => source);
        let currentReadyState = null;
        try {
            currentReadyState = window.document ? window.document.readyState : null;
        } catch {}
        return {
            schema: SCHEMA,
            diagnosticOnly: true,
            applicationAcceptance: false,
            universalProvenance: false,
            valid: computeValid(),
            label: LABEL,
            coverage: coverageReport(),
            install: {
                status: installStatus,
                installedAt: installationClocks ? { ...installationClocks } : null,
                readyStateAtInstall,
                readyState: currentReadyState,
                realmValid,
                originValid,
                origin,
                lateInstallation: readyStateAtInstall !== 'loading',
                constructorWrapped: Boolean(audioWrapper && window.Audio === audioWrapper),
                playLayerBound: Boolean(playLayerBinding),
                methods: { ...methodCoverage },
                setters: { ...setterCoverage },
                unsupportedOptionalApis: missingOptionalApis.slice(),
                absenceAudit: absenceAuditReport(),
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
                capacity: ENTRY_CAP,
                count: entries.length,
                overflow: invalidReasons.has('entry-overflow'),
                duplicateSources,
                entries: summaries,
            },
        };
    }

    function describe(element) {
        audit();
        let id;
        try {
            id = ids.get(element);
        } catch {
            id = undefined;
        }
        if (!id) {
            return {
                schema: SCHEMA,
                diagnosticOnly: true,
                diagnosticValid: computeValid(),
                valid: false,
                reason: 'unknown-element',
                element: null,
                provenance: null,
            };
        }
        const entry = entriesById.get(id);
        if (!entry) {
            return {
                schema: SCHEMA,
                diagnosticOnly: true,
                diagnosticValid: computeValid(),
                valid: false,
                reason: 'unknown-element',
                element: null,
                provenance: null,
            };
        }
        drainEntry(entry);
        const live = readEntryElement(entry);
        if (!live) {
            return {
                schema: SCHEMA,
                diagnosticOnly: true,
                diagnosticValid: computeValid(),
                valid: false,
                reason: 'dead',
                element: {
                    id: entry.id,
                    alive: false,
                    supported: entry.supported,
                    subclass: entry.subclass,
                    createdByInstalledConstructor: true,
                    constructorSequence: entry.constructorSequence,
                    sourceEpoch: entry.sourceEpoch,
                    source: entry.lastSource,
                    sourceIsAmbient: false,
                    origin: entry.origin,
                    registeredAt: entry.registeredAt,
                },
                provenance: null,
            };
        }
        if (live !== element || ids.get(live) !== id) {
            invalidateEntry(entry, 'identity-mismatch');
            return {
                schema: SCHEMA,
                diagnosticOnly: true,
                diagnosticValid: computeValid(),
                valid: false,
                reason: 'identity-mismatch',
                element: null,
                provenance: null,
            };
        }
        const evaluated = evaluateEntry(entry, live);
        const captured = evaluated.captured;
        return {
            schema: SCHEMA,
            diagnosticOnly: true,
            diagnosticValid: computeValid(),
            valid: evaluated.valid,
            reason: evaluated.reason,
            element: {
                id: entry.id,
                alive: true,
                supported: entry.supported,
                subclass: entry.subclass,
                createdByInstalledConstructor: true,
                constructorSequence: entry.constructorSequence,
                sourceEpoch: entry.sourceEpoch,
                source: evaluated.source,
                sourceIsAmbient: evaluated.sourceIsAmbient,
                origin: entry.origin,
                registeredAt: entry.registeredAt,
            },
            provenance: {
                profile: 'controlled-qa-native-media-mutation-provenance',
                sourceEpochSemantics: 'monotonic-per-object',
                sameUrlReloadAdvancesEpoch: true,
                initialSetupValid: true,
                laterMutations: 'explicit-evidence',
                attributes: captured ? { ...captured.attributes } : { ...entry.lastAttributes },
                rateAttributes: captured ? { ...captured.rateAttributes } : {
                    playbackRate: null,
                    defaultPlaybackRate: null,
                },
                rateProperties: captured ? { ...captured.rates } : { ...entry.lastRates },
                srcObject: {
                    present: captured ? captured.srcObjectPresent : entry.lastSrcObjectPresent,
                    type: captured ? captured.srcObjectType : entry.lastSrcObjectType,
                    attributeReflection: false,
                },
                autoplayEnabled: Boolean(entry.autoplayEnabled),
                observer: {
                    recordsSeen: entry.observerRecords,
                    overflow: entry.observerOverflow,
                    unexplained: entry.observerUnexplained,
                    drainedBeforeValidation: true,
                },
                ownShadows: entry.ownShadows.slice(),
                readErrors: captured ? copyJson(captured.errors) || {} : {},
                continuity: { ...entry.continuity },
            },
            mutationCounts: copyJson(entry.mutationCounts) || { setters: 0, methods: 0, byName: {} },
        };
    }

    function coverageReport() {
        return {
            profile: 'controlled-qa-native-media-mutation-provenance',
            diagnosticOnly: true,
            productionDefaultControls: false,
            applicationAcceptance: false,
            universalProvenance: false,
            exactObjectIdentity: true,
            sameRealmInstalledAudioConstructorOnly: true,
            autoplay: 'rejected',
            sourceChildren: 'unsupported-invalidating',
            unknownCreation: 'unsupported-invalidating',
            attributesCaptured: CAPTURED_ATTRIBUTES.slice(),
            rateProperties: {
                playbackRate: 'property',
                defaultPlaybackRate: 'property',
                attributeReflection: false,
            },
            srcObject: {
                property: setterCoverage.srcObject || 'unavailable',
                attributeReflection: false,
            },
            methods: { ...methodCoverage },
            setters: { ...setterCoverage },
            missingOptionalApis: missingOptionalApis.slice(),
            absenceAudit: absenceAuditReport(),
            sourceEpoch: {
                semantics: 'monotonic-per-object',
                initialNonEmptySourceEpoch: 1,
                emptySourceEpoch: 0,
                advancesOn: [
                    'src-setter-success',
                    'srcObject-setter-success',
                    'load-success',
                ],
                sameUrlReloadAdvancesEpoch: true,
                urlEqualityPreservesEpoch: false,
                constructorSetupCountsAsInitial: true,
            },
            mutationObserver: {
                attributes: true,
                childList: true,
                subtree: true,
                recordCap: OBSERVER_RECORD_CAP,
                drainBeforeValidation: true,
                unexplainedMutations: 'invalidate',
                sourceChildUnsupported: true,
            },
            limits: {
                events: EVENT_CAP,
                entries: ENTRY_CAP,
                observerRecordsPerObject: OBSERVER_RECORD_CAP,
            },
            browserTamperResistance: false,
            note: LABEL,
        };
    }

    function findDescriptor(owner, name) {
        let current = owner;
        while (current && current !== Object.prototype) {
            const descriptor = Object.getOwnPropertyDescriptor(current, name);
            if (descriptor) return { owner: current, descriptor };
            current = Object.getPrototypeOf(current);
        }
        return null;
    }

    function inspectOptionalAbsence(start, record) {
        let current = start;
        while (current) {
            const descriptor = Object.getOwnPropertyDescriptor(current, record.name);
            if (descriptor) {
                const wrapped = record.kind === 'method'
                    ? typeof descriptor.value === 'function'
                    : typeof descriptor.set === 'function';
                return { status: wrapped ? 'present' : 'present-unwrapped', owner: current };
            }
            current = Object.getPrototypeOf(current);
        }
        return { status: 'absent', owner: null };
    }

    function absenceAuditReport() {
        return {
            schema: ABSENCE_SCHEMA,
            recordedAt: 'installation',
            recheckedOnEveryValidation: true,
            prototypeChain: 'all',
            instanceShadows: 'rejected',
            readFailure: 'fail-closed',
            laterAppearance: 'reject',
            presentButUnwrapped: 'reject',
            entries: absentOptionalApis.map((record) => ({
                name: record.name,
                kind: record.kind,
                status: 'absent',
            })),
        };
    }

    function auditOptionalAbsenceGlobally() {
        for (const record of absentOptionalApis) {
            let inspection;
            try {
                inspection = inspectOptionalAbsence(mediaPrototype, record);
            } catch {
                markInvalid(`optional-api-absence-read-failed:${record.name}`, {
                    stage: 'prototype',
                });
                continue;
            }
            if (inspection.status === 'present') {
                markInvalid(`optional-api-appeared:${record.name}`, { stage: 'prototype' });
            } else if (inspection.status === 'present-unwrapped') {
                markInvalid(`optional-api-present-unwrapped:${record.name}`, { stage: 'prototype' });
            }
        }
    }

    function auditOptionalAbsenceForEntry(entry, element) {
        for (const record of absentOptionalApis) {
            let inspection;
            try {
                inspection = inspectOptionalAbsence(Object.getPrototypeOf(element), record);
            } catch {
                invalidateEntry(entry, 'optional-api-absence-read-failed', { name: record.name });
                markInvalid(`optional-api-absence-read-failed:${record.name}`, { id: entry.id });
                continue;
            }
            if (inspection.status === 'present') {
                invalidateEntry(entry, 'optional-api-appeared', { name: record.name });
                markInvalid(`optional-api-appeared:${record.name}`, { id: entry.id });
            } else if (inspection.status === 'present-unwrapped') {
                invalidateEntry(entry, 'optional-api-present-unwrapped', { name: record.name });
                markInvalid(`optional-api-present-unwrapped:${record.name}`, { id: entry.id });
            }
        }
    }

    function wrapMethod(found, name) {
        const original = found.descriptor.value;
        const wrapper = function installedNativeMediaMethod() {
            const receiver = this;
            const args = arguments;
            const entry = lookupEntry(receiver);
            const argTypes = [];
            for (let index = 0; index < args.length; index += 1) argTypes.push(typeof args[index]);
            const attempt = appendEvent('mutation-attempt', {
                targetType: 'method',
                name,
                id: entry ? entry.id : null,
                sourceEpoch: entry ? entry.sourceEpoch : null,
                argTypes,
                argumentCount: args.length,
            });
            if (!entry) {
                markInvalid('unregistered-media-receiver', { name });
            } else if (!entry.supported) {
                appendEvent('unsupported-object-mutation', { id: entry.id, name });
            }
            if (entry) {
                try {
                    validateEntry(entry, receiver);
                } catch {
                    invalidateEntry(entry, 'prior-validation-failure', { name });
                    markInvalid('prior-validation-failure', { id: entry.id, name });
                }
            }
            let result;
            try {
                result = original.apply(receiver, args);
            } catch (error) {
                appendEvent('mutation-result', {
                    targetType: 'method',
                    name,
                    id: entry ? entry.id : null,
                    outcome: 'threw',
                    errorType: typeof error,
                    sequenceOfAttempt: attempt ? attempt.sequence : null,
                });
                if (entry) drainEntry(entry);
                throw error;
            }
            if (entry) {
                entry.mutationCounts.methods += 1;
                entry.mutationCounts.byName[name] = (entry.mutationCounts.byName[name] || 0) + 1;
                const captured = captureTracked(receiver);
                if (Object.keys(captured.errors).length > 0) {
                    invalidateEntry(entry, 'unsafe-read', { fields: Object.keys(captured.errors) });
                    markInvalid('state-read-failure', { id: entry.id, fields: Object.keys(captured.errors) });
                } else {
                    applyTrackers(entry, captured);
                    noteActiveSrcObject(entry, captured);
                }
                if (name === 'load') advanceSourceEpoch(entry, 'load');
                if (name === 'play') {
                    entry.continuity.playCount += 1;
                    entry.continuity.lastPlaySequence = attempt ? attempt.sequence : eventSequence;
                    entry.continuity.lastPlayEpoch = entry.sourceEpoch;
                } else if (name === 'pause') {
                    entry.continuity.pauseCount += 1;
                    entry.continuity.lastPauseSequence = attempt ? attempt.sequence : eventSequence;
                    entry.continuity.lastPauseEpoch = entry.sourceEpoch;
                }
                drainEntry(entry);
            }
            appendEvent('mutation-result', {
                targetType: 'method',
                name,
                id: entry ? entry.id : null,
                outcome: 'success',
                resultType: typeof result,
                sourceEpoch: entry ? entry.sourceEpoch : null,
                sequenceOfAttempt: attempt ? attempt.sequence : null,
            });
            return result;
        };
        const installedDescriptor = { ...found.descriptor, value: wrapper };
        Object.defineProperty(found.owner, name, installedDescriptor);
        wrappedMethods.push({
            name,
            owner: found.owner,
            original,
            wrapper,
            installedDescriptor: Object.getOwnPropertyDescriptor(found.owner, name),
        });
        methodCoverage[name] = 'wrapped';
    }

    function wrapSetter(found, name) {
        const originalSet = found.descriptor.set;
        const attributeName = ATTRIBUTE_REFLECTION[name] || null;
        const wrapper = function installedNativeMediaSetter() {
            const receiver = this;
            const args = arguments;
            const entry = lookupEntry(receiver);
            const argTypes = [];
            for (let index = 0; index < args.length; index += 1) argTypes.push(typeof args[index]);
            const attempt = appendEvent('mutation-attempt', {
                targetType: 'setter',
                name,
                id: entry ? entry.id : null,
                sourceEpoch: entry ? entry.sourceEpoch : null,
                argTypes,
                argumentCount: args.length,
            });
            if (!entry) {
                markInvalid('unregistered-media-receiver', { name });
            } else if (!entry.supported) {
                appendEvent('unsupported-object-mutation', { id: entry.id, name });
            }
            if (entry) {
                try {
                    validateEntry(entry, receiver);
                } catch {
                    invalidateEntry(entry, 'prior-validation-failure', { name });
                    markInvalid('prior-validation-failure', { id: entry.id, name });
                }
            }
            let beforeAttribute = null;
            let token = null;
            if (entry && attributeName) {
                const errors = {};
                beforeAttribute = safeRead(errors, 'beforeAttribute', () => receiver.getAttribute(attributeName), null);
                token = {
                    attributeName,
                    token: ++attributeTokenSequence,
                };
                entry.expected.push(token);
            }
            let result;
            try {
                result = originalSet.apply(receiver, args);
            } catch (error) {
                if (entry && token) {
                    const index = entry.expected.indexOf(token);
                    if (index >= 0) entry.expected.splice(index, 1);
                }
                appendEvent('mutation-result', {
                    targetType: 'setter',
                    name,
                    id: entry ? entry.id : null,
                    outcome: 'threw',
                    errorType: typeof error,
                    sequenceOfAttempt: attempt ? attempt.sequence : null,
                });
                if (entry) drainEntry(entry);
                throw error;
            }
            if (entry) {
                entry.mutationCounts.setters += 1;
                entry.mutationCounts.byName[name] = (entry.mutationCounts.byName[name] || 0) + 1;
                const captured = captureTracked(receiver);
                if (Object.keys(captured.errors).length > 0) {
                    invalidateEntry(entry, 'unsafe-read', { fields: Object.keys(captured.errors) });
                    markInvalid('state-read-failure', { id: entry.id, fields: Object.keys(captured.errors) });
                } else {
                    applyTrackers(entry, captured);
                    noteActiveSrcObject(entry, captured);
                    if (name === 'autoplay' && captured.state.autoplay === true) {
                        entry.autoplayEnabled = true;
                        invalidateEntry(entry, 'autoplay-enabled');
                    }
                }
                if (name === 'src' || name === 'srcObject') advanceSourceEpoch(entry, name);
                drainEntry(entry);
                if (token) {
                    const pendingIndex = entry.expected.indexOf(token);
                    if (pendingIndex >= 0) {
                        entry.expected.splice(pendingIndex, 1);
                        if (attributeName) {
                            const errors = {};
                            const afterAttribute = safeRead(errors, 'afterAttribute', () => receiver.getAttribute(attributeName), null);
                            if (!Object.is(afterAttribute, beforeAttribute)) {
                                invalidateEntry(entry, 'ambiguous-attribute-mutation', { attributeName });
                                markInvalid('ambiguous-attribute-mutation', {
                                    id: entry.id,
                                    attributeName,
                                });
                            }
                        }
                    }
                }
            }
            appendEvent('mutation-result', {
                targetType: 'setter',
                name,
                id: entry ? entry.id : null,
                outcome: 'success',
                resultType: typeof result,
                sourceEpoch: entry ? entry.sourceEpoch : null,
                sequenceOfAttempt: attempt ? attempt.sequence : null,
            });
            return result;
        };
        const installedDescriptor = { ...found.descriptor, set: wrapper };
        Object.defineProperty(found.owner, name, installedDescriptor);
        wrappedSetters.push({
            name,
            owner: found.owner,
            originalSet,
            wrapper,
            installedDescriptor: Object.getOwnPropertyDescriptor(found.owner, name),
        });
        setterCoverage[name] = 'wrapped';
    }

    // Private one-shot evidence binding for the exact sentinel outer play
    // layer. This closure is only returned on the fresh installation result,
    // never exposed on the window API. The caller is the trusted combined
    // initializer: it retains the pre-sentinel play descriptor, installs the
    // unchanged exact sentinel source, and binds before any media object exists.
    function bindPlayLayer(evidence) {
        function reject(reason, detail) {
            markInvalid(reason, detail === undefined ? null : detail);
            return { bound: false, reason };
        }
        if (playLayerBinding || playLayerBindAttempted) {
            return reject('play-layer-binding-already-attempted', {
                alreadyBound: Boolean(playLayerBinding),
            });
        }
        playLayerBindAttempted = true;
        if (installStatus !== 'installed') {
            return reject('play-layer-binding-not-installed', { status: installStatus });
        }
        if (entries.length !== 0 || objectSequence !== 0) {
            return reject('play-layer-binding-media-exists', {
                entries: entries.length,
                objectSequence,
            });
        }
        if (!evidence || typeof evidence !== 'object') {
            return reject('play-layer-binding-invalid-evidence');
        }
        const priorDescriptor = evidence.priorDescriptor;
        const sentinelResult = evidence.sentinelResult;
        const playMethod = wrappedMethods.find((method) => method.name === 'play');
        if (!playMethod
            || !priorDescriptor
            || !descriptorMatches(priorDescriptor, playMethod.installedDescriptor)
            || priorDescriptor.value !== playMethod.wrapper) {
            return reject('play-layer-binding-prior-mismatch');
        }
        if (!sentinelResult
            || sentinelResult.installed !== true
            || sentinelResult.idempotent !== false
            || !sentinelResult.api
            || typeof sentinelResult.api.snapshot !== 'function') {
            return reject('play-layer-binding-sentinel-not-installed');
        }
        let sentinelGlobalApi;
        try {
            sentinelGlobalApi = window[SENTINEL_KEY];
        } catch {}
        if (!sentinelGlobalApi || sentinelGlobalApi !== sentinelResult.api) {
            return reject('play-layer-binding-sentinel-api-mismatch');
        }
        let sentinelGlobalDescriptor;
        try {
            sentinelGlobalDescriptor = Object.getOwnPropertyDescriptor(window, SENTINEL_KEY);
        } catch {}
        if (!sentinelGlobalDescriptor
            || sentinelGlobalDescriptor.value !== sentinelResult.api
            || sentinelGlobalDescriptor.writable !== false
            || sentinelGlobalDescriptor.configurable !== false) {
            return reject('play-layer-binding-sentinel-api-descriptor-mismatch');
        }
        let sentinelSnapshot = null;
        try {
            sentinelSnapshot = sentinelResult.api.snapshot();
        } catch {}
        if (!sentinelSnapshot
            || sentinelSnapshot.schema !== SENTINEL_SCHEMA
            || sentinelSnapshot.valid !== true) {
            return reject('play-layer-binding-sentinel-invalid');
        }
        if (!sentinelSnapshot.install
            || sentinelSnapshot.install.status !== 'installed'
            || sentinelSnapshot.install.playWrapped !== true) {
            return reject('play-layer-binding-sentinel-install-invalid');
        }
        const sentinelActions = sentinelSnapshot.coverage && sentinelSnapshot.coverage.mediaSessionActions;
        if (!Array.isArray(sentinelActions)
            || sentinelActions.length !== SENTINEL_ACTIONS.length
            || !SENTINEL_ACTIONS.every((action) => sentinelActions.indexOf(action) >= 0)) {
            return reject('play-layer-binding-sentinel-coverage-invalid');
        }
        let currentDescriptor;
        try {
            currentDescriptor = Object.getOwnPropertyDescriptor(playMethod.owner, 'play');
        } catch {}
        if (!currentDescriptor
            || typeof currentDescriptor.value !== 'function'
            || currentDescriptor.value === playMethod.wrapper) {
            return reject('play-layer-binding-outer-mismatch');
        }
        playLayerBinding = {
            owner: playMethod.owner,
            sentinelKey: SENTINEL_KEY,
            sentinelApi: sentinelResult.api,
            sentinelGlobalDescriptor: { ...sentinelGlobalDescriptor },
            priorDescriptor: { ...priorDescriptor },
            outerDescriptor: { ...currentDescriptor },
            boundAt: clock(),
        };
        appendEvent('play-layer-bound', {
            sentinelSchema: sentinelSnapshot.schema,
            outerType: typeof currentDescriptor.value,
        });
        return { bound: true, valid: computeValid(), reason: null };
    }

    // Trust registry is only used to accept an explicitly retained prior API
    // instance for idempotence. An arbitrary existing global is never trusted.
    try {
        trustRegistry = window[TRUST_KEY];
    } catch {}
    if (!trustRegistry || typeof trustRegistry.has !== 'function' || typeof trustRegistry.add !== 'function') {
        try {
            if (typeof window.WeakSet === 'function') {
                trustRegistry = new window.WeakSet();
                Object.defineProperty(window, TRUST_KEY, {
                    value: trustRegistry,
                    writable: false,
                    configurable: false,
                    enumerable: false,
                });
            } else {
                trustRegistry = null;
            }
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
        describe,
    };
    Object.defineProperty(api, '__marker', { value: MARKER, enumerable: false });
    Object.freeze(api);
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
        installationDocument = window.document || null;
    } catch {
        installationDocument = null;
    }
    try {
        realmValid = window.window === window
            && window.document
            && window.document.defaultView === window
            && window.navigator !== undefined;
    } catch {
        realmValid = false;
    }
    if (!realmValid) {
        markInvalid('wrong-realm');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'wrong-realm' };
    }

    if (typeof window.URL !== 'function') {
        installStatus = 'unsupported';
        markInvalid('unsupported-url');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-url' };
    }
    try {
        origin = window.location && typeof window.location.origin === 'string'
            ? window.location.origin
            : null;
        if (origin) {
            const parsed = new window.URL(origin);
            originValid = (parsed.protocol === 'http:' || parsed.protocol === 'https:')
                && (parsed.hostname === '127.0.0.1'
                    || parsed.hostname === 'localhost'
                    || parsed.hostname === '::1'
                    || parsed.hostname === '[::1]');
        }
    } catch {
        originValid = false;
    }
    if (!originValid) {
        installStatus = 'blocked';
        markInvalid('wrong-origin');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'wrong-origin' };
    }

    if (readyStateAtInstall !== 'loading') {
        markInvalid('late-installation', { readyState: readyStateAtInstall });
    }

    if (typeof window.WeakMap !== 'function') {
        installStatus = 'unsupported';
        markInvalid('unsupported-weakmap');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-weakmap' };
    }
    if (typeof window.WeakSet !== 'function') {
        installStatus = 'unsupported';
        markInvalid('unsupported-weakset');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-weakset' };
    }
    if (typeof window.WeakRef !== 'function') {
        installStatus = 'unsupported';
        markInvalid('unsupported-weakref');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-weakref' };
    }
    if (typeof window.MutationObserver !== 'function') {
        installStatus = 'unsupported';
        markInvalid('unsupported-mutation-observer');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-mutation-observer' };
    }
    if (typeof window.Audio !== 'function') {
        installStatus = 'unsupported';
        markInvalid('unsupported-audio');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-audio' };
    }
    if (typeof window.HTMLMediaElement !== 'function' || !window.HTMLMediaElement.prototype) {
        installStatus = 'unsupported';
        markInvalid('unsupported-media-element');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-media-element' };
    }

    originalAudio = window.Audio;
    mediaPrototype = originalAudio.prototype;
    originalAudioDescriptor = Object.getOwnPropertyDescriptor(window, 'Audio');
    if (!mediaPrototype
        || !originalAudioDescriptor
        || !Object.prototype.hasOwnProperty.call(originalAudioDescriptor, 'value')
        || originalAudioDescriptor.value !== originalAudio) {
        installStatus = 'unsupported';
        markInvalid('unsupported-audio-descriptor');
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'unsupported-audio-descriptor' };
    }

    const methodFindings = {};
    for (const name of REQUIRED_METHODS) {
        const found = findDescriptor(mediaPrototype, name);
        if (!found || typeof found.descriptor.value !== 'function') {
            installStatus = 'unsupported';
            markInvalid(`unsupported-method-${name}`);
            return { installed: false, idempotent: false, diagnosticValid: false, reason: `unsupported-method-${name}` };
        }
        methodFindings[name] = found;
    }
    for (const name of OPTIONAL_METHODS) {
        const found = findDescriptor(mediaPrototype, name);
        if (!found || typeof found.descriptor.value !== 'function') {
            methodCoverage[name] = 'unavailable';
            missingOptionalApis.push(name);
            absentOptionalApis.push({ name, kind: 'method' });
        } else {
            methodFindings[name] = found;
        }
    }
    const setterFindings = {};
    for (const name of REQUIRED_SETTERS) {
        const found = findDescriptor(mediaPrototype, name);
        if (!found || typeof found.descriptor.set !== 'function') {
            installStatus = 'unsupported';
            markInvalid(`unsupported-setter-${name}`);
            return { installed: false, idempotent: false, diagnosticValid: false, reason: `unsupported-setter-${name}` };
        }
        setterFindings[name] = found;
    }
    for (const name of OPTIONAL_SETTERS) {
        const found = findDescriptor(mediaPrototype, name);
        if (!found || typeof found.descriptor.set !== 'function') {
            setterCoverage[name] = 'unavailable';
            missingOptionalApis.push(name);
            absentOptionalApis.push({ name, kind: 'setter' });
        } else {
            setterFindings[name] = found;
        }
    }

    audioWrapper = function InstalledNativeMediaAudio() {
        if (new.target === undefined) {
            return Reflect.apply(originalAudio, this, arguments);
        }
        const subclass = new.target !== audioWrapper;
        const nativeNewTarget = subclass ? new.target : originalAudio;
        const element = Reflect.construct(originalAudio, arguments, nativeNewTarget);
        try {
            registerElement(element, subclass);
        } catch {
            markInvalid('constructor-registration-failure');
        }
        return element;
    };
    audioWrapper.prototype = originalAudio.prototype;

    const rollback = [];
    try {
        const audioInstalled = {
            value: audioWrapper,
            writable: originalAudioDescriptor.writable,
            configurable: originalAudioDescriptor.configurable,
            enumerable: originalAudioDescriptor.enumerable,
        };
        Object.defineProperty(window, 'Audio', audioInstalled);
        installedAudioDescriptor = Object.getOwnPropertyDescriptor(window, 'Audio');
        rollback.push(() => Object.defineProperty(window, 'Audio', originalAudioDescriptor));

        for (const name of REQUIRED_METHODS) {
            wrapMethod(methodFindings[name], name);
        }
        for (const name of OPTIONAL_METHODS) {
            if (methodFindings[name]) wrapMethod(methodFindings[name], name);
        }
        for (const name of REQUIRED_SETTERS) {
            wrapSetter(setterFindings[name], name);
        }
        for (const name of OPTIONAL_SETTERS) {
            if (setterFindings[name]) wrapSetter(setterFindings[name], name);
        }
    } catch {
        markInvalid('install-write-failed');
        installStatus = 'partial';
        for (const step of rollback.reverse()) {
            try {
                step();
            } catch {
                markInvalid('rollback-failure');
            }
        }
        return { installed: false, idempotent: false, diagnosticValid: false, reason: 'install-write-failed' };
    }

    installStatus = 'installed';
    appendEvent('install', {
        readyState: readyStateAtInstall,
        origin,
        methods: { ...methodCoverage },
        setters: { ...setterCoverage },
        missingOptionalApis: missingOptionalApis.slice(),
        absenceAudit: absenceAuditReport(),
    });

    const diagnosticValid = computeValid();
    if (diagnosticValid && trustRegistry) {
        try {
            trustRegistry.add(api);
        } catch {}
    }
    const installation = {
        installed: true,
        idempotent: false,
        diagnosticValid,
        reason: null,
        api,
    };
    Object.defineProperty(installation, 'bindPlayLayer', {
        value: bindPlayLayer,
        writable: false,
        configurable: false,
        enumerable: false,
    });
    return installation;
}

module.exports = { installNativeMediaMutationProvenance };
