'use strict';

// Pure controlled-QA native media loop-cycle evidence correlator.
//
// This module joins already-captured raw evidence. It performs no filesystem,
// network, process, browser, Windows, credential or settings access and never
// mutates its input. It is a prerequisite only: success is scoped to the exact
// controlled profile below, does not admit a network failure, does not change
// the existing completion guard, and is not acceptance, default-control,
// universal, adversarial or gap-free proof.
//
// Input contract (all values are required; malformed values are rejected):
//
// binding: {
//   sourceSha40, packageSha40,                 // exact lower-case SHA-40
//   runtime: { browser, electron, revision },  // exact pinned supported runtime
//   frameUrl, origin, documentGeneration,      // same local document
//   profile: 'awwv.controlled-native-media-loop-cycle.v1',
//   collectionReady: { dateNow, performanceNow, timeOrigin },
//   generationInstalled: { dateNow, performanceNow }
// }
// provenance: {
//   snapshot: __AWWV_NATIVE_MEDIA_MUTATION_PROVENANCE__ final snapshot,
//   selected: exact describe(element) result for the controlled Audio element
// }
// sentinel: __AWWV_NATIVE_MEDIA_SEEK_SENTINEL__ final snapshot
// media: passive startMediaOriginProbe final snapshot
//   (awwv.native-media-origin-probe.v1); renderer probe control must be disabled
// lifecycleSignals: QA ambient lifecycle entries, each carrying clock =
//   { dateNow, performanceNow, timeOrigin } captured together at record time
//   plus clockReadErrors (empty for eligible observations), and each relevant
//   entry augmented with controlledProvenance = exact describe(element) at
//   record time. Missing/error clocks never become eligible. The old QA
//   elementId/sourceEpoch may differ from the helper object
//   id/epoch; the former must stay consistent across the selected cycle and
//   the latter must identify the selected Audio object at helper sourceEpoch 1.
// selected: { preSeek, seeking, seeked, playing, confirmation }, each an object
//   with the exact { signalSequence } of an entry in lifecycleSignals
// clockProjection: existing projectClocks result with requestWallTimeS,
//   protocolTimestamps { request, response, failure }, projectedObservedAtMs
//   { request, response, failure }, observationWindow
//
// The first narrow profile supports only the initial successful constructor URL
// (provenance sourceEpoch 1) with exactly one Media load generation. Same-URL
// reloads, multiple loads and other epochs are deliberately unresolved.
//
// Explicit controlled-QA contract extension: when no fresh zero start exists,
// the most recent fresh DOM `playing` anchor may be a positive-position resume.
// That separately labelled `observed-resume` mode additionally requires the DOM
// anchor's recorded continuity link to identify exactly one application play
// attempt sequence/epoch, a successful recorded call return for that exact
// attempt, and one unique native kPlay aligned inside the retained 20ms fence
// to that attempt AND to its recorded call return. The later DOM notification
// may arrive well after the call return: WHATWG play() returns a promise and
// queues `playing` asynchronously, so no call-to-notification latency bound is
// claimed. The mode also requires settled prior pause/seek activity,
// uninterrupted observed progression to the same fresh kEnded, unique zero
// seek, post-seek pipeline kPlaying and advancing zero completion. It proves
// only the observed resume-to-end segment and reset; it is not an entirely
// observed cycle, not interrupted-sound proof, and it never substitutes kPlay
// for the post-seek pipeline kPlaying or DOM completion.

const PROFILE = 'awwv.controlled-native-media-loop-cycle.v1';
const OBSERVED_RESUME_CLAIM = 'observed resume-to-end segment and reset; not an entirely observed cycle or uninterrupted sound';
const MUTATION_SCHEMA = 'awwv.native-media-mutation-provenance.v1';
const MUTATION_PROFILE = 'controlled-qa-native-media-mutation-provenance';
const SENTINEL_SCHEMA = 'awwv.native-media-seek-sentinel.v1';
const MEDIA_SCHEMA = 'awwv.native-media-origin-probe.v1';
const ABSENCE_SCHEMA = 'awwv.native-media-optional-absence-audit.v1';
const SHA40 = /^[0-9a-f]{40}$/;
const AMBIENT_PATH = /^\/assets\/ambient_(?:warroom|field|archive)-[A-Za-z0-9_-]+\.ogg$/;
const UTC_CREATED = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))? UTC$/;
const CLOCK_FENCE_MS = 20;
const SUPPORTED_RUNTIME = Object.freeze({
    browser: 'Chrome/146.0.7680.80',
    electron: '41.0.3',
    revision: '@f08938029c887ea624da7a1717059788ed95034d',
});
const CLOCK_MODEL = 'shared-monotonic-renderer-anchor-v1';
const MEDIA_RECORD_EVENTS = [
    'Media.playerCreated',
    'Media.playerPropertiesChanged',
    'Media.playerEventsAdded',
    'Media.playerMessagesLogged',
    'Media.playerErrorsRaised',
];
const MEDIA_SESSION_ACTIONS = ['seekto', 'seekforward', 'seekbackward'];
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

class Rejection extends Error {
    constructor(reason) {
        super(reason);
        this.name = 'Rejection';
    }
}

function reject(reason) {
    throw new Rejection(reason);
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value) {
    return Number.isSafeInteger(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}

function requirePlain(value, reason) {
    if (!isPlainObject(value)) reject(reason);
    return value;
}

function requireFinite(value, reason) {
    if (!isFiniteNumber(value)) reject(reason);
    return value;
}

function requireInteger(value, reason) {
    if (!isInteger(value)) reject(reason);
    return value;
}

function requireNonEmptyString(value, reason) {
    if (!isNonEmptyString(value)) reject(reason);
    return value;
}

function requireEmptyArray(value, reason) {
    if (!Array.isArray(value) || value.length !== 0) reject(reason);
    return value;
}

function requireEmptyObject(value, reason) {
    if (!isPlainObject(value) || Object.keys(value).length !== 0) reject(reason);
    return value;
}

function clone(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
}

function parseFrameUrl(value, expectedOrigin) {
    requireNonEmptyString(value, 'binding.frameUrl');
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        reject('binding.frameUrl');
    }
    if (parsed.protocol !== 'http:') reject('binding.frameUrl');
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
        reject('binding.frameUrl');
    }
    if (parsed.username !== '' || parsed.password !== '') reject('binding.frameUrl');
    if (parsed.origin !== expectedOrigin) reject('binding.frameUrl');
    return parsed;
}

function parseAmbientUrl(value, expectedOrigin) {
    if (!isNonEmptyString(value)) reject('provenance.source');
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        reject('provenance.source');
    }
    if (parsed.protocol !== 'http:') reject('provenance.source');
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
        reject('provenance.source');
    }
    if (parsed.origin !== expectedOrigin) reject('provenance.source');
    if (parsed.username !== '' || parsed.password !== '') reject('provenance.source');
    if (parsed.search !== '' || parsed.hash !== '') reject('provenance.source');
    if (!AMBIENT_PATH.test(parsed.pathname)) reject('provenance.source');
    return { url: value, origin: parsed.origin, pathname: parsed.pathname };
}

function parseUtcCreated(value) {
    requireNonEmptyString(value, 'media.utc-created');
    const match = UTC_CREATED.exec(value);
    if (!match) reject('media.utc-created');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    if (month < 1 || month > 12 || day < 1 || day > 31) reject('media.utc-created');
    if (hour > 23 || minute > 59 || second > 59) reject('media.utc-created');
    const whole = Date.UTC(year, month - 1, day, hour, minute, second);
    const check = new Date(whole);
    if (check.getUTCFullYear() !== year
        || check.getUTCMonth() !== month - 1
        || check.getUTCDate() !== day
        || check.getUTCHours() !== hour
        || check.getUTCMinutes() !== minute
        || check.getUTCSeconds() !== second) {
        reject('media.utc-created');
    }
    const fraction = match[7] || '';
    const milliseconds = fraction.length === 0
        ? 0
        : Number(fraction) / (10 ** (fraction.length - 3));
    const valueMs = whole + milliseconds;
    if (!isFiniteNumber(valueMs)) reject('media.utc-created');
    return valueMs;
}

function validateEventClockShape(value, reason) {
    requirePlain(value, reason);
    const dateNow = requireFinite(value.dateNow, reason);
    const performanceNow = requireFinite(value.performanceNow, reason);
    if (dateNow <= 0 || performanceNow < 0) reject(reason);
    return { dateNow, performanceNow };
}

function validateClockPair(value, timeOrigin, reason) {
    const clocks = validateEventClockShape(value, reason);
    if (Math.abs(clocks.dateNow - (timeOrigin + clocks.performanceNow)) > CLOCK_FENCE_MS) {
        reject(reason);
    }
    return clocks;
}

// Every lifecycle observation must carry the three values captured together in
// the renderer. The values are validated independently; no field is inferred
// from another observation or from the observation wall time.
function validateDocumentClock(value, binding, reason) {
    requirePlain(value, reason);
    const dateNow = requireFinite(value.dateNow, reason);
    const performanceNow = requireFinite(value.performanceNow, reason);
    const timeOrigin = requireFinite(value.timeOrigin, reason);
    if (dateNow <= 0 || performanceNow < 0 || timeOrigin <= 0) reject(reason);
    if (timeOrigin !== binding.timeOrigin) reject(`${reason}.origin`);
    return { dateNow, performanceNow, timeOrigin };
}

function validateBinding(binding) {
    requirePlain(binding, 'binding');
    requireNonEmptyString(binding.sourceSha40, 'binding.sourceSha40');
    requireNonEmptyString(binding.packageSha40, 'binding.packageSha40');
    if (!SHA40.test(binding.sourceSha40) || !SHA40.test(binding.packageSha40)) {
        reject('binding.sha40');
    }
    const runtime = requirePlain(binding.runtime, 'binding.runtime');
    if (runtime.browser !== SUPPORTED_RUNTIME.browser
        || runtime.electron !== SUPPORTED_RUNTIME.electron
        || runtime.revision !== SUPPORTED_RUNTIME.revision) {
        reject('binding.runtime');
    }
    requireNonEmptyString(binding.origin, 'binding.origin');
    const frame = parseFrameUrl(binding.frameUrl, binding.origin);
    requireNonEmptyString(binding.documentGeneration, 'binding.documentGeneration');
    if (binding.profile !== PROFILE) reject('binding.profile');

    const collectionReady = requirePlain(binding.collectionReady, 'binding.collectionReady');
    const timeOrigin = requireFinite(collectionReady.timeOrigin, 'binding.collectionReady');
    if (timeOrigin <= 0) reject('binding.collectionReady');
    const ready = validateClockPair(collectionReady, timeOrigin, 'binding.collectionReady');
    const generation = validateClockPair(
        binding.generationInstalled,
        timeOrigin,
        'binding.generationInstalled',
    );
    if (generation.dateNow > ready.dateNow || generation.performanceNow > ready.performanceNow) {
        reject('binding.generationInstalled');
    }
    return {
        frameUrl: binding.frameUrl,
        frameOrigin: frame.origin,
        origin: binding.origin,
        timeOrigin,
        collectionReady: ready,
        generationInstalled: generation,
        binding,
    };
}

function validateProjection(projection) {
    requirePlain(projection, 'clockProjection');
    const wallTimeS = requireFinite(projection.requestWallTimeS, 'clockProjection.requestWallTimeS');
    if (wallTimeS <= 0) reject('clockProjection.requestWallTimeS');
    const protocol = requirePlain(projection.protocolTimestamps, 'clockProjection.protocolTimestamps');
    const requestTimestamp = requireFinite(protocol.request, 'clockProjection.protocolTimestamps');
    const responseTimestamp = requireFinite(protocol.response, 'clockProjection.protocolTimestamps');
    const failureTimestamp = requireFinite(protocol.failure, 'clockProjection.protocolTimestamps');
    if (!(requestTimestamp <= responseTimestamp && responseTimestamp <= failureTimestamp)) {
        reject('clockProjection.protocolTimestamps');
    }
    const projected = requirePlain(projection.projectedObservedAtMs, 'clockProjection.projectedObservedAtMs');
    const requestMs = requireFinite(projected.request, 'clockProjection.projectedObservedAtMs');
    const responseMs = requireFinite(projected.response, 'clockProjection.projectedObservedAtMs');
    const failureMs = requireFinite(projected.failure, 'clockProjection.projectedObservedAtMs');
    const expectedRequest = wallTimeS * 1000;
    const expectedResponse = expectedRequest + (responseTimestamp - requestTimestamp) * 1000;
    const expectedFailure = expectedRequest + (failureTimestamp - requestTimestamp) * 1000;
    if (Math.abs(requestMs - expectedRequest) > 0.01) reject('clockProjection.request-anchor');
    if (Math.abs(responseMs - expectedResponse) > 0.01) reject('clockProjection.projection');
    if (Math.abs(failureMs - expectedFailure) > 0.01) reject('clockProjection.projection');
    if (!(requestMs <= responseMs && responseMs <= failureMs)) reject('clockProjection.projection');

    const window = requirePlain(projection.observationWindow, 'clockProjection.observationWindow');
    if (window.clock !== 'node-epoch-ms') reject('clockProjection.observationWindow');
    const openedAtMs = requireFinite(window.openedAtMs, 'clockProjection.observationWindow');
    const closedAtMs = requireFinite(window.closedAtMs, 'clockProjection.observationWindow');
    if (!(openedAtMs <= closedAtMs)) reject('clockProjection.observationWindow');
    for (const value of [requestMs, responseMs, failureMs]) {
        if (value < openedAtMs || value > closedAtMs) reject('clockProjection.observationWindow');
    }
    return {
        wallTimeS,
        protocolTimestamps: { request: requestTimestamp, response: responseTimestamp, failure: failureTimestamp },
        projectedObservedAtMs: { request: requestMs, response: responseMs, failure: failureMs },
        observationWindow: { clock: 'node-epoch-ms', openedAtMs, closedAtMs },
    };
}

function validateAbsenceAudit(audit) {
    requirePlain(audit, 'provenance.absenceAudit');
    if (audit.schema !== ABSENCE_SCHEMA
        || audit.recordedAt !== 'installation'
        || audit.recheckedOnEveryValidation !== true
        || audit.prototypeChain !== 'all'
        || audit.instanceShadows !== 'rejected'
        || audit.readFailure !== 'fail-closed'
        || audit.laterAppearance !== 'reject'
        || audit.presentButUnwrapped !== 'reject') {
        reject('provenance.absenceAudit');
    }
    if (!Array.isArray(audit.entries)) reject('provenance.absenceAudit.entries');
    const names = new Set();
    for (const entry of audit.entries) {
        requirePlain(entry, 'provenance.absenceAudit.entry');
        requireNonEmptyString(entry.name, 'provenance.absenceAudit.entry');
        if (entry.kind !== 'method' && entry.kind !== 'setter') {
            reject('provenance.absenceAudit.entry.kind');
        }
        if (entry.status !== 'absent') reject('provenance.absenceAudit.entry.status');
        if (names.has(entry.name)) reject('provenance.absenceAudit.duplicate');
        names.add(entry.name);
    }
    return names;
}

function validateOptionalCoverage(install, coverage, names, property, documentedAbsence) {
    const installStatuses = requirePlain(install[property], 'provenance.install.coverage');
    const coverageStatuses = requirePlain(coverage[property], 'provenance.coverage');
    const declaredMissing = new Set();
    for (const name of names) {
        const installed = installStatuses[name];
        const covered = coverageStatuses[name];
        if (installed === undefined || covered === undefined) {
            reject(`provenance.${property}.${name}`);
        }
        if (installed === 'wrapped' && covered === 'wrapped') {
            if (documentedAbsence.has(name)) {
                reject(`provenance.${property}.${name}.absence-conflict`);
            }
            continue;
        }
        if (installed === 'unavailable' && covered === 'unavailable') {
            if (!documentedAbsence.has(name)) {
                reject(`provenance.${property}.${name}.undocumented-absence`);
            }
            declaredMissing.add(name);
            continue;
        }
        reject(`provenance.${property}.${name}.unsupported`);
    }
    return declaredMissing;
}

function validateOptionalApiCoverage(install, coverage) {
    if (!isPlainObject(install.absenceAudit) || !isPlainObject(coverage.absenceAudit)) {
        reject('provenance.absenceAudit');
    }
    if (JSON.stringify(install.absenceAudit) !== JSON.stringify(coverage.absenceAudit)) {
        reject('provenance.absenceAudit.consistency');
    }
    const documentedAbsence = validateAbsenceAudit(install.absenceAudit);
    const absentMethods = validateOptionalCoverage(
        install,
        coverage,
        OPTIONAL_METHODS,
        'methods',
        documentedAbsence,
    );
    const absentSetters = validateOptionalCoverage(
        install,
        coverage,
        OPTIONAL_SETTERS,
        'setters',
        documentedAbsence,
    );
    for (const name of [...absentMethods, ...absentSetters]) {
        const entry = install.absenceAudit.entries.find((candidate) => candidate.name === name);
        const expectedKind = OPTIONAL_METHODS.includes(name) ? 'method' : 'setter';
        if (!entry || entry.kind !== expectedKind) reject('provenance.absenceAudit.entry');
    }
    const expectedAbsent = new Set([...absentMethods, ...absentSetters]);
    if (expectedAbsent.size !== documentedAbsence.size) reject('provenance.absenceAudit.entry');
    for (const name of documentedAbsence) {
        if (!expectedAbsent.has(name)) reject('provenance.absenceAudit.entry');
    }
    for (const list of [install.unsupportedOptionalApis, coverage.missingOptionalApis]) {
        if (!Array.isArray(list) || !list.every(isNonEmptyString)) {
            reject('provenance.absenceAudit.lists');
        }
        if (new Set(list).size !== list.length) reject('provenance.absenceAudit.lists');
        const listed = new Set(list);
        if (listed.size !== expectedAbsent.size
            || [...expectedAbsent].some((name) => !listed.has(name))) {
            reject('provenance.absenceAudit.lists');
        }
    }
    return documentedAbsence;
}

function validateDescribeCore(describe, binding, reason) {
    requirePlain(describe, reason);
    if (describe.schema !== MUTATION_SCHEMA) reject(`${reason}.schema`);
    if (describe.diagnosticOnly !== true || describe.diagnosticValid !== true || describe.valid !== true) {
        reject(`${reason}.valid`);
    }
    if (describe.reason !== null) reject(`${reason}.reason`);
    const element = requirePlain(describe.element, `${reason}.element`);
    requireNonEmptyString(element.id, `${reason}.element`);
    if (element.alive !== true
        || element.supported !== true
        || element.subclass !== false
        || element.createdByInstalledConstructor !== true
        || element.sourceIsAmbient !== true) {
        reject(`${reason}.element`);
    }
    requireInteger(element.constructorSequence, `${reason}.element`);
    if (element.constructorSequence <= 0) reject(`${reason}.element`);
    requireInteger(element.sourceEpoch, `${reason}.element`);
    requireNonEmptyString(element.source, `${reason}.element`);
    if (element.origin !== binding.origin) reject(`${reason}.element.origin`);
    const provenance = requirePlain(describe.provenance, `${reason}.provenance`);
    if (provenance.profile !== MUTATION_PROFILE
        || provenance.sourceEpochSemantics !== 'monotonic-per-object'
        || provenance.sameUrlReloadAdvancesEpoch !== true
        || provenance.initialSetupValid !== true
        || provenance.laterMutations !== 'explicit-evidence') {
        reject(`${reason}.provenance`);
    }
    const attributes = requirePlain(provenance.attributes, `${reason}.attributes`);
    if (attributes.src !== element.source) reject(`${reason}.attributes`);
    if (!Object.prototype.hasOwnProperty.call(attributes, 'preload')
        || !(attributes.preload === null || typeof attributes.preload === 'string')) {
        reject(`${reason}.attributes.preload`);
    }
    if (provenance.autoplayEnabled !== false) reject(`${reason}.autoplay`);
    const srcObject = requirePlain(provenance.srcObject, `${reason}.srcObject`);
    if (srcObject.present !== false || srcObject.type !== 'none') reject(`${reason}.srcObject`);
    requireEmptyArray(provenance.ownShadows, `${reason}.ownShadows`);
    requireEmptyObject(provenance.readErrors, `${reason}.readErrors`);
    const observer = requirePlain(provenance.observer, `${reason}.observer`);
    if (observer.overflow !== false
        || observer.unexplained !== 0
        || observer.drainedBeforeValidation !== true) {
        reject(`${reason}.observer`);
    }
    requireInteger(observer.recordsSeen, `${reason}.observer`);
    if (observer.recordsSeen < 0) reject(`${reason}.observer`);
    return { describe, element, provenance };
}

function validateProvenance(provenance, binding) {
    requirePlain(provenance, 'provenance');
    const snapshot = requirePlain(provenance.snapshot, 'provenance.snapshot');
    if (snapshot.schema !== MUTATION_SCHEMA) reject('provenance.schema');
    if (snapshot.diagnosticOnly !== true
        || snapshot.applicationAcceptance !== false
        || snapshot.universalProvenance !== false
        || snapshot.valid !== true) {
        reject('provenance.snapshot.valid');
    }
    requireNonEmptyString(snapshot.label, 'provenance.snapshot.label');
    requireEmptyArray(snapshot.invalidReasons, 'provenance.snapshot.invalidReasons');

    const coverage = requirePlain(snapshot.coverage, 'provenance.coverage');
    if (coverage.profile !== MUTATION_PROFILE
        || coverage.diagnosticOnly !== true
        || coverage.productionDefaultControls !== false
        || coverage.applicationAcceptance !== false
        || coverage.universalProvenance !== false
        || coverage.exactObjectIdentity !== true
        || coverage.sameRealmInstalledAudioConstructorOnly !== true
        || coverage.autoplay !== 'rejected'
        || coverage.sourceChildren !== 'unsupported-invalidating'
        || coverage.unknownCreation !== 'unsupported-invalidating'
        || coverage.browserTamperResistance !== false) {
        reject('provenance.coverage');
    }
    if (!Array.isArray(coverage.attributesCaptured)
        || !['src', 'loop', 'controls', 'autoplay', 'preload']
            .every((name) => coverage.attributesCaptured.includes(name))) {
        reject('provenance.coverage.attributesCaptured');
    }
    const epochSemantics = requirePlain(coverage.sourceEpoch, 'provenance.coverage.sourceEpoch');
    if (epochSemantics.initialNonEmptySourceEpoch !== 1
        || epochSemantics.emptySourceEpoch !== 0
        || epochSemantics.sameUrlReloadAdvancesEpoch !== true
        || epochSemantics.urlEqualityPreservesEpoch !== false
        || epochSemantics.constructorSetupCountsAsInitial !== true) {
        reject('provenance.coverage.sourceEpoch');
    }

    const install = requirePlain(snapshot.install, 'provenance.install');
    if (install.status !== 'installed'
        || install.readyStateAtInstall !== 'loading'
        || install.realmValid !== true
        || install.originValid !== true
        || install.origin !== binding.origin
        || install.lateInstallation !== false
        || install.constructorWrapped !== true
        || install.playLayerBound !== true
        || install.apiFrozen !== true) {
        reject('provenance.install');
    }
    const installedAt = validateEventClockShape(
        install.installedAt,
        'provenance.install.installedAt',
    );
    if (Math.abs(installedAt.dateNow - binding.generationInstalled.dateNow) > CLOCK_FENCE_MS
        || Math.abs(installedAt.performanceNow - binding.generationInstalled.performanceNow) > CLOCK_FENCE_MS) {
        reject('provenance.install.installedAt');
    }
    for (const name of REQUIRED_METHODS) {
        if (install.methods?.[name] !== 'wrapped' || coverage.methods?.[name] !== 'wrapped') {
            reject(`provenance.methods.${name}`);
        }
    }
    for (const name of REQUIRED_SETTERS) {
        if (install.setters?.[name] !== 'wrapped' || coverage.setters?.[name] !== 'wrapped') {
            reject(`provenance.setters.${name}`);
        }
    }
    validateOptionalApiCoverage(install, coverage);

    const events = requirePlain(snapshot.events, 'provenance.events');
    requireInteger(events.capacity, 'provenance.events');
    requireInteger(events.count, 'provenance.events');
    requireInteger(events.dropped, 'provenance.events');
    if (events.truncated !== false || events.dropped !== 0) reject('provenance.events.truncated');
    if (!Array.isArray(events.records) || events.count !== events.records.length) {
        reject('provenance.events.count');
    }
    if (events.count > events.capacity) reject('provenance.events.capacity');

    const previousSequences = new Set();
    let previousSequence = 0;
    const normalizedEvents = [];
    for (let index = 0; index < events.records.length; index += 1) {
        const event = requirePlain(events.records[index], 'provenance.events.record');
        const sequence = requireInteger(event.sequence, 'provenance.events.sequence');
        requireNonEmptyString(event.kind, 'provenance.events.kind');
        if (sequence !== index + 1
            || sequence <= previousSequence
            || previousSequences.has(sequence)) {
            reject('provenance.events.sequence');
        }
        previousSequence = sequence;
        previousSequences.add(sequence);
        const clocks = validateEventClockShape(event.at, 'provenance.events.clock');
        normalizedEvents.push({ event, index, clocks });
    }

    const installEvents = normalizedEvents.filter((entry) => entry.event.kind === 'install');
    if (installEvents.length !== 1) reject('provenance.install-event');

    const describeResult = validateDescribeCore(provenance.selected, binding, 'provenance.selected');
    const selectedElement = describeResult.element;
    const selectedId = selectedElement.id;
    if (selectedElement.sourceEpoch !== 1) reject('provenance.source-epoch');
    const source = parseAmbientUrl(selectedElement.source, binding.origin).url;

    const registry = requirePlain(snapshot.registry, 'provenance.registry');
    requireInteger(registry.capacity, 'provenance.registry');
    requireInteger(registry.count, 'provenance.registry');
    if (registry.overflow !== false) reject('provenance.registry.overflow');
    requireEmptyArray(registry.duplicateSources, 'provenance.registry.duplicateSources');
    if (!Array.isArray(registry.entries) || registry.count !== registry.entries.length) {
        reject('provenance.registry.count');
    }
    if (registry.count > registry.capacity) reject('provenance.registry.capacity');
    const entryIds = new Set();
    let selectedEntry = null;
    for (const rawEntry of registry.entries) {
        const entry = requirePlain(rawEntry, 'provenance.registry.entry');
        requireNonEmptyString(entry.id, 'provenance.registry.entry');
        if (entryIds.has(entry.id)) reject('provenance.registry.duplicate-id');
        entryIds.add(entry.id);
        if (entry.source === source) {
            if (entry.id !== selectedId || selectedEntry) reject('provenance.registry.ambiguous-source');
            selectedEntry = entry;
        }
        if (entry.id === selectedId && entry.source !== source) {
            reject('provenance.registry.selected-source');
        }
    }
    if (!selectedEntry) reject('provenance.registry.selected');
    if (selectedEntry.alive !== true
        || selectedEntry.supported !== true
        || selectedEntry.subclass !== false
        || selectedEntry.sourceEpoch !== 1
        || selectedEntry.sourceIsAmbient !== true
        || selectedEntry.admissible !== true
        || selectedEntry.reason !== null) {
        reject('provenance.registry.selected');
    }
    requireEmptyObject(selectedEntry.readErrors, 'provenance.registry.selected.readErrors');
    if (selectedEntry.observer?.overflow !== false
        || selectedEntry.observer?.unexplained !== 0
        || selectedEntry.observer?.drainedBeforeValidation !== true) {
        reject('provenance.registry.selected.observer');
    }

    const selectedConstructs = normalizedEvents.filter((entry) => entry.event.kind === 'construct'
        && entry.event.id === selectedId);
    if (selectedConstructs.length !== 1) reject('provenance.selected.construct');
    const construct = selectedConstructs[0].event;
    if (construct.source !== source
        || construct.sourceEpoch !== 1
        || construct.subclass !== false
        || construct.constructorSequence !== selectedElement.constructorSequence) {
        reject('provenance.selected.construct');
    }
    const installEvent = installEvents[0].event;
    if (construct.at.dateNow < installEvent.at.dateNow
        || construct.at.performanceNow < installEvent.at.performanceNow) {
        reject('provenance.selected.construct.generation');
    }
    const registeredAt = validateEventClockShape(
        selectedElement.registeredAt,
        'provenance.selected.registeredAt',
    );
    if (registeredAt.dateNow > construct.at.dateNow
        || registeredAt.performanceNow > construct.at.performanceNow
        || registeredAt.dateNow < installEvent.at.dateNow
        || registeredAt.performanceNow < installEvent.at.performanceNow) {
        reject('provenance.selected.registeredAt');
    }

    const attempts = new Map();
    const results = new Map();
    for (const entry of normalizedEvents) {
        const event = entry.event;
        if (event.kind === 'source-epoch' && event.id === selectedId) {
            reject('provenance.source-reset');
        }
        if (event.kind === 'invalidation') reject('provenance.invalidation');
        if (event.kind === 'mutation-attempt') {
            requireNonEmptyString(event.name, 'provenance.mutation-attempt');
            if (!isInteger(event.sequence)) reject('provenance.mutation-attempt');
            if (attempts.has(event.sequence)) reject('provenance.mutation-attempt');
            attempts.set(event.sequence, event);
        } else if (event.kind === 'mutation-result') {
            const attemptSequence = requireInteger(
                event.sequenceOfAttempt,
                'provenance.mutation-result.sequenceOfAttempt',
            );
            if (results.has(attemptSequence)) reject('provenance.mutation-result');
            if (event.outcome !== 'success' && event.outcome !== 'threw') {
                reject('provenance.mutation-result.outcome');
            }
            results.set(attemptSequence, event);
        }
    }
    for (const [sequence, attempt] of attempts) {
        const result = results.get(sequence);
        if (!result
            || result.sequence <= attempt.sequence
            || result.name !== attempt.name
            || result.targetType !== attempt.targetType
            || result.id !== attempt.id) {
            reject('provenance.mutation-stream');
        }
    }
    for (const sequence of results.keys()) {
        if (!attempts.has(sequence)) reject('provenance.mutation-stream');
    }

    return {
        snapshot,
        describe: describeResult,
        source,
        selectedId,
        selectedEntry,
        events: normalizedEvents,
        attempts,
        results,
        installEvent: installEvents[0].event,
        constructEvent: construct,
    };
}

// The selected seeking observation supplies the one renderer anchor used for
// the proof interval. It is never selected to minimize a residual. The anchor
// maps the captured performance timeline onto the captured local wall clock;
// a lifetime wall/performance offset remains a reported diagnostic.
function buildAnchorProjection(binding, selected) {
    const anchorEntry = selected.seeking;
    const anchor = anchorEntry.clock;
    if (!anchor || anchor.timeOrigin !== binding.timeOrigin) reject('lifecycle.clock.anchor');
    const localOffsetMs = anchor.dateNow - anchor.performanceNow;
    if (!isFiniteNumber(localOffsetMs)) reject('lifecycle.clock.anchor');
    return { anchorEntry, anchor, localOffsetMs };
}

function buildClockModel(binding, lifecycle) {
    const { anchorEntry, anchor, localOffsetMs } = lifecycle.anchorProjection;
    const proofStartMs = lifecycle.start.projectedAtMs;
    const proofEndMs = lifecycle.selected.confirmation.projectedAtMs;
    if (!(proofStartMs <= proofEndMs)) reject('lifecycle.clock.interval');
    return {
        anchorEntry,
        anchor,
        localOffsetMs,
        proofStartMs,
        proofEndMs,
        lateBoundaryMs: proofEndMs + CLOCK_FENCE_MS,
    };
}

function projectRendererMs(clockModel, clocks) {
    const projected = clockModel.localOffsetMs + clocks.performanceNow;
    if (!isFiniteNumber(projected)) reject('lifecycle.clock.projection');
    return projected;
}

function validateLifecycleClockModel(lifecycle, clockModel) {
    const source = lifecycle.selected.confirmation.signal.url;
    const relevant = lifecycle.signals.filter((entry) => entry.signal.elementId === lifecycle.qaElementId
        && entry.signal.sourceEpoch === lifecycle.qaSourceEpoch
        && entry.signal.url === source);
    let previousPerformanceNow = -Infinity;
    for (const entry of relevant) {
        const { performanceNow } = entry.clock;
        if (performanceNow < previousPerformanceNow) {
            reject('lifecycle.clock.chronology');
        }
        previousPerformanceNow = performanceNow;
    }
    for (const entry of relevant) {
        const { dateNow } = entry.clock;
        const projected = projectRendererMs(clockModel, entry.clock);
        const nearProof = projected >= clockModel.proofStartMs - CLOCK_FENCE_MS
            && projected <= clockModel.proofEndMs + CLOCK_FENCE_MS;
        if (nearProof && Math.abs(dateNow - projected) > CLOCK_FENCE_MS) {
            reject('lifecycle.clock.local');
        }
    }
}

function validateProvenanceEventClocks(provenance, clockModel) {
    let previousPerformanceNow = -Infinity;
    for (const entry of provenance.events) {
        const { dateNow, performanceNow } = entry.clocks;
        if (performanceNow < previousPerformanceNow) {
            reject('provenance.events.clock.chronology');
        }
        previousPerformanceNow = performanceNow;
        const projected = projectRendererMs(clockModel, entry.clocks);
        const dateLate = dateNow > clockModel.lateBoundaryMs;
        const performanceLate = projected > clockModel.lateBoundaryMs;
        if (dateLate !== performanceLate) reject('provenance.events.clock.membership');
        if (dateLate) continue;
        const nearProof = projected >= clockModel.proofStartMs - CLOCK_FENCE_MS
            || dateNow >= clockModel.proofStartMs - CLOCK_FENCE_MS;
        if (nearProof && Math.abs(dateNow - projected) > CLOCK_FENCE_MS) {
            reject('provenance.events.clock');
        }
    }
}

function validateSentinel(sentinel, binding) {
    requirePlain(sentinel, 'sentinel');
    if (sentinel.schema !== SENTINEL_SCHEMA) reject('sentinel.schema');
    if (sentinel.diagnosticOnly !== true
        || sentinel.naturalOriginAdmitted !== false
        || sentinel.valid !== true) {
        reject('sentinel.valid');
    }
    requireNonEmptyString(sentinel.label, 'sentinel.label');
    requireEmptyArray(sentinel.invalidReasons, 'sentinel.invalidReasons');
    const coverage = requirePlain(sentinel.coverage, 'sentinel.coverage');
    if (coverage.exactRegistryOnly !== true
        || coverage.osControl !== false
        || coverage.defaultMediaSession !== false
        || coverage.naturalLoopOrigin !== false
        || coverage.audioQuality !== false
        || coverage.sameUrlReloadProvenance !== false) {
        reject('sentinel.coverage');
    }
    if (!Array.isArray(coverage.mediaSessionActions)
        || coverage.mediaSessionActions.length !== MEDIA_SESSION_ACTIONS.length
        || !MEDIA_SESSION_ACTIONS.every((action) => coverage.mediaSessionActions.includes(action))) {
        reject('sentinel.coverage.actions');
    }
    const install = requirePlain(sentinel.install, 'sentinel.install');
    if (install.status !== 'installed'
        || install.readyStateAtInstall !== 'loading'
        || install.realmValid !== true
        || install.originValid !== true
        || install.origin !== binding.origin
        || install.playWrapped !== true
        || install.setActionHandlerWrapped !== true
        || install.apiFrozen !== true) {
        reject('sentinel.install');
    }
    const installedAt = validateEventClockShape(install.installedAt, 'sentinel.install.installedAt');
    if (Math.abs(installedAt.dateNow - binding.generationInstalled.dateNow) > CLOCK_FENCE_MS
        || Math.abs(installedAt.performanceNow - binding.generationInstalled.performanceNow) > CLOCK_FENCE_MS) {
        reject('sentinel.install.installedAt');
    }
    requireEmptyArray(install.registrationFailures, 'sentinel.install.registrationFailures');
    requireEmptyArray(install.rollback, 'sentinel.install.rollback');
    if (!Array.isArray(install.installedActions)
        || install.installedActions.length !== MEDIA_SESSION_ACTIONS.length
        || !MEDIA_SESSION_ACTIONS.every((action) => install.installedActions.includes(action))) {
        reject('sentinel.install.actions');
    }
    const events = requirePlain(sentinel.events, 'sentinel.events');
    requireInteger(events.capacity, 'sentinel.events');
    requireInteger(events.count, 'sentinel.events');
    requireInteger(events.dropped, 'sentinel.events');
    if (events.truncated !== false || events.dropped !== 0) reject('sentinel.events.truncated');
    if (!Array.isArray(events.records) || events.count !== events.records.length) {
        reject('sentinel.events.count');
    }
    if (events.count > events.capacity) reject('sentinel.events.capacity');
    let previous = 0;
    let previousPerformanceNow = -Infinity;
    for (let eventIndex = 0; eventIndex < events.records.length; eventIndex += 1) {
        const event = requirePlain(events.records[eventIndex], 'sentinel.events.record');
        const sequence = requireInteger(event.sequence, 'sentinel.events.sequence');
        if (sequence !== eventIndex + 1 || sequence <= previous) reject('sentinel.events.sequence');
        previous = sequence;
        const clocks = validateEventClockShape(event.at, 'sentinel.events.clock');
        if (clocks.performanceNow < previousPerformanceNow) reject('sentinel.events.clock');
        previousPerformanceNow = clocks.performanceNow;
        if (event.kind === 'media-session-action'
            || event.kind === 'action-registration'
            || event.kind === 'action-registration-failure') {
            reject('sentinel.action');
        }
    }
    const registry = requirePlain(sentinel.registry, 'sentinel.registry');
    requireInteger(registry.capacity, 'sentinel.registry');
    requireInteger(registry.count, 'sentinel.registry');
    requireEmptyArray(registry.duplicateSources, 'sentinel.registry.duplicateSources');
    if (!Array.isArray(registry.entries) || registry.count !== registry.entries.length) {
        reject('sentinel.registry.count');
    }
    if (registry.count > registry.capacity) reject('sentinel.registry.capacity');
    return sentinel;
}

function classifyMediaValue(value) {
    if (value.event === 'kPipelineStateChange') {
        if (value.pipeline_state === 'kPlaying') return 'playing';
        if (value.pipeline_state === 'kEnded') return 'ended';
        if (value.pipeline_state === 'kPaused' || value.pipeline_state === 'kSuspended') {
            return 'pause';
        }
        if (value.pipeline_state === 'kSeeking') return 'seeking-state';
        return 'benign';
    }
    if (value.event === 'kPlay') return 'resume-play';
    if (value.event === 'kPlaying') return 'playing';
    if (value.event === 'kEnded') return 'ended';
    if (value.event === 'kSeek') return 'seek';
    if (value.event === 'kLoad') return 'load';
    if (value.event === 'kPause') return 'pause';
    if (value.event === 'kError' || value.event === 'kMediaError' || value.event === 'kPlaybackError') {
        return 'error';
    }
    if (value.event === 'kDecoderEOF') return 'decoder-eof';
    return 'benign';
}

function validateMedia(media, binding, source) {
    requirePlain(media, 'media');
    if (media.schema !== MEDIA_SCHEMA) reject('media.schema');
    if (media.diagnosticOnly !== true
        || media.failClosedDiagnostic !== true
        || media.admission !== 'none'
        || media.status !== 'diagnostic-complete'
        || media.passive !== true) {
        reject('media.status');
    }
    const setup = requirePlain(media.setup, 'media.setup');
    if (setup.state !== 'ready'
        || setup.domain !== 'Media'
        || setup.enable?.attempted !== true
        || setup.enable?.succeeded !== true
        || setup.enable?.settled !== true) {
        reject('media.setup');
    }
    if (!Array.isArray(setup.subscriptions)
        || setup.subscriptions.length !== MEDIA_RECORD_EVENTS.length
        || !MEDIA_RECORD_EVENTS.every((event) => setup.subscriptions.includes(event))) {
        reject('media.setup.subscriptions');
    }
    const control = requirePlain(media.control, 'media.control');
    if (control.requested !== false || control.status !== 'disabled') reject('media.control');
    const caps = requirePlain(media.caps, 'media.caps');
    const metadata = requirePlain(media.metadata, 'media.metadata');
    const summary = requirePlain(media.summary, 'media.summary');
    const overflow = requirePlain(media.overflow, 'media.overflow');
    if (metadata.playersDropped !== 0
        || metadata.playersTruncated !== false
        || metadata.errorsRecorded !== 0
        || metadata.errorsDropped !== 0
        || metadata.errorsTruncated !== false) {
        reject('media.metadata');
    }
    if (summary.dropped !== 0
        || summary.truncated !== false
        || summary.evidenceTruncated !== false) {
        reject('media.summary.truncated');
    }
    if (overflow.records !== false
        || overflow.bytes !== false
        || overflow.other !== false
        || overflow.players !== false
        || overflow.errors !== false) {
        reject('media.overflow');
    }
    const drops = requirePlain(overflow.dropReasons, 'media.overflow.dropReasons');
    if (drops.records !== 0 || drops.bytes !== 0 || drops.other !== 0) reject('media.overflow.drops');
    requireEmptyArray(media.errors, 'media.errors');
    if (!Array.isArray(media.records)) reject('media.records');
    if (!isInteger(summary.delivered)
        || !isInteger(summary.recorded)
        || summary.delivered !== media.records.length
        || summary.recorded !== media.records.length
        || summary.playersObserved <= 0) {
        reject('media.summary.count');
    }
    if (!isFiniteNumber(summary.storedBytes) || summary.storedBytes < 0) reject('media.summary.storedBytes');
    if (summary.recorded > caps.records) reject('media.summary.capacity');

    const players = new Map();
    let previousSequence = 0;
    const records = [];
    for (let recordIndex = 0; recordIndex < media.records.length; recordIndex += 1) {
        const record = requirePlain(media.records[recordIndex], 'media.records.record');
        const sequence = requireInteger(record.sequence, 'media.records.sequence');
        if (sequence !== recordIndex + 1 || sequence <= previousSequence) {
            reject('media.records.sequence');
        }
        previousSequence = sequence;
        const observedAtMs = requireFinite(record.observedAtMs, 'media.records.observedAtMs');
        requireNonEmptyString(record.event, 'media.records.event');
        if (!MEDIA_RECORD_EVENTS.includes(record.event)) reject('media.records.event');
        const params = requirePlain(record.params, 'media.records.params');
        records.push({ record, recordIndex, sequence, observedAtMs, params });

        let playerId = null;
        if (record.event === 'Media.playerCreated') {
            const player = requirePlain(params.player, 'media.player-created');
            playerId = requireNonEmptyString(player.playerId, 'media.player-created');
            if (player.domNodeId !== undefined
                && (!isInteger(player.domNodeId) || player.domNodeId <= 0)) {
                reject('media.player-created.domNodeId');
            }
            const existing = players.get(playerId) || {
                playerId,
                creations: [],
                frames: [],
                events: [],
                errors: 0,
            };
            existing.creations.push({ record, recordIndex });
            players.set(playerId, existing);
        } else if (record.event === 'Media.playerPropertiesChanged') {
            playerId = requireNonEmptyString(params.playerId, 'media.player-properties');
            if (!Array.isArray(params.properties)) reject('media.player-properties');
            const existing = players.get(playerId) || {
                playerId,
                creations: [],
                frames: [],
                events: [],
                errors: 0,
            };
            for (let propertyIndex = 0; propertyIndex < params.properties.length; propertyIndex += 1) {
                const property = requirePlain(params.properties[propertyIndex], 'media.player-properties');
                requireNonEmptyString(property.name, 'media.player-properties');
                if (property.name === 'kFrameUrl') {
                    requireNonEmptyString(property.value, 'media.player-frame');
                    existing.frames.push({
                        record,
                        recordIndex,
                        propertyIndex,
                        value: property.value,
                    });
                }
            }
            players.set(playerId, existing);
        } else if (record.event === 'Media.playerEventsAdded') {
            playerId = requireNonEmptyString(params.playerId, 'media.player-events');
            if (!Array.isArray(params.events)) reject('media.player-events');
            const existing = players.get(playerId) || {
                playerId,
                creations: [],
                frames: [],
                events: [],
                errors: 0,
            };
            for (let eventIndex = 0; eventIndex < params.events.length; eventIndex += 1) {
                const rawEvent = requirePlain(params.events[eventIndex], 'media.player-event');
                const timestamp = requireFinite(rawEvent.timestamp, 'media.player-event.timestamp');
                if (timestamp < 0 || !isNonEmptyString(rawEvent.value)) {
                    reject('media.player-event');
                }
                let value;
                try {
                    value = JSON.parse(rawEvent.value);
                } catch {
                    reject('media.player-event.value');
                }
                requirePlain(value, 'media.player-event.value');
                requireNonEmptyString(value.event, 'media.player-event.value');
                if (value.event === 'kPipelineStateChange') {
                    requireNonEmptyString(value.pipeline_state, 'media.player-event.pipeline-state');
                } else if (value.event === 'kLoad') {
                    requireNonEmptyString(value.url, 'media.player-event.kLoad');
                } else if (value.event === 'kSeek') {
                    requireFinite(value.seek_target, 'media.player-event.kSeek');
                } else if (value.event === 'kMediaLogCreated') {
                    requireNonEmptyString(value.created, 'media.player-event.kMediaLogCreated');
                }
                existing.events.push({
                    record,
                    recordIndex,
                    eventIndex,
                    timestamp,
                    timestampSeconds: timestamp,
                    role: classifyMediaValue(value),
                    projectedAtMs: null,
                    value,
                });
            }
            players.set(playerId, existing);
        } else if (record.event === 'Media.playerErrorsRaised') {
            playerId = requireNonEmptyString(params.playerId, 'media.player-errors');
            if (!Array.isArray(params.errors)) reject('media.player-errors');
            for (const error of params.errors) {
                requirePlain(error, 'media.player-errors.entry');
            }
            const existing = players.get(playerId) || {
                playerId,
                creations: [],
                frames: [],
                events: [],
                errors: 0,
            };
            existing.errors += params.errors.length;
            players.set(playerId, existing);
        }
    }
    if (metadata.playersObserved !== players.size || summary.playersObserved !== players.size) {
        reject('media.summary.players');
    }

    const loadedPlayers = [];
    for (const player of players.values()) {
        const loads = player.events.filter((event) => event.value.event === 'kLoad'
            && event.value.url === source);
        if (loads.length > 0) loadedPlayers.push({ player, loads });
    }
    if (loadedPlayers.length !== 1) reject('media.load.unique');
    const { player, loads } = loadedPlayers[0];
    if (loads.length !== 1) reject('media.load.unique');
    const allLoads = player.events.filter((event) => event.value.event === 'kLoad');
    if (allLoads.length !== 1) reject('media.load.generation');
    if (player.creations.length !== 1) reject('media.player.creation');
    if (player.errors !== 0) reject('media.player.errors');
    if (!isNonEmptyString(player.playerId)) reject('media.player');

    const frameValues = new Set(player.frames.map((frame) => frame.value));
    if (frameValues.size !== 1 || !frameValues.has(binding.frameUrl)) {
        reject('media.player.frame');
    }
    const frameReference = player.frames[0];

    const logEvents = player.events.filter((event) => event.value.event === 'kMediaLogCreated');
    if (logEvents.length !== 1) reject('media.player.log-created');
    const logEvent = logEvents[0];
    if (!(logEvent.timestamp <= loads[0].timestamp)) {
        reject('media.history.native-order');
    }
    const createdUtcMs = parseUtcCreated(logEvent.value.created);
    const mediaOffsetMs = createdUtcMs - logEvent.timestamp * 1000;
    if (!isFiniteNumber(mediaOffsetMs)) reject('media.clock.offset');
    const historicalProjection = (event) => {
        const projected = event.timestamp * 1000 + mediaOffsetMs;
        if (!isFiniteNumber(projected)) reject('media.clock.historical-projection');
        return projected;
    };

    return {
        media,
        players,
        player,
        load: loads[0],
        frame: frameReference,
        log: logEvent,
        createdUtcMs,
        mediaOffsetMs,
        historicalLogProjectedAtMs: historicalProjection(logEvent),
        historicalLoadProjectedAtMs: historicalProjection(loads[0]),
        records,
    };
}

// Exact signed-range coverage used only for the in-progress waiting sample.
// It matches the existing checker's coverage semantics: no epsilon, no sort,
// merge or normalization; a negative first start is retained as recorded.
function signedCoverageOk(ranges, duration) {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    if (!isFiniteNumber(duration) || duration <= 0) return false;
    let previousEnd = null;
    for (const range of ranges) {
        if (!Array.isArray(range) || range.length !== 2) return false;
        const start = range[0];
        const end = range[1];
        if (!isFiniteNumber(start) || !isFiniteNumber(end)) return false;
        if (!(start <= end)) return false;
        if (previousEnd === null) {
            if (start > 0) return false;
        } else if (start !== previousEnd) {
            return false;
        }
        previousEnd = end;
    }
    return previousEnd !== null && previousEnd >= duration;
}

// One narrow exception to the general `waiting` rejection: a waiting sample is
// admitted only while the browser is still completing the already-selected
// zero seek, strictly between the uniquely selected seeking and seeked
// sequences and inside their timestamps. The sample must keep the exact
// selected identity and the recorded readyState 1 / zero / seeking state,
// with complete annotations and full signed buffered/seekable coverage. Any
// other waiting sample remains interference.
function isAdmissibleInProgressZeroSeekWaiting(
    entry,
    selected,
    source,
    binding,
    qaElementId,
    qaSourceEpoch,
) {
    const { signal } = entry;
    if (signal.kind !== 'waiting') return false;
    if (!(entry.signalSequence > selected.seeking.signalSequence
        && entry.signalSequence < selected.seeked.signalSequence)) return false;
    if (!(entry.projectedAtMs >= selected.seeking.projectedAtMs
        && entry.projectedAtMs < selected.seeked.projectedAtMs)) return false;
    if (signal.elementId !== qaElementId
        || signal.sourceEpoch !== qaSourceEpoch
        || signal.url !== source
        || signal.origin !== binding.origin) return false;
    if (!Array.isArray(signal.mediaStateUnavailable) || signal.mediaStateUnavailable.length !== 0) {
        return false;
    }
    if (!isPlainObject(signal.mediaStateReadErrors)
        || Object.keys(signal.mediaStateReadErrors).length !== 0) {
        return false;
    }
    const state = signal.mediaState;
    if (!isPlainObject(state)) return false;
    if (state.currentTime !== 0
        || state.seeking !== true
        || state.readyState !== 1
        || state.paused !== false
        || state.ended !== false
        || state.loop !== true
        || state.controls !== false
        || state.mediaError !== null) {
        return false;
    }
    if (!isFiniteNumber(state.duration) || state.duration <= 0) return false;
    if (state.duration !== selected.seeking.state.duration
        || state.duration !== selected.seeked.state.duration) return false;
    if (!signedCoverageOk(state.buffered, state.duration)) return false;
    if (!signedCoverageOk(state.seekable, state.duration)) return false;
    return true;
}

const RESUME_SETTLED_KINDS = new Set([
    'pause',
    'seeking',
    'seeked',
    'load',
    'emptied',
    'error',
    'stalled',
    'abort',
    'playing',
]);

// Observed-resume anchor state. This is deliberately stricter than the
// zero-start anchor: the resume position is real playback evidence, so the
// sample must be a complete, error-free, readyState 4, unpaused, unended,
// non-seeking, looping, control-free sample with a finite positive position
// inside an unchanged duration and full signed buffered/seekable coverage.
// The existing zero-start selection and claims are untouched.
function validateObservedResumeAnchor(start, selected) {
    const { state, signal } = start;
    if (signal.mediaStateUnavailable.length !== 0) reject('selected.start.mediaStateUnavailable');
    if (Object.keys(signal.mediaStateReadErrors).length !== 0) {
        reject('selected.start.mediaStateReadErrors');
    }
    if (state.readyState !== 4
        || state.seeking !== false
        || state.paused !== false
        || state.ended !== false
        || state.loop !== true
        || state.controls !== false
        || state.mediaError !== null) {
        reject('selected.start.state');
    }
    if (!isFiniteNumber(state.currentTime) || !(state.currentTime > 0)) {
        reject('selected.start.position');
    }
    if (!isFiniteNumber(state.duration) || state.duration <= 0) {
        reject('selected.start.duration');
    }
    if (!(state.currentTime < state.duration)) reject('selected.start.position');
    if (!signedCoverageOk(state.buffered, state.duration)) {
        reject('selected.start.buffered');
    }
    if (!signedCoverageOk(state.seekable, state.duration)) {
        reject('selected.start.seekable');
    }
    for (const name of ['preSeek', 'seeking', 'seeked', 'playing', 'confirmation']) {
        if (selected[name].state.duration !== state.duration) {
            reject('selected.start.duration');
        }
    }
    if (!(selected.preSeek.state.currentTime > state.currentTime)) {
        reject('selected.start.progression');
    }
}

// One exact application play attempt/result pair, identified by the later DOM
// anchor's recorded continuity link rather than by timestamp proximity. The
// recorded `resultType: 'object'` return of the wrapped play call is the only
// application result evidence here; it is not a promise-settlement receipt.
// Prior pause/seek activity must be settled before the intent, no
// pause/seek/play/reset/error transition may sit between the intent and the DOM
// anchor or between the anchor and the end/reset confirmation, and the DOM
// anchor must follow the recorded call return. There is deliberately no
// application-call-to-DOM-notification latency bound; the measured delay is
// retained in evidence only. Preserved event sequence decides whether a
// mutation intervenes between the intent and the anchor, so an ordered setter
// and play call recorded in the same millisecond are not treated as a tie.
function validateObservedResumeProvenance(provenance, lifecycle, clockModel) {
    const anchorMs = lifecycle.start.projectedAtMs;
    const floorMs = lifecycle.selectionFloorMs;
    const selectedId = provenance.selectedId;

    // The DOM descriptor captured at record time carries the exact application
    // play sequence/epoch. This link is authoritative; a missing, stale or
    // forged link is rejected and never replaced by a nearest-time guess.
    const anchorDescribe = lifecycle.start.signal.controlledProvenance;
    const continuity = requirePlain(
        anchorDescribe.provenance.continuity,
        'resume.link.continuity',
    );
    const lastPlaySequence = requireInteger(continuity.lastPlaySequence, 'resume.link.sequence');
    if (lastPlaySequence <= 0) reject('resume.link.sequence');
    const lastPlayEpoch = requireInteger(continuity.lastPlayEpoch, 'resume.link.epoch');
    if (lastPlayEpoch !== 1) reject('resume.link.epoch');

    const linked = provenance.events.filter(
        (entry) => entry.event.sequence === lastPlaySequence,
    );
    if (linked.length !== 1) reject('resume.link.sequence');
    const attempt = linked[0];
    if (attempt.event.kind !== 'mutation-attempt'
        || attempt.event.id !== selectedId
        || attempt.event.targetType !== 'method'
        || attempt.event.name !== 'play') {
        reject('resume.link.attempt');
    }
    if (attempt.event.sourceEpoch !== 1) reject('resume.play.epoch');
    if (attempt.event.sourceEpoch !== lastPlayEpoch) reject('resume.link.epoch');
    const attemptMs = projectRendererMs(clockModel, attempt.clocks);
    if (!(attemptMs >= floorMs)) reject('resume.play.fresh');
    if (!(attemptMs < anchorMs)) reject('resume.play.order');

    const resultEntries = provenance.events.filter((entry) => entry.event.kind === 'mutation-result'
        && entry.event.sequenceOfAttempt === attempt.event.sequence);
    if (resultEntries.length !== 1) reject('resume.play.result');
    const resultEntry = resultEntries[0];
    const result = resultEntry.event;
    if (result.id !== selectedId
        || result.sourceEpoch !== 1
        || result.targetType !== 'method'
        || result.name !== 'play'
        || result.outcome !== 'success'
        || result.resultType !== 'object') {
        reject('resume.play.result');
    }
    const resultMs = projectRendererMs(clockModel, resultEntry.clocks);
    if (!(resultMs >= attemptMs)) {
        reject('resume.play.result');
    }
    // The DOM playing notification must follow the recorded call return. No
    // upper bound is applied to this measured delay.
    if (!(resultMs <= anchorMs)) reject('resume.play.result');

    // Another application play attempt that could compete for the same exact
    // linked intent is genuine ambiguity. Older settled attempts outside the
    // fence remain prior history.
    for (const entry of provenance.events) {
        const event = entry.event;
        if (event.kind !== 'mutation-attempt') continue;
        if (event.id !== selectedId) continue;
        if (event.sourceEpoch !== 1) continue;
        if (event.targetType !== 'method' || event.name !== 'play') continue;
        if (event.sequence === attempt.event.sequence) continue;
        const candidateMs = projectRendererMs(clockModel, entry.clocks);
        if (!(candidateMs >= floorMs)) continue;
        if (!(candidateMs <= anchorMs)) continue;
        if (Math.abs(candidateMs - attemptMs) <= CLOCK_FENCE_MS) {
            reject('resume.play.unique');
        }
    }

    // Preserved event sequence, not dateNow equality, decides whether any
    // selected-object mutation attempt intervenes between the linked intent and
    // the DOM anchor. The interval is not bounded by the 20ms fence.
    for (const entry of provenance.events) {
        const event = entry.event;
        if (event.kind !== 'mutation-attempt' || event.id !== selectedId) continue;
        if (event.sequence <= attempt.event.sequence) continue;
        if (!(projectRendererMs(clockModel, entry.clocks) <= anchorMs)) continue;
        reject('resume.play.settled');
    }

    for (const entry of lifecycle.signals) {
        if (entry.signal.elementId !== lifecycle.qaElementId) continue;
        if (entry.signal.sourceEpoch !== lifecycle.qaSourceEpoch) continue;
        if (entry.signal.url !== provenance.source) continue;
        if (entry === lifecycle.start) continue;
        if (!(entry.projectedAtMs > attemptMs && entry.projectedAtMs <= anchorMs)) {
            continue;
        }
        if (RESUME_SETTLED_KINDS.has(entry.signal.kind)) reject('resume.play.settled');
    }

    // No extra pause/play/seek/load/reset/error transition may sit between the
    // resume anchor and the end/reset confirmation. The selected zero-seek
    // samples themselves remain the only expected transitions there.
    const confirmationMs = lifecycle.selected.confirmation.projectedAtMs;
    const selectedSequences = new Set([
        lifecycle.selected.preSeek.signalSequence,
        lifecycle.selected.seeking.signalSequence,
        lifecycle.selected.seeked.signalSequence,
        lifecycle.selected.playing.signalSequence,
        lifecycle.selected.confirmation.signalSequence,
    ]);
    for (const entry of lifecycle.signals) {
        if (entry.signal.elementId !== lifecycle.qaElementId) continue;
        if (entry.signal.sourceEpoch !== lifecycle.qaSourceEpoch) continue;
        if (entry.signal.url !== provenance.source) continue;
        if (!(entry.projectedAtMs > anchorMs && entry.projectedAtMs < confirmationMs)) continue;
        if (selectedSequences.has(entry.signalSequence)) continue;
        if (RESUME_SETTLED_KINDS.has(entry.signal.kind)) reject('resume.after.settled');
    }

    lifecycle.resume = {
        attempt,
        result: resultEntry,
        attemptMs,
        resultMs,
        floorMs,
    };
}

function validateLifecycleAndSelect(input, binding, provenance, projection) {
    if (!Array.isArray(input.lifecycleSignals)) reject('lifecycle');
    const signals = [];
    const bySequence = new Map();
    for (let index = 0; index < input.lifecycleSignals.length; index += 1) {
        const signal = requirePlain(input.lifecycleSignals[index], 'lifecycle.signal');
        const signalSequence = requireInteger(signal.signalSequence, 'lifecycle.signalSequence');
        if (signalSequence <= 0 || bySequence.has(signalSequence)) {
            reject('lifecycle.signalSequence');
        }
        const observedAtMs = requireFinite(signal.observedAtMs, 'lifecycle.observedAtMs');
        if (observedAtMs <= 0) reject('lifecycle.observedAtMs');
        const clock = validateDocumentClock(signal.clock, binding, 'lifecycle.clock');
        if (observedAtMs !== clock.dateNow) reject('lifecycle.clock.observation');
        const clockReadErrors = requirePlain(signal.clockReadErrors, 'lifecycle.clock.read-errors');
        if (Object.keys(clockReadErrors).length !== 0) reject('lifecycle.clock.read-errors');
        requireNonEmptyString(signal.kind, 'lifecycle.kind');
        requireNonEmptyString(signal.elementId, 'lifecycle.elementId');
        requireInteger(signal.sourceEpoch, 'lifecycle.sourceEpoch');
        requireNonEmptyString(signal.url, 'lifecycle.url');
        requireNonEmptyString(signal.origin, 'lifecycle.origin');
        const state = requirePlain(signal.mediaState, 'lifecycle.mediaState');
        requireEmptyObject(signal.mediaStateReadErrors, 'lifecycle.mediaStateReadErrors');
        const unavailable = signal.mediaStateUnavailable;
        if (!Array.isArray(unavailable)
            || unavailable.length > 1
            || (unavailable.length === 1 && unavailable[0] !== 'duration')) {
            reject('lifecycle.mediaStateUnavailable');
        }
        const entry = { signal, index, signalSequence, observedAtMs, clock, state };
        signals.push(entry);
        bySequence.set(signalSequence, entry);
    }
    signals.sort((left, right) => left.signalSequence - right.signalSequence);

    const source = provenance.source;
    const selectedId = provenance.selectedId;
    const sourceSignals = signals.filter((entry) => entry.signal.url === source);
    if (sourceSignals.length === 0) reject('lifecycle.source');
    const qaElementIds = new Set();
    const qaEpochs = new Set();
    for (const entry of sourceSignals) {
        const { signal } = entry;
        if (signal.origin !== binding.origin || signal.sourceEpoch <= 0) {
            reject('lifecycle.identity');
        }
        qaElementIds.add(signal.elementId);
        qaEpochs.add(signal.sourceEpoch);
        const describe = validateDescribeCore(
            signal.controlledProvenance,
            binding,
            'lifecycle.controlledProvenance',
        );
        if (describe.element.id !== selectedId
            || describe.element.sourceEpoch !== 1
            || describe.element.source !== source
            || describe.provenance.attributes.src !== source) {
            reject('lifecycle.controlledProvenance.identity');
        }
    }
    if (qaElementIds.size !== 1 || qaEpochs.size !== 1) reject('lifecycle.competing-element');
    const qaElementId = [...qaElementIds][0];
    const qaSourceEpoch = [...qaEpochs][0];
    for (const entry of signals) {
        const { signal } = entry;
        if (signal.url === source) continue;
        if (isPlainObject(signal.controlledProvenance)
            && signal.controlledProvenance.element?.id === selectedId) {
            reject('lifecycle.source-reset');
        }
    }

    const selectedInput = requirePlain(input.selected, 'selected');
    const selected = {};
    for (const name of ['preSeek', 'seeking', 'seeked', 'playing', 'confirmation']) {
        const reference = requirePlain(selectedInput[name], `selected.${name}`);
        const signalSequence = requireInteger(reference.signalSequence, `selected.${name}`);
        const entry = bySequence.get(signalSequence);
        if (!entry) reject(`selected.${name}`);
        selected[name] = entry;
    }
    const sequences = new Set();
    for (const name of ['preSeek', 'seeking', 'seeked', 'playing', 'confirmation']) {
        if (sequences.has(selected[name].signalSequence)) reject('selected.duplicate');
        sequences.add(selected[name].signalSequence);
    }
    const anchorProjection = buildAnchorProjection(binding, selected);
    for (const entry of signals) {
        entry.projectedAtMs = projectRendererMs(anchorProjection, entry.clock);
    }
    const readinessProjectedMs = projectRendererMs(anchorProjection, binding.collectionReady);
    const selectionFloorMs = readinessProjectedMs;
    const order = ['preSeek', 'seeking', 'seeked', 'playing', 'confirmation'];
    for (let index = 1; index < order.length; index += 1) {
        const previous = selected[order[index - 1]];
        const current = selected[order[index]];
        if (current.signalSequence <= previous.signalSequence
            || current.projectedAtMs < previous.projectedAtMs) {
            reject('selected.order');
        }
    }
    if (!(selected.preSeek.projectedAtMs < selected.confirmation.projectedAtMs)) {
        reject('selected.order');
    }
    for (const name of order) {
        const entry = selected[name];
        if (entry.projectedAtMs < readinessProjectedMs) reject('selected.window');
        if (entry.observedAtMs < projection.observationWindow.openedAtMs
            || entry.observedAtMs > projection.observationWindow.closedAtMs) {
            reject('selected.window');
        }
        if (entry.signal.elementId !== qaElementId
            || entry.signal.sourceEpoch !== qaSourceEpoch
            || entry.signal.url !== source
            || entry.signal.origin !== binding.origin) {
            reject('selected.identity');
        }
        if (entry.state.mediaError !== null
            || entry.state.loop !== true
            || entry.state.controls !== false
            || entry.state.paused !== false
            || !(entry.state.readyState === 4
                || (name === 'seeking' && entry.state.readyState === 1))
            || !isFiniteNumber(entry.state.duration)
            || entry.state.duration <= 0) {
            reject(`selected.${name}.state`);
        }
    }

    const preSeek = selected.preSeek.state;
    if (!(preSeek.currentTime > 0 && preSeek.currentTime < preSeek.duration)
        || selected.preSeek.state.seeking !== false) {
        reject('selected.preSeek');
    }
    if (selected.seeking.signal.kind !== 'seeking'
        || selected.seeking.state.currentTime !== 0
        || selected.seeking.state.seeking !== true) {
        reject('selected.seeking');
    }
    if (selected.seeked.signal.kind !== 'seeked'
        || selected.seeked.state.currentTime !== 0
        || selected.seeked.state.seeking !== false) {
        reject('selected.seeked');
    }
    if (selected.playing.signal.kind !== 'playing'
        || selected.playing.state.currentTime !== 0
        || selected.playing.state.seeking !== false) {
        reject('selected.playing');
    }
    if (selected.confirmation.state.currentTime <= 0
        || selected.confirmation.state.seeking !== false) {
        reject('selected.confirmation');
    }
    const disallowed = new Set(['load', 'emptied', 'error', 'stalled', 'abort', 'waiting']);
    for (const entry of signals) {
        if (entry.signal.elementId !== qaElementId) continue;
        if (entry.projectedAtMs < selected.preSeek.projectedAtMs
            || entry.projectedAtMs > selected.confirmation.projectedAtMs) continue;
        if (disallowed.has(entry.signal.kind)) {
            if (entry.signal.kind === 'waiting'
                && isAdmissibleInProgressZeroSeekWaiting(
                    entry,
                    selected,
                    source,
                    binding,
                    qaElementId,
                    qaSourceEpoch,
                )) {
                continue;
            }
            reject('selected.interference');
        }
        if (entry.signal.kind === 'seeking'
            && entry.signalSequence !== selected.seeking.signalSequence) {
            reject('selected.seeking.ambiguity');
        }
    }
    // The newest fresh playing anchor is authoritative. A zero-position anchor
    // keeps the existing zero-start path exactly; a positive-position anchor
    // selects the separately labelled observed-resume path. A newer unmatched
    // or ambiguous anchor is never skipped in favour of an older one.
    const anchorCandidates = signals.filter((entry) => entry.signal.elementId === qaElementId
        && entry.signal.sourceEpoch === qaSourceEpoch
        && entry.signal.kind === 'playing'
        && entry.projectedAtMs < selected.preSeek.projectedAtMs
        && entry.projectedAtMs >= selectionFloorMs
        && entry.observedAtMs >= projection.observationWindow.openedAtMs
        && entry.observedAtMs <= projection.observationWindow.closedAtMs);
    if (anchorCandidates.length === 0) reject('selected.start.unique');
    const latestStartMs = Math.max(...anchorCandidates.map((entry) => entry.projectedAtMs));
    const latestStarts = anchorCandidates.filter((entry) => entry.projectedAtMs === latestStartMs);
    if (latestStarts.length !== 1) reject('selected.start.unique');
    const start = latestStarts[0];
    if (start.projectedAtMs >= selected.preSeek.projectedAtMs) reject('selected.start.order');
    const startMode = start.state.currentTime === 0 ? 'zero-start' : 'observed-resume';
    if (startMode === 'observed-resume') validateObservedResumeAnchor(start, selected);

    for (const entry of signals) {
        if (entry.signal.mediaStateUnavailable.length === 0) continue;
        if (!(entry.projectedAtMs < readinessProjectedMs)
            || !(entry.projectedAtMs < start.projectedAtMs)
            || !Object.prototype.hasOwnProperty.call(entry.state, 'duration')
            || entry.state.duration !== null) {
            reject('lifecycle.mediaStateUnavailable');
        }
    }

    return {
        signals,
        bySequence,
        selected,
        start,
        startMode,
        selectionFloorMs,
        readinessProjectedMs,
        anchorProjection,
        qaElementId,
        qaSourceEpoch,
    };
}

function projectMediaEvents(events, effectiveMediaOffsetMs) {
    if (!isFiniteNumber(effectiveMediaOffsetMs)) reject('media.clock.network-offset');
    for (const event of events) {
        event.projectedAtMs = event.timestamp * 1000 + effectiveMediaOffsetMs;
        if (!isFiniteNumber(event.projectedAtMs)) reject('media.clock.projection');
    }
    const sorted = events.slice().sort((left, right) => {
        if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp;
        if (left.recordIndex !== right.recordIndex) return left.recordIndex - right.recordIndex;
        return left.eventIndex - right.eventIndex;
    });
    const transitionRoles = new Set(['playing', 'ended', 'seek', 'seeking-state']);
    for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        if (transitionRoles.has(previous.role)
            && transitionRoles.has(current.role)
            && previous.timestamp === current.timestamp) {
            reject('media.event.tie');
        }
    }
    return sorted;
}

function correlateCycle(mediaResult, lifecycle, provenance, effectiveMediaOffsetMs) {
    const { player } = mediaResult;
    const sorted = projectMediaEvents(player.events, effectiveMediaOffsetMs);
    const selected = lifecycle.selected;
    const selectionFloorMs = lifecycle.readinessProjectedMs;
    const seekCandidates = sorted.filter((event) => event.role === 'seek'
        && event.value.seek_target === 0
        && Math.abs(event.projectedAtMs - selected.seeking.projectedAtMs) <= CLOCK_FENCE_MS);
    if (seekCandidates.length !== 1) reject('media.seek.unique');
    const seek = seekCandidates[0];

    const endedCandidates = sorted.filter((event) => event.role === 'ended'
        && event.projectedAtMs > selected.preSeek.projectedAtMs
        && event.projectedAtMs <= seek.projectedAtMs);
    if (endedCandidates.length !== 1) reject('media.cycle.ended');
    const ended = endedCandidates[0];
    if (!(ended.projectedAtMs > selected.preSeek.projectedAtMs)) reject('media.cycle.ended');

    let start;
    let resumeNativePlaying = null;
    if (lifecycle.startMode === 'observed-resume') {
        // Native kPlay is resume-intent evidence only. It is matched to the
        // exact continuity-linked application attempt AND to that attempt's
        // recorded call return, each inside the unchanged 20ms fence. The DOM
        // playing notification may arrive far later and is deliberately not
        // matched to kPlay by latency.
        const resume = lifecycle.resume;
        if (!resume) reject('media.cycle.resume.play.unique');
        const playCandidates = sorted.filter((event) => event.role === 'resume-play'
            && event.projectedAtMs >= selectionFloorMs
            && event.projectedAtMs <= lifecycle.start.projectedAtMs
            && Math.abs(event.projectedAtMs - resume.attemptMs) <= CLOCK_FENCE_MS
            && Math.abs(event.projectedAtMs - resume.resultMs) <= CLOCK_FENCE_MS);
        if (playCandidates.length !== 1) reject('media.cycle.resume.play.unique');
        start = playCandidates[0];
        // A competing application play attempt inside the same native fence
        // would make the exact link non-unique even though timestamps happen to
        // select one native event. Reject it explicitly.
        for (const entry of provenance.events) {
            const event = entry.event;
            if (event.kind !== 'mutation-attempt') continue;
            if (event.id !== provenance.selectedId) continue;
            if (event.sourceEpoch !== 1) continue;
            if (event.targetType !== 'method' || event.name !== 'play') continue;
            if (event.sequence === resume.attempt.event.sequence) continue;
            const candidateMs = projectRendererMs(lifecycle.anchorProjection, entry.clocks);
            if (!(candidateMs <= lifecycle.start.projectedAtMs)) continue;
            if (Math.abs(candidateMs - start.projectedAtMs) <= CLOCK_FENCE_MS) {
                reject('media.cycle.resume.play.ambiguous');
            }
        }
        // At most one explained resume-side pipeline kPlaying may sit strictly
        // between the uniquely matched native kPlay start and the native kEnded
        // endpoint. The selection is by native cycling timestamps, not by the
        // projected application attempt or the following seek. This separate
        // pipeline stage is not bounded by the DOM resume notification's 20ms
        // fence; the observed delay is retained as a diagnostic and is not a
        // latency waiver.
        const explainedPlaying = sorted.filter((event) => event.role === 'playing'
            && event.timestamp > start.timestamp
            && event.timestamp < ended.timestamp);
        if (explainedPlaying.length > 1) reject('media.cycle.resume.playing.ambiguous');
        resumeNativePlaying = explainedPlaying.length === 1 ? explainedPlaying[0] : null;
    } else {
        const startCandidates = sorted.filter((event) => event.role === 'playing'
            && Math.abs(event.projectedAtMs - lifecycle.start.projectedAtMs) <= CLOCK_FENCE_MS
            && event.projectedAtMs < selected.preSeek.projectedAtMs);
        if (startCandidates.length !== 1) reject('media.cycle.start.unique');
        start = startCandidates[0];
    }
    if (start.projectedAtMs < selectionFloorMs) reject('media.cycle.start.window');
    if (!(mediaResult.log.timestamp <= start.timestamp)) reject('media.log.order');
    if (!(mediaResult.load.timestamp <= start.timestamp)) reject('media.load.order');

    // The DOM readyState-4 completion follows the pipeline BUFFERING_HAVE_ENOUGH
    // readiness marker, not the earlier pipeline kPlaying transition. The two
    // native stages are distinct: the pipeline kPlaying is selected separately
    // and must precede or equal this readiness marker. Only the pipeline
    // buffering state is authoritative here; the separate audio buffering state
    // marker never supplies readiness. The marker is bound to the selected
    // zero seek, the selected cycle and the selected confirmation, so a marker
    // from a previous or later cycle cannot be matched arbitrarily late.
    const readinessCandidates = sorted.filter((event) => event.value.event === 'kBufferingStateChanged'
        && Object.prototype.hasOwnProperty.call(event.value, 'pipeline_buffering_state')
        && event.projectedAtMs > seek.projectedAtMs
        && event.projectedAtMs <= selected.confirmation.projectedAtMs
        && Math.abs(event.projectedAtMs - selected.playing.projectedAtMs) <= CLOCK_FENCE_MS);
    if (readinessCandidates.length !== 1) reject('media.cycle.readiness.unique');
    const readiness = readinessCandidates[0];
    const pipelineBuffering = readiness.value.pipeline_buffering_state;
    if (!isPlainObject(pipelineBuffering)
        || pipelineBuffering.state !== 'BUFFERING_HAVE_ENOUGH'
        || pipelineBuffering.for_suspended_start !== false) {
        reject('media.cycle.readiness.stage');
    }

    const postCandidates = sorted.filter((event) => event.role === 'playing'
        && event.projectedAtMs > seek.projectedAtMs
        && event.projectedAtMs <= selected.confirmation.projectedAtMs);
    if (postCandidates.length !== 1) reject('media.cycle.playing.unique');
    const postPlaying = postCandidates[0];
    if (!(postPlaying.projectedAtMs <= readiness.projectedAtMs)) {
        reject('media.cycle.playing.order');
    }

    const seekingStates = sorted.filter((event) => event.role === 'seeking-state'
        && event.projectedAtMs >= start.projectedAtMs
        && event.projectedAtMs <= selected.confirmation.projectedAtMs);
    const selectedSeekingStates = seekingStates.filter((event) =>
        event.projectedAtMs > seek.projectedAtMs
        && event.projectedAtMs < postPlaying.projectedAtMs);
    if (selectedSeekingStates.length > 1) reject('media.cycle.seek.state.ambiguous');
    if (selectedSeekingStates.length !== seekingStates.length) {
        reject('media.cycle.seek.state.unexplained');
    }

    const cycleEvents = [start, ended, seek, postPlaying];
    const transitionRoles = [
        lifecycle.startMode === 'observed-resume' ? 'resume-play' : 'playing',
        'ended',
        'seek',
        'playing',
    ];
    for (let index = 0; index < cycleEvents.length; index += 1) {
        if (cycleEvents[index].role !== transitionRoles[index]) reject('media.cycle.events');
        if (index > 0 && !(cycleEvents[index - 1].timestamp < cycleEvents[index].timestamp)) {
            reject('media.cycle.order');
        }
    }
    for (const event of sorted) {
        if (event.projectedAtMs < start.projectedAtMs
            || event.projectedAtMs > readiness.projectedAtMs) {
            continue;
        }
        if (event === start || event === ended || event === seek || event === postPlaying) {
            continue;
        }
        if (event === readiness) continue;
        if (event === resumeNativePlaying) continue;
        if (event.role === 'load' || event.role === 'pause' || event.role === 'error') {
            reject('media.cycle.interference');
        }
        if (event.role === 'seeking-state') continue;
        if (event.role === 'seek') reject('media.cycle.seek.ambiguous');
        if (event.role === 'ended') reject('media.cycle.ended.ambiguous');
        if (event.role === 'playing') reject('media.cycle.playing.ambiguous');
        if (event.role === 'resume-play') reject('media.cycle.resume.play.ambiguous');
    }
    if (selected.confirmation.projectedAtMs < postPlaying.projectedAtMs) {
        reject('media.cycle.confirmation');
    }
    if (selected.confirmation.projectedAtMs < readiness.projectedAtMs) {
        reject('media.cycle.confirmation');
    }
    for (const event of [...cycleEvents, readiness]) {
        if (event.projectedAtMs < selectionFloorMs) reject('media.window');
    }

    return { sorted, start, ended, seek, postPlaying, readiness, cycleEvents };
}

function validateInterference(provenance, lifecycle, clockModel) {
    const startMs = lifecycle.start.projectedAtMs;
    const endMs = lifecycle.selected.confirmation.projectedAtMs;
    for (const entry of provenance.events) {
        const event = entry.event;
        if (event.kind === 'source-epoch' && event.id === provenance.selectedId) {
            reject('provenance.source-reset');
        }
        if (event.kind !== 'mutation-attempt' || event.id !== provenance.selectedId) continue;
        const atMs = projectRendererMs(clockModel, entry.clocks);
        if (atMs >= startMs && atMs <= endMs) {
            reject(`provenance.interference.${event.name}`);
        }
    }
}

function buildEvidence(
    input,
    binding,
    projection,
    provenance,
    sentinel,
    media,
    lifecycle,
    cycle,
    clockModel,
) {
    const { selected } = lifecycle;
    const networkOffsetMs = projection.wallTimeS * 1000
        - projection.protocolTimestamps.request * 1000;
    const lifetimeDriftMs = [];
    for (const signal of input.lifecycleSignals) {
        const clock = signal.clock;
        if (isPlainObject(clock)
            && isFiniteNumber(clock.dateNow)
            && isFiniteNumber(clock.performanceNow)) {
            lifetimeDriftMs.push(clock.dateNow - (binding.timeOrigin + clock.performanceNow));
        }
    }
    for (const entry of provenance.events) {
        lifetimeDriftMs.push(entry.clocks.dateNow
            - (binding.timeOrigin + entry.clocks.performanceNow));
    }
    const evidence = {
        scope: {
            profile: PROFILE,
            sourceSha40: binding.binding.sourceSha40,
            packageSha40: binding.binding.packageSha40,
            runtime: clone(binding.binding.runtime),
            frameUrl: binding.frameUrl,
            origin: binding.origin,
            documentGeneration: binding.binding.documentGeneration,
            controlledProfileOnly: true,
            admission: 'none',
            networkFailureAdmitted: false,
            existingGuardChanged: false,
            universalProvenance: false,
            defaultControl: false,
            adversarial: false,
            observedSegmentOnly: true,
            gapFreeAudio: false,
        },
        binding: {
            sourceSha40: binding.binding.sourceSha40,
            packageSha40: binding.binding.packageSha40,
            frameOrigin: binding.frameOrigin,
            collectionReady: clone(binding.binding.collectionReady),
            generationInstalled: clone(binding.binding.generationInstalled),
        },
        provenance: {
            schema: provenance.snapshot.schema,
            selected: {
                elementId: provenance.selectedId,
                constructorSequence: provenance.describe.element.constructorSequence,
                sourceEpoch: 1,
                source: provenance.source,
                constructEventSequence: provenance.events.find((entry) => entry.event.kind === 'construct'
                    && entry.event.id === provenance.selectedId).event.sequence,
            },
            snapshotValid: true,
            mutationStreamConsistent: true,
        },
        sentinel: {
            schema: sentinel.schema,
            installStatus: sentinel.install.status,
            actionEvents: 0,
            valid: true,
        },
        media: {
            schema: media.media.schema,
            playerId: media.player.playerId,
            creationReference: media.player.creations[0].recordIndex,
            frameReference: {
                recordSequence: media.frame.record.sequence,
                recordIndex: media.frame.recordIndex,
                propertyIndex: media.frame.propertyIndex,
                value: media.frame.value,
            },
            logReference: {
                recordSequence: media.log.record.sequence,
                recordIndex: media.log.recordIndex,
                eventIndex: media.log.eventIndex,
                created: media.log.value.created,
            },
            loadReference: {
                recordSequence: media.load.record.sequence,
                recordIndex: media.load.recordIndex,
                eventIndex: media.load.eventIndex,
                url: media.load.value.url,
            },
            startReference: {
                recordSequence: cycle.start.record.sequence,
                recordIndex: cycle.start.recordIndex,
                eventIndex: cycle.start.eventIndex,
                timestamp: cycle.start.timestamp,
            },
            endedReference: {
                recordSequence: cycle.ended.record.sequence,
                recordIndex: cycle.ended.recordIndex,
                eventIndex: cycle.ended.eventIndex,
                timestamp: cycle.ended.timestamp,
            },
            seekReference: {
                recordSequence: cycle.seek.record.sequence,
                recordIndex: cycle.seek.recordIndex,
                eventIndex: cycle.seek.eventIndex,
                timestamp: cycle.seek.timestamp,
                seekTarget: cycle.seek.value.seek_target,
            },
            postSeekPlayingReference: {
                recordSequence: cycle.postPlaying.record.sequence,
                recordIndex: cycle.postPlaying.recordIndex,
                eventIndex: cycle.postPlaying.eventIndex,
                timestamp: cycle.postPlaying.timestamp,
            },
            readinessReference: {
                recordSequence: cycle.readiness.record.sequence,
                recordIndex: cycle.readiness.recordIndex,
                eventIndex: cycle.readiness.eventIndex,
                timestamp: cycle.readiness.timestamp,
                pipelineBufferingState: {
                    state: cycle.readiness.value.pipeline_buffering_state.state,
                    forSuspendedStart: cycle.readiness.value.pipeline_buffering_state.for_suspended_start,
                },
            },
            eventOrder: cycle.cycleEvents.map((event) => event.value.event),
            nodeDeliveryOrderUsed: false,
            decoderEofUsed: false,
        },
        lifecycle: {
            start: { signalSequence: lifecycle.start.signalSequence, observedAtMs: lifecycle.start.observedAtMs },
            preSeek: { signalSequence: selected.preSeek.signalSequence, observedAtMs: selected.preSeek.observedAtMs },
            seeking: { signalSequence: selected.seeking.signalSequence, observedAtMs: selected.seeking.observedAtMs },
            seeked: { signalSequence: selected.seeked.signalSequence, observedAtMs: selected.seeked.observedAtMs },
            playing: { signalSequence: selected.playing.signalSequence, observedAtMs: selected.playing.observedAtMs },
            confirmation: {
                signalSequence: selected.confirmation.signalSequence,
                observedAtMs: selected.confirmation.observedAtMs,
            },
            qaElementId: lifecycle.qaElementId,
            qaSourceEpoch: lifecycle.qaSourceEpoch,
            helperElementId: provenance.selectedId,
            helperSourceEpoch: 1,
            source: provenance.source,
            controlledProvenanceAtRecordTime: true,
        },
        clocks: {
            clockModel: CLOCK_MODEL,
            rendererAnchor: {
                signalSequence: clockModel.anchorEntry.signalSequence,
                observedAtMs: clockModel.anchorEntry.observedAtMs,
                dateNow: clockModel.anchor.dateNow,
                performanceNow: clockModel.anchor.performanceNow,
                timeOrigin: clockModel.anchor.timeOrigin,
                projectedAtMs: clockModel.anchorEntry.projectedAtMs,
                localOffsetMs: clockModel.localOffsetMs,
            },
            rendererProjection: 'anchorDateNow+(performanceNow-anchorPerformanceNow)',
            provenanceProjection: 'anchorDateNow+(performanceNow-anchorPerformanceNow)',
            requestWallTimeS: projection.wallTimeS,
            protocolTimestamps: clone(projection.protocolTimestamps),
            projectedObservedAtMs: clone(projection.projectedObservedAtMs),
            observationWindow: clone(projection.observationWindow),
            timeOrigin: binding.timeOrigin,
            collectionReadyDateNow: binding.collectionReady.dateNow,
            collectionReadyProjectedAtMs: lifecycle.readinessProjectedMs,
            selectionFloorMs: lifecycle.selectionFloorMs,
            generationInstalledDateNow: binding.generationInstalled.dateNow,
            lifetimeWallPerformanceDriftMs: {
                samples: lifetimeDriftMs.length,
                min: lifetimeDriftMs.length > 0 ? Math.min(...lifetimeDriftMs) : null,
                max: lifetimeDriftMs.length > 0 ? Math.max(...lifetimeDriftMs) : null,
                maxAbs: lifetimeDriftMs.length > 0
                    ? Math.max(...lifetimeDriftMs.map((value) => Math.abs(value)))
                    : null,
            },
            createdUtcMs: media.createdUtcMs,
            createdUtc: media.log.value.created,
            mediaLogTimestamp: media.log.timestamp,
            mediaTimestampDomain: 'browser-monotonic-seconds',
            mediaOffsetMs: media.mediaOffsetMs,
            historicalMediaOffsetMs: media.mediaOffsetMs,
            effectiveMediaOffsetMs: networkOffsetMs,
            networkOffsetMs,
            mediaOffsetDeltaMs: media.mediaOffsetMs - networkOffsetMs,
            mediaProjection: 'timestamp*1000+networkOffsetMs',
            historicalMediaProjection: 'timestamp*1000+historicalMediaOffsetMs',
            logProjectedAtMs: media.log.projectedAtMs,
            historicalLogProjectedAtMs: media.historicalLogProjectedAtMs,
            historicalLoadProjectedAtMs: media.historicalLoadProjectedAtMs,
            nativeCreationVsConstructMarkerMs: media.historicalLogProjectedAtMs
                - provenance.constructEvent.at.dateNow,
            requestAnchorDeltaMs: projection.projectedObservedAtMs.request - media.createdUtcMs,
            rendererLogDeltaMs: media.createdUtcMs - media.log.projectedAtMs,
            startProjectedAtMs: cycle.start.projectedAtMs,
            endedProjectedAtMs: cycle.ended.projectedAtMs,
            seekProjectedAtMs: cycle.seek.projectedAtMs,
            postSeekPlayingProjectedAtMs: cycle.postPlaying.projectedAtMs,
            readinessProjectedAtMs: cycle.readiness.projectedAtMs,
            readinessVsDomPlayingDeltaMs: cycle.readiness.projectedAtMs
                - selected.playing.projectedAtMs,
            clockFenceMs: CLOCK_FENCE_MS,
        },
        rawReferences: {
            provenanceSelected: clone(provenance.describe),
            sentinelSnapshot: clone(sentinel),
            mediaPlayerEvents: cycle.sorted.map((event) => ({
                recordSequence: event.record.sequence,
                recordIndex: event.recordIndex,
                eventIndex: event.eventIndex,
                timestamp: event.timestamp,
                value: clone(event.value),
            })),
            lifecycleSignals: clone(input.lifecycleSignals),
        },
    };
    if (lifecycle.startMode === 'observed-resume') {
        evidence.startMode = 'observed-resume';
        evidence.startClaim = OBSERVED_RESUME_CLAIM;
        evidence.scope.observedResumeSegmentOnly = true;
        evidence.scope.entirelyObservedCycle = false;
        evidence.scope.uninterruptedSound = false;
        evidence.start = {
            mode: 'observed-resume',
            claim: OBSERVED_RESUME_CLAIM,
            anchor: {
                signalSequence: lifecycle.start.signalSequence,
                observedAtMs: lifecycle.start.observedAtMs,
                projectedAtMs: lifecycle.start.projectedAtMs,
                currentTime: lifecycle.start.state.currentTime,
                duration: lifecycle.start.state.duration,
                readyState: lifecycle.start.state.readyState,
                seeking: false,
                paused: false,
                ended: false,
            },
            playAttempt: {
                sequence: lifecycle.resume.attempt.event.sequence,
                id: lifecycle.resume.attempt.event.id,
                sourceEpoch: lifecycle.resume.attempt.event.sourceEpoch,
                targetType: lifecycle.resume.attempt.event.targetType,
                name: lifecycle.resume.attempt.event.name,
                dateNow: lifecycle.resume.attempt.clocks.dateNow,
                performanceNow: lifecycle.resume.attempt.clocks.performanceNow,
                projectedAtMs: lifecycle.resume.attemptMs,
            },
            playResult: {
                sequence: lifecycle.resume.result.event.sequence,
                id: lifecycle.resume.result.event.id,
                sourceEpoch: lifecycle.resume.result.event.sourceEpoch,
                outcome: lifecycle.resume.result.event.outcome,
                resultType: lifecycle.resume.result.event.resultType,
                sequenceOfAttempt: lifecycle.resume.result.event.sequenceOfAttempt,
                dateNow: lifecycle.resume.result.clocks.dateNow,
                performanceNow: lifecycle.resume.result.clocks.performanceNow,
                projectedAtMs: lifecycle.resume.resultMs,
            },
            nativePlay: {
                recordSequence: cycle.start.record.sequence,
                recordIndex: cycle.start.recordIndex,
                eventIndex: cycle.start.eventIndex,
                timestamp: cycle.start.timestamp,
                projectedAtMs: cycle.start.projectedAtMs,
            },
            anchorDeltaMs: lifecycle.start.projectedAtMs - cycle.start.projectedAtMs,
            attemptLeadMs: lifecycle.start.projectedAtMs - lifecycle.resume.attemptMs,
            resultLeadMs: lifecycle.start.projectedAtMs - lifecycle.resume.resultMs,
            notificationDelayMs: lifecycle.start.projectedAtMs - lifecycle.resume.resultMs,
            nativeToAttemptMs: cycle.start.projectedAtMs - lifecycle.resume.attemptMs,
            nativeToResultMs: cycle.start.projectedAtMs - lifecycle.resume.resultMs,
            attemptToResultMs: lifecycle.resume.resultMs - lifecycle.resume.attemptMs,
            appNativeFenceMs: CLOCK_FENCE_MS,
            selectionFloorMs: lifecycle.selectionFloorMs,
        };
    }
    return evidence;
}

function verify(input) {
    requirePlain(input, 'input');
    const binding = validateBinding(input.binding);
    const projection = validateProjection(input.clockProjection);
    const provenance = validateProvenance(input.provenance, binding);
    const sentinel = validateSentinel(input.sentinel, binding);
    const media = validateMedia(input.media, binding, provenance.source);
    for (const record of media.records) {
        if (record.observedAtMs < projection.observationWindow.openedAtMs
            || record.observedAtMs > projection.observationWindow.closedAtMs) {
            reject('media.records.window');
        }
    }
    const networkOffsetMs = projection.wallTimeS * 1000
        - projection.protocolTimestamps.request * 1000;
    if (!isFiniteNumber(networkOffsetMs)) reject('media.clock.network-offset');
    for (const historicalAtMs of [media.historicalLogProjectedAtMs, media.historicalLoadProjectedAtMs]) {
        if (historicalAtMs < binding.generationInstalled.dateNow - CLOCK_FENCE_MS) {
            reject('media.history.generation');
        }
    }
    const lifecycle = validateLifecycleAndSelect(input, binding, provenance, projection);
    const clockModel = buildClockModel(binding, lifecycle);
    validateLifecycleClockModel(lifecycle, clockModel);
    validateProvenanceEventClocks(provenance, clockModel);
    if (lifecycle.startMode === 'observed-resume') {
        validateObservedResumeProvenance(provenance, lifecycle, clockModel);
    }
    const cycle = correlateCycle(
        media,
        lifecycle,
        provenance,
        networkOffsetMs,
    );
    validateInterference(provenance, lifecycle, clockModel);
    const evidence = buildEvidence(
        input,
        binding,
        projection,
        provenance,
        sentinel,
        media,
        lifecycle,
        cycle,
        clockModel,
    );
    return { ok: true, evidence };
}

function verifyControlledNativeLoopCycle(input) {
    try {
        return verify(input);
    } catch (error) {
        if (error instanceof Rejection) return { ok: false, reasons: [error.message] };
        return { ok: false, reasons: ['invalid-input'] };
    }
}

module.exports = { verifyControlledNativeLoopCycle };
