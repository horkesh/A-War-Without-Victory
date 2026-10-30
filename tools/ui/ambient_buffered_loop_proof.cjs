'use strict';

// Fail-closed native buffered-loop proof checker.
//
// This module verifies one Playwright `net::ERR_ABORTED` media failure at a time
// against an explicitly supplied CDP sidecar, the observed lifecycle signals and
// the raw Playwright failure record. It never infers missing evidence, never
// reads anything except the exact expected sidecar path, and never mutates its
// inputs. Anything unknown, ambiguous, contradictory or malformed stays raw.

const fs = require('node:fs');
const crypto = require('node:crypto');
const { verifyControlledNativeLoopCycle } = require('./native_media_cycle_evidence.cjs');

const ALLOWLIST = 'ambient-buffered-loop-proof-v1';
// Separately named acceptance for cancellations whose cached 206 response
// arrives after the 100ms fast completion window. It proves only that the
// expected cached-loop cancellation is response-correlated; it never claims a
// completed transfer or gap-free audio.
const ALLOWLIST_CACHED_RESPONSE = 'ambient-buffered-cached-response-proof-v2';
// Distinct acceptance for a loop whose natural wrap is proven by the real
// controlled-native cycle correlator rather than the sampled 100ms heuristic.
// The verifier evidence is embedded; the legacy completion path and criterion
// are retained separately and are never relabelled.
const CONTROLLED_CYCLE_CRITERION = 'ambient-buffered-controlled-native-cycle-proof-v3';
const FAST_PATH = 'fast-100ms';
const SLOW_CACHED_RESPONSE_PATH = 'slow-cached-response';
const COLLECTOR_SCHEMA = 'awwv.r8-warroom.cdp-network-collection.v3';
const SHA256_HEX = /^[0-9a-f]{64}$/;
const ASSET_PATH = /^\/assets\/ambient_(?:warroom|field|archive)-[A-Za-z0-9_-]+\.ogg$/;
const CONTENT_RANGE = /^bytes (\d+)-(\d+)\/(\d+)$/;
const DIGITS = /^\d+$/;

// Strict QA evidence fences. These are proof bounds, not simulation tolerances.
const CLOCK_FENCE_MS = 20;
const WRAP_PREDICTION_S = 0.1;
const SEEK_EVENT_MS = 100;
const CONTINUATION_S = 0.25;

// Events that may not appear between the post-wrap `playing` sample and the
// continued-playback confirmation. A `pause` *method* snapshot is allowed only
// because its recorded state is still unpaused; a real pause event is rejected
// by the `paused !== false` check instead.
const DISALLOWED_AFTER_PLAYING = new Set([
    'seeking',
    'seeked',
    'load',
    'emptied',
    'error',
    'stalled',
    'abort',
    'waiting',
]);

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}

function copyJson(value) {
    return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Receipt verification (path + bytes + SHA256 before parsing)
// ---------------------------------------------------------------------------

function verifyReceipt(input) {
    const receipt = input.cdpReceipt;
    const expectedPath = input.expectedSidecarPath;
    if (!isPlainObject(receipt)) return null;
    if (!isNonEmptyString(expectedPath)) return null;
    if (receipt.path !== expectedPath) return null;
    if (typeof receipt.sha256 !== 'string' || !SHA256_HEX.test(receipt.sha256)) return null;
    if (!isNonEmptyString(receipt.schema) || !isNonEmptyString(receipt.status)) return null;
    if (!isNonEmptyString(receipt.path)) return null;

    let bytes;
    try {
        bytes = fs.readFileSync(receipt.path);
    } catch {
        return null;
    }

    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== receipt.sha256) return null;

    let artifact;
    try {
        artifact = JSON.parse(bytes.toString('utf8'));
    } catch {
        return null;
    }
    if (!isPlainObject(artifact)) return null;
    if (artifact.schema !== receipt.schema) return null;
    if (artifact.status !== receipt.status) return null;
    if (artifact.schema !== COLLECTOR_SCHEMA) return null;
    if (artifact.status !== 'complete') return null;

    return { artifact, receipt };
}

// ---------------------------------------------------------------------------
// Collector health
// ---------------------------------------------------------------------------

function readObservationWindow(artifact) {
    if (!isPlainObject(artifact)) return null;
    const window = artifact.observation_window;
    if (!isPlainObject(window)) return null;
    if (window.clock !== 'node-epoch-ms') return null;
    if (!isFiniteNumber(window.opened_at_ms) || !isFiniteNumber(window.closed_at_ms)) return null;
    if (!(window.opened_at_ms <= window.closed_at_ms)) return null;
    return {
        clock: window.clock,
        openedAtMs: window.opened_at_ms,
        closedAtMs: window.closed_at_ms,
    };
}

// The observation window is an actual observer-clock interval. The existing
// 20ms fence is retained only as a boundary allowance for clock projections;
// it is never used to excuse missing, stale or future evidence.
function withinObservationWindow(window, value) {
    if (!window || !isFiniteNumber(value)) return false;
    return value >= window.openedAtMs - CLOCK_FENCE_MS
        && value <= window.closedAtMs + CLOCK_FENCE_MS;
}

function verifyCollector(artifact) {
    if (!isPlainObject(artifact)) return false;
    if (artifact.non_admitting !== true) return false;
    if (!readObservationWindow(artifact)) return false;
    if (!Array.isArray(artifact.inconsistencies) || artifact.inconsistencies.length !== 0) return false;
    if (!Array.isArray(artifact.overflow_receipts) || artifact.overflow_receipts.length !== 0) return false;
    if (artifact.observation_stopped_at_sequence !== null) return false;

    const setup = artifact.setup;
    if (!isPlainObject(setup)) return false;
    if (setup.state !== 'ready') return false;
    if (setup.primary_error !== null || setup.cleanup_error !== null) return false;

    const flush = artifact.flush;
    if (!isPlainObject(flush)) return false;
    if (flush.state !== 'closed') return false;
    if (flush.detach !== 'detached') return false;
    if (flush.pending_at_deadline !== 0) return false;

    const summary = artifact.summary;
    if (!isPlainObject(summary)) return false;
    if (summary.pending_at_flush !== 0) return false;
    if (summary.cap_violations !== 0) return false;
    if (summary.inconsistencies !== 0) return false;
    if (summary.complete_through_stop_only === true) return false;

    if (!Array.isArray(artifact.events) || !Array.isArray(artifact.body_attempts)) return false;
    return true;
}

// ---------------------------------------------------------------------------
// Target origin, asset identity and URL projection
// ---------------------------------------------------------------------------

function readTarget(artifact) {
    const session = artifact.session;
    if (!isPlainObject(session) || !isNonEmptyString(session.observer_session_id)) return null;
    const target = session.target;
    if (!isPlainObject(target) || !isNonEmptyString(target.target_id)) return null;

    const projection = isPlainObject(target.reported_url) ? target.reported_url : target.selected_frame_url;
    if (!isPlainObject(projection) || projection.status !== 'present') return null;
    if (projection.had_userinfo !== false) return null;
    if (projection.protocol !== 'http:' || projection.hostname !== '127.0.0.1') return null;
    if (!DIGITS.test(String(projection.port ?? ''))) return null;

    return {
        observerSessionId: session.observer_session_id,
        targetId: target.target_id,
        protocol: projection.protocol,
        hostname: projection.hostname,
        port: String(projection.port),
    };
}

function parseAssetUrl(raw) {
    if (!isNonEmptyString(raw)) return null;
    let url;
    try {
        url = new URL(raw);
    } catch {
        return null;
    }
    if (url.protocol !== 'http:') return null;
    if (url.hostname !== '127.0.0.1') return null;
    if (!DIGITS.test(url.port)) return null;
    if (url.username !== '' || url.password !== '') return null;
    if (url.search !== '' || url.hash !== '') return null;
    if (!ASSET_PATH.test(url.pathname)) return null;
    return {
        url,
        canonical: `${url.protocol}//${url.hostname}:${url.port}${url.pathname}`,
    };
}

function projectionToUrl(projection) {
    if (!isPlainObject(projection) || projection.status !== 'present') return null;
    if (projection.had_userinfo !== false || projection.had_query !== false || projection.had_fragment !== false) return null;
    if (!isNonEmptyString(projection.protocol) || !isNonEmptyString(projection.hostname)) return null;
    if (!DIGITS.test(String(projection.port ?? ''))) return null;
    if (!Array.isArray(projection.path) || !projection.path.every((part) => typeof part === 'string')) return null;
    const pathname = projection.path.join('/');
    if (!ASSET_PATH.test(pathname)) return null;
    return `${projection.protocol}//${projection.hostname}:${projection.port}${pathname}`;
}

// ---------------------------------------------------------------------------
// CDP chain reconstruction
// ---------------------------------------------------------------------------

function collectChains(artifact) {
    const groups = new Map();
    const ensure = (requestId) => {
        let group = groups.get(requestId);
        if (!group) {
            group = { requests: [], responses: [], failures: [], finishes: [], bodies: [] };
            groups.set(requestId, group);
        }
        return group;
    };

    for (const event of artifact.events) {
        if (!isPlainObject(event)) return null;
        if (!isNonEmptyString(event.request_id)) return null;
        if (!isFiniteNumber(event.sequence)) return null;
        let bucket;
        switch (event.kind) {
            case 'request': bucket = 'requests'; break;
            case 'response': bucket = 'responses'; break;
            case 'failure': bucket = 'failures'; break;
            case 'finish': bucket = 'finishes'; break;
            default: return null;
        }
        ensure(event.request_id)[bucket].push(event);
    }

    for (const attempt of artifact.body_attempts) {
        if (!isPlainObject(attempt) || !isNonEmptyString(attempt.request_id)) return null;
        ensure(attempt.request_id).bodies.push(attempt);
    }

    return groups;
}

function parseContentRange(value) {
    if (!isPlainObject(value) || value.status !== 'present' || typeof value.value !== 'string') return null;
    const match = CONTENT_RANGE.exec(value.value);
    if (!match) return null;
    return {
        start: Number(match[1]),
        end: Number(match[2]),
        total: Number(match[3]),
    };
}

function validateBodyAttempt(attempt, responseTotal) {
    if (!isPlainObject(attempt)) return null;
    if (attempt.provenance !== 'direct-Network.getResponseBody') return null;
    if (attempt.state === 'captured') {
        if (!Number.isSafeInteger(attempt.byte_count) || attempt.byte_count <= 0) return null;
        if (attempt.byte_count !== responseTotal) return null;
        if (typeof attempt.sha256 !== 'string' || !SHA256_HEX.test(attempt.sha256)) return null;
        return {
            state: 'captured',
            sha256: attempt.sha256,
            byteCount: attempt.byte_count,
            error: null,
        };
    }
    if (attempt.state !== 'error' && attempt.state !== 'unavailable') return null;
    if (attempt.sha256 !== null || attempt.byte_count !== null) return null;
    return {
        state: attempt.state,
        sha256: null,
        byteCount: null,
        error: typeof attempt.error === 'string' ? attempt.error : null,
    };
}

function validateChain(group, artifact, target) {
    if (group.requests.length !== 1) return null;
    if (group.responses.length !== 1) return null;
    if (group.failures.length !== 1) return null;
    if (group.finishes.length !== 0) return null;
    if (group.bodies.length !== 1) return null;

    const request = group.requests[0];
    const response = group.responses[0];
    const failure = group.failures[0];
    const body = group.bodies[0];

    const observerSessionId = artifact.session.observer_session_id;
    if (request.observer_session_id !== observerSessionId) return null;
    if (response.observer_session_id !== observerSessionId) return null;
    if (failure.observer_session_id !== observerSessionId) return null;
    if (body.observer_session_id !== observerSessionId) return null;

    if (request.generation !== 1) return null;
    if (response.generation !== 1) return null;
    if (failure.generation !== 1) return null;
    if (body.generation !== 1) return null;

    if (!isFiniteNumber(body.trigger_sequence) || !isFiniteNumber(body.settled_sequence)) return null;
    if (body.trigger_sequence !== failure.sequence) return null;
    if (!(body.settled_sequence > body.trigger_sequence)) return null;

    if (!(request.sequence < response.sequence && response.sequence < failure.sequence)) return null;
    if (!isFiniteNumber(request.timestamp)) return null;
    if (!isFiniteNumber(response.timestamp)) return null;
    if (!isFiniteNumber(failure.timestamp)) return null;
    if (!(request.timestamp < response.timestamp && response.timestamp < failure.timestamp)) return null;

    if (!isFiniteNumber(request.observed_at_ms)) return null;
    if (!isFiniteNumber(response.observed_at_ms)) return null;
    if (!isFiniteNumber(failure.observed_at_ms)) return null;
    if (response.observed_at_ms < request.observed_at_ms) return null;
    if (failure.observed_at_ms < response.observed_at_ms) return null;

    if (request.method !== 'GET') return null;
    if (request.resource_type !== 'Media') return null;
    if (request.frame_id !== target.targetId) return null;
    if (!isNonEmptyString(request.loader_id)) return null;
    if (request.redirect_present !== false) return null;
    if (request.chain_tainted !== false) return null;
    if (!isPlainObject(request.actual_range)) return null;
    if (request.actual_range.status !== 'present' || request.actual_range.value !== 'bytes=0-') return null;

    const requestUrl = projectionToUrl(request.url);
    const responseUrl = projectionToUrl(response.url);
    if (!requestUrl || !responseUrl || requestUrl !== responseUrl) return null;

    if (response.status !== 206) return null;
    if (response.mime_type !== 'audio/ogg' && response.mime_type !== 'application/octet-stream') return null;
    if (response.from_disk_cache !== true) return null;
    if (response.from_service_worker !== false) return null;
    if (response.chain_tainted !== false) return null;

    const contentRange = parseContentRange(response.content_range);
    if (!contentRange) return null;
    if (!Number.isSafeInteger(contentRange.start)) return null;
    if (!Number.isSafeInteger(contentRange.end)) return null;
    if (!Number.isSafeInteger(contentRange.total)) return null;
    if (contentRange.start !== 0) return null;
    if (contentRange.total <= 0) return null;
    if (contentRange.end !== contentRange.total - 1) return null;

    if (!isPlainObject(response.content_length) || response.content_length.status !== 'present') return null;
    if (typeof response.content_length.value !== 'string' || !DIGITS.test(response.content_length.value)) return null;
    const contentLength = Number(response.content_length.value);
    if (!Number.isSafeInteger(contentLength)) return null;
    if (contentLength !== contentRange.total) return null;

    if (!isPlainObject(response.accept_ranges) || response.accept_ranges.status !== 'present') return null;
    if (response.accept_ranges.value !== 'bytes') return null;

    if (failure.error_text !== 'net::ERR_ABORTED') return null;
    if (failure.canceled !== true) return null;
    if (failure.blocked_reason !== null) return null;
    if (failure.candidate !== true) return null;
    if (!Array.isArray(failure.disqualification_reasons) || failure.disqualification_reasons.length !== 0) return null;
    if (failure.chain_tainted !== false) return null;

    const bodyInfo = validateBodyAttempt(body, contentRange.total);
    if (!bodyInfo) return null;

    return {
        request,
        response,
        failure,
        body,
        bodyInfo,
        url: requestUrl,
        requestId: request.request_id,
    };
}

function validateRawFailure(rawFailure) {
    if (!isPlainObject(rawFailure)) return false;
    if (rawFailure.kind !== 'requestfailed') return false;
    if (rawFailure.method !== 'GET') return false;
    if (rawFailure.resourceType !== 'media') return false;
    if (rawFailure.isMainFrame !== false) return false;
    if (rawFailure.teardownStarted !== false) return false;
    if (!isPlainObject(rawFailure.failure)) return false;
    if (rawFailure.failure.errorText !== 'net::ERR_ABORTED') return false;
    if (!isPlainObject(rawFailure.requestRange)) return false;
    if (rawFailure.requestRange.status !== 'present' || rawFailure.requestRange.value !== 'bytes=0-') return false;
    if (!isFiniteNumber(rawFailure.observedAtMs)) return false;
    if (!isFiniteNumber(rawFailure.requestInitiatedAtMs)) return false;
    return true;
}

function projectClocks(chain, rawFailure, observationWindow) {
    const wallTimeS = chain.request.wall_time_s;
    if (!isFiniteNumber(wallTimeS)) return null;

    // Project the finite, ordered CDP protocol timeline onto browser epoch
    // milliseconds using the request wall clock as the only anchor. These are
    // browser-domain times and may only be correlated with browser-domain
    // evidence. Node callback clocks are a separate domain.
    const requestProjectedAtMs = wallTimeS * 1000;
    const responseProjectedAtMs = requestProjectedAtMs + (chain.response.timestamp - chain.request.timestamp) * 1000;
    const failureProjectedAtMs = requestProjectedAtMs + (chain.failure.timestamp - chain.request.timestamp) * 1000;
    if (!isFiniteNumber(requestProjectedAtMs)) return null;
    if (!isFiniteNumber(responseProjectedAtMs)) return null;
    if (!isFiniteNumber(failureProjectedAtMs)) return null;
    if (!(chain.request.timestamp <= chain.response.timestamp
        && chain.response.timestamp <= chain.failure.timestamp)) return null;
    if (!(requestProjectedAtMs <= responseProjectedAtMs && responseProjectedAtMs <= failureProjectedAtMs)) return null;

    // Every browser-derived epoch must fall inside the actual, recorded
    // collection window. Missing or stale windows are never reconstructed.
    if (!withinObservationWindow(observationWindow, requestProjectedAtMs)) return null;
    if (!withinObservationWindow(observationWindow, responseProjectedAtMs)) return null;
    if (!withinObservationWindow(observationWindow, failureProjectedAtMs)) return null;

    // Every Node callback clock must also fall inside the same recorded window.
    const nodeClocks = [
        chain.request.observed_at_ms,
        chain.response.observed_at_ms,
        chain.failure.observed_at_ms,
        rawFailure.requestInitiatedAtMs,
        rawFailure.observedAtMs,
    ];
    for (const value of nodeClocks) {
        if (!withinObservationWindow(observationWindow, value)) return null;
    }

    // Node delivery may never precede the corresponding browser event epoch by
    // more than the existing 20ms clock fence. A later delivery is explicit
    // evidence and stays admissible as long as it remains inside the window.
    const deliveryLagMs = {
        request: chain.request.observed_at_ms - requestProjectedAtMs,
        response: chain.response.observed_at_ms - responseProjectedAtMs,
        failure: chain.failure.observed_at_ms - failureProjectedAtMs,
    };
    for (const lag of Object.values(deliveryLagMs)) {
        if (lag < -CLOCK_FENCE_MS) return null;
    }

    // The 20ms pairwise fence applies only to like-domain timestamps: CDP Node
    // observations against Playwright Node callbacks. Browser epochs are never
    // compared with Node delivery times here.
    if (Math.abs(chain.request.observed_at_ms - rawFailure.requestInitiatedAtMs) > CLOCK_FENCE_MS) return null;
    if (Math.abs(chain.failure.observed_at_ms - rawFailure.observedAtMs) > CLOCK_FENCE_MS) return null;
    if (!(rawFailure.requestInitiatedAtMs <= rawFailure.observedAtMs)) return null;

    return {
        requestWallTimeS: wallTimeS,
        observationWindow,
        protocolTimestamps: {
            request: chain.request.timestamp,
            response: chain.response.timestamp,
            failure: chain.failure.timestamp,
        },
        projectedObservedAtMs: {
            request: requestProjectedAtMs,
            response: responseProjectedAtMs,
            failure: failureProjectedAtMs,
        },
        nodeObservedAtMs: {
            request: chain.request.observed_at_ms,
            response: chain.response.observed_at_ms,
            failure: chain.failure.observed_at_ms,
            rawRequestCallback: rawFailure.requestInitiatedAtMs,
            rawFailureCallback: rawFailure.observedAtMs,
        },
        deliveryLagMs,
        projectedDeltaMs: {
            request: requestProjectedAtMs - chain.request.observed_at_ms,
            response: responseProjectedAtMs - chain.response.observed_at_ms,
            failure: failureProjectedAtMs - chain.failure.observed_at_ms,
        },
    };
}

// ---------------------------------------------------------------------------
// Lifecycle media proof
// ---------------------------------------------------------------------------

function coverageOk(ranges, duration) {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    if (!isFiniteNumber(duration) || duration <= 0) return false;
    let previousEnd = null;
    for (const range of ranges) {
        if (!Array.isArray(range) || range.length !== 2) return false;
        const start = range[0];
        const end = range[1];
        if (!isFiniteNumber(start) || !isFiniteNumber(end)) return false;
        if (!(start <= end)) return false;
        // Ranges must be reported in order and may touch, but they may neither
        // overlap nor leave a gap. Malformed input is rejected, never sorted or
        // merged into something that looks continuous.
        if (previousEnd === null) {
            if (start > 0) return false;
        } else if (start !== previousEnd) {
            return false;
        }
        previousEnd = end;
    }
    return previousEnd !== null && previousEnd >= duration;
}

// Build the correlator's lifecycle view from the checker's already-selected
// actual samples. The caller's cycleInput never supplies lifecycle samples,
// selected references or a clock projection. Controls are taken only from the
// exact per-record read that the controlled QA profile captured alongside the
// object description; a missing, errored, non-boolean or true read stays raw.
function controlledLifecycleSignals(assetSignals) {
    const signals = [];
    for (const signal of assetSignals) {
        if (!isPlainObject(signal) || !isPlainObject(signal.mediaState)) return null;
        const read = signal.controlledControlsRead;
        if (!isPlainObject(read) || read.error !== null || typeof read.value !== 'boolean') return null;
        if (read.value !== false) return null;
        if (Object.prototype.hasOwnProperty.call(signal.mediaState, 'controls')) {
            if (typeof signal.mediaState.controls !== 'boolean'
                || signal.mediaState.controls !== read.value) return null;
            signals.push(copyJson(signal));
        } else {
            // The exact recorded read is injected onto a clone only; raw input
            // signals are never mutated and no attribute absence is inferred.
            const copy = copyJson(signal);
            copy.mediaState.controls = read.value;
            signals.push(copy);
        }
    }
    return signals;
}

function verifyControlledCycleEvidence(controlledCycle, assetSignals, clockProjection, selected) {
    if (!isPlainObject(controlledCycle)) return null;
    for (const key of ['binding', 'provenance', 'sentinel', 'media']) {
        if (!Object.prototype.hasOwnProperty.call(controlledCycle, key)) return null;
    }
    const lifecycleSignals = controlledLifecycleSignals(assetSignals);
    if (!lifecycleSignals) return null;
    const result = verifyControlledNativeLoopCycle({
        binding: controlledCycle.binding,
        provenance: controlledCycle.provenance,
        sentinel: controlledCycle.sentinel,
        media: controlledCycle.media,
        lifecycleSignals,
        selected: {
            preSeek: { signalSequence: selected.preSeek.signalSequence },
            seeking: { signalSequence: selected.seeking.signalSequence },
            seeked: { signalSequence: selected.seeked.signalSequence },
            playing: { signalSequence: selected.playing.signalSequence },
            confirmation: { signalSequence: selected.confirmation.signalSequence },
        },
        clockProjection,
    });
    if (!result || result.ok !== true || !isPlainObject(result.evidence)) return null;
    return result.evidence;
}

function buildProof(rawFailure, chain, signals, sidecar, clockProjection, controlledCycle) {
    const asset = parseAssetUrl(rawFailure.url);
    if (!asset) return null;
    const origin = asset.url.origin;

    const assetSignals = signals.filter((signal) => isPlainObject(signal)
        && signal.url === rawFailure.url
        && signal.origin === origin);
    if (assetSignals.length === 0) return null;

    // The exact asset stream must carry one identity and ordered clocks/IDs for
    // the whole capture. Media state is validated only inside the chosen proof
    // interval, so unrelated initial/history samples cannot fabricate proof.
    let elementId = null;
    let sourceEpoch = null;
    let previousSequence = null;
    let previousObservedAtMs = null;
    for (const signal of assetSignals) {
        if (!isNonEmptyString(signal.elementId)) return null;
        if (!isFiniteNumber(signal.sourceEpoch)) return null;
        if (!isFiniteNumber(signal.signalSequence) || !Number.isInteger(signal.signalSequence)) return null;
        if (!isFiniteNumber(signal.observedAtMs)) return null;
        if (previousSequence !== null && signal.signalSequence <= previousSequence) return null;
        if (previousObservedAtMs !== null && signal.observedAtMs < previousObservedAtMs) return null;
        if (elementId === null) elementId = signal.elementId;
        else if (signal.elementId !== elementId) return null;
        if (sourceEpoch === null) sourceEpoch = signal.sourceEpoch;
        else if (signal.sourceEpoch !== sourceEpoch) return null;
        previousSequence = signal.signalSequence;
        previousObservedAtMs = signal.observedAtMs;
    }

    // Exactly one seeking0 may correlate with this request's clock. Loop
    // windows elsewhere on the timeline are not competitors.
    const seekingIndices = [];
    for (let index = 0; index < assetSignals.length; index += 1) {
        const signal = assetSignals[index];
        if (signal.kind !== 'seeking') continue;
        if (!isPlainObject(signal.mediaState)) continue;
        if (signal.mediaState.currentTime !== 0) continue;
        if (signal.mediaState.seeking !== true) continue;
        // DOM signals are browser-domain times. Correlate them only with the
        // browser request epoch projected from wall_time_s, never with the
        // Node callback delivery clock.
        if (Math.abs(signal.observedAtMs - clockProjection.projectedObservedAtMs.request) > CLOCK_FENCE_MS) continue;
        seekingIndices.push(index);
    }
    if (seekingIndices.length !== 1) return null;
    const seekingIndex = seekingIndices[0];
    const seeking = assetSignals[seekingIndex];

    // Latest preceding same-identity sample that can establish natural wrap.
    let preSeekIndex = -1;
    for (let index = 0; index < seekingIndex; index += 1) {
        const signal = assetSignals[index];
        if (signal.elementId !== elementId || signal.sourceEpoch !== sourceEpoch) continue;
        const state = signal.mediaState;
        if (!isPlainObject(state)) continue;
        if (state.paused !== false) continue;
        if (state.readyState !== 4) continue;
        if (!isFiniteNumber(state.duration) || state.duration <= 0) continue;
        if (!isFiniteNumber(state.currentTime)) continue;
        if (!(state.currentTime > 0 && state.currentTime < state.duration)) continue;
        preSeekIndex = index;
    }
    if (preSeekIndex < 0) return null;
    const preSeek = assetSignals[preSeekIndex];

    // Unique seeked0 must precede the unique playing0 inside this window.
    let seekedIndex = -1;
    let playingIndex = -1;
    for (let index = seekingIndex + 1; index < assetSignals.length; index += 1) {
        const signal = assetSignals[index];
        if (signal.elementId !== elementId || signal.sourceEpoch !== sourceEpoch) return null;
        if (!isPlainObject(signal.mediaState)) return null;
        const state = signal.mediaState;
        if (signal.kind === 'seeking') return null;
        if (signal.kind === 'load' || signal.kind === 'emptied'
            || signal.kind === 'error' || signal.kind === 'stalled' || signal.kind === 'abort') return null;
        if (signal.kind === 'seeked' && state.currentTime === 0) {
            if (seekedIndex !== -1) return null;
            if (state.paused !== false || state.seeking !== false || state.readyState !== 4) return null;
            seekedIndex = index;
        } else if (signal.kind === 'playing' && state.currentTime === 0) {
            if (state.paused !== false || state.seeking !== false || state.readyState !== 4) return null;
            if (seekedIndex === -1) return null;
            playingIndex = index;
            break;
        }
    }
    if (seekedIndex === -1 || playingIndex === -1) return null;
    const seeked = assetSignals[seekedIndex];
    const playing = assetSignals[playingIndex];

    // First real continued-playback confirmation. A genuine advancing sample
    // may confirm before the terminal pause-method wrapper. A pause method
    // without progress, a paused event-state, or a disallowed lifecycle
    // transition before confirmation rejects.
    let confirmationIndex = -1;
    for (let index = playingIndex + 1; index < assetSignals.length; index += 1) {
        const signal = assetSignals[index];
        if (signal.elementId !== elementId || signal.sourceEpoch !== sourceEpoch) return null;
        if (!isPlainObject(signal.mediaState)) return null;
        const state = signal.mediaState;
        if (state.paused !== false) return null;
        if (state.seeking !== false) return null;
        if (DISALLOWED_AFTER_PLAYING.has(signal.kind)) return null;
        if (state.mediaError !== null) return null;
        if (signal.kind === 'playing' && state.currentTime === 0) return null;
        if (signal.kind === 'pause' && (state.readyState !== 4 || state.currentTime <= 0)) return null;
        if (state.readyState === 4 && state.currentTime > 0) {
            confirmationIndex = index;
            break;
        }
    }
    if (confirmationIndex === -1) return null;
    const confirmation = assetSignals[confirmationIndex];

    // Validate every same-asset sample inside the chosen interval.
    let duration = null;
    const intervalSequences = [];
    for (let index = preSeekIndex; index <= confirmationIndex; index += 1) {
        const signal = assetSignals[index];
        // The selected lifecycle interval is browser-derived evidence and must
        // fall inside the actual collection window; stale capture history does
        // not become proof merely because it is internally ordered.
        if (!withinObservationWindow(clockProjection.observationWindow, signal.observedAtMs)) return null;
        if (signal.elementId !== elementId || signal.sourceEpoch !== sourceEpoch) return null;
        if (!Array.isArray(signal.mediaStateUnavailable) || signal.mediaStateUnavailable.length !== 0) return null;
        if (!isPlainObject(signal.mediaStateReadErrors)) return null;
        if (Object.keys(signal.mediaStateReadErrors).length !== 0) return null;
        const state = signal.mediaState;
        if (!isPlainObject(state)) return null;
        if (signal.kind === 'load' || signal.kind === 'emptied'
            || signal.kind === 'error' || signal.kind === 'stalled' || signal.kind === 'abort') return null;
        if (!isFiniteNumber(state.networkState) || !isFiniteNumber(state.readyState)) return null;
        if (state.readyState < 1) return null;
        if (typeof state.paused !== 'boolean' || typeof state.seeking !== 'boolean') return null;
        if (typeof state.ended !== 'boolean') return null;
        if (!isFiniteNumber(state.currentTime)) return null;
        if (!isFiniteNumber(state.duration) || state.duration <= 0) return null;
        if (state.loop !== true) return null;
        if (state.mediaError !== null) return null;
        if (state.ended !== false) return null;
        if (duration === null) duration = state.duration;
        else if (state.duration !== duration) return null;
        if (!coverageOk(state.buffered, duration)) return null;
        if (!coverageOk(state.seekable, duration)) return null;
        intervalSequences.push(signal.signalSequence);
    }

    const predictedRemainingS = duration - preSeek.mediaState.currentTime;
    const elapsedToSeekS = (seeking.observedAtMs - preSeek.observedAtMs) / 1000;
    if (!isFiniteNumber(elapsedToSeekS) || elapsedToSeekS < 0) return null;
    if (confirmation.mediaState.currentTime >= duration) return null;

    let controlledNativeCycleEvidence = null;
    if (controlledCycle !== null) {
        // A supplied controlled profile replaces only the sampled-time wrap
        // heuristic. The real pure correlator must pass on the checker-bound
        // lifecycle samples; invalid controlled evidence stays raw even when
        // the legacy heuristic would have passed. All later guards still run.
        controlledNativeCycleEvidence = verifyControlledCycleEvidence(
            controlledCycle,
            assetSignals,
            clockProjection,
            { preSeek, seeking, seeked, playing, confirmation },
        );
        if (!controlledNativeCycleEvidence) return null;
    } else if (Math.abs(elapsedToSeekS - predictedRemainingS) > WRAP_PREDICTION_S) {
        return null;
    }

    // DOM seeking and the CDP request wall clock are both browser-domain
    // epochs, so their 20ms correlation stays meaningful. The Node delivery
    // clock is deliberately not part of this comparison.
    const seekAlignmentMs = seeking.observedAtMs - clockProjection.projectedObservedAtMs.request;
    if (Math.abs(seekAlignmentMs) > CLOCK_FENCE_MS) return null;

    // The browser-projected cached-response latency decides which of the two
    // criteria applies. It is derived only from the protocol request wall clock
    // and protocol response timestamp; Node delivery clocks never participate.
    const responseLatencyMs = clockProjection.projectedObservedAtMs.response
        - clockProjection.projectedObservedAtMs.request;
    if (!isFiniteNumber(responseLatencyMs) || responseLatencyMs < 0) return null;

    const seekedDelayMs = seeked.observedAtMs - seeking.observedAtMs;
    const playingDelayMs = playing.observedAtMs - seeking.observedAtMs;
    if (!isFiniteNumber(seekedDelayMs) || seekedDelayMs < 0) return null;
    if (!isFiniteNumber(playingDelayMs) || playingDelayMs < 0) return null;

    let acceptancePath;
    let seekedFromResponseMs = null;
    let playingFromResponseMs = null;
    if (seekedDelayMs <= SEEK_EVENT_MS && playingDelayMs <= SEEK_EVENT_MS) {
        // Legacy fast path, selected first by completion delay alone: both
        // seeked0 and playing0 must land inside one 100ms window measured from
        // the correlated seeking0, not 100ms from each other. A later cached
        // response header arrival must not relabel an otherwise valid v1 proof.
        acceptancePath = FAST_PATH;
    } else {
        // Slow cached-response path is available only outside the fast
        // completion window. A fast response with late completion stays
        // rejected rather than being rescued by response correlation.
        if (responseLatencyMs <= SEEK_EVENT_MS) return null;
        // The completion must be uniquely correlated with the exact projected
        // response, signed within the existing 20ms fence in either direction.
        seekedFromResponseMs = seeked.observedAtMs - clockProjection.projectedObservedAtMs.response;
        playingFromResponseMs = playing.observedAtMs - clockProjection.projectedObservedAtMs.response;
        if (!isFiniteNumber(seekedFromResponseMs)) return null;
        if (!isFiniteNumber(playingFromResponseMs)) return null;
        if (Math.abs(seekedFromResponseMs) > CLOCK_FENCE_MS) return null;
        if (Math.abs(playingFromResponseMs) > CLOCK_FENCE_MS) return null;
        acceptancePath = SLOW_CACHED_RESPONSE_PATH;
    }

    const allowlist = acceptancePath === SLOW_CACHED_RESPONSE_PATH
        ? ALLOWLIST_CACHED_RESPONSE
        : ALLOWLIST;

    const continuationElapsedS = (confirmation.observedAtMs - seeked.observedAtMs) / 1000;
    if (!isFiniteNumber(continuationElapsedS) || continuationElapsedS < 0) return null;
    if (Math.abs(continuationElapsedS - confirmation.mediaState.currentTime) > CONTINUATION_S) return null;

    const request = chain.request;
    const response = chain.response;
    const failure = chain.failure;

    return {
        artifact: {
            path: sidecar.path,
            sha256: sidecar.sha256,
            schema: sidecar.schema,
            status: sidecar.status,
        },
        requestId: request.request_id,
        observerSessionId: request.observer_session_id,
        generation: request.generation,
        frameId: request.frame_id,
        loaderId: request.loader_id,
        elementId,
        sourceEpoch,
        url: rawFailure.url,
        origin,
        // The acceptance path and allowlist are explicit, so a slow cached
        // response can never be relabelled as the legacy fast proof.
        path: acceptancePath,
        criterion: controlledNativeCycleEvidence ? CONTROLLED_CYCLE_CRITERION : allowlist,
        legacyCriterion: allowlist,
        allowlist,
        controlledNativeCycle: controlledNativeCycleEvidence
            ? {
                criterion: CONTROLLED_CYCLE_CRITERION,
                legacyCriterion: allowlist,
                completionPath: acceptancePath,
                evidence: controlledNativeCycleEvidence,
            }
            : null,
        responseAlignment: {
            latencyMs: responseLatencyMs,
            seekedLatencyMs: seekedDelayMs,
            playingLatencyMs: playingDelayMs,
            seekedFromResponseMs,
            playingFromResponseMs,
        },
        evidenceScope: {
            receivedCachedHeaders: true,
            completedTransfer: false,
            gapFreeAudio: false,
            statement: 'The browser received cached 206 headers for the correlated loop request; this does NOT prove a completed transfer or uninterrupted, gap-free audio.',
        },
        selectedSequenceIds: {
            request: request.sequence,
            response: response.sequence,
            failure: failure.sequence,
            bodyTrigger: chain.body.trigger_sequence,
            bodySettled: chain.body.settled_sequence,
            lifecycle: intervalSequences,
        },
        clocks: {
            observationWindow: clockProjection.observationWindow,
            requestWallTimeS: clockProjection.requestWallTimeS,
            requestInitiatedAtMs: rawFailure.requestInitiatedAtMs,
            requestObservedAtMs: request.observed_at_ms,
            responseObservedAtMs: response.observed_at_ms,
            failureObservedAtMs: failure.observed_at_ms,
            rawFailureObservedAtMs: rawFailure.observedAtMs,
            // Like-domain Node callback correlation only. Delivery lag itself
            // is retained as evidence rather than required to be zero.
            requestAlignmentMs: request.observed_at_ms - rawFailure.requestInitiatedAtMs,
            requestObserverAlignmentMs: clockProjection.projectedDeltaMs.request,
            failureAlignmentMs: failure.observed_at_ms - rawFailure.observedAtMs,
            nodeObservedAtMs: clockProjection.nodeObservedAtMs,
            deliveryLagMs: clockProjection.deliveryLagMs,
            protocolTimestamps: clockProjection.protocolTimestamps,
            projectedObservedAtMs: clockProjection.projectedObservedAtMs,
            projectedDeltaMs: clockProjection.projectedDeltaMs,
            seekObservedAtMs: seeking.observedAtMs,
            seekAlignmentMs,
            wrapElapsedS: elapsedToSeekS,
            wrapPredictedRemainingS: predictedRemainingS,
            wrapDeltaS: elapsedToSeekS - predictedRemainingS,
            responseLatencyMs,
            seekedFromResponseMs,
            playingFromResponseMs,
            seekedDelayMs,
            playingDelayMs,
            continuationElapsedS,
            continuationDeltaS: continuationElapsedS - confirmation.mediaState.currentTime,
        },
        buffers: {
            duration,
            buffered: copyJson(preSeek.mediaState.buffered),
            seekable: copyJson(preSeek.mediaState.seekable),
            sampleSequence: preSeek.signalSequence,
        },
        wrap: {
            preSeekSequence: preSeek.signalSequence,
            preSeekCurrentTime: preSeek.mediaState.currentTime,
            seekingSequence: seeking.signalSequence,
            seekedSequence: seeked.signalSequence,
            playingSequence: playing.signalSequence,
            confirmationSequence: confirmation.signalSequence,
            predictedRemainingS,
            elapsedToSeekS,
            deltaS: elapsedToSeekS - predictedRemainingS,
            seekedDelayMs,
            playingDelayMs,
        },
        continuation: {
            sequence: confirmation.signalSequence,
            kind: confirmation.kind,
            currentTime: confirmation.mediaState.currentTime,
            elapsedS: continuationElapsedS,
            deltaS: continuationElapsedS - confirmation.mediaState.currentTime,
            readyState: confirmation.mediaState.readyState,
            paused: confirmation.mediaState.paused,
        },
        body: {
            state: chain.bodyInfo.state,
            sha256: chain.bodyInfo.sha256,
            byteCount: chain.bodyInfo.byteCount,
            error: chain.bodyInfo.error,
            attempt: {
                observerSessionId: chain.body.observer_session_id,
                requestId: chain.body.request_id,
                generation: chain.body.generation,
                triggerSequence: chain.body.trigger_sequence,
                settledSequence: chain.body.settled_sequence,
            },
        },
    };
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

function attributeFailure(rawFailure, chains, signals, target, sidecar, observationWindow, controlledCycles) {
    if (!validateRawFailure(rawFailure)) return null;
    if (!observationWindow) return null;

    const asset = parseAssetUrl(rawFailure.url);
    if (!asset) return null;
    if (asset.url.protocol !== target.protocol) return null;
    if (asset.url.hostname !== target.hostname) return null;
    if (asset.url.port !== target.port) return null;

    // One asset may be observed by many otherwise valid CDP chains across the
    // capture. Correlate each URL-matching chain with this raw request's clocks
    // first, then require exactly one such chain. Zero or multiple correlated
    // chains stay raw, even if only one of them would later pass buildProof.
    const candidates = chains.filter((chain) => chain.url === asset.canonical);
    const correlated = [];
    for (const candidate of candidates) {
        const clockProjection = projectClocks(candidate, rawFailure, observationWindow);
        if (clockProjection) correlated.push({ chain: candidate, clockProjection });
    }
    if (correlated.length !== 1) return null;
    const { chain, clockProjection } = correlated[0];

    let controlledCycle = null;
    if (controlledCycles !== null) {
        // A supplied controlled profile is an explicit mode: exactly one record
        // must claim this already-unique chain request. Missing, duplicate or
        // malformed matches never fall back to the legacy wrap heuristic.
        if (!Array.isArray(controlledCycles)) return null;
        const matches = controlledCycles.filter((entry) => isPlainObject(entry)
            && entry.requestId === chain.requestId);
        if (matches.length !== 1) return null;
        const record = matches[0];
        if (!Object.prototype.hasOwnProperty.call(record, 'cycleInput')
            || !isPlainObject(record.cycleInput)) return null;
        controlledCycle = record.cycleInput;
    }

    const proof = buildProof(rawFailure, chain, signals, sidecar, clockProjection, controlledCycle);
    if (!proof) return null;

    return { requestId: chain.requestId, proof };
}

function attributeBufferedAmbientLoopAborts(input = {}) {
    if (input === null || typeof input !== 'object') return { remaining: [], expected: [] };

    const networkFailures = Array.isArray(input.networkFailures) ? input.networkFailures : [];
    const lifecycleSignals = Array.isArray(input.lifecycleSignals) ? input.lifecycleSignals : [];

    // Presence, not truthiness, selects the controlled profile. An explicitly
    // supplied null/undefined/malformed value disables the legacy heuristic
    // rather than silently falling back to it.
    const controlledSupplied = Object.prototype.hasOwnProperty.call(input, 'controlledNativeCycles');
    const controlledCycles = controlledSupplied
        ? (Array.isArray(input.controlledNativeCycles) ? input.controlledNativeCycles : [])
        : null;

    const verified = verifyReceipt(input);
    let chains = [];
    let target = null;
    let sidecar = null;
    let observationWindow = null;

    if (verified && verifyCollector(verified.artifact)) {
        observationWindow = readObservationWindow(verified.artifact);
        target = readTarget(verified.artifact);
        if (target) {
            const groups = collectChains(verified.artifact);
            if (groups) {
                for (const group of groups.values()) {
                    const chain = validateChain(group, verified.artifact, target);
                    if (chain) chains.push(chain);
                }
            }
            sidecar = {
                path: verified.receipt.path,
                sha256: verified.receipt.sha256,
                schema: verified.artifact.schema,
                status: verified.artifact.status,
            };
        }
    }

    const decisions = networkFailures.map((rawFailure) => {
        if (!target || !sidecar || !observationWindow) return { rawFailure, attribution: null };
        let attribution = null;
        try {
            attribution = attributeFailure(rawFailure, chains, lifecycleSignals, target, sidecar, observationWindow, controlledCycles);
        } catch {
            attribution = null;
        }
        return { rawFailure, attribution };
    });

    // Reject global ambiguity: a single chain may not be claimed by more than
    // one raw failure, and no failure may claim more than one chain.
    const claims = new Map();
    for (const decision of decisions) {
        if (!decision.attribution) continue;
        const requestId = decision.attribution.requestId;
        claims.set(requestId, (claims.get(requestId) || 0) + 1);
    }

    const expected = [];
    const remaining = [];
    for (const decision of decisions) {
        const attribution = decision.attribution;
        if (attribution && claims.get(attribution.requestId) === 1) {
            expected.push({
                ...decision.rawFailure,
                allowlist: attribution.proof.allowlist,
                bufferedLoopProof: attribution.proof,
            });
        } else {
            remaining.push(decision.rawFailure);
        }
    }

    return { remaining, expected };
}

module.exports = { attributeBufferedAmbientLoopAborts };
