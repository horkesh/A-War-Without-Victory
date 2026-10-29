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

const ALLOWLIST = 'ambient-buffered-loop-proof-v1';
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

function verifyCollector(artifact) {
    if (!isPlainObject(artifact)) return false;
    if (artifact.non_admitting !== true) return false;
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

function projectClocks(chain, rawFailure) {
    const wallTimeS = chain.request.wall_time_s;
    if (!isFiniteNumber(wallTimeS)) return null;

    // Project the CDP protocol timeline onto epoch milliseconds using the
    // request wall clock as the only anchor. Every row must then agree with its
    // own observer clock and, where Playwright recorded one, with the matching
    // raw request/failure clock inside the same 20ms fence.
    const requestProjectedAtMs = wallTimeS * 1000;
    const responseProjectedAtMs = requestProjectedAtMs + (chain.response.timestamp - chain.request.timestamp) * 1000;
    const failureProjectedAtMs = requestProjectedAtMs + (chain.failure.timestamp - chain.request.timestamp) * 1000;
    if (!isFiniteNumber(requestProjectedAtMs)) return null;
    if (!isFiniteNumber(responseProjectedAtMs)) return null;
    if (!isFiniteNumber(failureProjectedAtMs)) return null;
    if (!(requestProjectedAtMs <= responseProjectedAtMs && responseProjectedAtMs <= failureProjectedAtMs)) return null;

    if (Math.abs(requestProjectedAtMs - chain.request.observed_at_ms) > CLOCK_FENCE_MS) return null;
    if (Math.abs(responseProjectedAtMs - chain.response.observed_at_ms) > CLOCK_FENCE_MS) return null;
    if (Math.abs(failureProjectedAtMs - chain.failure.observed_at_ms) > CLOCK_FENCE_MS) return null;

    if (Math.abs(requestProjectedAtMs - rawFailure.requestInitiatedAtMs) > CLOCK_FENCE_MS) return null;
    if (Math.abs(chain.request.observed_at_ms - rawFailure.requestInitiatedAtMs) > CLOCK_FENCE_MS) return null;
    if (Math.abs(failureProjectedAtMs - rawFailure.observedAtMs) > CLOCK_FENCE_MS) return null;

    return {
        requestWallTimeS: wallTimeS,
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

function buildProof(rawFailure, chain, signals, sidecar, clockProjection) {
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
        if (Math.abs(signal.observedAtMs - chain.request.observed_at_ms) > CLOCK_FENCE_MS) continue;
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
    if (Math.abs(elapsedToSeekS - predictedRemainingS) > WRAP_PREDICTION_S) return null;

    const seekAlignmentMs = seeking.observedAtMs - chain.request.observed_at_ms;
    if (Math.abs(seekAlignmentMs) > CLOCK_FENCE_MS) return null;
    if (Math.abs(seeking.observedAtMs - chain.request.wall_time_s * 1000) > CLOCK_FENCE_MS) return null;

    const seekedDelayMs = seeked.observedAtMs - seeking.observedAtMs;
    if (seekedDelayMs < 0 || seekedDelayMs > SEEK_EVENT_MS) return null;
    // Both seeked0 and playing0 must land inside one 100ms window measured from
    // the correlated seeking0, not 100ms from each other.
    const playingDelayMs = playing.observedAtMs - seeking.observedAtMs;
    if (playingDelayMs < 0 || playingDelayMs > SEEK_EVENT_MS) return null;

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
        selectedSequenceIds: {
            request: request.sequence,
            response: response.sequence,
            failure: failure.sequence,
            bodyTrigger: chain.body.trigger_sequence,
            bodySettled: chain.body.settled_sequence,
            lifecycle: intervalSequences,
        },
        clocks: {
            requestWallTimeS: clockProjection.requestWallTimeS,
            requestInitiatedAtMs: rawFailure.requestInitiatedAtMs,
            requestObservedAtMs: request.observed_at_ms,
            failureObservedAtMs: failure.observed_at_ms,
            rawFailureObservedAtMs: rawFailure.observedAtMs,
            requestAlignmentMs: clockProjection.projectedObservedAtMs.request - rawFailure.requestInitiatedAtMs,
            requestObserverAlignmentMs: clockProjection.projectedDeltaMs.request,
            failureAlignmentMs: clockProjection.projectedObservedAtMs.failure - rawFailure.observedAtMs,
            protocolTimestamps: clockProjection.protocolTimestamps,
            projectedObservedAtMs: clockProjection.projectedObservedAtMs,
            projectedDeltaMs: clockProjection.projectedDeltaMs,
            seekObservedAtMs: seeking.observedAtMs,
            seekAlignmentMs,
            wrapElapsedS: elapsedToSeekS,
            wrapPredictedRemainingS: predictedRemainingS,
            wrapDeltaS: elapsedToSeekS - predictedRemainingS,
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

function attributeFailure(rawFailure, chains, signals, target, sidecar) {
    if (!validateRawFailure(rawFailure)) return null;

    const asset = parseAssetUrl(rawFailure.url);
    if (!asset) return null;
    if (asset.url.protocol !== target.protocol) return null;
    if (asset.url.hostname !== target.hostname) return null;
    if (asset.url.port !== target.port) return null;

    const candidates = chains.filter((chain) => chain.url === asset.canonical);
    if (candidates.length !== 1) return null;
    const chain = candidates[0];

    const clockProjection = projectClocks(chain, rawFailure);
    if (!clockProjection) return null;

    const proof = buildProof(rawFailure, chain, signals, sidecar, clockProjection);
    if (!proof) return null;

    return { requestId: chain.requestId, proof };
}

function attributeBufferedAmbientLoopAborts(input = {}) {
    if (input === null || typeof input !== 'object') return { remaining: [], expected: [] };

    const networkFailures = Array.isArray(input.networkFailures) ? input.networkFailures : [];
    const lifecycleSignals = Array.isArray(input.lifecycleSignals) ? input.lifecycleSignals : [];

    const verified = verifyReceipt(input);
    let chains = [];
    let target = null;
    let sidecar = null;

    if (verified && verifyCollector(verified.artifact)) {
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
        if (!target || !sidecar) return { rawFailure, attribution: null };
        let attribution = null;
        try {
            attribution = attributeFailure(rawFailure, chains, lifecycleSignals, target, sidecar);
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
                allowlist: ALLOWLIST,
                bufferedLoopProof: attribution.proof,
            });
        } else {
            remaining.push(decision.rawFailure);
        }
    }

    return { remaining, expected };
}

module.exports = { attributeBufferedAmbientLoopAborts };
